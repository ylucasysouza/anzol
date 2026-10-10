/**
 * Cache offline do plano. Guarda SÓ a última resposta do servidor, por usuário,
 * e ela vale no máximo até `validUntil` (fim do período pago) e por até
 * MAX_OFFLINE_DAYS desde a última checagem. Sem resposta válida => Grátis.
 * Chaves antigas (anzol-plan/anzol-role), que o próprio cliente escrevia, são ignoradas e apagadas.
 */
import type { Entitlement, PlanId } from "./plans.ts";

export const CACHE_KEY = "anzol-ent-v2";
export const MAX_OFFLINE_DAYS = 7;
export const FREE: Entitlement = { plan: "free", role: "user" };

export interface CachedEnt {
  userId: string;
  plan: PlanId;
  role: "user" | "developer";
  validUntil: string | null;
  checkedAt: string;
}

export function fromCache(raw: string | null, userId: string | null, now: Date = new Date()): Entitlement {
  if (!raw || !userId) return FREE;
  let c: CachedEnt;
  try {
    c = JSON.parse(raw) as CachedEnt;
  } catch {
    return FREE;
  }
  if (c.userId !== userId) return FREE;
  const checked = Date.parse(c.checkedAt);
  if (!Number.isFinite(checked) || checked > now.getTime()) return FREE;
  if (now.getTime() - checked > MAX_OFFLINE_DAYS * 86400000) return FREE;
  if (c.role !== "developer") {
    if (!c.validUntil || Date.parse(c.validUntil) <= now.getTime()) return FREE;
  }
  const plan: PlanId = ["pro", "baleia", "enterprise", "free"].includes(c.plan) ? c.plan : "free";
  return { plan, role: c.role === "developer" ? "developer" : "user" };
}
