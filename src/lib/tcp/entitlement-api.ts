import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { ServerEntitlement } from "@/lib/billing/asaas";

/**
 * Plano do usuário, calculado SÓ no servidor a partir de pagamentos confirmados
 * pelo Asaas (tabela subscriptions). Dono/desenvolvedor só por ANZOL_OWNER_EMAILS.
 * Nenhum valor vindo do cliente é aceito.
 */
export const getEntitlement = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ServerEntitlement> => {
    const { getSql } = await import("@/lib/db");
    const { resolveEntitlement } = await import("@/lib/billing/asaas");
    return resolveEntitlement(await getSql(), context.userId, context.email ?? null);
  });

/** Cancela no Asaas; o acesso segue até o fim do período pago (webhook SUBSCRIPTION_DELETED). */
export const cancelEntitlement = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const key = process.env.ASAAS_API_KEY;
    if (!key) throw new Error("ASAAS_API_KEY não configurada");
    const base = process.env.ASAAS_API_URL || "https://api-sandbox.asaas.com/v3";
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const subs = await sql<{ id: string }>`
      select id from subscriptions where user_id = ${context.userId} and status <> 'canceled' and id like 'sub_%'
    `;
    for (const s of subs) {
      const res = await fetch(`${base}/subscriptions/${encodeURIComponent(s.id)}`, {
        method: "DELETE",
        headers: { access_token: key, "User-Agent": "anzol" },
      });
      if (!res.ok) throw new Error(`Asaas recusou o cancelamento (${res.status})`);
    }
    return { ok: true as const, count: subs.length };
  });
