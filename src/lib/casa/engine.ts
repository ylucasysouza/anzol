import {
  DEBT_PAY_LINES,
  FIXED_LINES,
  INCOME_LINES,
  VARIABLE_LINES,
  type CasaGoals,
  type CasaLines,
  type CasaParams,
  type CasaState,
  type CasaYear,
  type DebtPayKey,
  type FixedKey,
  type GoalRow,
  type IncomeKey,
  type Month12,
  type MonthSnapshot,
  type VariableKey,
} from "./types.ts";

export function zeros12(): Month12 {
  return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
}

export function money(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function emptyLines(): CasaLines {
  return {
    income: {
      salary: zeros12(),
      extra: zeros12(),
      investIncome: zeros12(),
      otherIncome: zeros12(),
    },
    fixed: {
      housing: zeros12(),
      condo: zeros12(),
      energy: zeros12(),
      water: zeros12(),
      internet: zeros12(),
      insurance: zeros12(),
      education: zeros12(),
      subscriptions: zeros12(),
    },
    variable: {
      food: zeros12(),
      transport: zeros12(),
      leisure: zeros12(),
      personal: zeros12(),
      clothing: zeros12(),
      otherVar: zeros12(),
    },
    debtPay: {
      cardPay: zeros12(),
      loanPay: zeros12(),
    },
  };
}

function sumGroup(group: Record<string, Month12>, month: number): number {
  let t = 0;
  for (const arr of Object.values(group)) t += arr[month] || 0;
  return money(t);
}

function yearSum(arr: Month12): number {
  return money(arr.reduce((s, n) => s + (n || 0), 0));
}

export function lineYear(arr: Month12): number {
  return yearSum(arr);
}

export function monthsWithValue(arr: Month12): number {
  return arr.filter((n) => n > 0).length;
}

export function monthlyAvg(arr: Month12): number | null {
  const n = monthsWithValue(arr);
  if (!n) return null;
  return money(yearSum(arr) / n);
}

export function computeCasa(state: CasaState, extraAssets = 0): CasaYear {
  const { params, lines, investOverride, cardSpend, goods } = state;
  const months: MonthSnapshot[] = [];
  let cash = params.initialCash;
  let invest = params.initialInvest;
  let card = params.initialCard;
  let loans = params.initialLoans;

  for (let m = 0; m < 12; m++) {
    const income = sumGroup(lines.income, m);
    const fixed = sumGroup(lines.fixed, m);
    const variable = sumGroup(lines.variable, m);
    const debtPay = sumGroup(lines.debtPay, m);
    const expenses = money(fixed + variable + debtPay);
    const surplus = money(income - expenses);
    const autoInvest = money(income * (params.investPct || 0));
    const invested = investOverride[m] > 0 ? money(investOverride[m]) : autoInvest;
    const cashStart = money(cash);
    const investStart = money(invest);
    const charged = money(cardSpend[m] || 0);
    const payOpening = params.payOpeningCard === true;
    const invoicePaid = money((m === 0 && payOpening ? params.initialCard : 0) + (m > 0 ? cardSpend[m - 1] || 0 : 0));
    const cashFlow = money(income - invested - expenses + charged - invoicePaid);
    const cashEnd = money(cashStart + cashFlow);
    const investEnd = money(investStart + invested);
    const goodsVal = goods[m] > 0 ? goods[m] : params.initialGoods;
    const openInvoice = charged;
    const openingLeft = payOpening ? 0 : money(params.initialCard);
    card = money(openingLeft + openInvoice);
    loans = money(Math.max(0, loans - (lines.debtPay.loanPay[m] || 0)));
    const assets = money(cashEnd + investEnd + goodsVal + extraAssets);
    const liabilities = money(card + loans);
    const cardFloat = money(charged * (params.floatYield || 0));
    const floatAccum = money((months[m - 1]?.floatAccum ?? 0) + cardFloat);
    months.push({
      income,
      fixed,
      variable,
      debtPay,
      expenses,
      surplus,
      savingsRate: income > 0 ? surplus / income : null,
      invested,
      cashStart,
      cashEnd,
      cashFlow,
      investStart,
      investEnd,
      goods: goodsVal,
      cardDebt: card,
      loanDebt: loans,
      assets,
      liabilities,
      netWorth: money(assets - liabilities),
      cardFloat,
      floatAccum,
      charged,
      invoicePaid,
      openInvoice,
      freeCash: money(cashEnd - openInvoice),
    });
    cash = cashEnd;
    invest = investEnd;
  }

  const income = money(months.reduce((s, x) => s + x.income, 0));
  const expenses = money(months.reduce((s, x) => s + x.expenses, 0));
  const surplus = money(months.reduce((s, x) => s + x.surplus, 0));
  const withIncome = months.filter((x) => x.income > 0);
  const avgSavingsRate =
    withIncome.length > 0
      ? withIncome.reduce((s, x) => s + (x.savingsRate ?? 0), 0) / withIncome.length
      : null;
  const startLiab = money(params.initialCard + params.initialLoans);
  const startAssets = money(params.initialCash + params.initialInvest + params.initialGoods + extraAssets);

  return {
    months,
    income,
    expenses,
    surplus,
    savingsRate: income > 0 ? surplus / income : null,
    avgSavingsRate,
    invested: money(months.reduce((s, x) => s + x.invested, 0)),
    cashEnd: months[11].cashEnd,
    investEnd: months[11].investEnd,
    netWorthStart: money(startAssets - startLiab),
    netWorthEnd: months[11].netWorth,
    cardSpend: yearSum(cardSpend),
    cardFloat: money(months.reduce((s, x) => s + x.cardFloat, 0)),
    fixed: money(months.reduce((s, x) => s + x.fixed, 0)),
    variable: money(months.reduce((s, x) => s + x.variable, 0)),
    debtPay: money(months.reduce((s, x) => s + x.debtPay, 0)),
  };
}

export function computeGoals(state: CasaState): { rows: GoalRow[]; impact: number | null } {
  const rows: GoalRow[] = [];
  for (const line of [...FIXED_LINES, ...VARIABLE_LINES]) {
    const arr =
      line.key in state.lines.fixed
        ? state.lines.fixed[line.key as FixedKey]
        : state.lines.variable[line.key as VariableKey];
    const n = monthsWithValue(arr);
    const pct = state.goals.reduce[line.key as FixedKey | VariableKey] ?? 0;
    if (!n) {
      rows.push({ key: line.key, label: line.label, avg: null, pct, target: null, yearImpact: null, kind: "reduce" });
      continue;
    }
    const rawAvg = yearSum(arr) / n;
    const target = money(rawAvg * (1 - pct));
    const yearImpact = money(rawAvg * pct * 12);
    rows.push({ key: line.key, label: line.label, avg: money(rawAvg), pct, target, yearImpact, kind: "reduce" });
  }
  for (const line of INCOME_LINES) {
    const avgMonths = monthsWithValue(state.lines.income[line.key]);
    const pct = state.goals.increase[line.key] ?? 0;
    if (!avgMonths) {
      rows.push({ key: line.key, label: line.label, avg: null, pct, target: null, yearImpact: null, kind: "increase" });
      continue;
    }
    const rawAvg = yearSum(state.lines.income[line.key]) / avgMonths;
    const target = money(rawAvg * (1 + pct));
    const yearImpact = money(rawAvg * pct * 12);
    rows.push({ key: line.key, label: line.label, avg: money(rawAvg), pct, target, yearImpact, kind: "increase" });
  }
  const known = rows.map((r) => r.yearImpact).filter((n): n is number => n != null);
  const impact = known.length ? money(known.reduce((s, n) => s + n, 0)) : null;
  return { rows, impact };
}

export function defaultGoals(): CasaGoals {
  return {
    reduce: {
      leisure: 0.2,
      food: 0.05,
      transport: 0.1,
      subscriptions: 0.3,
      clothing: 0.15,
      otherVar: 0.1,
    },
    increase: {
      salary: 0.05,
      extra: 0.25,
      investIncome: 0.15,
    },
  };
}

export function emptyCasa(partial?: Partial<CasaParams>): CasaState {
  return {
    params: {
      familyName: "Família",
      year: 2026,
      currency: "R$",
      initialCash: 0,
      initialInvest: 0,
      initialGoods: 0,
      initialCard: 0,
      initialLoans: 0,
      floatYield: 0,
      investPct: 0,
      payOpeningCard: true,
      ...partial,
    },
    lines: emptyLines(),
    investOverride: zeros12(),
    cardSpend: zeros12(),
    goods: zeros12(),
    goals: defaultGoals(),
  };
}

export function patchMonth(arr: Month12, month: number, value: number): Month12 {
  const next = arr.slice();
  next[month] = money(value);
  return next;
}

export function isCasaState(value: unknown): value is CasaState {
  if (!value || typeof value !== "object") return false;
  const v = value as CasaState;
  return Boolean(v.params && v.lines && Array.isArray(v.investOverride) && v.goals);
}

export { DEBT_PAY_LINES, FIXED_LINES, INCOME_LINES, VARIABLE_LINES };
export type { DebtPayKey, FixedKey, IncomeKey, VariableKey };
