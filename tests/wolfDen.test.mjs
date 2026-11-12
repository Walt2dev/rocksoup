import assert from "node:assert/strict";
import test from "node:test";

import { BIOME } from "../js/world/biomes.js";
import {
  WOLF_MISSION,
  findWolfDenSite,
  wolfMissionState,
} from "../js/game/wolfDen.js";

function fakeWorld({ wolf = true, snow = true, walkable = true } = {}) {
  return {
    biomeAt(x, y) {
      if (wolf) return BIOME.WOLF;
      if (snow) return BIOME.SNOW;
      return BIOME.GRASS;
    },
    isWalkableAt() {
      return walkable;
    },
  };
}

test("la misión de lobos exige 3 lobos y 2 pieles", () => {
  const pending = wolfMissionState({ kills: 2, pelts: 1 });
  assert.equal(pending.canClaim, false);

  const ready = wolfMissionState({ kills: 3, pelts: 2 });
  assert.equal(ready.canClaim, true);
  assert.equal(ready.killsReady, true);
  assert.equal(ready.peltsReady, true);

  const done = wolfMissionState({ kills: 3, pelts: 2, completed: true });
  assert.equal(done.completed, true);
  assert.equal(done.canClaim, false);
  assert.equal(WOLF_MISSION.wolvesRequired, 3);
});

test("la cueva se busca primero en el bosque de lobos", () => {
  const site = findWolfDenSite(fakeWorld(), "seed-wolf", { x: 0, y: 0 });
  assert.ok(site);
  assert.equal(site.biome, BIOME.WOLF);
  assert.equal(site.id, WOLF_MISSION.id);
  assert.ok(Number.isFinite(site.x) && Number.isFinite(site.y));
});

test("si no hay bosque de lobos se usa la nieve como respaldo", () => {
  const site = findWolfDenSite(fakeWorld({ wolf: false }), "seed-snow", {
    x: 0,
    y: 0,
  });
  assert.ok(site);
  assert.equal(site.biome, BIOME.SNOW);
});

test("si no hay biomas fríos se usa la pradera como último recurso", () => {
  const site = findWolfDenSite(fakeWorld({ wolf: false, snow: false }), "seed-grass", {
    x: 0,
    y: 0,
  });
  assert.ok(site);
  assert.equal(site.biome, BIOME.GRASS);
});

test("sin terreno transitable no se crea cueva", () => {
  const site = findWolfDenSite(
    fakeWorld({ wolf: false, snow: false, walkable: false }),
    "seed",
    { x: 0, y: 0 },
  );
  assert.equal(site, null);
});
