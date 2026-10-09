import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useI18n } from "@/lib/i18n";
import { isBackup } from "@/lib/tcp/backup";
import { getLedger, saveLedger } from "@/lib/tcp/ledger";
import { isAndroid, isDesktop, isIos } from "@/lib/tcp/pwa";
import { useTcpStore } from "@/lib/tcp/store";

type PulseKind = "off" | "saving" | "sent" | "received" | "error";

type Pulse = { kind: PulseKind; at: number; quiet: boolean; from: string };

let pulse: Pulse = { kind: "off", at: 0, quiet: true, from: "" };
const serverPulse: Pulse = { kind: "off", at: 0, quiet: true, from: "" };
const listeners = new Set<() => void>();

function setPulse(kind: PulseKind, quiet = false, from = "") {
  pulse = { kind, at: Date.now(), quiet, from };
  listeners.forEach((fn) => fn());
}

function deviceId(): string {
  try {
    const key = "anzol-device-id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = Math.random().toString(36).slice(2, 8);
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "local";
  }
}

function deviceName(): string {
  if (isIos()) return "iPhone";
  if (isAndroid()) return "Android";
  if (isDesktop()) return "computador";
  return "celular";
}

function readOrigin(payload: unknown): { name: string; id: string } {
  if (!payload || typeof payload !== "object" || !("origin" in payload)) return { name: "", id: "" };
  const raw = String((payload as { origin?: unknown }).origin ?? "");
  const [name, id] = raw.split("·");
  return { name: name || "", id: id || "" };
}

export function useSyncPulse(): Pulse {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => pulse,
    () => serverPulse,
  );
}

/** @deprecated use useSyncPulse — kept for the account page wording */
export function useSyncStatus(): "off" | "saving" | "saved" | "error" {
  const kind = useSyncPulse().kind;
  if (kind === "sent" || kind === "received") return "saved";
  return kind;
}

let bootReady = false;
const bootListeners = new Set<() => void>();

function setBoot(ready: boolean) {
  if (bootReady === ready) return;
  bootReady = ready;
  bootListeners.forEach((fn) => fn());
}

export function useCloudReady(): boolean {
  return useSyncExternalStore(
    (cb) => {
      bootListeners.add(cb);
      return () => bootListeners.delete(cb);
    },
    () => bootReady,
    () => false,
  );
}
function stampKey(userId: string) {
  return `anzol-cloud-at:${userId}`;
}

