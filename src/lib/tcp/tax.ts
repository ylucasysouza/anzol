import { MONTHS, MONTHS_SHORT, num, tradeValue } from "./format.ts";
import { jurisdiction } from "./jurisdictions.ts";
import { assetClassOf } from "./assets.ts";
import { applyRate, DARF_MINIMO, fromCents, toCents } from "../money.ts";
import type {
  Account,
  AdvStats,
  BrIntlAnnual,
  ConsolResult,
  Drawdown,
  DtResult,
  EquityPoint,
  Jurisdiction,
  QuarterEst,
  ScopeCode,
  SwingResult,
  Trade,
} from "./types";

export function tradesInMonth(trades: Trade[], month: number): Trade[] {
  return trades.filter((t) => {
    const d = new Date(t.date + "T00:00:00");
    return d.getMonth() === month;
  });
}

export function lastBusinessDay(year: number, monthIndex: number): Date {
  const d = new Date(year, monthIndex + 1, 0);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d;
}

/** DARF 6015: último dia útil do mês seguinte ao de apuração. */
export function darfDueDate(year: number, tradeMonthIndex: number): Date {
  const dueMonth = tradeMonthIndex + 1;
  const y = year + Math.floor(dueMonth / 12);
  const m = dueMonth % 12;
  return lastBusinessDay(y, m);
}

/** IRRF de day trade BR: 1% sobre o ganho positivo do dia. */
export function suggestIrrf(ajuste: number): number {
  return Math.max(0, ajuste) * 0.01;
}

export function calcDT(
  trades: Trade[],
  prevC: number,
  account: Account | null,
  jur: Jurisdiction,
): DtResult {
  const rate = account && account.taxRate != null ? account.taxRate : jur.rate;

  if (jur.sc === "BR") {
    // Motor em centavos inteiros; converte para reais só no retorno.
    const dtr = trades.filter((t) => t.tipo !== "swing" && t.tipo !== "position");
    const grossC = dtr.reduce((s, t) => s + toCents(t.ajuste), 0);
    const feesC = dtr.reduce((s, t) => s + toCents(t.taxas), 0);
    const irrfC = dtr.reduce((s, t) => s + toCents(t.irrf), 0);
    const prevCC = toCents(prevC);
    const netC = grossC - feesC;
    const baseC = Math.max(0, netC - prevCC);
    const tdC = applyRate(baseC, rate || 0.2);
    const darfC = Math.max(0, tdC - irrfC);
    return {
      gross: fromCents(grossC),
      fees: fromCents(feesC),
      irrf: fromCents(irrfC),
      comm: 0,
      net: fromCents(netC),
      prevC: fromCents(prevCC),
      base: fromCents(baseC),
      td: fromCents(tdC),
      darf: fromCents(darfC),
      nc: fromCents(Math.max(0, prevCC - netC)),
      count: dtr.length,
      sc: "BR",
    };
  }

  if (jur.sc === "BR_INTL") {
    const gross = trades.reduce((s, t) => s + num(t.gross), 0);
    const comm = trades.reduce((s, t) => s + num(t.comm), 0);
    const net = gross - comm;
    return {
      gross,
      fees: 0,
      irrf: 0,
      comm,
      net,
      prevC,
      base: 0,
      td: null,
      darf: null,
      nc: 0,
      count: trades.length,
      sc: "BR_INTL",
    };
  }

  const gross = trades.reduce((s, t) => s + num(t.gross), 0);
  const comm = trades.reduce((s, t) => s + num(t.comm), 0);
  const net = gross - comm;
  const base = Math.max(0, net - prevC);
  const rate2 = account?.usBracket ?? rate;
  const td = rate2 != null ? base * rate2 : null;
  return {
    gross,
    fees: 0,
    irrf: 0,
    comm,
    net,
    prevC,
    base,
    td,
    darf: null,
    nc: Math.max(0, prevC - net),
    count: trades.length,
    sc: "INTL",
  };
}

/**
 * Swing/posição BR (15%). A isenção de R$ 20 mil vale SÓ para vendas de ações
 * no mercado à vista: o limite é medido sobre as vendas de ações e isenta só o
 * ganho em ações. FII, ETF, BDR, futuros e opções seguem tributados.
 * Em mês isento, o ganho em ações não consome prejuízo acumulado, mas a
 * perda em ações continua compensável depois.
 */
