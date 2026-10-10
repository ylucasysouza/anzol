// Estado do idioma sem dependência de React, para que o motor (format.ts) rode em node --test.
export type Locale = "pt" | "en" | "es";
let activeLocale: Locale = "pt";
export function readLocale(): Locale {
  return activeLocale;
}
export function setActiveLocale(l: Locale): void {
  activeLocale = l;
}
