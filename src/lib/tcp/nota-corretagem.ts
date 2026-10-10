/**
 * PROTÓTIPO — leitor de nota de corretagem padrão SINACOR (Bovespa/mercado à vista).
 *
 * Entrada: o TEXTO da nota (extraído do PDF no navegador com pdfjs-dist,
 * page.getTextContent(), juntando itens por linha). Este módulo não lê PDF
 * diretamente, para ser testável sem binários.
 *
 * Limites conhecidos (honestos):
 * - Só a nota Bovespa (ações/FII/ETF/BDR/opções à vista). Nota BM&F (WIN/WDO)
 *   tem outro layout e ainda não é lida.
 * - Day trade: ajuste = vendas − compras do mesmo ativo na nota (obs. "D").
 * - Swing: a nota não traz preço médio. Devolvemos as operações; o ganho só
 *   sai com o controle de custódia/preço médio (próxima etapa).
 * - Custos (liquidação, emolumentos, corretagem, ISS…) são rateados pelo
 *   volume de cada ativo. IRRF da nota vai para o day trade se houver
 *   (1% DT) — senão para o swing (0,005% "dedo-duro").
 * - Notas escaneadas (imagem) precisam de OCR; layouts de corretoras fora do
 *   padrão SINACOR exigem ajustes. Testado só com fixture sintética.
 */
import type { Trade } from "./types";
import { fromCents, toCents } from "../money.ts";
import { guessAssetClass } from "./assets.ts";

export interface OperacaoNota {
  cv: "C" | "V";
  mercado: string; // VISTA, FRACIONARIO, OPCAO DE COMPRA...
  titulo: string; // especificação do título como impresso
  ticker: string | null; // quando a nota traz o código
  dayTrade: boolean;
  quantidade: number;
  precoCents: number;
  valorCents: number;
}

export interface NotaCorretagem {
  numero: string | null;
  dataPregao: string | null; // ISO yyyy-mm-dd
  operacoes: OperacaoNota[];
  custosCents: number;
  irrfCents: number;
  irrfDayTradeCents: number;
  liquidoCents: number | null;
  avisos: string[];
}

const NUM = String.raw`(-?\d{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+(?:,\d+)?)`;

function brNum(s: string): number {
  return Number(s.replace(/\./g, "").replace(",", "."));
}

