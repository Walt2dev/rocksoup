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
