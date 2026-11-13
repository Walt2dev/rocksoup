import assert from "node:assert/strict";
import test from "node:test";

import {
  CRAFT_RECIPES,
  CRAFT_XP_STEP,
  craftLevelForXp,
  craftLevelProgress,
  craftRecipe,
  craftXpReward,
  isRecipeOwned,
  recipeById,
  recipeState,
} from "../js/game/crafting.js";
import { Inventory } from "../js/game/inventory.js";

function richInventory(extra = {}) {
  return new Inventory({
    resources: { madera: 40, piedra: 40, Cu: 10, ...extra },
    capacity: 100,
  });
}

test("las recetas tienen identificadores únicos y costes válidos", () => {
  const ids = new Set();

  for (const recipe of CRAFT_RECIPES) {
    assert.ok(recipe.id);
    assert.ok(!ids.has(recipe.id));
    ids.add(recipe.id);
    assert.ok(recipe.name);
    assert.ok(recipe.description);
    assert.ok(Object.keys(recipe.costs).length > 0);
  }

  assert.equal(recipeById("axe").tool, "axe");
  assert.equal(recipeById("desconocida"), null);
});

test("fabricar un hacha consume recursos y evita duplicados", () => {
  const inventory = richInventory();
  const axe = recipeById("axe");
  const state = recipeState(axe, inventory);

  assert.equal(state.canCraft, true);
  assert.equal(state.owned, false);
  assert.equal(isRecipeOwned(axe, inventory), false);

  const first = craftRecipe("axe", inventory);
  assert.equal(first.ok, true);
  assert.equal(inventory.hasTool("axe"), true);
  assert.equal(inventory.count("madera"), 38);
  assert.equal(inventory.count("piedra"), 37);
  assert.equal(isRecipeOwned(axe, inventory), true);

  const second = craftRecipe("axe", inventory);
  assert.equal(second.ok, false);
  assert.equal(second.reason, "owned");
  assert.equal(inventory.count("madera"), 38);
});

test("la caña de pescar consume madera y fibra", () => {
  const inventory = richInventory({ fibra: 4 });
  const rod = recipeById("fishingRod");

  assert.equal(rod.tool, "fishingRod");
  assert.equal(recipeState(rod, inventory).canCraft, true);
  assert.equal(craftRecipe("fishingRod", inventory).ok, true);
  assert.equal(inventory.hasTool("fishingRod"), true);
  assert.equal(inventory.count("madera"), 37);
  assert.equal(inventory.count("fibra"), 2);
  assert.equal(craftRecipe("fishingRod", inventory).reason, "owned");
});

test("el pico y la cesta aplican sus efectos una sola vez", () => {
  const inventory = richInventory();

  assert.equal(craftRecipe("pickaxe", inventory).ok, true);
  assert.equal(inventory.hasTool("pickaxe"), true);
  assert.equal(craftRecipe("pickaxe", inventory).reason, "owned");

  assert.equal(inventory.capacity, 100);
  assert.equal(craftRecipe("basket", inventory).ok, true);
  assert.equal(inventory.hasUpgrade("basket"), true);
  assert.equal(inventory.capacity, 120);
  assert.equal(craftRecipe("basket", inventory).reason, "owned");
  assert.equal(inventory.capacity, 120);
});

test("las fogatas se fabrican repetidamente y se guardan como objetos", () => {
  const inventory = richInventory();
  const campfire = recipeById("campfire");

  assert.equal(recipeState(campfire, inventory).count, 0);
  assert.equal(craftRecipe("campfire", inventory).ok, true);
  assert.equal(inventory.itemCount("campfire"), 1);
  assert.equal(recipeState(campfire, inventory).count, 1);

  assert.equal(craftRecipe("campfire", inventory).ok, true);
  assert.equal(inventory.itemCount("campfire"), 2);

  assert.equal(inventory.removeItem("campfire", 1), 1);
  assert.equal(inventory.itemCount("campfire"), 1);
  assert.equal(inventory.removeItem("campfire", 5), 1);
  assert.equal(inventory.itemCount("campfire"), 0);
});

test("el camino de piedras se fabrica con una piedra", () => {
  const inventory = richInventory();
  const path = recipeById("stonePath");

  assert.equal(path.type, "placeable");
  assert.equal(path.item, "stonePath");
  assert.equal(recipeState(path, inventory).canCraft, true);
  assert.equal(recipeState(path, inventory).count, 0);

  assert.equal(craftRecipe("stonePath", inventory).ok, true);
  assert.equal(inventory.itemCount("stonePath"), 1);
  assert.equal(inventory.count("piedra"), 39);
  assert.equal(recipeState(path, inventory).count, 1);
});

