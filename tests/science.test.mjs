import test from "node:test";
import assert from "node:assert/strict";

import {
  LENS_LEVELS,
  SCIENCE_TIER_COSTS,
  investigationReward,
  lensForXp,
  nextLensForXp,
  sanitizeSciencePoints,
  scienceCategoryForObject,
  scienceLevel,
  scienceModifiers,
} from "../js/game/science.js";

test("las categorías científicas dependen de la ascensión recta", () => {
  assert.equal(scienceCategoryForObject({ ra: 1 }), "tools");
  assert.equal(scienceCategoryForObject({ ra: 7 }), "weapons");
  assert.equal(scienceCategoryForObject({ ra: 13 }), "potions");
  assert.equal(scienceCategoryForObject({ ra: 19 }), "brews");
});

test("los libros y modificadores científicos progresan", () => {
  assert.equal(scienceLevel({ tools: 119 }, "tools"), 0);
  assert.equal(scienceLevel({ tools: 120 }, "tools"), 1);
  assert.equal(scienceLevel({ tools: SCIENCE_TIER_COSTS.at(-1) }, "tools"), 4);
  const modifiers = scienceModifiers({
    tools: 120,
    weapons: 300,
    potions: 600,
    brews: 0,
  });
  assert.equal(modifiers.tools, 1);
  assert.equal(modifiers.weapons, 2);
  assert.equal(modifiers.potions, 3);
  assert.ok(modifiers.gatherMultiplier < 1);
  assert.ok(modifiers.attackMultiplier > 1);
  assert.ok(modifiers.potionMultiplier > 1);
});

test("los lentes mejoran con la investigación y la recompensa escala", () => {
  const base = lensForXp(0);
  const advanced = lensForXp(LENS_LEVELS[3].xp);
  assert.equal(base.name, "Lente de bronce");
  assert.equal(advanced.name, "Lente estelar");
  assert.ok(advanced.tolerance > base.tolerance);
  assert.equal(nextLensForXp(LENS_LEVELS.at(-1).xp), null);

  const low = investigationReward({ ra: 13 }, 20, 0);
  const high = investigationReward({ ra: 13 }, 95, 15);
  assert.equal(low.category, "potions");
  assert.ok(high.points > low.points);
  assert.ok(high.lensXp > low.lensXp);
  assert.deepEqual(sanitizeSciencePoints({ tools: 10.9, weapons: -2 }), {
    tools: 10,
    weapons: 0,
    potions: 0,
    brews: 0,
  });
});
