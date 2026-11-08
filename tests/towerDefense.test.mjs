import test from "node:test";
import assert from "node:assert/strict";

import {
  BUILDING_TYPES,
  GAME_MODES,
  buildingCost,
  fiefRank,
  nextMode,
  unitCapForBuilding,
  waveDamageMultiplier,
  waveEnemyCount,
  waveHealthMultiplier,
  waveTypeForIndex,
} from "../js/game/towerDefense.js";

test("los modos de juego respetan sus intervalos", () => {
  assert.equal(GAME_MODES.peaceful.interval, null);
  assert.equal(GAME_MODES.normal.interval, 180);
  assert.equal(GAME_MODES.survival.interval, 90);
  assert.equal(nextMode("peaceful"), "normal");
  assert.equal(nextMode("normal"), "survival");
  assert.equal(nextMode("survival"), "peaceful");
});

test("las oleadas escalan y respetan el límite", () => {
  assert.equal(waveEnemyCount(1), 4);
  assert.equal(waveEnemyCount(4), 10);
  assert.equal(waveEnemyCount(50), 24);
  assert.ok(waveHealthMultiplier(5) > waveHealthMultiplier(1));
  assert.ok(waveDamageMultiplier(5) > waveDamageMultiplier(1));
  assert.equal(waveTypeForIndex(0, 5), "raider");
  assert.equal(waveTypeForIndex(2, 2), "archer");
  assert.equal(waveTypeForIndex(4, 4), "brute");
  assert.equal(waveTypeForIndex(8, 6), "shaman");
});

test("los edificios tienen costes y capacidades progresivas", () => {
  assert.equal(Object.keys(BUILDING_TYPES).length, 4);
  assert.ok(unitCapForBuilding(2) > unitCapForBuilding(1));
  assert.ok(buildingCost("armada", 2).madera > buildingCost("armada", 1).madera);
  assert.ok(buildingCost("templo", 1).piedra > 0);
});

test("el rango de feudo exige alianza, edificios y oleadas", () => {
  assert.equal(fiefRank({}), "aldeano");
  assert.equal(fiefRank({ alliedCount: 1 }), "caudillo");
  assert.equal(fiefRank({ alliedCount: 2, buildingLevels: 2 }), "senor");
  assert.equal(
    fiefRank({ alliedCount: 4, mainAllied: 4, buildingLevels: 4, stability: 80, wavesSurvived: 10 }),
    "feudo",
  );
});