export function CloudSync() {
  const { user, isPending } = useCurrentUserState();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (isPending || !userId) {
      setPulse("off", true);
      setBoot(true);
      return;
    }

    let cancel = false;
    let applying = false;
    let pushing = false;
    let dirty = false;
    let timer = 0;
    let pollTimer = 0;
    let unsubStore = () => {};

    const push = async (quiet: boolean) => {
      const snap = useTcpStore.getState().exportSnapshot();
      if (!snap.accounts.length) return;
      pushing = true;
      dirty = false;
      setPulse("saving", quiet);
      try {
        const saved = await saveLedger({
          data: { ...snap, origin: `${deviceName()}·${deviceId()}` },
        });
        if (cancel) return;
        const at = Date.parse(saved.updatedAt);
        if (Number.isFinite(at)) localStorage.setItem(stampKey(userId), String(at));
        setPulse("sent", quiet);
      } catch {
        if (!cancel) setPulse("error");
      } finally {
        pushing = false;
      }
    };

    const pull = async (quiet: boolean) => {
      if (cancel || pushing || dirty || applying || document.hidden) return;
      try {
        const remote = await getLedger();
        if (cancel || pushing || dirty) return;
        const remoteAt = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;
        const localAt = Number(localStorage.getItem(stampKey(userId)) || 0);
        const remoteN = isBackup(remote.payload) ? remote.payload.accounts.length : 0;
        const localN = useTcpStore.getState().accounts.length;
        if (remote.payload && remoteN > 0 && remoteAt > localAt) {
          const origin = readOrigin(remote.payload);
          applying = true;
          useTcpStore.getState().restoreBackup(remote.payload);
          applying = false;
          if (Number.isFinite(remoteAt)) localStorage.setItem(stampKey(userId), String(remoteAt));
          if (origin.id && origin.id === deviceId()) setPulse("sent", true);
          else setPulse("received", quiet, origin.name || "outro aparelho");
        } else if (localN > 0 && remoteN === 0) {
          void push(true);
        }
      } catch {
        if (!cancel && pulse.kind === "off") setPulse("error");
      }
    };

    const arm = () => {
      void (async () => {
        try {
          const remote = await getLedger();
          if (cancel) return;
          const remoteAt = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;
          const localAt = Number(localStorage.getItem(stampKey(userId)) || 0);
          const localN = useTcpStore.getState().exportSnapshot().accounts.length;
          const remoteN = isBackup(remote.payload) ? remote.payload.accounts.length : 0;
          const remoteNewer = remoteN > 0 && remoteAt > localAt;
          if (remote.payload && remoteN > 0 && (localN === 0 || remoteNewer)) {
            const origin = readOrigin(remote.payload);
            applying = true;
            useTcpStore.getState().restoreBackup(remote.payload);
            applying = false;
            if (Number.isFinite(remoteAt)) localStorage.setItem(stampKey(userId), String(remoteAt));
            if (origin.id && origin.id === deviceId()) setPulse("sent", true);
            else setPulse("received", false, origin.name || "outro aparelho");
          } else if (localN > 0 && (remoteN === 0 || (Number.isFinite(remoteAt) && localAt >= remoteAt))) {
            void push(true);
          }
        } catch {
          if (!cancel) setPulse("error");
        } finally {
          if (cancel) return;
          setBoot(true);
          unsubStore = useTcpStore.subscribe(() => {
            if (applying || cancel) return;
            dirty = true;
            window.clearTimeout(timer);
            timer = window.setTimeout(() => void push(false), 700);
          });
          pollTimer = window.setInterval(() => void pull(false), 8000);
          document.addEventListener("visibilitychange", onVisible);
        }
      })();
    };

    const onVisible = () => {
      if (!document.hidden) void pull(false);
    };

    let unsubHydrate = () => {};
    if (useTcpStore.persist.hasHydrated()) arm();
    else unsubHydrate = useTcpStore.persist.onFinishHydration(arm);

    return () => {
      cancel = true;
      window.clearTimeout(timer);
      window.clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", onVisible);
      unsubHydrate();
      unsubStore();
    };
  }, [isPending, userId]);

  return null;
}

export function SyncBar() {
  const { user, isPending } = useCurrentUserState();
  const pulse = useSyncPulse();
  const { t, locale } = useI18n();

  useEffect(() => {
    if (pulse.quiet) return;
    if (pulse.kind === "received") toast.success(t("syncReceived", { name: pulse.from || "…" }));
    if (pulse.kind === "sent") toast.success(t("syncSent"));
  }, [pulse.at, pulse.kind, pulse.quiet, pulse.from, t]);

  if (isPending || !user || pulse.kind === "off") return null;

  const time =
    pulse.at > 0
      ? new Date(pulse.at).toLocaleTimeString(locale === "es" ? "es" : locale === "en" ? "en" : "pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
  const label =
    pulse.kind === "saving"
      ? t("syncing")
      : pulse.kind === "received"
        ? t("updatedFrom", { name: pulse.from || "…" })
        : pulse.kind === "error"
          ? t("syncError")
          : t("synced");
  const bad = pulse.kind === "error";

  return (
    <div
      className={
        "no-print flex items-center gap-2 border-b px-3 py-1.5 text-xs " +
        (bad ? "border-warn/30 bg-warn/10 text-warn" : "border-gain/25 bg-gain/10 text-gain")
      }
    >
      <span className={"size-1.5 shrink-0 rounded-full " + (pulse.kind === "saving" ? "animate-pulse bg-gain" : bad ? "bg-warn" : "bg-gain")} />
      <span className="font-medium">{label}</span>
      {time && pulse.kind !== "saving" && <span className="text-muted">{time}</span>}
    </div>
  );
}
