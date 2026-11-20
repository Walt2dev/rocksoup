import assert from "node:assert/strict";
import test from "node:test";

import {
  ITEM_INFO,
  RESOURCE_INFO,
  applyInventoryContentOverrides,
} from "../js/game/inventory.js";
import {
  CRAFT_RECIPES,
  applyCraftingContentOverrides,
  recipeById,
} from "../js/game/crafting.js";
import {
  ECONOMY_PRODUCTS,
  applyStoreContentOverrides,
  getEconomyProduct,
} from "../js/game/economy.js";
import {
  contentFieldKeys,
  normalizeColorValue,
  normalizeNumberValue,
  normalizeTextValue,
} from "../js/game/contentSchema.js";

test("los overrides de inventario cambian metadatos y se restauran", () => {
  applyInventoryContentOverrides({
    resources: {
      madera: {
        label: "Madera editada",
        color: "#123456",
        symbol: "MX",
        description: "Descripción",
        iconUrl: "/api/content/sprites/resource/madera/0.png?v=1",
      },
    },
    items: { pescado: { label: "Pescado editado" } },
  });
  assert.equal(RESOURCE_INFO.madera.label, "Madera editada");
  assert.equal(RESOURCE_INFO.madera.color, "#123456");
  assert.equal(RESOURCE_INFO.madera.iconUrl.includes("/content/"), true);
  assert.equal(ITEM_INFO.pescado.label, "Pescado editado");

  applyInventoryContentOverrides({});
  assert.equal(RESOURCE_INFO.madera.label, "Madera");
  assert.equal(RESOURCE_INFO.madera.color, "#b98a4e");
  assert.equal(ITEM_INFO.pescado.label, "Pescado");
});

test("las recetas aceptan overrides y se pueden desactivar", () => {
  applyCraftingContentOverrides({
    axe: {
      name: "Hacha editada",
      costs: { madera: 9, piedra: 1 },
      active: true,
    },
    pickaxe: { active: false },
  });
  const axe = recipeById("axe");
  assert.equal(axe.name, "Hacha editada");
  assert.deepEqual(axe.costs, { madera: 9, piedra: 1 });
  assert.equal(recipeById("pickaxe"), null);
  assert.equal(
    CRAFT_RECIPES.some((recipe) => recipe.id === "pickaxe"),
    false,
  );

  applyCraftingContentOverrides({});
  assert.equal(recipeById("axe").name, "Hacha de piedra");
  assert.ok(recipeById("pickaxe"));
});

test("la tienda acepta overrides y se restaura", () => {
  applyStoreContentOverrides({
    energy_small: {
      name: "Energía editada",
      description: "Otra",
      price: { currency: "drac", amount: 1 },
      grants: { energy: 1 },
      highlights: ["Prueba"],
      active: true,
    },
    energy_full: { active: false },
  });
  const energy = getEconomyProduct("energy_small");
  assert.equal(energy.name, "Energía editada");
  assert.equal(energy.price.amount, 1);
  assert.equal(energy.grants.energy, 1);
  assert.equal(getEconomyProduct("energy_full"), null);
  assert.equal(
    ECONOMY_PRODUCTS.some((product) => product.id === "energy_full"),
    false,
  );

  applyStoreContentOverrides({});
  assert.equal(getEconomyProduct("energy_small").name, "Poción de energía");
  assert.equal(getEconomyProduct("energy_full").price.amount, 400);
});

test("normalizadores de contenido limitan valores", () => {
  assert.equal(normalizeTextValue("  hola  ", 4), "hola");
  assert.equal(normalizeTextValue(123, 10, "x"), "x");
  assert.equal(normalizeColorValue("#AABBCC"), "#aabbcc");
  assert.equal(normalizeColorValue("rojo", "#000000"), "#000000");
  assert.equal(normalizeNumberValue("12.8", 0, 0, 10), 10);
  assert.deepEqual(contentFieldKeys("store").slice(0, 4), [
    "name",
    "description",
    "priceCurrency",
    "priceAmount",
  ]);
});
