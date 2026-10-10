import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { J } from "./jurisdictions.ts";
import { guessAssetClass } from "./assets.ts";
import {
  calcBRIntlAnnual,
  calcConsol,
  calcDT,
  calcSwing,
  calcUSQuarterly,
  carry,
  darfSchedule,
  monthTax,
  darfDueDate,
  equityCurve,
  lastBusinessDay,
  maxDrawdown,
  suggestIrrf,
} from "./tax.ts";
import type { Account, Trade } from "./types.ts";

const br = J.BR;
const acct = (over: Partial<Account> = {}): Account => ({
  id: "a1",
  taxpayerId: "tp",
  name: "BTG",
  trader: "Lucas",
  country: "BR",
  broker: "BTG Pactual",
  year: 2026,
  taxRate: 0.2,
  initialLoss: 0,
  swingInitialLoss: 0,
  ...over,
});

function dt(over: Partial<Trade>): Trade {
  return { id: "x", date: "2026-01-05", asset: "WINFUT", tipo: "daytrade", ajuste: 0, taxas: 0, irrf: 0, ...over };
}

describe("calcDT Brazil", () => {
  it("computes DARF 6015 after IRRF", () => {
    const trades = [dt({ ajuste: 1000, taxas: 50, irrf: 10 })];
    const r = calcDT(trades, 0, acct(), br);
    assert.equal(r.gross, 1000);
    assert.equal(r.fees, 50);
    assert.equal(r.net, 950);
    assert.equal(r.base, 950);
    assert.equal(r.td, 190);
    assert.equal(r.darf, 180);
    assert.equal(r.nc, 0);
  });

  it("ignores swing trades in DT bucket", () => {
    const trades = [
      dt({ ajuste: 500, taxas: 10, irrf: 5 }),
      dt({ tipo: "swing", ajuste: 900, taxas: 20, irrf: 0, totalVendas: 25000 }),
    ];
    const r = calcDT(trades, 0, acct(), br);
    assert.equal(r.count, 1);
    assert.equal(r.net, 490);
  });

  it("carries loss into next month", () => {
    const jan = [dt({ date: "2026-01-10", ajuste: -200, taxas: 0 })];
    const feb = [dt({ date: "2026-02-10", ajuste: 500, taxas: 0, irrf: 0 })];
    const all = [...jan, ...feb];
    const c = carry(all, 1, "dt", acct(), br);
    assert.equal(c, 200);
    const r = calcDT(feb, c, acct(), br);
    assert.equal(r.base, 300);
    assert.equal(r.td, 60);
    assert.equal(r.nc, 0);
  });
});

describe("calcSwing Brazil", () => {
  it("exempts when monthly sales ≤ R$20.000", () => {
    const trades = [dt({ tipo: "swing", asset: "PETR4", ajuste: 1000, taxas: 20, totalVendas: 15000, irrf: 0 })];
    const r = calcSwing(trades, 0, br);
    assert.equal(r.exempt, true);
    assert.equal(r.base, 0);
    assert.equal(r.darf, 0);
  });

  it("taxes 15% when sales exceed exemption", () => {
    const trades = [dt({ tipo: "swing", ajuste: 1000, taxas: 0, irrf: 10, totalVendas: 25000 })];
    const r = calcSwing(trades, 0, br);
    assert.equal(r.exempt, false);
    assert.equal(r.td, 150);
    assert.equal(r.darf, 140);
  });
});

describe("calcConsol", () => {
  it("sums two brokers for the same taxpayer", () => {
    const a = acct({ id: "btg" });
    const b = acct({ id: "xp", name: "XP" });
    const trades = {
      btg: [dt({ ajuste: 1000, taxas: 0, irrf: 20 })],
      xp: [dt({ ajuste: 500, taxas: 0, irrf: 10 })],
    };
    const c = calcConsol(0, a, [a, b], trades);
    assert.ok(c);
    assert.equal(c.totNet, 1500);
    assert.equal(c.totIRRF, 30);
    assert.equal(c.darfDT, 270);
  });
});

