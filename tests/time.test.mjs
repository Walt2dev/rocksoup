import assert from "node:assert/strict";
import test from "node:test";

import {
  CONSTELLATIONS,
  PLANETS,
  SKY_OBJECTS,
  searchSkyObjects,
  skyObjectById,
} from "../js/game/skyCatalog.js";
import {
  DAY_LENGTH_SECONDS,
  DAY_NIGHT_CYCLE,
  MOON_PHASES,
  gameDayAt,
  isNightAt,
  moonPhaseAt,
  moonPhaseIndexAt,
} from "../js/game/time.js";

test("el ciclo diario y las fases lunares avanzan por día", () => {
  assert.ok(DAY_LENGTH_SECONDS > 0);
  assert.ok(DAY_NIGHT_CYCLE > DAY_LENGTH_SECONDS);
  assert.equal(gameDayAt(0), 1);
  assert.equal(isNightAt(0), false);
  assert.equal(isNightAt(DAY_LENGTH_SECONDS), true);
  assert.equal(moonPhaseAt(0).id, "new");

  for (let day = 0; day < MOON_PHASES.length; day += 1) {
    assert.equal(moonPhaseIndexAt(day * DAY_NIGHT_CYCLE), day);
  }
  assert.equal(moonPhaseIndexAt(MOON_PHASES.length * DAY_NIGHT_CYCLE), 0);
  assert.equal(gameDayAt(DAY_NIGHT_CYCLE), 2);
});

test("el catálogo local tiene 88 constelaciones, planetas y búsqueda", () => {
  assert.equal(CONSTELLATIONS.length, 88);
  assert.ok(PLANETS.length >= 7);
  assert.equal(SKY_OBJECTS.length, CONSTELLATIONS.length + PLANETS.length);
  assert.ok(skyObjectById(CONSTELLATIONS[0].id));
  assert.ok(skyObjectById("planet:mars"));
  assert.equal(skyObjectById("no-existe"), null);

  assert.ok(searchSkyObjects("orion").some((object) => object.name === "Orion"));
  assert.ok(searchSkyObjects("marte").some((object) => object.name === "Marte"));
  assert.equal(searchSkyObjects("zzzz").length, 0);
  assert.equal(searchSkyObjects("").length, SKY_OBJECTS.length);
});
