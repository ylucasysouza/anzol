import { Download, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initPwa, promptInstall } from "@/lib/tcp/pwa";
import { useInstallState } from "./install-app";

export function InstallLanding() {
  const { ios, canPrompt, standalone, embedded } = useInstallState();

  async function install() {
    initPwa();
    await promptInstall();
  }

  function openAlone() {
    window.open(window.location.href, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center px-6 py-12 text-center">
      <img src="/icon-512.png?v=2" alt="" width={168} height={168} className="size-40 rounded-3xl" />
      <h1 className="mt-8 text-2xl font-semibold tracking-[0.28em]">ANZOL</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        O ícone de instalar fica no fim da barra de endereço, nesta página. Um arquivo baixado não mostra esse ícone.
      </p>

      {standalone ? (
        <p className="mt-8 rounded-xl border border-gain/30 bg-gain/10 px-4 py-3 text-sm text-gain">
          Já está instalado. Abra pelo ícone da tela inicial ou do Menu Iniciar.
        </p>
      ) : (
        <div className="mt-8 w-full space-y-3 text-left">
          {embedded && (
            <Button className="w-full" onClick={openAlone}>
              Abrir numa aba só
            </Button>
          )}
          {canPrompt && (
            <Button className="w-full" onClick={() => void install()}>
              <Download className="size-4" />
              Instalar agora
            </Button>
          )}
          <div className="flex gap-3 rounded-xl border border-border bg-card px-3 py-3">
            <Smartphone className="mt-0.5 size-5 shrink-0 text-accent" />
            <p className="text-sm text-muted">
              {ios ? (
                <>
                  Compartilhar no topo → Open in Safari. No Safari, compartilhe de novo e role até Add to Home Screen.
                </>
              ) : (
                <>Chrome → menu ⋮ → Instalar app</>
              )}
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border bg-card px-3 py-3">
            <Monitor className="mt-0.5 size-5 shrink-0 text-accent" />
            <p className="text-sm text-muted">
              Fim da barra de endereço → monitor com seta. Se não aparecer, atualize a página. Ou ⋮ → Instalar Anzol.
            </p>
          </div>
          <Button variant="secondary" className="w-full" onClick={() => window.location.reload()}>
            Atualizar a página
          </Button>
        </div>
      )}
    </main>
  );
}