test("el silbato invoca duendes y respeta el límite de cuatro", () => {
  const inventory = richInventory();
  const whistle = recipeById("whistle");

  assert.equal(whistle.type, "worker");
  assert.equal(whistle.maxWorkers, 4);
  assert.equal(recipeState(whistle, inventory, { workerCount: 1 }).canCraft, true);
  assert.equal(recipeState(whistle, inventory, { workerCount: 4 }).limit, true);
  assert.equal(recipeState(whistle, inventory, { workerCount: 4 }).canCraft, false);

  const crafted = craftRecipe(whistle, inventory, { workerCount: 1 });
  assert.equal(crafted.ok, true);
  assert.equal(inventory.count("madera"), 38);
  assert.equal(inventory.count("Cu"), 8);

  const beforeWood = inventory.count("madera");
  const beforeCopper = inventory.count("Cu");
  const limited = craftRecipe(whistle, inventory, { workerCount: 4 });
  assert.equal(limited.ok, false);
  assert.equal(limited.reason, "limit");
  assert.equal(inventory.count("madera"), beforeWood);
  assert.equal(inventory.count("Cu"), beforeCopper);
});

test("los tazones se fabrican en lotes de tres", () => {
  const inventory = richInventory();
  const beforeWood = inventory.count("madera");

  assert.equal(recipeById("bowl").type, "bundle");
  assert.equal(craftRecipe("bowl", inventory).ok, true);
  assert.equal(inventory.count("madera"), beforeWood - 1);
  assert.equal(inventory.itemCount("bowl"), 3);

  assert.equal(craftRecipe("bowl", inventory).ok, true);
  assert.equal(inventory.count("madera"), beforeWood - 2);
  assert.equal(inventory.itemCount("bowl"), 6);
});

test("horno y mesa de brebajes se fabrican como objetos colocables", () => {
  const inventory = richInventory();

  assert.equal(craftRecipe("oven", inventory).ok, true);
  assert.equal(inventory.itemCount("oven"), 1);
  assert.equal(craftRecipe("brewingTable", inventory).ok, true);
  assert.equal(inventory.itemCount("brewingTable"), 1);
});

test("no se puede fabricar sin recursos y el estado refleja lo que falta", () => {
  const inventory = new Inventory({ resources: { madera: 1, piedra: 1 } });
  const axe = recipeById("axe");
  const state = recipeState(axe, inventory);

  assert.equal(state.affordable, false);
  assert.equal(state.canCraft, false);
  assert.deepEqual(state.missing.sort(), ["madera", "piedra"]);

  const result = craftRecipe(axe, inventory);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "resources");
  assert.equal(inventory.count("madera"), 1);
  assert.equal(inventory.count("piedra"), 1);
  assert.equal(inventory.hasTool("axe"), false);

  assert.equal(craftRecipe("no-existe", inventory).reason, "unknown");
  assert.equal(craftRecipe(null, inventory).reason, "unknown");
});

test("inventario serializa herramientas, objetos y mejoras", () => {
  const inventory = richInventory();
  craftRecipe("axe", inventory);
  craftRecipe("basket", inventory);
  craftRecipe("campfire", inventory);

  const parsed = Inventory.fromJSON(inventory.toJSON());

  assert.deepEqual(parsed.toJSON(), inventory.toJSON());
  assert.equal(parsed.hasTool("axe"), true);
  assert.equal(parsed.hasUpgrade("basket"), true);
  assert.equal(parsed.itemCount("campfire"), 1);
});

test("la gamificación del crafteo reparte XP y sube de nivel", () => {
  assert.equal(craftLevelForXp(0), 1);
  assert.equal(craftLevelForXp(CRAFT_XP_STEP - 1), 1);
  assert.equal(craftLevelForXp(CRAFT_XP_STEP), 2);
  assert.deepEqual(craftLevelProgress(CRAFT_XP_STEP + 10), {
    level: 2,
    current: 10,
    needed: CRAFT_XP_STEP,
    percent: (10 / CRAFT_XP_STEP) * 100,
  });
  assert.ok(craftXpReward(recipeById("axe")) > 0);
  assert.ok(
    craftXpReward(recipeById("basket")) > craftXpReward(recipeById("axe")),
  );
  assert.equal(craftLevelForXp(Number.NaN), 1);
});

test("el polvo de hueso requiere el mortero de piedra", () => {
  const inventory = richInventory({ huesoPollo: 4 });
  const recipe = recipeById("boneDust");

  assert.equal(recipe.requiresTool, "mortero");
  assert.equal(recipeState(recipe, inventory).toolMissing, true);
  assert.equal(craftRecipe("boneDust", inventory).reason, "tool");

  inventory.addTool("mortero");
  assert.equal(craftRecipe("boneDust", inventory).ok, true);
  assert.equal(inventory.itemCount("polvoHueso"), 1);
  assert.equal(inventory.count("huesoPollo"), 2);
});

