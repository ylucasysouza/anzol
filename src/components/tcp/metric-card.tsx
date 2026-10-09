import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "neutral" | "gain" | "loss" | "warn";
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="text-2xs font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div
        className={cn(
          "mt-1 min-w-0 break-words font-mono text-base font-semibold leading-tight tabular-nums tracking-tight sm:text-xl",
          tone === "gain" && "text-gain",
          tone === "loss" && "text-loss",
          tone === "warn" && "text-warn",
          tone === "neutral" && "text-fg",
        )}
      >
        {value}
      </div>
      {sub ? <div className="mt-1 text-2xs text-muted">{sub}</div> : null}
    </div>
  );
}

export function Section({
  title,
  action,
  children,
  tag,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  tag?: ReactNode;
}) {
  return (
    <section className="mb-3 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          {tag}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "gain" | "loss" | "warn" | "muted" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between border-b border-border py-1.5 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span
        className={cn(
          "font-mono font-semibold tabular-nums",
          tone === "gain" && "text-gain",
          tone === "loss" && "text-loss",
          tone === "warn" && "text-warn",
          tone === "muted" && "text-muted",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  action,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center text-sm text-muted">
      <div className="text-muted">{icon}</div>
      <p>{title}</p>
      {action}
    </div>
  );
}

export function Pnl({ n, children }: { n: number; children: ReactNode }) {
  return (
    <span
      className={cn(
        "font-mono font-semibold tabular-nums",
        n > 0 && "text-gain",
        n < 0 && "text-loss",
      )}
    >
      {children}
    </span>
  );
}
