import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({
  className,
  tone = "muted",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "muted" | "accent" | "gain" | "loss" | "warn";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-semibold",
        tone === "muted" && "bg-inset text-muted",
        tone === "accent" && "bg-accent/15 text-accent",
        tone === "gain" && "bg-gain/15 text-gain",
        tone === "loss" && "bg-loss/15 text-loss",
        tone === "warn" && "bg-warn/15 text-warn",
        className,
      )}
      {...props}
    />
  );
}
