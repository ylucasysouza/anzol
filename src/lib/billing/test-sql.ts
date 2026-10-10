// Só para testes: Sql (mesma interface de db.ts) sobre um PGlite em memória.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import type { Sql } from "../db.ts";

export async function memorySql(migrations: string[]): Promise<Sql> {
  const db = new PGlite();
  for (const m of migrations) await db.exec(readFileSync(new URL(`../../../migrations/${m}`, import.meta.url), "utf8"));
  const query = async (text: string, params: unknown[] = []) => (await db.query(text, params)).rows as never[];
  const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.reduce((acc, s, i) => acc + s + (i < values.length ? `$${i + 1}` : ""), "");
    return query(text, values);
  }) as unknown as Sql;
  sql.query = query as Sql["query"];
  return sql;
}
