import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  BookOpen,
  CalendarRange,
  ChevronRight,
  Download,
  Home,
  Layers,
  Settings,
  Share,
  Smartphone,
  Sparkles,
  User,
} from "lucide-react";
import { isStandalone } from "@/lib/tcp/pwa";
import { LanguageSwitch, useI18n, useTr } from "@/lib/i18n";
import { useEntitlement } from "@/lib/tcp/entitlement";

export function MoreView({
  hasConsol,
  onAnnual,
  onConsol,
  onImport,
  onPlans,
  onSettings,
  onInstall,
  onSend,
  onConta,
  onCasa,
  onMoves,
  onLearn,
}: {
  hasConsol: boolean;
  onAnnual: () => void;
  onConsol: () => void;
  onImport: () => void;
  onPlans: () => void;
  onSettings: () => void;
  onInstall: () => void;
  onSend: () => void;
  onConta: () => void;
  onCasa: () => void;
  onMoves: () => void;
  onLearn: () => void;
}) {
  const { t } = useI18n();
  const tr = useTr();
  const ent = useEntitlement();
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(isStandalone());
  }, []);
  return (
    <div className="space-y-2">
      <h1 className="mb-3 text-xl font-semibold tracking-tight">{t("more")}</h1>
      <div className="mb-3 flex items-center justify-between rounded-xl border border-border bg-card px-3 py-3">
        <span className="text-sm font-semibold">{t("language")}</span>
        <LanguageSwitch />
      </div>
      <Row icon={CalendarRange} label={t("annual")} hint={t("annualHint")} onClick={onAnnual} />
      {hasConsol && (
        <Row icon={Layers} label={t("consol")} hint={t("consolHint")} onClick={onConsol} />
      )}
      <Row icon={Home} label={t("casa")} hint={t("casaHint")} onClick={onCasa} />
      <Row icon={ArrowLeftRight} label={t("movesTitle")} hint={t("movesHint")} onClick={onMoves} />
      <Row icon={BookOpen} label={t("aprenda")} hint={t("learnHint")} onClick={onLearn} />
      <Row icon={Download} label={t("importCsv")} hint={t("importHint")} onClick={onImport} />
      <Row icon={Sparkles} label={t("plans")} hint={ent.role === "developer" ? tr("Acesso de desenvolvedor — todos os planos, sem cobrança", "Developer access — every plan, no charge", "Acceso de desarrollador — todos los planes, sin cobro") : t("plansHint")} onClick={onPlans} />
      <Row
        icon={Smartphone}
        label={installed ? t("installed") : t("installApp")}
        hint={installed ? t("installedHint") : t("installHint")}
        onClick={onInstall}
      />
      <Row icon={Share} label={t("sendAnzol")} hint={t("sendHint")} onClick={onSend} />
      <Row icon={User} label={t("account")} hint={t("accountHint")} onClick={onConta} />
      <Row icon={Settings} label={t("settings")} hint={t("settingsHint")} onClick={onSettings} />
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: typeof Settings;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-inset text-accent">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-2xs text-muted">{hint}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-faint" />
    </button>
  );
}
