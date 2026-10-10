import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { before, describe, it } from "node:test";
import type { Sql } from "../db.ts";
import { memorySql } from "../billing/test-sql.ts";
import { pdfToLines } from "./pdf-text.ts";
import { makeTextPdf } from "./test-pdf.ts";
import { authPassed, normalizeAddress, processInboundEmail, tokenFromRecipient, verifySignature } from "./pipeline.ts";

// Nota SINTÉTICA (valores inventados) no layout SINACOR Bovespa.
const NOTA = [
  "NOTA DE NEGOCIAÇÃO",
  "Nr. nota: 123456 1 Data pregão: 15/09/2026",
  "1-BOVESPA C VISTA PETR4 PETROBRAS PN N2 D 100 32,50 3.250,00 D",
  "1-BOVESPA V VISTA PETR4 PETROBRAS PN N2 D 100 33,10 3.310,00 C",
  "1-BOVESPA C VISTA HGLG11 CSHG LOG FII CI 10 160,00 1.600,00 D",
  "Taxa de liquidação 2,04 D",
  "Emolumentos 0,41 D",
  "IRRF Day Trade: base R$ 60,00 0,60",
  "Líquido para 17/09/2026 1.543,05 D",
];

function mime(from: string, attachments: { name: string; type: string; data: Uint8Array }[], body = "segue nota") {
  const b = "XYZ";
  const parts = attachments
    .map(
      (a) =>
        `--${b}\r\nContent-Type: ${a.type}; name="${a.name}"\r\nContent-Disposition: attachment; filename="${a.name}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${Buffer.from(a.data).toString("base64").replace(/(.{76})/g, "$1\r\n")}\r\n`,
    )
    .join("");
  return `From: ${from}\r\nTo: n-abcdefghjk23@notas.anzol.app\r\nSubject: Fwd: Nota de corretagem\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="${b}"\r\n\r\n--${b}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}\r\n${parts}--${b}--\r\n`;
}

const AUTH = "mx.cloudflare.net; dkim=pass header.d=gmail.com; spf=pass smtp.mailfrom=gmail.com";
const TO = "n-abcdefghjk23@notas.anzol.app";
const pdf = makeTextPdf(NOTA);
let sql: Sql;
let seq = 0;
const deps = { pdfToLines, newId: () => `imp_${++seq}` };

before(async () => {
  sql = await memorySql(["0007_inbound_notes.sql", "0008_pdf_password.sql"]);
  await sql`insert into inbound_addresses (token, user_id) values ('abcdefghjk23', 'u1')`;
  await sql`insert into inbound_senders (user_id, email, verified_at) values ('u1', 'lucas@gmail.com', now())`;
});

describe("utilitários", () => {
  it("normaliza o remetente do encaminhamento do Gmail", () => {
    assert.equal(normalizeAddress("Lucas+caf_=n-abc=notas.anzol.app@Gmail.com"), "lucas@gmail.com");
    assert.equal(normalizeAddress("Lucas <lucas@gmail.com>"), "lucas@gmail.com");
  });
  it("lê o token do destinatário", () => {
    assert.equal(tokenFromRecipient(TO), "abcdefghjk23");
    assert.equal(tokenFromRecipient("contato@notas.anzol.app"), null);
  });
  it("exige SPF ou DKIM aprovado", () => {
    assert.equal(authPassed(AUTH), true);
    assert.equal(authPassed("dkim=fail; spf=softfail"), false);
    assert.equal(authPassed(null), false);
  });
  it("verifica a assinatura HMAC do Worker", async () => {
    const body = new TextEncoder().encode("abc");
    const sig = createHmac("sha256", "s3cr3t").update("abc").digest("hex");
    assert.equal(await verifySignature(body, sig, "s3cr3t"), true);
    assert.equal(await verifySignature(body, sig, "outro"), false);
    assert.equal(await verifySignature(body, "zz", "s3cr3t"), false);
  });
});

