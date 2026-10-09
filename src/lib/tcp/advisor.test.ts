import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerLocally, type AdvisorFacts } from "./advisor.ts";

const facts: AdvisorFacts = {
  month: "Janeiro",
  year: 2026,
  account: "BTG Day Trade 2026",
  broker: "BTG Pactual",
  trades: 4,
  net: 1207.5,
  darfDT: 225.75,
  darfSW: 0,
  darfTotal: 225.75,
  irrf: 15.75,
  swingExempt: true,
  swingSales: 15000,
  swingCount: 1,
  consol: 266.55,
  consolAccounts: ["BTG Day Trade 2026", "XP Posição 2026"],
  due: "27 de fev. de 2026",
  carryDT: 0,
  carrySW: 812,
  winRate: 0.75,
  pf: 2.4,
  note: "Day Trade: 20% IR mensal (DARF 6015).",
};

describe("answerLocally", () => {
  it("answers DARF amount", () => {
    const a = answerLocally("Quanto de DARF eu pago em janeiro?", facts);
    assert.match(a, /225,75/);
    assert.match(a, /27 de fev/);
  });

  it("refuses mixing swing and DT losses", () => {
    const a = answerLocally("Posso compensar prejuízo de swing no day trade?", facts);
    assert.match(a, /separados/i);
    assert.match(a, /812/);
  });

  it("explains consolidated DARF", () => {
    const a = answerLocally("Como fica o consolidado BTG + XP?", facts);
    assert.match(a, /266,55/);
    assert.match(a, /CPF/i);
  });

  it("flags swing exemption", () => {
    const a = answerLocally("Tenho isenção de swing?", facts);
    assert.match(a, /Isento/i);
    assert.match(a, /15.000/);
  });
});
