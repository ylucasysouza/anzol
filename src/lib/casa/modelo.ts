import { emptyCasa } from "./engine.ts";
import type { CasaState, Month12 } from "./types.ts";

function fill(values: number[]): Month12 {
  const row = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  values.forEach((v, i) => {
    row[i] = v;
  });
  return row;
}

/** Família Exemplo 2026 — Planilha_Orcamento_Domestico_Patrimonio. */
export function buildCasaModelo(): CasaState {
  const casa = emptyCasa({
    familyName: "Família Exemplo",
    year: 2026,
    initialCash: 12000,
    initialInvest: 35000,
    initialGoods: 90000,
    initialCard: 3000,
    initialLoans: 12000,
    floatYield: 0.009,
    investPct: 0.1,
    payOpeningCard: true,
  });
  casa.lines.income.salary = fill(Array(12).fill(8000));
  casa.lines.income.extra = fill([500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600]);
  casa.lines.income.investIncome = fill([80, 90, 100, 110, 130, 140, 150, 160, 180, 190, 200, 220]);
  casa.lines.income.otherIncome = fill([0, 0, 0, 0, 0, 300, 0, 0, 0, 0, 0, 150]);
  casa.lines.fixed.housing = fill([1800, 1800, 1800, 1800, 1800, 1800, 1850, 1850, 1850, 1850, 1850, 1850]);
  casa.lines.fixed.condo = fill(Array(12).fill(350));
  casa.lines.fixed.energy = fill([180, 180, 190, 200, 220, 230, 230, 220, 210, 190, 180, 190]);
  casa.lines.fixed.water = fill([90, 90, 95, 95, 100, 105, 105, 100, 95, 95, 90, 95]);
  casa.lines.fixed.internet = fill(Array(12).fill(150));
  casa.lines.fixed.insurance = fill(Array(12).fill(120));
  casa.lines.fixed.education = fill(Array(12).fill(250));
  casa.lines.fixed.subscriptions = fill([90, 90, 90, 90, 90, 90, 60, 60, 60, 60, 60, 60]);
  casa.lines.variable.food = fill([1000, 990, 980, 970, 960, 950, 940, 930, 920, 910, 905, 900]);
  casa.lines.variable.transport = fill([450, 450, 440, 430, 430, 420, 410, 410, 400, 400, 400, 400]);
  casa.lines.variable.leisure = fill([600, 550, 520, 480, 450, 420, 400, 380, 360, 350, 380, 500]);
  casa.lines.variable.personal = fill(Array(12).fill(150));
  casa.lines.variable.clothing = fill([200, 150, 120, 100, 100, 120, 100, 100, 100, 150, 250, 180]);
  casa.lines.variable.otherVar = fill(Array(12).fill(100));
  casa.lines.debtPay.loanPay = fill(Array(12).fill(250));
  casa.cardSpend = fill([2200, 2350, 2500, 2300, 2600, 2750, 2900, 2650, 2800, 3100, 3400, 4200]);
  return casa;
}