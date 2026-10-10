/**
 * Ingestão de nota de corretagem por e-mail encaminhado.
 * Fluxo: Worker do Cloudflare (Email Routing) -> POST /api/inbound/email (MIME bruto, assinado)
 *        -> endereço n-<token> identifica o usuário -> remetente autorizado + SPF/DKIM
 *        -> anexos PDF -> texto -> parser SINACOR -> pending_imports (aguarda revisão).
 * LGPD: o PDF só existe em memória durante o processamento; guardamos apenas o hash.
 */
import type { Sql } from "../db.ts";
import { notaToTrades, parseNotaSinacor } from "../tcp/nota-corretagem.ts";
import { openSecret } from "./secret-box.ts";

export const MSG_SEM_SENHA =
  "Sem a senha, as notas protegidas não podem ser importadas automaticamente e você precisará lançá-las manualmente.";

export const INBOUND_DOMAIN_DEFAULT = "notas.anzol.app"; // a definir
export const MAX_PDF_BYTES = 5 * 1024 * 1024;
export const MAX_PDFS = 10;

export interface InboundInput {
  raw: string | Uint8Array | ArrayBuffer; // MIME completo
  envelopeFrom: string;
  envelopeTo: string;
  /** cabeçalho Authentication-Results repassado pelo Worker */
  authResults?: string | null;
}

export interface InboundDeps {
  pdfToLines: (pdf: Uint8Array, password?: string) => Promise<string>;
  /** ANZOL_PDF_KEY (base64, 32 bytes) para abrir a senha guardada do usuário */
  pdfKey?: string;
  newId?: () => string;
}

export type InboundResult =
  | { status: "unknown_address" }
  | { status: "sender_not_allowed"; sender: string }
  | { status: "auth_failed" }
  | { status: "forward_confirmation"; userId: string }
  | { status: "no_pdf"; userId: string }
  | {
      status: "processed";
      userId: string;
      imports: { id: string; status: "pending" | "failed" | "duplicate" | "needs_password"; trades: number; avisos: string[] }[];
    };

/** Gmail encaminha com MAIL FROM "lucas+caf_=...@gmail.com": remove o +sufixo. */
export function normalizeAddress(addr: string): string {
  const m = addr.trim().toLowerCase().replace(/^.*<([^>]+)>.*$/, "$1");
  const [local, domain] = m.split("@");
  if (!domain) return m;
  return `${local.split("+")[0]}@${domain}`;
}

export function tokenFromRecipient(to: string): string | null {
  const m = to.trim().toLowerCase().match(/^n-([a-z0-9]{10,40})@/);
  return m ? m[1] : null;
}

export function authPassed(authResults: string | null | undefined): boolean {
  if (!authResults) return false;
  return /\b(dkim|spf)=pass\b/i.test(authResults);
}

export function newInboundToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", data as BufferSource);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function toBytes(c: string | ArrayBuffer | Uint8Array): Uint8Array {
  if (typeof c === "string") return new TextEncoder().encode(c);
  return c instanceof Uint8Array ? c : new Uint8Array(c);
}

