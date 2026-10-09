type BeforeInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "tcp-install-dismissed";

let deferred: BeforeInstallPrompt | null = null;
const listeners = new Set<() => void>();
let started = false;

function notify() {
  for (const cb of listeners) cb();
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const modes = ["standalone", "minimal-ui", "window-controls-overlay", "fullscreen"];
  if (modes.some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches)) return true;
  return (window.navigator as { standalone?: boolean }).standalone === true;
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

export function isEmbedded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function isDesktop(): boolean {
  if (typeof window === "undefined") return false;
  if (isIos() || isAndroid()) return false;
  return window.matchMedia("(min-width: 768px)").matches;
}

export function installDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissInstall(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
  notify();
}

export function getDeferredPrompt(): BeforeInstallPrompt | null {
  return deferred;
}

export function subscribeInstallPrompt(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function initPwa(): void {
  if (typeof window === "undefined" || started) return;
  started = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    deferred = event as BeforeInstallPrompt;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferred = null;
    dismissInstall();
  });

  window.addEventListener("resize", notify);

  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(async () => {
      await navigator.serviceWorker.ready;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        try {
          if (sessionStorage.getItem("anzol-sw-reload") === "1") return;
          sessionStorage.setItem("anzol-sw-reload", "1");
        } catch {
          return;
        }
        window.location.reload();
      });
      if (navigator.serviceWorker.controller || isEmbedded()) return;
      if (window.location.pathname !== "/instalar") return;
      try {
        if (sessionStorage.getItem("anzol-sw") === "1") return;
        sessionStorage.setItem("anzol-sw", "1");
      } catch {
        return;
      }
      window.location.reload();
    });
  }

  applyStartUrl();
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  notify();
  return outcome === "accepted";
}

export function applyStartUrl(): void {
  if (typeof window === "undefined") return;
  const view = new URLSearchParams(window.location.search).get("view");
  if (!view) return;
  if (view === "month") {
    const m = new Date().getMonth();
    window.dispatchEvent(new CustomEvent("tcp:set-view", { detail: String(m) }));
    return;
  }
  if (["carteira", "analytics", "aprenda", "annual", "consol", "casa", "mov"].includes(view)) {
    window.dispatchEvent(new CustomEvent("tcp:set-view", { detail: view }));
  }
}

export function hapticTap(): void {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    navigator.vibrate?.(12);
  } catch {
    /* ignore */
  }
}
