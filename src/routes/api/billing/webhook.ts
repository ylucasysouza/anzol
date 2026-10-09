import { createFileRoute } from "@tanstack/react-router";
import { grantPlan } from "@/lib/tcp/entitlement-api";
import type { PlanId } from "@/lib/tcp/plans";

const PLANS = new Set<PlanId>(["pro", "baleia", "enterprise"]);

export const Route = createFileRoute("/api/billing/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.BILLING_WEBHOOK_SECRET;
        const sent = request.headers.get("x-anzol-signature");
        if (!secret || sent !== secret) return new Response("unauthorized", { status: 401 });
        let body: { event?: string; userId?: string; plan?: string; cycle?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response("invalid", { status: 400 });
        }
        const event = body.event ?? "";
        if (event !== "payment.approved" && event !== "pix.received") {
          return Response.json({ ok: true, ignored: true });
        }
        const plan = body.plan as PlanId;
        const userId = String(body.userId ?? "");
        if (!userId || !PLANS.has(plan)) return new Response("invalid", { status: 400 });
        const cycle = body.cycle === "year" ? "year" : "month";
        await grantPlan(userId, plan, cycle);
        return Response.json({ ok: true });
      },
    },
  },
});
