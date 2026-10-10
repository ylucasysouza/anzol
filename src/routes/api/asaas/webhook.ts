import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook do Asaas (configurar no painel do Asaas com o mesmo token de ASAAS_WEBHOOK_TOKEN).
 * O Asaas envia o token no header `asaas-access-token`.
 */
export const Route = createFileRoute("/api/asaas/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleAsaasEvent, tokenMatches } = await import("@/lib/billing/asaas");
        if (!tokenMatches(request.headers.get("asaas-access-token"), process.env.ASAAS_WEBHOOK_TOKEN)) {
          return new Response("unauthorized", { status: 401 });
        }
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("invalid", { status: 400 });
        }
        const { getSql } = await import("@/lib/db");
        const r = await handleAsaasEvent(await getSql(), body as never);
        // 400 só para payload inválido; o Asaas reenvia em erro, então eventos válidos sempre 200.
        return r.ok ? Response.json(r) : Response.json(r, { status: r.status });
      },
    },
  },
});
