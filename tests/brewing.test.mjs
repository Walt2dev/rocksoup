import assert from "node:assert/strict";
import test from "node:test";

import {
  STATION_RECIPES,
  STATION_TYPES,
  costLabel,
  craftStationRecipe,
  stationRecipeById,
  stationRecipeState,
  stationRecipes,
} from "../js/game/brewing.js";
import { Inventory } from "../js/game/inventory.js";

test("las estaciones exponen sus recetas", () => {
  assert.equal(stationRecipes(STATION_TYPES.OVEN).length, 3);
  assert.equal(stationRecipes(STATION_TYPES.BREWING_TABLE).length, 4);
  assert.equal(stationRecipes(STATION_TYPES.CAULDRON).length, 6);
  assert.equal(stationRecipeById("coffee").station, STATION_TYPES.BREWING_TABLE);
  assert.equal(stationRecipeById("roastedBerries").station, STATION_TYPES.OVEN);
  assert.equal(stationRecipeById("pescadoFrito").station, STATION_TYPES.OVEN);
  assert.equal(stationRecipeById("swimPotion").station, STATION_TYPES.BREWING_TABLE);
  assert.equal(stationRecipeById("healingPotion").station, STATION_TYPES.CAULDRON);
  assert.equal(stationRecipeById("no-existe"), null);
  assert.equal(STATION_RECIPES.length, 13);
  assert.equal(stationRecipeById("moonBrew").requiresObservation, true);
  assert.equal(costLabel("bayas"), "Bayas");
  assert.equal(costLabel("bowl"), "Tazón de madera");
});

test("el horno tuesta bayas consumiendo carbón", () => {
  const inventory = new Inventory({
    resources: { bayas: 6, C: 2 },
    capacity: 100,
  });
  const recipe = stationRecipeById("roastedBerries");

  assert.equal(stationRecipeState(recipe, inventory).canCraft, true);
  const result = craftStationRecipe(recipe, inventory);

  assert.equal(result.ok, true);
  assert.equal(inventory.count("bayas"), 3);
  assert.equal(inventory.count("C"), 1);
  assert.equal(inventory.itemCount("roastedBerries"), 1);

  const second = craftStationRecipe(recipe, inventory);
  assert.equal(second.ok, true);
  assert.equal(inventory.count("bayas"), 0);
  assert.equal(inventory.count("C"), 0);
  assert.equal(inventory.itemCount("roastedBerries"), 2);

  const third = craftStationRecipe(recipe, inventory);
  assert.equal(third.ok, false);
  assert.equal(third.reason, "resources");
  assert.equal(inventory.itemCount("roastedBerries"), 2);
});

test("la mesa de brebajes prepara café con bayas tostadas, tazón y agua", () => {
  const inventory = new Inventory({
    resources: { agua: 1 },
    capacity: 100,
  });
  inventory.addItem("roastedBerries", 1);
  inventory.addItem("bowl", 1);
  const recipe = stationRecipeById("coffee");

  assert.equal(stationRecipeState(recipe, inventory).canCraft, true);
  const result = craftStationRecipe(recipe, inventory);

  assert.equal(result.ok, true);
  assert.equal(inventory.count("agua"), 0);
  assert.equal(inventory.itemCount("roastedBerries"), 0);
  assert.equal(inventory.itemCount("bowl"), 0);
  assert.equal(inventory.itemCount("coffee"), 1);
});

test("el horno cocina pescado y la mesa prepara la poción de nado", () => {
  const inventory = new Inventory({
    resources: { C: 1, agua: 1, Si: 1 },
    capacity: 100,
  });
  inventory.addItem("pescado", 3);

  const fried = craftStationRecipe("pescadoFrito", inventory);
  assert.equal(fried.ok, true);
  assert.equal(inventory.itemCount("pescado"), 2);
  assert.equal(inventory.count("C"), 0);
  assert.equal(inventory.itemCount("pescadoFrito"), 1);

  const swim = craftStationRecipe("swimPotion", inventory);
  assert.equal(swim.ok, true);
  assert.equal(inventory.itemCount("pescado"), 0);
  assert.equal(inventory.count("agua"), 0);
  assert.equal(inventory.count("Si"), 0);
  assert.equal(inventory.itemCount("swimPotion"), 1);
});

test("las recetas lunares respetan la fase de la luna", () => {
  const inventory = new Inventory({
    resources: { agua: 2, cuarzo: 1 },
    capacity: 100,
  });
  const lunar = stationRecipeById("lunarWater");

  assert.equal(
    stationRecipeState(lunar, inventory, { moonPhase: "new" }).moonLocked,
    true,
  );
  assert.equal(
    stationRecipeState(lunar, inventory, { moonPhase: "full" }).canCraft,
    true,
  );
  assert.equal(
    craftStationRecipe(lunar, inventory, { moonPhase: "new" }).reason,
    "moon",
  );
  assert.equal(
    craftStationRecipe(lunar, inventory, { moonPhase: "full" }).ok,
    true,
  );
  assert.equal(inventory.itemCount("lunarWater"), 1);
});

test("el brebaje de constelación cambia de curación a veneno según la luna", () => {
  const full = new Inventory({
    resources: { agua: 1, bayas: 2, cuarzo: 1 },
    capacity: 100,
  });
  const fullState = stationRecipeState(
    stationRecipeById("moonBrew"),
    full,
    { moonPhase: "full", observationIds: ["constellation:1"] },
  );
  assert.equal(fullState.canCraft, true);
  const fullCraft = craftStationRecipe("moonBrew", full, {
    moonPhase: "full",
    observationIds: ["constellation:1"],
  });
  assert.equal(fullCraft.ok, true);
  assert.equal(full.itemCount("moonHealingPotion"), 1);
  assert.equal(full.itemCount("moonPoisonPotion"), 0);

  const newMoon = new Inventory({
    resources: { agua: 1, bayas: 2, cuarzo: 1 },
    capacity: 100,
  });
  const newCraft = craftStationRecipe("moonBrew", newMoon, {
    moonPhase: "new",
    observationIds: ["constellation:1"],
  });
  assert.equal(newCraft.ok, true);
  assert.equal(newMoon.itemCount("moonPoisonPotion"), 1);

  const noNote = new Inventory({
    resources: { agua: 1, bayas: 2, cuarzo: 1 },
    capacity: 100,
  });
  const noteState = stationRecipeState(
    stationRecipeById("moonBrew"),
    noNote,
    { moonPhase: "full", observationIds: [] },
  );
  assert.equal(noteState.needsObservation, true);
  assert.equal(noteState.canCraft, false);
});

test("una receta de estación no consume nada si faltan ingredientes", () => {
  const inventory = new Inventory({
    resources: { agua: 1 },
    capacity: 100,
  });
  inventory.addItem("roastedBerries", 1);

  const state = stationRecipeState(stationRecipeById("coffee"), inventory);
  assert.equal(state.canCraft, false);
  assert.deepEqual(state.missingItems, ["bowl"]);
  assert.deepEqual(state.missingResources, []);

  const result = craftStationRecipe("coffee", inventory);
  assert.equal(result.ok, false);
  assert.equal(inventory.count("agua"), 1);
  assert.equal(inventory.itemCount("roastedBerries"), 1);
  assert.equal(inventory.itemCount("coffee"), 0);
});
