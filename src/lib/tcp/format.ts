import type { ScopeCode, Trade } from "./types";
import { readLocale } from "@/lib/i18n";

function localeTag() {
  const loc = readLocale();
  if (loc === "en") return "en-US";
  if (loc === "es") return "es-AR";
  return "pt-BR";
}

export const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export const MONTHS_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

export function formatMoney(
  n: number | string | null | undefined,
  sym: string,
): string {
  if (n == null || n === "" || Number.isNaN(Number(n))) return "—";
  const num = Number(n);
  const formatted = Math.abs(num).toLocaleString(localeTag(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (num < 0 ? "-" : "") + sym + formatted;
}

export function formatPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return (n * 100).toFixed(1) + "%";
}

export function formatDate(d: string | undefined): string {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(localeTag(), { day: "2-digit", month: "short" });
}

export function formatDateBR(d: Date): string {
  return d.toLocaleDateString(localeTag(), { day: "2-digit", month: "short", year: "numeric" });
}

export function pnlTone(n: number | string | null | undefined): "gain" | "loss" | "neutral" {
  const num = Number(n);
  if (!Number.isFinite(num) || num === 0) return "neutral";
  return num > 0 ? "gain" : "loss";
}

export function tradeValue(t: Trade, sc: ScopeCode): number {
  if (sc === "BR" || sc === "BR_INTL") {
    if (t.ajuste != null && t.ajuste !== "") {
      return (parseFloat(String(t.ajuste)) || 0) - (parseFloat(String(t.taxas)) || 0);
    }
    return (parseFloat(String(t.gross)) || 0) - (parseFloat(String(t.comm)) || 0);
  }
  return (parseFloat(String(t.gross)) || 0) - (parseFloat(String(t.comm)) || 0);
}

export function num(v: number | string | null | undefined): number {
  return parseFloat(String(v ?? 0)) || 0;
}