export async function processInboundEmail(sql: Sql, input: InboundInput, deps: InboundDeps): Promise<InboundResult> {
  const token = tokenFromRecipient(input.envelopeTo);
  if (!token) return { status: "unknown_address" };
  const addr = await sql<{ user_id: string }>`
    select user_id from inbound_addresses where token = ${token} and revoked_at is null
  `;
  if (!addr.length) return { status: "unknown_address" };
  const userId = addr[0].user_id;

  if (!authPassed(input.authResults)) return { status: "auth_failed" };

  const PostalMime = (await import("postal-mime")).default;
  const email = await PostalMime.parse(input.raw as never);
  const headerFrom = normalizeAddress(email.from?.address ?? "");
  const envFrom = normalizeAddress(input.envelopeFrom);

  // Confirmação de encaminhamento do Gmail: guarda o código para o usuário ver no app.
  if (headerFrom === "forwarding-noreply@google.com") {
    const text = `${email.subject ?? ""}\n${email.text ?? ""}`;
    const code = text.match(/(?:c[oó]digo de confirma[cç][aã]o|confirmation code)\s*:?\s*(\d{6,12})/i)?.[1] ?? null;
    await sql`update inbound_addresses set forward_code = ${code}, forward_code_at = now() where token = ${token}`;
    return { status: "forward_confirmation", userId };
  }

  const allowed = await sql<{ email: string }>`
    select email from inbound_senders where user_id = ${userId} and verified_at is not null
  `;
  const allow = new Set(allowed.map((r) => r.email.toLowerCase()));
  if (!allow.has(envFrom) && !allow.has(headerFrom)) return { status: "sender_not_allowed", sender: envFrom };

  const pdfs = (email.attachments ?? [])
    .filter((a) => /pdf/i.test(a.mimeType ?? "") || /\.pdf$/i.test(a.filename ?? ""))
    .slice(0, MAX_PDFS);
  if (!pdfs.length) return { status: "no_pdf", userId };

  // Senha do PDF (se o usuário escolheu guardar). Aberta só em memória, nunca registrada.
  const pref = await sql<{ choice: string; password_enc: string | null }>`
    select choice, password_enc from pdf_password_prefs where user_id = ${userId}
  `;
  let password: string | undefined;
  if (pref[0]?.choice === "store" && pref[0].password_enc) {
    try {
      password = await openSecret(pref[0].password_enc, userId, deps.pdfKey);
    } catch {
      password = undefined;
    }
  }

  const imports: Extract<InboundResult, { status: "processed" }>["imports"] = [];
  for (const att of pdfs) {
    let bytes: Uint8Array | null = toBytes(att.content as never);
    const id = deps.newId?.() ?? crypto.randomUUID();
    if (bytes.byteLength > MAX_PDF_BYTES) {
      imports.push({ id, status: "failed", trades: 0, avisos: ["PDF maior que 5 MB."] });
      continue;
    }
    const hash = await sha256Hex(bytes);
    let texto = "";
    const avisos: string[] = [];
    let needsPassword = false;
    try {
      texto = await deps.pdfToLines(bytes, password);
    } catch (e) {
      if ((e as Error)?.name === "PdfPasswordError") {
        needsPassword = true;
        const wrong = (e as { reason?: string }).reason === "wrong";
        if (pref[0]?.choice === "none") avisos.push(`Nota protegida por senha. ${MSG_SEM_SENHA}`);
        else if (wrong) avisos.push("A senha guardada não abriu esta nota. Atualize a senha ou lance a nota manualmente.");
        else avisos.push("Nota protegida por senha. Escolha: guardar a senha (recomendado) ou lançar manualmente.");
      } else {
        avisos.push("Não consegui ler o PDF.");
      }
    } finally {
      bytes = null; // LGPD: o PDF não sai da memória nem é gravado
    }
    const nota = parseNotaSinacor(texto);
    const trades = nota.operacoes.length ? notaToTrades(nota) : [];
    const all = needsPassword ? avisos : [...avisos, ...nota.avisos];
    const status = needsPassword ? "needs_password" : nota.operacoes.length ? "pending" : "failed";
    const ins = await sql<{ id: string }>`
      insert into pending_imports (id, user_id, pdf_sha256, nota_numero, data_pregao, trades, operacoes, avisos, status)
      values (${id}, ${userId}, ${hash}, ${nota.numero}, ${nota.dataPregao}, ${JSON.stringify(trades)}::jsonb,
              ${JSON.stringify(nota.operacoes)}::jsonb, ${JSON.stringify(all)}::jsonb, ${status})
      on conflict (user_id, pdf_sha256) do update set
        nota_numero = excluded.nota_numero, data_pregao = excluded.data_pregao, trades = excluded.trades,
        operacoes = excluded.operacoes, avisos = excluded.avisos, status = excluded.status, created_at = now()
      where pending_imports.status = 'needs_password'  -- reenvio depois de cadastrar a senha
      returning id
    `;
    imports.push({ id, status: ins.length ? status : "duplicate", trades: trades.length, avisos: all });
  }
  return { status: "processed", userId, imports };
}

/** HMAC-SHA256 (hex) do corpo, com o segredo compartilhado com o Worker. */
export async function verifySignature(body: Uint8Array, sigHex: string | null, secret: string | undefined): Promise<boolean> {
  if (!secret || !sigHex) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const sig = sigHex.match(/^[0-9a-f]{64}$/i) ? Uint8Array.from(sigHex.match(/../g)!.map((h) => parseInt(h, 16))) : null;
  if (!sig) return false;
  return crypto.subtle.verify("HMAC", key, sig as BufferSource, body as BufferSource);
}
