/** Regras da escolha do usuário sobre a senha do PDF (lógica pura, testável). */
import type { Sql } from "../db.ts";
import { sealSecret } from "./secret-box.ts";

export type PdfPasswordChoice = "store" | "none" | null;

export async function getChoice(sql: Sql, userId: string): Promise<{ choice: PdfPasswordChoice; hasPassword: boolean }> {
  const r = await sql<{ choice: "store" | "none"; password_enc: string | null }>`
    select choice, password_enc from pdf_password_prefs where user_id = ${userId}
  `;
  return { choice: r[0]?.choice ?? null, hasPassword: Boolean(r[0]?.password_enc) };
}

/** Opção A: guarda a senha cifrada. */
export async function storePassword(sql: Sql, userId: string, password: string, keyB64: string | undefined) {
  const p = password.trim();
  if (!p || p.length > 64) throw new Error("Senha inválida");
  const sealed = await sealSecret(p, userId, keyB64);
  await sql`
    insert into pdf_password_prefs (user_id, choice, password_enc) values (${userId}, 'store', ${sealed})
    on conflict (user_id) do update set choice = 'store', password_enc = excluded.password_enc, updated_at = now()
  `;
}

/** Opção B: não guardar senha (apaga a que existir). */
export async function chooseNoPassword(sql: Sql, userId: string) {
  await sql`
    insert into pdf_password_prefs (user_id, choice, password_enc) values (${userId}, 'none', null)
    on conflict (user_id) do update set choice = 'none', password_enc = null, updated_at = now()
  `;
}

/** Direito de exclusão (LGPD): remove senha e escolha. */
export async function deletePassword(sql: Sql, userId: string) {
  await sql`delete from pdf_password_prefs where user_id = ${userId}`;
}
