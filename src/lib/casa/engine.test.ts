import assert from "node:assert/strict";
import { test } from "node:test";
import { computeCasa, computeGoals, money } from "./engine.ts";
import { buildCasaModelo } from "./modelo.ts";
import { buildCasaSample } from "./sample.ts";

test("planilha Família 2026: setembro e outubro batem com o Excel", () => {
  const year = computeCasa(buildCasaSample());
  const set = year.months[8];
  const out = year.months[9];

  assert.equal(set.income, 3270.19);
  assert.equal(set.fixed, 967.35);
  assert.equal(set.variable, 2259.02);
  assert.equal(set.expenses, 3226.37);
  assert.equal(set.surplus, 43.82);
  assert.equal(set.invested, 0);
  assert.equal(set.cashEnd, 43.82);

  assert.equal(out.income, 500);
  assert.equal(out.expenses, 280.11);
  assert.equal(out.surplus, 219.89);
  assert.equal(out.invested, 57.19);
  assert.equal(out.cashFlow, 246.95);
  assert.equal(out.cashEnd, 290.77);
  assert.equal(out.freeCash, 206.52);
  assert.equal(out.investEnd, 57.19);

  assert.equal(year.income, 3770.19);
  assert.equal(year.expenses, 3506.48);
  assert.equal(year.surplus, 263.71);
  assert.equal(year.invested, 57.19);
  assert.equal(year.cashEnd, 206.52);
  assert.equal(money(year.cashEnd + year.investEnd), 263.71);
});

test("dívidas iniciais não zeram no mês seguinte (correção do Excel)", () => {
  const year = computeCasa(buildCasaSample());
  assert.equal(year.netWorthStart, -22813);
  assert.equal(year.months[8].cardDebt, 3774);
  assert.equal(year.months[8].charged, 0);
  assert.equal(year.months[9].cardDebt, money(3774 + 84.25));
  assert.equal(year.months[9].charged, 84.25);
  assert.equal(year.months[9].liabilities, money(3774 + 84.25 + 19039));
  assert.equal(year.months[9].assets, 347.96);
  assert.equal(year.months[9].netWorth, money(347.96 - (3774 + 84.25 + 19039)));
});

test("metas ignoram categorias sem histórico (sem #DIV/0)", () => {
  const { rows, impact } = computeGoals(buildCasaSample());
  const clothing = rows.find((r) => r.key === "clothing");
  const leisure = rows.find((r) => r.key === "leisure");
  const food = rows.find((r) => r.key === "food");
  assert.equal(clothing?.avg, null);
  assert.equal(clothing?.yearImpact, null);
  assert.equal(leisure?.avg, 45.75);
  assert.equal(leisure?.target, 36.6);
  assert.equal(leisure?.yearImpact, 109.8);
  assert.equal(food?.avg, 854.69);
  assert.ok(impact != null && impact > 0);
});

test("carteira TradingPro entra como ativo extra", () => {
  const year = computeCasa(buildCasaSample(), 1000);
  assert.equal(year.months[9].assets, money(347.96 + 1000));
});

test("modelo Família Exemplo 2026 bate com a planilha", () => {
  const year = computeCasa(buildCasaModelo());
  const jan = year.months[0];
  const dec = year.months[11];

  assert.equal(jan.income, 8580);
  assert.equal(jan.expenses, 5780);
  assert.equal(jan.surplus, 2800);
  assert.equal(jan.invested, 858);
  assert.equal(jan.invoicePaid, 3000);
  assert.equal(jan.charged, 2200);
  assert.equal(jan.cashFlow, 1142);
  assert.equal(jan.cashEnd, 13142);
  assert.equal(jan.freeCash, 10942);
  assert.equal(jan.investEnd, 35858);
  assert.equal(jan.cardDebt, 2200);
  assert.equal(jan.loanDebt, 11750);
  assert.equal(jan.netWorth, 125050);
  assert.equal(jan.cardFloat, 19.8);

  assert.equal(year.months[1].cashEnd, 15443);
  assert.equal(year.income, 110800);
  assert.equal(year.expenses, 66270);
  assert.equal(year.surplus, 44530);
  assert.equal(year.invested, 11080);
  assert.equal(year.cashEnd, 46650);
  assert.equal(year.investEnd, 46080);
  assert.equal(dec.openInvoice, 4200);
  assert.equal(dec.freeCash, 42450);
  assert.equal(dec.loanDebt, 9000);
  assert.equal(dec.netWorth, 169530);
  assert.equal(year.netWorthStart, 122000);
  assert.equal(money(dec.netWorth - year.netWorthStart), 47530);
  assert.equal(year.cardSpend, 33750);
  assert.equal(year.cardFloat, 303.75);
  assert.equal(dec.floatAccum, 303.75);
  assert.ok(year.avgSavingsRate != null && Math.abs(year.avgSavingsRate - 0.400279901564808) < 1e-12);

  const goals = computeGoals(buildCasaModelo());
  assert.equal(goals.impact, 11002.75);
});
