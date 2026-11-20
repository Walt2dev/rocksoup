import assert from "node:assert/strict";
import test from "node:test";

import { BIOME } from "../js/world/biomes.js";
import { createCaveLayout } from "../js/world/caveLayout.js";
import { createSkyLayout } from "../js/world/skyLayout.js";
import { findSurfacePortals, sanitizePortals } from "../js/world/portals.js";
import { World } from "../js/world/world.js";

test("el laberinto de cuevas es determinista y tiene entrada y salida abiertas", () => {
  const first = createCaveLayout("cueva-test");
  const second = createCaveLayout("cueva-test");
  assert.deepEqual(first.entry, second.entry);
  assert.deepEqual(first.exit, second.exit);
  assert.equal(first.isOpen(first.entry.x, first.entry.y), true);
  assert.equal(first.isOpen(first.exit.x, first.exit.y), true);
  assert.equal(first.sample(first.entry.x, first.entry.y).biome, BIOME.CAVE_FLOOR);
  assert.equal(first.sample(0, 0).biome, BIOME.CAVE_WALL);
  assert.equal(first.sample(-1, 0).biome, BIOME.CAVE_WALL);
});

test("el cielo genera nubes, caminos de oro y vacío", () => {
  const layout = createSkyLayout("cielo-test");
  assert.equal(layout.isCloud(layout.entry.x, layout.entry.y), true);
  const entryBiome = layout.sample(layout.entry.x, layout.entry.y).biome;
  assert.ok([BIOME.CLOUD, BIOME.GOLD_PATH].includes(entryBiome));
  assert.equal(layout.sample(-10, -10).biome, BIOME.VOID);
  const first = createSkyLayout("cielo-test");
  assert.deepEqual(first.entry, layout.entry);
});

test("los mundos de reino generan chunks con sus biomas", () => {
  const underground = new World("reino", { realm: "underground", flat: true });
  const caveChunk = underground.getChunk(0, 0);
  assert.ok(
    Array.from(caveChunk.biome).every(
      (biome) => biome === BIOME.CAVE_FLOOR || biome === BIOME.CAVE_WALL,
    ),
  );
  assert.equal(underground.isWalkableAt(underground.realmLayout.entry.x, underground.realmLayout.entry.y), true);

  const sky = new World("reino", { realm: "sky", flat: true });
  const skyChunk = sky.getChunk(0, 0);
  assert.ok(
    Array.from(skyChunk.biome).every((biome) =>
      [BIOME.CLOUD, BIOME.GOLD_PATH, BIOME.VOID].includes(biome),
    ),
  );
  assert.equal(sky.isWalkableAt(sky.realmLayout.entry.x, sky.realmLayout.entry.y), true);
});

test("los portales generados son deterministas y apuntan a los dos reinos", () => {
  const world = new World("portales-test", { flat: true });
  const spawn = world.findSpawn();
  const first = findSurfacePortals(world, world.seed, spawn, []);
  const second = findSurfacePortals(world, world.seed, spawn, []);
  assert.deepEqual(first, second);
  assert.equal(first.length, 2);
  assert.deepEqual(
    first.map((portal) => portal.realm).sort(),
    ["sky", "underground"],
  );
  for (const portal of first) {
    assert.equal(world.isWalkableAt(portal.x, portal.y), true);
  }
});

test("sanitizePortals descarta entradas inválidas y duplicadas", () => {
  const portals = sanitizePortals([
    { id: "a", realm: "underground", kind: "cave", x: 1, y: 2 },
    { id: "a", realm: "sky", kind: "stairs", x: 3, y: 4 },
    { id: "", realm: "sky", x: 5, y: 6 },
    { id: "b", realm: "otro", x: 7, y: 8 },
    { id: "c", realm: "sky", kind: "stairs", x: 9, y: 10 },
  ]);
  assert.equal(portals.length, 2);
  assert.equal(portals[0].id, "a");
  assert.equal(portals[1].id, "c");
});
