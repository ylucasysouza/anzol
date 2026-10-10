import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { before, describe, it } from "node:test";
import type { Sql } from "../db.ts";
import { memorySql } from "../billing/test-sql.ts";
import { chooseNoPassword, deletePassword, getChoice, storePassword } from "./pdf-password.ts";
import { PdfPasswordError, pdfToLines } from "./pdf-text.ts";
import { MSG_SEM_SENHA, processInboundEmail } from "./pipeline.ts";
import { openSecret, sealSecret } from "./secret-box.ts";

const KEY = Buffer.alloc(32, 7).toString("base64");
// PDF SINTÉTICO cifrado com AES-256, senha "123" (gerado com pikepdf; valores inventados).
const LOCKED = new Uint8Array(readFileSync(new URL("./fixtures/nota-sintetica-senha-123.pdf", import.meta.url)));
const TO = "n-abcdefghjk23@notas.anzol.app";
const AUTH = "dkim=pass header.d=gmail.com";

function mime(data: Uint8Array) {
  const b = "B1";
  return `From: lucas@gmail.com\r\nTo: ${TO}\r\nSubject: nota\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="${b}"\r\n\r\n--${b}\r\nContent-Type: text/plain\r\n\r\nx\r\n--${b}\r\nContent-Type: application/pdf; name="n.pdf"\r\nContent-Disposition: attachment; filename="n.pdf"\r\nContent-Transfer-Encoding: base64\r\n\r\n${Buffer.from(data).toString("base64")}\r\n--${b}--\r\n`;
}

describe("cofre AES-GCM", () => {
  it("cifra e abre; não abre para outro usuário nem com outra chave", async () => {
    const s = await sealSecret("123", "u1", KEY);
    assert.ok(s.startsWith("v1."));
    assert.equal(await openSecret(s, "u1", KEY), "123");
    await assert.rejects(openSecret(s, "u2", KEY));
    await assert.rejects(openSecret(s, "u1", Buffer.alloc(32, 9).toString("base64")));
  });
  it("sem chave configurada, falha (não guarda em claro)", async () => {
    await assert.rejects(sealSecret("123", "u1", undefined), /ANZOL_PDF_KEY/);
  });
});

describe("PDF protegido", () => {
  it("sem senha / senha errada / senha certa", async () => {
    await assert.rejects(pdfToLines(LOCKED), (e: unknown) => e instanceof PdfPasswordError && e.reason === "missing");
    await assert.rejects(pdfToLines(LOCKED, "999"), (e: unknown) => e instanceof PdfPasswordError && e.reason === "wrong");
    assert.match(await pdfToLines(LOCKED, "123"), /VALE3/);
  });
});

describe("escolha do usuário + e-mail encaminhado", () => {
  let sql: Sql;
  const deps = { pdfToLines, pdfKey: KEY };
  const send = () =>
    processInboundEmail(sql, { raw: mime(LOCKED), envelopeFrom: "lucas@gmail.com", envelopeTo: TO, authResults: AUTH }, deps);
  before(async () => {
    sql = await memorySql(["0007_inbound_notes.sql", "0008_pdf_password.sql"]);
    await sql`insert into inbound_addresses (token, user_id) values ('abcdefghjk23', 'u1')`;
    await sql`insert into inbound_senders (user_id, email, verified_at) values ('u1', 'lucas@gmail.com', now())`;
  });

  it("sem escolha: nota fica 'needs_password' e o usuário é avisado com as duas opções", async () => {
    const r = await send();
    assert.equal(r.status === "processed" && r.imports[0].status, "needs_password");
    assert.match(r.status === "processed" ? r.imports[0].avisos[0] : "", /guardar a senha \(recomendado\) ou lançar manualmente/);
  });

  it("Opção B: aviso exato de que precisará lançar manualmente", async () => {
    await chooseNoPassword(sql, "u1");
    assert.deepEqual(await getChoice(sql, "u1"), { choice: "none", hasPassword: false });
    const r = await send();
    assert.ok(r.status === "processed" && r.imports[0].avisos[0].includes(MSG_SEM_SENHA));
  });

  it("Opção A: com a senha guardada, a mesma nota é importada sozinha", async () => {
    await storePassword(sql, "u1", "123", KEY);
    const row = await sql<{ password_enc: string }>`select password_enc from pdf_password_prefs where user_id = 'u1'`;
    assert.ok(row[0].password_enc.startsWith("v1."));
    const r = await send();
    assert.equal(r.status === "processed" && r.imports[0].status, "pending");
    const t = await sql<{ trades: { asset: string; ajuste: number }[] }>`select trades from pending_imports where user_id = 'u1'`;
    assert.deepEqual([t[0].trades[0].asset, t[0].trades[0].ajuste], ["VALE3", 100]);
  });

  it("senha errada guardada: avisa para atualizar", async () => {
    await sql`delete from pending_imports`;
    await storePassword(sql, "u1", "000", KEY);
    const r = await send();
    assert.equal(r.status === "processed" && r.imports[0].status, "needs_password");
    assert.match(r.status === "processed" ? r.imports[0].avisos[0] : "", /Atualize a senha/);
  });

  it("usuário apaga a senha (LGPD)", async () => {
    await deletePassword(sql, "u1");
    assert.deepEqual(await getChoice(sql, "u1"), { choice: null, hasPassword: false });
  });

  it("não aceita senha vazia", async () => {
    await assert.rejects(storePassword(sql, "u1", "  ", KEY));
  });
});
