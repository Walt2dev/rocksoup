import test from "node:test";
import assert from "node:assert/strict";

import { createWorldStore, normalizeWorldId } from "../server/worldStore.mjs";

test("normalizeWorldId limita y normaliza el identificador", () => {
  assert.equal(normalizeWorldId(""), "main");
  assert.equal(normalizeWorldId(null), "main");
  assert.equal(normalizeWorldId("  production  "), "production");
  assert.equal(normalizeWorldId("x".repeat(100)).length, 64);
});

test("sin configuración el world store queda inactivo", async () => {
  const store = createWorldStore({ env: {}, logger: { warn() {} } });

  assert.equal(store.configured, false);
  assert.equal(await store.init(), false);
  assert.equal(store.isAvailable(), false);
  assert.equal(await store.load("main"), null);
  assert.equal(await store.save("main", { seed: "x" }), false);
  await store.close();
});