export function calcSwing(trades: Trade[], prevC: number, jur: Jurisdiction): SwingResult {
  const sw = trades.filter((t) => t.tipo === "swing" || t.tipo === "position");
  let grossC = 0, feesC = 0, irrfC = 0, totalVendasC = 0;
  let netAcoesC = 0, netOutrosC = 0, vendasAcoesC = 0;
  for (const t of sw) {
    const g = toCents(t.ajuste);
    const f = toCents(t.taxas);
    const v = toCents(t.totalVendas);
    grossC += g;
    feesC += f;
    irrfC += toCents(t.irrf);
    totalVendasC += v;
    if (assetClassOf(t) === "acao") {
      netAcoesC += g - f;
      vendasAcoesC += v;
    } else {
      netOutrosC += g - f;
    }
  }
  const limiteC = toCents(jur.swingExemption || 20000);
  const exempt = vendasAcoesC > 0 && vendasAcoesC <= limiteC;
  const prevCC = toCents(prevC);
  const netC = grossC - feesC;
  const netTributavelC = netOutrosC + (exempt ? Math.min(0, netAcoesC) : netAcoesC);
  const baseC = Math.max(0, netTributavelC - prevCC);
  const tdC = applyRate(baseC, jur.swingRate || 0.15);
  const darfC = Math.max(0, tdC - irrfC);
  return {
    gross: fromCents(grossC),
    fees: fromCents(feesC),
    irrf: fromCents(irrfC),
    net: fromCents(netC),
    prevC: fromCents(prevCC),
    base: fromCents(baseC),
    td: fromCents(tdC),
    darf: fromCents(darfC),
    nc: fromCents(Math.max(0, prevCC - netTributavelC)),
    count: sw.length,
    totalVendas: fromCents(totalVendasC),
    vendasAcoes: fromCents(vendasAcoesC),
    exempt,
    sc: "SWING",
  };
}

export interface DarfMes {
  month: number;
  /** DARF 6015 apurado no mês (day trade + swing), em reais */
  devido: number;
  /** valor que entra na guia deste mês (inclui saldos < R$10 de meses anteriores) */
  pagar: number;
  /** saldo abaixo de R$ 10 que passa para o mês seguinte */
  diferido: number;
}

/**
 * Calendário de DARF 6015 do ano com a regra do valor mínimo: total abaixo
 * de R$ 10,00 não é pago no mês e soma ao(s) mês(es) seguinte(s)
 * (Lei 9.430/1996, art. 68; IN RFB 1.585/2015).
 */
export function darfSchedule(allTrades: Trade[], account: Account | null, jur: Jurisdiction): DarfMes[] {
  const out: DarfMes[] = [];
  let pendenteC = 0;
  for (let m = 0; m < 12; m++) {
    const tr = tradesInMonth(allTrades, m);
    const dt = calcDT(tr, carry(allTrades, m, "dt", account, jur), account, jur);
    const sw = calcSwing(tr, carry(allTrades, m, "sw", account, jur), jur);
    const devidoC = toCents(dt.darf ?? 0) + toCents(sw.darf);
    const totalC = pendenteC + devidoC;
    if (totalC >= DARF_MINIMO) {
      out.push({ month: m, devido: fromCents(devidoC), pagar: fromCents(totalC), diferido: 0 });
      pendenteC = 0;
    } else {
      out.push({ month: m, devido: fromCents(devidoC), pagar: 0, diferido: fromCents(totalC) });
      pendenteC = totalC;
    }
  }
  return out;
}

export function carry(
  allTrades: Trade[],
  month: number,
  type: "dt" | "sw",
  account: Account | null,
  jur: Jurisdiction,
): number {
  let c =
    parseFloat(String(type === "sw" ? account?.swingInitialLoss : account?.initialLoss)) || 0;
  for (let i = 0; i < month; i++) {
    const tr = tradesInMonth(allTrades, i);
    const res = type === "sw" ? calcSwing(tr, c, jur) : calcDT(tr, c, account, jur);
    c = res.nc;
  }
  return c;
}

export function calcUSQuarterly(
  allTrades: Trade[],
  account: Account | null,
): QuarterEst[] {
  const rate = account?.usBracket ?? 0.22;
  const quarters = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [9, 10, 11],
  ];
  const dates = ["Apr 15", "Jun 15", "Sep 15", "Jan 15 (next yr)"];
  const jur = jurisdiction(account?.country);
  return quarters.map((qs, qi) => {
    const net = qs.reduce((s, m) => s + calcDT(tradesInMonth(allTrades, m), 0, account, jur).net, 0);
    return {
      q: "Q" + (qi + 1),
      months: qs.map((m) => MONTHS_SHORT[m]).join("–"),
      net,
      est: Math.max(0, net * rate),
      due: dates[qi],
    };
  });
}

