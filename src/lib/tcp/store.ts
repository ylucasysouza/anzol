import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/utils";
import { isCasaState, emptyCasa, patchMonth, zeros12 } from "@/lib/casa/engine";
import { buildCasaSample } from "@/lib/casa/sample";
import type { CasaParams } from "@/lib/casa/types";
import { isBackup } from "./backup";
import { buildDemoState } from "./sample";
import type {
  Account,
  PersistedTcp,
  Portfolio,
  Position,
  Quote,
  CashDividend,
  Taxpayer,
  ThemeMode,
  Trade,
} from "./types";

export interface CreateAccountInput {
  name: string;
  trader: string;
  country: string;
  broker: string;
  year: number;
  taxRate?: number | null;
  usBracket?: number;
  initialLoss?: number;
  swingInitialLoss?: number;
  avgPTAX?: number;
  tpId?: string | null;
}

interface TcpStore extends PersistedTcp {
  setTheme: (theme: ThemeMode) => void;
  setView: (view: string) => void;
  setActive: (id: string) => void;
  createAccount: (input: CreateAccountInput) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  updateTaxpayer: (id: string, patch: Partial<Taxpayer>) => void;
  deleteAccount: (id: string) => string | null;
  addTrade: (trade: Trade) => void;
  updateTrade: (id: string, trade: Trade) => void;
  deleteTrade: (id: string) => void;
  importTrades: (trades: Trade[]) => void;
  setConv: (key: string, value: number) => void;
  addPosition: (p: Omit<Position, "id"> & { id?: string }) => void;
  deletePosition: (id: string) => void;
  setQuotes: (prices: Record<string, Quote>, dividends: Record<string, CashDividend[]>) => void;
  loadDemo: () => void;
  restoreBackup: (data: PersistedTcp) => boolean;
  exportSnapshot: () => PersistedTcp;
  clearAll: () => void;
  updateCasaParams: (patch: Partial<CasaParams>) => void;
  updateCasaLine: (group: "income" | "fixed" | "variable" | "debtPay", key: string, month: number, value: number) => void;
  updateCasaInvest: (month: number, value: number) => void;
  updateCasaCardSpend: (month: number, value: number) => void;
  updateCasaGoods: (month: number, value: number) => void;
  updateCasaGoal: (kind: "reduce" | "increase", key: string, pct: number) => void;
  resetCasa: () => void;
}

const emptyPortfolio = (): Portfolio => ({
  positions: [],
  prices: {},
  dividends: {},
  lastFetch: null,
});

const empty: PersistedTcp = {
  taxpayers: [],
  accounts: [],
  activeId: null,
  trades: {},
  conv: {},
  theme: "dark",
  view: "0",
  portfolio: emptyPortfolio(),
  skipAutoDemo: false,
  casa: emptyCasa(),
};

const persistedKeys = (s: PersistedTcp): PersistedTcp => ({
  taxpayers: s.taxpayers,
  accounts: s.accounts,
  activeId: s.activeId,
  trades: s.trades,
  conv: s.conv,
  theme: s.theme,
  view: s.view,
  portfolio: s.portfolio,
  skipAutoDemo: s.skipAutoDemo,
  casa: s.casa ?? buildCasaSample(),
});

