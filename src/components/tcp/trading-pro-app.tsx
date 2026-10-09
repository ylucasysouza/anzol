import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeftRight, BarChart3, BookOpen, CalendarDays, ChevronDown, Download, Home, Layers, Menu, Monitor, Moon, Plus, Settings, Share, Sparkles, Sun, TrendingUp } from "lucide-react";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MONTHS_SHORT } from "@/lib/tcp/format";
import { J, jurisdiction } from "@/lib/tcp/jurisdictions";
import { hapticTap, initPwa, promptInstall } from "@/lib/tcp/pwa";
import { getSiblings, tradesInMonth } from "@/lib/tcp/tax";
import { useActiveAccount, useTcpStore } from "@/lib/tcp/store";
import { readVault, vaultNow } from "@/lib/tcp/vault";
import { isBackup } from "@/lib/tcp/backup";
import { CloudSync, SyncBar } from "./cloud-sync";
import { LeadGate, Splash } from "./gate";
import { HookEntrance } from "./hook-entrance";
import { LanguageSwitch, useI18n } from "@/lib/i18n";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { MovementsView } from "./movements-view";
import type { Position, Trade } from "@/lib/tcp/types";
import { cn } from "@/lib/utils";
import { CasaView } from "./casa-view";
import { AiChat } from "./ai-chat";
import { AnalyticsView, AnnualView, ConsolView } from "./annual-analytics";
import { ImportDialog, PlansDialog, PositionDialog, SettingsView, TradeDialog } from "./dialogs";
import { InstallDialog, OfflineBanner, SendDialog, useInstallState } from "./install-app";
import { LearnView } from "./learn-view";
import { MonthView } from "./month-view";
import { MoreView } from "./more-view";
import { PortfolioView } from "./portfolio-view";
import { SetupWizard } from "./setup-wizard";
import { bootstrapEntitlement, EntitlementSync, useEntitlement } from "@/lib/tcp/entitlement";
import { accountLimit } from "@/lib/tcp/plans";
import { FiscalNote, registerPlansOpener } from "./plan-gate";

const MOBILE_TABS = [
  { id: "month", label: "Mês", icon: CalendarDays },
  { id: "carteira", label: "Carteira", icon: TrendingUp },
  { id: "casa", label: "Casa", icon: Home },
  { id: "analytics", label: "Análise", icon: BarChart3 },
  { id: "more", label: "Mais", icon: Menu },
] as const;

function tabFromView(view: string, settings: boolean) {
  if (settings) return "more";
  if (view === "carteira") return "carteira";
  if (view === "casa") return "casa";
  if (view === "analytics") return "analytics";
  if (view === "annual" || view === "consol" || view === "more" || view === "aprenda" || view === "mov") return "more";
  return "month";
}

function hadBooksBeforeBilling(): boolean {
  try {
    const raw = localStorage.getItem("tcp8");
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { accounts?: unknown } };
      const accounts = parsed?.state?.accounts;
      if (Array.isArray(accounts) && accounts.length > 0) return true;
    }
  } catch {
    /* ignore */
  }
  const saved = readVault();
  return isBackup(saved) && saved.accounts.length > 0;
}

export function TradingProApp() {
  const [hydrated, setHydrated] = useState(false);
  const [setupNew, setSetupNew] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);
  const [bootCap, setBootCap] = useState(false);
  const theme = useTcpStore((s) => s.theme);
  const activeId = useTcpStore((s) => s.activeId);
  const accounts = useTcpStore((s) => s.accounts);
  const { user, isPending } = useCurrentUserState();

  useEffect(() => {
    initPwa();
    const id = window.setTimeout(() => setBootCap(true), 900);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cap = window.setTimeout(() => {
      if (!cancelled) setHydrated(true);
    }, 700);
    const finish = () => {
      if (cancelled) return;
      const ownerSeat = hadBooksBeforeBilling();
      const saved = readVault();
      if (!useTcpStore.getState().accounts.length && isBackup(saved) && saved.accounts.length) {
        useTcpStore.getState().restoreBackup(saved);
      }
      bootstrapEntitlement(ownerSeat);
      vaultNow();
      setHydrated(true);
    };
    const unsub = useTcpStore.persist.onFinishHydration(finish);
    void Promise.resolve(useTcpStore.persist.rehydrate()).finally(finish);
    return () => {
      cancelled = true;
      window.clearTimeout(cap);
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const light = theme === "light";
    document.documentElement.classList.toggle("light", light);
    document.documentElement.classList.toggle("dark", !light);
  }, [theme, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const id = window.setInterval(vaultNow, 4000);
    const unsub = useTcpStore.subscribe(() => vaultNow());
    return () => {
      window.clearInterval(id);
      unsub();
    };
  }, [hydrated]);

  const hasAccount = accounts.some((a) => a.id === activeId);
  const shell = setupNew || (hydrated && !hasAccount);

  if (!hydrated) {
    return (
      <>
        <CloudSync />
        <Splash />
        <HookEntrance />
      </>
    );
  }
  if (!user && accounts.length === 0 && isPending && !bootCap) {
    return (
      <>
        <CloudSync />
        <EntitlementSync />
        <Splash />
        <HookEntrance />
      </>
    );
  }
  if (!user && accounts.length === 0 && !localOnly) {
    return (
      <>
        <CloudSync />
        <EntitlementSync />
        <LeadGate onLocal={() => setLocalOnly(true)} />
        <HookEntrance />
      </>
    );
  }

  if (shell) {
    return (
      <>
        <Toaster theme={theme === "light" ? "light" : "dark"} position="top-center" />
        <CloudSync />
        <EntitlementSync />
        <SetupWizard
          onCreated={() => {
            setHydrated(true);
            setSetupNew(false);
          }}
          onCancel={hasAccount ? () => setSetupNew(false) : undefined}
        />
        <HookEntrance />
      </>
    );
  }

  return (
    <>
      <Toaster theme={theme === "light" ? "light" : "dark"} position="top-center" />
      <CloudSync />
      <EntitlementSync />
      <MainApp onNewAccount={() => setSetupNew(true)} />
      <HookEntrance />
    </>
  );
}

