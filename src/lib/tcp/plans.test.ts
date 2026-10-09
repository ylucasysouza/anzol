import assert from "node:assert/strict";
import { it } from "node:test";
import { allows } from "./plans.ts";

it("compensação de prejuízo: Pro e acima, não Grátis", () => {
  assert.equal(allows({ plan: "free", role: "user" }, "compensacao_prejuizo"), false);
  assert.equal(allows({ plan: "pro", role: "user" }, "compensacao_prejuizo"), true);
  assert.equal(allows({ plan: "baleia", role: "user" }, "compensacao_prejuizo"), true);
});
