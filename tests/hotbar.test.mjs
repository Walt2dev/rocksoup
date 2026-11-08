import test from "node:test";
import assert from "node:assert/strict";

import {
  assignHotbarSlot,
  clearHotbarSlot,
  defaultHotbarSlots,
  firstEmptyHotbarSlot,
  hotbarEntryAt,
  normalizeHotbarSlots,
} from "../js/game/hotbar.js";

test("normaliza los slots y descarta entradas inválidas", () => {
  const slots = normalizeHotbarSlots([
    { kind: "tool", key: "axe" },
    { kind: "item", key: 3 },
    null,
    { kind: "resource", key: "madera" },
  ]);

  assert.equal(slots.length, 9);
  assert.deepEqual(slots[0], { kind: "tool", key: "axe" });
  assert.equal(slots[1], null);
  assert.deepEqual(slots[3], { kind: "resource", key: "madera" });
});

test("rellena por defecto con los primeros objetos", () => {
  const entries = [
    { kind: "resource", key: "madera" },
    { kind: "tool", key: "axe" },
  ];
  const slots = defaultHotbarSlots(entries);

  assert.deepEqual(slots[0], { kind: "resource", key: "madera" });
  assert.deepEqual(slots[1], { kind: "tool", key: "axe" });
  assert.equal(firstEmptyHotbarSlot(slots), 2);
});

test("asignar desde inventario evita duplicados", () => {
  let slots = normalizeHotbarSlots([{ kind: "tool", key: "axe" }]);
  slots = assignHotbarSlot(slots, 3, { kind: "tool", key: "axe" });

  assert.equal(slots[0], null);
  assert.deepEqual(slots[3], { kind: "tool", key: "axe" });
});

test("mover entre slots intercambia", () => {
  const slots = normalizeHotbarSlots([
    { kind: "tool", key: "axe" },
    { kind: "item", key: "campfire" },
  ]);

  const moved = assignHotbarSlot(slots, 1, null, { sourceIndex: 0 });

  assert.deepEqual(moved[0], { kind: "item", key: "campfire" });
  assert.deepEqual(moved[1], { kind: "tool", key: "axe" });
});

test("limpiar un slot conserva el resto", () => {
  const slots = normalizeHotbarSlots([
    { kind: "tool", key: "axe" },
    { kind: "item", key: "campfire" },
  ]);
  const cleared = clearHotbarSlot(slots, 0);

  assert.equal(cleared[0], null);
  assert.deepEqual(cleared[1], { kind: "item", key: "campfire" });
});

test("hotbarEntryAt solo devuelve objetos presentes en el inventario", () => {
  const slots = normalizeHotbarSlots([
    { kind: "tool", key: "axe" },
    { kind: "item", key: "campfire" },
  ]);
  const entries = [{ kind: "tool", key: "axe" }];

  assert.deepEqual(hotbarEntryAt(slots, 0, entries), {
    kind: "tool",
    key: "axe",
  });
  assert.equal(hotbarEntryAt(slots, 1, entries), null);
});