export function calcBRIntlAnnual(allTrades: Trade[], account: Account | null): BrIntlAnnual {
  const gross = allTrades.reduce((s, t) => s + num(t.gross), 0);
  const comm = allTrades.reduce((s, t) => s + num(t.comm), 0);
  const net = gross - comm;
  const avgPTAX = num(account?.avgPTAX);
  const netBRL = avgPTAX ? net * avgPTAX : null;
  const tax = netBRL != null ? Math.max(0, netBRL * 0.15) : null;
  const carneLeao = MONTHS.map((month, m) => {
    const tr = tradesInMonth(allTrades, m);
    const mn = tr.reduce((s, t) => s + num(t.gross) - num(t.comm), 0);
    const mnBRL = avgPTAX ? mn * avgPTAX : null;
    const cl = mnBRL != null && mnBRL > 2259.2 ? mnBRL * 0.275 : 0;
    return { month, netUSD: mn, netBRL: mnBRL, carneLeao: cl };
  });
  return { gross, comm, net, netBRL, tax, avgPTAX, carneLeao };
}

export function adv(trades: Trade[], sc: Jurisdiction["sc"]): AdvStats {
  const vals = trades.map((t) => tradeValue(t, sc));
  const wins = vals.filter((v) => v > 0);
  const losses = vals.filter((v) => v < 0);
  const wr = vals.length ? wins.length / vals.length : 0;
  const aw = wins.length ? wins.reduce((s, v) => s + v, 0) / wins.length : 0;
  const al = losses.length ? losses.reduce((s, v) => s + v, 0) / losses.length : 0;
  const gw = wins.reduce((s, v) => s + v, 0);
  const gl = Math.abs(losses.reduce((s, v) => s + v, 0));
  const pf = gl ? gw / gl : wins.length ? 99 : 0;
  const best = vals.length ? Math.max(...vals) : 0;
  const worst = vals.length ? Math.min(...vals) : 0;
  return { wr, aw, al, pf, exp: wr * aw + (1 - wr) * al, best, worst, wins: wins.length, losses: losses.length };
}

export function equityCurve(trades: Trade[], sc: ScopeCode): EquityPoint[] {
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  let eq = 0;
  return sorted.map((t, i) => {
    eq += tradeValue(t, sc);
    const dt = new Date(t.date + "T00:00:00");
    const name = Number.isNaN(dt.getTime())
      ? t.date
      : dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    return { i: i + 1, date: t.date, name, eq };
  });
}

export function maxDrawdown(curve: EquityPoint[]): Drawdown {
  let peak = -Infinity;
  let amount = 0;
  for (const p of curve) {
    if (p.eq > peak) peak = p.eq;
    const dd = peak - p.eq;
    if (dd > amount) amount = dd;
  }
  const peakSafe = peak > 0 ? peak : 0;
  return { amount, pct: peakSafe > 0 ? amount / peakSafe : 0 };
}

export function getSiblings(
  accounts: Account[],
  active: Account | null,
): Account[] {
  if (!active?.taxpayerId) return [];
  return accounts.filter(
    (x) =>
      x.taxpayerId === active.taxpayerId &&
      x.id !== active.id &&
      x.country === active.country &&
      x.year === active.year,
  );
}

export function calcConsol(
  month: number,
  active: Account | null,
  accounts: Account[],
  tradesMap: Record<string, Trade[]>,
): ConsolResult | null {
  if (!active) return null;
  const jur = jurisdiction(active.country);
  if (jur.sc !== "BR") return null;
  const sibs = getSiblings(accounts, active);
  if (!sibs.length) return null;
  const all = [active, ...sibs];

  const totFor = (m: number) => {
    let gross = 0,
      fees = 0,
      irrf = 0,
      net = 0,
      netSW = 0,
      irrfSW = 0;
    for (const ac of all) {
      const tr = tradesInMonth(tradesMap[ac.id] ?? [], m);
      const dt = calcDT(tr, 0, ac, jurisdiction(ac.country));
      const sw = calcSwing(tr, 0, jurisdiction(ac.country));
      gross += dt.gross;
      fees += dt.fees;
      irrf += dt.irrf;
      net += dt.net;
      netSW += sw.net;
      irrfSW += sw.irrf;
    }
    return { gross, fees, irrf, net, netSW, irrfSW };
  };

  let prevDT = 0;
  let prevSW = 0;
  for (let i = 0; i < month; i++) {
    const t = totFor(i);
    prevDT = Math.max(0, prevDT - t.net);
    prevSW = Math.max(0, prevSW - t.netSW);
  }
  const tot = totFor(month);
  const rate = (active.taxRate != null ? active.taxRate : jur.rate) || 0.2;
  const baseDT = Math.max(0, tot.net - prevDT);
  const tdDT = baseDT * rate;
  const darfDT = Math.max(0, tdDT - tot.irrf);
  const baseSW = Math.max(0, tot.netSW - prevSW);
  const tdSW = baseSW * 0.15;
  const darfSW = Math.max(0, tdSW - tot.irrfSW);
  return {
    accounts: all.map((x) => x.name),
    totNet: tot.net,
    totIRRF: tot.irrf,
    baseDT,
    darfDT,
    darfSW,
    totalDARF: darfDT + darfSW,
  };
}

