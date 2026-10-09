import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { useSyncStatus } from "@/components/tcp/cloud-sync";
import { isIos, isStandalone } from "@/lib/tcp/pwa";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/conta")({ component: ContaPage });

function ContaPage() {
  const { user, isPending } = useCurrentUserState();
  const tr = useTr();
  const sync = useSyncStatus();
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setIos(isIos());
    setInstalled(isStandalone());
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <img src="/icon-192.png?v=5" alt="" className="size-14 rounded-2xl" />
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">{tr("Conta", "Account", "Cuenta")}</h1>
      {isPending ? (
        <p className="mt-3 text-sm text-muted">{tr("Abrindo a conta…", "Opening the account…", "Abriendo la cuenta…")}</p>
      ) : user ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm leading-relaxed text-muted">
            {tr(
              "Celular e computador ligados por",
              "Phone and computer linked by",
              "Celular y computadora unidos por",
            )}{" "}
            <span className="text-fg">{user.primaryEmail ?? user.displayName ?? tr("esta conta", "this account", "esta cuenta")}</span>.{" "}
            {tr(
              "Entre com este mesmo acesso no outro aparelho.",
              "Use this same sign-in on the other device.",
              "Entra con este mismo acceso en el otro dispositivo.",
            )}
          </p>
          <p className="text-sm text-muted">
            {sync === "saving" && tr("Sincronizando com os outros aparelhos…", "Syncing with the other devices…", "Sincronizando con los otros dispositivos…")}
            {sync === "saved" && tr("Sincronizado. Esta conta está igual no celular e no computador.", "Synced. This account matches on the phone and the computer.", "Sincronizado. Esta cuenta está igual en el celular y en la computadora.")}
            {sync === "error" && tr("Não consegui enviar agora. Os dados continuam neste aparelho.", "Could not send right now. Your data is still on this device.", "No pude enviar ahora. Los datos siguen en este dispositivo.")}
            {sync === "off" && tr("Ligando a conta…", "Linking the account…", "Conectando la cuenta…")}
          </p>
          <UserButton />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-sm leading-relaxed text-muted">
            {tr(
              "Sem conta, o celular e o computador ficam separados. Entre com o mesmo e-mail nos dois.",
              "Without an account, the phone and the computer stay separate. Use the same email on both.",
              "Sin cuenta, el celular y la computadora quedan separados. Entra con el mismo correo en los dos.",
            )}
          </p>
          <Button asChild className="w-full">
            <Link to="/login">{tr("Entrar ou criar conta", "Sign in or create an account", "Entrar o crear cuenta")}</Link>
          </Button>
          <p className="text-2xs leading-relaxed text-muted">
            {tr("Apple e Microsoft não estão disponíveis.", "Apple and Microsoft are not available.", "Apple y Microsoft no están disponibles.")}
          </p>
        </div>
      )}

      {!installed && (
        <div className="mt-8 rounded-xl border border-border bg-card px-4 py-4 text-sm leading-relaxed">
          <p className="font-semibold">{tr("Achar o Anzol no celular", "Find Anzol on the phone", "Encontrar Anzol en el celular")}</p>
          <p className="mt-2 text-muted">
            {ios
              ? tr(
                  "Se você está dentro do Grok, o iPhone esconde a opção. Toque em compartilhar no topo da barra, depois em Open in Safari. No Safari, compartilhe de novo e role até Add to Home Screen.",
                  "Inside Grok, the iPhone hides the option. Tap Share at the top of the bar, then Open in Safari. In Safari, share again and scroll to Add to Home Screen.",
                  "Dentro de Grok, el iPhone esconde la opción. Toca compartir arriba en la barra, luego Open in Safari. En Safari, comparte otra vez y baja hasta Add to Home Screen.",
                )
              : tr(
                  "Abra este site no Chrome, toque no menu ⋮ e em Instalar app ou Adicionar à tela inicial. A busca do celular só acha o Anzol depois disso.",
                  "Open this site in Chrome, tap the ⋮ menu, then Install app or Add to Home screen. Phone search only finds Anzol after that.",
                  "Abre este sitio en Chrome, toca el menú ⋮ y Instalar app o Agregar a la pantalla de inicio. La búsqueda del celular solo encuentra Anzol después de eso.",
                )}
          </p>
        </div>
      )}
      <Link to="/" className="mt-6 text-sm text-muted">
        {tr("Voltar ao app", "Back to the app", "Volver a la app")}
      </Link>
    </main>
  );
}
