import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { J } from "./jurisdictions.ts";
import { parseCSV, parseNumberCell, tradesToCSV } from "./csv.ts";

describe("CSV BR", () => {
  it("parses daytrade and swing rows", () => {
    const txt =
      "Date,Asset,Tipo,Ajuste,Taxas,IRRF,TotalVendas\n2026-01-05,WINFUT,daytrade,47.00,5.68,1.98,0\n2026-01-10,PETR4,swing,-800.00,12.00,0,15000.00";
    const trades = parseCSV(txt, J.BR);
    assert.equal(trades.length, 2);
    assert.equal(trades[0].asset, "WINFUT");
    assert.equal(trades[0].tipo, "daytrade");
    assert.equal(trades[1].tipo, "swing");
    assert.equal(trades[1].totalVendas, "15000.00");
  });

  it("round-trips export → parse", () => {
    const src = parseCSV(
      "Date,Asset,Tipo,Ajuste,Taxas,IRRF,TotalVendas\n2026-03-12,VALE3,swing,1250,18.5,12.5,28400",
      J.BR,
    );
    const back = parseCSV(tradesToCSV(src, J.BR), J.BR);
    assert.equal(back.length, 1);
    assert.equal(back[0].asset, "VALE3");
    assert.equal(back[0].ajuste, "1250");
  });

  it("parses semicolon + Brazilian decimals", () => {
    const txt =
      "Data;Ativo;Tipo;Ajuste;Taxas;IRRF;TotalVendas\n2026-01-05;WINFUT;daytrade;1.250,50;12,30;12,50;0";
    const trades = parseCSV(txt, J.BR);
    assert.equal(trades.length, 1);
    assert.equal(trades[0].ajuste, "1250.50");
    assert.equal(trades[0].taxas, "12.30");
  });
});

describe("parseNumberCell", () => {
  it("handles 1.234,56 and 1234.56", () => {
    assert.equal(parseNumberCell("1.234,56"), "1234.56");
    assert.equal(parseNumberCell("1234.56"), "1234.56");
    assert.equal(parseNumberCell("12,30"), "12.30");
  });
});
