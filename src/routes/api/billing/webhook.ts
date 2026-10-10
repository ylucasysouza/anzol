import { createFileRoute } from "@tanstack/react-router";

// Desativado: liberava plano com um segredo compartilhado, sem confirmação de pagamento.
// O único caminho de liberação agora é /api/asaas/webhook.
export const Route = createFileRoute("/api/billing/webhook")({
  server: {
    handlers: {
      POST: async () => new Response("gone: use /api/asaas/webhook", { status: 410 }),
    },
  },
});
