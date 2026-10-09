import { useState, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, signIn } from "@/lib/auth/client";
import { LanguageSwitch, useI18n } from "@/lib/i18n";
import { saveLead } from "@/lib/tcp/leads";
import { vaultNow } from "@/lib/tcp/vault";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Splash() {
  const { t } = useI18n();
  return (
    <main
      className="grid min-h-dvh place-items-center bg-bg px-6 text-center"
      style={{ background: "#071018" }}
    >
      <div>
        <img src="/icon-192.png?v=5" alt="" className="mx-auto size-24 rounded-3xl" />
        <h1 className="mt-6 text-2xl font-semibold tracking-[0.28em] text-fg">{t("splashTitle")}</h1>
        <p className="mt-3 text-sm text-muted">{t("splashBody")}</p>
      </div>
    </main>
  );
}

export function LeadGate({ onLocal }: { onLocal?: () => void }) {
  const { t, locale } = useI18n();
  const [mode, setMode] = useState<"up" | "in">("up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function remember() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8 || !email.includes("@")) return;
    try {
      await saveLead({
        data: {
          name: name.trim() || email.trim(),
          email: email.trim(),
          phone: phone.trim(),
          locale,
          stage: "conta",
          dest: "acesso",
          source: "boas-vindas",
        },
      });
    } catch {
      /* the account still opens if the lead row fails */
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    vaultNow();
    await remember();
    const body = { email: email.trim(), password, callbackURL: "/" };
    try {
      const result =
        mode === "up"
          ? await authClient.signUp.email({ ...body, name: name.trim() || email.trim().split("@")[0] || "Anzol" })
          : await authClient.signIn.email(body);
      if (result.error) {
        setBusy(false);
        setError(mode === "up" ? t("signupError") : t("leadError"));
        return;
      }
      window.location.assign("/");
    } catch {
      setBusy(false);
      setError(t("leadError"));
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <div className="flex items-center justify-between">
        <img src="/icon-192.png?v=5" alt="" className="size-14 rounded-2xl" />
        <LanguageSwitch />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">{t("leadTitle")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("leadBody")}</p>
      <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-3">
        {mode === "up" && (
          <Input required minLength={2} placeholder={t("name")} value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <Input
          type="email"
          autoComplete="email"
          required
          placeholder={t("email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {mode === "up" && (
          <Input
            type="tel"
            autoComplete="tel"
            required
            minLength={8}
            placeholder={t("phone")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        )}
        <Input
          type="password"
          autoComplete={mode === "up" ? "new-password" : "current-password"}
          required
          minLength={8}
          placeholder={t("password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-loss">{error}</p>}
        <Button className="w-full" disabled={busy}>
          {busy ? t("wait") : mode === "up" ? t("create") : t("enter")}
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
        {mode === "up" ? t("haveAccount") : t("newAccount")}
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
              void remember();
              void signIn(p.providerId, { callbackURL: "/", errorCallbackURL: "/?falha=1" }).catch(() => {
                setError(t("leadError"));
              });
            }}
          >
            {p.label}
          </Button>
        ))}
      </div>
      {onLocal && (
        <button type="button" className="mt-5 text-sm text-muted" onClick={onLocal}>
          {t("localUse")}
        </button>
      )}
    </main>
  );
}
