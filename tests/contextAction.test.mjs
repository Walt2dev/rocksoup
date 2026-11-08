import test from "node:test";
import assert from "node:assert/strict";

import {
  isConsumableItem,
  isPlaceableItem,
  resolveContextAction,
} from "../js/game/contextAction.js";

test("sin selección la acción principal es atacar", () => {
  assert.deepEqual(resolveContextAction({}), {
    id: "attack",
    label: "Atacar",
    icon: "sword",
  });
});

test("las herramientas de combate atacan", () => {
  for (const key of ["spear", "sword", "bow"]) {
    assert.equal(
      resolveContextAction({ entry: { kind: "tool", key } }).id,
      "attack",
    );
  }
});

test("los objetos colocables priorizan colocar", () => {
  for (const key of ["campfire", "chest", "stonePath", "bed"]) {
    assert.equal(isPlaceableItem(key), true);
    assert.equal(
      resolveContextAction({ entry: { kind: "item", key } }).id,
      "place",
    );
  }
});

test("los consumibles priorizan usar", () => {
  for (const key of ["coffee", "bandage", "healingPotion", "pan"]) {
    assert.equal(isConsumableItem(key), true);
    assert.equal(
      resolveContextAction({ entry: { kind: "item", key } }).id,
      "use",
    );
  }
});

test("montado, pescando o colocando tienen prioridad", () => {
  assert.equal(resolveContextAction({ mounted: true }).id, "dismount");
  assert.equal(resolveContextAction({ placing: true }).id, "place");
  assert.equal(
    resolveContextAction({ fishing: { phase: "bite" } }).label,
    "\u00A1Pescar!",
  );
  assert.equal(
    resolveContextAction({ fishing: { phase: "waiting" } }).id,
    "fish",
  );
});

test("la caña de pescar sugiere pescar", () => {
  assert.equal(
    resolveContextAction({ entry: { kind: "tool", key: "fishingRod" } }).id,
    "use",
  );
});
