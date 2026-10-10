/**
 * Webhook do Asaas -> assinaturas -> plano. Lógica pura (recebe o `sql`),
 * testável com PGlite. A rota HTTP fica em src/routes/api/asaas/webhook.ts.
 *
 * Convenção: ao criar a assinatura no Asaas (servidor), gravamos
 * externalReference = "anzol:<userId>:<plano>:<ciclo>[:<canal>[:<parceiro>]]".
 * O usuário nunca escolhe isso pelo cliente.
 */
import type { Sql } from "../db.ts";
import { toCents } from "../money.ts";
import type { PlanId } from "../tcp/plans.ts";

export type PaidPlan = Exclude<PlanId, "free">;
export type Cycle = "month" | "year";

/** Preço mínimo aceito por plano/ciclo, em centavos (protege contra pagamento de valor errado). */
export const PRICE_CENTS: Record<"pro" | "baleia", Record<Cycle, number>> = {
  pro: { month: 2990, year: 26900 },
  baleia: { month: 9990, year: 89900 },
};

/** Dias de tolerância depois do fim do período pago (boleto/Pix compensando). */
export const GRACE_DAYS = 3;

export interface AsaasWebhook {
  id?: string;
  event?: string;
  dateCreated?: string;
  payment?: {
    id?: string;
    subscription?: string | null;
    value?: number;
    dueDate?: string;
    paymentDate?: string | null;
    confirmedDate?: string | null;
    externalReference?: string | null;
  };
  subscription?: { id?: string; externalReference?: string | null };
}

export interface ParsedRef {
  userId: string;
  plan: PaidPlan;
  cycle: Cycle;
  canal: string | null;
  parceiro: string | null;
}

export function parseExternalReference(ref: string | null | undefined): ParsedRef | null {
  if (!ref) return null;
  const p = ref.split(":");
  if (p[0] !== "anzol" || p.length < 4) return null;
  const [, userId, plan, cycle, canal, parceiro] = p;
  if (!userId || (plan !== "pro" && plan !== "baleia")) return null;
  if (cycle !== "month" && cycle !== "year") return null;
  return { userId, plan, cycle, canal: canal || null, parceiro: parceiro || null };
}

/** Comparação em tempo constante do token do header `asaas-access-token`. */
export function tokenMatches(sent: string | null, expected: string | undefined): boolean {
  if (!expected || !sent) return false;
  const a = new TextEncoder().encode(sent);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

function addPeriod(fromIso: string, cycle: Cycle): Date {
  const d = new Date(fromIso.length === 10 ? fromIso + "T00:00:00Z" : fromIso);
  if (cycle === "year") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(d.getUTCDate() + GRACE_DAYS);
  return d;
}

export type WebhookResult =
  | { ok: true; action: "duplicate" | "ignored" | "activated" | "overdue" | "canceled" }
  | { ok: false; status: 400; reason: string };

export async function handleAsaasEvent(sql: Sql, body: AsaasWebhook): Promise<WebhookResult> {
  const event = body.event ?? "";
  const handled = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "SUBSCRIPTION_DELETED"];
  if (!handled.includes(event)) return { ok: true, action: "ignored" };

  // Chave de idempotência: id do evento; se ausente, evento + objeto.
  const objId = body.payment?.id ?? body.subscription?.id ?? "";
  const eventId = body.id || `${event}:${objId}`;
  if (!objId && !body.id) return { ok: false, status: 400, reason: "sem id" };
  const fresh = await sql<{ event_id: string }>`
    insert into asaas_events (event_id, event) values (${eventId}, ${event})
    on conflict (event_id) do nothing returning event_id
  `;
  if (fresh.length === 0) return { ok: true, action: "duplicate" };

  if (event === "SUBSCRIPTION_DELETED") {
    const subId = body.subscription?.id;
    if (!subId) return { ok: false, status: 400, reason: "sem assinatura" };
    // Mantém paid_until: o período já pago é respeitado.
    await sql`update subscriptions set status = 'canceled', updated_at = now() where id = ${subId}`;
    return { ok: true, action: "canceled" };
  }

  const pay = body.payment;
  if (!pay?.id) return { ok: false, status: 400, reason: "sem pagamento" };
  const subId = pay.subscription || pay.id;

  if (event === "PAYMENT_OVERDUE") {
    await sql`update subscriptions set status = 'overdue', updated_at = now() where id = ${subId} and status <> 'canceled'`;
    return { ok: true, action: "overdue" };
  }

  // PAYMENT_CONFIRMED (cartão) ou PAYMENT_RECEIVED (Pix/boleto)
  const ref = parseExternalReference(pay.externalReference);
  if (!ref) return { ok: false, status: 400, reason: "externalReference inválida" };
  const minimo = ref.plan === "enterprise" ? 0 : PRICE_CENTS[ref.plan][ref.cycle];
  if (toCents(pay.value ?? 0) < minimo) return { ok: false, status: 400, reason: "valor abaixo do preço do plano" };
  const base = pay.dueDate ?? pay.paymentDate ?? pay.confirmedDate ?? new Date().toISOString().slice(0, 10);
  const until = addPeriod(base, ref.cycle).toISOString();
  // PAYMENT_CONFIRMED e PAYMENT_RECEIVED do mesmo pagamento: o greatest() torna o segundo inócuo.
  await sql`
    insert into subscriptions (id, user_id, plan, cycle, status, paid_until, canal, parceiro, last_payment_id)
    values (${subId}, ${ref.userId}, ${ref.plan}, ${ref.cycle}, 'active', ${until}, ${ref.canal}, ${ref.parceiro}, ${pay.id})
    on conflict (id) do update set
      paid_until = greatest(subscriptions.paid_until, excluded.paid_until),
      status = case when subscriptions.status = 'canceled' then 'canceled' else 'active' end,
      last_payment_id = excluded.last_payment_id,
      updated_at = now()
  `;
  return { ok: true, action: "activated" };
}

const RANK: Record<PlanId, number> = { free: 0, pro: 1, baleia: 2, enterprise: 3 };

export interface ServerEntitlement {
  plan: PlanId;
  role: "user" | "developer";
  /** até quando este plano vale (ISO) — o cliente só usa o cache até aqui */
  validUntil: string | null;
  checkedAt: string;
}

export function ownerEmails(): Set<string> {
  const raw = typeof process !== "undefined" ? process.env.ANZOL_OWNER_EMAILS ?? "" : "";
  return new Set(raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
}

/** Plano = maior plano com pagamento confirmado ainda dentro do período. Nada vem do cliente. */
export async function resolveEntitlement(
  sql: Sql,
  userId: string,
  email: string | null | undefined,
  now: Date = new Date(),
  owners: Set<string> = ownerEmails(),
): Promise<ServerEntitlement> {
  const checkedAt = now.toISOString();
  if (email && owners.has(email.trim().toLowerCase())) {
    return { plan: "enterprise", role: "developer", validUntil: null, checkedAt };
  }
  const rows = await sql<{ plan: string; paid_until: string | Date }>`
    select plan, paid_until from subscriptions
    where user_id = ${userId} and paid_until is not null and paid_until > ${checkedAt}
  `;
  let best: { plan: PlanId; until: string } | null = null;
  for (const r of rows) {
    const plan = r.plan as PlanId;
    const until = new Date(r.paid_until).toISOString();
    if (!best || RANK[plan] > RANK[best.plan] || (plan === best.plan && until > best.until)) best = { plan, until };
  }
  return best
    ? { plan: best.plan, role: "user", validUntil: best.until, checkedAt }
    : { plan: "free", role: "user", validUntil: null, checkedAt };
}
