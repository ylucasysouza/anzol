import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { readLocale, setActiveLocale, type Locale } from "./locale.ts";
export { readLocale, type Locale };

function initialLocale(): Locale {
  if (typeof window === "undefined") return "pt";
  try {
    const saved = localStorage.getItem("anzol-locale");
    if (saved === "pt" || saved === "en" || saved === "es") return saved;
  } catch {
    /* ignore */
  }
  return "pt";
}

const dict: Record<Locale, Record<string, string>> = {
  pt: {
    month: "Mês",
    carteira: "Carteira",
    casa: "Casa",
    mov: "Movimentos",
    analytics: "Análise",
    aprenda: "Aprenda",
    more: "Mais",
    splashTitle: "Anzol",
    splashBody: "Abrindo os dados desta conta.",
    leadTitle: "Bem-vindo ao Anzol",
    leadBody: "Entre para ligar celular e computador. Cada pessoa fica com a própria conta. Se você apagar o ícone num aparelho, a conta dos outros continua.",
    name: "Nome",
    email: "E-mail",
    phone: "Telefone",
    password: "Senha",
    create: "Criar conta",
    enter: "Entrar",
    haveAccount: "Já tenho conta",
    newAccount: "Criar conta com e-mail",
    wait: "Aguarde…",
    leadError: "Não consegui entrar. Confira o e-mail e a senha.",
    signupError: "Não foi possível criar a conta. Tente outro e-mail.",
    synced: "Sincronizado",
    syncing: "Sincronizando…",
    updatedFrom: "Atualizado do {name}",
    syncSent: "Sincronizado. Os outros aparelhos desta conta recebem isto.",
    syncReceived: "Atualizado do {name}. Movimentações atualizadas.",
    syncError: "Sem nuvem agora. Os dados continuam aqui.",
    movesTitle: "Movimentações",
    movesBody: "O que entrou e saiu em {month}. Se o outro aparelho mudar, a lista atualiza sozinha.",
    inLabel: "Entrou",
    outLabel: "Saiu",
    leftLabel: "Sobra",
    emptyMoves: "Nenhuma movimentação neste mês.",
    cardNote: "Compras no crédito não saem do caixa neste mês. A fatura entra quando for paga.",
    ops: "Operações",
    thisMonth: "neste mês",
    winRate: "Win rate",
    netPnl: "P&L líquido",
    afterCosts: "após custos",
    profitFactor: "Profit factor",
    expectancy: "Expectativa",
    bestWorst: "Melhor / pior",
    language: "Idioma",
    localUse: "Usar neste aparelho",
    signIn: "Entrar",
    annual: "Anual",
    annualHint: "Carnê-Leão, DIRPF e estimativas",
    consol: "Consolidado",
    consolHint: "Várias corretoras, um DARF",
    casaHint: "Orçamento, fluxo, patrimônio e metas",
    movesHint: "O que entrou e saiu, nos dois aparelhos",
    learnHint: "Tributação, ativos e mercado",
    importCsv: "Importar CSV",
    importHint: "Notas de corretagem",
    plans: "Planos",
    plansHint: "Free, Pro, Baleia e Enterprise",
    installApp: "Instalar aplicativo",
    installed: "App instalado",
    installHint: "Navegador, celular ou computador",
    installedHint: "Aberto pelo ícone",
    sendAnzol: "Compartilhar o projeto",
    sendHint: "O código, para outro bot editar",
    account: "Conta",
    accountHint: "Ligar celular e computador",
    settings: "Configurações",
    settingsHint: "Conta, backup e CPF",
    importBtn: "Importar",
    installBtn: "Instalar",
    newAccountBtn: "Nova conta",
    selectAccount: "Selecionar",
    today: "Hoje",
    guide: "Guia",
    due: "vence {date}",
    casaThisMonth: "Casa neste mês",
    incomeWord: "receitas",
    balanceWord: "saldo",
    theme: "Alternar tema",
    casaSub: "Orçamento, fluxo, patrimônio, cartão e metas",
    casaDash: "Resumo",
    casaBudget: "Orçamento",
    casaFlow: "Fluxo",
    casaWorth: "Patrimônio",
    casaCard: "Cartão",
    casaGoals: "Metas",
  },
  en: {
    month: "Month",
    carteira: "Portfolio",
    casa: "Household",
    mov: "Cash flow",
    analytics: "Analysis",
    aprenda: "Learn",
    more: "More",
    splashTitle: "Anzol",
    splashBody: "Opening this account’s data.",
    leadTitle: "Welcome to Anzol",
    leadBody: "Sign in to link your phone and computer. Each person keeps their own account. Deleting the icon on one device does not remove anyone else's.",
    name: "Name",
    email: "Email",
    phone: "Phone",
    password: "Password",
    create: "Create account",
    enter: "Sign in",
    haveAccount: "I already have an account",
    newAccount: "Create an account with email",
    wait: "Please wait…",
    leadError: "Could not sign in. Check the email and password.",
    signupError: "Could not create the account. Try another email.",
    synced: "Synced",
    syncing: "Syncing…",
    updatedFrom: "Updated from {name}",
    syncSent: "Synced. The other devices on this account will receive this.",
    syncReceived: "Updated from {name}. Cash movements refreshed.",
    syncError: "Cloud unavailable. Your data is still on this device.",
    movesTitle: "Cash movements",
    movesBody: "What came in and went out in {month}. If the other device changes, this list updates on its own.",
    inLabel: "In",
    outLabel: "Out",
    leftLabel: "Left",
    emptyMoves: "No movements this month.",
    cardNote: "Card purchases do not leave cash this month. The bill counts when it is paid.",
    ops: "Trades",
    thisMonth: "this month",
    winRate: "Win rate",
    netPnl: "Net P&L",
    afterCosts: "after costs",
    profitFactor: "Profit factor",
    expectancy: "Expectancy",
    bestWorst: "Best / worst",
    language: "Language",
    localUse: "Use on this device",
    signIn: "Sign in",
    annual: "Annual",
    annualHint: "Annual tax, estimates and filings",
    consol: "Combined",
    consolHint: "Several brokers, one tax slip",
    casaHint: "Budget, cash flow, wealth and goals",
    movesHint: "What came in and went out, on both devices",
    learnHint: "Tax, assets and markets",
    importCsv: "Import CSV",
    importHint: "Brokerage notes",
    plans: "Plans",
    plansHint: "Free, Pro, Baleia and Enterprise",
    installApp: "Install the app",
    installed: "App installed",
    installHint: "Browser, phone or computer",
    installedHint: "Opened from the icon",
    sendAnzol: "Share the project",
    sendHint: "The source, so another bot can edit it",
    account: "Account",
    accountHint: "Link phone and computer",
    settings: "Settings",
    settingsHint: "Account, backup and tax id",
    importBtn: "Import",
    installBtn: "Install",
    newAccountBtn: "New account",
    selectAccount: "Select",
    today: "Today",
    guide: "Guide",
    due: "due {date}",
    casaThisMonth: "Household this month",
    incomeWord: "income",
    balanceWord: "left",
    theme: "Toggle theme",
    casaSub: "Budget, cash flow, wealth, card and goals",
    casaDash: "Summary",
    casaBudget: "Budget",
    casaFlow: "Cash flow",
    casaWorth: "Wealth",
    casaCard: "Card",
    casaGoals: "Goals",
  },
  es: {
    month: "Mes",
    carteira: "Cartera",
    casa: "Casa",
    mov: "Movimientos",
    analytics: "Análisis",
    aprenda: "Aprender",
    more: "Más",
    splashTitle: "Anzol",
    splashBody: "Abriendo los datos de esta cuenta.",
    leadTitle: "Bienvenido a Anzol",
    leadBody: "Entra para unir el celular y la computadora. Cada persona conserva su cuenta. Borrar el ícono en un dispositivo no borra la cuenta de los demás.",
    name: "Nombre",
    email: "Correo",
    phone: "Teléfono",
    password: "Contraseña",
    create: "Crear cuenta",
    enter: "Entrar",
    haveAccount: "Ya tengo cuenta",
    newAccount: "Crear cuenta con correo",
    wait: "Espera…",
    leadError: "No pude entrar. Revisa el correo y la contraseña.",
    signupError: "No pude crear la cuenta. Prueba con otro correo.",
    synced: "Sincronizado",
    syncing: "Sincronizando…",
    updatedFrom: "Actualizado desde {name}",
    syncSent: "Sincronizado. Los otros dispositivos de esta cuenta reciben esto.",
    syncReceived: "Actualizado desde {name}. Movimientos actualizados.",
    syncError: "Sin nube ahora. Los datos siguen en este dispositivo.",
    movesTitle: "Movimientos",
    movesBody: "Lo que entró y salió en {month}. Si el otro dispositivo cambia, la lista se actualiza sola.",
    inLabel: "Entró",
    outLabel: "Salió",
    leftLabel: "Saldo",
    emptyMoves: "Ningún movimiento en este mes.",
    cardNote: "Las compras con tarjeta no salen de caja este mes. La factura entra cuando se paga.",
    ops: "Operaciones",
    thisMonth: "este mes",
    winRate: "Win rate",
    netPnl: "P&L neto",
    afterCosts: "después de costos",
    profitFactor: "Profit factor",
    expectancy: "Expectativa",
    bestWorst: "Mejor / peor",
    language: "Idioma",
    localUse: "Usar en este dispositivo",
    signIn: "Entrar",
    annual: "Anual",
    annualHint: "Impuesto anual, estimaciones y declaraciones",
    consol: "Consolidado",
    consolHint: "Varias corredoras, un solo impuesto",
    casaHint: "Presupuesto, flujo, patrimonio y metas",
    movesHint: "Lo que entró y salió, en los dos dispositivos",
    learnHint: "Impuestos, activos y mercado",
    importCsv: "Importar CSV",
    importHint: "Notas de corretaje",
    plans: "Planes",
    plansHint: "Free, Pro, Baleia y Enterprise",
    installApp: "Instalar la aplicación",
    installed: "App instalada",
    installHint: "Navegador, celular o computadora",
    installedHint: "Abierta desde el ícono",
    sendAnzol: "Compartir el proyecto",
    sendHint: "El código, para que otro bot lo edite",
    account: "Cuenta",
    accountHint: "Unir celular y computadora",
    settings: "Ajustes",
    settingsHint: "Cuenta, copia y documento",
    importBtn: "Importar",
    installBtn: "Instalar",
    newAccountBtn: "Nueva cuenta",
    selectAccount: "Elegir",
    today: "Hoy",
    guide: "Guía",
    due: "vence {date}",
    casaThisMonth: "Casa en este mes",
    incomeWord: "ingresos",
    balanceWord: "saldo",
    theme: "Cambiar tema",
    casaSub: "Presupuesto, flujo, patrimonio, tarjeta y metas",
    casaDash: "Resumen",
    casaBudget: "Presupuesto",
    casaFlow: "Flujo",
    casaWorth: "Patrimonio",
    casaCard: "Tarjeta",
    casaGoals: "Metas",
  },
};

