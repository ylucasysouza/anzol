import assert from "node:assert/strict";
import { it } from "node:test";
import { fromCache } from "./entitlement-cache.ts";

const now = new Date("2026-10-10T12:00:00Z");
const c = (o: Record<string, unknown>) =>
  JSON.stringify({ userId: "u1", plan: "pro", role: "user", validUntil: "2026-11-01T00:00:00Z", checkedAt: "2026-10-09T12:00:00Z", ...o });

it("usa a resposta do servidor em cache enquanto vale", () => {
  assert.deepEqual(fromCache(c({}), "u1", now), { plan: "pro", role: "user" });
});
it("sem login, sem cache ou JSON inválido => Grátis", () => {
  assert.equal(fromCache(c({}), null, now).plan, "free");
  assert.equal(fromCache(null, "u1", now).plan, "free");
  assert.equal(fromCache("{x", "u1", now).plan, "free");
});
it("cache de outro usuário não vale", () => {
  assert.equal(fromCache(c({ userId: "u2" }), "u1", now).plan, "free");
});
it("período pago vencido => Grátis", () => {
  assert.equal(fromCache(c({ validUntil: "2026-10-01T00:00:00Z" }), "u1", now).plan, "free");
  assert.equal(fromCache(c({ validUntil: null }), "u1", now).plan, "free");
});
it("mais de 7 dias sem falar com o servidor => Grátis", () => {
  assert.equal(fromCache(c({ checkedAt: "2026-10-01T00:00:00Z" }), "u1", now).plan, "free");
});
it("data de checagem no futuro (adulterada) => Grátis", () => {
  assert.equal(fromCache(c({ checkedAt: "2027-01-01T00:00:00Z" }), "u1", now).plan, "free");
});
