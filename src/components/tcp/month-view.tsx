import { useState } from "react";
import { ClipboardList, FileText, Home, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { computeCasa } from "@/lib/casa/engine";
import { formatDate, formatDateBR, formatMoney, formatPct, num, pnlTone } from "@/lib/tcp/format";
import { jurisdiction } from "@/lib/tcp/jurisdictions";
import {
  adv,
  calcConsol,
  calcDT,
  monthTax,
  carry,
  darfDueDate,
  tradesInMonth,
} from "@/lib/tcp/tax";
import { useI18n, useTr } from "@/lib/i18n";
import { useActiveAccount, useTcpStore } from "@/lib/tcp/store";
import type { Jurisdiction, SwingResult, Trade } from "@/lib/tcp/types";
import { DarfGuide } from "./darf-guide";
import { EmptyState, MetricCard, Pnl, Row, Section } from "./metric-card";
import { can, useEntitlement } from "@/lib/tcp/entitlement";
import { allowsPdf, countryAllowed, monthAllowed } from "@/lib/tcp/plans";
import { requestPlans } from "./plan-gate";

export function MonthView({
  month,
  onAdd,
  onEdit,
}: {
  month: number;
  onAdd: (tipo: "dt" | "sw") => void;
  onEdit: (id: string) => void;
}) {
  const account = useActiveAccount();
  const { t, monthName, monthShort } = useI18n();
  const tr = useTr();
  const tradesMap = useTcpStore((s) => s.trades);
  const accounts = useTcpStore((s) => s.accounts);
  const deleteTrade = useTcpStore((s) => s.deleteTrade);
  const addTrade = useTcpStore((s) => s.addTrade);
  const setConv = useTcpStore((s) => s.setConv);
  const conv = useTcpStore((s) => s.conv);
  const casa = useTcpStore((s) => s.casa);
  const setView = useTcpStore((s) => s.setView);
  const jur = jurisdiction(account?.country);
  const all = account ? (tradesMap[account.id] ?? []) : [];
  const trades = tradesInMonth(all, month);
  const ent = useEntitlement();
  // Compensação de prejuízo é recurso do Pro (plano vem do servidor).
  const compensar = can(ent, "compensacao_prejuizo");
  const mt = monthTax(all, month, account, jur, compensar);
  const tax = mt.dt;
  const stats = adv(trades, jur.sc);
  const pfStr = stats.pf >= 99 ? "+99" : stats.pf.toFixed(2);
  const dtT = trades.filter((t) => t.tipo !== "swing" && t.tipo !== "position");
  const swT = trades.filter((t) => t.tipo === "swing" || t.tipo === "position");
  const swTax = mt.sw;
  const consol = calcConsol(month, account, accounts, tradesMap);
  const taxLabel =
    jur.sc === "BR"
      ? tr("DARF DT", "DARF DT", "DARF DT")
      : jur.sc === "BR_INTL"
        ? tr("USD (anual)", "USD (annual)", "USD (anual)")
        : tr("Est. imposto", "Est. tax", "Est. impuesto");
  const taxValue =
    jur.sc === "BR"
      ? formatMoney(tax.darf, jur.sym)
      : jur.sc === "BR_INTL"
        ? formatMoney(tax.net, "$")
        : tax.td != null
          ? formatMoney(tax.td, jur.sym)
          : "—";
  const taxTone =
    (jur.sc === "BR" && (tax.darf ?? 0) > 0) || (jur.sc !== "BR" && (tax.td ?? 0) > 0)
      ? "warn"
      : "neutral";
  const due = account ? darfDueDate(account.year, month) : null;
  // Guia do mês: DT + swing, com a regra do mínimo de R$ 10 (saldo menor passa adiante).
  const darfTotal = mt.pagar;
  const [guide, setGuide] = useState(false);
  const casaMonth = casa ? computeCasa(casa).months[month] : null;

  let mom: string | undefined;
  if (month > 0) {
    const prev = calcDT(
      tradesInMonth(all, month - 1),
      carry(all, month - 1, "dt", account, jur, compensar),
      account,
      jur,
    );
    const d = tax.net - prev.net;
    mom = `vs ${monthShort(month - 1)}: ${d >= 0 ? "+" : ""}${formatMoney(d, jur.sym)}`;
  }

  function remove(t: Trade) {
    deleteTrade(t.id);
    toast.success(tr("Operação excluída", "Trade deleted", "Operación eliminada"), {
      action: { label: tr("Desfazer", "Undo", "Deshacer"), onClick: () => addTrade(t) },
    });
  }

  const lockedCountry = Boolean(account && !countryAllowed(ent, account.country));
  const lockedHistory = Boolean(account && !monthAllowed(ent, account.year, month));

  return (
    <div>
      {(lockedCountry || lockedHistory) && (
        <button
          type="button"
          onClick={() => requestPlans()}
          className="mb-3 w-full rounded-xl border border-border bg-card px-3 py-2 text-left text-xs leading-relaxed text-muted"
        >
          {lockedCountry
            ? tr(
                "Estimativa de outro país entra na Baleia. Os lançamentos continuam aqui.",
                "An estimate for another country is on Baleia. The entries stay here.",
                "La estimación de otro país entra en Baleia. Los registros siguen aquí.",
              )
            : tr(
                "Este mês passa dos 90 dias do Free. Os números continuam salvos.",
                "This month is past Free's 90 days. The numbers stay saved.",
                "Este mes pasa de los 90 días de Free. Los números siguen guardados.",
              )}
        </button>
      )}
      {jur.sc === "BR" && (mt.diferido > 0 || mt.diferidoAnterior > 0 || mt.prejuizoNaoCompensado > 0) && (
        <div className="mb-3 space-y-1 rounded-xl border border-border bg-card px-3 py-2 text-xs leading-relaxed text-muted">
          {mt.diferido > 0 && (
            <p>
              {tr(
                `DARF abaixo de R$ 10 não é paga: ${formatMoney(mt.diferido, jur.sym)} passa para o mês seguinte.`,
                `A DARF under R$ 10 is not paid: ${formatMoney(mt.diferido, jur.sym)} rolls to next month.`,
                `Un DARF menor a R$ 10 no se paga: ${formatMoney(mt.diferido, jur.sym)} pasa al mes siguiente.`,
              )}
            </p>
          )}
          {mt.diferido === 0 && mt.diferidoAnterior > 0 && (
            <p>
              {tr(
                `A guia inclui ${formatMoney(mt.diferidoAnterior, jur.sym)} de meses anteriores (abaixo de R$ 10).`,
                `This slip includes ${formatMoney(mt.diferidoAnterior, jur.sym)} carried from earlier months (under R$ 10).`,
                `La guía incluye ${formatMoney(mt.diferidoAnterior, jur.sym)} de meses anteriores (menos de R$ 10).`,
              )}
            </p>
          )}
          {mt.prejuizoNaoCompensado > 0 && (
            <button type="button" onClick={() => requestPlans()} className="text-left underline-offset-2 hover:underline">
              {tr(
                `Você tem ${formatMoney(mt.prejuizoNaoCompensado, jur.sym)} de prejuízo que pode abater este imposto. A compensação está no Pro.`,
                `You have ${formatMoney(mt.prejuizoNaoCompensado, jur.sym)} in losses that could offset this tax. Loss offset is on Pro.`,
                `Tienes ${formatMoney(mt.prejuizoNaoCompensado, jur.sym)} de pérdida que puede reducir este impuesto. La compensación está en Pro.`,
              )}
            </button>
          )}
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {monthName(month)} {account?.year}
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            {account?.name} · {account?.broker}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {jur.sc === "BR" && due && (
            <button
              type="button"
              onClick={() => setGuide(true)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-right hover:border-accent"
            >
              <div className="text-2xs font-semibold uppercase tracking-wider text-muted">
                DARF 6015
              </div>
              <div className="font-mono text-sm font-semibold tabular-nums">
                {formatMoney(darfTotal, jur.sym)}
              </div>
              <div className="text-2xs text-muted">{t("due", { date: formatDateBR(due) })}</div>
            </button>
          )}
          {jur.sc === "BR" && (
            <Button
              variant="secondary"
              size="sm"
              className="no-print"
              onClick={() => setGuide(true)}
            >
              <FileText className="size-3.5" />
              {t("guide")}
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="no-print hidden sm:inline-flex"
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
        </div>
      </div>

      {casaMonth && casaMonth.income > 0 && (
        <button
          type="button"
          onClick={() => setView("casa")}
          className="mb-3 flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-inset text-accent">
            <Home className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold">{t("casaThisMonth")}</span>
            <span className="block text-2xs text-muted">
              {t("incomeWord")} {formatMoney(casaMonth.income, "R$")} · {t("balanceWord")}{" "}
              <Pnl n={casaMonth.surplus}>{formatMoney(casaMonth.surplus, "R$")}</Pnl>
            </span>
          </span>
        </button>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <MetricCard label={t("ops")} value={trades.length} sub={t("thisMonth")} />
        <MetricCard
          label={t("winRate")}
          value={trades.length ? formatPct(stats.wr) : "—"}
          sub={`${stats.wins}W · ${stats.losses}L`}
          tone={stats.wr >= 0.5 ? "gain" : "loss"}
        />
        <MetricCard
          label={t("netPnl")}
          value={formatMoney(tax.net, jur.sym)}
          sub={mom ?? t("afterCosts")}
          tone={pnlTone(tax.net)}
        />
        <MetricCard label={taxLabel} value={taxValue} sub={jur.code} tone={taxTone} />
      </div>
      <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <MetricCard
          label={t("profitFactor")}
          value={trades.length ? pfStr : "—"}
          tone={stats.pf >= 1 ? "gain" : "loss"}
        />
        <MetricCard
          label={t("expectancy")}
          value={trades.length ? formatMoney(stats.exp, jur.sym) : "—"}
          tone={pnlTone(stats.exp)}
        />
        <MetricCard
          label={t("bestWorst")}
          value={
            trades.length ? (
              <span className="flex flex-col gap-0.5 text-sm leading-tight">
                <span className="text-gain">{formatMoney(stats.best, jur.sym)}</span>
                <span className="text-loss">{formatMoney(stats.worst, jur.sym)}</span>
              </span>
            ) : (
              "—"
            )
          }
        />
      </div>

      <TradeTable
        trades={dtT}
        tipo="dt"
        jur={jur}
        onAdd={() => onAdd("dt")}
        onEdit={onEdit}
        onDelete={remove}
      />
      <TaxCard
        tax={tax}
        month={month}
        jur={jur}
        conv={conv}
        setConv={setConv}
        accountId={account?.id}
        due={due}
      />
      {jur.sc === "BR" && (
        <>
          <TradeTable
            trades={swT}
            tipo="sw"
            jur={jur}
            onAdd={() => onAdd("sw")}
            onEdit={onEdit}
            onDelete={remove}
          />
          {swTax.count > 0 && <SwingTaxCard swTax={swTax} month={month} jur={jur} />}
        </>
      )}
      {consol && (
        <div className="mb-3 rounded-xl border border-border bg-inset p-4">
          <div className="mb-2 text-sm font-semibold">
            {tr(
              "DARF consolidado — mesma pessoa, várias corretoras",
              "Consolidated DARF (Brazilian monthly tax slip) — same person, multiple brokers",
              "DARF consolidado (guía mensual de impuestos de Brasil) — misma persona, varias corredoras",
            )}
          </div>
          <p className="mb-3 text-2xs text-muted">
            {tr("Contas", "Accounts", "Cuentas")}: {consol.accounts.join(", ")}
          </p>
          <Row
            label={tr(
              "Net DT consolidado",
              "Consolidated day trade net",
              "Neto consolidado de day trade",
            )}
            value={formatMoney(consol.totNet, jur.sym)}
            tone={pnlTone(consol.totNet)}
          />
          <Row
            label={tr("IRRF total", "Total IRRF", "IRRF total")}
            value={formatMoney(consol.totIRRF, jur.sym)}
            tone="gain"
          />
          <Row
            label={tr(
              "DARF DT consolidado",
              "Consolidated day trade DARF",
              "DARF consolidado de day trade",
            )}
            value={formatMoney(consol.darfDT, jur.sym)}
            tone="warn"
          />
          {consol.darfSW > 0 && (
            <Row
              label={tr(
                "DARF Swing consolidado",
                "Consolidated swing DARF",
                "DARF consolidado de swing",
              )}
              value={formatMoney(consol.darfSW, jur.sym)}
            />
          )}
          <div className="mt-2 flex items-center justify-between pt-2">
            <span className="text-sm font-semibold">
              {tr("DARF total (6015)", "Total DARF (6015)", "DARF total (6015)")}
            </span>
            <span className="font-mono text-lg font-semibold tabular-nums text-warn">
              {formatMoney(consol.totalDARF, jur.sym)}
            </span>
          </div>
        </div>
      )}
      <DarfGuide open={guide} onOpenChange={setGuide} month={month} />
    </div>
  );
}

function TradeTable({
  trades,
  tipo,
  jur,
  onAdd,
  onEdit,
  onDelete,
}: {
  trades: Trade[];
  tipo: "dt" | "sw";
  jur: Jurisdiction;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (t: Trade) => void;
}) {
  const isSW = tipo === "sw";
  const tr = useTr();
  const heads =
    jur.sc === "BR"
      ? isSW
        ? [
            tr("Data", "Date", "Fecha"),
            tr("Ativo", "Symbol", "Símbolo"),
            tr("Tipo", "Type", "Tipo"),
            tr("Ajuste", "P&L", "Ajuste"),
            tr("Tot. vendas", "Tot. sales", "Tot. ventas"),
            tr("Taxas", "Fees", "Tarifas"),
            tr("IRRF", "IRRF", "IRRF"),
            tr("Líquido", "Net", "Neto"),
            "",
          ]
        : [
            tr("Data", "Date", "Fecha"),
            tr("Ativo", "Symbol", "Símbolo"),
            tr("Tipo", "Type", "Tipo"),
            tr("Ajuste", "P&L", "Ajuste"),
            tr("Taxas", "Fees", "Tarifas"),
            tr("IRRF", "IRRF", "IRRF"),
            tr("Líquido", "Net", "Neto"),
            "",
          ]
      : jur.sc === "BR_INTL"
        ? [
            tr("Data", "Date", "Fecha"),
            tr("Ativo", "Symbol", "Símbolo"),
            tr("Dir", "Side", "Lado"),
            tr("Gross", "Gross", "Bruto"),
            tr("Comm", "Comm", "Com."),
            tr("Net", "Net", "Neto"),
            tr("PTAX", "PTAX", "PTAX"),
            tr("Net BRL", "Net BRL", "Neto BRL"),
            "",
          ]
        : [
            tr("Data", "Date", "Fecha"),
            tr("Ativo", "Symbol", "Símbolo"),
            tr("Class", "Class", "Clase"),
            tr("Dir", "Side", "Lado"),
            tr("Gross", "Gross", "Bruto"),
            tr("Comm", "Comm", "Com."),
            tr("Net", "Net", "Neto"),
            tr("Session", "Session", "Sesión"),
            tr("Exit", "Exit", "Salida"),
            "",
          ];

  return (
    <Section
      title={
        isSW
          ? tr("Swing / Position", "Swing / Position", "Swing / Position")
          : tr("Day Trade", "Day Trade", "Day Trade")
      }
      tag={
        <Badge tone={isSW ? "muted" : "accent"}>
          {trades.length} {tr("ops", "trades", "operaciones")}
        </Badge>
      }
      action={
        <Button size="sm" onClick={onAdd}>
          <Plus className="size-3.5" />
          {tr("Adicionar", "Add", "Agregar")}
        </Button>
      }
    >
      {trades.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-7" />}
          title={tr(
            "Nenhuma operação — clique em Adicionar",
            "No trades — click Add",
            "Ninguna operación — haz clic en Agregar",
          )}
          action={
            <Button size="sm" onClick={onAdd}>
              {tr("Adicionar operação", "Add trade", "Agregar operación")}
            </Button>
          }
        />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {trades.map((t) => (
              <TradeCard
                key={t.id}
                t={t}
                jur={jur}
                isSW={isSW}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-border text-2xs font-semibold uppercase tracking-wider text-muted">
                  {heads.map((h) => (
                    <th key={h || "act"} className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <TradeRow
                    key={t.id}
                    t={t}
                    jur={jur}
                    isSW={isSW}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
}

function TradeCard({
  t,
  jur,
  isSW,
  onEdit,
  onDelete,
}: {
  t: Trade;
  jur: Jurisdiction;
  isSW: boolean;
  onEdit: (id: string) => void;
  onDelete: (t: Trade) => void;
}) {
  const net = jur.sc === "BR" ? num(t.ajuste) - num(t.taxas) : num(t.gross) - num(t.comm);
  const tr = useTr();
  const tipo = t.tipo === "position" ? "Position" : t.tipo === "swing" ? "Swing" : t.dir || "DT";
  const sym = jur.sc === "BR_INTL" ? "$" : jur.sym;
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onEdit(t.id)}>
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{t.asset || "—"}</span>
            <Badge tone={isSW ? "muted" : "accent"}>{tipo}</Badge>
          </div>
          <div className="mt-0.5 text-2xs text-muted">{formatDate(t.date)}</div>
        </button>
        <Pnl n={net}>
          <span className="font-mono text-sm font-semibold tabular-nums">
            {formatMoney(net, sym)}
          </span>
        </Pnl>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-x-3 text-2xs text-muted">
          {jur.sc === "BR" ? (
            <>
              <span>
                {tr("Ajuste", "P&L", "Ajuste")} {formatMoney(t.ajuste, jur.sym)}
              </span>
              <span>
                {tr("Taxas", "Fees", "Tarifas")} {formatMoney(t.taxas, jur.sym)}
              </span>
              <span>
                {tr("IRRF", "IRRF", "IRRF")} {formatMoney(t.irrf, jur.sym)}
              </span>
            </>
          ) : (
            <>
              <span>
                {tr("Gross", "Gross", "Bruto")} {formatMoney(t.gross, sym)}
              </span>
              <span>
                {tr("Comm", "Comm", "Com.")} {formatMoney(t.comm, sym)}
              </span>
            </>
          )}
        </div>
        <div className="flex shrink-0">
          <button
            type="button"
            className="flex size-10 items-center justify-center text-muted hover:text-fg"
            onClick={() => onEdit(t.id)}
            aria-label={tr("Editar", "Edit", "Editar")}
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            className="flex size-10 items-center justify-center text-muted hover:text-loss"
            onClick={() => onDelete(t)}
            aria-label={tr("Excluir", "Delete", "Eliminar")}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TradeRow({
  t,
  jur,
  isSW,
  onEdit,
  onDelete,
}: {
  t: Trade;
  jur: Jurisdiction;
  isSW: boolean;
  onEdit: (id: string) => void;
  onDelete: (t: Trade) => void;
}) {
  const tr = useTr();
  const actions = (
    <td className="px-3 py-2">
      <button
        type="button"
        className="mr-1 min-h-11 min-w-11 p-1 text-muted hover:text-fg"
        onClick={() => onEdit(t.id)}
        aria-label={tr("Editar", "Edit", "Editar")}
      >
        <Pencil className="size-3.5" />
      </button>
      <button
        type="button"
        className="min-h-11 min-w-11 p-1 text-muted hover:text-loss"
        onClick={() => onDelete(t)}
        aria-label={tr("Excluir", "Delete", "Eliminar")}
      >
        <Trash2 className="size-3.5" />
      </button>
    </td>
  );
  if (jur.sc === "BR") {
    const n = num(t.ajuste) - num(t.taxas);
    return (
      <tr className="border-b border-border last:border-0">
        <td className="px-3 py-2">{formatDate(t.date)}</td>
        <td className="px-3 py-2 font-semibold">{t.asset || "—"}</td>
        <td className="px-3 py-2">
          <Badge tone={isSW ? "muted" : "accent"}>
            {t.tipo === "position" ? "Position" : t.tipo === "swing" ? "Swing" : "DT"}
          </Badge>
        </td>
        <td className="px-3 py-2">
          <Pnl n={num(t.ajuste)}>{formatMoney(t.ajuste, jur.sym)}</Pnl>
        </td>
        {isSW && (
          <td className="px-3 py-2 font-mono tabular-nums">
            {formatMoney(t.totalVendas || 0, jur.sym)}
          </td>
        )}
        <td className="px-3 py-2 font-mono tabular-nums">{formatMoney(t.taxas, jur.sym)}</td>
        <td className="px-3 py-2 font-mono tabular-nums">{formatMoney(t.irrf, jur.sym)}</td>
        <td className="px-3 py-2">
          <Pnl n={n}>{formatMoney(n, jur.sym)}</Pnl>
        </td>
        {actions}
      </tr>
    );
  }
  if (jur.sc === "BR_INTL") {
    const n = num(t.gross) - num(t.comm);
    const ptax = num(t.ptax);
    const nbrl = ptax ? n * ptax : null;
    return (
      <tr className="border-b border-border last:border-0">
        <td className="px-3 py-2">{formatDate(t.date)}</td>
        <td className="px-3 py-2 font-semibold">{t.asset || "—"}</td>
        <td className="px-3 py-2">
          <Badge tone={t.dir === "Buy" ? "gain" : "loss"}>{t.dir || "—"}</Badge>
        </td>
        <td className="px-3 py-2">
          <Pnl n={num(t.gross)}>{formatMoney(t.gross, "$")}</Pnl>
        </td>
        <td className="px-3 py-2 font-mono tabular-nums">{formatMoney(t.comm, "$")}</td>
        <td className="px-3 py-2">
          <Pnl n={n}>{formatMoney(n, "$")}</Pnl>
        </td>
        <td className="px-3 py-2 font-mono tabular-nums">{ptax ? ptax.toFixed(4) : "—"}</td>
        <td className="px-3 py-2">
          {nbrl != null ? <Pnl n={nbrl}>{formatMoney(nbrl, "R$")}</Pnl> : "—"}
        </td>
        {actions}
      </tr>
    );
  }
  const n = num(t.gross) - num(t.comm);
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-2">{formatDate(t.date)}</td>
      <td className="px-3 py-2 font-semibold">{t.asset || "—"}</td>
      <td className="px-3 py-2">
        <Badge tone="accent">{t.cls || "—"}</Badge>
      </td>
      <td className="px-3 py-2">
        <Badge tone={t.dir === "Buy" ? "gain" : "loss"}>{t.dir || "—"}</Badge>
      </td>
      <td className="px-3 py-2">
        <Pnl n={num(t.gross)}>{formatMoney(t.gross, jur.sym)}</Pnl>
      </td>
      <td className="px-3 py-2 font-mono tabular-nums">{formatMoney(t.comm, jur.sym)}</td>
      <td className="px-3 py-2">
        <Pnl n={n}>{formatMoney(n, jur.sym)}</Pnl>
      </td>
      <td className="px-3 py-2">
        <Badge>{t.sess || "—"}</Badge>
      </td>
      <td className="px-3 py-2">
        <Badge tone="warn">{t.exit || "—"}</Badge>
      </td>
      {actions}
    </tr>
  );
}

function TaxCard({
  tax,
  month,
  jur,
  conv,
  setConv,
  accountId,
  due,
}: {
  tax: ReturnType<typeof calcDT>;
  month: number;
  jur: Jurisdiction;
  conv: Record<string, number>;
  setConv: (k: string, v: number) => void;
  accountId?: string;
  due: Date | null;
}) {
  const tr = useTr();
  const { monthName } = useI18n();
  if (jur.sc === "BR") {
    const irPct = tax.td && tax.base ? ((tax.td / tax.base) * 100).toFixed(0) : 20;
    return (
      <section className="mb-3 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">
            {tr(
              "Day Trade — DARF",
              "Day trade — DARF (Brazilian monthly tax slip)",
              "Day trade — DARF (guía mensual de impuestos de Brasil)",
            )}
          </span>
          <span className="text-2xs text-muted">
            {jur.code}
            {due ? ` · ${tr("vence", "due", "vence")} ${formatDateBR(due)}` : ""}
          </span>
        </div>
        <div className="px-4 py-3">
          <Row
            label={tr("Resultado bruto DT", "Gross day trade P&L", "P&L bruto de day trade")}
            value={formatMoney(tax.gross, jur.sym)}
            tone={pnlTone(tax.gross)}
          />
          <Row
            label={tr("(−) Taxas", "(−) Fees", "(−) Tarifas")}
            value={formatMoney(tax.fees, jur.sym)}
          />
          <Row
            label={tr("Resultado líquido", "Net P&L", "Resultado neto")}
            value={formatMoney(tax.net, jur.sym)}
            tone={pnlTone(tax.net)}
          />
          <Row
            label={tr("(−) Prejuízo acumulado", "(−) Accumulated loss", "(−) Pérdida acumulada")}
            value={formatMoney(tax.prevC, jur.sym)}
            tone="loss"
          />
          <Row
            label={tr("Base de cálculo", "Tax base", "Base imponible")}
            value={formatMoney(tax.base, jur.sym)}
          />
          <Row
            label={tr(`IR (×${irPct}%)`, `Tax (×${irPct}%)`, `IR (×${irPct}%)`)}
            value={formatMoney(tax.td, jur.sym)}
          />
          <Row
            label={tr("(−) IRRF", "(−) IRRF (tax withheld)", "(−) IRRF (impuesto retenido)")}
            value={formatMoney(tax.irrf, jur.sym)}
            tone="gain"
          />
          <div className="mt-3 flex items-center justify-between rounded-lg border border-accent/30 bg-accent/10 px-4 py-3">
            <span className="text-2xs font-semibold uppercase tracking-wider text-accent">
              {tr("DARF 6015 a recolher", "DARF 6015 due", "DARF 6015 a pagar")}
            </span>
            <span className="font-mono text-xl font-semibold tabular-nums">
              {formatMoney(tax.darf, jur.sym)}
            </span>
          </div>
          {tax.nc > 0 && (
            <p className="mt-2 text-2xs text-loss">
              {tr(
                "Prejuízo DT a carregar",
                "Day trade loss to carry forward",
                "Pérdida de day trade a compensar",
              )}
              : {formatMoney(tax.nc, jur.sym)} →{" "}
              {monthName(month + 1) || tr("próximo ano", "next year", "próximo año")}
            </p>
          )}
        </div>
      </section>
    );
  }
  if (jur.sc === "BR_INTL") {
    return (
      <section className="mb-3 overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">
          {tr(
            "Forex internacional — apuração anual",
            "International forex — annual tax calculation",
            "Forex internacional — cálculo anual de impuestos",
          )}
        </div>
        <div className="px-4 py-3">
          <p className="mb-3 rounded-lg border border-warn/25 bg-warn/10 px-3 py-2 text-2xs leading-relaxed text-warn">
            {jur.note}
          </p>
          <Row
            label={tr("Net este mês (USD)", "Net this month (USD)", "Neto este mes (USD)")}
            value={formatMoney(tax.net, "$")}
            tone={pnlTone(tax.net)}
          />
          <p className="mt-2 text-2xs text-muted">
            {tr(
              "O imposto é calculado anualmente. Veja a aba Anual para Carnê-Leão e DIRPF.",
              "Tax is calculated annually. See the Annual tab for Carnê-Leão (monthly tax booklet) and DIRPF (Brazilian annual tax return).",
              "El impuesto se calcula anualmente. Ve la pestaña Anual para Carnê-Leão (libreta mensual de impuestos) y DIRPF (declaración anual de Brasil).",
            )}
          </p>
        </div>
      </section>
    );
  }
  const key = `${accountId}_${month}`;
  const rate = conv[key] || 0;
  const bl = rate && tax.base ? tax.base * rate : null;
  const tl = bl != null && jur.rate != null ? bl * jur.rate : null;
  const rNote =
    jur.rate != null
      ? `${(jur.rate * 100).toFixed(1)}%`
      : tr("Varia — veja a faixa", "Varies — see bracket", "Varía — ve el tramo");
  return (
    <section className="mb-3 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-semibold">
          {tr("Resumo fiscal", "Tax summary", "Resumen fiscal")} — {monthName(month)}
        </span>
        <span className="text-2xs text-muted">{jur.code}</span>
      </div>
      <div className="px-4 py-3">
        {jur.taxMode === "quarterly_annual" && (
          <p className="mb-3 rounded-lg border border-warn/25 bg-warn/10 px-3 py-2 text-2xs leading-relaxed text-warn">
            {tr(
              "EUA: estimativas trimestrais em Apr/Jun/Sep/Jan. Sem retenção. Veja Anual para Q1–Q4.",
              "US: quarterly estimates in Apr/Jun/Sep/Jan. No withholding. See Annual for Q1–Q4.",
              "EE. UU.: estimaciones trimestrales en abr/jun/sep/ene. Sin retención. Ve Anual para Q1–Q4.",
            )}
          </p>
        )}
        <Row
          label={tr("Gross P&L", "Gross P&L", "P&L bruto")}
          value={formatMoney(tax.gross, jur.sym)}
          tone={pnlTone(tax.gross)}
        />
        <Row
          label={tr("(−) Comissões", "(−) Commissions", "(−) Comisiones")}
          value={formatMoney(tax.comm, jur.sym)}
        />
        <Row
          label={tr("Net P&L", "Net P&L", "P&L neto")}
          value={formatMoney(tax.net, jur.sym)}
          tone={pnlTone(tax.net)}
        />
        <Row
          label={tr("(−) Prejuízo acumulado", "(−) Accumulated loss", "(−) Pérdida acumulada")}
          value={formatMoney(tax.prevC, jur.sym)}
          tone="loss"
        />
        <Row
          label={tr("Base tributável", "Taxable base", "Base imponible")}
          value={formatMoney(tax.base, jur.sym)}
        />
        {jur.taxMode !== "quarterly_annual" && (
          <>
            <div className="my-3">
              <FieldLabel>
                {tr(
                  "Câmbio na data do pagamento",
                  "FX rate on the payment date",
                  "Tipo de cambio en la fecha de pago",
                )}
              </FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="w-36"
                  placeholder={tr("ex: 5.75", "e.g. 5.75", "ej.: 5.75")}
                  defaultValue={rate || ""}
                  step="0.0001"
                  min={0}
                  onBlur={(e) => setConv(key, parseFloat(e.target.value) || 0)}
                />
                <span className="text-2xs text-muted">
                  {jur.sym} {tr("por unidade", "per unit", "por unidad")}
                </span>
              </div>
            </div>
            <Row
              label={tr("Base (local)", "Base (local)", "Base (local)")}
              value={bl != null ? formatMoney(bl, jur.sym) : "—"}
            />
            <div className="mt-3 flex items-center justify-between rounded-lg border border-accent/30 bg-accent/10 px-4 py-3">
              <span className="text-2xs font-semibold uppercase tracking-wider text-accent">
                {tr("Imposto devido", "Tax due", "Impuesto a pagar")} · {rNote}
              </span>
              <span className="font-mono text-lg font-semibold tabular-nums">
                {tl != null
                  ? formatMoney(tl, jur.sym)
                  : jur.rate != null
                    ? tr("Informe o câmbio", "Enter the FX rate", "Ingresa el tipo de cambio")
                    : tr("Ver faixa", "See bracket", "Ver tramo")}
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function SwingTaxCard({
  swTax,
  month,
  jur,
}: {
  swTax: SwingResult;
  month: number;
  jur: Jurisdiction;
}) {
  const tr = useTr();
  const { monthName } = useI18n();
  return (
    <section className="mb-3 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-semibold">
          {tr("Swing / Position — 15%", "Swing / Position — 15%", "Swing / Position — 15%")}
        </span>
        <span className="text-2xs text-muted">DARF 6015</span>
      </div>
      <div className="px-4 py-3">
        <Row
          label={tr("Total de vendas", "Total sales", "Total de ventas")}
          value={formatMoney(swTax.totalVendas, jur.sym)}
        />
        {swTax.exempt && swTax.darf === 0 ? (
          <div className="mt-2 rounded-lg border border-gain/30 bg-gain/10 px-3 py-2 text-xs font-medium text-gain">
            {tr(
              "Isento — vendas ≤ R$20.000. Nenhum imposto devido.",
              "Exempt — sales ≤ R$20,000. No tax due.",
              "Exento — ventas ≤ R$20.000. Ningún impuesto a pagar.",
            )}
          </div>
        ) : (
          <>
            <Row
              label={tr("Resultado líquido swing", "Swing net P&L", "P&L neto de swing")}
              value={formatMoney(swTax.net, jur.sym)}
              tone={pnlTone(swTax.net)}
            />
            <Row
              label={tr(
                "(−) Prejuízo swing acumulado",
                "(−) Accumulated swing loss",
                "(−) Pérdida acumulada de swing",
              )}
              value={formatMoney(swTax.prevC, jur.sym)}
              tone="loss"
            />
            <Row
              label={tr("Base de cálculo", "Tax base", "Base imponible")}
              value={formatMoney(swTax.base, jur.sym)}
            />
            <Row
              label={tr("IR (×15%)", "Tax (×15%)", "IR (×15%)")}
              value={formatMoney(swTax.td, jur.sym)}
            />
            <Row
              label={tr("(−) IRRF", "(−) IRRF", "(−) IRRF")}
              value={formatMoney(swTax.irrf, jur.sym)}
              tone="gain"
            />
            <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-inset px-4 py-3">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted">
                {tr("DARF 6015 swing", "Swing DARF 6015", "DARF 6015 swing")}
              </span>
              <span className="font-mono text-xl font-semibold tabular-nums">
                {formatMoney(swTax.darf, jur.sym)}
              </span>
            </div>
          </>
        )}
        {swTax.nc > 0 && !swTax.exempt && (
          <p className="mt-2 text-2xs text-loss">
            {tr(
              "Prejuízo swing a carregar",
              "Swing loss to carry forward",
              "Pérdida de swing a compensar",
            )}
            : {formatMoney(swTax.nc, jur.sym)} →{" "}
            {monthName(month + 1) || tr("próximo ano", "next year", "próximo año")}
          </p>
        )}
      </div>
    </section>
  );
}
