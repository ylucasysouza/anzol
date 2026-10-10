import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FieldLabel, Input, Textarea } from "@/components/ui/input";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useTr, useI18n } from "@/lib/i18n";
import { cancelEntitlement } from "@/lib/tcp/entitlement-api";
import { useEntitlement } from "@/lib/tcp/entitlement";
import { saveLead } from "@/lib/tcp/leads";
import { CHECKOUT, PLAN_PRICE } from "@/lib/tcp/plans";

function openPay(url: string, empty: string) {
  if (!url) {
    toast.message(empty);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export function PlansDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const tr = useTr();
  const { locale } = useI18n();
  const ent = useEntitlement();
  const { user } = useCurrentUserState();
  const [sales, setSales] = useState(false);
  const [busy, setBusy] = useState(false);
  const dev = ent.role === "developer";
  const emptyPay = tr(
    "O link de pagamento da empresa ainda não está ligado. Nada foi cobrado.",
    "The company payment link is not connected yet. Nothing was charged.",
    "El enlace de pago de la empresa todavía no está conectado. No se cobró nada.",
  );

  async function sendSales(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    const company = String(fd.get("company") || "").trim();
    const message = String(fd.get("message") || "").trim();
    setBusy(true);
    try {
      await saveLead({
        data: {
          name,
          email,
          phone,
          locale,
          stage: "novo",
          dest: "marketing",
          source: `enterprise | ${company} | ${message}`.slice(0, 400),
        },
      });
      toast.success(tr("Recebemos. Vendas retorna por este contato.", "Received. Sales will reply on this contact.", "Recibido. Ventas responde por este contacto."));
      setSales(false);
    } catch {
      toast.error(tr("Não consegui guardar. Confira nome, e-mail e telefone.", "Could not save. Check name, email and phone.", "No pude guardar. Revisa nombre, correo y teléfono."));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    try {
      await cancelEntitlement();
      toast.success(
        tr(
          "Cancelamento marcado para o fim do período já pago. Até lá o plano segue.",
          "Cancellation is set for the end of the period already paid. The plan stays until then.",
          "La cancelación queda para el fin del período ya pagado. El plan sigue hasta entonces.",
        ),
      );
    } catch {
      toast.error(tr("Não consegui marcar o cancelamento agora.", "Could not mark the cancellation now.", "No pude marcar la cancelación ahora."));
    }
  }

  const plans = [
    {
      id: "free",
      name: "Anzol Free",
      price: "R$ 0",
      per: "",
      note: tr("Para começar a organizar o imposto das operações.", "To start organizing the tax on your trades.", "Para empezar a organizar el impuesto de las operaciones."),
      feats: [
        tr("Day trade e swing trade", "Day trade and swing trade", "Day trade y swing trade"),
        tr("CSV e lançamento manual", "CSV and manual entry", "CSV y registro manual"),
        tr("1 conta · 90 dias", "1 account · 90 days", "1 cuenta · 90 días"),
        tr("Sem gastos, fluxo, API ou investimentos", "No household, cash flow, API or investments", "Sin gastos, flujo, API ni inversiones"),
      ],
    },
    {
      id: "pro",
      name: "Anzol Pro",
      price: "R$ 29,90",
      per: tr("/mês", "/mo", "/mes"),
      note: tr("Para fechar o mês com a vida financeira ligada.", "To close the month with the rest of your money attached.", "Para cerrar el mes con el resto de tu dinero ligado."),
      feats: [
        tr("Tudo do Free", "Everything in Free", "Todo lo de Free"),
        tr("Gastos da conta e fluxo de caixa", "Household entries and cash flow", "Gastos de la cuenta y flujo de caja"),
        tr("Até 3 contas · 24 meses · 1 usuário", "Up to 3 accounts · 24 months · 1 user", "Hasta 3 cuentas · 24 meses · 1 usuario"),
        tr("Alerta de DARF estimado. Não emite guia oficial.", "Estimated DARF alert. It does not issue an official slip.", "Aviso de DARF estimado. No emite una guía oficial."),
        tr("PDF e CSV para o contador", "PDF and CSV for your accountant", "PDF y CSV para el contador"),
      ],
    },
    {
      id: "baleia",
      name: "Anzol Baleia",
      price: "R$ 99,90",
      per: tr("/mês", "/mo", "/mes"),
      note: tr("Livro fiscal e livro gerencial no mesmo lugar.", "The tax book and the management book in one place.", "El libro fiscal y el libro de gestión en el mismo lugar."),
      feats: [
        tr("Tudo do Pro", "Everything in Pro", "Todo lo de Pro"),
        tr("API só de leitura", "Read-only API", "API solo de lectura"),
        tr("DRE, balanço e investimentos", "Income statement, balance sheet and investments", "Estado de resultados, balance e inversiones"),
        tr("Opções por corretora", "Broker-specific options", "Opciones por corredora"),
        tr("Multi-país: estimativa editável", "Multi-country: an estimate you can edit", "Multipaís: estimación que puedes editar"),
        tr("Até 10 contas · histórico ilimitado · 3 usuários", "Up to 10 accounts · unlimited history · 3 users", "Hasta 10 cuentas · historial ilimitado · 3 usuarios"),
      ],
    },
    {
      id: "enterprise",
      name: "Anzol Enterprise",
      price: tr("Sob consulta", "On request", "A consultar"),
      per: "",
      note: tr(
        `A partir de R$ ${PLAN_PRICE.enterpriseFrom.toLocaleString("pt-BR")}/mês. Mesa, escritório ou grupo.`,
        `From R$ ${PLAN_PRICE.enterpriseFrom.toLocaleString("pt-BR")}/month. A desk, a firm or a group.`,
        `Desde R$ ${PLAN_PRICE.enterpriseFrom.toLocaleString("pt-BR")}/mes. Mesa, oficina o grupo.`,
      ),
      feats: [
        tr("Tudo da Baleia", "Everything in Baleia", "Todo lo de Baleia"),
        tr("API de escrita, webhooks e SSO", "Write API, webhooks and SSO", "API de escritura, webhooks y SSO"),
        tr("White-label leve", "Light white-label", "Marca blanca ligera"),
        tr("Auditoria em lote", "Batch audit export", "Auditoría por lote"),
        tr("Contrato e nota da pessoa jurídica", "A contract and an invoice from the company", "Contrato y factura de la persona jurídica"),
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-5xl"
        title={tr("Planos", "Plans", "Planes")}
        description={tr(
          "Free, Pro 29,90, Baleia 99,90. Enterprise sob consulta. Sem período de teste.",
          "Free, Pro 29.90, Baleia 99.90. Enterprise on request. No trial period.",
          "Free, Pro 29,90, Baleia 99,90. Enterprise a consultar. Sin período de prueba.",
        )}
      >
        {dev && (
          <p className="mb-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs leading-relaxed text-fg">
            {tr(
              "Acesso de desenvolvedor: todos os planos, sem cobrança.",
              "Developer access: every plan, with no charge.",
              "Acceso de desarrollador: todos los planes, sin cobro.",
            )}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <div key={plan.id} className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-4">
              <div className="text-sm font-semibold">{plan.name}</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-fg">
                {plan.price}
                {plan.per && <span className="text-xs font-normal text-muted">{plan.per}</span>}
              </div>
              <p className="mt-2 text-2xs leading-relaxed text-muted">{plan.note}</p>
              <ul className="my-3 space-y-1 text-2xs leading-relaxed text-muted">
                {plan.feats.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <div className="mt-auto space-y-2">
                {plan.id === "pro" && (
                  <>
                    <p className="text-2xs text-muted">
                      {tr("Anual R$ 269.", "Yearly R$ 269.", "Anual R$ 269.")}
                    </p>
                    <Button className="w-full" size="sm" onClick={() => openPay(CHECKOUT.pro_month, emptyPay)}>
                      {tr("Pro mensal", "Pro monthly", "Pro mensual")}
                    </Button>
                    <Button variant="secondary" className="w-full" size="sm" onClick={() => openPay(CHECKOUT.pro_year, emptyPay)}>
                      {tr("Pro anual", "Pro yearly", "Pro anual")}
                    </Button>
                  </>
                )}
                {plan.id === "baleia" && (
                  <>
                    <p className="text-2xs text-muted">
                      {tr("Anual R$ 899.", "Yearly R$ 899.", "Anual R$ 899.")}
                    </p>
                    <Button className="w-full" size="sm" onClick={() => openPay(CHECKOUT.baleia_month, emptyPay)}>
                      {tr("Baleia mensal", "Baleia monthly", "Baleia mensual")}
                    </Button>
                    <Button variant="secondary" className="w-full" size="sm" onClick={() => openPay(CHECKOUT.baleia_year, emptyPay)}>
                      {tr("Baleia anual", "Baleia yearly", "Baleia anual")}
                    </Button>
                  </>
                )}
                {plan.id === "enterprise" && (
                  <Button variant="secondary" className="w-full" size="sm" onClick={() => setSales((v) => !v)}>
                    {tr("Falar com vendas", "Talk to sales", "Hablar con ventas")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        {sales && (
          <form onSubmit={(e) => void sendSales(e)} className="mt-4 grid gap-3 rounded-xl border border-border bg-inset p-4 sm:grid-cols-2">
            <div>
              <FieldLabel>{tr("Nome", "Name", "Nombre")}</FieldLabel>
              <Input name="name" required minLength={2} />
            </div>
            <div>
              <FieldLabel>{tr("E-mail", "Email", "Correo")}</FieldLabel>
              <Input name="email" type="email" required defaultValue={user?.primaryEmail ?? ""} />
            </div>
            <div>
              <FieldLabel>{tr("Telefone", "Phone", "Teléfono")}</FieldLabel>
              <Input name="phone" type="tel" required minLength={8} />
            </div>
            <div>
              <FieldLabel>{tr("Empresa", "Company", "Empresa")}</FieldLabel>
              <Input name="company" required minLength={2} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>{tr("Mensagem", "Message", "Mensaje")}</FieldLabel>
              <Textarea name="message" required minLength={4} rows={3} />
            </div>
            <div className="sm:col-span-2">
              <Button disabled={busy}>{busy ? tr("Enviando…", "Sending…", "Enviando…") : tr("Enviar para vendas", "Send to sales", "Enviar a ventas")}</Button>
            </div>
          </form>
        )}
        {user && !dev && ent.plan !== "free" && (
          <button type="button" className="mt-3 text-2xs text-muted underline-offset-2 hover:underline" onClick={() => void cancel()}>
            {tr("Cancelar no fim do ciclo", "Cancel at the end of the cycle", "Cancelar al fin del ciclo")}
          </button>
        )}
        <p className="mt-4 text-2xs leading-relaxed text-muted">
          {tr(
            "Ferramenta de organização e cálculo. Valide com contador. Regras mudam por país e por operação. Não prometemos economia de imposto, restituição ou ganho. Não emitimos DARF oficial e não substituímos a Receita nem o contador. Taxas por país são estimativas e podem ser editadas. A liberação do plano pago só acontece depois do pagamento confirmado. O rebaixamento vale no fim do ciclo.",
            "A tool for organization and calculation. Check it with an accountant. Rules change by country and by the type of trade. We do not promise tax savings, a refund or a gain. We do not issue an official DARF and we do not replace the tax authority or your accountant. Rates by country are estimates and can be edited. A paid plan unlocks only after the payment is confirmed. A downgrade takes effect at the end of the cycle.",
            "Herramienta de organización y cálculo. Valídala con un contador. Las reglas cambian según el país y la operación. No prometemos ahorro de impuesto, devolución ni ganancia. No emitimos un DARF oficial ni reemplazamos a la autoridad fiscal ni al contador. Las tasas por país son estimaciones y se pueden editar. El plan pago se libera solo después del pago confirmado. La baja rige al fin del ciclo.",
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
}
