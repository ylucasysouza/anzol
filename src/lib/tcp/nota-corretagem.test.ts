import assert from "node:assert/strict";
import { it } from "node:test";
import { notaToTrades, parseNotaSinacor } from "./nota-corretagem.ts";

// Fixture SINTÉTICA no formato SINACOR (valores inventados, não é nota real).
const NOTA = `
NOTA DE NEGOCIAÇÃO
Nr. nota  Folha  Data pregão
Nr. nota: 123456   1   Data pregão: 15/09/2026
Negócios realizados
Q Negociação C/V Tipo mercado Prazo Especificação do título Obs. (*) Quantidade Preço / Ajuste Valor Operação / Ajuste D/C
1-BOVESPA C VISTA PETR4 PETROBRAS PN N2 D 100 32,50 3.250,00 D
1-BOVESPA V VISTA PETR4 PETROBRAS PN N2 D 100 33,10 3.310,00 C
1-BOVESPA C VISTA HGLG11 CSHG LOG FII CI 10 160,00 1.600,00 D
Resumo Financeiro
Taxa de liquidação 2,04 D
Emolumentos 0,41 D
Taxa Operacional 0,00
I.R.R.F. s/ operações, base R$ 0,00 0,00
IRRF Day Trade: base R$ 60,00 0,60
Líquido para 17/09/2026 1.543,05 D
`;

it("lê cabeçalho, negócios e custos", () => {
  const n = parseNotaSinacor(NOTA);
  assert.equal(n.numero, "123456");
  assert.equal(n.dataPregao, "2026-09-15");
  assert.equal(n.operacoes.length, 3);
  assert.deepEqual(n.operacoes.map((o) => [o.cv, o.ticker, o.dayTrade, o.valorCents]), [
    ["C", "PETR4", true, 325000],
    ["V", "PETR4", true, 331000],
    ["C", "HGLG11", false, 160000],
  ]);
  assert.equal(n.custosCents, 245);
  assert.equal(n.irrfDayTradeCents, 60);
  assert.equal(n.liquidoCents, -154305);
  assert.deepEqual(n.avisos, []);
});

it("gera trade de day trade com custos rateados", () => {
  const [t, ...rest] = notaToTrades(parseNotaSinacor(NOTA));
  assert.equal(rest.length, 0);
  assert.equal(t.asset, "PETR4");
  assert.equal(t.ajuste, 60);
  assert.equal(t.irrf, 0.6);
  assert.equal(t.totalVendas, 3310);
  // 2,45 * 6560/8160 = 1,97
  assert.equal(t.taxas, 1.97);
});

it("avisa quando o layout não é reconhecido", () => {
  const n = parseNotaSinacor("C WIN V26 15/10/2026 2 125.000 DAY TRADE");
  assert.equal(n.operacoes.length, 0);
  assert.ok(n.avisos.length >= 1);
});
