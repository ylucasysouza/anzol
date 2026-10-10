import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { Sql } from "../db.ts";
import { handleAsaasEvent, parseExternalReference, resolveEntitlement, tokenMatches } from "./asaas.ts";
import { memorySql } from "./test-sql.ts";

const NOW = new Date("2026-10-10T12:00:00Z");
const NONE = new Set<string>();
let sql: Sql;
beforeEach(async () => {
  sql = await memorySql(["0006_subscriptions.sql"]);
});

const pay = (over: Record<string, unknown> = {}, ev = "PAYMENT_RECEIVED", id = "evt_1") => ({
  id,
  event: ev,
  payment: { id: "pay_1", subscription: "sub_1", value: 29.9, dueDate: "2026-10-05", externalReference: "anzol:u1:pro:month:instagram", ...over },
});

describe("token do webhook", () => {
  it("só aceita o token exato", () => {
    assert.equal(tokenMatches("abc", "abc"), true);
    assert.equal(tokenMatches("abd", "abc"), false);
    assert.equal(tokenMatches(null, "abc"), false);
    assert.equal(tokenMatches("abc", undefined), false);
  });
});

describe("externalReference", () => {
  it("lê usuário, plano, ciclo e canal", () => {
    assert.deepEqual(parseExternalReference("anzol:u1:baleia:year:parceiro:p9"), {
      userId: "u1", plan: "baleia", cycle: "year", canal: "parceiro", parceiro: "p9",
    });
    assert.equal(parseExternalReference("anzol:u1:enterprise:month"), null);
    assert.equal(parseExternalReference("outro"), null);
  });
});

describe("eventos do Asaas", () => {
  it("sem pagamento confirmado o plano é Grátis", async () => {
    assert.equal((await resolveEntitlement(sql, "u1", "a@b.c", NOW, NONE)).plan, "free");
  });

  it("PAYMENT_RECEIVED libera o Pro até o fim do período + 3 dias", async () => {
    assert.deepEqual(await handleAsaasEvent(sql, pay()), { ok: true, action: "activated" });
    const e = await resolveEntitlement(sql, "u1", null, NOW, NONE);
    assert.equal(e.plan, "pro");
    assert.equal(e.validUntil, "2026-11-08T00:00:00.000Z");
  });

  it("evento repetido é ignorado (idempotente)", async () => {
    await handleAsaasEvent(sql, pay());
    assert.deepEqual(await handleAsaasEvent(sql, pay()), { ok: true, action: "duplicate" });
    const rows = await sql`select count(*)::int as n from subscriptions`;
    assert.equal((rows[0] as { n: number }).n, 1);
  });

  it("CONFIRMED + RECEIVED do mesmo pagamento não estende duas vezes", async () => {
    await handleAsaasEvent(sql, pay({}, "PAYMENT_CONFIRMED", "evt_a"));
    await handleAsaasEvent(sql, pay({}, "PAYMENT_RECEIVED", "evt_b"));
    assert.equal((await resolveEntitlement(sql, "u1", null, NOW, NONE)).validUntil, "2026-11-08T00:00:00.000Z");
  });

  it("valor abaixo do preço não libera", async () => {
    const r = await handleAsaasEvent(sql, pay({ value: 1 }));
    assert.equal(r.ok, false);
    assert.equal((await resolveEntitlement(sql, "u1", null, NOW, NONE)).plan, "free");
  });

  it("Pro anual exige R$ 269", async () => {
    const r = await handleAsaasEvent(sql, pay({ value: 29.9, externalReference: "anzol:u1:pro:year" }));
    assert.equal(r.ok, false);
  });

  it("PAYMENT_OVERDUE mantém o período já pago e depois vence", async () => {
    await handleAsaasEvent(sql, pay());
    await handleAsaasEvent(sql, pay({ id: "pay_2", dueDate: "2026-11-05" }, "PAYMENT_OVERDUE", "evt_2"));
    assert.equal((await resolveEntitlement(sql, "u1", null, NOW, NONE)).plan, "pro");
    const depois = new Date("2026-11-09T00:00:00Z");
    assert.equal((await resolveEntitlement(sql, "u1", null, depois, NONE)).plan, "free");
  });

  it("SUBSCRIPTION_DELETED respeita o período pago e não reativa", async () => {
    await handleAsaasEvent(sql, pay());
    await handleAsaasEvent(sql, { id: "evt_3", event: "SUBSCRIPTION_DELETED", subscription: { id: "sub_1" } });
    const rows = await sql<{ status: string }>`select status from subscriptions where id = 'sub_1'`;
    assert.equal(rows[0].status, "canceled");
    assert.equal((await resolveEntitlement(sql, "u1", null, NOW, NONE)).plan, "pro");
  });

  it("Baleia vence o Pro quando os dois estão pagos", async () => {
    await handleAsaasEvent(sql, pay());
    await handleAsaasEvent(sql, pay({ id: "pay_9", subscription: "sub_9", value: 99.9, externalReference: "anzol:u1:baleia:month" }, "PAYMENT_CONFIRMED", "evt_9"));
    assert.equal((await resolveEntitlement(sql, "u1", null, NOW, NONE)).plan, "baleia");
  });

  it("dono só por variável de ambiente no servidor", async () => {
    const e = await resolveEntitlement(sql, "u1", "Lucas@X.com", NOW, new Set(["lucas@x.com"]));
    assert.deepEqual([e.plan, e.role], ["enterprise", "developer"]);
  });

  it("evento desconhecido é ignorado", async () => {
    assert.deepEqual(await handleAsaasEvent(sql, { event: "PAYMENT_CREATED" }), { ok: true, action: "ignored" });
  });
});
