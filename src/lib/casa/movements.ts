import { DEBT_PAY_LINES, FIXED_LINES, INCOME_LINES, VARIABLE_LINES, type CasaState } from "./types";
import { lineLabel } from "./labels";

export type MoveTone = "in" | "out" | "card";

export interface Move {
  id: string;
  label: string;
  amount: number;
  tone: MoveTone;
}

function pushLine(
  out: Move[],
  id: string,
  label: string,
  amount: number,
  tone: MoveTone,
) {
  if (!amount) return;
  out.push({ id, label, amount: tone === "in" ? amount : -Math.abs(amount), tone });
}

/** Linhas do mês com valor. A lista muda sozinha quando a nuvem traz outro aparelho. */
export function monthMovements(casa: CasaState, month: number): Move[] {
  const out: Move[] = [];
  for (const line of INCOME_LINES) {
    pushLine(out, `in-${line.key}`, lineLabel(line.key, line.label), casa.lines.income[line.key][month] || 0, "in");
  }
  for (const line of FIXED_LINES) {
    pushLine(out, `fx-${line.key}`, lineLabel(line.key, line.label), casa.lines.fixed[line.key][month] || 0, "out");
  }
  for (const line of VARIABLE_LINES) {
    pushLine(out, `vr-${line.key}`, lineLabel(line.key, line.label), casa.lines.variable[line.key][month] || 0, "out");
  }
  for (const line of DEBT_PAY_LINES) {
    pushLine(out, `db-${line.key}`, lineLabel(line.key, line.label), casa.lines.debtPay[line.key][month] || 0, "out");
  }
  pushLine(out, "card", lineLabel("cardSpend", "Compras no crédito"), casa.cardSpend[month] || 0, "card");
  return out;
}
