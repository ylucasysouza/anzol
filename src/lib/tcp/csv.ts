import { num } from "./format.ts";
import type { Jurisdiction, Trade } from "./types";

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function csvTemplate(jur: Jurisdiction): string {
  if (jur.sc === "BR") {
    return "Date,Asset,Tipo,Ajuste,Taxas,IRRF,TotalVendas\n2026-01-05,WINFUT,daytrade,47.00,5.68,1.98,0\n2026-01-10,PETR4,swing,-800.00,12.00,0,15000.00";
  }
  if (jur.sc === "BR_INTL") {
    return "Date,Asset,Direction,Gross,Commission,PTAX\n2026-01-14,XAUUSD,Sell,3.07,0,5.43";
  }
  return "Date,Asset,Class,Direction,GrossPnL,Commission,Session,ExitReason\n2026-01-14,XAUUSD,Forex,Sell,3.07,0,New York,Take Profit";
}

function detectDelim(header: string): "," | ";" {
  const semi = (header.match(/;/g) || []).length;
  const comma = (header.match(/,/g) || []).length;
  return semi > comma ? ";" : ",";
}

/** Accepts 1234.56, 1234,56 and 1.234,56 */
export function parseNumberCell(raw: string): string {
  const s = raw.trim();
  if (!s) return "0";
  if (s.includes(",") && s.includes(".")) {
    return s.replace(/\./g, "").replace(",", ".");
  }
  if (s.includes(",")) return s.replace(",", ".");
  return s;
}

export function parseCSV(txt: string, jur: Jurisdiction): Trade[] {
  const lines = txt
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (lines.length < 2) return [];
  const delim = detectDelim(lines[0]);
  const hdrs = lines[0].split(delim).map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
  const trades: Trade[] = [];

  const get = (cols: string[], k: string) => {
    const idx = hdrs.findIndex((h) => h.includes(k));
    return idx >= 0 ? (cols[idx] || "").trim() : "";
  };

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim);
    const d = get(cols, "date") || get(cols, "data");
    if (!d || Number.isNaN(Date.parse(d))) continue;
    if (jur.sc === "BR") {
      trades.push({
        id: uid(),
        date: d,
        asset: get(cols, "asset") || get(cols, "ativo") || "WINFUT",
        tipo: (get(cols, "tipo") as Trade["tipo"]) || "daytrade",
        ajuste: parseNumberCell(get(cols, "ajust") || get(cols, "result") || "0"),
        taxas: parseNumberCell(get(cols, "taxa") || get(cols, "fee") || "0"),
        irrf: parseNumberCell(get(cols, "irrf") || "0"),
        totalVendas: parseNumberCell(get(cols, "total") || get(cols, "venda") || "0"),
        nota: get(cols, "nota") || "",
      });
    } else if (jur.sc === "BR_INTL") {
      const gr = parseFloat(parseNumberCell(get(cols, "gross") || get(cols, "pnl") || "0")) || 0;
      const co = parseFloat(parseNumberCell(get(cols, "comm") || get(cols, "fee") || "0")) || 0;
      trades.push({
        id: uid(),
        date: d,
        asset: get(cols, "asset") || "Forex",
        dir: get(cols, "dir") === "Sell" ? "Sell" : "Buy",
        gross: gr,
        comm: co,
        ptax: parseNumberCell(get(cols, "ptax") || get(cols, "rate") || "0"),
        notes: get(cols, "note") || "",
      });
    } else {
      const gr = parseFloat(parseNumberCell(get(cols, "gross") || get(cols, "pnl") || "0")) || 0;
      const co = parseFloat(parseNumberCell(get(cols, "comm") || get(cols, "fee") || "0")) || 0;
      trades.push({
        id: uid(),
        date: d,
        asset: get(cols, "asset") || "?",
        cls: get(cols, "class") || "Other",
        dir: get(cols, "dir") === "Sell" ? "Sell" : "Buy",
        gross: gr,
        comm: co,
        net: gr - co,
        sess: get(cols, "sess") || "",
        exit: get(cols, "exit") || "",
      });
    }
  }
  return trades;
}

export function tradesToCSV(trades: Trade[], jur: Jurisdiction): string {
  if (jur.sc === "BR") {
    const rows = ["Date,Asset,Tipo,Ajuste,Taxas,IRRF,TotalVendas,Nota"];
    for (const t of trades) {
      rows.push(
        [t.date, t.asset, t.tipo ?? "daytrade", num(t.ajuste), num(t.taxas), num(t.irrf), num(t.totalVendas), t.nota ?? ""].join(","),
      );
    }
    return rows.join("\n");
  }
  if (jur.sc === "BR_INTL") {
    const rows = ["Date,Asset,Direction,Gross,Commission,PTAX,Notes"];
    for (const t of trades) {
      rows.push([t.date, t.asset, t.dir ?? "Buy", num(t.gross), num(t.comm), num(t.ptax), t.notes ?? ""].join(","));
    }
    return rows.join("\n");
  }
  const rows = ["Date,Asset,Class,Direction,GrossPnL,Commission,Session,ExitReason,Notes"];
  for (const t of trades) {
    rows.push(
      [t.date, t.asset, t.cls ?? "", t.dir ?? "Buy", num(t.gross), num(t.comm), t.sess ?? "", t.exit ?? "", t.notes ?? ""].join(","),
    );
  }
  return rows.join("\n");
}

export function downloadText(filename: string, data: string, mime = "text/csv") {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
