import assert from "node:assert/strict";
import { it } from "node:test";
import { applyRate, formatBRL, fromCents, sumCents, toCents } from "./money.ts";

it("0,1 + 0,2 é exatamente 0,30", () => {
  assert.equal(sumCents([0.1, 0.2]), 30);
});
it("aceita string pt-BR", () => {
  assert.equal(toCents("1.234,56"), 123456);
  assert.equal(toCents("R$ 10,05"), 1005);
  assert.equal(toCents("-3,5"), -350);
});
it("1.005 vira 101 centavos (sem erro binário)", () => {
  assert.equal(toCents(1.005), 101);
});
it("alíquota arredonda uma vez", () => {
  assert.equal(applyRate(333, 0.15), 50); // 49,95 -> 50
  assert.equal(applyRate(100003, 0.2), 20001); // 20000,6 -> 20001
});
it("soma de mil lançamentos de 0,01 dá 10,00", () => {
  assert.equal(fromCents(sumCents(Array(1000).fill(0.01))), 10);
});
it("formata BRL", () => {
  assert.equal(formatBRL(123456789), "R$ 1.234.567,89");
  assert.equal(formatBRL(-5), "-R$ 0,05");
});