function MainApp({ onNewAccount }: { onNewAccount: () => void }) {
  const { t, monthShort } = useI18n();
  const { user } = useCurrentUserState();
  const ent = useEntitlement();
  const navigate = useNavigate();
  const account = useActiveAccount();
  const accounts = useTcpStore((s) => s.accounts);
  const taxpayers = useTcpStore((s) => s.taxpayers);
  const tradesMap = useTcpStore((s) => s.trades);
  const view = useTcpStore((s) => s.view);
  const theme = useTcpStore((s) => s.theme);
  const setView = useTcpStore((s) => s.setView);
  const setActive = useTcpStore((s) => s.setActive);
  const setTheme = useTcpStore((s) => s.setTheme);
  const jur = jurisdiction(account?.country);
  const sibs = getSiblings(accounts, account);
  const all = account ? (tradesMap[account.id] ?? []) : [];

  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeTipo, setTradeTipo] = useState<"dt" | "sw">("dt");
  const [editing, setEditing] = useState<Trade | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [posOpen, setPosOpen] = useState(false);
  const [posEdit, setPosEdit] = useState<Position | null>(null);
  const [settings, setSettings] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const { standalone } = useInstallState();
  const monthCounts = MONTHS_SHORT.map((_, i) => tradesInMonth(all, i).length);
  const mobileTab = tabFromView(view, settings);
  const isMonthView = mobileTab === "month";
  const now = new Date();
  const currentMonth = account?.year === now.getFullYear() ? now.getMonth() : null;

  useEffect(() => {
    return registerPlansOpener(() => setPlansOpen(true));
  }, []);

  function askNewAccount() {
    if (accounts.length >= accountLimit(ent)) {
      setPlansOpen(true);
      return;
    }
    onNewAccount();
  }

  useEffect(() => {
    if (!isMonthView) return;
    document.querySelector(`[data-month="${view}"]`)?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [view, isMonthView]);

  useEffect(() => {
    const onSet = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (!next) return;
      setSettings(false);
      setView(next);
    };
    window.addEventListener("tcp:set-view", onSet);
    return () => window.removeEventListener("tcp:set-view", onSet);
  }, [setView]);

  const groups: Record<string, typeof accounts> = {};
  for (const ac of accounts) {
    const k = ac.taxpayerId || ac.id;
    groups[k] = groups[k] ? [...groups[k], ac] : [ac];
  }

  function go(next: string) {
    hapticTap();
    setSettings(false);
    setView(next);
  }

  async function quickInstall() {
    initPwa();
    if (await promptInstall()) return;
    setInstallOpen(true);
  }

  function goMobile(tab: string) {
    hapticTap();
    if (tab === "month") {
      const n = parseInt(view, 10);
      go(Number.isFinite(n) ? String(n) : "0");
      return;
    }
    if (tab === "more") {
      setSettings(false);
      setView("more");
      return;
    }
    go(tab);
  }

  const sideNav = [
    { id: "month", label: "Mês", icon: CalendarDays },
    { id: "carteira", label: "Carteira", icon: TrendingUp },
    { id: "casa", label: "Casa", icon: Home },
    { id: "mov", label: "Movimentos", icon: ArrowLeftRight },
    { id: "analytics", label: "Análise", icon: BarChart3 },
    { id: "aprenda", label: "Aprenda", icon: BookOpen },
  ];

  return (
    <div className="app-shell flex min-h-dvh bg-bg text-fg">
      <aside className="app-sidebar no-print hidden w-52 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex h-12 items-center gap-2.5 px-4 text-sm font-semibold tracking-tight">
          <img src="/icon-192.png?v=5" alt="" className="size-8 rounded-lg" />
          <span className="tracking-[0.22em]">ANZOL</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          {sideNav.map((tab) => {
            const Icon = tab.icon;
            const on = tab.id === "month" ? isMonthView && !settings : view === tab.id && !settings;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === "month") goMobile("month");
                  else go(tab.id);
                }}
                className={cn(
                  "mb-0.5 flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-sm font-medium",
                  on ? "bg-inset text-accent" : "text-muted hover:bg-inset hover:text-fg",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {t(tab.id)}
              </button>
            );
          })}
          {isMonthView && (
            <div className="mt-2 border-t border-border pt-2">
              {MONTHS_SHORT.map((_, i) => (
                <button
                  key={monthShort(i)}
                  type="button"
                  onClick={() => go(String(i))}
                  className={cn(
                    "flex min-h-9 w-full items-center justify-between rounded-md px-2.5 text-xs font-semibold",
                    view === String(i) ? "text-accent" : "text-muted hover:text-fg",
                  )}
                >
                  <span>{monthShort(i)}</span>
                  {monthCounts[i] > 0 && (
                    <span className="rounded-full bg-accent px-1.5 py-px text-2xs font-extrabold text-accent-fg">
                      {monthCounts[i]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </nav>
        <div className="space-y-0.5 border-t border-border px-2 py-2">
          <div className="px-1 py-1">
            <LanguageSwitch />
          </div>
          <button
            type="button"
            onClick={() => go("annual")}
            className={cn(
              "flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-sm",
              view === "annual" ? "text-accent" : "text-muted hover:text-fg",
            )}
          >
            {t("annual")}
          </button>
          {sibs.length > 0 && (
            <button
              type="button"
              onClick={() => go("consol")}
              className={cn(
                "flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-sm",
                view === "consol" ? "text-accent" : "text-muted hover:text-fg",
              )}
            >
              <Layers className="size-4" />
              {t("consol")}
            </button>
          )}
          {!standalone && (
            <button
              type="button"
              onClick={() => void quickInstall()}
              className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-sm text-muted hover:text-fg"
            >
              <Monitor className="size-4" />
              {t("installBtn")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setSendOpen(true)}
            className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-sm text-muted hover:text-fg"
          >
            <Share className="size-4" />
            {t("sendAnzol")}
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/conta" })}
            className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-sm text-muted hover:text-fg"
          >
            {t("account")}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-header no-print sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-surface px-3 sm:px-4">
          <div className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight md:hidden">
            <img src="/icon-192.png?v=5" alt="" className="size-7 rounded-md" />
            <span className="tracking-[0.22em]">ANZOL</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 max-w-[46vw] items-center gap-1.5 truncate rounded-full border border-border-strong bg-card px-3 text-xs font-semibold sm:max-w-xs"
              >
                <span className="truncate">{account ? `${jur.flag} ${account.name}` : t("selectAccount")}</span>
                <ChevronDown className="size-3.5 shrink-0 text-muted" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {Object.entries(groups).map(([k, grp]) => {
                const tp = taxpayers.find((t) => t.id === k);
                return (
                  <div key={k}>
                    {tp && <DropdownMenuLabel>{tp.name}</DropdownMenuLabel>}
                    {grp.map((ac) => (
                      <DropdownMenuItem
                        key={ac.id}
                        className={ac.id === account?.id ? "text-accent" : ""}
                        onSelect={() => setActive(ac.id)}
                      >
                        {J[ac.country]?.flag} {ac.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </div>
                );
              })}
              <DropdownMenuItem onSelect={askNewAccount}>
                <Plus className="size-3.5" />
                {t("newAccountBtn")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="no-print"
              aria-label={t("theme")}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button variant="secondary" size="sm" className="hidden sm:inline-flex" onClick={() => setImportOpen(true)}>
              <Download className="size-3.5" />
              {t("importBtn")}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="sm:hidden"
              aria-label={t("importBtn")}
              onClick={() => setImportOpen(true)}
            >
              <Download className="size-4" />
            </Button>
            <Button variant="secondary" size="sm" className="hidden sm:inline-flex" onClick={() => setPlansOpen(true)}>
              <Sparkles className="size-3.5" />
              {t("plans")}
            </Button>
            {!standalone && (
              <Button variant="secondary" size="sm" className="hidden sm:inline-flex" onClick={() => void quickInstall()}>
                <Download className="size-3.5" />
                {t("installBtn")}
              </Button>
            )}
            {!user && (
              <Button variant="secondary" size="sm" onClick={() => navigate({ to: "/login" })}>
                {t("signIn")}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              className="hidden md:inline-flex"
              aria-label="Configurações"
              onClick={() => setSettings(true)}
            >
              <Settings className="size-4" />
            </Button>
          </div>
        </header>
        <OfflineBanner />
        <SyncBar />
        {isMonthView && (
          <nav className="no-print tabs-scroll flex overflow-x-auto border-b border-border bg-surface px-2 md:hidden">
            {MONTHS_SHORT.map((_, i) => (
              <Tab key={monthShort(i)} monthKey={String(i)} on={view === String(i)} onClick={() => go(String(i))}>
                {monthShort(i)}
                {monthCounts[i] > 0 && (
                  <span className="rounded-full bg-accent px-1.5 py-px text-2xs font-extrabold text-accent-fg">
                    {monthCounts[i]}
                  </span>
                )}
              </Tab>
            ))}
            {currentMonth != null && view !== String(currentMonth) && (
              <Tab on={false} onClick={() => go(String(currentMonth))}>
                {t("today")}
              </Tab>
            )}
          </nav>
        )}
        <main className="app-main mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-5">
          {settings ? (
            <SettingsView onClose={() => setSettings(false)} onInstall={() => setInstallOpen(true)} />
          ) : view === "more" ? (
            <MoreView
              hasConsol={sibs.length > 0}
              onAnnual={() => go("annual")}
              onConsol={() => go("consol")}
              onImport={() => setImportOpen(true)}
              onPlans={() => setPlansOpen(true)}
              onSettings={() => setSettings(true)}
              onInstall={() => setInstallOpen(true)}
              onSend={() => setSendOpen(true)}
              onConta={() => navigate({ to: "/conta" })}
              onCasa={() => go("casa")}
              onMoves={() => go("mov")}
              onLearn={() => go("aprenda")}
            />
          ) : view === "annual" ? (
            <AnnualView />
          ) : view === "analytics" ? (
            <AnalyticsView />
          ) : view === "consol" ? (
            <ConsolView />
          ) : view === "carteira" ? (
            <PortfolioView
              onAdd={() => {
                setPosEdit(null);
                setPosOpen(true);
              }}
              onEdit={(p) => {
                setPosEdit(p);
                setPosOpen(true);
              }}
            />
          ) : view === "casa" ? (
            <CasaView />
          ) : view === "mov" ? (
            <MovementsView />
          ) : view === "aprenda" ? (
            <LearnView />
          ) : (
            <MonthView
              month={parseInt(view, 10) || 0}
              onAdd={(tipo) => {
                setEditing(null);
                setTradeTipo(tipo);
                setTradeOpen(true);
              }}
              onEdit={(id) => {
                const t = all.find((x) => x.id === id) ?? null;
                setEditing(t);
                setTradeTipo(t?.tipo === "swing" || t?.tipo === "position" ? "sw" : "dt");
                setTradeOpen(true);
              }}
            />
          )}
          {!settings &&
            (view === "annual" || view === "analytics" || view === "consol" || view === "casa" || /^\d+$/.test(view)) && (
              <FiscalNote />
            )}
        </main>
        <nav className="app-bottom-nav no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface md:hidden">
          {MOBILE_TABS.map((tab) => {
            const Icon = tab.icon;
            const on = mobileTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => goMobile(tab.id)}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 text-2xs font-semibold",
                  on ? "text-accent" : "text-muted",
                )}
              >
                <Icon className="size-5" />
                {t(tab.id)}
              </button>
            );
          })}
        </nav>
        <AiChat />
        <TradeDialog open={tradeOpen} onOpenChange={setTradeOpen} tipo={tradeTipo} editing={editing} />
        <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
        <PlansDialog open={plansOpen} onOpenChange={setPlansOpen} />
        <PositionDialog open={posOpen} onOpenChange={setPosOpen} editing={posEdit} />
        <InstallDialog open={installOpen} onOpenChange={setInstallOpen} />
        <SendDialog open={sendOpen} onOpenChange={setSendOpen} />
      </div>
    </div>
  );
}

function Tab({
  on,
  onClick,
  children,
  monthKey,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  monthKey?: string;
}) {
  return (
    <button
      type="button"
      data-month={monthKey}
      onClick={onClick}
      className={cn(
        "flex min-h-11 shrink-0 items-center gap-1 border-b-2 px-3 text-xs font-semibold whitespace-nowrap transition-[color,border-color] duration-150",
        on ? "border-accent text-accent" : "border-transparent text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