describe("US quarterly", () => {
  it("estimates Q1 at the account bracket", () => {
    const a = acct({ country: "US", usBracket: 0.22 });
    const trades = [
      { id: "1", date: "2026-01-04", asset: "ES", gross: 1000, comm: 0 },
      { id: "2", date: "2026-02-04", asset: "ES", gross: 500, comm: 50 },
    ];
    const qs = calcUSQuarterly(trades, a);
    assert.equal(qs[0].net, 1450);
    assert.equal(qs[0].est, 319);
    assert.equal(qs[0].due, "Apr 15");
  });
});

describe("BR_INTL annual", () => {
  it("converts by PTAX and applies 15%", () => {
    const a = acct({ country: "BR_INTL", avgPTAX: 5 });
    const trades = [{ id: "1", date: "2026-01-04", asset: "XAUUSD", gross: 200, comm: 20 }];
    const r = calcBRIntlAnnual(trades, a);
    assert.equal(r.net, 180);
    assert.equal(r.netBRL, 900);
    assert.equal(r.tax, 135);
  });
});

describe("DARF due date", () => {
  it("is last weekday of the following month", () => {
    const d = darfDueDate(2026, 0);
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 1);
    assert.equal(d.getDate(), 27);
    assert.equal(lastBusinessDay(2026, 1).getDate(), 27);
  });
});

describe("suggestIrrf", () => {
  it("is 1% of positive DT result", () => {
    assert.equal(suggestIrrf(470), 4.7);
    assert.equal(suggestIrrf(-320), 0);
  });
});

describe("equity + drawdown", () => {
  it("tracks running P&L and peak-to-trough", () => {
    const trades = [
      dt({ id: "a", date: "2026-01-05", ajuste: 100, taxas: 0 }),
      dt({ id: "b", date: "2026-01-06", ajuste: -40, taxas: 0 }),
      dt({ id: "c", date: "2026-01-07", ajuste: -10, taxas: 0 }),
    ];
    const curve = equityCurve(trades, "BR");
    assert.equal(curve[2].eq, 50);
    const dd = maxDrawdown(curve);
    assert.equal(dd.amount, 50);
  });
});

describe("isenção de R$ 20 mil só para ações à vista", () => {
  const sw = (asset: string, ajuste: number, totalVendas: number, extra: Partial<Trade> = {}) =>
    dt({ tipo: "swing", asset, ajuste, totalVendas, ...extra });

  it("classifica tickers", () => {
    assert.equal(guessAssetClass("PETR4"), "acao");
    assert.equal(guessAssetClass("VALE3"), "acao");
    assert.equal(guessAssetClass("HGLG11"), "fii");
    assert.equal(guessAssetClass("AAPL34"), "bdr");
    assert.equal(guessAssetClass("WINFUT"), "futuro");
    assert.equal(guessAssetClass("WDOZ26"), "futuro");
    assert.equal(guessAssetClass("PETRK300"), "opcao");
  });

  it("FII com vendas < 20 mil NÃO é isento", () => {
    const r = calcSwing([sw("HGLG11", 1000, 10000)], 0, br);
    assert.equal(r.exempt, false);
    assert.equal(r.td, 150);
  });

  it("ETF (classe explícita) e BDR não são isentos", () => {
    const r = calcSwing([sw("BOVA11", 500, 5000, { classe: "etf" }), sw("AAPL34", 500, 5000)], 0, br);
    assert.equal(r.base, 1000);
  });

  it("ação isenta + BDR tributado no mesmo mês: só o BDR paga", () => {
    const r = calcSwing([sw("PETR4", 2000, 15000), sw("AAPL34", 1000, 8000)], 0, br);
    assert.equal(r.exempt, true);
    assert.equal(r.vendasAcoes, 15000);
    assert.equal(r.base, 1000);
    assert.equal(r.td, 150);
  });

  it("unit (TAEE11) com classe explícita 'acao' entra na isenção", () => {
    const r = calcSwing([sw("TAEE11", 1000, 9000, { classe: "acao" })], 0, br);
    assert.equal(r.exempt, true);
    assert.equal(r.darf, 0);
  });

  it("mês isento não consome prejuízo acumulado", () => {
    const r = calcSwing([sw("PETR4", 3000, 15000)], 500, br);
    assert.equal(r.nc, 500);
  });

  it("perda em ações num mês isento continua acumulando", () => {
    const r = calcSwing([sw("PETR4", -400, 15000)], 100, br);
    assert.equal(r.nc, 500);
  });
});

