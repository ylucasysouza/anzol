import { createServerFn } from "@tanstack/react-start";
import type { CashDividend, Quote } from "./types";

const BRAPI = "https://brapi.dev/api";
const TOKEN = "demo";

export const searchTickers = createServerFn({ method: "POST" })
  .validator((input: { q: string }) => input)
  .handler(async ({ data }) => {
    const q = data.q.trim();
    if (!q) return [] as { stock: string; name: string; close: number | null }[];
    try {
      const r = await fetch(
        `${BRAPI}/quote/list?search=${encodeURIComponent(q)}&limit=8&token=${TOKEN}`,
      );
      if (!r.ok) return [];
      const d = (await r.json()) as {
        stocks?: { stock: string; name?: string; close?: number }[];
      };
      return (d.stocks ?? []).slice(0, 8).map((s) => ({
        stock: s.stock,
        name: s.name ?? "",
        close: s.close ?? null,
      }));
    } catch {
      return [];
    }
  });

export const fetchQuotes = createServerFn({ method: "POST" })
  .validator((input: { tickers: string[] }) => input)
  .handler(async ({ data }) => {
    const tks = [...new Set(data.tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
    if (!tks.length) {
      return { prices: {} as Record<string, Quote>, dividends: {} as Record<string, CashDividend[]> };
    }
    const prices: Record<string, Quote> = {};
    try {
      const r = await fetch(`${BRAPI}/quote/${tks.join(",")}?token=${TOKEN}`);
      if (r.ok) {
        const d = (await r.json()) as {
          results?: {
            symbol: string;
            regularMarketPrice?: number;
            regularMarketChange?: number;
            regularMarketChangePercent?: number;
            shortName?: string;
            longName?: string;
          }[];
        };
        for (const s of d.results ?? []) {
          prices[s.symbol] = {
            price: s.regularMarketPrice || 0,
            chg: s.regularMarketChange || 0,
            pct: s.regularMarketChangePercent || 0,
            name: (s.shortName || s.longName || s.symbol || "").slice(0, 24),
          };
        }
      }
    } catch {
      /* empty */
    }

    const dividends: Record<string, CashDividend[]> = {};
    for (const tk of tks.slice(0, 8)) {
      try {
        const r = await fetch(`${BRAPI}/quote/${tk}?dividends=true&token=${TOKEN}`);
        if (!r.ok) continue;
        const d = (await r.json()) as {
          results?: { dividendsData?: { cashDividends?: CashDividend[] } }[];
        };
        const res = d.results?.[0];
        dividends[tk] = res?.dividendsData?.cashDividends ?? [];
      } catch {
        dividends[tk] = [];
      }
    }
    return { prices, dividends };
  });
