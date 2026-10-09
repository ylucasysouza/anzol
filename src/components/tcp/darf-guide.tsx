import { useI18n, useTr } from "@/lib/i18n";
import { Copy, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatDateBR, formatMoney } from "@/lib/tcp/format";
import { jurisdiction } from "@/lib/tcp/jurisdictions";
import { calcConsol, calcDT, calcSwing, carry, darfDueDate, tradesInMonth } from "@/lib/tcp/tax";
import { useActiveAccount, useTcpStore } from "@/lib/tcp/store";
import { Row } from "./metric-card";
import { useEntitlement } from "@/lib/tcp/entitlement";
import { allowsPdf } from "@/lib/tcp/plans";
import { FiscalNote, requestPlans } from "./plan-gate";

export function DarfGuide({
  open,
  onOpenChange,
  month,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  month: number;
}) {
  const account = useActiveAccount();
  const taxpayers = useTcpStore((s) => s.taxpayers);
  const accounts = useTcpStore((s) => s.accounts);
  const tradesMap = useTcpStore((s) => s.trades);
  const tr = useTr();
  const ent = useEntitlement();
  const { monthName } = useI18n();
  if (!account) return null;
  const jur = jurisdiction(account.country);
  if (jur.sc !== "BR") return null;

  const all = tradesMap[account.id] ?? [];
  const trades = tradesInMonth(all, month);
  const dtC = carry(all, month, "dt", account, jur);
  const swC = carry(all, month, "sw", account, jur);
  const tax = calcDT(trades, dtC, account, jur);
  const swTax = calcSwing(trades, swC, jur);
  const consol = calcConsol(month, account, accounts, tradesMap);
  const due = darfDueDate(account.year, month);
  const tp = taxpayers.find((t) => t.id === account.taxpayerId);
  const darfDT = tax.darf ?? 0;
  const darfSW = swTax.count && !swTax.exempt ? swTax.darf : 0;
  const total = consol ? consol.totalDARF : darfDT + darfSW;
  const amount = formatMoney(total, "R$");
  const copyValue = total.toFixed(2).replace(".", ",");

  function copy() {
    void navigator.clipboard.writeText(copyValue);
    toast.success(tr("Valor copiado", "Amount copied", "Valor copiado"));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        title={tr("Guia DARF 6015", "DARF 6015 guide", "Guía DARF 6015")}
        description={tr(
          "Resumo para pagamento no Sicalc / internet banking. Confira na nota de corretagem antes de recolher.",
          "Summary for payment in Sicalc / online banking. Check the brokerage note before you pay.",
          "Resumen para el pago en Sicalc / banca en línea. Revisa la nota de corretaje antes de pagar.",
        )}
      >
        <div className="darf-sheet rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-2xs font-semibold uppercase tracking-wider text-muted">Receita Federal</div>
              <div className="text-base font-semibold">{tr("DARF — código 6015", "DARF — code 6015", "DARF — código 6015")}</div>
              <div className="text-2xs text-muted">
                {tr("Ganhos líquidos em operações na bolsa", "Net gains on exchange trades", "Ganancias netas en operaciones de bolsa")}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xs text-muted">{tr("Vencimento", "Due date", "Vencimiento")}</div>
              <div className="font-mono text-sm font-semibold tabular-nums">{formatDateBR(due)}</div>
            </div>
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
            <Info k={tr("Contribuinte", "Taxpayer", "Contribuyente")} v={tp?.name || account.trader} />
            <Info k="CPF" v={tp?.cpf || tr("— (preencha em Configurações)", "— (fill in under Settings)", "— (complétalo en Ajustes)")} />
            <Info k={tr("Período de apuração", "Filing period", "Período de declaración")} v={`${monthName(month)}/${account.year}`} />
            <Info k={tr("Código da receita", "Revenue code", "Código de ingreso")} v="6015" />
          </div>
          <Row label={tr("Day trade (20%)", "Day trade (20%)", "Day trade (20%)")} value={formatMoney(darfDT, "R$")} tone="warn" />
          {swTax.count > 0 && (
            <Row
              label={
                swTax.exempt
                  ? tr("Swing (isento ≤ R$20 mil)", "Swing (exempt ≤ R$20,000)", "Swing (exento ≤ R$20 mil)")
                  : tr("Swing / posição (15%)", "Swing / position (15%)", "Swing / posición (15%)")
              }
              value={formatMoney(darfSW, "R$")}
            />
          )}
          <Row label={tr("IRRF já retido (DT)", "IRRF already withheld (DT)", "IRRF ya retenido (DT)")} value={formatMoney(tax.irrf, "R$")} tone="gain" />
          {consol && (
            <Row
              label={tr(
                `Consolidado (${consol.accounts.length} contas)`,
                `Combined (${consol.accounts.length} accounts)`,
                `Consolidado (${consol.accounts.length} cuentas)`,
              )}
              value={formatMoney(consol.totalDARF, "R$")}
            />
          )}
          <div className="mt-3 flex items-center justify-between rounded-lg border border-accent/30 bg-accent/10 px-4 py-3">
            <span className="text-2xs font-semibold uppercase tracking-wider text-accent">
              {tr("Valor a recolher", "Amount due", "Valor a pagar")}
            </span>
            <span className="font-mono text-xl font-semibold tabular-nums">{amount}</span>
          </div>
          <p className="mt-3 text-2xs leading-relaxed text-faint">
            {tr(
              "Recolha até o último dia útil do mês seguinte no Sicalc (Receita Federal) ou no internet banking, código 6015. Ferramenta de apoio — não substitui a nota de corretagem nem o cálculo oficial.",
              "Pay by the last business day of the following month in Sicalc (Receita Federal) or online banking, code 6015. This is a support tool — it does not replace the brokerage note or the official calculation.",
              "Paga hasta el último día hábil del mes siguiente en Sicalc (Receita Federal) o en la banca en línea, código 6015. Es una herramienta de apoyo: no reemplaza la nota de corretaje ni el cálculo oficial.",
            )}
          </p>
          <FiscalNote />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 no-print">
          <Button variant="secondary" className="flex-1" onClick={copy}>
            <Copy className="size-3.5" />
            {tr("Copiar", "Copy", "Copiar")} {copyValue}
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              if (!allowsPdf(ent)) {
                toast.message(
                  tr(
                    "PDF para o contador entra no Pro. Nada foi gerado.",
                    "A PDF for your accountant is on Pro. Nothing was generated.",
                    "El PDF para el contador entra en Pro. No se generó nada.",
                  ),
                );
                requestPlans();
                return;
              }
              onOpenChange(false);
              setTimeout(() => window.print(), 120);
            }}
          >
            <Printer className="size-3.5" />
            {tr("Imprimir guia", "Print guide", "Imprimir guía")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-border bg-inset px-3 py-2">
      <div className="text-2xs uppercase tracking-wider text-muted">{k}</div>
      <div className="mt-0.5 font-medium">{v}</div>
    </div>
  );
}
