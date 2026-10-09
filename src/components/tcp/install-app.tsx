import { useEffect, useState } from "react";
import { Download, Monitor, Share, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useTr } from "@/lib/i18n";
import {
  dismissInstall,
  getDeferredPrompt,
  initPwa,
  installDismissed,
  isDesktop,
  isEmbedded,
  isIos,
  isStandalone,
  promptInstall,
  subscribeInstallPrompt,
} from "@/lib/tcp/pwa";
import { PROJECT_URL, shareProject } from "@/lib/tcp/share";

export function useInstallState() {
  const [standalone, setStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [ios, setIos] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [embedded, setEmbedded] = useState(false);

  useEffect(() => {
    initPwa();
    const sync = () => {
      setStandalone(isStandalone());
      setDismissed(installDismissed());
      setIos(isIos());
      setDesktop(isDesktop());
      setCanPrompt(Boolean(getDeferredPrompt()));
      setEmbedded(isEmbedded());
    };
    sync();
    return subscribeInstallPrompt(sync);
  }, []);

  return {
    standalone,
    dismissed,
    ios,
    desktop,
    canPrompt,
    embedded,
    hideBanner: () => {
      dismissInstall();
      setDismissed(true);
    },
  };
}

export function OfflineBanner() {
  const tr = useTr();
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (online) return null;
  return (
    <div className="no-print bg-warn/15 px-3 py-1.5 text-center text-2xs font-semibold text-warn">
      {tr(
        "Sem conexão — os dados continuam neste aparelho",
        "No connection — your data stays on this device",
        "Sin conexión — los datos siguen en este dispositivo",
      )}
    </div>
  );
}

export function InstallDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const tr = useTr();
  const { ios, canPrompt, standalone, embedded } = useInstallState();

  async function install() {
    if (await promptInstall()) onOpenChange(false);
  }

  function openAlone() {
    window.open(window.location.href, "_blank", "noopener,noreferrer");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={tr("Abrir o Anzol", "Open Anzol", "Abrir Anzol")}
        description={tr(
          "O acesso principal é a conta no navegador. O atalho é opcional.",
          "The main access is your account in the browser. The shortcut is optional.",
          "El acceso principal es la cuenta en el navegador. El atajo es opcional.",
        )}
      >
        {standalone ? (
          <p className="rounded-lg border border-gain/30 bg-gain/10 px-3 py-2 text-sm text-gain">
            {tr(
              "Já está instalado. Abra pelo ícone da tela inicial ou do Menu Iniciar.",
              "Already installed. Open it from the home screen icon or the Start menu.",
              "Ya está instalado. Ábrelo desde el ícono de la pantalla de inicio o del menú Inicio.",
            )}
          </p>
        ) : (
          <div className="space-y-3">
            {embedded && (
              <div className="rounded-xl border border-warn/40 bg-warn/10 px-3 py-3 text-sm">
                <p className="font-semibold">{tr("Você está dentro do chat.", "You are inside the chat.", "Estás dentro del chat.")}</p>
                <p className="mt-1 text-muted">
                  {tr(
                    "A barra de endereço daqui é a do site, não a do app. O ícone de instalar não aparece. Abra numa aba só.",
                    "The address bar here belongs to the site, not the app. The install icon does not appear. Open it in its own tab.",
                    "La barra de direcciones de aquí es la del sitio, no la de la app. El ícono de instalar no aparece. Ábrela en una pestaña sola.",
                  )}
                </p>
                <Button className="mt-3 w-full" onClick={openAlone}>
                  {tr("Abrir numa aba só", "Open in its own tab", "Abrir en una pestaña sola")}
                </Button>
              </div>
            )}
            {canPrompt && (
              <Button className="w-full" onClick={() => void install()}>
                <Download className="size-4" />
                {tr("Instalar agora", "Install now", "Instalar ahora")}
              </Button>
            )}
            <Button variant="secondary" className="w-full" onClick={() => onOpenChange(false)}>
              {tr("Continuar no navegador", "Continue in the browser", "Continuar en el navegador")}
            </Button>
            <div className="rounded-xl border border-border bg-card px-3 py-3">
              <p className="text-sm font-semibold">{tr("Navegador", "Browser", "Navegador")}</p>
              <p className="mt-0.5 text-sm text-muted">
                {tr(
                  "Este é o canal principal. O cliente entra com o e-mail e usa. Celular e computador ficam iguais, sem loja.",
                  "This is the main channel. The client signs in with email and uses it. Phone and computer stay the same, with no store.",
                  "Este es el canal principal. El cliente entra con el correo y lo usa. Celular y computadora quedan iguales, sin tienda.",
                )}
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-inset">
              <p className="px-3 pt-3 text-sm font-semibold">
                {tr("Atalho no computador", "Shortcut on the computer", "Atajo en la computadora")}
              </p>
              <div className="flex items-center gap-2 px-2 py-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-2xs text-muted">
                    {tr("endereço do app", "app address", "dirección de la app")}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 rounded-md bg-accent/15 px-1.5 py-0.5 text-accent">
                    <Monitor className="size-3.5" />
                    <span className="text-2xs font-semibold">{tr("instalar", "install", "instalar")}</span>
                  </span>
                </div>
                <span className="px-1 text-base font-semibold leading-none text-fg" aria-hidden>
                  ⋮
                </span>
              </div>
              <p className="border-t border-border px-3 py-2 text-2xs leading-relaxed text-muted">
                {tr(
                  "Chrome ou Edge, nesta página: o ícone fica no fim da barra. Se não aparecer, atualize uma vez (F5) ou use ⋮ → Instalar Anzol.",
                  "Chrome or Edge, on this page: the install icon is at the end of the address bar. If it does not appear, refresh once (F5) or use ⋮ → Install Anzol.",
                  "Chrome o Edge, en esta página: el ícono de instalar está al final de la barra de direcciones. Si no aparece, actualiza una vez (F5) o usa ⋮ → Instalar Anzol.",
                )}
              </p>
            </div>
            <div className="flex gap-3 rounded-xl border border-border bg-card px-3 py-3">
              <Smartphone className="mt-0.5 size-5 shrink-0 text-accent" />
              <div>
                <p className="text-sm font-semibold">{tr("Celular", "Phone", "Celular")}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {ios
                    ? tr(
                        "1. Toque no ícone Compartilhar na barra de endereço do Safari (quadrado com seta). 2. Se ainda não estiver no Safari, escolha Open in Safari. 3. No Safari, toque em Compartilhar de novo na barra de endereço e role até Add to Home Screen.",
                        "1. Tap the Share icon in the Safari address bar (square with an arrow). 2. If you are not in Safari yet, choose Open in Safari. 3. In Safari, tap Share again in the address bar and scroll to Add to Home Screen.",
                        "1. Toca el ícono Compartir en la barra de direcciones de Safari (cuadrado con una flecha). 2. Si todavía no estás en Safari, elige Open in Safari. 3. En Safari, toca Compartir otra vez en la barra de direcciones y desplázate hasta Add to Home Screen.",
                      )
                    : tr(
                        "Chrome → menu ⋮ → Instalar app ou Adicionar à tela inicial",
                        "Chrome → menu ⋮ → Install app or Add to Home screen",
                        "Chrome → menú ⋮ → Instalar app o Agregar a la pantalla de inicio",
                      )}
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function SendDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const tr = useTr();

  async function share() {
    const result = await shareProject();
    if (result === "copied") {
      toast.success(tr("Link do projeto copiado", "Project link copied", "Enlace del proyecto copiado"));
    } else if (result === "failed") {
      toast.error(tr("Não foi possível compartilhar", "Could not share", "No se pudo compartir"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={tr("Compartilhar o projeto", "Share the project", "Compartir el proyecto")}
        description={tr(
          "Este link é o código do Anzol. Quem abrir pode editar o app. Não é instalação nem resumo.",
          "This link is the Anzol source. Whoever opens it can edit the app. It is not an install link or a summary.",
          "Este enlace es el código de Anzol. Quien lo abra puede editar la app. No es instalación ni un resumen.",
        )}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3">
            <img src="/icon-192.png?v=5" alt="" className="size-12 rounded-xl" />
            <div className="min-w-0 text-left">
              <p className="text-sm font-semibold tracking-[0.18em]">ANZOL</p>
              <p className="truncate text-2xs text-muted">{PROJECT_URL}</p>
            </div>
          </div>
          <Button className="w-full" onClick={() => void share()}>
            <Share className="size-4" />
            {tr("Compartilhar", "Share", "Compartir")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
