import { type FormEvent, useEffect, useState } from "react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/input";
import { useTr } from "@/lib/i18n";
import { isBackup } from "@/lib/tcp/backup";
import { csvTemplate, downloadText, parseCSV, tradesToCSV } from "@/lib/tcp/csv";
import { formatDate, formatMoney } from "@/lib/tcp/format";
import { J, jurisdiction } from "@/lib/tcp/jurisdictions";
import { searchTickers } from "@/lib/tcp/quotes";
import { useActiveAccount, useTcpStore } from "@/lib/tcp/store";
import { suggestIrrf } from "@/lib/tcp/tax";
import type { Position, Trade } from "@/lib/tcp/types";
import { uid } from "@/lib/utils";
import { Pnl } from "./metric-card";
import { PlansDialog } from "./plans-dialog";

export { PlansDialog };

function assetLabel(a: string, tr: (pt: string, en: string, es: string) => string) {
  if (a === "Acoes") return tr("Acoes", "Stocks", "Acciones");
  if (a === "Opcoes") return tr("Opcoes", "Options", "Opciones");
  if (a === "Outro") return tr("Outro", "Other", "Otro");
  if (a === "Other") return tr("Other", "Other", "Otro");
  return a;
}

function choiceLabel(s: string, tr: (pt: string, en: string, es: string) => string) {
  if (s === "Other") return tr("Other", "Other", "Otro");
  if (s === "Manual") return tr("Manual", "Manual", "Manual");
  if (s === "Partial") return tr("Partial", "Partial", "Parcial");
  if (s === "Time-based") return tr("Time-based", "Time-based", "Por tiempo");
  if (s === "News") return tr("News", "News", "Noticia");
  if (s === "Pre-Market") return tr("Pre-Market", "Pre-Market", "Preapertura");
  return s;
}

