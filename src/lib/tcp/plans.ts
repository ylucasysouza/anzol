export type PlanId = "free" | "pro" | "baleia" | "enterprise";
export type Role = "user" | "developer";

export type Feature =
  | "apuracao_day_swing"
  | "compensacao_prejuizo"
  | "gastos_conta"
  | "fluxo_caixa"
  | "api_read"
  | "api_write"
  | "dre"
  | "balanco"
  | "investimentos"
  | "opcoes_corretora"
  | "multi_pais"
  | "auditoria_lote";

const RANK: Record<PlanId, number> = { free: 0, pro: 1, baleia: 2, enterprise: 3 };

const MIN: Record<Feature, PlanId> = {
  apuracao_day_swing: "free",
  // Decisão de produto (out/2026): compensação de prejuízo é recurso do Pro.
  // Ainda NÃO está ligada na tela: hoje o motor compensa para todos.
  compensacao_prejuizo: "pro",
  gastos_conta: "pro",
  fluxo_caixa: "pro",
  api_read: "baleia",
  api_write: "enterprise",
  dre: "baleia",
  balanco: "baleia",
  investimentos: "baleia",
  opcoes_corretora: "baleia",
  multi_pais: "baleia",
  auditoria_lote: "enterprise",
};

export type Entitlement = { plan: PlanId; role: Role };

export function allows(ent: Entitlement, feature: Feature): boolean {
  if (ent.role === "developer") return true;
  return RANK[ent.plan] >= RANK[MIN[feature]];
}

export function accountLimit(ent: Entitlement): number {
  if (ent.role === "developer") return Number.POSITIVE_INFINITY;
  if (ent.plan === "free") return 1;
  if (ent.plan === "pro") return 3;
  if (ent.plan === "baleia") return 10;
  return Number.POSITIVE_INFINITY;
}

export function historyDays(ent: Entitlement): number {
  if (ent.role === "developer") return Number.POSITIVE_INFINITY;
  if (ent.plan === "free") return 90;
  if (ent.plan === "pro") return 730;
  return Number.POSITIVE_INFINITY;
}

export function monthAllowed(ent: Entitlement, year: number, month: number): boolean {
  const days = historyDays(ent);
  if (!Number.isFinite(days)) return true;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days);
  const end = new Date(year, month + 1, 0);
  return end >= start;
}

export function allowsPdf(ent: Entitlement): boolean {
  if (ent.role === "developer") return true;
  return RANK[ent.plan] >= RANK.pro;
}

export function countryAllowed(ent: Entitlement, country: string | undefined): boolean {
  if (allows(ent, "multi_pais")) return true;
  return !country || country === "BR";
}


/** Company checkout. Empty until the PJ Mercado Pago link is pasted here. */
export const CHECKOUT: Record<"pro_month" | "pro_year" | "baleia_month" | "baleia_year", string> = {
  pro_month: "",
  pro_year: "",
  baleia_month: "",
  baleia_year: "",
};

export const PLAN_PRICE = {
  free: 0,
  // Decisão Chairman 09/10/2026: Pro R$29,90/mês ou R$269/ano; Baleia inalterado.
  proMonth: 29.9,
  proYear: 269,
  baleiaMonth: 99.9,
  baleiaYear: 899,
  enterpriseFrom: 2990,
} as const;
