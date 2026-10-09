export type IncomeKey = "salary" | "extra" | "investIncome" | "otherIncome";
export type FixedKey =
  | "housing"
  | "condo"
  | "energy"
  | "water"
  | "internet"
  | "insurance"
  | "education"
  | "subscriptions";
export type VariableKey = "food" | "transport" | "leisure" | "personal" | "clothing" | "otherVar";
export type DebtPayKey = "cardPay" | "loanPay";

export interface LineDef<K extends string = string> {
  key: K;
  label: string;
}

export const INCOME_LINES: LineDef<IncomeKey>[] = [
  { key: "salary", label: "Salário / Pró-labore" },
  { key: "extra", label: "Renda Extra / Freelance" },
  { key: "investIncome", label: "Rendimentos de Investimentos" },
  { key: "otherIncome", label: "Outras Receitas" },
];

export const FIXED_LINES: LineDef<FixedKey>[] = [
  { key: "housing", label: "Moradia (Aluguel/Financiamento)" },
  { key: "condo", label: "Condomínio" },
  { key: "energy", label: "Energia Elétrica" },
  { key: "water", label: "Água" },
  { key: "internet", label: "Internet / Telefone" },
  { key: "insurance", label: "Seguros" },
  { key: "education", label: "Educação" },
  { key: "subscriptions", label: "Assinaturas" },
];

export const VARIABLE_LINES: LineDef<VariableKey>[] = [
  { key: "food", label: "Alimentação / Mercado" },
  { key: "transport", label: "Transporte / Combustível" },
  { key: "leisure", label: "Lazer / Entretenimento" },
  { key: "personal", label: "Cuidados Pessoais" },
  { key: "clothing", label: "Vestuário" },
  { key: "otherVar", label: "Outras Despesas Variáveis" },
];

export const DEBT_PAY_LINES: LineDef<DebtPayKey>[] = [
  { key: "cardPay", label: "Juros e encargos do cartão" },
  { key: "loanPay", label: "Pagamento de Empréstimos/Financiamentos" },
];

export interface CasaParams {
  familyName: string;
  year: number;
  currency: string;
  initialCash: number;
  initialInvest: number;
  initialGoods: number;
  initialCard: number;
  initialLoans: number;
  floatYield: number;
  investPct: number;
  /** true = a fatura em aberto de 31/12 é paga em janeiro (modelo da planilha). */
  payOpeningCard?: boolean;
}

export type Month12 = number[];

export interface CasaLines {
  income: Record<IncomeKey, Month12>;
  fixed: Record<FixedKey, Month12>;
  variable: Record<VariableKey, Month12>;
  debtPay: Record<DebtPayKey, Month12>;
}

export interface CasaGoals {
  reduce: Partial<Record<FixedKey | VariableKey, number>>;
  increase: Partial<Record<IncomeKey, number>>;
}

export interface CasaState {
  params: CasaParams;
  lines: CasaLines;
  investOverride: Month12;
  cardSpend: Month12;
  goods: Month12;
  goals: CasaGoals;
}

export interface MonthSnapshot {
  income: number;
  fixed: number;
  variable: number;
  debtPay: number;
  expenses: number;
  surplus: number;
  savingsRate: number | null;
  invested: number;
  cashStart: number;
  cashEnd: number;
  cashFlow: number;
  investStart: number;
  investEnd: number;
  goods: number;
  cardDebt: number;
  loanDebt: number;
  assets: number;
  liabilities: number;
  netWorth: number;
  cardFloat: number;
  floatAccum: number;
  charged: number;
  invoicePaid: number;
  openInvoice: number;
  freeCash: number;
}

export interface GoalRow {
  key: string;
  label: string;
  avg: number | null;
  pct: number;
  target: number | null;
  yearImpact: number | null;
  kind: "reduce" | "increase";
}

export interface CasaYear {
  months: MonthSnapshot[];
  income: number;
  expenses: number;
  surplus: number;
  savingsRate: number | null;
  avgSavingsRate: number | null;
  invested: number;
  cashEnd: number;
  investEnd: number;
  netWorthStart: number;
  netWorthEnd: number;
  cardSpend: number;
  cardFloat: number;
  fixed: number;
  variable: number;
  debtPay: number;
}
