import { useMemo, useState } from "react";
import { computeCasa, emptyCasa } from "@/lib/casa/engine";
import { monthMovements } from "@/lib/casa/movements";
import { formatMoney, MONTHS, tradeValue } from "@/lib/tcp/format";
import { jurisdiction } from "@/lib/tcp/jurisdictions";
import { tradesInMonth } from "@/lib/tcp/tax";
import { useActiveAccount, useTcpStore } from "@/lib/tcp/store";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function MovementsView() {
  const casa = useTcpStore((s) => s.casa) ?? emptyCasa();
  const account = useActiveAccount();
  const trades = useTcpStore((s) => (account ? (s.trades[account.id] ?? []) : []));
  const [month, setMonth] = useState(() => {
    for (let m = 11; m >= 0; m--) {
      if (monthMovements(casa, m).length) return m;
    }
    return new Date().getMonth();
  });
  const { t, monthName, monthShort, locale } = useI18n();
  const jur = jurisdiction(account?.country);
  const sym = jur.sym || "R$ ";

  const rows = useMemo(() => monthMovements(casa, month), [casa, month, locale]);
  const snap = useMemo(() => computeCasa(casa).months[month], [casa, month]);
  const ops = useMemo(() => (account ? tradesInMonth(trades, month) : []), [account, trades, month]);

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">{t("movesTitle")}</h1>
      <p className="mt-1 text-sm text-muted">{t("movesBody", { month: monthName(month).toLowerCase() })}</p>
      <div className="no-print tabs-scroll mt-3 flex gap-1 overflow-x-auto">
        {MONTHS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setMonth(i)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
              i === month ? "bg-accent text-accent-fg" : "bg-card text-muted",
            )}
          >
            {monthShort(i)}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Tile label={t("inLabel")} value={formatMoney(snap.income, sym)} tone="gain" />
        <Tile label={t("outLabel")} value={formatMoney(snap.expenses, sym)} tone="loss" />
        <Tile label={t("leftLabel")} value={formatMoney(snap.surplus, sym)} tone={snap.surplus >= 0 ? "gain" : "loss"} />
      </div>
      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {rows.length === 0 && ops.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted">{t("emptyMoves")}</li>
        )}
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span className="min-w-0 text-sm">{row.label}</span>
            <span
              className={cn(
                "shrink-0 font-mono text-sm font-semibold",
                row.tone === "in" ? "text-gain" : row.tone === "card" ? "text-warn" : "text-loss",
              )}
            >
              {formatMoney(row.amount, sym)}
            </span>
          </li>
        ))}
        {ops.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span className="min-w-0 text-sm">
              {t.asset}
              <span className="ml-2 text-2xs text-muted">{t.date}</span>
            </span>
            <span className="shrink-0 font-mono text-sm font-semibold">
              {formatMoney(tradeValue(t, jur.sc), sym)}
            </span>
          </li>
        ))}
      </ul>
      {snap.charged > 0 && (
        <p className="mt-2 text-2xs text-muted">{t("cardNote")}</p>
      )}
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone: "gain" | "loss" }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2">
      <p className="text-2xs text-muted">{label}</p>
      <p className={cn("mt-0.5 font-mono text-sm font-semibold", tone === "gain" ? "text-gain" : "text-loss")}>{value}</p>
    </div>
  );
}
