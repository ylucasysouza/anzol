import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { vaultNow } from "@/lib/tcp/vault";
import { useTr } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user } = useCurrentUserState();
  const tr = useTr();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    vaultNow();
    const q = new URLSearchParams(window.location.search);
    if (q.get("falha") === "1" || q.get("error")) {
      setError(
        tr(
          "O Google não entrou. Seus dados continuam neste aparelho. Entre de novo por aqui, de preferência com e-mail.",
          "Google did not sign in. Your data is still on this device. Sign in again here, preferably with email.",
          "Google no entró. Tus datos siguen en este dispositivo. Entra de nuevo aquí, de preferencia con el correo.",
        ),
      );
    }
    // locale is already loaded from this device before the first paint
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (user) return <Navigate to="/conta" />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    vaultNow();
    const body = { email: email.trim(), password, callbackURL: "/conta" };
    try {
      const result =
        mode === "up"
          ? await authClient.signUp.email({ ...body, name: email.trim().split("@")[0] || "Anzol" })
          : await authClient.signIn.email(body);
      setBusy(false);
      if (result.error) {
        setError(
          mode === "up"
            ? tr(
                "Não foi possível criar a conta. Tente outro e-mail.",
                "Could not create the account. Try another email.",
                "No pude crear la cuenta. Prueba con otro correo.",
              )
            : tr(
                "E-mail ou senha não conferem.",
                "Email or password does not match.",
                "El correo o la contraseña no coinciden.",
              ),
        );
        return;
      }
      window.location.assign("/conta");
    } catch {
      setBusy(false);
      setError(
        tr(
          "Não consegui entrar. Os dados continuam neste aparelho.",
          "Could not sign in. Your data is still on this device.",
          "No pude entrar. Tus datos siguen en este dispositivo.",
        ),
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <img src="/icon-192.png?v=5" alt="" className="size-14 rounded-2xl" />
      <h1 className="mt-5 text-2xl font-semibold tracking-[0.22em]">ANZOL</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {tr(
          "O mesmo e-mail no celular e no computador. Os dados passam a ser os mesmos.",
          "The same email on your phone and computer. The books stay the same.",
          "El mismo correo en el celular y en la computadora. Los datos quedan iguales.",
        )}
      </p>
      <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-3">
        <Input
          type="email"
          autoComplete="email"
          required
          placeholder={tr("E-mail", "Email", "Correo")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          autoComplete={mode === "up" ? "new-password" : "current-password"}
          required
          minLength={8}
          placeholder={tr("Senha", "Password", "Contraseña")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-loss">{error}</p>}
        <Button className="w-full" disabled={busy}>
          {busy ? tr("Aguarde…", "Please wait…", "Espera…") : mode === "up" ? tr("Criar conta", "Create account", "Crear cuenta") : tr("Entrar", "Sign in", "Entrar")}
        </Button>
      </form>
      <button
        type="button"
        className="mt-3 text-left text-sm text-accent"
        onClick={() => {
          setMode(mode === "up" ? "in" : "up");
          setError("");
        }}
      >
        {mode === "up" ? tr("Já tenho conta", "I already have an account", "Ya tengo cuenta") : tr("Criar conta com e-mail", "Create an account with email", "Crear cuenta con correo")}
      </button>
      <div className="my-5 h-px bg-border" />
      <div className="space-y-2">
        {GROK_PROVIDERS.map((p) => (
          <Button
            key={p.providerId}
            variant="secondary"
            className="w-full"
            onClick={() => {
              vaultNow();
              setError("");
              void signIn(p.providerId, { callbackURL: "/conta", errorCallbackURL: "/login?falha=1" }).catch(() => {
                setError(
                  tr(
                    "O Google não entrou. Seus dados continuam neste aparelho. Use o e-mail, que entra aqui mesmo.",
                    "Google did not sign in. Your data is still on this device. Use email, which stays in the app.",
                    "Google no entró. Tus datos siguen en este dispositivo. Usa el correo, que entra aquí mismo.",
                  ),
                );
              });
            }}
          >
            {tr("Continuar com", "Continue with", "Continuar con")} {p.label}
          </Button>
        ))}
      </div>
      <p className="mt-5 text-2xs leading-relaxed text-muted">
        {tr(
          "No iPhone, o e-mail entra dentro do app. Google e X às vezes falham e voltam para esta tela — a casa e as operações não se apagam.",
          "On iPhone, email stays inside the app. Google and X sometimes fail and return here. The household books and trades are not erased.",
          "En el iPhone, el correo entra dentro de la app. Google y X a veces fallan y vuelven a esta pantalla. La casa y las operaciones no se borran.",
        )}
      </p>
      <Link to="/" className="mt-4 text-sm text-muted">
        {tr("Voltar", "Back", "Volver")}
      </Link>
    </main>
  );
}
