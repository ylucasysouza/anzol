import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { PlanId, Role } from "@/lib/tcp/plans";

const PLANS = new Set(["free", "pro", "baleia", "enterprise"]);
const ROLES = new Set(["user", "developer"]);

function asPlan(value: string | null | undefined): PlanId {
  return value && PLANS.has(value) ? (value as PlanId) : "free";
}

function asRole(value: string | null | undefined): Role {
  return value && ROLES.has(value) ? (value as Role) : "user";
}

/** Emails that always own the product. Add the company login here. */
const OWNER_EMAILS = new Set<string>([]);

export const syncEntitlement = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => {
    const row = data && typeof data === "object" ? (data as { claimOwner?: unknown }) : {};
    return { claimOwner: row.claimOwner === true };
  })
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const email = String(context.email ?? "").trim().toLowerCase();
    const owner = email.length > 0 && OWNER_EMAILS.has(email);
    const existing = await sql<{ plan: string; role: string; cycle_end: string | null; cancel_at: string | null }>`
      select plan, role, cycle_end, cancel_at from entitlements where user_id = ${context.userId}
    `;
    const row = existing[0];
    if (row?.cancel_at && row.cycle_end && Date.parse(row.cycle_end) < Date.now() && row.role !== "developer") {
      await sql`
        update entitlements set plan = 'free', cancel_at = null, updated_at = now() where user_id = ${context.userId}
      `;
      return { plan: "free" as PlanId, role: asRole(row.role) };
    }
    if (owner || data.claimOwner) {
      const owners = await sql<{ n: string }>`select user_id as n from entitlements where role = 'developer' limit 1`;
      const seatFree = owners.length === 0 || owners[0]?.n === context.userId;
      if (owner || seatFree) {
        await sql`
          insert into entitlements (user_id, plan, role)
          values (${context.userId}, 'enterprise', 'developer')
          on conflict (user_id) do update set role = 'developer', plan = 'enterprise', updated_at = now()
        `;
        return { plan: "enterprise" as PlanId, role: "developer" as Role };
      }
    }
    if (row) return { plan: asPlan(row.plan), role: asRole(row.role) };
    await sql`insert into entitlements (user_id, plan, role) values (${context.userId}, 'free', 'user')`;
    return { plan: "free" as PlanId, role: "user" as Role };
  });

export const cancelEntitlement = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      update entitlements
      set cancel_at = now(), updated_at = now()
      where user_id = ${context.userId} and role <> 'developer' and plan <> 'free'
    `;
    return { ok: true as const };
  });

export async function grantPlan(userId: string, plan: PlanId, cycle: "month" | "year") {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const end = new Date();
  if (cycle === "year") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  await sql`
    insert into entitlements (user_id, plan, role, cycle_end, cancel_at)
    values (${userId}, ${plan}, 'user', ${end.toISOString()}, null)
    on conflict (user_id) do update
      set plan = excluded.plan, cycle_end = excluded.cycle_end, cancel_at = null, updated_at = now()
  `;
}
