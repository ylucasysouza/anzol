import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { Trade } from "@/lib/tcp/types";

const DOMAIN = () => process.env.INBOUND_EMAIL_DOMAIN || "notas.anzol.app";

/** Endereço pessoal de encaminhamento. O e-mail de login vira o remetente autorizado. */
export const getInboundSetup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const { newInboundToken } = await import("@/lib/inbound/pipeline");
    const sql = await getSql();
    let rows = await sql<{ token: string; forward_code: string | null }>`
      select token, forward_code from inbound_addresses where user_id = ${context.userId} and revoked_at is null
    `;
    if (!rows.length) {
      await sql`insert into inbound_addresses (token, user_id) values (${newInboundToken()}, ${context.userId}) on conflict (user_id) do nothing`;
      rows = await sql`select token, forward_code from inbound_addresses where user_id = ${context.userId}`;
    }
    const email = String(context.email ?? "").trim().toLowerCase();
    if (email) {
      await sql`insert into inbound_senders (user_id, email, verified_at) values (${context.userId}, ${email}, now()) on conflict do nothing`;
    }
    return { address: `n-${rows[0].token}@${DOMAIN()}`, forwardCode: rows[0].forward_code, sender: email || null };
  });

export const listPendingImports = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    return sql<{ id: string; nota_numero: string | null; data_pregao: string | null; trades: Trade[]; avisos: string[]; status: string }>`
      select id, nota_numero, data_pregao, trades, avisos, status from pending_imports
      where user_id = ${context.userId} and status in ('pending', 'failed') order by created_at desc limit 50
    `;
  });

/** Aceitar devolve os trades para o app gravar no livro; recusar descarta. */
export const decideImport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => {
    const o = (d ?? {}) as { id?: unknown; accept?: unknown };
    return { id: String(o.id ?? ""), accept: o.accept === true };
  })
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ trades: Trade[] }>`
      update pending_imports set status = ${data.accept ? "accepted" : "rejected"}, decided_at = now()
      where id = ${data.id} and user_id = ${context.userId} and status = 'pending'
      returning trades
    `;
    return { trades: data.accept ? (rows[0]?.trades ?? []) : [] };
  });
