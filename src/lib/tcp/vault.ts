import { isBackup } from "./backup";

const LIVE = "tcp8";
const SAFE = "anzol-cofre";

function readState(raw: string | null): unknown {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { state?: unknown };
    return parsed.state ?? parsed;
  } catch {
    return null;
  }
}

/** Keep a second copy of the ledger. A failed login must not be able to erase it. */
export function vaultNow(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(LIVE);
    const state = readState(raw);
    if (raw && isBackup(state) && state.accounts.length) localStorage.setItem(SAFE, raw);
  } catch {
    /* private mode */
  }
}

export function readVault(): unknown {
  if (typeof localStorage === "undefined") return null;
  try {
    return readState(localStorage.getItem(SAFE));
  } catch {
    return null;
  }
}

export function forgetVault(): void {
  try {
    localStorage.removeItem(SAFE);
  } catch {
    /* ignore */
  }
}
