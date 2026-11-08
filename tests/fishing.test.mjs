import assert from "node:assert/strict";
import test from "node:test";

import { createRng } from "../js/core/rng.js";
import {
  FISH_SPECIES,
  FISHING_BITE_SECONDS,
  createFishingAttempt,
  fishById,
  fishingMarkerAt,
  formatFishWeight,
  resolveFishingCatch,
  updateFishingAttempt,
} from "../js/game/fishing.js";

test("el catálogo de peces es válido y determinista", () => {
  assert.equal(FISH_SPECIES.length, 5);
  assert.ok(fishById(FISH_SPECIES[0].id));
  assert.equal(fishById("no-existe"), null);

  for (const fish of FISH_SPECIES) {
    assert.ok(fish.name);
    assert.ok(fish.maxWeight > fish.minWeight);
    assert.ok(fish.weightChance > 0);
  }

  const first = createFishingAttempt(createRng("pesca"));
  const second = createFishingAttempt(createRng("pesca"));

  assert.deepEqual(first, second);
  assert.equal(first.phase, "waiting");
  assert.ok(first.waitRemaining >= 3 && first.waitRemaining <= 8);
  assert.ok(fishById(first.speciesId));
});

test("la espera termina en picada y la ventana expira", () => {
  const attempt = createFishingAttempt(createRng("tiempo"), {
    waitMin: 0.2,
    waitMax: 0.2,
  });

  assert.equal(updateFishingAttempt(attempt, 0.1), "waiting");
  assert.equal(updateFishingAttempt(attempt, 0.2), "bite");
  assert.equal(attempt.phase, "bite");
  assert.equal(attempt.biteRemaining, FISHING_BITE_SECONDS);

  assert.equal(updateFishingAttempt(attempt, FISHING_BITE_SECONDS), "escape");
});

test("el marcador oscila dentro del rango de la barra", () => {
  const attempt = createFishingAttempt(createRng("marcador"));

  for (let elapsed = 0; elapsed <= 4; elapsed += 0.1) {
    const marker = fishingMarkerAt(attempt, elapsed);
    assert.ok(marker >= 0 && marker <= 1);
  }
});

test("el centro de la zona da el pez más grande y el borde falla", () => {
  const attempt = createFishingAttempt(createRng("captura"));
  const center = resolveFishingCatch(attempt, attempt.zoneCenter);
  const perfect = resolveFishingCatch(attempt, attempt.zoneCenter + 0.01);
  const edge = resolveFishingCatch(
    attempt,
    attempt.zoneCenter + attempt.zoneHalf + 0.01,
  );

  assert.equal(center.caught, true);
  assert.equal(center.perfect, true);
  assert.ok(center.weight > perfect.weight);
  assert.equal(edge.caught, false);
  assert.equal(edge.reason, "miss");
  assert.match(formatFishWeight(center.weight), /kg$/);
});
