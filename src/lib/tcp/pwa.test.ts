import assert from "node:assert/strict";
import { test } from "node:test";
import { isAndroid, isDesktop, isIos, isStandalone, installDismissed } from "./pwa.ts";

test("PWA helpers are SSR-safe without window", () => {
  assert.equal(isStandalone(), false);
  assert.equal(isIos(), false);
  assert.equal(isAndroid(), false);
  assert.equal(isDesktop(), false);
  assert.equal(installDismissed(), false);
});
