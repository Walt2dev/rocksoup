import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeSave } from "../js/game/save.js";

function minimalSave(extra = {}) {
  return {
    seed: "deadbeef",
    camera: { x: 0, y: 0, zoom: 1 },
    ...extra,
  };
}

test("el guardado acepta una perdiz o un lobo como companero", () => {
  const perdiz = sanitizeSave(minimalSave({ companion: { species: "perdiz" } }));
  const wolf = sanitizeSave(minimalSave({ companion: { species: "wolf" } }));
  const invalid = sanitizeSave(minimalSave({ companion: { species: "gato" } }));

  assert.equal(perdiz.companion.species, "perdiz");
  assert.equal(wolf.companion.species, "wolf");
  assert.equal(invalid.companion, null);
});

test("el guardado conserva dificultad, bandera y nucleo", () => {
  const save = sanitizeSave(
    minimalSave({
      difficulty: "hard",
      colonyBanner: { color: "#123456", name: "Lobos del Sur", symbol: "lobo" },
      colonyCore: { university: { hp: 50 }, observatory: { hp: 0 } },
      campaignStatus: "victory",
      everAllied: true,
      hordesStarted: true,
      lastHordeDay: 9,
    }),
  );

  assert.equal(save.difficulty, "hard");
  assert.equal(save.colonyBanner.color, "#123456");
  assert.equal(save.colonyBanner.name, "Lobos del Sur");
  assert.equal(save.colonyBanner.symbol, "lobo");
  assert.equal(save.colonyCore.university.hp, 50);
  assert.equal(save.colonyCore.observatory.hp, 0);
  assert.equal(save.campaignStatus, "victory");
  assert.equal(save.hordesStarted, true);
  assert.equal(save.lastHordeDay, 9);
  assert.equal(save.everAllied, true);
});
