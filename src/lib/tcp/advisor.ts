import { formatMoney, formatPct } from "./format.ts";

export interface AdvisorFacts {
  month: string;
  year: number;
  account: string;
  broker: string;
  trades: number;
  net: number;
  darfDT: number;
  darfSW: number;
  darfTotal: number;
  irrf: number;
  swingExempt: boolean;
  swingSales: number;
  swingCount: number;
  consol: number | null;
  consolAccounts: string[];
  due: string;
  carryDT: number;
  carrySW: number;
  winRate: number;
  pf: number;
  note: string;
}

function money(n: number) {
  return formatMoney(n, "R$");
}

export function answerLocally(question: string, f: AdvisorFacts): string {
  const q = question
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/compens|prejuizo|prejuízo|carry|arrast/.test(q) && /swing|day|dt/.test(q)) {
    return [
      "Não. No Brasil o prejuízo de day trade e o de swing/posição são buckets separados.",
      `Day trade a carregar agora: ${money(f.carryDT)}. Swing a carregar: ${money(f.carrySW)}.`,
      "Prejuízo de DT só abate ganho de DT nos meses seguintes; swing só abate swing. O saldo carrega sem prazo.",
    ].join(" ");
  }

  if (/consolidad|multi.?corret|btg|xp|varias corret|várias corret/.test(q)) {
    if (f.consol == null) {
      return "O DARF 6015 é por CPF, não por corretora. Para ver o consolidado, cadastre outra conta do mesmo contribuinte no mesmo ano (Configurações → Nova conta → vincular à pessoa existente).";
    }
    return `DARF consolidado de ${f.month} (${f.consolAccounts.join(" + ")}): ${money(f.consol)}. Some o resultado de todas as corretoras do mesmo CPF antes de recolher. Não pague um DARF por corretora.`;
  }

  if (/isenc|isent|20.?000|vinte mil|swing/.test(q) && !/darf/.test(q)) {
    if (f.swingCount === 0) {
      return "Swing/posição no Brasil: IR 15% mensal (DARF 6015), isento se o total de vendas no mês for ≤ R$20.000. Day trade não tem essa isenção — 20% sobre o lucro, todo mês.";
    }
    return f.swingExempt
      ? `Em ${f.month}, as vendas de swing somaram ${money(f.swingSales)} — abaixo de R$20.000. Isento. Nenhum DARF de swing neste mês.`
      : `Em ${f.month}, as vendas de swing somaram ${money(f.swingSales)} — acima de R$20.000. Há DARF de swing de ${money(f.darfSW)} (15% sobre o lucro, menos IRRF).`;
  }

  if (/prazo|vence|vencimento|quando pagar|ultimo dia|último dia/.test(q)) {
    return `DARF 6015 de ${f.month}/${f.year} vence em ${f.due} (último dia útil do mês seguinte). Código de receita 6015. Valor agora: ${money(f.darfTotal)}.`;
  }

  if (/irrf|retenc|retenção|1%/.test(q)) {
    return `IRRF de day trade é 1% sobre o ganho positivo do dia, retido pela corretora. Em ${f.month} há ${money(f.irrf)} de IRRF a abater do DARF. O imposto cheio é 20%; o DARF é 20% − IRRF já retido.`;
  }

  if (/darf|imposto|quanto pago|quanto de|recolh/.test(q)) {
    const bits = [
      `${f.account} (${f.broker}) — ${f.month} ${f.year}: ${f.trades} operações, P&L líquido ${money(f.net)}.`,
      `DARF day trade: ${money(f.darfDT)}.`,
    ];
    if (f.swingCount) {
      bits.push(
        f.swingExempt
          ? `Swing isento (vendas ${money(f.swingSales)}).`
          : `DARF swing: ${money(f.darfSW)}.`,
      );
    }
    bits.push(`Total a recolher: ${money(f.darfTotal)}, vencimento ${f.due}.`);
    if (f.consol != null) bits.push(`Consolidado (todas as corretoras): ${money(f.consol)}.`);
    if (f.carryDT > 0) bits.push(`Prejuízo DT a carregar: ${money(f.carryDT)}.`);
    return bits.join(" ");
  }

  if (/win rate|assertiv|ganho|performance|profit factor|expect/.test(q)) {
    return `Em ${f.month}: ${f.trades} trades, win rate ${formatPct(f.winRate)}, profit factor ${f.pf >= 99 ? "+99" : f.pf.toFixed(2)}, P&L ${money(f.net)}.`;
  }

  return [
    `${f.account} · ${f.month} ${f.year}: ${f.trades} ops, líquido ${money(f.net)}, DARF ${money(f.darfTotal)} (vence ${f.due}).`,
    f.note,
    "Pergunte sobre DARF, isenção de swing, prejuízo a compensar, IRRF ou consolidado multi-corretora.",
  ].join(" ");
}
