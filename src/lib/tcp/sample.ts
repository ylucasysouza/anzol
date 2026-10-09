import { buildCasaSample } from "@/lib/casa/sample";
import type { PersistedTcp } from "./types";

const TP = "tp_demo";
const BTG = "ac_btg";
const XP = "ac_xp";

export function buildDemoState(): PersistedTcp {
  return {
    theme: "dark",
    skipAutoDemo: false,
    taxpayers: [{ id: TP, name: "Lucas Souza", country: "BR", year: 2026 }],
    accounts: [
      {
        id: BTG,
        taxpayerId: TP,
        name: "BTG Day Trade 2026",
        trader: "Lucas Souza",
        country: "BR",
        broker: "BTG Pactual",
        year: 2026,
        taxRate: 0.2,
        initialLoss: 0,
        swingInitialLoss: 0,
      },
      {
        id: XP,
        taxpayerId: TP,
        name: "XP Posição 2026",
        trader: "Lucas Souza",
        country: "BR",
        broker: "XP Investimentos",
        year: 2026,
        taxRate: 0.2,
        initialLoss: 0,
        swingInitialLoss: 0,
      },
    ],
    activeId: BTG,
    trades: {
      [BTG]: [
        { id: "t1", date: "2026-01-05", asset: "WINFUT", tipo: "daytrade", ajuste: 470, taxas: 12.5, irrf: 4.7, nota: "N-10421" },
        { id: "t2", date: "2026-01-08", asset: "WINFUT", tipo: "daytrade", ajuste: -320, taxas: 11.2, irrf: 0, nota: "N-10488" },
        { id: "t3", date: "2026-01-14", asset: "WINFUT", tipo: "daytrade", ajuste: 890, taxas: 14, irrf: 8.9, nota: "N-10502" },
        { id: "t4", date: "2026-01-21", asset: "PETR4", tipo: "swing", ajuste: -800, taxas: 12, irrf: 0, totalVendas: 15000 },
        { id: "t5", date: "2026-01-28", asset: "WINFUT", tipo: "daytrade", ajuste: 215, taxas: 9.8, irrf: 2.15, nota: "N-10611" },
        { id: "t6", date: "2026-02-04", asset: "WDOFUT", tipo: "daytrade", ajuste: -540, taxas: 13.4, irrf: 0, nota: "N-11002" },
        { id: "t7", date: "2026-02-11", asset: "WINFUT", tipo: "daytrade", ajuste: 180, taxas: 10.1, irrf: 1.8, nota: "N-11140" },
        { id: "t8", date: "2026-02-18", asset: "WINFUT", tipo: "daytrade", ajuste: -95, taxas: 8.6, irrf: 0, nota: "N-11209" },
        { id: "t9", date: "2026-03-03", asset: "WINFUT", tipo: "daytrade", ajuste: 640, taxas: 12.2, irrf: 6.4, nota: "N-12001" },
        { id: "t10", date: "2026-03-12", asset: "VALE3", tipo: "swing", ajuste: 1250, taxas: 18.5, irrf: 12.5, totalVendas: 28400 },
        { id: "t11", date: "2026-03-19", asset: "WINFUT", tipo: "daytrade", ajuste: 310, taxas: 9.4, irrf: 3.1, nota: "N-12188" },
        { id: "t12", date: "2026-04-07", asset: "WINFUT", tipo: "daytrade", ajuste: 420, taxas: 11, irrf: 4.2, nota: "N-13010" },
        { id: "t13", date: "2026-04-16", asset: "WINFUT", tipo: "daytrade", ajuste: -180, taxas: 9, irrf: 0, nota: "N-13102" },
        { id: "t14", date: "2026-04-22", asset: "PETR4", tipo: "swing", ajuste: 610, taxas: 14.2, irrf: 6.1, totalVendas: 22100 },
        { id: "t15", date: "2026-05-06", asset: "WINFUT", tipo: "daytrade", ajuste: 310, taxas: 10, irrf: 3.1, nota: "N-14001" },
        { id: "t16", date: "2026-05-20", asset: "WDOFUT", tipo: "daytrade", ajuste: -90, taxas: 8, irrf: 0, nota: "N-14112" },
        { id: "t17", date: "2026-06-09", asset: "WINFUT", tipo: "daytrade", ajuste: 155, taxas: 9, irrf: 1.55, nota: "N-15008" },
      ],
      [XP]: [
        { id: "x1", date: "2026-01-09", asset: "WINFUT", tipo: "daytrade", ajuste: 210, taxas: 8.4, irrf: 2.1, nota: "XP-2001" },
        { id: "x2", date: "2026-01-22", asset: "BBAS3", tipo: "swing", ajuste: 430, taxas: 7.2, irrf: 0, totalVendas: 9800 },
        { id: "x3", date: "2026-02-16", asset: "WINFUT", tipo: "daytrade", ajuste: -175, taxas: 9.1, irrf: 0, nota: "XP-2144" },
        { id: "x4", date: "2026-03-08", asset: "HGLG11", tipo: "position", ajuste: 620, taxas: 11, irrf: 0, totalVendas: 22100 },
        { id: "x5", date: "2026-04-14", asset: "WINFUT", tipo: "daytrade", ajuste: 95, taxas: 7, irrf: 0.95, nota: "XP-2301" },
        { id: "x6", date: "2026-05-11", asset: "BBAS3", tipo: "swing", ajuste: -240, taxas: 6.5, irrf: 0, totalVendas: 11200 },
      ],
    },
    conv: {},
    view: "0",
    portfolio: {
      positions: [
        { id: "p1", ticker: "PETR4", shares: 400, avgPrice: 36.2, dateAdded: "2025-11-12" },
        { id: "p2", ticker: "VALE3", shares: 200, avgPrice: 62.1, dateAdded: "2025-09-03" },
        { id: "p3", ticker: "BBAS3", shares: 300, avgPrice: 27.4, dateAdded: "2026-01-08" },
        { id: "p4", ticker: "HGLG11", shares: 120, avgPrice: 158, dateAdded: "2025-06-20" },
        { id: "p5", ticker: "BOVA11", shares: 80, avgPrice: 132.5, dateAdded: "2025-08-14" },
      ],
      prices: {
        PETR4: { price: 38.42, chg: 0.51, pct: 1.34, name: "Petrobras PN" },
        VALE3: { price: 64.1, chg: -0.38, pct: -0.59, name: "Vale ON" },
        BBAS3: { price: 28.15, chg: 0.22, pct: 0.79, name: "Banco do Brasil ON" },
        HGLG11: { price: 163.4, chg: 0.85, pct: 0.52, name: "CSHG Logística FII" },
        BOVA11: { price: 136.2, chg: 0.74, pct: 0.55, name: "iShares Ibovespa" },
      },
      dividends: {
        PETR4: [{ type: "DIVIDENDO", label: "Dividendo", rate: 0.45, paymentDate: "2026-11-20" }],
        VALE3: [{ type: "JCP", label: "Juros sobre capital próprio", rate: 0.82, paymentDate: "2026-10-15" }],
        HGLG11: [{ type: "DIVIDENDO", label: "Rendimento", rate: 1.1, paymentDate: "2026-10-08" }],
        BBAS3: [{ type: "JCP", label: "JCP", rate: 0.31, paymentDate: "2026-12-02" }],
      },
      lastFetch: Date.now(),
    },
    casa: buildCasaSample(),
  };
}
