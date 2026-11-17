import test from "node:test";
import assert from "node:assert/strict";

import {
  applyGrantsToInventory,
  applyGrantsToSave,
  mergeGrants,
  sanitizeGrants,
} from "../server/grants.mjs";
import {
  appendLoreEvent,
  createLore,
  sanitizeLore,
} from "../server/lore.mjs";
import {
  STORE_PRODUCTS,
  getProduct,
  publicProduct,
  publicProducts,
} from "../server/storeCatalog.mjs";

test("sanitizeGrants acepta solo recursos, objetos y mejoras conocidas", () => {
  const grants = sanitizeGrants({
    resources: { C: 10, Fe: 2, noExiste: 999, oro: -5 },
    items: { pescado: 3, inventado: 4 },
    upgrades: ["leatherArmor", "hack", "leatherArmor"],
    energy: 250,
    diamonds: 12,
    worldSlots: 1,
    entitlements: ["badge_noble", "badge_noble"],
  });

  assert.deepEqual(grants.resources, { C: 10, Fe: 2 });
  assert.deepEqual(grants.items, { pescado: 3 });
  assert.deepEqual(grants.upgrades, ["leatherArmor"]);
  assert.equal(grants.energy, 100);
  assert.equal(grants.diamonds, 12);
  assert.equal(grants.worldSlots, 1);
  assert.deepEqual(grants.entitlements, ["badge_noble"]);
});

test("applyGrantsToInventory suma sin perder el resto del inventario", () => {
  const inventory = applyGrantsToInventory(
    {
      capacity: 40,
      resources: { C: 5 },
      items: { pescado: 1 },
      upgrades: ["basket"],
    },
    {
      resources: { C: 10, oro: 2 },
      items: { pescado: 2 },
      upgrades: ["leatherArmor"],
    },
  );

  assert.equal(inventory.capacity, 40);
  assert.equal(inventory.resources.C, 15);
  assert.equal(inventory.resources.oro, 2);
  assert.equal(inventory.items.pescado, 3);
  assert.deepEqual(inventory.upgrades, ["basket", "leatherArmor"]);
});

test("applyGrantsToSave repone energía sin pasar del máximo", () => {
  const save = applyGrantsToSave(
    { player: { energy: 70 }, inventory: { resources: {} } },
    { energy: 80, resources: { C: 4 } },
  );

  assert.equal(save.player.energy, 100);
  assert.equal(save.inventory.resources.C, 4);
});

test("mergeGrants acumula varias recompensas", () => {
  const merged = mergeGrants(
    { resources: { C: 10 }, diamonds: 2, upgrades: ["basket"] },
    { resources: { C: 5, oro: 1 }, diamonds: 3, upgrades: ["leatherArmor"] },
  );

  assert.equal(merged.resources.C, 15);
  assert.equal(merged.resources.oro, 1);
  assert.equal(merged.diamonds, 5);
  assert.deepEqual(merged.upgrades, ["basket", "leatherArmor"]);
});

test("el lore conserva solo eventos válidos y limita texto", () => {
  const lore = createLore("Mundo de prueba", { seed: "abc123" });
  const next = appendLoreEvent(lore, {
    type: "player.joined",
    text: "x".repeat(400),
    actor: "Walter",
  });

  assert.equal(next.chronicle.length, 2);
  assert.equal(next.chronicle[0].type, "world.created");
  assert.equal(next.chronicle[1].text.length, 300);
  assert.equal(next.chronicle[1].actor, "Walter");
  assert.equal(sanitizeLore(next).name, "Mundo de prueba");
});

test("el catálogo contiene productos válidos y el slot de 15 MXN", () => {
  const products = publicProducts();
  assert.ok(products.length >= 10);
  assert.ok(products.every((product) => product.priceCents > 0));
  assert.deepEqual(
    STORE_PRODUCTS.map((product) => product.id),
    [...new Set(STORE_PRODUCTS.map((product) => product.id))],
  );

  const slot = getProduct("world_slot");
  assert.equal(slot.priceCents, 1500);
  assert.equal(slot.grants.worldSlots, 1);
  assert.equal(publicProduct(slot).currency, "MXN");

  for (const id of ["sub_noble", "sub_lord", "sub_feudo"]) {
    const product = getProduct(id);
    assert.equal(product.kind, "subscription");
    assert.ok(product.dailyGrants);
  }
});
