import type { PersistedTcp } from "./types";

export function isBackup(value: unknown): value is PersistedTcp {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.accounts) && Array.isArray(v.taxpayers) && typeof v.trades === "object" && v.trades != null;
}