export function TradeDialog({
  open,
  onOpenChange,
  tipo,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipo: "dt" | "sw";
  editing: Trade | null;
}) {
  const tr = useTr();
  const account = useActiveAccount();
  const view = useTcpStore((s) => s.view);
  const addTrade = useTcpStore((s) => s.addTrade);
  const updateTrade = useTcpStore((s) => s.updateTrade);
  const jur = jurisdiction(account?.country);
  const m = parseInt(view, 10) || 0;
  const year = account?.year ?? new Date().getFullYear();
  const defDate = editing?.date ?? `${year}-${String(m + 1).padStart(2, "0")}-01`;
  const isSW = tipo === "sw" || editing?.tipo === "swing" || editing?.tipo === "position";
  const title = `${editing ? tr("Editar", "Edit", "Editar") : tr("Adicionar", "Add", "Agregar")} ${
    jur.sc === "BR_INTL"
      ? tr("operação", "trade", "operación")
      : isSW
        ? tr("swing/posição", "swing/position", "swing/posición")
        : "day trade"
  }`;
  const [ajuste, setAjuste] = useState(String(editing?.ajuste ?? ""));
  const [irrf, setIrrf] = useState(String(editing?.irrf ?? ""));
  const [irrfTouched, setIrrfTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAjuste(String(editing?.ajuste ?? ""));
    setIrrf(String(editing?.irrf ?? ""));
    setIrrfTouched(Boolean(editing?.irrf));
  }, [open, editing]);

  function onAjuste(v: string) {
    setAjuste(v);
    if (!isSW && !irrfTouched) {
      const n = parseFloat(v) || 0;
      setIrrf(n > 0 ? suggestIrrf(n).toFixed(2) : "0");
    }
  }

  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const trade: Trade = {
      id: editing?.id ?? uid(),
      date: String(fd.get("date") || ""),
      asset: String(fd.get("asset") || ""),
    };
    if (jur.sc === "BR") {
      trade.tipo = String(fd.get("tipo") || "daytrade") as Trade["tipo"];
      trade.ajuste = ajuste || "0";
      trade.taxas = String(fd.get("taxas") || "0");
      trade.irrf = irrf || "0";
      trade.totalVendas = String(fd.get("vendas") || "0");
      trade.nota = String(fd.get("nota") || "");
    } else if (jur.sc === "BR_INTL") {
      const gr = parseFloat(String(fd.get("gross") || 0)) || 0;
      const co = parseFloat(String(fd.get("comm") || 0)) || 0;
      trade.dir = fd.get("dir") === "Sell" ? "Sell" : "Buy";
      trade.gross = gr;
      trade.comm = co;
      trade.ptax = String(fd.get("ptax") || "0");
      trade.notes = String(fd.get("notes") || "");
    } else {
      const gr = parseFloat(String(fd.get("gross") || 0)) || 0;
      const co = parseFloat(String(fd.get("comm") || 0)) || 0;
      trade.cls = String(fd.get("cls") || "Other");
      trade.dir = fd.get("dir") === "Sell" ? "Sell" : "Buy";
      trade.gross = gr;
      trade.comm = co;
      trade.net = gr - co;
      trade.sess = String(fd.get("sess") || "");
      trade.exit = String(fd.get("exit") || "");
      trade.notes = String(fd.get("notes") || "");
    }
    if (editing) updateTrade(editing.id, trade);
    else addTrade(trade);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={`${jur.flag} ${jur.name}`}>
        <form onSubmit={save} className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>{tr("Data", "Date", "Fecha")}</FieldLabel>
            <Input name="date" type="date" defaultValue={defDate} required />
          </div>
          <div>
            <FieldLabel>{tr("Ativo", "Asset", "Activo")}</FieldLabel>
            <Select name="asset" defaultValue={editing?.asset || jur.ass[0]}>
              {jur.ass.map((a) => (
                <option key={a} value={a}>
                  {assetLabel(a, tr)}
                </option>
              ))}
            </Select>
          </div>
          {jur.sc === "BR" && (
            <>
              <div>
                <FieldLabel>{tr("Tipo", "Type", "Tipo")}</FieldLabel>
                <Select name="tipo" defaultValue={editing?.tipo || (isSW ? "swing" : "daytrade")}>
                  {isSW ? (
                    <>
                      <option value="swing">Swing trade</option>
                      <option value="position">
                        {tr(
                          "Position (mais de 1 mês)",
                          "Position (more than 1 month)",
                          "Position (más de 1 mes)",
                        )}
                      </option>
                    </>
                  ) : (
                    <option value="daytrade">Day trade</option>
                  )}
                </Select>
              </div>
              <div className="col-span-2">
                <FieldLabel>
                  {tr("Ajuste", "Adjustment", "Ajuste")} ({jur.sym}) —{" "}
                  {tr("positivo = ganho", "positive = gain", "positivo = ganancia")}
                </FieldLabel>
                <Input
                  name="ajuste"
                  type="number"
                  step="0.01"
                  placeholder={tr("47.00 ou -155.00", "47.00 or -155.00", "47.00 o -155.00")}
                  value={ajuste}
                  onChange={(e) => onAjuste(e.target.value)}
                />
              </div>
              {isSW && (
                <div className="col-span-2">
                  <FieldLabel>
                    {tr(
                      "Total de vendas no mês",
                      "Total sales for the month",
                      "Total de ventas del mes",
                    )}{" "}
                    ({jur.sym})
                  </FieldLabel>
                  <Input
                    name="vendas"
                    type="number"
                    step="0.01"
                    min={0}
                    defaultValue={editing?.totalVendas ?? ""}
                  />
                </div>
              )}
              <div>
                <FieldLabel>{tr("Taxas / emolumentos", "Fees", "Comisiones")}</FieldLabel>
                <Input
                  name="taxas"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={editing?.taxas ?? ""}
                />
              </div>
              <div>
                <FieldLabel>IRRF</FieldLabel>
                <Input
                  name="irrf"
                  type="number"
                  step="0.01"
                  min={0}
                  value={irrf}
                  onChange={(e) => {
                    setIrrf(e.target.value);
                    setIrrfTouched(true);
                  }}
                />
                {!isSW && (
                  <p className="mt-1 text-2xs text-muted">
                    {tr(
                      "Sugerido: 1% do ganho positivo de day trade.",
                      "Suggested: 1% of the positive day-trade gain.",
                      "Sugerido: 1% de la ganancia positiva de day trade.",
                    )}
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <FieldLabel>{tr("Nota #", "Note #", "Nota #")}</FieldLabel>
                <Input name="nota" defaultValue={editing?.nota ?? ""} />
              </div>
            </>
          )}
          {jur.sc === "BR_INTL" && (
            <>
              <div>
                <FieldLabel>{tr("Direção", "Direction", "Dirección")}</FieldLabel>
                <Select name="dir" defaultValue={editing?.dir || "Buy"}>
                  <option value="Buy">{tr("Compra / Long", "Buy / Long", "Compra / Long")}</option>
                  <option value="Sell">
                    {tr("Venda / Short", "Sell / Short", "Venta / Short")}
                  </option>
                </Select>
              </div>
              <div>
                <FieldLabel>Gross P&L (USD)</FieldLabel>
                <Input name="gross" type="number" step="0.01" defaultValue={editing?.gross ?? ""} />
              </div>
              <div>
                <FieldLabel>
                  {tr("Comissão (USD)", "Commission (USD)", "Comisión (USD)")}
                </FieldLabel>
                <Input
                  name="comm"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={editing?.comm ?? ""}
                />
              </div>
              <div className="col-span-2">
                <FieldLabel>
                  {tr(
                    "PTAX do dia (USD/BRL)",
                    "PTAX for the day (USD/BRL)",
                    "PTAX del día (USD/BRL)",
                  )}
                </FieldLabel>
                <Input name="ptax" type="number" step="0.0001" defaultValue={editing?.ptax ?? ""} />
              </div>
              <div className="col-span-2">
                <FieldLabel>{tr("Notas", "Notes", "Notas")}</FieldLabel>
                <Input name="notes" defaultValue={editing?.notes ?? ""} />
              </div>
            </>
          )}
          {jur.sc === "INTL" && (
            <>
              <div>
                <FieldLabel>{tr("Classe", "Class", "Clase")}</FieldLabel>
                <Select name="cls" defaultValue={editing?.cls || "Other"}>
                  {["Forex", "Futures", "Stocks", "CFD", "Crypto", "Options", "Other"].map((c) => (
                    <option key={c} value={c}>
                      {choiceLabel(c, tr)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel>{tr("Direção", "Direction", "Dirección")}</FieldLabel>
                <Select name="dir" defaultValue={editing?.dir || "Buy"}>
                  <option value="Buy">Buy / Long</option>
                  <option value="Sell">Sell / Short</option>
                </Select>
              </div>
              <div>
                <FieldLabel>Gross P&L ({jur.sym})</FieldLabel>
                <Input name="gross" type="number" step="0.01" defaultValue={editing?.gross ?? ""} />
              </div>
              <div>
                <FieldLabel>
                  {tr("Comissão", "Commission", "Comisión")} ({jur.sym})
                </FieldLabel>
                <Input
                  name="comm"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={editing?.comm ?? ""}
                />
              </div>
              <div>
                <FieldLabel>{tr("Sessão", "Session", "Sesión")}</FieldLabel>
                <Select name="sess" defaultValue={editing?.sess || "New York"}>
                  {["London", "New York", "London+NY", "Asia", "Sydney", "Pre-Market", "Other"].map(
                    (s) => (
                      <option key={s} value={s}>
                        {choiceLabel(s, tr)}
                      </option>
                    ),
                  )}
                </Select>
              </div>
              <div>
                <FieldLabel>{tr("Motivo da saída", "Exit reason", "Motivo de salida")}</FieldLabel>
                <Select name="exit" defaultValue={editing?.exit || "Take Profit"}>
                  {[
                    "Take Profit",
                    "Stop Loss",
                    "Manual",
                    "Partial",
                    "Time-based",
                    "News",
                    "Other",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {choiceLabel(s, tr)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="col-span-2">
                <FieldLabel>{tr("Notas", "Notes", "Notas")}</FieldLabel>
                <Input name="notes" defaultValue={editing?.notes ?? ""} />
              </div>
            </>
          )}
          <div className="col-span-2 mt-1 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {tr("Cancelar", "Cancel", "Cancelar")}
            </Button>
            <Button type="submit" className="flex-1">
              {tr("Salvar", "Save", "Guardar")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const tr = useTr();
  const account = useActiveAccount();
  const importTrades = useTcpStore((s) => s.importTrades);
  const jur = jurisdiction(account?.country);
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<Trade[]>([]);

  function parse() {
    const trades = parseCSV(text, jur);
    setParsed(trades);
    if (!trades.length) {
      toast.error(
        tr(
          "Não foi possível ler o arquivo. Confira o formato (vírgula ou ponto-e-vírgula).",
          "Could not read the file. Check the format (comma or semicolon).",
          "No se pudo leer el archivo. Revisa el formato (coma o punto y coma).",
        ),
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl"
        title={tr("Importar CSV", "Import CSV", "Importar CSV")}
        description={tr(
          "Cada linha é uma operação. MT4/MT5, TradingView e a maioria das corretoras exportam nesse formato. Aceita vírgula ou ponto-e-vírgula.",
          "Each row is a trade. MT4/MT5, TradingView, and most brokers export in this format. Accepts comma or semicolon.",
          "Cada fila es una operación. MT4/MT5, TradingView y la mayoría de las corredoras exportan en este formato. Acepta coma o punto y coma.",
        )}
      >
        <FieldLabel>{tr("Formato esperado", "Expected format", "Formato esperado")}</FieldLabel>
        <pre className="mb-3 overflow-x-auto rounded-lg border border-border bg-inset p-3 font-mono text-2xs text-muted">
          {csvTemplate(jur)}
        </pre>
        <label className="mb-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border-strong px-4 py-6 text-center hover:border-accent">
          <input
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const r = new FileReader();
              r.onload = () => {
                const v = String(r.result || "");
                setText(v);
                setParsed(parseCSV(v, jur));
              };
              r.readAsText(f);
            }}
          />
          <div className="text-sm font-semibold">
            {tr(
              "Clique para escolher arquivo",
              "Click to choose a file",
              "Haz clic para elegir un archivo",
            )}
          </div>
          <div className="text-2xs text-muted">
            {tr("Aceita .csv e .txt", "Accepts .csv and .txt", "Acepta .csv y .txt")}
          </div>
        </label>
        <Textarea
          rows={4}
          className="font-mono text-xs"
          placeholder={tr(
            "Ou cole os dados CSV aqui…",
            "Or paste the CSV data here…",
            "O pega los datos CSV aquí…",
          )}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {parsed.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-xs font-semibold text-gain">
              {tr(
                `${parsed.length} operações encontradas`,
                `${parsed.length} trades found`,
                `${parsed.length} operaciones encontradas`,
              )}
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-2xs uppercase text-muted">
                    <th className="px-2 py-1.5 text-left">{tr("Data", "Date", "Fecha")}</th>
                    <th className="px-2 py-1.5 text-left">{tr("Ativo", "Asset", "Activo")}</th>
                    <th className="px-2 py-1.5 text-left">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 5).map((t) => {
                    const pnl = jur.sc === "BR" ? Number(t.ajuste) || 0 : Number(t.gross) || 0;
                    return (
                      <tr key={t.id} className="border-b border-border last:border-0">
                        <td className="px-2 py-1.5">{formatDate(t.date)}</td>
                        <td className="px-2 py-1.5">{t.asset}</td>
                        <td className="px-2 py-1.5">
                          <Pnl n={pnl}>{formatMoney(pnl, jur.sym)}</Pnl>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {tr("Cancelar", "Cancel", "Cancelar")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => downloadText("template.csv", csvTemplate(jur))}
          >
            {tr("Modelo", "Template", "Plantilla")}
          </Button>
          <Button variant="secondary" onClick={parse}>
            {tr("Ler e pré-visualizar", "Read and preview", "Leer y previsualizar")}
          </Button>
          {parsed.length > 0 && (
            <Button
              onClick={() => {
                importTrades(parsed);
                toast.success(
                  tr(
                    `Importado: ${parsed.length} operações`,
                    `Imported: ${parsed.length} trades`,
                    `Importado: ${parsed.length} operaciones`,
                  ),
                );
                setParsed([]);
                setText("");
                onOpenChange(false);
              }}
            >
              {tr("Importar", "Import", "Importar")} {parsed.length}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PositionDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Position | null;
}) {
  const tr = useTr();
  const addPosition = useTcpStore((s) => s.addPosition);
  const [ticker, setTicker] = useState(editing?.ticker ?? "");
  const [hits, setHits] = useState<{ stock: string; name: string; close: number | null }[]>([]);
  const [openAc, setOpenAc] = useState(false);

  useEffect(() => {
    setTicker(editing?.ticker ?? "");
  }, [editing, open]);

  useEffect(() => {
    const val = ticker.trim().toUpperCase();
    if (!val) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      void searchTickers({ data: { q: val } }).then((res) => {
        setHits(res);
        setOpenAc(true);
      });
    }, 320);
    return () => clearTimeout(t);
  }, [ticker]);

  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const tk = String(fd.get("ticker") || "")
      .trim()
      .toUpperCase();
    const sh = parseFloat(String(fd.get("shares") || 0)) || 0;
    const ap = parseFloat(String(fd.get("avg") || 0)) || 0;
    const dt = String(fd.get("date") || new Date().toISOString().slice(0, 10));
    if (!tk || sh <= 0 || ap <= 0) {
      toast.error(
        tr(
          "Preencha ticker, quantidade e preço médio.",
          "Enter the ticker, quantity, and average price.",
          "Completa el ticker, la cantidad y el precio promedio.",
        ),
      );
      return;
    }
    addPosition({ id: editing?.id, ticker: tk, shares: sh, avgPrice: ap, dateAdded: dt });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={
          editing
            ? tr("Editar posição", "Edit position", "Editar posición")
            : tr("Adicionar posição", "Add position", "Agregar posición")
        }
        description={tr(
          "Digite o ticker ou nome — ex: BBA mostra BBAS3",
          "Type the ticker or name — e.g. BBA shows BBAS3",
          "Escribe el ticker o el nombre — ej.: BBA muestra BBAS3",
        )}
      >
        <form onSubmit={save} className="grid grid-cols-2 gap-3">
          <div className="relative col-span-2">
            <FieldLabel>{tr("Ticker / nome", "Ticker / name", "Ticker / nombre")}</FieldLabel>
            <Input
              name="ticker"
              value={ticker}
              autoComplete="off"
              placeholder="BBAS3, PETR4, HGLG11"
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
            />
            {openAc && hits.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border-strong bg-surface shadow-xl">
                {hits.map((s) => (
                  <button
                    key={s.stock}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-inset"
                    onClick={() => {
                      setTicker(s.stock);
                      setOpenAc(false);
                    }}
                  >
                    <div>
                      <div className="font-mono text-sm font-semibold">{s.stock}</div>
                      <div className="truncate text-2xs text-muted">{s.name}</div>
                    </div>
                    <div className="font-mono text-xs text-gain">
                      {s.close != null ? `R$${Number(s.close).toFixed(2)}` : "—"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <FieldLabel>{tr("Quantidade", "Quantity", "Cantidad")}</FieldLabel>
            <Input
              name="shares"
              type="number"
              min={1}
              step={1}
              defaultValue={editing?.shares ?? ""}
              placeholder="100"
            />
          </div>
          <div>
            <FieldLabel>
              {tr("Preço médio (R$)", "Average price (R$)", "Precio promedio (R$)")}
            </FieldLabel>
            <Input
              name="avg"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={editing?.avgPrice ?? ""}
              placeholder="38.20"
            />
          </div>
          <div className="col-span-2">
            <FieldLabel>{tr("Data de compra", "Purchase date", "Fecha de compra")}</FieldLabel>
            <Input
              name="date"
              type="date"
              defaultValue={editing?.dateAdded ?? new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="col-span-2 mt-1 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {tr("Cancelar", "Cancel", "Cancelar")}
            </Button>
            <Button type="submit" className="flex-1">
              {editing
                ? tr("Atualizar", "Update", "Actualizar")
                : tr("Adicionar", "Add", "Agregar")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SettingsView({
  onClose,
  onInstall,
}: {
  onClose: () => void;
  onInstall?: () => void;
}) {
  const tr = useTr();
  const account = useActiveAccount();
  const accounts = useTcpStore((s) => s.accounts);
  const taxpayers = useTcpStore((s) => s.taxpayers);
  const tradesMap = useTcpStore((s) => s.trades);
  const updateAccount = useTcpStore((s) => s.updateAccount);
  const updateTaxpayer = useTcpStore((s) => s.updateTaxpayer);
  const deleteAccount = useTcpStore((s) => s.deleteAccount);
  const setActive = useTcpStore((s) => s.setActive);
  const clearAll = useTcpStore((s) => s.clearAll);
  const loadDemo = useTcpStore((s) => s.loadDemo);
  const restoreBackup = useTcpStore((s) => s.restoreBackup);
  const exportSnapshot = useTcpStore((s) => s.exportSnapshot);
  const jur = jurisdiction(account?.country);
  const tp = taxpayers.find((t) => t.id === account?.taxpayerId);

  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!account) return;
    const fd = new FormData(e.currentTarget);
    updateAccount(account.id, {
      name: String(fd.get("name") || account.name),
      year: parseInt(String(fd.get("year") || account.year), 10),
      initialLoss: parseFloat(String(fd.get("loss") || 0)) || 0,
      swingInitialLoss: parseFloat(String(fd.get("sloss") || 0)) || 0,
    });
    if (tp) {
      updateTaxpayer(tp.id, {
        name: String(fd.get("trader") || tp.name),
        cpf: String(fd.get("cpf") || ""),
      });
    }
    onClose();
  }

  return (
    <div className="space-y-3">
      {onInstall && (
        <button
          type="button"
          onClick={onInstall}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-left"
        >
          <span>
            <span className="block text-sm font-semibold">
              {tr("Instalar", "Install", "Instalar")}
            </span>
            <span className="block text-2xs text-muted">
              {tr(
                "Celular ou computador, um passo",
                "Phone or computer, one step",
                "Celular o computadora, un paso",
              )}
            </span>
          </span>
          <span className="text-xs font-semibold text-accent">{tr("Abrir", "Open", "Abrir")}</span>
        </button>
      )}
      <form onSubmit={save} className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">
          {tr("Conta", "Account", "Cuenta")}: {account?.name ?? "—"}
        </h2>
        <div className="mb-3">
          <FieldLabel>{tr("Nome da conta", "Account name", "Nombre de la cuenta")}</FieldLabel>
          <Input name="name" defaultValue={account?.name} />
        </div>
        <div className="mb-3">
          <FieldLabel>{tr("Contribuinte", "Taxpayer", "Contribuyente")}</FieldLabel>
          <Input name="trader" defaultValue={tp?.name ?? account?.trader} />
        </div>
        {jur.sc === "BR" && (
          <div className="mb-3">
            <FieldLabel>
              {tr(
                "CPF (só neste dispositivo)",
                "CPF (this device only)",
                "CPF (solo en este dispositivo)",
              )}
            </FieldLabel>
            <Input name="cpf" placeholder="000.000.000-00" defaultValue={tp?.cpf ?? ""} />
          </div>
        )}
        <div className="mb-3">
          <FieldLabel>{tr("Ano", "Year", "Año")}</FieldLabel>
          <Input name="year" type="number" defaultValue={account?.year} />
        </div>
        {jur.sc === "BR" && (
          <>
            <div className="mb-3">
              <FieldLabel>
                {tr(
                  "Prejuízo DT a compensar",
                  "Day-trade loss to carry forward",
                  "Pérdida de day trade a compensar",
                )}{" "}
                ({jur.sym})
              </FieldLabel>
              <Input name="loss" type="number" min={0} defaultValue={account?.initialLoss ?? 0} />
            </div>
            <div className="mb-3">
              <FieldLabel>
                {tr(
                  "Prejuízo swing a compensar",
                  "Swing loss to carry forward",
                  "Pérdida de swing a compensar",
                )}{" "}
                ({jur.sym})
              </FieldLabel>
              <Input
                name="sloss"
                type="number"
                min={0}
                defaultValue={account?.swingInitialLoss ?? 0}
              />
            </div>
          </>
        )}
        <p className="mb-3 rounded-lg border border-warn/25 bg-warn/10 px-3 py-2 text-2xs leading-relaxed text-warn">
          {jur.flag} {jur.name} — {jur.note}
        </p>
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            {tr("Salvar", "Save", "Guardar")}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            {tr("Cancelar", "Cancel", "Cancelar")}
          </Button>
        </div>
      </form>
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">
          {tr("Todas as contas", "All accounts", "Todas las cuentas")}
        </h2>
        {accounts.map((ac) => (
          <div
            key={ac.id}
            className="flex items-center justify-between gap-2 border-b border-border py-2 last:border-0"
          >
            <span className="text-sm">
              {J[ac.country]?.flag} {ac.name} ({ac.broker})
            </span>
            <div className="flex gap-1.5">
              {ac.id === account?.id ? (
                <span className="text-2xs font-semibold text-accent">
                  {tr("Ativa", "Active", "Activa")}
                </span>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => setActive(ac.id)}>
                  {tr("Usar", "Use", "Usar")}
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (
                    confirm(
                      tr("Excluir esta conta?", "Delete this account?", "¿Eliminar esta cuenta?"),
                    )
                  )
                    deleteAccount(ac.id);
                }}
              >
                {tr("Excluir", "Delete", "Eliminar")}
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold">{tr("Dados", "Data", "Datos")}</h2>
        <p className="mb-3 text-2xs text-muted">
          {tr(
            "Salvos neste dispositivo. Backup JSON restaura contas, operações e carteira.",
            "Saved on this device. A JSON backup restores accounts, trades, and the portfolio.",
            "Guardados en este dispositivo. Un respaldo JSON restaura cuentas, operaciones y la cartera.",
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (!account) return;
              const list = tradesMap[account.id] ?? [];
              downloadText(`${account.name.replace(/\s+/g, "_")}.csv`, tradesToCSV(list, jur));
              toast.success(tr("CSV exportado", "CSV exported", "CSV exportado"));
            }}
          >
            {tr("Exportar CSV", "Export CSV", "Exportar CSV")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              downloadText(
                "tradingpro-backup.json",
                JSON.stringify(exportSnapshot(), null, 2),
                "application/json",
              );
              toast.success(tr("Backup baixado", "Backup downloaded", "Respaldo descargado"));
            }}
          >
            {tr("Baixar backup", "Download backup", "Descargar respaldo")}
          </Button>
          <label className="inline-flex">
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                const r = new FileReader();
                r.onload = () => {
                  try {
                    const parsed: unknown = JSON.parse(String(r.result || ""));
                    if (!isBackup(parsed) || !restoreBackup(parsed)) {
                      toast.error(
                        tr(
                          "Arquivo de backup inválido",
                          "Invalid backup file",
                          "Archivo de respaldo no válido",
                        ),
                      );
                      return;
                    }
                    onClose();
                    toast.success(
                      tr("Backup restaurado", "Backup restored", "Respaldo restaurado"),
                    );
                  } catch {
                    toast.error(
                      tr(
                        "Não foi possível ler o JSON",
                        "Could not read the JSON",
                        "No se pudo leer el JSON",
                      ),
                    );
                  }
                };
                r.readAsText(f);
              }}
            />
            <Button variant="secondary" size="sm" asChild>
              <span>{tr("Restaurar backup", "Restore backup", "Restaurar respaldo")}</span>
            </Button>
          </label>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              loadDemo();
              onClose();
              toast.success(
                tr("Demonstração restaurada", "Demo restored", "Demostración restaurada"),
              );
            }}
          >
            {tr("Restaurar demo", "Restore demo", "Restaurar demo")}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (
                confirm(
                  tr("Apagar TODOS os dados?", "Delete ALL data?", "¿Borrar TODOS los datos?"),
                )
              ) {
                clearAll();
              }
            }}
          >
            {tr("Limpar tudo", "Clear all", "Borrar todo")}
          </Button>
        </div>
      </div>
    </div>
  );
}
