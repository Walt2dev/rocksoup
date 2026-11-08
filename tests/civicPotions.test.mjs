import test from "node:test";
import assert from "node:assert/strict";

import { BIOME } from "../js/world/biomes.js";
import {
  CIVIC_POTIONS,
  civicLineForVillage,
  civicPotionById,
  civicRecipeState,
  craftCivicPotion,
} from "../js/game/civicPotions.js";
import { Inventory } from "../js/game/inventory.js";

test("existen 48 rituales principales, 12 por bioma", () => {
  assert.equal(CIVIC_POTIONS.length, 48);
  for (const biome of [BIOME.GRASS, BIOME.FOREST, BIOME.DESERT, BIOME.SNOW]) {
    const line = civicLineForVillage({ biome });
    assert.equal(line.length, 12);
    assert.deepEqual(
      line.map((entry) => entry.tier),
      Array.from({ length: 12 }, (_, index) => index + 1),
    );
  }
  assert.equal(civicLineForVillage({ biome: BIOME.BEACH }).length, 4);
  assert.ok(civicPotionById(CIVIC_POTIONS[0].id));
  assert.equal(new Set(CIVIC_POTIONS.map((entry) => entry.id)).size, 48);
});

test("los rituales van exigiendo más ciencia y apuntes", () => {
  const tier1 = civicLineForVillage({ biome: BIOME.FOREST })[0];
  const tier3 = civicLineForVillage({ biome: BIOME.FOREST })[2];
  const tier4 = civicLineForVillage({ biome: BIOME.FOREST })[3];

  assert.equal(tier1.noteRequired, false);
  assert.equal(tier3.noteRequired, true);
  assert.equal(tier3.scienceBook, "brews");
  assert.equal(tier4.moonPhase, "full");
  assert.ok(tier3.constellationId);
});

test("preparar un ritual consume sus ingredientes", () => {
  const recipe = civicLineForVillage({ biome: BIOME.GRASS })[0];
  const inventory = new Inventory({ capacity: 100 });
  inventory.add("agua", 2);
  inventory.add("bayas", 2);

  assert.equal(
    civicRecipeState(recipe, inventory, { observationIds: [] }).canCraft,
    true,
  );
  assert.equal(craftCivicPotion(recipe, inventory), true);
  assert.equal(inventory.count("agua"), 1);
  assert.equal(inventory.count("bayas"), 1);

  const locked = civicLineForVillage({ biome: BIOME.GRASS })[2];
  const noNote = civicRecipeState(locked, inventory, {
    observationIds: [],
    moonPhase: "full",
    scienceLevels: { brews: 4 },
  });
  assert.equal(noNote.missingNote, true);
  assert.equal(noNote.canCraft, false);
});

test("cada aldea tiene una primera petición distinta", () => {
  const villages = [
    { biome: BIOME.BEACH },
    { biome: BIOME.GRASS },
    { biome: BIOME.FOREST },
    { biome: BIOME.ROCK },
    { biome: BIOME.SNOW },
    { biome: BIOME.DESERT },
    { biome: BIOME.JUNGLE },
  ];
  const firstNames = villages.map(
    (village) => civicLineForVillage(village)[0].name,
  );
  assert.equal(new Set(firstNames).size, villages.length);
});
