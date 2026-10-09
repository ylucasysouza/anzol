import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, inputMode, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      inputMode={inputMode ?? (type === "number" ? "decimal" : undefined)}
      className={cn(
        "h-11 w-full rounded-lg border border-border-strong bg-card px-3 text-base text-fg outline-none transition-[border-color] duration-150 placeholder:text-faint focus:border-accent md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-border-strong bg-card px-3 py-2 text-sm text-fg outline-none transition-colors duration-150 placeholder:text-faint focus:border-accent",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-lg border border-border-strong bg-card px-3 text-base text-fg outline-none transition-[border-color] duration-150 focus:border-accent md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-muted">
      {children}
    </div>
  );
}