export function buildAdvisorContext(input: {
  accounts: Account[];
  trades: Record<string, Trade[]>;
  activeId: string | null;
  view: string;
}): string {
  const lines = ["=== TRADINGPRO AI — FISCAL & COMPLIANCE CONTEXT ==="];
  for (const a of input.accounts) {
    const j2 = jurisdiction(a.country);
    lines.push(`\nACCOUNT: ${a.name} | ${j2.name} | ${a.broker} | ${a.year} | taxMode: ${j2.taxMode}`);
    lines.push(`TAX RULES: ${j2.note}`);
    MONTHS.forEach((mon, m) => {
      const tr = tradesInMonth(input.trades[a.id] ?? [], m);
      if (!tr.length) return;
      const c = carry(input.trades[a.id] ?? [], m, "dt", a, j2);
      const tax = calcDT(tr, c, a, j2);
      lines.push(
        `${mon}: ${tr.length} trades | net: ${tax.net.toFixed(2)}${j2.sc === "BR" ? ` | DARF DT: ${(tax.darf ?? 0).toFixed(2)}` : ""}`,
      );
    });
  }
  const active = input.accounts.find((a) => a.id === input.activeId) ?? null;
  if (active) {
    const j3 = jurisdiction(active.country);
    const all = input.trades[active.id] ?? [];
    const m = Number.parseInt(input.view, 10);
    const month = Number.isFinite(m) ? m : 0;
    const c2 = carry(all, month, "dt", active, j3);
    const tax2 = calcDT(tradesInMonth(all, month), c2, active, j3);
    lines.push(
      `\nCURRENT MONTH (${MONTHS[month]}): net=${tax2.net.toFixed(2)}${j3.sc === "BR" ? ` | DARF DT=${(tax2.darf ?? 0).toFixed(2)} | IRRF=${tax2.irrf.toFixed(2)}` : ""}`,
    );
    if (j3.sc === "BR") {
      const sc = carry(all, month, "sw", active, j3);
      const swT = calcSwing(tradesInMonth(all, month), sc, j3);
      lines.push(
        `SWING: ${swT.count} trades | net=${swT.net.toFixed(2)} | ${swT.exempt ? "ISENTO (vendas<=R$20k)" : `DARF Swing=${swT.darf.toFixed(2)}`}`,
      );
      const consol = calcConsol(month, active, input.accounts, input.trades);
      if (consol) lines.push(`DARF CONSOLIDADO: ${consol.totalDARF.toFixed(2)} (todas as contas)`);
    }
    if (j3.taxMode === "quarterly_annual") {
      for (const q of calcUSQuarterly(all, active)) {
        lines.push(`${q.q}: net=${q.net.toFixed(2)} | est. tax=${q.est.toFixed(2)} | due: ${q.due}`);
      }
    }
  }
  lines.push("\n=== TAX RULES SUMMARY ===");
  lines.push("Brazil DT: 20% mensal DARF 6015. Carry indefinido. IRRF dedutível. Prazo: último dia útil do mês seguinte.");
  lines.push("Brazil Swing: 15% mensal. ISENTO se total vendas ≤ R$20.000. Carry separado do DT.");
  lines.push("Brazil Forex Internacional: 15% ANUAL (Lei 14.754/2023). Carnê-Leão mensal se ganho > R$2.259,20. DIRPF prazo 31/maio.");
  lines.push("USA Day Trade: curto prazo = renda ordinária 10-37%. Estimativas TRIMESTRAIS (Apr/Jun/Sep/Jan). Sem IRRF. Form 1040 + Schedule D. Wash sale: 30 dias.");
  lines.push("Multi-broker BR: DARF é por CPF (pessoa), NÃO por corretora. Resultados de todas as corretoras devem ser consolidados.");
  return lines.join("\n");
}
