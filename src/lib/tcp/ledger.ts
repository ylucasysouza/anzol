import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { isBackup } from "./backup";

export const getLedger = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ payload: string; updated_at: string }>`
      select payload, updated_at from ledger where user_id = ${context.userId}
    `;
    const row = rows[0];
    if (!row) return { payload: null, updatedAt: null };
    try {
      const payload: unknown = JSON.parse(row.payload);
      if (!isBackup(payload)) return { payload: null, updatedAt: null };
      return { payload, updatedAt: String(row.updated_at) };
    } catch {
      return { payload: null, updatedAt: null };
    }
  });

export const saveLedger = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => {
    if (!isBackup(data)) throw new Error("invalid");
    const text = JSON.stringify(data);
    if (text.length > 1_500_000) throw new Error("too big");
    return text;
  })
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const existing = await sql<{ payload: string; updated_at: string }>`
      select payload, updated_at from ledger where user_id = ${context.userId}
    `;
    const row = existing[0];
    if (row) {
      try {
        const prev: unknown = JSON.parse(row.payload);
        const next: unknown = JSON.parse(data);
        const prevN = isBackup(prev) ? prev.accounts.length : 0;
        const nextN = isBackup(next) ? next.accounts.length : 0;
        if (prevN > 0 && nextN === 0) return { updatedAt: String(row.updated_at) };
      } catch {
        /* unreadable row can be replaced */
      }
    }
    const rows = await sql<{ updated_at: string }>`
      insert into ledger (user_id, payload, updated_at)
      values (${context.userId}, ${data}, now())
      on conflict (user_id) do update
        set payload = excluded.payload, updated_at = now()
      returning updated_at
    `;
    return { updatedAt: String(rows[0]?.updated_at ?? new Date().toISOString()) };
  });
