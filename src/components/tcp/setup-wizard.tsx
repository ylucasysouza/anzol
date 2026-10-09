import { useMemo, useState } from "react";
import { Globe2, Landmark, MapPinned, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { useTr } from "@/lib/i18n";
import { brokersFor, CONTINENTS, J } from "@/lib/tcp/jurisdictions";
import { useTcpStore } from "@/lib/tcp/store";
import { cn } from "@/lib/utils";
import { useEntitlement } from "@/lib/tcp/entitlement";
import { accountLimit, countryAllowed } from "@/lib/tcp/plans";
import { requestPlans } from "./plan-gate";

const REGION_ICONS = {
  Americas: Globe2,
  Europe: Landmark,
  "Asia-Pac": MapPinned,
} as const;

export function SetupWizard({
  onCreated,
  onCancel,
}: {
  onCreated?: () => void;
  onCancel?: () => void;
}) {
  const tr = useTr();
  const ent = useEntitlement();
  const accountCount = useTcpStore((s) => s.accounts.length);
  const createAccount = useTcpStore((s) => s.createAccount);
  const loadDemo = useTcpStore((s) => s.loadDemo);
  const taxpayers = useTcpStore((s) => s.taxpayers);
  const [step, setStep] = useState(1);
  const [cont, setCont] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [broker, setBroker] = useState<string | null>(null);
  const [tpId, setTpId] = useState<string | null | undefined>(undefined);
  const [bracket, setBracket] = useState(0.22);
  const [name, setName] = useState("");
  const [trader, setTrader] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [loss, setLoss] = useState("");
  const [swingLoss, setSwingLoss] = useState("");
  const [ptax, setPtax] = useState("");
  const [block, setBlock] = useState("");

  const countries = useMemo(
    () => (cont ? (CONTINENTS[cont] ?? []).filter((c) => J[c]) : []),
    [cont],
  );
  const jur = country ? J[country] : null;
  const brokers = country ? brokersFor(country) : [];
  const existingTps = taxpayers.filter(
    (tp) =>
      country &&
      (tp.country === country || tp.country === (country === "BR_INTL" ? "BR" : country)),
  );
  const yrs = [year - 2, year - 1, year, year + 1];

  function launch() {
    if (!country || !jur) return;
    if (accountCount >= accountLimit(ent)) {
      setBlock("limit");
      requestPlans();
      return;
    }
    if (!countryAllowed(ent, country)) {
      setBlock("country");
      requestPlans();
      return;
    }
    createAccount({
      name: name.trim() || tr("Minha conta", "My account", "Mi cuenta"),
      trader: trader.trim() || "Trader",
      country,
      broker: broker || "Other",
      year,
      taxRate: jur.rate,
      usBracket: bracket,
      initialLoss: parseFloat(loss) || 0,
      swingInitialLoss: parseFloat(swingLoss) || 0,
      avgPTAX: parseFloat(ptax) || 0,
      tpId: tpId ?? null,
    });
    onCreated?.();
  }

  function openDemo() {
    if (accountLimit(ent) < 2) {
      setBlock("limit");
      requestPlans();
      return;
    }
    loadDemo();
    onCreated?.();
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="mb-1 text-2xl font-semibold tracking-tight">
        Trading<span className="text-accent">Pro</span>
      </div>
      <p className="mb-8 max-w-md text-center text-sm text-muted">
        {tr(
          "Compliance universal · multi-corretora · IA fiscal · 25+ jurisdições",
          "Universal compliance · multi-broker · tax AI · 25+ jurisdictions",
          "Cumplimiento universal · varias corredoras · IA fiscal · 25+ jurisdicciones",
        )}
      </p>

      <div className="mb-6 flex justify-center gap-1.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-200",
              i === step ? "w-6 bg-accent" : "w-1.5 bg-faint",
            )}
          />
        ))}
      </div>

      <div className="w-full max-w-lg">
        {step === 1 && (
          <div>
            <h1 className="text-lg font-semibold">
              {tr("Escolha sua região", "Choose your region", "Elige tu región")}
            </h1>
            <p className="mb-5 text-sm text-muted">
              {tr(
                "Onde você opera ou declara impostos?",
                "Where do you trade or file taxes?",
                "¿Dónde operas o declaras impuestos?",
              )}
            </p>
            <div className="mb-6 grid grid-cols-3 gap-2.5">
              {(Object.keys(CONTINENTS) as Array<keyof typeof REGION_ICONS>).map((c) => {
                const Icon = REGION_ICONS[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCont(c);
                      setCountry(null);
                      setBroker(null);
                      setStep(2);
                    }}
                    className={cn(
                      "rounded-xl border bg-card px-3 py-6 text-center transition-colors duration-150",
                      cont === c
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent",
                    )}
                  >
                    <Icon className="mx-auto mb-2 size-6 text-accent" />
                    <div className="text-xs font-semibold">{c}</div>
                  </button>
                );
              })}
            </div>
            <Button className="w-full" onClick={openDemo}>
              <Sparkles className="size-4" />
              {tr(
                "Explorar demonstração Brasil",
                "Explore the Brazil demo",
                "Explorar la demostración de Brasil",
              )}
            </Button>
            <p className="mt-2 text-center text-2xs text-muted">
              {tr(
                "Contas BTG + XP, DARF 6015, consolidado e carteira B3 já preenchidos. Depois instale na tela inicial do celular.",
                "BTG + XP accounts, DARF 6015, consolidated view, and the B3 portfolio are already filled in. Then install it on your phone's home screen.",
                "Cuentas BTG + XP, DARF 6015, consolidado y cartera B3 ya cargados. Después instálalo en la pantalla de inicio del celular.",
              )}
            </p>
            {onCancel && (
              <Button variant="ghost" className="mt-2 w-full" onClick={onCancel}>
                {tr("Cancelar", "Cancel", "Cancelar")}
              </Button>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-lg font-semibold">
              {tr("País e corretora", "Country and broker", "País y corredora")}
            </h1>
            <p className="mb-5 text-sm text-muted">
              {tr(
                "Selecione o país e a plataforma de trading",
                "Select the country and the trading platform",
                "Selecciona el país y la plataforma de trading",
              )}
            </p>
            <FieldLabel>{tr("País", "Country", "País")}</FieldLabel>
            <div className="mb-4 grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {countries.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCountry(c);
                    setBroker(null);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors duration-150",
                    country === c
                      ? "border-accent bg-accent/10"
                      : "border-border bg-card hover:border-accent",
                  )}
                >
                  <span className="w-8 shrink-0 font-mono text-2xs text-muted">{J[c].flag}</span>
                  <span>{J[c].name}</span>
                </button>
              ))}
            </div>
            {country && (
              <>
                <FieldLabel>
                  {tr("Corretora / plataforma", "Broker / platform", "Corredora / plataforma")}
                </FieldLabel>
                <div className="mb-4 grid max-h-52 grid-cols-2 gap-2 overflow-y-auto">
                  {brokers.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBroker(b)}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-colors duration-150",
                        broker === b
                          ? "border-accent bg-accent/10"
                          : "border-border bg-card hover:border-accent",
                      )}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setStep(1)}>
                {tr("Voltar", "Back", "Volver")}
              </Button>
              {country && (
                <Button className="flex-1" onClick={() => setStep(3)}>
                  {tr("Continuar", "Continue", "Continuar")}
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 3 && jur && country && (
          <div>
            <h1 className="text-lg font-semibold">
              {tr("Configurar conta", "Set up account", "Configurar cuenta")}
            </h1>
            <p className="mb-5 text-sm text-muted">
              {tr(
                "Dados desta conta de trading",
                "Details for this trading account",
                "Datos de esta cuenta de trading",
              )}
            </p>
            <div className="mb-3">
              <FieldLabel>{tr("Nome da conta", "Account name", "Nombre de la cuenta")}</FieldLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tr(
                  "ex: BTG Day Trade 2026",
                  "e.g. BTG Day Trade 2026",
                  "ej.: BTG Day Trade 2026",
                )}
              />
            </div>
            <div className="mb-3">
              <FieldLabel>
                {tr("Trader / empresa", "Trader / company", "Trader / empresa")}
              </FieldLabel>
              <Input
                value={trader}
                onChange={(e) => setTrader(e.target.value)}
                placeholder={tr("ex: Lucas Souza", "e.g. Lucas Souza", "ej.: Lucas Souza")}
              />
            </div>
            <div className="mb-3">
              <FieldLabel>{tr("Ano-calendário", "Calendar year", "Año calendario")}</FieldLabel>
              <Select value={String(year)} onChange={(e) => setYear(parseInt(e.target.value, 10))}>
                {yrs.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
            {country === "US" && (
              <div className="mb-3">
                <FieldLabel>
                  {tr(
                    "Faixa de IR (estimativa)",
                    "Estimated tax bracket",
                    "Tramo de impuesto estimado",
                  )}
                </FieldLabel>
                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 12, 22, 24, 32, 35, 37].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setBracket(r / 100)}
                      className={cn(
                        "rounded-lg border py-2 text-xs font-semibold",
                        bracket === r / 100
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-card",
                      )}
                    >
                      {r}%
                    </button>
                  ))}
                </div>
              </div>
            )}
            {country === "BR_INTL" && (
              <div className="mb-3">
                <FieldLabel>
                  {tr(
                    "PTAX média do ano (USD/BRL)",
                    "Average PTAX for the year (USD/BRL)",
                    "PTAX promedio del año (USD/BRL)",
                  )}
                </FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={ptax}
                  onChange={(e) => setPtax(e.target.value)}
                  placeholder={tr("ex: 5.40", "e.g. 5.40", "ej.: 5.40")}
                />
              </div>
            )}
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
                  <Input
                    type="number"
                    min={0}
                    value={loss}
                    onChange={(e) => setLoss(e.target.value)}
                    placeholder={tr("0,00", "0.00", "0.00")}
                  />
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
                    type="number"
                    min={0}
                    value={swingLoss}
                    onChange={(e) => setSwingLoss(e.target.value)}
                    placeholder={tr("0,00", "0.00", "0.00")}
                  />
                </div>
              </>
            )}
            {existingTps.length > 0 && (
              <div className="mb-3">
                <FieldLabel>
                  {tr(
                    "Vincular a um contribuinte existente?",
                    "Link to an existing taxpayer?",
                    "¿Vincular a un contribuyente existente?",
                  )}
                </FieldLabel>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => setTpId(null)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-left",
                      tpId === null ? "border-accent bg-accent/10" : "border-border bg-card",
                    )}
                  >
                    <div className="text-sm font-semibold">
                      {tr("Nova pessoa", "New person", "Nueva persona")}
                    </div>
                    <div className="text-2xs text-muted">
                      {tr(
                        "Cria um perfil de contribuinte novo",
                        "Creates a new taxpayer profile",
                        "Crea un perfil de contribuyente nuevo",
                      )}
                    </div>
                  </button>
                  {existingTps.map((tp) => (
                    <button
                      key={tp.id}
                      type="button"
                      onClick={() => setTpId(tp.id)}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left",
                        tpId === tp.id ? "border-accent bg-accent/10" : "border-border bg-card",
                      )}
                    >
                      <div className="text-sm font-semibold">
                        {tr("Vincular a", "Link to", "Vincular a")}: {tp.name}
                      </div>
                      <div className="text-2xs text-muted">
                        {tr(
                          "Mesma pessoa, várias corretoras — DARF consolidado",
                          "Same person, multiple brokers — consolidated DARF",
                          "Misma persona, varias corredoras — DARF consolidado",
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mb-4 rounded-lg border border-warn/25 bg-warn/10 px-3 py-2.5 text-2xs leading-relaxed text-warn">
              {jur.flag} {jur.name} — {jur.note}
            </div>
            {block && (
              <p className="mb-3 text-sm text-muted">
                {block === "country"
                  ? tr(
                      "Outro país entra na Baleia. A conta não foi criada.",
                      "Another country is on Baleia. The account was not created.",
                      "Otro país entra en Baleia. La cuenta no se creó.",
                    )
                  : tr(
                      "Este plano não aceita outra conta. Nada foi criado.",
                      "This plan does not allow another account. Nothing was created.",
                      "Este plan no acepta otra cuenta. No se creó nada.",
                    )}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setStep(2)}>
                {tr("Voltar", "Back", "Volver")}
              </Button>
              <Button className="flex-1" onClick={launch}>
                {tr("Criar conta", "Create account", "Crear cuenta")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