describe("e-mail encaminhado -> nota pendente de revisão", () => {
  it("lê o PDF anexado e cria a importação pendente", async () => {
    const raw = mime("Corretora <noreply@corretora.com.br>", [{ name: "nota.pdf", type: "application/pdf", data: pdf }]);
    const r = await processInboundEmail(sql, { raw, envelopeFrom: "lucas+caf_=x@gmail.com", envelopeTo: TO, authResults: AUTH }, deps);
    assert.equal(r.status, "processed");
    if (r.status !== "processed") return;
    assert.equal(r.imports[0].status, "pending");
    assert.equal(r.imports[0].trades, 1);
    const rows = await sql<{ trades: { asset: string; ajuste: number }[]; status: string; data_pregao: string }>`
      select trades, status, data_pregao from pending_imports where user_id = 'u1'
    `;
    assert.equal(rows[0].status, "pending");
    assert.equal(rows[0].data_pregao, "2026-09-15");
    assert.deepEqual([rows[0].trades[0].asset, rows[0].trades[0].ajuste], ["PETR4", 60]);
  });

  it("o mesmo PDF de novo vira duplicata", async () => {
    const raw = mime("lucas@gmail.com", [{ name: "nota.pdf", type: "application/pdf", data: pdf }]);
    const r = await processInboundEmail(sql, { raw, envelopeFrom: "lucas@gmail.com", envelopeTo: TO, authResults: AUTH }, deps);
    assert.equal(r.status === "processed" && r.imports[0].status, "duplicate");
  });

  it("não guarda o PDF, só o hash", async () => {
    const cols = await sql<{ column_name: string }>`
      select column_name from information_schema.columns where table_name = 'pending_imports'
    `;
    assert.ok(!cols.some((c) => /pdf$|bytes|content/.test(c.column_name)));
  });

  it("remetente fora da lista é recusado", async () => {
    const raw = mime("x@evil.com", [{ name: "nota.pdf", type: "application/pdf", data: pdf }]);
    const r = await processInboundEmail(sql, { raw, envelopeFrom: "x@evil.com", envelopeTo: TO, authResults: AUTH }, deps);
    assert.equal(r.status, "sender_not_allowed");
  });

  it("sem SPF/DKIM aprovado é recusado", async () => {
    const raw = mime("lucas@gmail.com", []);
    const r = await processInboundEmail(sql, { raw, envelopeFrom: "lucas@gmail.com", envelopeTo: TO, authResults: "spf=fail" }, deps);
    assert.equal(r.status, "auth_failed");
  });

  it("endereço desconhecido não processa nada", async () => {
    const r = await processInboundEmail(sql, { raw: "", envelopeFrom: "lucas@gmail.com", envelopeTo: "n-zzzzzzzzzzzz@notas.anzol.app", authResults: AUTH }, deps);
    assert.equal(r.status, "unknown_address");
  });

  it("PDF que não é nota SINACOR vira 'failed' com aviso", async () => {
    const raw = mime("lucas@gmail.com", [{ name: "extrato.pdf", type: "application/pdf", data: makeTextPdf(["Extrato qualquer"]) }]);
    const r = await processInboundEmail(sql, { raw, envelopeFrom: "lucas@gmail.com", envelopeTo: TO, authResults: AUTH }, deps);
    assert.equal(r.status === "processed" && r.imports[0].status, "failed");
  });

  it("guarda o código de confirmação do encaminhamento do Gmail", async () => {
    const raw = mime("Equipe do Gmail <forwarding-noreply@google.com>", [], "Código de confirmação: 123456789");
    const r = await processInboundEmail(sql, { raw, envelopeFrom: "forwarding-noreply@google.com", envelopeTo: TO, authResults: AUTH }, deps);
    assert.equal(r.status, "forward_confirmation");
    const rows = await sql<{ forward_code: string }>`select forward_code from inbound_addresses where token = 'abcdefghjk23'`;
    assert.equal(rows[0].forward_code, "123456789");
  });
});