function isoDate(d: string): string {
  const [dd, mm, yyyy] = d.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

const CUSTOS = [
  /Taxa de liquida[cç][aã]o/i,
  /Taxa de Registro/i,
  /Taxa de termo\/op[cç][oõ]es/i,
  /Taxa A\.N\.A\./i,
  /Emolumentos/i,
  /Taxa Operacional/i,
  /Corretagem/i,
  /Execu[cç][aã]o/i,
  /Cust[oó]dia/i,
  /Impostos/i,
  /^\s*ISS/i,
  /Outros/i,
];

/** Ex.: "1-BOVESPA C VISTA PETR4 PETROBRAS PN N2 D 100 32,50 3.250,00 D" */
const LINHA_OP = new RegExp(
  String.raw`^\s*\d-BOVESPA\s+([CV])\s+(VISTA|FRACIONARIO|OPCAO DE COMPRA|OPCAO DE VENDA|EXERC OPC VENDA|EXERC OPC COMPRA|TERMO)\s+(.+?)\s+` +
    NUM + String.raw`\s+` + NUM + String.raw`\s+` + NUM + String.raw`\s+([CD])\s*$`,
  "i",
);

export function parseNotaSinacor(texto: string): NotaCorretagem {
  const linhas = texto.split(/\r?\n/);
  const avisos: string[] = [];
  const operacoes: OperacaoNota[] = [];
  let numero: string | null = null;
  let dataPregao: string | null = null;
  let custosCents = 0;
  let irrfCents = 0;
  let irrfDayTradeCents = 0;
  let liquidoCents: number | null = null;

  for (const l of linhas) {
    const mNum = l.match(/Nr\.?\s*nota\s*:?\s*(\d+)/i);
    if (mNum && !numero) numero = mNum[1];
    const mData = l.match(/Data preg[aã]o\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (mData && !dataPregao) dataPregao = isoDate(mData[1]);

    const op = l.match(LINHA_OP);
    if (op) {
      let resto = op[3].trim();
      // obs. (D = day trade, # = negócio direto, etc.) costuma vir no fim da especificação
      let dayTrade = false;
      const obs = resto.match(/\s+([D#F2BAHXPYLTIC]{1,3})$/);
      if (obs) {
        dayTrade = obs[1].includes("D");
        resto = resto.slice(0, obs.index).trim();
      }
      const tk = resto.match(/\b([A-Z]{4}\d{1,2}F?|[A-Z]{4}[A-X]\d{1,3})\b/);
      operacoes.push({
        cv: op[1].toUpperCase() as "C" | "V",
        mercado: op[2].toUpperCase(),
        titulo: resto,
        ticker: tk ? tk[1] : null,
        dayTrade,
        quantidade: brNum(op[4]),
        precoCents: toCents(brNum(op[5])),
        valorCents: toCents(brNum(op[6])),
      });
      continue;
    }

    const irrf = l.match(new RegExp(String.raw`I\.?R\.?R\.?F\.?.*?` + NUM + String.raw`\s*$`, "i"));
    if (irrf) {
      const v = toCents(brNum(irrf[1]));
      if (/day\s*trade/i.test(l)) irrfDayTradeCents += v;
      else irrfCents += v;
      continue;
    }
    const liq = l.match(new RegExp(String.raw`L[ií]quido para\s+\d{2}\/\d{2}\/\d{4}\s+` + NUM + String.raw`\s*([CD])?`, "i"));
    if (liq) {
      liquidoCents = toCents(brNum(liq[1])) * (liq[2]?.toUpperCase() === "D" ? -1 : 1);
      continue;
    }
    if (CUSTOS.some((r) => r.test(l))) {
      const v = l.match(new RegExp(NUM + String.raw`\s*([CD])?\s*$`));
      if (v) custosCents += Math.abs(toCents(brNum(v[1])));
    }
  }

  if (!operacoes.length) avisos.push("Nenhum negócio encontrado: layout fora do padrão SINACOR Bovespa, nota BM&F ou PDF escaneado.");
  if (!dataPregao) avisos.push("Data do pregão não encontrada.");
  for (const o of operacoes) if (!o.ticker) avisos.push(`Sem código de negociação para "${o.titulo}": precisa de mapa nome→ticker.`);

  // Conferência: soma de vendas − compras − custos − IRRF deve bater com o líquido
  if (liquidoCents != null && operacoes.length) {
    const bruto = operacoes.reduce((s, o) => s + (o.cv === "V" ? o.valorCents : -o.valorCents), 0);
    const calc = bruto - custosCents - irrfCents - irrfDayTradeCents;
    if (Math.abs(calc - liquidoCents) > 1) {
      avisos.push(`Líquido não confere (calculado ${fromCents(calc)}, nota ${fromCents(liquidoCents)}): revisar custos.`);
    }
  }

  return { numero, dataPregao, operacoes, custosCents, irrfCents, irrfDayTradeCents, liquidoCents, avisos };
}

/** Converte as operações day trade da nota em Trades (um por ativo). */
export function notaToTrades(nota: NotaCorretagem): Trade[] {
  const date = nota.dataPregao ?? "";
  const volumeTotal = nota.operacoes.reduce((s, o) => s + o.valorCents, 0) || 1;
  const porAtivo = new Map<string, OperacaoNota[]>();
  for (const o of nota.operacoes.filter((x) => x.dayTrade)) {
    const k = o.ticker ?? o.titulo;
    porAtivo.set(k, [...(porAtivo.get(k) ?? []), o]);
  }
  const volumeDT = [...porAtivo.values()].flat().reduce((s, o) => s + o.valorCents, 0) || 1;
  const trades: Trade[] = [];
  for (const [ativo, ops] of porAtivo) {
    const vendas = ops.filter((o) => o.cv === "V").reduce((s, o) => s + o.valorCents, 0);
    const compras = ops.filter((o) => o.cv === "C").reduce((s, o) => s + o.valorCents, 0);
    const vol = vendas + compras;
    const taxas = Math.round((nota.custosCents * vol) / volumeTotal);
    const irrf = Math.round((nota.irrfDayTradeCents * vol) / volumeDT);
    trades.push({
      id: `nota-${nota.numero ?? "x"}-${ativo}`,
      date,
      asset: ativo,
      classe: guessAssetClass(ativo),
      tipo: "daytrade",
      ajuste: fromCents(vendas - compras),
      taxas: fromCents(taxas),
      irrf: fromCents(irrf),
      totalVendas: fromCents(vendas),
      nota: nota.numero ?? undefined,
    });
  }
  return trades;
}
