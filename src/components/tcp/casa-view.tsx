import { useState } from "react";
import {
  CreditCard,
  Home,
  Landmark,
  PiggyBank,
  Settings,
  Target,
  Wallet,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { computeCasa, computeGoals, DEBT_PAY_LINES, FIXED_LINES, INCOME_LINES, VARIABLE_LINES } from "@/lib/casa/engine";
import { buildCasaSample } from "@/lib/casa/sample";
import type { CasaState, LineDef } from "@/lib/casa/types";
import { parseNumberCell } from "@/lib/tcp/csv";
import { formatMoney, formatPct, pnlTone } from "@/lib/tcp/format";
import { jurisdiction } from "@/lib/tcp/jurisdictions";
import { monthTax } from "@/lib/tcp/tax";
import { useActiveAccount, useTcpStore } from "@/lib/tcp/store";
import { cn } from "@/lib/utils";
import { useI18n, useTr } from "@/lib/i18n";
import { lineLabel } from "@/lib/casa/labels";
import { MetricCard, Pnl, Row, Section } from "./metric-card";
import { can, useEntitlement } from "@/lib/tcp/entitlement";
import { UpgradeWall } from "./plan-gate";

const PAGES = [
  { id: "dash" },
  { id: "budget" },
  { id: "flow" },
  { id: "worth" },
  { id: "card" },
  { id: "goals" },
] as const;

type Page = (typeof PAGES)[number]["id"] | "params";

const PIE = ["var(--tcp-accent)", "var(--tcp-warn)", "var(--tcp-loss)"];

function parseMoney(raw: string): number {
  const n = parseFloat(parseNumberCell(raw));
  return Number.isFinite(n) ? n : 0;
}

function lastBudgetMonth(casa: CasaState): number {
  const count = (m: number) => {
    let n = 0;
    for (const g of [casa.lines.income, casa.lines.fixed, casa.lines.variable, casa.lines.debtPay]) {
      for (const arr of Object.values(g)) if ((arr[m] || 0) > 0) n++;
    }
    return n;
  };
  for (let m = 11; m >= 0; m--) if (count(m) >= 6) return m;
  const now = new Date();
  return casa.params.year === now.getFullYear() ? now.getMonth() : 8;
}

function useCasa(): CasaState {
  return useTcpStore((s) => s.casa) ?? buildCasaSample();
}

function useTradingMix(month: number) {
  const account = useActiveAccount();
  const tradesMap = useTcpStore((s) => s.trades);
  const portfolio = useTcpStore((s) => s.portfolio);
  const jur = jurisdiction(account?.country);
  const all = account ? (tradesMap[account.id] ?? []) : [];
  const ent = useEntitlement();
  // Mesmo número da guia da tela do mês (mínimo de R$ 10; compensação só no Pro).
  const darf =
    account && jur.sc === "BR" ? monthTax(all, month, account, jur, can(ent, "compensacao_prejuizo")).pagar : 0;
  const carteira = portfolio.positions.reduce((s, p) => {
    const pr = portfolio.prices[p.ticker];
    return s + p.shares * (pr?.price ?? p.avgPrice);
  }, 0);
  return { darf, carteira, jur };
}

export function CasaView() {
  const { t, monthShort } = useI18n();
  const tr = useTr();
  const ent = useEntitlement();
  const casa = useCasa();
  const [page, setPage] = useState<Page>("dash");
  const [month, setMonth] = useState(() => lastBudgetMonth(casa));
  const mix = useTradingMix(month);
  const year = computeCasa(casa, mix.carteira);
  const snap = year.months[month];
  const goals = computeGoals(casa);
  const tabTotal: Record<(typeof PAGES)[number]["id"], number | null> = {
    dash: snap.surplus,
    budget: snap.surplus,
    flow: snap.cashEnd,
    worth: snap.netWorth,
    card: snap.charged,
    goals: goals.impact,
  };

  if (!can(ent, "gastos_conta")) {
    return (
      <UpgradeWall
        title={tr("Casa fica no Pro", "Household is on Pro", "La casa queda en Pro")}
        body={tr(
          "Gastos da conta, cartão e metas entram no Anzol Pro. Nada aqui é apagado.",
          "Household entries, the card and goals are on Anzol Pro. Nothing here is deleted.",
          "Los gastos de la cuenta, la tarjeta y las metas entran en Anzol Pro. Nada de esto se borra.",
        )}
      />
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t("casa")}</h1>
          <p className="mt-0.5 text-sm text-muted">
            {casa.params.familyName} · {casa.params.year} · {t("casaSub")}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={tr("Parâmetros", "Settings", "Ajustes")} onClick={() => setPage("params")}>
          <Settings className="size-4" />
        </Button>
      </div>

      <nav className="tabs-scroll mb-3 flex overflow-x-auto border-b border-border">
        {PAGES.map((p) => {
          const tot = tabTotal[p.id];
          const label =
            p.id === "dash"
              ? t("casaDash")
              : p.id === "budget"
                ? t("casaBudget")
                : p.id === "flow"
                  ? t("casaFlow")
                  : p.id === "worth"
                    ? t("casaWorth")
                    : p.id === "card"
                      ? t("casaCard")
                      : t("casaGoals");
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPage(p.id)}
              className={cn(
                "flex min-h-11 shrink-0 flex-col justify-center border-b-2 px-3 py-1",
                page === p.id ? "border-accent text-accent" : "border-transparent text-muted",
              )}
            >
              <span className="text-xs font-semibold">{label}</span>
              {tot != null && (
                <span
                  className={cn(
                    "font-mono text-2xs tabular-nums",
                    page === p.id && pnlTone(tot) === "gain" && "text-gain",
                    page === p.id && pnlTone(tot) === "loss" && "text-loss",
                    page !== p.id && "text-faint",
                  )}
                >
                  {formatMoney(tot, "R$")}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {page !== "params" && page !== "goals" && (
        <div className="tabs-scroll mb-3 flex overflow-x-auto">
          {Array.from({ length: 12 }, (_, i) => (
            <button
              key={monthShort(i)}
              type="button"
              onClick={() => setMonth(i)}
              className={cn(
                "flex min-h-11 shrink-0 items-center border-b-2 px-3 text-xs font-semibold",
                month === i ? "border-accent text-accent" : "border-transparent text-muted",
              )}
            >
              {monthShort(i)}
            </button>
          ))}
        </div>
      )}

      {page === "dash" && <DashPage year={year} snap={snap} month={month} mix={mix} casa={casa} onOpen={setPage} />}
      {page === "budget" && <BudgetPage casa={casa} month={month} snap={snap} />}
      {page === "flow" &&
        (can(ent, "fluxo_caixa") ? (
          <FlowPage year={year} month={month} />
        ) : (
          <UpgradeWall
            title={tr("Fluxo de caixa fica no Pro", "Cash flow is on Pro", "El flujo de caja queda en Pro")}
            body={tr(
              "Entradas, saídas e saldo projetado em 30, 60 e 90 dias entram no Pro. Os números seguem salvos.",
              "Money in, money out and a 30, 60 and 90 day balance are on Pro. The numbers stay saved.",
              "Entradas, salidas y saldo proyectado a 30, 60 y 90 días entran en Pro. Los números siguen guardados.",
            )}
          />
        ))}
      {page === "worth" &&
        (can(ent, "balanco") ? (
          <WorthPage year={year} snap={snap} mix={mix} month={month} />
        ) : (
          <UpgradeWall
            title={tr("Balanço fica na Baleia", "The balance sheet is on Baleia", "El balance queda en Baleia")}
            body={tr(
              "Ativos, passivos e patrimônio informados entram na Baleia. É gerencial, não um balanço oficial. Nada é apagado.",
              "Assets, liabilities and net worth you enter are on Baleia. It is managerial, not an official statement. Nothing is deleted.",
              "Activos, pasivos y patrimonio que informas entran en Baleia. Es gerencial, no un balance oficial. Nada se borra.",
            )}
          />
        ))}
      {page === "card" && <CardPage casa={casa} year={year} month={month} />}
      {page === "goals" && <GoalsPage casa={casa} />}
      {page === "params" && <ParamsPage casa={casa} onBack={() => setPage("dash")} />}
    </div>
  );
}

function DashPage({
  year,
  snap,
  month,
  mix,
  casa,
  onOpen,
}: {
  year: ReturnType<typeof computeCasa>;
  snap: ReturnType<typeof computeCasa>["months"][number];
  month: number;
  mix: ReturnType<typeof useTradingMix>;
  casa: CasaState;
  onOpen: (p: Page) => void;
}) {
  const { monthName, monthShort } = useI18n();
  const tr = useTr();
  const goals = computeGoals(casa);
  const pie = [
    { name: tr("Fixas", "Fixed", "Fijas"), v: year.fixed },
    { name: tr("Variáveis", "Variable", "Variables"), v: year.variable },
    { name: tr("Dívidas", "Debt", "Deudas"), v: year.debtPay },
  ].filter((d) => d.v > 0);
  const disponivel = snap.freeCash + snap.investEnd;

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <MetricCard
          label={tr(`Saldo ${monthShort(month)}`, `${monthShort(month)} surplus`, `Saldo ${monthShort(month)}`)}
          value={formatMoney(snap.surplus, "R$")}
          tone={pnlTone(snap.surplus)}
          sub={
            snap.surplus >= 0
              ? tr("não ficou negativo no mês", "the month stayed in surplus", "el mes no quedó en negativo")
              : snap.savingsRate != null
                ? formatPct(snap.savingsRate)
                : tr("sem receita", "no income", "sin ingresos")
          }
        />
        <MetricCard
          label={tr("Disponível", "Available", "Disponible")}
          value={formatMoney(disponivel, "R$")}
          sub={tr(
            `caixa livre ${formatMoney(snap.freeCash, "R$")}`,
            `free cash ${formatMoney(snap.freeCash, "R$")}`,
            `efectivo libre ${formatMoney(snap.freeCash, "R$")}`,
          )}
        />
        <MetricCard label={tr("Receitas no ano", "Income this year", "Ingresos del año")} value={formatMoney(year.income, "R$")} />
        <MetricCard label={tr("Despesas no ano", "Expenses this year", "Gastos del año")} value={formatMoney(year.expenses, "R$")} />
        <MetricCard label={tr("Economia no ano", "Surplus this year", "Superávit del año")} value={formatMoney(year.surplus, "R$")} tone={pnlTone(year.surplus)} sub={year.savingsRate != null ? formatPct(year.savingsRate) : undefined} />
        <MetricCard
          label={tr("Patrimônio líquido", "Net worth", "Patrimonio neto")}
          value={formatMoney(snap.netWorth, "R$")}
          tone={pnlTone(snap.netWorth)}
          sub={tr("dívidas antigas ≠ resultado do mês", "old debt ≠ this month's result", "deudas viejas ≠ resultado del mes")}
        />
      </div>

      {snap.surplus >= 0 && (
        <p className="mb-3 rounded-xl border border-gain/30 bg-gain/10 px-4 py-2.5 text-sm text-fg">
          <span className="font-semibold text-gain">
            {tr("Sobra", "Surplus", "Superávit")} {formatMoney(snap.surplus, "R$")}
          </span>
          {" · "}
          {tr(
            "o mês não ficou negativo. O que foi no crédito entra na fatura (aba Cartão), não como prejuízo. Dívidas de cartão/financiamento são saldo antigo.",
            "the month stayed in surplus. Credit-card charges land on the statement (Card tab), not as a loss. Credit-card and mortgage balances are old debt.",
            "el mes no quedó en negativo. Lo cargado a la tarjeta entra en el estado de cuenta (pestaña Tarjeta), no como pérdida. Las deudas de tarjeta e hipoteca son saldo anterior.",
          )}
        </p>
      )}

      <Section title={tr("Trading + Casa", "Trading + household", "Trading + casa")}>
        <div className="divide-y divide-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-inset text-accent">
              <Wallet className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-2xs uppercase tracking-wider text-muted">{tr("Carteira", "Portfolio", "Cartera")}</span>
              <span className="font-mono text-sm font-semibold">{formatMoney(mix.carteira, "R$")}</span>
            </span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-inset text-warn">
              <Landmark className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-2xs uppercase tracking-wider text-muted">
                {tr(`DARF ${monthShort(month)}`, `Tax slip (DARF) ${monthShort(month)}`, `Impuesto (DARF) ${monthShort(month)}`)}
              </span>
              <span className="font-mono text-sm font-semibold">{formatMoney(mix.darf, mix.jur.sym)}</span>
            </span>
          </div>
        </div>
      </Section>

      <Section title={tr("Resumo do ano", "Year summary", "Resumen del año")}>
        <div className="px-4 py-2">
          <Row label={tr("Taxa de poupança média", "Average savings rate", "Tasa de ahorro promedio")} value={year.avgSavingsRate != null ? formatPct(year.avgSavingsRate) : "—"} />
          <Row label={tr("PL inicial", "Starting net worth", "Patrimonio inicial")} value={formatMoney(year.netWorthStart, "R$")} />
          <Row label={tr(`PL em ${monthName(11)}`, `Net worth in ${monthName(11)}`, `Patrimonio en ${monthName(11)}`)} value={formatMoney(year.netWorthEnd, "R$")} tone={pnlTone(year.netWorthEnd)} />
          <Row label={tr("Crescimento do patrimônio", "Net worth growth", "Crecimiento del patrimonio")} value={formatMoney(year.netWorthEnd - year.netWorthStart, "R$")} tone={pnlTone(year.netWorthEnd - year.netWorthStart)} />
          <Row label={tr("Float do cartão", "Credit-card float", "Float de la tarjeta")} value={formatMoney(year.cardFloat, "R$")} />
          <Row label={tr("Impacto das metas", "Goal impact", "Impacto de las metas")} value={formatMoney(goals.impact ?? 0, "R$")} tone={pnlTone(goals.impact ?? 0)} />
        </div>
      </Section>

      <Section title={tr("Composição de despesas (ano)", "Expense mix (year)", "Composición de gastos (año)")}>
        {pie.length ? (
          <div className="flex items-center gap-4 p-3">
            <div className="h-36 w-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="v" nameKey="name" innerRadius={36} outerRadius={58} stroke="none">
                    {pie.map((d, i) => (
                      <Cell key={d.name} fill={PIE[i % PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatMoney(Number(v), "R$")} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <Row label={tr("Fixas", "Fixed", "Fijas")} value={formatMoney(year.fixed, "R$")} />
              <Row label={tr("Variáveis", "Variable", "Variables")} value={formatMoney(year.variable, "R$")} />
              <Row label={tr("Pagamento de dívidas", "Debt payments", "Pago de deudas")} value={formatMoney(year.debtPay, "R$")} />
            </div>
          </div>
        ) : (
          <p className="px-4 py-6 text-sm text-muted">{tr("Sem despesas lançadas ainda.", "No expenses entered yet.", "Todavía no hay gastos cargados.")}</p>
        )}
      </Section>

      <div className="grid grid-cols-2 gap-2">
        <Quick icon={Home} label={tr("Orçamento", "Budget", "Presupuesto")} onClick={() => onOpen("budget")} />
        <Quick icon={PiggyBank} label={tr("Fluxo", "Cash flow", "Flujo de caja")} onClick={() => onOpen("flow")} />
        <Quick icon={CreditCard} label={tr("Cartão + float", "Credit card + float", "Tarjeta + float")} onClick={() => onOpen("card")} />
        <Quick icon={Target} label={tr("Metas", "Goals", "Metas")} onClick={() => onOpen("goals")} />
      </div>

      <WealthPlaybook snap={snap} year={year} mix={mix} casa={casa} month={month} />
    </div>
  );
}

function Quick({ icon: Icon, label, onClick }: { icon: typeof Home; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-14 items-center gap-2 rounded-xl border border-border bg-card px-3 text-left text-sm font-semibold">
      <Icon className="size-4 text-accent" />
      {label}
    </button>
  );
}

function WealthPlaybook({
  snap,
  year,
  mix,
  casa,
  month,
}: {
  snap: ReturnType<typeof computeCasa>["months"][number];
  year: ReturnType<typeof computeCasa>;
  mix: ReturnType<typeof useTradingMix>;
  casa: CasaState;
  month: number;
}) {
  const { monthName } = useI18n();
  const tr = useTr();
  const burn = snap.expenses > 0 ? snap.expenses : year.expenses / Math.max(1, year.months.filter((m) => m.expenses > 0).length);
  const reserveMonths = burn > 0 ? snap.cashEnd / burn : null;
  const reserveSpan =
    reserveMonths == null
      ? ""
      : reserveMonths < 1
        ? tr("menos de 1 mês", "less than 1 month", "menos de 1 mes")
        : tr(`~${reserveMonths.toFixed(1)} mês(es)`, `~${reserveMonths.toFixed(1)} month(s)`, `~${reserveMonths.toFixed(1)} mes(es)`);
  const darfBit =
    mix.darf > 0
      ? tr(
          ` (${formatMoney(mix.darf, mix.jur.sym)} neste mês)`,
          ` (${formatMoney(mix.darf, mix.jur.sym)} this month)`,
          ` (${formatMoney(mix.darf, mix.jur.sym)} este mes)`,
        )
      : "";
  const tips = [
    {
      t: tr("Separe operação de patrimônio", "Keep trading separate from net worth", "Separa la operación del patrimonio"),
      d: tr(
        `Em ${monthName(month)} a casa sobrou ${formatMoney(snap.surplus, "R$")} — o mês não ficou negativo. Bilionário olha o resultado do período e o PL em colunas diferentes. Cartão ${formatMoney(snap.cardDebt, "R$")} e financiamentos ${formatMoney(snap.loanDebt, "R$")} são estoque antigo, não o placar deste mês.`,
        `In ${monthName(month)} the household surplus was ${formatMoney(snap.surplus, "R$")} — the month stayed positive. Someone building real wealth looks at the period result and net worth in different columns. The credit card ${formatMoney(snap.cardDebt, "R$")} and mortgages ${formatMoney(snap.loanDebt, "R$")} are old balances, not this month's score.`,
        `En ${monthName(month)} la casa tuvo un superávit de ${formatMoney(snap.surplus, "R$")} — el mes no quedó en negativo. Quien acumula patrimonio mira el resultado del período y el patrimonio neto en columnas distintas. La tarjeta ${formatMoney(snap.cardDebt, "R$")} y las hipotecas ${formatMoney(snap.loanDebt, "R$")} son saldo anterior, no el marcador de este mes.`,
      ),
    },
    {
      t: tr("Use o crédito como float, nunca como renda", "Use the credit card as float, never as income", "Usa la tarjeta como float, nunca como ingreso"),
      d: snap.charged > 0
        ? tr(
            `Você lançou ${formatMoney(snap.charged, "R$")} no cartão. O dinheiro continua rendendo até o vencimento. A regra de quem preserva capital: fatura 100% paga, zero rotativo, zero parcelamento de consumo.`,
            `You put ${formatMoney(snap.charged, "R$")} on the credit card. The cash keeps earning until the due date. The rule for preserving capital: pay the statement in full, zero revolving balance, zero installment plans on spending.`,
            `Cargaste ${formatMoney(snap.charged, "R$")} a la tarjeta. El dinero sigue rindiendo hasta el vencimiento. La regla de quien cuida el capital: estado de cuenta 100% pagado, cero saldo rotativo, cero cuotas de consumo.`,
          )
        : tr(
            "O que foi no crédito não tira a sobra do mês — só muda a data do caixa. Lance a fatura em Cartão e quite no vencimento. Rotativo destrói patrimônio mais rápido que qualquer aporte constrói.",
            "Credit-card charges don't reduce the month's surplus — they only change when cash leaves. Enter the statement under Card and pay it on the due date. A revolving balance destroys net worth faster than any contribution builds it.",
            "Lo cargado a la tarjeta no resta el superávit del mes: solo cambia la fecha del efectivo. Anota el estado de cuenta en Tarjeta y págalo al vencimiento. El saldo rotativo destruye patrimonio más rápido de lo que cualquier aporte lo construye.",
          ),
    },
    {
      t: tr("Mate a dívida cara antes de se sentir rico", "Kill expensive debt before you feel rich", "Elimina la deuda cara antes de sentirte rico"),
      d: snap.cardDebt > 0
        ? tr(
            `Cartão a ${formatMoney(snap.cardDebt, "R$")} costuma custar muito mais que a carteira rende no mês. Ordem: reserva mínima → zerar cartão → só então aumentar aporte. Financiamento ${formatMoney(snap.loanDebt, "R$")} só acelera se a taxa perder da renda dos ativos.`,
            `A credit card at ${formatMoney(snap.cardDebt, "R$")} usually costs far more than the portfolio earns in the month. Order: minimum cash reserve → pay the card to zero → only then raise contributions. A mortgage of ${formatMoney(snap.loanDebt, "R$")} is worth paying faster only if its rate loses to what the assets earn.`,
            `Una tarjeta en ${formatMoney(snap.cardDebt, "R$")} suele costar mucho más de lo que rinde la cartera en el mes. Orden: reserva mínima → tarjeta en cero → recién ahí subir el aporte. Una hipoteca de ${formatMoney(snap.loanDebt, "R$")} solo se acelera si la tasa pierde contra el rendimiento de los activos.`,
          )
        : tr(
            "Sem cartão em aberto, o próximo passo é automatizar o aporte (Parâmetros → % da receita) antes do gasto — pague-se primeiro.",
            "With no credit-card balance, the next step is to automate the contribution (Settings → % of income) before spending — pay yourself first.",
            "Sin saldo de tarjeta, el siguiente paso es automatizar el aporte (Ajustes → % del ingreso) antes del gasto: págate primero.",
          ),
    },
    {
      t: tr("Caixa é o oxigênio, carteira é o risco", "Cash is oxygen, the portfolio is risk", "La caja es el oxígeno, la cartera es el riesgo"),
      d: reserveMonths != null
        ? tr(
            `Reserva cobre ${reserveSpan} de despesa. Alvo clássico: 3 a 6. A carteira (${formatMoney(mix.carteira, "R$")}) não paga fatura nem DARF${darfBit}. Quem ficou rico no longo prazo não mistura capital de risco com conta da casa.`,
            `The reserve covers ${reserveSpan} of expenses. Classic target: 3 to 6. The portfolio (${formatMoney(mix.carteira, "R$")}) does not pay the credit-card bill or the Brazilian tax slip (DARF)${darfBit}. People who stayed wealthy for the long run do not mix risk capital with the household account.`,
            `La reserva cubre ${reserveSpan} de gastos. Meta clásica: 3 a 6. La cartera (${formatMoney(mix.carteira, "R$")}) no paga la factura de la tarjeta ni el impuesto brasileño (DARF)${darfBit}. Quien se hizo rico a largo plazo no mezcla capital de riesgo con la cuenta de la casa.`,
          )
        : tr(
            `Construa reserva em caixa separado da carteira (${formatMoney(mix.carteira, "R$")}). Imposto e fatura saem do operacional, nunca da posição.`,
            `Build a cash reserve separate from the portfolio (${formatMoney(mix.carteira, "R$")}). Tax and the credit-card bill come out of operating cash, never out of the position.`,
            `Arma una reserva en efectivo aparte de la cartera (${formatMoney(mix.carteira, "R$")}). El impuesto y la factura salen de la caja operativa, nunca de la posición.`,
          ),
    },
  ];
  return (
    <Section title={tr("Gestão de patrimônio", "Wealth management", "Gestión de patrimonio")} tag={<span className="text-2xs text-muted">{tr("como quem acumula de verdade", "how people who actually build wealth do it", "como quien acumula de verdad")}</span>}>
      <div className="divide-y divide-border">
        {tips.map((tip, i) => (
          <div key={tip.t} className="px-4 py-3">
            <p className="text-sm font-semibold">
              <span className="mr-2 font-mono text-2xs text-accent">{String(i + 1).padStart(2, "0")}</span>
              {tip.t}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{tip.d}</p>
          </div>
        ))}
      </div>
      <p className="border-t border-border px-4 py-2 text-2xs text-muted">
        {tr(
          `Economia no ano ${formatMoney(year.surplus, "R$")}${casa.params.investPct > 0 ? ` · aporte automático ${formatPct(casa.params.investPct)}` : " · defina % de aporte em Parâmetros"}. Uma decisão por trimestre bate dez impulsos por semana.`,
          `Year surplus ${formatMoney(year.surplus, "R$")}${casa.params.investPct > 0 ? ` · automatic contribution ${formatPct(casa.params.investPct)}` : " · set a contribution % in Settings"}. One decision a quarter beats ten impulses a week.`,
          `Superávit del año ${formatMoney(year.surplus, "R$")}${casa.params.investPct > 0 ? ` · aporte automático ${formatPct(casa.params.investPct)}` : " · define el % de aporte en Ajustes"}. Una decisión por trimestre le gana a diez impulsos por semana.`,
        )}
      </p>
    </Section>
  );
}

function BudgetPage({ casa, month, snap }: { casa: CasaState; month: number; snap: ReturnType<typeof computeCasa>["months"][number] }) {
  const tr = useTr();
  return (
    <div>
      <div className="mb-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-2xs font-semibold uppercase tracking-wider text-muted">{tr("Total do mês", "Month total", "Total del mes")}</span>
          <span className={cn("font-mono text-lg font-semibold tabular-nums", snap.surplus >= 0 ? "text-gain" : "text-loss")}>
            {formatMoney(snap.surplus, "R$")}
          </span>
        </div>
        <p className="mt-1 text-2xs leading-relaxed text-muted">
          {tr(
            `Receitas ${formatMoney(snap.income, "R$")} − fixas ${formatMoney(snap.fixed, "R$")} − variáveis ${formatMoney(snap.variable, "R$")} − dívidas ${formatMoney(snap.debtPay, "R$")}${snap.surplus >= 0 ? " · não ficou negativo" : ""}.${snap.charged > 0 ? ` No crédito ${formatMoney(snap.charged, "R$")} (fatura — o caixa não cai agora).` : " O que pagou no cartão, lance em Cartão."}`,
            `Income ${formatMoney(snap.income, "R$")} − fixed ${formatMoney(snap.fixed, "R$")} − variable ${formatMoney(snap.variable, "R$")} − debt ${formatMoney(snap.debtPay, "R$")}${snap.surplus >= 0 ? " · stayed in surplus" : ""}.${snap.charged > 0 ? ` On the credit card ${formatMoney(snap.charged, "R$")} (statement — cash does not drop now).` : " What you paid by card, enter it under Card."}`,
            `Ingresos ${formatMoney(snap.income, "R$")} − fijos ${formatMoney(snap.fixed, "R$")} − variables ${formatMoney(snap.variable, "R$")} − deudas ${formatMoney(snap.debtPay, "R$")}${snap.surplus >= 0 ? " · no quedó en negativo" : ""}.${snap.charged > 0 ? ` En la tarjeta ${formatMoney(snap.charged, "R$")} (estado de cuenta — la caja no baja ahora).` : " Lo que pagaste con tarjeta, anótalo en Tarjeta."}`,
          )}
        </p>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <MetricCard label={tr("Receitas", "Income", "Ingresos")} value={formatMoney(snap.income, "R$")} tone="gain" />
        <MetricCard label={tr("Despesas", "Expenses", "Gastos")} value={formatMoney(snap.expenses, "R$")} />
        <MetricCard
          label={tr("Saldo do mês", "Month surplus", "Superávit del mes")}
          value={formatMoney(snap.surplus, "R$")}
          tone={pnlTone(snap.surplus)}
          sub={snap.savingsRate != null ? tr(`poupança ${formatPct(snap.savingsRate)}`, `savings ${formatPct(snap.savingsRate)}`, `ahorro ${formatPct(snap.savingsRate)}`) : undefined}
        />
        <MetricCard label={tr("No crédito", "On the credit card", "En la tarjeta")} value={formatMoney(snap.charged, "R$")} sub={tr("não é prejuízo do mês", "not a loss for the month", "no es pérdida del mes")} />
      </div>
      <LineGroup title={tr("Receitas", "Income", "Ingresos")} group="income" lines={INCOME_LINES} casa={casa} month={month} />
      <LineGroup title={tr("Despesas fixas", "Fixed expenses", "Gastos fijos")} group="fixed" lines={FIXED_LINES} casa={casa} month={month} />
      <LineGroup title={tr("Despesas variáveis", "Variable expenses", "Gastos variables")} group="variable" lines={VARIABLE_LINES} casa={casa} month={month} />
      <LineGroup title={tr("Dívidas", "Debt", "Deudas")} group="debtPay" lines={DEBT_PAY_LINES} casa={casa} month={month} />
    </div>
  );
}

function LineGroup({
  title,
  group,
  lines,
  casa,
  month,
}: {
  title: string;
  group: "income" | "fixed" | "variable" | "debtPay";
  lines: readonly LineDef[];
  casa: CasaState;
  month: number;
}) {
  const { monthName } = useI18n();
  const tr = useTr();
  const update = useTcpStore((s) => s.updateCasaLine);
  const monthTotal = lines.reduce((s, line) => {
    const arr = (casa.lines[group] as Record<string, number[]>)[line.key] ?? [];
    return s + (arr[month] || 0);
  }, 0);
  const yearTotal = lines.reduce((s, line) => {
    const arr = (casa.lines[group] as Record<string, number[]>)[line.key] ?? [];
    return s + arr.reduce((a, n) => a + (n || 0), 0);
  }, 0);
  return (
    <Section
      title={title}
      tag={
        <span className="font-mono text-2xs tabular-nums text-muted">
          {monthName(month)} · {formatMoney(monthTotal, "R$")}
        </span>
      }
    >
      <div className="divide-y divide-border">
        {lines.map((line) => {
          const arr = (casa.lines[group] as Record<string, number[]>)[line.key] ?? [];
          const value = arr[month] || 0;
          const year = arr.reduce((s, n) => s + (n || 0), 0);
          return (
            <label key={line.key} className="flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1 text-sm">{lineLabel(line.key, line.label)}</span>
              <span className="hidden w-20 text-right font-mono text-2xs text-muted sm:block">{formatMoney(year, "R$")}</span>
              <MoneyInput value={value} onChange={(n) => update(group, line.key, month, n)} />
            </label>
          );
        })}
        <div className="flex items-center gap-3 bg-inset px-3 py-2.5">
          <span className="min-w-0 flex-1 text-sm font-semibold">{tr("Total", "Total", "Total")}</span>
          <span className="hidden w-20 text-right font-mono text-2xs font-semibold text-muted sm:block">
            {formatMoney(yearTotal, "R$")}
          </span>
          <span className="w-28 text-right font-mono text-sm font-semibold tabular-nums">{formatMoney(monthTotal, "R$")}</span>
        </div>
      </div>
    </Section>
  );
}

function FlowPage({ year, month }: { year: ReturnType<typeof computeCasa>; month: number }) {
  const { monthName } = useI18n();
  const tr = useTr();
  const updateInvest = useTcpStore((s) => s.updateCasaInvest);
  const casa = useCasa();
  const snap = year.months[month];
  return (
    <div>
      <div className="mb-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-2xs font-semibold uppercase tracking-wider text-muted">{tr("Caixa final", "Ending cash", "Caja final")}</span>
          <span className="font-mono text-lg font-semibold tabular-nums">{formatMoney(snap.cashEnd, "R$")}</span>
        </div>
        <p className="mt-1 text-2xs text-muted">
          {tr(
            `Livre ${formatMoney(snap.freeCash, "R$")} · fatura em aberto ${formatMoney(snap.openInvoice, "R$")}`,
            `Free ${formatMoney(snap.freeCash, "R$")} · open statement ${formatMoney(snap.openInvoice, "R$")}`,
            `Libre ${formatMoney(snap.freeCash, "R$")} · estado de cuenta abierto ${formatMoney(snap.openInvoice, "R$")}`,
          )}
        </p>
      </div>
      <Section title={tr("De onde vem e para onde vai", "Where it comes from and where it goes", "De dónde viene y a dónde va")}>
        <div className="px-4 py-2">
          <Row label={tr("Saldo inicial", "Starting balance", "Saldo inicial")} value={formatMoney(snap.cashStart, "R$")} />
          <Row label={tr("Receita", "Income", "Ingreso")} value={formatMoney(snap.income, "R$")} tone={snap.income > 0 ? "gain" : undefined} />
          <Row label={tr("Enviado a investimentos", "Sent to investments", "Enviado a inversiones")} value={formatMoney(snap.invested, "R$")} />
          <Row label={tr("Despesas (inclui o cartão)", "Expenses (includes the credit card)", "Gastos (incluye la tarjeta)")} value={formatMoney(snap.expenses, "R$")} />
          <Row label={tr("Compras no cartão (não saem agora)", "Credit-card purchases (cash doesn't leave now)", "Compras con tarjeta (no salen ahora)")} value={formatMoney(snap.charged, "R$")} tone={snap.charged > 0 ? "gain" : undefined} />
          <Row label={tr("Fatura do mês anterior", "Prior month's statement", "Estado de cuenta del mes anterior")} value={formatMoney(snap.invoicePaid, "R$")} tone={snap.invoicePaid > 0 ? "loss" : undefined} />
          <Row label={tr("Sobra do mês", "Month surplus", "Superávit del mes")} value={formatMoney(snap.cashFlow, "R$")} tone={pnlTone(snap.cashFlow)} />
          <Row label={tr("Saldo final em caixa", "Ending cash balance", "Saldo final en caja")} value={formatMoney(snap.cashEnd, "R$")} />
          <Row label={tr("Caixa livre", "Free cash", "Efectivo libre")} value={formatMoney(snap.freeCash, "R$")} />
        </div>
      </Section>
      <Section title={tr("Aporte do mês (opcional)", "This month's contribution (optional)", "Aporte del mes (opcional)")}>
        <div className="flex items-center gap-3 px-3 py-3">
          <span className="flex-1 text-sm">{tr(`Valor investido em ${monthName(month)}`, `Amount invested in ${monthName(month)}`, `Monto invertido en ${monthName(month)}`)}</span>
          <MoneyInput value={casa.investOverride[month] || 0} onChange={(n) => updateInvest(month, n)} />
        </div>
        <p className="border-t border-border px-3 py-2 text-2xs text-muted">
          {tr(
            `Em branco, usa ${formatPct(casa.params.investPct)} da receita. Ex.: R$ 500 com 10% manda R$ 50 para investimentos — não é despesa.`,
            `If blank, uses ${formatPct(casa.params.investPct)} of income. E.g. R$ 500 at 10% sends R$ 50 to investments — it is not an expense.`,
            `Si está en blanco, usa ${formatPct(casa.params.investPct)} del ingreso. Ej.: R$ 500 al 10% manda R$ 50 a inversiones — no es un gasto.`,
          )}
        </p>
      </Section>
      <Section title={tr("Investimentos", "Investments", "Inversiones")}>
        <div className="px-4 py-2">
          <Row label={tr("Saldo inicial", "Starting balance", "Saldo inicial")} value={formatMoney(snap.investStart, "R$")} />
          <Row label={tr("Recebido da conta", "Received from the account", "Recibido de la cuenta")} value={formatMoney(snap.invested, "R$")} tone="gain" />
          <Row label={tr("Saldo final", "Ending balance", "Saldo final")} value={formatMoney(snap.investEnd, "R$")} />
          <Row label={tr("Disponível (livre + investido)", "Available (free + invested)", "Disponible (libre + invertido)")} value={formatMoney(snap.freeCash + snap.investEnd, "R$")} />
        </div>
      </Section>
    </div>
  );
}

function WorthPage({
  year,
  snap,
  mix,
  month,
}: {
  year: ReturnType<typeof computeCasa>;
  snap: ReturnType<typeof computeCasa>["months"][number];
  mix: ReturnType<typeof useTradingMix>;
  month: number;
}) {
  const { monthName } = useI18n();
  const tr = useTr();
  const updateGoods = useTcpStore((s) => s.updateCasaGoods);
  const casa = useCasa();
  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <MetricCard label={tr("Ativos", "Assets", "Activos")} value={formatMoney(snap.assets, "R$")} />
        <MetricCard label={tr("Passivos", "Liabilities", "Pasivos")} value={formatMoney(snap.liabilities, "R$")} tone="loss" />
        <MetricCard label={tr("PL do mês", "Net worth this month", "Patrimonio del mes")} value={formatMoney(snap.netWorth, "R$")} tone={pnlTone(snap.netWorth)} />
        <MetricCard label={tr("PL inicial", "Starting net worth", "Patrimonio inicial")} value={formatMoney(year.netWorthStart, "R$")} tone={pnlTone(year.netWorthStart)} />
      </div>
      <Section title={tr("Ativos", "Assets", "Activos")}>
        <div className="px-4 py-2">
          <Row label={tr("Caixa / reserva", "Cash / reserve", "Caja / reserva")} value={formatMoney(snap.cashEnd, "R$")} />
          <Row label={tr("Investimentos", "Investments", "Inversiones")} value={formatMoney(snap.investEnd, "R$")} />
          <Row label={tr("Carteira", "Portfolio", "Cartera")} value={formatMoney(mix.carteira, "R$")} />
          <Row label={tr("Bens", "Property", "Bienes")} value={formatMoney(snap.goods, "R$")} />
          <Row label={tr("Total ativos", "Total assets", "Total de activos")} value={formatMoney(snap.assets, "R$")} />
        </div>
        <div className="flex items-center gap-3 border-t border-border px-3 py-3">
          <span className="flex-1 text-sm">{tr(`Bens em ${monthName(month)}`, `Property in ${monthName(month)}`, `Bienes en ${monthName(month)}`)}</span>
          <MoneyInput value={casa.goods[month] || 0} onChange={(n) => updateGoods(month, n)} />
        </div>
      </Section>
      <Section title={tr("Passivos", "Liabilities", "Pasivos")}>
        <div className="px-4 py-2">
          <Row label={tr("Cartão de crédito", "Credit card", "Tarjeta")} value={formatMoney(snap.cardDebt, "R$")} tone="loss" />
          <Row label={tr("Financiamentos", "Mortgages and loans", "Hipotecas y préstamos")} value={formatMoney(snap.loanDebt, "R$")} tone="loss" />
          <Row label={tr("Total passivos", "Total liabilities", "Total de pasivos")} value={formatMoney(snap.liabilities, "R$")} tone="loss" />
        </div>
        <p className="border-t border-border px-4 py-2 text-2xs text-muted">
          {tr(
            "O resultado do mês é a sobra (receitas − despesas). Passivos antigos não tornam o mês negativo — só o PL.",
            "The month's result is the surplus (income − expenses). Old liabilities do not make the month negative — only net worth.",
            "El resultado del mes es el superávit (ingresos − gastos). Los pasivos anteriores no ponen el mes en negativo: solo el patrimonio.",
          )}
        </p>
      </Section>
      <Section title={tr("Total", "Total", "Total")}>
        <div className="px-4 py-2">
          <Row label={tr("Patrimônio líquido", "Net worth", "Patrimonio neto")} value={formatMoney(snap.netWorth, "R$")} tone={pnlTone(snap.netWorth)} />
          <Row label={tr("Sobra do mês", "Month surplus", "Superávit del mes")} value={formatMoney(snap.surplus, "R$")} tone={pnlTone(snap.surplus)} />
        </div>
      </Section>
    </div>
  );
}

function CardPage({ casa, year, month }: { casa: CasaState; year: ReturnType<typeof computeCasa>; month: number }) {
  const { monthName } = useI18n();
  const tr = useTr();
  const update = useTcpStore((s) => s.updateCasaCardSpend);
  const snap = year.months[month];
  return (
    <div>
      <div className="mb-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-2xs font-semibold uppercase tracking-wider text-muted">{tr("Total fatura", "Statement total", "Total del estado de cuenta")}</span>
          <span className="font-mono text-lg font-semibold tabular-nums">{formatMoney(snap.charged, "R$")}</span>
        </div>
        <p className="mt-1 text-2xs text-muted">
          {tr(
            `Em aberto ${formatMoney(snap.openInvoice, "R$")} · paga no mês seguinte · float acumulado ${formatMoney(snap.floatAccum, "R$")}`,
            `Open ${formatMoney(snap.openInvoice, "R$")} · paid the following month · accumulated float ${formatMoney(snap.floatAccum, "R$")}`,
            `Abierto ${formatMoney(snap.openInvoice, "R$")} · se paga el mes siguiente · float acumulado ${formatMoney(snap.floatAccum, "R$")}`,
          )}
        </p>
      </div>
      <p className="mb-3 text-sm text-muted">
        {tr(
          "A compra entra no orçamento agora e só sai do caixa no mês seguinte. Pague a fatura inteira — rotativo anula o float.",
          "The purchase hits the budget now and only leaves cash the following month. Pay the statement in full — a revolving balance wipes out the float.",
          "La compra entra al presupuesto ahora y solo sale de la caja el mes siguiente. Paga el estado de cuenta completo: el saldo rotativo anula el float.",
        )}
      </p>
      <Section title={tr(`Fatura ${monthName(month)}`, `${monthName(month)} statement`, `Estado de cuenta de ${monthName(month)}`)}>
        <div className="flex items-center gap-3 px-3 py-3">
          <span className="flex-1 text-sm">{tr("Compras no cartão", "Credit-card purchases", "Compras con tarjeta")}</span>
          <MoneyInput value={casa.cardSpend[month] || 0} onChange={(n) => update(month, n)} />
        </div>
        <div className="border-t border-border px-4 py-2">
          <Row label={tr("Fatura anterior paga neste mês", "Prior statement paid this month", "Estado de cuenta anterior pagado este mes")} value={formatMoney(snap.invoicePaid, "R$")} />
          <Row label={tr("Fatura em aberto", "Open statement", "Estado de cuenta abierto")} value={formatMoney(snap.openInvoice, "R$")} />
        </div>
      </Section>
      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <MetricCard label={tr("Rendimento do float", "Float earnings", "Rendimiento del float")} value={formatMoney(snap.cardFloat, "R$")} tone={pnlTone(snap.cardFloat)} />
        <MetricCard
          label={tr("Ganho no ano", "Gain this year", "Ganancia del año")}
          value={formatMoney(year.cardFloat, "R$")}
          sub={tr(`acumulado ${formatMoney(snap.floatAccum, "R$")}`, `accumulated ${formatMoney(snap.floatAccum, "R$")}`, `acumulado ${formatMoney(snap.floatAccum, "R$")}`)}
        />
        <MetricCard label={tr("Gasto no cartão (ano)", "Credit-card spending (year)", "Gasto en la tarjeta (año)")} value={formatMoney(year.cardSpend, "R$")} />
        <MetricCard label={tr("Rend. por ciclo", "Yield per cycle", "Rendimiento por ciclo")} value={formatPct(casa.params.floatYield)} />
      </div>
    </div>
  );
}

function GoalsPage({ casa }: { casa: CasaState }) {
  const tr = useTr();
  const update = useTcpStore((s) => s.updateCasaGoal);
  const { rows, impact } = computeGoals(casa);
  const reduce = rows.filter((r) => r.kind === "reduce");
  const increase = rows.filter((r) => r.kind === "increase");
  const reduceTot = reduce.reduce((s, r) => s + (r.yearImpact ?? 0), 0);
  const increaseTot = increase.reduce((s, r) => s + (r.yearImpact ?? 0), 0);
  return (
    <div>
      <div className="mb-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-2xs font-semibold uppercase tracking-wider text-muted">{tr("Total estimado no ano", "Estimated total this year", "Total estimado del año")}</span>
          <span className={cn("font-mono text-lg font-semibold tabular-nums", (impact ?? 0) > 0 ? "text-gain" : "")}>
            {impact != null ? formatMoney(impact, "R$") : "—"}
          </span>
        </div>
        <p className="mt-1 text-2xs text-muted">
          {tr(
            `Cortar ${formatMoney(reduceTot, "R$")} + ganhar ${formatMoney(increaseTot, "R$")} · sem histórico fica de fora`,
            `Cut ${formatMoney(reduceTot, "R$")} + earn ${formatMoney(increaseTot, "R$")} · no history is left out`,
            `Recortar ${formatMoney(reduceTot, "R$")} + ganar ${formatMoney(increaseTot, "R$")} · sin historial queda afuera`,
          )}
        </p>
      </div>
      <MetricCard
        label={tr("Impacto estimado no ano", "Estimated impact this year", "Impacto estimado del año")}
        value={impact != null ? formatMoney(impact, "R$") : "—"}
        tone={impact && impact > 0 ? "gain" : "neutral"}
        sub={tr("categorias sem histórico ficam de fora", "categories with no history are left out", "las categorías sin historial quedan afuera")}
      />
      <div className="mt-3" />
      <Section title={tr("Cortar gastos", "Cut spending", "Recortar gastos")} tag={<span className="font-mono text-2xs">{formatMoney(reduceTot, "R$")}</span>}>
        {reduce.map((r) => (
          <GoalRowView key={r.key} row={r} onPct={(pct) => update("reduce", r.key, pct)} />
        ))}
      </Section>
      <Section title={tr("Aumentar ganhos", "Increase income", "Aumentar ingresos")} tag={<span className="font-mono text-2xs">{formatMoney(increaseTot, "R$")}</span>}>
        {increase.map((r) => (
          <GoalRowView key={r.key} row={r} onPct={(pct) => update("increase", r.key, pct)} />
        ))}
      </Section>
    </div>
  );
}

function GoalRowView({ row, onPct }: { row: ReturnType<typeof computeGoals>["rows"][number]; onPct: (pct: number) => void }) {
  const tr = useTr();
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{lineLabel(row.key, row.label)}</div>
        <div className="text-2xs text-muted">
          {row.avg == null
            ? tr("sem histórico", "no history", "sin historial")
            : tr(
                `média ${formatMoney(row.avg, "R$")} → ${formatMoney(row.target ?? 0, "R$")}`,
                `average ${formatMoney(row.avg, "R$")} → ${formatMoney(row.target ?? 0, "R$")}`,
                `promedio ${formatMoney(row.avg, "R$")} → ${formatMoney(row.target ?? 0, "R$")}`,
              )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <MoneyInput value={Math.round(row.pct * 100)} onChange={(n) => onPct(Math.max(0, n) / 100)} suffix="%" />
      </div>
      <Pnl n={row.yearImpact ?? 0}>
        <span className="w-24 text-right text-xs">{row.yearImpact == null ? "—" : formatMoney(row.yearImpact, "R$")}</span>
      </Pnl>
    </div>
  );
}

function ParamsPage({ casa, onBack }: { casa: CasaState; onBack: () => void }) {
  const tr = useTr();
  const update = useTcpStore((s) => s.updateCasaParams);
  const reset = useTcpStore((s) => s.resetCasa);
  const p = casa.params;
  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" onClick={onBack}>
        {tr("Voltar ao resumo", "Back to summary", "Volver al resumen")}
      </Button>
      <Section title={tr("Dados gerais", "General", "Datos generales")}>
        <div className="space-y-3 p-3">
          <div>
            <FieldLabel>{tr("Nome (pessoa/família)", "Name (person/household)", "Nombre (persona/hogar)")}</FieldLabel>
            <Input value={p.familyName} onChange={(e) => update({ familyName: e.target.value })} />
          </div>
          <div>
            <FieldLabel>{tr("Ano", "Year", "Año")}</FieldLabel>
            <Input type="number" value={p.year} onChange={(e) => update({ year: Number(e.target.value) || p.year })} />
          </div>
        </div>
      </Section>
      <Section title={tr("Saldos iniciais (31/12 do ano anterior)", "Opening balances (Dec 31 of the prior year)", "Saldos iniciales (31/12 del año anterior)")}>
        <div className="space-y-3 p-3">
          <ParamMoney label={tr("Caixa / reserva", "Cash / reserve", "Caja / reserva")} value={p.initialCash} onChange={(n) => update({ initialCash: n })} />
          <ParamMoney label={tr("Investimentos", "Investments", "Inversiones")} value={p.initialInvest} onChange={(n) => update({ initialInvest: n })} />
          <ParamMoney label={tr("Bens", "Property", "Bienes")} value={p.initialGoods} onChange={(n) => update({ initialGoods: n })} />
          <ParamMoney label={tr("Cartão (saldo devedor)", "Credit card (balance owed)", "Tarjeta (saldo a pagar)")} value={p.initialCard} onChange={(n) => update({ initialCard: n })} />
          <ParamMoney label={tr("Financiamentos", "Mortgages and loans", "Hipotecas y préstamos")} value={p.initialLoans} onChange={(n) => update({ initialLoans: n })} />
        </div>
      </Section>
      <Section title={tr("Regras", "Rules", "Reglas")}>
        <div className="space-y-3 p-3">
          <ParamMoney label={tr("% da receita investido", "% of income invested", "% del ingreso invertido")} value={Math.round(p.investPct * 100)} onChange={(n) => update({ investPct: n / 100 })} suffix="%" />
          <ParamMoney label={tr("Rendimento do float / ciclo", "Float yield / cycle", "Rendimiento del float / ciclo")} value={Math.round(p.floatYield * 1000) / 10} onChange={(n) => update({ floatYield: n / 100 })} suffix="%" />
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between rounded-lg border border-border px-3 text-left text-sm"
            onClick={() => update({ payOpeningCard: p.payOpeningCard !== true })}
          >
            <span>{tr("Pagar a fatura inicial em janeiro", "Pay the opening statement in January", "Pagar el estado de cuenta inicial en enero")}</span>
            <span className="font-semibold text-accent">{p.payOpeningCard === true ? tr("Sim", "Yes", "Sí") : tr("Não", "No", "No")}</span>
          </button>
          <p className="text-2xs text-muted">
            {tr(
              "No modelo da planilha, o saldo do cartão em 31/12 sai do caixa em janeiro. Deixe em Não se essa fatura ainda está aberta.",
              "In the spreadsheet model, the Dec 31 credit-card balance leaves cash in January. Leave this as No if that statement is still open.",
              "En el modelo de la hoja, el saldo de la tarjeta al 31/12 sale de la caja en enero. Déjalo en No si ese estado de cuenta sigue abierto.",
            )}
          </p>
        </div>
      </Section>
      <Button variant="secondary" className="w-full" onClick={() => reset()}>
        {tr("Restaurar dados da planilha", "Restore spreadsheet data", "Restaurar datos de la hoja")}
      </Button>
    </div>
  );
}

function ParamMoney({ label, value, onChange, suffix }: { label: string; value: number; onChange: (n: number) => void; suffix?: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <MoneyInput value={value} onChange={onChange} suffix={suffix} wide />
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  suffix,
  wide,
}: {
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  wide?: boolean;
}) {
  const tr = useTr();
  const [raw, setRaw] = useState<string | null>(null);
  const shown = raw ?? (value ? String(value).replace(".", ",") : "");
  return (
    <span className={cn("flex items-center gap-1", wide && "w-full")}>
      <input
        inputMode="decimal"
        className={cn(
          "h-11 rounded-lg border border-border-strong bg-card px-2 text-right font-mono text-base tabular-nums outline-none focus:border-accent md:text-sm",
          wide ? "w-full" : "w-28",
        )}
        value={shown}
        placeholder="0"
        aria-label={tr("Valor", "Amount", "Monto")}
        onFocus={() => setRaw(value ? String(value).replace(".", ",") : "")}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => {
          onChange(parseMoney(raw ?? ""));
          setRaw(null);
        }}
      />
      {suffix ? <span className="text-xs text-muted">{suffix}</span> : null}
    </span>
  );
}
