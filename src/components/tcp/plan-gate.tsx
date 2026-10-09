import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useTr } from "@/lib/i18n";

let opener: () => void = () => {};

export function registerPlansOpener(fn: () => void) {
  opener = fn;
  return () => {
    if (opener === fn) opener = () => {};
  };
}

export function requestPlans() {
  opener();
}

export function FiscalNote() {
  const tr = useTr();
  return (
    <p className="mt-4 text-2xs leading-relaxed text-muted">
      {tr(
        "Ferramenta de organização e cálculo. Valide com contador. Regras mudam por país e por operação.",
        "A tool for organization and calculation. Check it with an accountant. Rules change by country and by the type of trade.",
        "Herramienta de organización y cálculo. Valídala con un contador. Las reglas cambian según el país y la operación.",
      )}
    </p>
  );
}

export function UpgradeWall({
  title,
  body,
  extra,
}: {
  title: string;
  body: string;
  extra?: ReactNode;
}) {
  const tr = useTr();
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-5">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {extra}
        <Button onClick={() => requestPlans()}>{tr("Ver planos", "See plans", "Ver planes")}</Button>
      </div>
    </div>
  );
}