describe("DARF abaixo de R$ 10 passa para o mês seguinte", () => {
  const a = acct();
  it("acumula até atingir R$ 10", () => {
    const trades = [
      dt({ id: "1", date: "2026-01-10", ajuste: 30 }), // 20% = 6,00
      dt({ id: "2", date: "2026-02-10", ajuste: 15 }), // 3,00 -> total 9,00
      dt({ id: "3", date: "2026-03-10", ajuste: 10 }), // 2,00 -> total 11,00
    ];
    const s = darfSchedule(trades, a, br);
    assert.deepEqual(s.slice(0, 4).map((x) => [x.devido, x.pagar, x.diferido]), [
      [6, 0, 6],
      [3, 0, 9],
      [2, 11, 0],
      [0, 0, 0],
    ]);
  });
  it("valor >= R$ 10 paga no próprio mês", () => {
    const s = darfSchedule([dt({ date: "2026-05-02", ajuste: 50 })], a, br);
    assert.equal(s[4].pagar, 10);
  });
  it("soma DT e swing (mesmo código 6015) para o mínimo", () => {
    const s = darfSchedule(
      [dt({ id: "1", date: "2026-06-03", ajuste: 30 }), dt({ id: "2", date: "2026-06-04", tipo: "swing", asset: "AAPL34", ajuste: 40, totalVendas: 1000 })],
      a,
      br,
    );
    assert.equal(s[5].pagar, 12); // 6 + 6
  });
});

describe("centavos no motor", () => {
  it("0,1 + 0,2 de ajuste não gera resíduo", () => {
    const r = calcDT([dt({ ajuste: 0.1 }), dt({ ajuste: 0.2 })], 0, acct(), br);
    assert.equal(r.net, 0.3);
    assert.equal(r.td, 0.06);
  });
});

describe("monthTax (tela do mês)", () => {
  const a = acct();
  const trades = [
    dt({ id: "1", date: "2026-01-10", ajuste: -1000 }),
    dt({ id: "2", date: "2026-02-10", ajuste: 600 }),
  ];
  it("Pro compensa o prejuízo de janeiro", () => {
    const m = monthTax(trades, 1, a, br, true);
    assert.equal(m.dt.prevC, 1000);
    assert.equal(m.devido, 0);
    assert.equal(m.prejuizoNaoCompensado, 0);
  });
  it("Grátis não compensa e mostra quanto ficou de fora", () => {
    const m = monthTax(trades, 1, a, br, false);
    assert.equal(m.dt.prevC, 0);
    assert.equal(m.devido, 120);
    assert.equal(m.pagar, 120);
    assert.equal(m.prejuizoNaoCompensado, 1000);
  });
  it("mostra o saldo < R$ 10 que vem do mês anterior", () => {
    const t2 = [dt({ id: "1", date: "2026-01-10", ajuste: 30 }), dt({ id: "2", date: "2026-02-10", ajuste: 40 })];
    const m = monthTax(t2, 1, a, br);
    assert.equal(m.diferidoAnterior, 6);
    assert.equal(m.pagar, 14);
  });
});
