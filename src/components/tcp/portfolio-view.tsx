import { useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, TrendingUp, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n, useTr } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatMoney, pnlTone } from "@/lib/tcp/format";
import { fetchQuotes } from "@/lib/tcp/quotes";
import { useTcpStore } from "@/lib/tcp/store";
import type { Position } from "@/lib/tcp/types";
import { EmptyState, MetricCard, Pnl, Section } from "./metric-card";
import { can, useEntitlement } from "@/lib/tcp/entitlement";
import { UpgradeWall } from "./plan-gate";

const PIE = [
  "var(--tcp-accent)",
  "var(--tcp-gain)",
  "var(--tcp-warn)",
  "var(--tcp-muted)",
  "var(--tcp-loss)",
];

export function PortfolioView({
  onAdd,
  onEdit,
}: {
  onAdd: () => void;
  onEdit: (p: Position) => void;
}) {
  const portfolio = useTcpStore((s) => s.portfolio);
  const setQuotes = useTcpStore((s) => s.setQuotes);
  const deletePosition = useTcpStore((s) => s.deletePosition);
  const tr = useTr();
  const ent = useEntitlement();
  const { locale } = useI18n();
  const timeTag = locale === "en" ? "en-US" : locale === "es" ? "es-AR" : "pt-BR";
  const [loading, setLoading] = useState(false);
  const pos = portfolio.positions;
  const prices = portfolio.prices;
  const divs = portfolio.dividends;

  async function refresh() {
    if (!pos.length || loading) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    setLoading(true);
    try {
      const tks = [...new Set(pos.map((p) => p.ticker).concat(["BOVA11"]))];
      const res = await fetchQuotes({ data: { tickers: tks } });
      setQuotes(res.prices, res.dividends);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const stale = !portfolio.lastFetch || Date.now() - portfolio.lastFetch > 300000;
    if (stale && pos.length) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!can(ent, "investimentos")) {
    return (
      <UpgradeWall
        title={tr("Investimentos ficam na Baleia", "Investments are on Baleia", "Las inversiones quedan en Baleia")}
        body={tr(
          "Posição, custo e resultado realizado ou não realizado entram na Baleia. A apuração de day e swing continua no Free. Nada é apagado.",
          "Position, cost and realized or unrealized result are on Baleia. Day and swing tax stays on Free. Nothing is deleted.",
          "Posición, costo y resultado realizado o no realizado entran en Baleia. La liquidación de day y swing sigue en Free. Nada se borra.",
        )}
      />
    );
  }

  let tInv = 0;
  let tNow = 0;
  const rows = pos.map((p) => {
    const pr = prices[p.ticker];
    const inv = p.shares * p.avgPrice;
    const now = pr ? p.shares * pr.price : inv;
    tInv += inv;
    tNow += now;
    const pl = now - inv;
    const plp = inv > 0 ? (pl / inv) * 100 : 0;
    return { p, pr, inv, now, pl, plp };
  });
  const tPL = tNow - tInv;
  const tPLp = tInv > 0 ? (tPL / tInv) * 100 : 0;
  const ibov = prices["BOVA11"];

  const allDivs: { ticker: string; isJCP: boolean; rate: number; pay: string; total: number }[] = [];
  for (const tk of Object.keys(divs)) {
    const pos2 = pos.find((p) => p.ticker === tk);
    const shs = pos2 ? pos2.shares : 0;
    for (const d of (divs[tk] || []).slice(0, 6)) {
      const type = `${d.type ?? ""} ${d.label ?? ""}`.toUpperCase();
      const isJCP = type.includes("JCP") || type.includes("JRS") || type.includes("JSCP") || type.includes("CAPITAL");
      allDivs.push({ ticker: tk, isJCP, rate: d.rate || 0, pay: d.paymentDate || "", total: shs * (d.rate || 0) });
    }
  }
  allDivs.sort((a, b) => (a.pay || "").localeCompare(b.pay || ""));
  const today = new Date().toISOString().slice(0, 10);
  const futDivs = allDivs.filter((d) => d.pay >= today).slice(0, 10);

  const chartTickers = pos.map((p) => p.ticker);
  const chartAlloc = pos.map((p) => {
    const pr = prices[p.ticker];
    return { name: p.ticker, value: pr ? p.shares * pr.price : p.shares * p.avgPrice };
  });
  const chartPL = pos.map((p) => {
    const pr = prices[p.ticker];
    return { name: p.ticker, v: pr ? p.shares * (pr.price - p.avgPrice) : 0 };
  });

  return (
    <div>
      <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <MetricCard label={tr("Total investido", "Total invested", "Total invertido")} value={formatMoney(tInv, "R$")} />
        <MetricCard
          label={tr("Valor atual", "Current value", "Valor actual")}
          value={formatMoney(tNow, "R$")}
          tone={pnlTone(tPL)}
          sub={ibov ? `vs BOVA11: ${ibov.pct >= 0 ? "+" : ""}${ibov.pct.toFixed(2)}% ${tr("hoje", "today", "hoy")}` : undefined}
        />
        <MetricCard
          label={tr("P&L total", "Unrealized P&L", "P&L no realizado")}
          value={`${tPL >= 0 ? "+" : ""}${formatMoney(tPL, "R$")}`}
          tone={pnlTone(tPL)}
          sub={`${tPLp >= 0 ? "+" : ""}${tPLp.toFixed(2)}%`}
        />
      </div>
      {pos.length >= 2 && (
        <div className="mb-3 grid gap-3 md:grid-cols-2">
          <Section title={tr("Alocação da carteira", "Portfolio allocation", "Asignación de la cartera")}>
            <div className="h-48 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartAlloc} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2}>
                    {chartAlloc.map((_, i) => (
                      <Cell key={chartTickers[i]} fill={PIE[i % PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--tcp-surface)",
                      border: "1px solid var(--tcp-border-strong)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Section>
          <Section title={tr("P&L por ativo", "Unrealized P&L by asset", "P&L no realizado por activo")}>
            <div className="h-48 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartPL}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--tcp-border)" />
                  <XAxis dataKey="name" tick={{ fill: "var(--tcp-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--tcp-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--tcp-surface)",
                      border: "1px solid var(--tcp-border-strong)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                    {chartPL.map((d) => (
                      <Cell key={d.name} fill={d.v >= 0 ? "var(--tcp-gain)" : "var(--tcp-loss)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>
      )}
      <Section
        title={tr("Posições", "Positions", "Posiciones")}
        tag={
          <span className="text-2xs text-muted">
            {portfolio.lastFetch
              ? `${tr("Atualizado:", "Updated:", "Actualizado:")} ${new Date(portfolio.lastFetch).toLocaleTimeString(timeTag)}`
              : tr("Não atualizado", "Not updated", "Sin actualizar")}
          </span>
        }
        action={
          <div className="flex gap-1.5">
            <Button size="sm" onClick={onAdd}>
              <Plus className="size-3.5" />
              {tr("Posição", "Position", "Posición")}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              {tr("Atualizar", "Refresh", "Actualizar")}
            </Button>
          </div>
        }
      >
        {!pos.length ? (
          <EmptyState
            icon={<TrendingUp className="size-7" />}
            title={tr("Adicione suas posições para rastrear em tempo real.", "Add your positions to track them in real time.", "Agrega tus posiciones para seguirlas en tiempo real.")}
            action={
              <Button onClick={onAdd}>
                <Plus className="size-4" />
                {tr("Adicionar posição", "Add position", "Agregar posición")}
              </Button>
            }
          />
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {rows.map(({ p, pr, now, pl, plp }) => (
                <div key={p.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onEdit(p)}>
                      <div className="text-sm font-semibold">{p.ticker}</div>
                      <div className="text-2xs text-muted">
                        {p.shares} × {pr ? `R$${pr.price.toFixed(2)}` : `R$${Number(p.avgPrice).toFixed(2)}`}
                        {pr?.name ? ` · ${pr.name}` : ""}
                      </div>
                    </button>
                    {pr ? (
                      <Pnl n={pl}>
                        <span className="font-mono text-sm font-semibold tabular-nums">
                          {pl >= 0 ? "+" : ""}
                          {formatMoney(pl, "R$")}
                        </span>
                      </Pnl>
                    ) : (
                      <span className="text-2xs text-muted">—</span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-x-3 text-2xs text-muted">
                      <span>{tr("Valor", "Value", "Valor")} {pr ? formatMoney(now, "R$") : "—"}</span>
                      <span className={pr ? (pr.pct >= 0 ? "text-gain" : "text-loss") : ""}>
                        {pr ? `${pr.pct >= 0 ? "+" : ""}${pr.pct.toFixed(2)}% ${tr("hoje", "today", "hoy")}` : tr("Sem cotação", "No quote", "Sin cotización")}
                      </span>
                      {pr ? <span>{plp >= 0 ? "+" : ""}{plp.toFixed(1)}%</span> : null}
                    </div>
                    <div className="flex shrink-0">
                      <button type="button" className="flex size-10 items-center justify-center text-muted hover:text-fg" onClick={() => onEdit(p)} aria-label={tr("Editar", "Edit", "Editar")}>
                        <Pencil className="size-3.5" />
                      </button>
                      <button type="button" className="flex size-10 items-center justify-center text-muted hover:text-loss" onClick={() => deletePosition(p.id)} aria-label={tr("Remover", "Remove", "Quitar")}>
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b border-border text-2xs uppercase tracking-wider text-muted">
                  {[
                    "Ticker",
                    tr("Qtd", "Shares", "Acciones"),
                    tr("P. médio", "Average price", "Precio promedio"),
                    tr("Preço atual", "Current price", "Precio actual"),
                    tr("Valor", "Value", "Valor"),
                    "P&L",
                    tr("Dia", "Day", "Día"),
                    "",
                  ].map((h) => (
                    <th key={h || "x"} className="px-3 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ p, pr, now, pl, plp }) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <div className="font-semibold">{p.ticker}</div>
                      <div className="text-2xs text-muted">{pr?.name}</div>
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums">{p.shares}</td>
                    <td className="px-3 py-2 font-mono tabular-nums">R${Number(p.avgPrice).toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono tabular-nums">{pr ? `R$${pr.price.toFixed(2)}` : "—"}</td>
                    <td className="px-3 py-2 font-mono font-semibold tabular-nums">{pr ? formatMoney(now, "R$") : "—"}</td>
                    <td className="px-3 py-2">
                      {pr ? (
                        <Pnl n={pl}>
                          {pl >= 0 ? "+" : ""}
                          {formatMoney(pl, "R$")} ({plp >= 0 ? "+" : ""}
                          {plp.toFixed(1)}%)
                        </Pnl>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={`px-3 py-2 font-mono tabular-nums ${pr ? (pr.pct >= 0 ? "text-gain" : "text-loss") : "text-muted"}`}>
                      {pr ? `${pr.pct >= 0 ? "+" : ""}${pr.pct.toFixed(2)}%` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <button type="button" className="mr-1 min-h-11 min-w-11 p-1 text-muted hover:text-fg" onClick={() => onEdit(p)} aria-label={tr("Editar", "Edit", "Editar")}>
                        <Pencil className="size-3.5" />
                      </button>
                      <button type="button" className="min-h-11 min-w-11 p-1 text-muted hover:text-loss" onClick={() => deletePosition(p.id)} aria-label={tr("Remover", "Remove", "Quitar")}>
                        <X className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </Section>
      <Section title={tr("Calendário de dividendos e JCP", "Dividend and JCP calendar", "Calendario de dividendos y JCP")}>
        {futDivs.length ? (
          <>
            <div className="space-y-2 p-3 md:hidden">
              {futDivs.map((d, i) => (
                <div key={`${d.ticker}-${d.pay}-${i}`} className="rounded-lg border border-border bg-inset px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{d.ticker}</span>
                        <Badge tone={d.isJCP ? "warn" : "gain"}>{d.isJCP ? "JCP" : "DIV"}</Badge>
                      </div>
                      <div className="mt-0.5 text-2xs text-muted">{formatDate(d.pay)} · R${Number(d.rate).toFixed(4)}/{tr("ação", "share", "acción")}</div>
                    </div>
                    <Pnl n={d.total}>
                      <span className="font-mono text-sm font-semibold tabular-nums">{formatMoney(d.total, "R$")}</span>
                    </Pnl>
                  </div>
                  <p className="mt-1 text-2xs text-muted">{d.isJCP ? tr("IR 15% retido (IRRF)", "15% withheld (IRRF)", "15% retenido (IRRF)") : tr("Isento IR — ações BR", "Income tax exempt — Brazilian shares", "Exento de IR — acciones BR")}</p>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-2xs uppercase tracking-wider text-muted">
                    {[
                      tr("Ativo", "Asset", "Activo"),
                      tr("Tipo", "Type", "Tipo"),
                      tr("Pagamento", "Payment", "Pago"),
                      tr("R$/ação", "R$/share", "R$/acción"),
                      tr("Total estimado", "Estimated total", "Total estimado"),
                      tr("Tributação", "Tax", "Tributación"),
                    ].map((h) => (
                      <th key={h} className="px-3 py-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {futDivs.map((d, i) => (
                    <tr key={`${d.ticker}-${d.pay}-${i}`} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-semibold">{d.ticker}</td>
                      <td className="px-3 py-2">
                        <Badge tone={d.isJCP ? "warn" : "gain"}>{d.isJCP ? "JCP" : "DIV"}</Badge>
                      </td>
                      <td className="px-3 py-2">{formatDate(d.pay)}</td>
                      <td className="px-3 py-2 font-mono tabular-nums">R${Number(d.rate).toFixed(4)}</td>
                      <td className="px-3 py-2">
                        <Pnl n={d.total}>{formatMoney(d.total, "R$")}</Pnl>
                      </td>
                      <td className="px-3 py-2 text-2xs text-muted">
                        {d.isJCP ? tr("IR 15% retido (IRRF)", "15% withheld (IRRF)", "15% retenido (IRRF)") : tr("Isento IR — ações BR", "Income tax exempt — Brazilian shares", "Exento de IR — acciones BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState
            icon={<TrendingUp className="size-6" />}
            title={tr(
              "Nenhum dividendo próximo. Clique em Atualizar para buscar dados da B3.",
              "No upcoming dividend. Click Refresh to fetch B3 data.",
              "Ningún dividendo próximo. Haz clic en Actualizar para buscar datos de la B3.",
            )}
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-2xs text-faint">
          <span>
            {tr(
              "Dados via Brapi (B3). JCP: IR 15% na fonte. Dividendos BR: isentos (Lei 9.249/95). Não constitui recomendação.",
              "Data via Brapi (B3). JCP (interest on equity): 15% withheld at source. Brazilian dividends: exempt (Law 9.249/95). Not a recommendation.",
              "Datos vía Brapi (B3). JCP (intereses sobre capital): IR 15% en la fuente. Dividendos BR: exentos (Ley 9.249/95). No es una recomendación.",
            )}
          </span>
          <div className="flex gap-3">
            <a className="font-semibold text-accent no-underline" href="https://www.b3.com.br/" target="_blank" rel="noreferrer">
              {tr("Cotações B3", "B3 quotes", "Cotizaciones B3")}
            </a>
            <a className="font-semibold text-accent no-underline" href="https://dados.cvm.gov.br/" target="_blank" rel="noreferrer">
              {tr("Dados CVM", "CVM data", "Datos CVM")}
            </a>
          </div>
        </div>
      </Section>
    </div>
  );
}
