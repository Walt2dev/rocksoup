import test from "node:test";
import assert from "node:assert/strict";

import { World } from "../js/world/world.js";
import { createAmbientSync } from "../server/ambientSync.mjs";
import {
  AMBIENT_MAX_HEALTH,
  AMBIENT_SPECIES,
} from "../js/game/ambient.js";
import { DAY_LENGTH_SECONDS } from "../js/game/time.js";

function makePlayers() {
  return [
    { id: 1, x: 10, y: 10 },
    { id: 2, x: 14, y: 12 },
  ];
}

test("el sincronizador de fauna genera entidades compartidas y deterministas", () => {
  const world = new World("ambient-sync-shared", { flat: true });
  const first = createAmbientSync({ world, seed: "ambient-sync-shared" });
  const second = createAmbientSync({ world, seed: "ambient-sync-shared" });
  const players = makePlayers();

  for (let index = 0; index < 30; index += 1) {
    first.tick(0.1, players, 100, []);
    second.tick(0.1, players, 100, []);
  }

  const a = first.snapshot();
  const b = second.snapshot();

  assert.ok(a.length > 0);
  assert.equal(a.length, b.length);
  assert.deepEqual(
    a.map((entry) => [entry.id, entry.species]),
    b.map((entry) => [entry.id, entry.species]),
  );
  assert.ok(a.every((entry) => Object.values(AMBIENT_SPECIES).includes(entry.species)));
});

test("el daño de fauna reduce vida y elimina al morir", () => {
  const world = new World("ambient-sync-damage", { flat: true });
  const sync = createAmbientSync({ world, seed: "ambient-sync-damage" });
  const players = makePlayers();

  sync.tick(0.1, players, 100, []);
  const before = sync.size;
  const [entity] = sync.snapshot();
  assert.ok(entity);

  const firstHit = sync.damage(entity.id, 1);
  assert.equal(firstHit.health, AMBIENT_MAX_HEALTH[entity.species] - 1);
  assert.equal(firstHit.killed, false);

  const finalHit = sync.damage(
    entity.id,
    AMBIENT_MAX_HEALTH[entity.species],
  );
  assert.equal(finalHit.killed, true);
  assert.equal(sync.size, before - 1);
});

test("la fauna nocturna del servidor aparece de noche", () => {
  const world = new World("ambient-sync-night", { flat: true });
  const sync = createAmbientSync({ world, seed: "ambient-sync-night" });
  const players = makePlayers();

  for (let index = 0; index < 40; index += 1) {
    sync.tick(0.1, players, DAY_LENGTH_SECONDS + 10, []);
  }

  const snapshot = sync.snapshot();
  assert.ok(
    snapshot.some(
      (entry) =>
        entry.species === AMBIENT_SPECIES.NIGHTLING ||
        entry.species === AMBIENT_SPECIES.SPIDER,
    ),
  );
});

test("removeOwner elimina la fauna del jugador desconectado", () => {
  const world = new World("ambient-sync-leave", { flat: true });
  const sync = createAmbientSync({ world, seed: "ambient-sync-leave" });
  const [player] = makePlayers();

  sync.tick(0.1, [player], 100, []);
  assert.ok(sync.size > 0);

  sync.removeOwner(player.id);
  assert.equal(sync.size, 0);
});
