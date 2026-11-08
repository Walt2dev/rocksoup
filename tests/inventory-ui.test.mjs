import assert from "node:assert/strict";
import test from "node:test";

import {
  ITEM_INFO,
  ITEM_KEYS,
  RESOURCE_INFO,
  RESOURCE_KEYS,
  TOOL_INFO,
  TOOL_KEYS,
} from "../js/game/inventory.js";
import { sourceFor } from "../js/game/resourceSources.js";

test("todos los recursos tienen símbolo y origen documentado", () => {
  for (const key of RESOURCE_KEYS) {
    assert.ok(RESOURCE_INFO[key].symbol);
    assert.notEqual(sourceFor("resource", key), "Se obtiene explorando el mundo.");
  }

  assert.match(sourceFor("resource", "fibra"), /arbustos/i);
});

test("objetos y herramientas tienen símbolo y origen documentado", () => {
  for (const key of ITEM_KEYS) {
    assert.ok(ITEM_INFO[key].symbol);
    assert.notEqual(sourceFor("item", key), "Se consigue explorando o fabricando.");
  }

  for (const key of TOOL_KEYS) {
    assert.ok(TOOL_INFO[key].symbol);
    assert.notEqual(sourceFor("tool", key), "Se fabrica en Crafteo.");
  }

  assert.match(sourceFor("item", "pescado"), /pesca/i);
  assert.match(sourceFor("item", "swimPotion"), /mesa de brebajes/i);
});
