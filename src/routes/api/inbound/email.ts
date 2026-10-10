import { createFileRoute } from "@tanstack/react-router";

/**
 * Recebe o e-mail bruto (MIME) do Worker do Cloudflare Email Routing.
 * Headers: x-anzol-signature (HMAC-SHA256 hex do corpo com INBOUND_WEBHOOK_SECRET),
 * x-envelope-from, x-envelope-to, x-auth-results.
 * Responde 200 mesmo quando recusa (o Worker não deve reenviar), exceto assinatura inválida.
 */
export const Route = createFileRoute("/api/inbound/email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { processInboundEmail, verifySignature, MAX_PDF_BYTES, MAX_PDFS } = await import("@/lib/inbound/pipeline");
        const body = new Uint8Array(await request.arrayBuffer());
        if (body.byteLength > MAX_PDF_BYTES * MAX_PDFS + 1_000_000) return new Response("too large", { status: 413 });
        const ok = await verifySignature(body, request.headers.get("x-anzol-signature"), process.env.INBOUND_WEBHOOK_SECRET);
        if (!ok) return new Response("unauthorized", { status: 401 });
        const { getSql } = await import("@/lib/db");
        const { pdfToLines } = await import("@/lib/inbound/pdf-text");
        const r = await processInboundEmail(
          await getSql(),
          {
            raw: body,
            envelopeFrom: request.headers.get("x-envelope-from") ?? "",
            envelopeTo: request.headers.get("x-envelope-to") ?? "",
            authResults: request.headers.get("x-auth-results"),
          },
          { pdfToLines, pdfKey: process.env.ANZOL_PDF_KEY },
        );
        // Não devolve conteúdo da nota: só o status.
        return Response.json({ status: r.status });
      },
    },
  },
});
