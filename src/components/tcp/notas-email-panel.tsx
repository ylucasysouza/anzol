import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTr } from "@/lib/i18n";
import {
  choosePdfNoPassword,
  deletePdfPassword,
  getInboundSetup,
  getPdfPasswordChoice,
  listPendingImports,
  savePdfPassword,
} from "@/lib/inbound/inbound-api";

type Choice = "store" | "none" | null;

/**
 * Notas por e-mail: endereço pessoal + escolha sobre PDFs protegidos por senha.
 * Opção A (recomendada): guardar a senha cifrada. Opção B: não guardar e lançar à mão.
 */
export function NotasEmailPanel() {
  const tr = useTr();
  const [setup, setSetup] = useState<{ address: string; forwardCode: string | null } | null>(null);
  const [choice, setChoice] = useState<Choice>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [locked, setLocked] = useState(0);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, c, p] = await Promise.all([getInboundSetup(), getPdfPasswordChoice(), listPendingImports()]);
      setSetup(s);
      setChoice(c.choice);
      setHasPassword(c.hasPassword);
      setLocked(p.filter((x) => x.status === "needs_password").length);
    } catch {
      setSetup(null); // sem login ou sem rede: painel não aparece
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!setup) return null;
  const mustChoose = choice === null || locked > 0;

  async function saveA() {
    if (!pw.trim()) return;
    setBusy(true);
    try {
      await savePdfPassword({ data: { password: pw } });
      setPw("");
      toast.success(
        tr(
          "Senha guardada com criptografia. Reencaminhe as notas protegidas para importá-las.",
          "Password stored encrypted. Forward the protected notes again to import them.",
          "Contraseña guardada cifrada. Reenvía las notas protegidas para importarlas.",
        ),
      );
      await load();
    } catch {
      toast.error(tr("Não consegui guardar a senha.", "Could not store the password.", "No pude guardar la contraseña."));
    } finally {
      setBusy(false);
    }
  }

  async function chooseB() {
    setBusy(true);
    try {
      await choosePdfNoPassword();
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function removePw() {
    setBusy(true);
    try {
      await deletePdfPassword();
      toast.success(tr("Senha apagada.", "Password deleted.", "Contraseña eliminada."));
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3 text-sm">
      <button type="button" className="flex w-full items-center justify-between font-semibold" onClick={() => setOpen(!open)}>
        <span>{tr("Notas por e-mail", "Notes by email", "Notas por correo")}</span>
        {mustChoose && (
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-2xs text-accent">
            {locked > 0
              ? tr(`${locked} nota(s) com senha`, `${locked} locked note(s)`, `${locked} nota(s) con contraseña`)
              : tr("Escolha pendente", "Choice pending", "Elección pendiente")}
          </span>
        )}
      </button>
      {(open || locked > 0) && (
        <div className="mt-3 space-y-3 text-xs leading-relaxed text-muted">
          <p>
            {tr(
              "Encaminhe as notas de corretagem da sua corretora para:",
              "Forward your broker's trade confirmations to:",
              "Reenvía las notas de corretaje de tu corredora a:",
            )}{" "}
            <span className="select-all font-mono text-fg">{setup.address}</span>
          </p>
          {setup.forwardCode && (
            <p>
              {tr("Código de confirmação do Gmail:", "Gmail confirmation code:", "Código de confirmación de Gmail:")}{" "}
              <span className="select-all font-mono text-fg">{setup.forwardCode}</span>
            </p>
          )}

          <div className="space-y-2 rounded-lg border border-border p-3">
            <p className="font-semibold text-fg">
              {tr(
                "Muitas corretoras protegem o PDF da nota com senha. O que prefere?",
                "Many brokers password-protect the note PDF. What do you prefer?",
                "Muchas corredoras protegen el PDF de la nota con contraseña. ¿Qué prefieres?",
              )}
            </p>
            {locked > 0 && (
              <p className="text-loss">
                {tr(
                  `Chegaram ${locked} nota(s) protegida(s) que não consegui abrir.`,
                  `${locked} protected note(s) arrived that I could not open.`,
                  `Llegaron ${locked} nota(s) protegida(s) que no pude abrir.`,
                )}
              </p>
            )}

            <div className="space-y-1">
              <p className="text-fg">
                <strong>{tr("Opção A (recomendada):", "Option A (recommended):", "Opción A (recomendada):")}</strong>{" "}
                {tr(
                  "informe a senha uma vez. Ela fica guardada com criptografia, só é usada para abrir suas notas e você pode apagá-la quando quiser.",
                  "enter the password once. It is stored encrypted, used only to open your notes, and you can delete it at any time.",
                  "ingresa la contraseña una vez. Se guarda cifrada, solo se usa para abrir tus notas y puedes borrarla cuando quieras.",
                )}
              </p>
              {choice === "store" && hasPassword ? (
                <div className="flex items-center gap-2">
                  <span>{tr("Senha guardada.", "Password stored.", "Contraseña guardada.")}</span>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={removePw}>
                    {tr("Apagar senha", "Delete password", "Borrar contraseña")}
                  </Button>
                </div>
              ) : null}
              <div className="flex gap-2">
                <Input
                  type="password"
                  autoComplete="off"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder={tr("Senha do PDF da nota", "Note PDF password", "Contraseña del PDF")}
                />
                <Button size="sm" disabled={busy || !pw.trim()} onClick={saveA}>
                  {choice === "store" ? tr("Atualizar", "Update", "Actualizar") : tr("Guardar", "Save", "Guardar")}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-fg">
                <strong>{tr("Opção B:", "Option B:", "Opción B:")}</strong>{" "}
                {tr(
                  "não guardar a senha. Sem a senha, as notas protegidas não podem ser importadas automaticamente e você precisará lançá-las manualmente.",
                  "do not store the password. Without the password, protected notes cannot be imported automatically and you will need to enter them manually.",
                  "no guardar la contraseña. Sin la contraseña, las notas protegidas no se pueden importar automáticamente y tendrás que registrarlas manualmente.",
                )}
              </p>
              {choice === "none" ? (
                <span>{tr("Escolhida.", "Chosen.", "Elegida.")}</span>
              ) : (
                <Button size="sm" variant="secondary" disabled={busy} onClick={chooseB}>
                  {tr("Não guardar senha", "Don't store password", "No guardar contraseña")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
