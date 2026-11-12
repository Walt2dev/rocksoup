import test from "node:test";
import assert from "node:assert/strict";

import {
  BUILDING_TYPES,
  DIFFICULTIES,
  BASE_POPULATION,
  buildingCost,
  housingCountForVillage,
  populationCapForProgresses,
  fiefRank,
  nextDifficulty,
  shouldStartHorde,
  unitCapForBuilding,
  waveDamageMultiplier,
  waveEnemyCount,
  waveHealthMultiplier,
  waveTypeForIndex,
} from "../js/game/towerDefense.js";

test("las dificultades escalan y se recorren en orden", () => {
  assert.equal(DIFFICULTIES.easy.name, "Fácil");
  assert.equal(DIFFICULTIES.normal.name, "Normal");
  assert.equal(DIFFICULTIES.hard.name, "Difícil");
  assert.equal(nextDifficulty("easy"), "normal");
  assert.equal(nextDifficulty("normal"), "hard");
  assert.equal(nextDifficulty("hard"), "easy");
  assert.ok(DIFFICULTIES.hard.enemyCountScale > DIFFICULTIES.easy.enemyCountScale);
});

test("las hordas empiezan la segunda noche y siguen en luna nueva", () => {
  assert.equal(shouldStartHorde({ night: false, day: 2 }), false);
  assert.equal(shouldStartHorde({ night: true, day: 1 }), false);
  assert.equal(shouldStartHorde({ night: true, day: 2 }), true);
  assert.equal(
    shouldStartHorde({
      night: true,
      day: 9,
      moonPhaseId: "new",
      hordesStarted: true,
      lastHordeDay: 2,
    }),
    true,
  );
  assert.equal(
    shouldStartHorde({
      night: true,
      day: 10,
      moonPhaseId: "waxingCrescent",
      hordesStarted: true,
      lastHordeDay: 9,
    }),
    false,
  );
});

test("las oleadas escalan y respetan el límite", () => {
  assert.equal(waveEnemyCount(1), 4);
  assert.equal(waveEnemyCount(4), 10);
  assert.equal(waveEnemyCount(50), 30);
  assert.ok(waveHealthMultiplier(5) > waveHealthMultiplier(1));
  assert.ok(waveDamageMultiplier(5) > waveDamageMultiplier(1));
  assert.ok(
    waveHealthMultiplier(5, "hard") > waveHealthMultiplier(5, "easy"),
  );
  assert.equal(waveTypeForIndex(0, 5), "raider");
  assert.equal(waveTypeForIndex(2, 2), "archer");
  assert.equal(waveTypeForIndex(4, 4), "brute");
  assert.equal(waveTypeForIndex(8, 6), "shaman");
});

test("los edificios tienen costes y capacidades progresivas", () => {
  assert.ok(Object.keys(BUILDING_TYPES).length >= 8);
  assert.ok(unitCapForBuilding(2) > unitCapForBuilding(1));
  assert.ok(buildingCost("armada", 2).madera > buildingCost("armada", 1).madera);
  assert.ok(buildingCost("templo", 1).piedra > 0);
  assert.equal(BUILDING_TYPES.vivienda.populationBonus, 10);
  assert.equal(BUILDING_TYPES.vivienda.maxPerVillage, 3);
});

test("el rango de feudo exige alianza, edificios y oleadas", () => {
  assert.equal(fiefRank({}), "aldeano");
  assert.equal(fiefRank({ alliedCount: 1 }), "caudillo");
  assert.equal(fiefRank({ alliedCount: 2, buildingLevels: 2 }), "senor");
  assert.equal(
    fiefRank({ alliedCount: 4, mainAllied: 4, buildingLevels: 4, stability: 80, wavesSurvived: 10 }),
    "feudo",
  );
  assert.equal(fiefRank({ victory: true }), "principe");
});

test("las viviendas aumentan la población y respetan el máximo", () => {
  const progress = {
    buildings: [
      { type: "vivienda", level: 1, hp: 80, maxHp: 80 },
      { type: "vivienda", level: 1, hp: 80, maxHp: 80 },
      null,
      null,
    ],
  };
  assert.equal(housingCountForVillage(progress), 2);
  assert.equal(populationCapForProgresses([progress]), BASE_POPULATION + 20);
  assert.equal(populationCapForProgresses([]), BASE_POPULATION);
});
