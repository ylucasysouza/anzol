import { useEffect, useSyncExternalStore } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { syncEntitlement } from "@/lib/tcp/entitlement-api";
import { allows, type Entitlement, type Feature, type PlanId, type Role } from "@/lib/tcp/plans";

const ROLE_KEY = "anzol-role";
const PLAN_KEY = "anzol-plan";
const MIGRATED = "anzol-billing-v1";

let local: Entitlement = { plan: "free", role: "user" };
let remote: Entitlement | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function readStored(): Entitlement {
  if (typeof localStorage === "undefined") return { plan: "free", role: "user" };
  const role = localStorage.getItem(ROLE_KEY) === "developer" ? "developer" : "user";
  const plan = localStorage.getItem(PLAN_KEY);
  const safe: PlanId = plan === "pro" || plan === "baleia" || plan === "enterprise" || plan === "free" ? plan : "free";
  return { plan: safe, role };
}

function writeStored(ent: Entitlement) {
  local = ent;
  try {
    localStorage.setItem(ROLE_KEY, ent.role);
    localStorage.setItem(PLAN_KEY, ent.plan);
  } catch {
    /* private mode */
  }
  emit();
}

if (typeof localStorage !== "undefined") local = readStored();

/** The device that already kept the books before billing stays the developer seat. New installs start Free. */
export function bootstrapEntitlement(hasBooks: boolean) {
  if (typeof localStorage === "undefined") return;
  if (localStorage.getItem(MIGRATED)) {
    local = readStored();
    return;
  }
  const role: Role = hasBooks ? "developer" : "user";
  localStorage.setItem(MIGRATED, "1");
  writeStored({ plan: "free", role });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const SERVER_ENT: Entitlement = { plan: "free", role: "user" };

function getClient(): Entitlement {
  return remote ?? local;
}

function getServer(): Entitlement {
  return SERVER_ENT;
}

export function useEntitlement(): Entitlement {
  return useSyncExternalStore(subscribe, getClient, getServer);
}

export function can(ent: Entitlement, feature: Feature): boolean {
  return allows(ent, feature);
}

export function EntitlementSync() {
  const { user, isPending } = useCurrentUserState();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (isPending || !userId) {
      remote = null;
      emit();
      return;
    }
    let cancel = false;
    void syncEntitlement({ data: { claimOwner: readStored().role === "developer" } })
      .then((row) => {
        if (cancel || !row) return;
        if (row.role === "developer") {
          remote = { plan: row.plan, role: "developer" };
          writeStored(remote);
          return;
        }
        if (readStored().role === "developer") {
          remote = null;
          emit();
          return;
        }
        remote = { plan: row.plan, role: row.role };
        emit();
      })
      .catch(() => {
        /* keep the local seat if the account cannot be read */
      });
    return () => {
      cancel = true;
    };
  }, [isPending, userId]);

  return null;
}