const MONTH_LONG: Record<Locale, readonly string[]> = {
  pt: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  es: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
};

const MONTH_SHORT: Record<Locale, readonly string[]> = {
  pt: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  es: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
};

function translate(locale: Locale, key: string, vars?: Record<string, string>) {
  let text = dict[locale][key] ?? dict.pt[key] ?? key;
  if (vars) {
    for (const [name, val] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, val);
  }
  return text;
}

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string>) => string;
  monthName: (index: number) => string;
  monthShort: (index: number) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const next = initialLocale();
    setActiveLocale(next);
    return next;
  });

  useEffect(() => {
    setActiveLocale(locale);
    document.documentElement.lang = locale === "pt" ? "pt-BR" : locale === "es" ? "es" : "en";
  }, [locale]);

  const value = useMemo<I18nValue>(() => {
    setActiveLocale(locale);
    return {
      locale,
      setLocale: (next) => {
        setActiveLocale(next);
        setLocaleState(next);
        try {
          localStorage.setItem("anzol-locale", next);
        } catch {
          /* ignore */
        }
      },
      t: (key, vars) => translate(locale, key, vars),
      monthName: (index) => MONTH_LONG[locale][index] ?? MONTH_LONG.pt[index] ?? "",
      monthShort: (index) => MONTH_SHORT[locale][index] ?? MONTH_SHORT.pt[index] ?? "",
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTr() {
  const { locale } = useI18n();
  return (pt: string, en: string, es: string) => (locale === "en" ? en : locale === "es" ? es : pt);
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: "pt",
      setLocale: () => {},
      t: (key, vars) => translate("pt", key, vars),
      monthName: (index) => MONTH_LONG.pt[index] ?? "",
      monthShort: (index) => MONTH_SHORT.pt[index] ?? "",
    };
  }
  return ctx;
}

export function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n();
  const options: { id: Locale; label: string }[] = [
    { id: "pt", label: "PT" },
    { id: "en", label: "EN" },
    { id: "es", label: "ES" },
  ];
  return (
    <div className="flex items-center gap-1" role="group" aria-label={t("language")}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => setLocale(opt.id)}
          className={
            "min-h-9 rounded-full px-3 text-xs font-semibold " +
            (locale === opt.id ? "bg-accent text-accent-fg" : "bg-card text-muted")
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
