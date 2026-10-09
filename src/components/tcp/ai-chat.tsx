import { useTr } from "@/lib/i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { askTaxAdvisor } from "@/lib/ai/tax-advisor";
import { answerLocally, type AdvisorFacts } from "@/lib/tcp/advisor";
import { formatDateBR, MONTHS } from "@/lib/tcp/format";
import { jurisdiction } from "@/lib/tcp/jurisdictions";
import {
  adv,
  buildAdvisorContext,
  calcConsol,
  calcDT,
  calcSwing,
  carry,
  darfDueDate,
  tradesInMonth,
} from "@/lib/tcp/tax";
import { useActiveAccount, useTcpStore } from "@/lib/tcp/store";
import type { Account, Trade } from "@/lib/tcp/types";
import { cn } from "@/lib/utils";

export function AiChat() {
  const tr = useTr();
  const welcome = tr(
    "Olá. Sou uma IA do Anzol, não uma pessoa e não um contador. Posso organizar DARF estimado, isenção de swing e o consolidado com os números das suas contas. Não prometo economia de imposto nem guia oficial. Se quiser uma pessoa, o horário comercial humano fica na Baleia e o canal dedicado no Enterprise.",
    "Hi. I'm an Anzol AI, not a person and not an accountant. I can organize an estimated DARF, the swing exemption and the combined filing with the numbers from your accounts. I don't promise tax savings or an official slip. If you want a person, human business hours are on Baleia and a dedicated channel is on Enterprise.",
    "Hola. Soy una IA de Anzol, no una persona ni un contador. Puedo organizar el DARF estimado, la exención de swing y el consolidado con los números de tus cuentas. No prometo ahorro de impuesto ni una guía oficial. Si quieres una persona, el horario comercial humano queda en Baleia y el canal dedicado en Enterprise.",
  );
  const suggestions = [
    tr("Quanto de DARF eu pago em janeiro?", "How much DARF do I pay in January?", "¿Cuánto DARF pago en enero?"),
    tr(
      "Posso compensar prejuízo de swing no day trade?",
      "Can I offset a swing loss against day trade?",
      "¿Puedo compensar una pérdida de swing en el day trade?",
    ),
    tr("Como fica o consolidado BTG + XP?", "What does the combined BTG + XP filing look like?", "¿Cómo queda el consolidado BTG + XP?"),
  ];
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<{ role: "ai" | "usr"; text: string }[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const accounts = useTcpStore((s) => s.accounts);
  const trades = useTcpStore((s) => s.trades);
  const activeId = useTcpStore((s) => s.activeId);
  const view = useTcpStore((s) => s.view);
  const account = useActiveAccount();

  const facts = useMemo(() => buildFacts(account, accounts, trades, view), [account, accounts, trades, view]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  function toggle() {
    setOpen((v) => {
      if (!v && msgs.length === 0) setMsgs([{ role: "ai", text: welcome }]);
      return !v;
    });
  }

  async function send(textRaw?: string) {
    const text = (textRaw ?? input).trim();
    if (!text || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "usr", text }]);
    setBusy(true);
    try {
      const context = buildAdvisorContext({ accounts, trades, activeId, view });
      const res = await askTaxAdvisor({ data: { question: text, context } });
      const local = facts ? answerLocally(text, facts) : "";
      const reply = res.ok && res.text.trim() ? res.text : local || (res.ok ? "" : res.error);
      setMsgs((m) => [...m, { role: "ai", text: reply || tr("Sem resposta no momento.", "No answer right now.", "Sin respuesta por ahora.") }]);
    } catch {
      const local = facts ? answerLocally(text, facts) : tr("Algo deu errado. Tente novamente.", "Something went wrong. Try again.", "Algo salió mal. Inténtalo de nuevo.");
      setMsgs((m) => [...m, { role: "ai", text: local }]);
    } finally {
      setBusy(false);
    }
  }

  const showTips = msgs.length === 1 && msgs[0]?.role === "ai";

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        className="no-print fab-ai flex size-12 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg transition-transform duration-150 hover:scale-105"
        aria-label={tr("Consultor fiscal IA", "AI tax advisor", "Asesor fiscal con IA")}
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </button>
      {open && (
        <div className="no-print fab-ai-panel z-40 flex h-[min(420px,calc(100dvh-11rem))] w-[min(340px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border-strong bg-surface shadow-2xl md:h-[min(500px,70dvh)]">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <div>
              <div className="text-sm font-semibold">Anzol</div>
              <div className="text-2xs text-muted">
                {tr(
                  "Isto é uma IA, não um contador. Horário comercial humano fica na Baleia. Canal dedicado, no Enterprise.",
                  "This is an AI, not an accountant. Human hours on business days are on Baleia. A dedicated channel is on Enterprise.",
                  "Esto es una IA, no un contador. El horario comercial humano queda en Baleia. El canal dedicado, en Enterprise.",
                )}
              </div>
            </div>
            <button type="button" className="p-1 text-muted hover:text-fg" onClick={() => setOpen(false)} aria-label={tr("Fechar chat", "Close chat", "Cerrar chat")}>
              <X className="size-4" />
            </button>
          </div>
          <div className="flex flex-1 flex-col space-y-2 overflow-y-auto p-3">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[88%] rounded-lg px-2.5 py-2 text-xs leading-relaxed",
                  m.role === "ai" ? "self-start rounded-tl-sm bg-card" : "ml-auto bg-accent text-accent-fg rounded-tr-sm",
                )}
              >
                {m.text}
              </div>
            ))}
            {showTips && (
              <div className="flex flex-col gap-1.5 pt-1">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="rounded-lg border border-border bg-card px-2.5 py-2 text-left text-2xs text-muted hover:border-accent hover:text-fg"
                    onClick={() => void send(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            {busy && <div className="max-w-[88%] rounded-lg bg-card px-2.5 py-2 text-xs text-muted">{tr("Analisando…", "Reviewing…", "Analizando…")}</div>}
            <div ref={endRef} />
          </div>
          <form
            className="flex gap-2 border-t border-border p-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              className="h-10 flex-1 rounded-full border border-border-strong bg-card px-3 text-base outline-none focus:border-accent md:text-xs"
              placeholder={tr("Pergunte sobre DARF, P&L, compliance…", "Ask about DARF, P&L, compliance…", "Pregunta sobre DARF, P&L, compliance…")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={busy}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg disabled:opacity-40"
              aria-label={tr("Enviar", "Send", "Enviar")}
            >
              <Send className="size-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function buildFacts(
  account: Account | null,
  accounts: Account[],
  tradesMap: Record<string, Trade[]>,
  view: string,
): AdvisorFacts | null {
  if (!account) return null;
  const jur = jurisdiction(account.country);
  const all = tradesMap[account.id] ?? [];
  const parsed = Number.parseInt(view, 10);
  const month = Number.isFinite(parsed) ? parsed : 0;
  const monthTrades = tradesInMonth(all, month);
  const dtC = carry(all, month, "dt", account, jur);
  const swC = carry(all, month, "sw", account, jur);
  const tax = calcDT(monthTrades, dtC, account, jur);
  const sw = calcSwing(monthTrades, swC, jur);
  const consol = calcConsol(month, account, accounts, tradesMap);
  const stats = adv(monthTrades, jur.sc);
  const due = darfDueDate(account.year, month);
  return {
    month: MONTHS[month],
    year: account.year,
    account: account.name,
    broker: account.broker,
    trades: monthTrades.length,
    net: tax.net,
    darfDT: tax.darf ?? 0,
    darfSW: sw.count && !sw.exempt ? sw.darf : 0,
    darfTotal: (tax.darf ?? 0) + (sw.count && !sw.exempt ? sw.darf : 0),
    irrf: tax.irrf,
    swingExempt: sw.exempt,
    swingSales: sw.totalVendas,
    swingCount: sw.count,
    consol: consol?.totalDARF ?? null,
    consolAccounts: consol?.accounts ?? [],
    due: formatDateBR(due),
    carryDT: tax.nc,
    carrySW: sw.nc,
    winRate: stats.wr,
    pf: stats.pf,
    note: jur.note,
  };
}
