/**
 * Dinheiro em centavos inteiros.
 * Regra: todo valor entra no motor como centavos (inteiro). Somas e subtrações
 * são exatas. Multiplicação por alíquota arredonda UMA vez (meio para cima,
 * em módulo), no ponto em que a Receita arredonda (o imposto devido).
 * A conversão para reais (number com 2 casas) só acontece na borda/exibição.
 */
export type Cents = number; // sempre inteiro

/** Converte reais (number ou string pt-BR/en) para centavos inteiros, sem erro de ponto flutuante. */
export function toCents(v: number | string | null | undefined): Cents {
  if (v == null || v === "") return 0;
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return 0;
    // toFixed(6) elimina o ruído binário (ex.: 0.1+0.2) antes de arredondar
    return roundHalfAwayFromZero(Number(v.toFixed(6)) * 100);
  }
  let s = v.trim().replace(/[R$\s]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", "."); // formato pt-BR 1.234,56
  const n = Number(s);
  return Number.isFinite(n) ? toCents(n) : 0;
}

export function fromCents(c: Cents): number {
  return c / 100;
}

export function roundHalfAwayFromZero(x: number): number {
  const r = Math.round(Math.abs(x) + 1e-9);
  return x < 0 ? -r : r;
}

/** Aplica alíquota (ex.: 0.15) a um valor em centavos, arredondando uma única vez. */
export function applyRate(c: Cents, rate: number): Cents {
  return roundHalfAwayFromZero(c * rate);
}

export function sumCents(values: Array<number | string | null | undefined>): Cents {
  let s = 0;
  for (const v of values) s += toCents(v);
  return s;
}

/** Formata centavos como BRL (só na exibição). */
export function formatBRL(c: Cents): string {
  const neg = c < 0;
  const abs = Math.abs(c);
  const reais = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const cent = String(abs % 100).padStart(2, "0");
  return `${neg ? "-" : ""}R$ ${reais},${cent}`;
}

/** DARF: valor mínimo de recolhimento (R$ 10,00). Abaixo disso, soma no mês seguinte. */
export const DARF_MINIMO: Cents = 1000;
