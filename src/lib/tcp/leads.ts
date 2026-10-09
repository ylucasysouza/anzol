import { createServerFn } from "@tanstack/react-start";

const STAGES = ["novo", "conta", "ativo"] as const;
const DESTS = ["fila", "acesso", "marketing"] as const;

export const saveLead = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (!data || typeof data !== "object") throw new Error("invalid");
    const row = data as Record<string, unknown>;
    const name = String(row.name ?? "").trim().slice(0, 80);
    const email = String(row.email ?? "").trim().toLowerCase().slice(0, 120);
    const phone = String(row.phone ?? "").trim().slice(0, 40);
    const locale = String(row.locale ?? "pt").slice(0, 5);
    const stage = STAGES.includes(row.stage as (typeof STAGES)[number]) ? String(row.stage) : "novo";
    const dest = DESTS.includes(row.dest as (typeof DESTS)[number]) ? String(row.dest) : "fila";
    const source = String(row.source ?? "boas-vindas").trim().slice(0, 400) || "boas-vindas";
    if (name.length < 2 || !email.includes("@") || phone.replace(/\D/g, "").length < 8) {
      throw new Error("invalid");
    }
    return { name, email, phone, locale, stage, dest, source };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into leads (id, name, email, phone, locale, stage, dest, source)
      values (
        ${crypto.randomUUID()},
        ${data.name},
        ${data.email},
        ${data.phone},
        ${data.locale},
        ${data.stage},
        ${data.dest},
        ${data.source}
      )
    `;
    return { ok: true as const };
  });
