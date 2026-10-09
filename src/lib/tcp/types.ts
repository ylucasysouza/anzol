import type { CasaState } from "@/lib/casa/types";

export type TaxMode = "monthly_dt" | "annual" | "quarterly_annual";
export type ScopeCode = "BR" | "BR_INTL" | "INTL";
export type TradeTipo = "daytrade" | "swing" | "position";
export type ThemeMode = "dark" | "light";

export interface TaxBracket {
  max: number;
  rate: number;
}

export interface Jurisdiction {
  name: string;
  flag: string;
  cur: string;
  sym: string;
  sc: ScopeCode;
  taxMode: TaxMode;
  rate: number | null;
  swingRate?: number;
  swingExemption?: number;
  code: string;
  note: string;
  ass: string[];
  brackets?: TaxBracket[];
  qDates?: string[];
}

export interface Taxpayer {
  id: string;
  name: string;
  country: string;
  year: number;
  cpf?: string;
}

export interface Account {
  id: string;
  taxpayerId: string;
  name: string;
  trader: string;
  country: string;
  broker: string;
  year: number;
  taxRate?: number | null;
  usBracket?: number;
  initialLoss?: number;
  swingInitialLoss?: number;
  avgPTAX?: number;
}

export interface Trade {
  id: string;
  date: string;
  asset: string;
  tipo?: TradeTipo;
  ajuste?: number | string;
  taxas?: number | string;
  irrf?: number | string;
  totalVendas?: number | string;
  nota?: string;
  dir?: "Buy" | "Sell";
  gross?: number;
  comm?: number;
  ptax?: number | string;
  notes?: string;
  cls?: string;
  sess?: string;
  exit?: string;
  net?: number;
}

export interface Quote {
  price: number;
  chg: number;
  pct: number;
  name: string;
}

export interface Dividend {
  ticker: string;
  isJCP: boolean;
  rate: number;
  pay: string;
  total: number;
}

export interface CashDividend {
  type?: string;
  label?: string;
  rate?: number;
  paymentDate?: string;
}

export interface Position {
  id: string;
  ticker: string;
  shares: number;
  avgPrice: number;
  dateAdded: string;
}

export interface Portfolio {
  positions: Position[];
  prices: Record<string, Quote>;
  dividends: Record<string, CashDividend[]>;
  lastFetch: number | null;
}

export interface DtResult {
  gross: number;
  fees: number;
  irrf: number;
  comm: number;
  net: number;
  prevC: number;
  base: number;
  td: number | null;
  darf: number | null;
  nc: number;
  count: number;
  sc: string;
}

export interface SwingResult {
  gross: number;
  fees: number;
  irrf: number;
  net: number;
  prevC: number;
  base: number;
  td: number;
  darf: number;
  nc: number;
  count: number;
  totalVendas: number;
  exempt: boolean;
  sc: "SWING";
}

export interface AdvStats {
  wr: number;
  aw: number;
  al: number;
  pf: number;
  exp: number;
  best: number;
  worst: number;
  wins: number;
  losses: number;
}

export interface QuarterEst {
  q: string;
  months: string;
  net: number;
  est: number;
  due: string;
}

export interface CarneLeaoRow {
  month: string;
  netUSD: number;
  netBRL: number | null;
  carneLeao: number;
}

export interface BrIntlAnnual {
  gross: number;
  comm: number;
  net: number;
  netBRL: number | null;
  tax: number | null;
  avgPTAX: number;
  carneLeao: CarneLeaoRow[];
}

export interface ConsolResult {
  accounts: string[];
  totNet: number;
  totIRRF: number;
  baseDT: number;
  darfDT: number;
  darfSW: number;
  totalDARF: number;
}

export interface EquityPoint {
  i: number;
  date: string;
  name: string;
  eq: number;
}

export interface Drawdown {
  amount: number;
  pct: number;
}

export interface PersistedTcp {
  taxpayers: Taxpayer[];
  accounts: Account[];
  activeId: string | null;
  trades: Record<string, Trade[]>;
  conv: Record<string, number>;
  theme: ThemeMode;
  view: string;
  portfolio: Portfolio;
  skipAutoDemo: boolean;
  casa?: CasaState;
}
