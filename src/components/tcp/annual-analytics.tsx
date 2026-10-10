import { useMemo } from "react";
import { BarChart3, Printer } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { useI18n, useTr } from "@/lib/i18n";
import { toast } from "sonner";
import { can, useEntitlement } from "@/lib/tcp/entitlement";
import { allowsPdf } from "@/lib/tcp/plans";
import { requestPlans } from "./plan-gate";
import { formatDateBR, formatMoney, formatPct, MONTHS, pnlTone } from "@/lib/tcp/format";
import { jurisdiction } from "@/lib/tcp/jurisdictions";
import {
  adv,
  calcBRIntlAnnual,
  calcConsol,
  calcDT,
  calcUSQuarterly,
  carry,
  darfDueDate,
  equityCurve,
  getSiblings,
  maxDrawdown,
  tradesInMonth,
} from "@/lib/tcp/tax";
import { useActiveAccount, useTcpStore } from "@/lib/tcp/store";
import { cn } from "@/lib/utils";
import { EmptyState, MetricCard, Pnl, Row, Section } from "./metric-card";

const tick = { fill: "var(--tcp-muted)", fontSize: 10 };
const grid = { stroke: "var(--tcp-border)" };

export function AnnualView() {
  const account = useActiveAccount();
  const tradesMap = useTcpStore((s) => s.trades);
  const updateAccount = useTcpStore((s) => s.updateAccount);
  const setView = useTcpStore((s) => s.setView);
  const tr = useTr();
  const ent = useEntitlement();
  const { monthName, monthShort } = useI18n();
  const jur = jurisdiction(account?.country);
  const all = account ? (tradesMap[account.id] ?? []) : [];

  if (jur.sc === "BR_INTL") {
    const ann = calcBRIntlAnnual(all, account);
    const clRows = ann.carneLeao.filter((x) => Math.abs(x.netUSD) > 0);
    return (
      <div>
        <section className="mb-3 overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">
            {tr("Forex internacional — resumo anual", "International forex — annual summary", "Forex internacional — resumen anual")}
          </div>
          <div className="px-4 py-3">
            <p className="mb-3 rounded-lg border border-warn/25 bg-warn/10 px-3 py-2 text-2xs leading-relaxed text-warn">
              {jur.note}
            </p>
            <div className="mb-3">
              <FieldLabel>{tr("PTAX média (USD/BRL)", "Average PTAX (USD/BRL)", "PTAX promedio (USD/BRL)")}</FieldLabel>
              <Input
                type="number"
                step="0.01"
                defaultValue={ann.avgPTAX || ""}
                placeholder={tr("ex: 5.40", "e.g. 5.40", "ej.: 5.40")}
                onBlur={(e) => account && updateAccount(account.id, { avgPTAX: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <Row label={tr("Gross total (USD)", "Gross total (USD)", "Bruto total (USD)")} value={formatMoney(ann.gross, "$")} tone={pnlTone(ann.gross)} />
            <Row label={tr("Comissões (USD)", "Commissions (USD)", "Comisiones (USD)")} value={formatMoney(ann.comm, "$")} />
            <Row label={tr("Net total (USD)", "Net total (USD)", "Neto total (USD)")} value={formatMoney(ann.net, "$")} tone={pnlTone(ann.net)} />
            <Row
              label={tr("Net total (BRL ao PTAX médio)", "Net total (BRL at average PTAX)", "Neto total (BRL al PTAX promedio)")}
              value={ann.netBRL != null ? formatMoney(ann.netBRL, "R$") : tr("Informe o PTAX", "Enter the PTAX", "Ingresa el PTAX")}
              tone={ann.netBRL != null ? pnlTone(ann.netBRL) : "muted"}
            />
            <Row label={tr("IR (15% — Lei 14.754/2023)", "Income tax (15% — Law 14.754/2023)", "IR (15% — Ley 14.754/2023)")} value={ann.tax != null ? formatMoney(ann.tax, "R$") : "—"} />
            <div className="mt-3 flex items-center justify-between rounded-lg border border-accent/30 bg-accent/10 px-4 py-3">
              <span className="text-2xs font-semibold uppercase tracking-wider text-accent">
                {tr("DIRPF — prazo 31/maio", "DIRPF — due May 31", "DIRPF — vence el 31 de mayo")}
              </span>
              <span className="font-mono text-xl font-semibold tabular-nums">
                {ann.tax != null ? formatMoney(ann.tax, "R$") : tr("Informe PTAX", "Enter PTAX", "Ingresa el PTAX")}
              </span>
            </div>
          </div>
        </section>
        {clRows.length > 0 && (
          <Section title={tr("Carnê-Leão mensal", "Monthly carnê-leão", "Carnê-Leão mensual")}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-2xs uppercase tracking-wider text-muted">
                    <th className="px-3 py-2">{tr("Mês", "Month", "Mes")}</th>
                    <th className="px-3 py-2">{tr("Net (USD)", "Net (USD)", "Neto (USD)")}</th>
                    <th className="px-3 py-2">{tr("Net (BRL)", "Net (BRL)", "Neto (BRL)")}</th>
                    <th className="px-3 py-2">Carnê-Leão</th>
                  </tr>
                </thead>
                <tbody>
                  {clRows.map((x) => {
                    const mi = MONTHS.findIndex((name) => name === x.month);
                    return (
                      <tr key={x.month} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">{mi >= 0 ? monthName(mi) : x.month}</td>
                        <td className="px-3 py-2">
                          <Pnl n={x.netUSD}>{formatMoney(x.netUSD, "$")}</Pnl>
                        </td>
                        <td className="px-3 py-2 font-mono tabular-nums">
                          {x.netBRL != null ? formatMoney(x.netBRL, "R$") : "—"}
                        </td>
                        <td className="px-3 py-2 font-mono tabular-nums text-loss">
                          {x.carneLeao > 0 ? formatMoney(x.carneLeao, "R$") : tr("Isento", "Exempt", "Exento")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        )}
      </div>
    );
  }

  const rows = MONTHS.map((mon, m) => {
    const monthTrades = tradesInMonth(all, m);
    const c = carry(all, m, "dt", account, jur, can(ent, "compensacao_prejuizo"));
    const tax = calcDT(monthTrades, c, account, jur);
    return { m, mon, tr: monthTrades, tax, a: adv(monthTrades, jur.sc), due: account ? darfDueDate(account.year, m) : null };
  });
  const tN = rows.reduce((s, r) => s + r.tax.net, 0);
  const tT = rows.reduce((s, r) => s + (jur.sc === "BR" ? (r.tax.darf ?? 0) : (r.tax.td || 0)), 0);
  const tO = rows.reduce((s, r) => s + r.tr.length, 0);
  const awrs = rows.filter((r) => r.tr.length);
  const avgWr = awrs.length ? awrs.reduce((s, r) => s + r.a.wr, 0) / awrs.length : 0;
  const chartData = rows.map((r) => ({ name: monthShort(r.m), net: r.tax.net }));
  const qs = jur.taxMode === "quarterly_annual" ? calcUSQuarterly(all, account) : [];

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <MetricCard label={tr("Operações no ano", "Trades this year", "Operaciones en el año")} value={tO} />
        <MetricCard label={tr("Win rate médio", "Average win rate", "Win rate promedio")} value={formatPct(avgWr)} tone={avgWr >= 0.5 ? "gain" : "loss"} />
        <MetricCard label={tr("P&L líquido", "Net P&L", "P&L neto")} value={formatMoney(tN, jur.sym)} tone={pnlTone(tN)} />
        <MetricCard label={jur.sc === "BR" ? tr("DARF no ano", "DARF this year", "DARF en el año") : tr("Imposto estimado", "Estimated tax", "Impuesto estimado")} value={formatMoney(tT, jur.sym)} tone="warn" />
      </div>
      {jur.taxMode === "quarterly_annual" && account && (
        <Section title={tr("Estimativas trimestrais (EUA)", "Quarterly estimates (US)", "Estimaciones trimestrales (EE. UU.)")}>
          <div className="px-4 pt-3">
            <FieldLabel>{tr("Sua faixa de IR", "Your income-tax bracket", "Tu tramo de IR")}</FieldLabel>
            <div className="mb-3 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
              {[10, 12, 22, 24, 32, 35, 37].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => updateAccount(account.id, { usBracket: r / 100 })}
                  className={cn(
                    "rounded-lg border py-2 text-xs font-semibold",
                    account.usBracket === r / 100
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-card",
                  )}
                >
                  {r}%
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 p-4 pt-0">
            {qs.map((q, qi) => (
              <div key={q.q} className="rounded-xl border border-border bg-inset p-3">
                <div className="text-2xs font-semibold uppercase tracking-wider text-muted">
                  {q.q} ({monthShort(qi * 3)}–{monthShort(qi * 3 + 2)})
                </div>
                <div className={cn("mt-1 font-mono text-lg font-semibold tabular-nums", q.net >= 0 ? "text-gain" : "text-loss")}>
                  {formatMoney(q.net, jur.sym)}
                </div>
                <div className="text-2xs text-muted">{tr("P&L líquido", "Net P&L", "P&L neto")}</div>
                <div className="mt-1 text-sm font-semibold text-warn">
                  {tr("Est. imposto:", "Est. tax:", "Imp. est.:")} {formatMoney(q.est, jur.sym)}
                </div>
                <div className="text-2xs text-loss">
                  {tr("Vence:", "Due:", "Vence:")}{" "}
                  {q.due === "Apr 15"
                    ? tr("Apr 15", "Apr 15", "15 abr")
                    : q.due === "Jun 15"
                      ? tr("Jun 15", "Jun 15", "15 jun")
                      : q.due === "Sep 15"
                        ? tr("Sep 15", "Sep 15", "15 sep")
                        : q.due === "Jan 15 (next yr)"
                          ? tr("Jan 15 (next yr)", "Jan 15 (next year)", "15 ene (año siguiente)")
                          : q.due}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
      <Section title={tr("P&L mensal", "Monthly P&L", "P&L mensual")}>
        <div className="h-48 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" {...grid} />
              <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} />
              <YAxis tick={tick} axisLine={false} tickLine={false} width={48} />
              <Tooltip
                contentStyle={{
                  background: "var(--tcp-surface)",
                  border: "1px solid var(--tcp-border-strong)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                {chartData.map((d) => (
                  <Cell key={d.name} fill={d.net >= 0 ? "var(--tcp-gain)" : "var(--tcp-loss)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>
      <Section
        title={tr("Apuração anual", "Annual filing", "Declaración anual")}
        action={
          <Button
            variant="secondary"
            size="sm"
            className="no-print"
            onClick={() => {
              if (!allowsPdf(ent)) {
                toast.message(
                  tr(
                    "PDF para o contador entra no Pro. Nada foi gerado.",
                    "A PDF for your accountant is on Pro. Nothing was generated.",
                    "El PDF para el contador entra en Pro. No se generó nada.",
                  ),
                );
                requestPlans();
                return;
              }
              window.print();
            }}
          >
            <Printer className="size-3.5" />
            {tr("Imprimir", "Print", "Imprimir")}
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-2xs uppercase tracking-wider text-muted">
                <th className="px-3 py-2">{tr("Mês", "Month", "Mes")}</th>
                <th className="px-3 py-2">{tr("Ops", "Trades", "Ops")}</th>
                <th className="px-3 py-2">Win rate</th>
                <th className="px-3 py-2">{tr("P&L líquido", "Net P&L", "P&L neto")}</th>
                <th className="px-3 py-2">{jur.sc === "BR" ? "DARF" : tr("Imposto", "Tax", "Impuesto")}</th>
                {jur.sc === "BR" && <th className="px-3 py-2">{tr("Vencimento", "Due date", "Vencimiento")}</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.mon}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-inset"
                  onClick={() => setView(String(r.m))}
                >
                  <td className="px-3 py-2 font-semibold">{monthName(r.m)}</td>
                  <td className="px-3 py-2">{r.tr.length}</td>
                  <td className="px-3 py-2">{r.tr.length ? formatPct(r.a.wr) : "—"}</td>
                  <td className="px-3 py-2">
                    <Pnl n={r.tax.net}>{formatMoney(r.tax.net, jur.sym)}</Pnl>
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums text-warn">
                    {formatMoney(jur.sc === "BR" ? r.tax.darf : r.tax.td, jur.sym)}
                  </td>
                  {jur.sc === "BR" && (
                    <td className="px-3 py-2 text-muted">{r.due ? formatDateBR(r.due) : "—"}</td>
                  )}
                </tr>
              ))}
              <tr className="bg-inset font-semibold">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2">{tO}</td>
                <td className="px-3 py-2">{formatPct(avgWr)}</td>
                <td className="px-3 py-2">
                  <Pnl n={tN}>{formatMoney(tN, jur.sym)}</Pnl>
                </td>
                <td className="px-3 py-2 font-mono tabular-nums text-warn">{formatMoney(tT, jur.sym)}</td>
                {jur.sc === "BR" && <td className="px-3 py-2" />}
              </tr>
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

export function AnalyticsView() {
  const account = useActiveAccount();
  const tradesMap = useTcpStore((s) => s.trades);
  const tr = useTr();
  const { monthShort, locale } = useI18n();
  const jur = jurisdiction(account?.country);
  const all = account ? (tradesMap[account.id] ?? []) : [];
  const stats = adv(all, jur.sc);
  const dateTag = locale === "en" ? "en-US" : locale === "es" ? "es-AR" : "pt-BR";
  const curve = useMemo(() => {
    return equityCurve(all, jur.sc).map((point) => {
      const dt = new Date(point.date + "T00:00:00");
      if (Number.isNaN(dt.getTime())) return point;
      return { ...point, name: dt.toLocaleDateString(dateTag, { day: "2-digit", month: "short" }) };
    });
  }, [all, jur.sc, dateTag]);
  const dd = maxDrawdown(curve);
  const assetMap = useMemo(() => {
    const aM: Record<string, number> = {};
    for (const t of all) {
      const k = t.asset || "?";
      aM[k] = (aM[k] || 0) + (jur.sc === "BR" || jur.sc === "BR_INTL"
        ? (Number(t.ajuste) || Number(t.gross) || 0) - (Number(t.taxas) || Number(t.comm) || 0)
        : (Number(t.gross) || 0) - (Number(t.comm) || 0));
    }
    return Object.entries(aM).map(([name, v]) => ({ name, v }));
  }, [all, jur.sc]);
  const wrD = MONTHS.map((_, m) => {
    const monthTrades = tradesInMonth(all, m);
    const a = adv(monthTrades, jur.sc);
    return { name: monthShort(m), wr: monthTrades.length ? Math.round(a.wr * 100) : null };
  });
  const sorted = [...all].sort((a, b) => a.date.localeCompare(b.date));
  let streak = 0;
  let sT: "W" | "L" = "W";
  if (sorted.length) {
    const last = (jur.sc === "BR"
      ? Number(sorted[sorted.length - 1].ajuste) || 0
      : Number(sorted[sorted.length - 1].gross) || 0) -
      (jur.sc === "BR" ? Number(sorted[sorted.length - 1].taxas) || 0 : Number(sorted[sorted.length - 1].comm) || 0);
    sT = last > 0 ? "W" : "L";
    for (let i = sorted.length - 1; i >= 0; i--) {
      const v =
        (jur.sc === "BR" ? Number(sorted[i].ajuste) || 0 : Number(sorted[i].gross) || 0) -
        (jur.sc === "BR" ? Number(sorted[i].taxas) || 0 : Number(sorted[i].comm) || 0);
      if (v > 0 === last > 0) streak++;
      else break;
    }
  }
  const total = all.reduce((s, t) => {
    return (
      s +
      ((jur.sc === "BR" ? Number(t.ajuste) || 0 : Number(t.gross) || 0) -
        (jur.sc === "BR" ? Number(t.taxas) || 0 : Number(t.comm) || 0))
    );
  }, 0);

  if (!all.length) {
    return (
      <Section title={tr("Análise", "Analysis", "Análisis")}>
        <EmptyState icon={<BarChart3 className="size-7" />} title={tr("Nenhuma operação ainda", "No trades yet", "Todavía no hay operaciones")} />
      </Section>
    );
  }

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <MetricCard label={tr("P&L acumulado", "Cumulative P&L", "P&L acumulado")} value={formatMoney(total, jur.sym)} tone={pnlTone(total)} />
        <MetricCard
          label="Profit factor"
          value={stats.pf >= 99 ? "+99" : stats.pf.toFixed(2)}
          tone={stats.pf >= 1 ? "gain" : "loss"}
        />
        <MetricCard label={tr("Expectativa", "Expectancy", "Expectativa")} value={formatMoney(stats.exp, jur.sym)} tone={pnlTone(stats.exp)} />
        <MetricCard
          label={tr("Drawdown máx.", "Max drawdown", "Drawdown máx.")}
          value={formatMoney(dd.amount, jur.sym)}
          sub={dd.pct ? formatPct(dd.pct) : `${streak} ${sT}`}
          tone="loss"
        />
      </div>
      <Section title={tr("Curva de capital", "Equity curve", "Curva de capital")}>
        <div className="h-52 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={curve}>
              <CartesianGrid strokeDasharray="3 3" {...grid} />
              <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={tick} axisLine={false} tickLine={false} width={52} />
              <Tooltip
                contentStyle={{
                  background: "var(--tcp-surface)",
                  border: "1px solid var(--tcp-border-strong)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="eq"
                stroke="var(--tcp-accent)"
                fill="var(--tcp-accent)"
                fillOpacity={0.12}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>
      <div className="mb-3 grid gap-3 md:grid-cols-2">
        <Section title={tr("P&L por ativo", "P&L by asset", "P&L por activo")}>
          <div className="h-52 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assetMap} layout="vertical">
                <CartesianGrid horizontal={false} strokeDasharray="3 3" {...grid} />
                <XAxis type="number" tick={tick} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={64} tick={tick} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--tcp-surface)",
                    border: "1px solid var(--tcp-border-strong)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="v" radius={[0, 4, 4, 0]}>
                  {assetMap.map((d) => (
                    <Cell key={d.name} fill={d.v >= 0 ? "var(--tcp-gain)" : "var(--tcp-loss)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title={tr("Win rate por mês", "Win rate by month", "Win rate por mes")}>
          <div className="h-52 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={wrD}>
                <CartesianGrid strokeDasharray="3 3" {...grid} />
                <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={tick} axisLine={false} tickLine={false} width={32} />
                <Tooltip
                  contentStyle={{
                    background: "var(--tcp-surface)",
                    border: "1px solid var(--tcp-border-strong)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="wr" stroke="var(--tcp-accent)" strokeWidth={2} connectNulls dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>
    </div>
  );
}

export function ConsolView() {
  const account = useActiveAccount();
  const accounts = useTcpStore((s) => s.accounts);
  const tradesMap = useTcpStore((s) => s.trades);
  const tr = useTr();
  const { monthName } = useI18n();
  const jur = jurisdiction(account?.country);
  const sibs = getSiblings(accounts, account);
  if (!account || !sibs.length) {
    return (
      <Section title={tr("Consolidado", "Combined", "Consolidado")}>
        <EmptyState
          icon={<BarChart3 className="size-7" />}
          title={tr(
            "Cadastre outra conta do mesmo contribuinte para ver o DARF consolidado.",
            "Add another account for the same taxpayer to see the combined DARF.",
            "Registra otra cuenta del mismo contribuyente para ver el DARF consolidado.",
          )}
        />
      </Section>
    );
  }
  const all = [account, ...sibs];
  return (
    <div>
      <div className="mb-3 rounded-xl border border-border bg-inset p-4">
        <div className="mb-1 text-sm font-semibold">{tr("Visão consolidada", "Combined view", "Vista consolidada")}</div>
        <p className="text-2xs text-muted">
          {tr("Contas agrupadas:", "Grouped accounts:", "Cuentas agrupadas:")} {all.map((x) => `${jurisdiction(x.country).flag} ${x.name} (${x.broker})`).join(", ")}
        </p>
      </div>
      <Section title={tr("DARF consolidado mensal", "Monthly combined DARF", "DARF consolidado mensual")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead>
              <tr className="border-b border-border text-2xs uppercase tracking-wider text-muted">
                <th className="px-3 py-2">{tr("Mês", "Month", "Mes")}</th>
                <th className="px-3 py-2">Net DT</th>
                <th className="px-3 py-2">{tr("IRRF total", "Total IRRF", "IRRF total")}</th>
                <th className="px-3 py-2">DARF DT</th>
                <th className="px-3 py-2">DARF Swing</th>
                <th className="px-3 py-2">{tr("DARF total", "Total DARF", "DARF total")}</th>
              </tr>
            </thead>
            <tbody>
              {MONTHS.map((mon, m) => {
                const c = calcConsol(m, account, accounts, tradesMap);
                if (!c) return null;
                return (
                  <tr key={mon} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-semibold">{monthName(m)}</td>
                    <td className="px-3 py-2">
                      <Pnl n={c.totNet}>{formatMoney(c.totNet, jur.sym)}</Pnl>
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums text-gain">{formatMoney(c.totIRRF, jur.sym)}</td>
                    <td className="px-3 py-2 font-mono tabular-nums text-warn">{formatMoney(c.darfDT, jur.sym)}</td>
                    <td className="px-3 py-2 font-mono tabular-nums">
                      {c.darfSW > 0 ? formatMoney(c.darfSW, jur.sym) : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono font-semibold tabular-nums text-warn">
                      {formatMoney(c.totalDARF, jur.sym)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
