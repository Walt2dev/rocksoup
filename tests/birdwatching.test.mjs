import assert from "node:assert/strict";
import test from "node:test";

import { createRng } from "../js/core/rng.js";
import {
  BIRD_MISSION,
  BIRD_SPECIES,
  birdById,
  birdForAmbientSpecies,
  birdMissionState,
  birdWatchMarkerAt,
  createBirdWatchAttempt,
  resolveBirdWatch,
  updateBirdWatchAttempt,
} from "../js/game/birdwatching.js";

test("el catálogo de aves es válido y determinista", () => {
  assert.ok(BIRD_SPECIES.length >= 5);
  assert.equal(new Set(BIRD_SPECIES.map((bird) => bird.id)).size, BIRD_SPECIES.length);
  assert.equal(birdById("perdiz")?.name, "Perdiz");
  assert.equal(birdForAmbientSpecies("perdiz")?.id, "perdiz");
  assert.equal(birdForAmbientSpecies("wolf"), null);
});

test("crear un intento de observación es determinista", () => {
  const first = createBirdWatchAttempt(createRng("bird-a"), "sparrow");
  const second = createBirdWatchAttempt(createRng("bird-a"), "sparrow");

  assert.deepEqual(first, second);
  assert.equal(first.phase, "aiming");
  assert.ok(first.zoneCenter >= 0.24 && first.zoneCenter <= 0.76);
  assert.ok(first.zoneHalf > 0);
  assert.ok(first.duration > 0);
});

test("el marcador oscila entre 0 y 1", () => {
  const attempt = createBirdWatchAttempt(createRng("bird-marker"), "crow");
  for (let index = 0; index < 40; index += 1) {
    attempt.markerElapsed += attempt.sweepDuration / 7;
    const marker = birdWatchMarkerAt(attempt);
    assert.ok(marker >= 0 && marker <= 1);
  }
});

test("centrar el marcador da observación perfecta y fallar no registra", () => {
  const attempt = createBirdWatchAttempt(createRng("bird-resolve"), "perdiz");
  const perfect = resolveBirdWatch(attempt, attempt.zoneCenter);
  assert.equal(perfect.ok, true);
  assert.equal(perfect.perfect, true);

  const failed = createBirdWatchAttempt(createRng("bird-fail"), "perdiz");
  const opposite =
    failed.zoneCenter > 0.5 ? failed.zoneCenter - 0.4 : failed.zoneCenter + 0.4;
  const result = resolveBirdWatch(failed, Math.max(0, Math.min(1, opposite)));
  assert.equal(result.ok, false);
});

test("el intento expira si pasa el tiempo", () => {
  const attempt = createBirdWatchAttempt(createRng("bird-expire"), "owl");
  const status = updateBirdWatchAttempt(attempt, attempt.duration + 1);
  assert.equal(status.expired, true);
  assert.equal(attempt.phase, "escaped");
});

test("la misión de aves requiere tres especies distintas", () => {
  const partial = birdMissionState({ observations: ["sparrow", "crow", "crow"] });
  assert.equal(partial.count, 2);
  assert.equal(partial.complete, false);

  const complete = birdMissionState({
    observations: ["sparrow", "crow", "perdiz", "inventada"],
  });
  assert.equal(complete.count, 3);
  assert.equal(complete.complete, true);
  assert.equal(BIRD_MISSION.requiredSpecies, 3);
});
