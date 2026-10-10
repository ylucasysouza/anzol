import { useEffect, useSyncExternalStore } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getEntitlement } from "@/lib/tcp/entitlement-api";
import { CACHE_KEY, FREE, fromCache, type CachedEnt } from "@/lib/tcp/entitlement-cache";
import { allows, type Entitlement, type Feature } from "@/lib/tcp/plans";

/**
 * O plano vem SEMPRE do servidor (getEntitlement). O cliente só guarda a última
 * resposta para funcionar sem internet, com prazo (ver entitlement-cache.ts).
 * Quando o servidor responde, a resposta dele substitui o cache.
 */
let current: Entitlement = FREE;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function set(ent: Entitlement) {
  if (ent.plan === current.plan && ent.role === current.role) return;
  current = ent;
  emit();
}

function readCache(userId: string | null): Entitlement {
  if (typeof localStorage === "undefined") return FREE;
  try {
    return fromCache(localStorage.getItem(CACHE_KEY), userId);
  } catch {
    return FREE;
  }
}

/** Antes o plano era escrito pelo próprio aparelho. Agora não vale mais: apaga as chaves antigas. */
export function bootstrapEntitlement(_hasBooks?: boolean) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem("anzol-plan");
    localStorage.removeItem("anzol-role");
  } catch {
    /* private mode */
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const getClient = () => current;
const getServer = () => FREE;

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
    if (isPending) return;
    if (!userId) {
      set(FREE);
      return;
    }
    set(readCache(userId)); // offline: última resposta do servidor, se ainda válida
    let cancel = false;
    const refresh = () =>
      getEntitlement()
        .then((row) => {
          if (cancel || !row) return;
          const cached: CachedEnt = { userId, ...row };
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
          } catch {
            /* private mode */
          }
          set({ plan: row.plan, role: row.role }); // servidor vence
        })
        .catch(() => {
          /* sem rede: segue o cache com prazo */
        });
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    return () => {
      cancel = true;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
    };
  }, [isPending, userId]);

  return null;
}