export const useTcpStore = create<TcpStore>()(
  persist(
    (set, get) => ({
      ...buildDemoState(),
      setTheme: (theme) => set({ theme }),
      setView: (view) => set({ view }),
      setActive: (id) => set({ activeId: id, view: get().view }),
      createAccount: (input) => {
        const s = get();
        let tpId = input.tpId ?? null;
        let taxpayers: Taxpayer[] = s.taxpayers;
        if (!tpId) {
          const tp: Taxpayer = {
            id: uid(),
            name: input.trader,
            country: input.country === "BR_INTL" ? "BR" : input.country,
            year: input.year,
          };
          taxpayers = [...taxpayers, tp];
          tpId = tp.id;
        }
        const account: Account = {
          id: uid(),
          taxpayerId: tpId,
          name: input.name,
          trader: input.trader,
          country: input.country,
          broker: input.broker || "Other",
          year: input.year,
          taxRate: input.taxRate,
          usBracket: input.usBracket ?? 0.22,
          initialLoss: input.initialLoss ?? 0,
          swingInitialLoss: input.swingInitialLoss ?? 0,
          avgPTAX: input.avgPTAX ?? 0,
        };
        set({
          taxpayers,
          accounts: [...s.accounts, account],
          activeId: account.id,
          trades: { ...s.trades, [account.id]: [] },
          view: "0",
          skipAutoDemo: true,
        });
      },
      updateAccount: (id, patch) =>
        set((s) => ({
          accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
      updateTaxpayer: (id, patch) =>
        set((s) => ({
          taxpayers: s.taxpayers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      deleteAccount: (id) => {
        const s = get();
        const accounts = s.accounts.filter((a) => a.id !== id);
        const trades = { ...s.trades };
        delete trades[id];
        const activeId = s.activeId === id ? (accounts[0]?.id ?? null) : s.activeId;
        set({ accounts, trades, activeId });
        return activeId;
      },
      addTrade: (trade) => {
        const s = get();
        if (!s.activeId) return;
        const list = s.trades[s.activeId] ?? [];
        set({ trades: { ...s.trades, [s.activeId]: [...list, trade] } });
      },
      updateTrade: (id, trade) => {
        const s = get();
        if (!s.activeId) return;
        const list = s.trades[s.activeId] ?? [];
        set({
          trades: {
            ...s.trades,
            [s.activeId]: list.map((t) => (t.id === id ? trade : t)),
          },
        });
      },
      deleteTrade: (id) => {
        const s = get();
        if (!s.activeId) return;
        const list = s.trades[s.activeId] ?? [];
        set({
          trades: { ...s.trades, [s.activeId]: list.filter((t) => t.id !== id) },
        });
      },
      importTrades: (incoming) => {
        const s = get();
        if (!s.activeId) return;
        const list = s.trades[s.activeId] ?? [];
        set({ trades: { ...s.trades, [s.activeId]: [...list, ...incoming] } });
      },
      setConv: (key, value) => set((s) => ({ conv: { ...s.conv, [key]: value } })),
      addPosition: (p) =>
        set((s) => {
          const pos = s.portfolio.positions;
          if (p.id) {
            return {
              portfolio: {
                ...s.portfolio,
                positions: pos.map((x) =>
                  x.id === p.id
                    ? {
                        id: p.id,
                        ticker: p.ticker,
                        shares: p.shares,
                        avgPrice: p.avgPrice,
                        dateAdded: p.dateAdded,
                      }
                    : x,
                ),
              },
            };
          }
          return {
            portfolio: {
              ...s.portfolio,
              positions: [
                ...pos,
                {
                  id: uid(),
                  ticker: p.ticker,
                  shares: p.shares,
                  avgPrice: p.avgPrice,
                  dateAdded: p.dateAdded,
                },
              ],
            },
          };
        }),
      deletePosition: (id) =>
        set((s) => ({
          portfolio: {
            ...s.portfolio,
            positions: s.portfolio.positions.filter((p) => p.id !== id),
          },
        })),
      setQuotes: (prices, dividends) =>
        set((s) => {
          const nextPrices = Object.keys(prices).length ? prices : s.portfolio.prices;
          const nextDivs = Object.keys(dividends).length ? dividends : s.portfolio.dividends;
          return {
            portfolio: {
              ...s.portfolio,
              prices: nextPrices,
              dividends: nextDivs,
              lastFetch: Date.now(),
            },
          };
        }),
      loadDemo: () => set({ ...buildDemoState(), skipAutoDemo: false }),
      restoreBackup: (data) => {
        if (!isBackup(data) || !data.accounts.length) return false;
        set({
          ...persistedKeys({
            ...empty,
            ...data,
            portfolio: data.portfolio ?? emptyPortfolio(),
            skipAutoDemo: true,
          }),
        });
        return true;
      },
      exportSnapshot: () => persistedKeys(get()),
      clearAll: () => {
        try {
          localStorage.removeItem("anzol-cofre");
        } catch {
          /* ignore */
        }
        set({ ...empty, portfolio: emptyPortfolio(), skipAutoDemo: true, casa: emptyCasa() });
      },
      updateCasaParams: (patch) =>
        set((s) => {
          const casa = s.casa ?? buildCasaSample();
          return { casa: { ...casa, params: { ...casa.params, ...patch } } };
        }),
      updateCasaLine: (group, key, month, value) =>
        set((s) => {
          const casa = s.casa ?? buildCasaSample();
          const g = casa.lines[group] as Record<string, number[]>;
          return {
            casa: {
              ...casa,
              lines: {
                ...casa.lines,
                [group]: { ...g, [key]: patchMonth(g[key] ?? zeros12(), month, value) },
              },
            },
          };
        }),
      updateCasaInvest: (month, value) =>
        set((s) => {
          const casa = s.casa ?? buildCasaSample();
          return { casa: { ...casa, investOverride: patchMonth(casa.investOverride, month, value) } };
        }),
      updateCasaCardSpend: (month, value) =>
        set((s) => {
          const casa = s.casa ?? buildCasaSample();
          return { casa: { ...casa, cardSpend: patchMonth(casa.cardSpend, month, value) } };
        }),
      updateCasaGoods: (month, value) =>
        set((s) => {
          const casa = s.casa ?? buildCasaSample();
          return { casa: { ...casa, goods: patchMonth(casa.goods, month, value) } };
        }),
      updateCasaGoal: (kind, key, pct) =>
        set((s) => {
          const casa = s.casa ?? buildCasaSample();
          return {
            casa: {
              ...casa,
              goals: {
                ...casa.goals,
                [kind]: { ...casa.goals[kind], [key]: pct },
              },
            },
          };
        }),
      resetCasa: () => set({ casa: buildCasaSample() }),
    }),
    {
      name: "tcp8",
      skipHydration: true,
      partialize: (s) => persistedKeys(s),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedTcp>;
        return {
          ...current,
          ...p,
          casa: isCasaState(p.casa) ? p.casa : (current.casa ?? buildCasaSample()),
          portfolio: p.portfolio ?? current.portfolio ?? emptyPortfolio(),
        };
      },
    },
  ),
);

export function useActiveAccount(): Account | null {
  return useTcpStore((s) => s.accounts.find((a) => a.id === s.activeId) ?? null);
}

export function seedDemoIfNeeded() {
  const s = useTcpStore.getState();
  if (!s.accounts.length && !s.skipAutoDemo) s.loadDemo();
  if (!s.casa) s.resetCasa();
}
