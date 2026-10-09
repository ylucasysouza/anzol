import { emptyCasa, patchMonth } from "./engine.ts";
import type { CasaState } from "./types.ts";

export { emptyCasa };

/** Seeded from Gestão financeira Casa.xlsx (Família, 2026). */
export function buildCasaSample(): CasaState {
  const casa = emptyCasa({
    familyName: "Família",
    year: 2026,
    initialCard: 3774,
    initialLoans: 19039,
    payOpeningCard: false,
  });
  const set = (group: "income" | "fixed" | "variable" | "debtPay", key: string, month: number, value: number) => {
    const g = casa.lines[group] as Record<string, number[]>;
    g[key] = patchMonth(g[key], month, value);
  };

  // Setembro
  set("income", "salary", 8, 1307.19);
  set("income", "extra", 8, 1963);
  set("fixed", "energy", 8, 251.05);
  set("fixed", "water", 8, 99.22);
  set("fixed", "internet", 8, 119.9);
  set("fixed", "insurance", 8, 170.18);
  set("fixed", "subscriptions", 8, 327);
  set("variable", "food", 8, 1541.07);
  set("variable", "transport", 8, 17.6);
  set("variable", "leisure", 8, 45.75);
  set("variable", "personal", 8, 475);
  set("variable", "otherVar", 8, 179.6);

  // Outubro
  set("income", "extra", 9, 500);
  set("variable", "food", 9, 168.31);
  set("variable", "transport", 9, 66);
  set("variable", "otherVar", 9, 45.8);
  casa.investOverride = patchMonth(casa.investOverride, 9, 57.19);
  casa.cardSpend = patchMonth(casa.cardSpend, 9, 84.25);

  return casa;
}
