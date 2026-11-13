import assert from "node:assert/strict";
import test from "node:test";

import { createRng } from "../js/core/rng.js";
import { createSaveStore } from "../js/game/save.js";
import { Camera } from "../js/render/camera.js";
import {
  BIOME,
  classifyBiome,
  classifyBiomeExpanded,
  isWalkableBiome,
} from "../js/world/biomes.js";
import { generateTree, expandLSystem } from "../js/world/lsystem.js";
import { MINERAL_TYPES, rollGoldVein, rollMineral } from "../js/world/minerals.js";
import { createNoise, fbm, fbm01 } from "../js/world/noise.js";
import { CAMERA, WORLD } from "../js/world/params.js";
import {
  BUSH_STYLES,
  rollBush,
  rollTree,
  TREE_VARIANTS,
} from "../js/world/vegetation.js";
import { World } from "../js/world/world.js";

test("el ruido simplex es determinista y está acotado", () => {
  const a = createNoise("phase2");
  const b = createNoise("phase2");
  const c = createNoise("phase2-otra");
  const samples = [
    [0, 0],
    [1.25, 3.5],
    [-10.5, 7.25],
    [100.125, -50.75],
    [-0.001, 0.002],
  ];
  let different = false;

  for (const [x, y] of samples) {
    const value = a(x, y);
    assert.equal(value, b(x, y));
    assert.ok(value >= -1.2 && value <= 1.2, `valor fuera de rango: ${value}`);
    if (Math.abs(value - c(x, y)) > 1e-6) {
      different = true;
    }
  }

  assert.ok(different, "seeds distintas deberían producir ruido distinto");
});

test("fbm y fbm01 son deterministas y respetan sus rangos", () => {
  const noise = createNoise("fbm");
  const values = [];
  const normalized = [];

  for (let i = 0; i < 100; i += 1) {
    const x = i * 0.37 - 13;
    const y = i * -0.21 + 7;
    const value = fbm(noise, x, y, 5);
    const value01 = fbm01(noise, x, y, 4);

    assert.equal(value, fbm(noise, x, y, 5));
    assert.equal(value01, fbm01(noise, x, y, 4));
    assert.ok(value >= -1 && value <= 1);
    assert.ok(value01 >= 0 && value01 <= 1);
    values.push(value);
    normalized.push(value01);
  }

  assert.ok(new Set(values.map((v) => v.toFixed(6))).size > 10);
  assert.ok(new Set(normalized.map((v) => v.toFixed(6))).size > 10);
});

test("clasificación de biomas respeta los umbrales", () => {
  assert.equal(classifyBiome(0.1, 0.9), BIOME.WATER);
  assert.equal(classifyBiome(WORLD.seaLevel + 0.001, 0.9), BIOME.BEACH);
  assert.equal(classifyBiome(0.5, 0.2), BIOME.GRASS);
  assert.equal(classifyBiome(0.5, 0.9), BIOME.FOREST);
  assert.equal(classifyBiome(0.7, 0.2), BIOME.ROCK);
  assert.equal(classifyBiome(0.9, 0.2), BIOME.SNOW);

  assert.ok(!isWalkableBiome(BIOME.WATER));
  assert.ok(isWalkableBiome(BIOME.GRASS));
  assert.ok(isWalkableBiome(BIOME.SNOW));
});

test("la clasificación expandida añade desierto, selva y nieve climática", () => {
  assert.equal(
    classifyBiomeExpanded(0.5, 0.2, 0.9, WORLD),
    BIOME.DESERT,
  );
  assert.equal(
    classifyBiomeExpanded(0.5, 0.8, 0.6, WORLD),
    BIOME.JUNGLE,
  );
  assert.equal(
    classifyBiomeExpanded(0.5, 0.5, 0.1, WORLD),
    BIOME.SNOW,
  );
  assert.equal(
    classifyBiomeExpanded(0.9, 0.2, 0.9, WORLD),
    BIOME.SNOW,
  );
  assert.equal(
    classifyBiomeExpanded(0.5, 0.2, 0.5, WORLD),
    BIOME.GRASS,
  );
});

test("el bosque de lobos requiere frío, humedad y el flag activo", () => {
  const wolfConfig = { ...WORLD, wolfBiome: true };

  assert.equal(
    classifyBiomeExpanded(0.5, 0.8, 0.1, wolfConfig),
    BIOME.WOLF,
  );
  assert.equal(
    classifyBiomeExpanded(0.5, 0.5, 0.1, wolfConfig),
    BIOME.SNOW,
  );
  assert.equal(
    classifyBiomeExpanded(0.5, 0.8, 0.1, WORLD),
    BIOME.SNOW,
  );
  assert.ok(isWalkableBiome(BIOME.WOLF));
});

test("la temperatura expandida es determinista y estable", () => {
  const first = new World("clima", { biomeSet: "expanded" });
  const second = new World("clima", { biomeSet: "expanded" });

  for (const [x, y] of [[0, 0], [10, -4], [-30, 12]]) {
    const a = first.temperatureAt(x, y);
    const b = second.temperatureAt(x, y);
    assert.equal(a, b);
    assert.ok(a >= 0 && a <= 1);
  }
});

test("la flora expandida respeta desierto, selva y nieve", () => {
  let jungle = null;
  let desert = null;

  for (let i = 0; i < 80 && !jungle; i += 1) {
    jungle = rollTree(createRng(`jungle-${i}`), BIOME.JUNGLE, 0.9, 0.9);
  }
  for (let i = 0; i < 80 && !desert; i += 1) {
    desert = rollTree(createRng(`desert-${i}`), BIOME.DESERT, 0.2, 0.9);
  }

  assert.equal(jungle.species, 2);
  assert.equal(desert.species, 3);

  let dryBush = null;
  let jungleBush = null;
  for (let i = 0; i < 3000 && !dryBush; i += 1) {
    dryBush = rollBush(createRng(`dry-${i}`), BIOME.DESERT, 0.9);
  }
  for (let i = 0; i < 80 && !jungleBush; i += 1) {
    jungleBush = rollBush(createRng(`bush-${i}`), BIOME.JUNGLE, 0.9);
  }

  assert.equal(dryBush.style, BUSH_STYLES.DRY);
  assert.equal(jungleBush.style, BUSH_STYLES.JUNGLE);
  assert.equal(rollTree(createRng("water"), BIOME.WATER, 1, 1), null);
});

test("el modo expandido es determinista y no altera el legado", () => {
  const legacy = new World("compat");
  const expanded = new World("compat", { biomeSet: "expanded" });
  const twin = new World("compat", { biomeSet: "expanded" });

  assert.equal(legacy.biomeSet, "legacy");
  assert.equal(expanded.biomeSet, "expanded");
  assert.deepEqual(
    Array.from(expanded.getChunk(0, 0).biome),
    Array.from(twin.getChunk(0, 0).biome),
  );

  const legacyBefore = Array.from(legacy.getChunk(0, 0).biome);
  expanded.getChunk(0, 0);
  assert.deepEqual(Array.from(legacy.getChunk(0, 0).biome), legacyBefore);
});

test("el mundo genera chunks perezosos y deterministas", () => {
  const world = new World("deadbeef");
  assert.equal(world.chunks.size, 0);
  assert.equal(world.generatedChunks, 0);

  const chunk = world.getChunk(0, 0);
  assert.equal(world.chunks.size, 1);
  assert.equal(world.generatedChunks, 1);
  assert.equal(chunk.size, WORLD.chunkSize);
  assert.equal(chunk.elevation.length, WORLD.chunkSize * WORLD.chunkSize);
  assert.equal(chunk.biome.length, WORLD.chunkSize * WORLD.chunkSize);
  assert.strictEqual(world.getChunk(0, 0), chunk);
  assert.equal(world.chunks.size, 1);

  const twin = new World("deadbeef");
  const twinChunk = twin.getChunk(0, 0);
  assert.deepEqual(Array.from(chunk.elevation), Array.from(twinChunk.elevation));
  assert.deepEqual(Array.from(chunk.moisture), Array.from(twinChunk.moisture));
  assert.deepEqual(Array.from(chunk.biome), Array.from(twinChunk.biome));
  assert.deepEqual(Array.from(chunk.shade), Array.from(twinChunk.shade));
  assert.deepEqual(chunk.trees, twinChunk.trees);
  assert.deepEqual(chunk.minerals, twinChunk.minerals);

  const other = new World("deadbee0").getChunk(0, 0);
  assert.notDeepEqual(Array.from(chunk.elevation), Array.from(other.elevation));
});

test("los chunks respetan las capas de ruido en todo el mundo", () => {
  const world = new World("seams");
  const chunk = world.getChunk(0, 0);
  const points = [
    [0, 0],
    [1, 5],
    [15, 31],
    [31, 16],
  ];
  const close = (actual, expected) => Math.abs(actual - expected) < 1e-6;

  for (const [x, y] of points) {
    const index = y * chunk.size + x;
    assert.ok(close(chunk.elevation[index], world.elevationAt(x, y)));
    assert.ok(close(chunk.moisture[index], world.moistureAt(x, y)));
    assert.equal(chunk.biome[index], world.biomeAt(x, y));
  }

  const east = world.getChunk(1, 0);
  for (let y = 0; y < chunk.size; y += 1) {
    assert.ok(close(east.elevation[y * east.size], world.elevationAt(chunk.size, y)));
    assert.equal(east.biome[y * east.size], world.biomeAt(chunk.size, y));
  }

  const south = world.getChunk(0, 1);
  for (let x = 0; x < chunk.size; x += 1) {
    assert.ok(close(south.elevation[x], world.elevationAt(x, chunk.size)));
    assert.equal(south.biome[x], world.biomeAt(x, chunk.size));
  }
});

test("la caché LRU limita chunks y puede regenerarlos igual", () => {
  const world = new World("lru", { maxCachedChunks: 2 });

  for (let cx = 0; cx < 6; cx += 1) {
    world.getChunk(cx, 0);
  }

  assert.ok(world.chunks.size <= 2);
  assert.ok(world.generatedChunks >= 6);

  const regenerated = world.getChunk(5, 0);
  const fresh = new World("lru", { maxCachedChunks: 2 }).getChunk(5, 0);
  assert.deepEqual(Array.from(regenerated.biome), Array.from(fresh.biome));
  assert.deepEqual(regenerated.trees, fresh.trees);
});

test("getTile es coherente con los chunks y con coordenadas negativas", () => {
  const world = new World("tiles");
  const tile = world.getTile(-1, -1);

  assert.equal(tile.cx, -1);
  assert.equal(tile.cy, -1);
  assert.equal(tile.localX, WORLD.chunkSize - 1);
  assert.equal(tile.localY, WORLD.chunkSize - 1);
  assert.ok(tile.chunk instanceof Object);
  assert.ok(Math.abs(tile.elevation - world.elevationAt(-1, -1)) < 1e-6);
  assert.equal(tile.biome, world.biomeAt(-1, -1));

  const repeated = world.getTile(-1, -1);
  assert.strictEqual(repeated.chunk, tile.chunk);
});

test("la vegetación es determinista y solo aparece en biomas válidos", () => {
  let tree = null;
  let treeSeed = "";

  for (let i = 0; i < 40 && !tree; i += 1) {
    treeSeed = `tree-${i}`;
    tree = rollTree(createRng(treeSeed), BIOME.FOREST, 1, 1);
  }

  assert.ok(tree, "debería generarse al menos un árbol en bosque denso");
  assert.deepEqual(tree, rollTree(createRng(treeSeed), BIOME.FOREST, 1, 1));
  assert.ok(tree.variant >= 0 && tree.variant < TREE_VARIANTS);
  assert.ok(tree.scale >= 0.75 && tree.scale <= 1.18);
  assert.equal(rollTree(createRng("water"), BIOME.WATER, 1, 1), null);
  assert.equal(rollTree(createRng("rock"), BIOME.ROCK, 1, 1), null);
});

test("los minerales son deterministas y tienen tipo válido", () => {
  const rolls = [];
  const validIds = new Set(MINERAL_TYPES.map((type) => type.id));

  for (let i = 0; i < 80; i += 1) {
    const roll = rollMineral(createRng(`mineral-${i}`), BIOME.ROCK, 0.95);
    assert.deepEqual(roll, rollMineral(createRng(`mineral-${i}`), BIOME.ROCK, 0.95));
    if (roll) {
      assert.ok(validIds.has(roll.type));
      assert.ok(roll.variant === 0 || roll.variant === 1);
      rolls.push(roll);
    }
  }

  assert.ok(rolls.length > 0);
  assert.ok(MINERAL_TYPES.some((type) => type.key === "amatista"));
  assert.ok(MINERAL_TYPES.some((type) => type.key === "cuarzo"));
  assert.equal(rollMineral(createRng("water"), BIOME.WATER, 1), null);
  assert.equal(rollMineral(createRng("beach"), BIOME.BEACH, 1), null);
});

test("las vetas de oro son raras y solo aparecen junto al agua", () => {
  const forced = {
    chance: () => true,
    int: () => 0,
    float: () => 0.5,
    next: () => 0.5,
  };
  const gold = MINERAL_TYPES.find((type) => type.key === "oro");

  assert.ok(gold);
  assert.equal(gold.spawnWeight, 0);

  const near = rollGoldVein(
    forced,
    { biome: BIOME.BEACH, elevation: 0.34 },
    0.95,
  );
  assert.equal(near?.type, gold.id);
  assert.equal(
    rollGoldVein(forced, { biome: BIOME.ROCK, elevation: 0.8 }, 0.95),
    null,
  );
  assert.equal(
    rollGoldVein(forced, { biome: BIOME.WATER, elevation: 0.2 }, 0.95),
    null,
  );

  const terrain = { biome: BIOME.BEACH, elevation: 0.35 };
  assert.deepEqual(
    rollGoldVein(createRng("gold-1"), terrain, 0.95),
    rollGoldVein(createRng("gold-1"), terrain, 0.95),
  );
});

test("el L-system genera árboles deterministas y acotados", () => {
  const tree = generateTree({ seed: "arbol" });
  const twin = generateTree({ seed: "arbol" });
  const other = generateTree({ seed: "arbol-2" });

  assert.deepEqual(tree.segments, twin.segments);
  assert.deepEqual(tree.leaves, twin.leaves);
  assert.notDeepEqual(tree.segments, other.segments);
  assert.ok(tree.segments.length > 20);
  assert.ok(tree.leaves.length > 0);

  for (const segment of tree.segments) {
    for (const point of [
      { x: segment.x1, y: segment.y1 },
      { x: segment.x2, y: segment.y2 },
    ]) {
      assert.ok(point.x >= tree.bounds.minX - 1e-9 && point.x <= tree.bounds.maxX + 1e-9);
      assert.ok(point.y >= tree.bounds.minY - 1e-9 && point.y <= tree.bounds.maxY + 1e-9);
    }
  }

  for (const leaf of tree.leaves) {
    assert.ok(leaf.x - leaf.size >= tree.bounds.minX - 1e-9);
    assert.ok(leaf.x + leaf.size <= tree.bounds.maxX + 1e-9);
    assert.ok(leaf.y - leaf.size >= tree.bounds.minY - 1e-9);
    assert.ok(leaf.y + leaf.size <= tree.bounds.maxY + 1e-9);
  }

  assert.ok(expandLSystem("X", { X: "FX" }, 3).startsWith("FFF"));
});

test("la cámara proyecta, invierte, desplaza y hace zoom anclado", () => {
  const camera = new Camera({ x: 10, y: 20, zoom: 1, width: 800, height: 600 });

  const screen = camera.project(12.3, 8.4);
  const world = camera.unproject(screen.x, screen.y);
  assert.ok(Math.abs(world.x - 12.3) < 1e-9);
  assert.ok(Math.abs(world.y - 8.4) < 1e-9);

  const beforePan = camera.project(12.3, 8.4);
  camera.panScreen(100, 0);
  const afterPan = camera.project(12.3, 8.4);
  assert.ok(Math.abs(afterPan.x - beforePan.x - 100) < 1e-9);
  assert.ok(Math.abs(afterPan.y - beforePan.y) < 1e-9);

  const anchorBefore = camera.unproject(250, 310);
  assert.equal(camera.zoomAt(250, 310, 2), true);
  const anchorAfter = camera.unproject(250, 310);
  assert.ok(Math.abs(anchorAfter.x - anchorBefore.x) < 1e-9);
  assert.ok(Math.abs(anchorAfter.y - anchorBefore.y) < 1e-9);

  camera.zoomAt(250, 310, 1000);
  assert.equal(camera.zoom, CAMERA.maxZoom);
  camera.zoomAt(250, 310, 0.00001);
  assert.equal(camera.zoom, CAMERA.minZoom);
});

test("el spawn es determinista y cae sobre tierra transitable", () => {
  const world = new World("spawn-test");
  const spawn = world.findSpawn();
  const twin = new World("spawn-test").findSpawn();

  assert.deepEqual(spawn, twin);
  assert.ok(Number.isFinite(spawn.x) && Number.isFinite(spawn.y));
  assert.ok(world.isWalkableAt(Math.floor(spawn.x), Math.floor(spawn.y)));
});

test("el guardado valida, escribe, lee y limpia", () => {
  const data = new Map();
  const storage = {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
  const store = createSaveStore(storage);

  assert.equal(store.read(), null);
  assert.equal(
    store.write({
      seed: "deadbeef",
      camera: { x: 1.5, y: -2.5, zoom: 99 },
      savedAt: 1700000000000,
    }),
    true,
  );

  const save = store.read();
  assert.equal(save.seed, "deadbeef");
  assert.equal(save.camera.x, 1.5);
  assert.equal(save.camera.y, -2.5);
  assert.equal(save.camera.zoom, CAMERA.maxZoom);
  assert.equal(save.savedAt, 1700000000000);
  assert.equal(save.version, 2);
  assert.equal(save.worldBiomes, "legacy");
  assert.deepEqual(save.player, {
    x: 1.5,
    y: -2.5,
    energy: 100,
    buffSeconds: 0,
    swimSeconds: 0,
  });
  assert.equal(save.inventory.capacity, 40);
  assert.deepEqual(save.inventory.tools, []);
  assert.deepEqual(save.inventory.items, {
    campfire: 0,
    bowl: 0,
    roastedBerries: 0,
    coffee: 0,
    oven: 0,
    brewingTable: 0,
    bandage: 0,
    chest: 0,
    tipi: 0,
    valla: 0,
    torch: 0,
    stoneWall: 0,
    stonePath: 0,
    bed: 0,
    cauldron: 0,
    healingPotion: 0,
    poisonPotion: 0,
    furyPotion: 0,
    resistancePotion: 0,
    unstablePotion: 0,
    pescado: 0,
    pescadoFrito: 0,
    swimPotion: 0,
    pan: 0,
    lunarWater: 0,
    starDust: 0,
    moonHealingPotion: 0,
    moonPoisonPotion: 0,
    arrow: 0,
    wolfTotem: 0,
    carnePollo: 0,
    polvoHueso: 0,
  });
  assert.deepEqual(save.inventory.upgrades, []);
  assert.deepEqual(save.harvestedNodes, []);
  assert.deepEqual(save.campfires, []);
  assert.deepEqual(save.ovens, []);
  assert.deepEqual(save.brewingTables, []);
  assert.deepEqual(save.stones, []);
  assert.deepEqual(save.groundItems, []);
  assert.deepEqual(save.workers, []);

  assert.equal(store.write({ seed: "", camera: { x: 0, y: 0, zoom: 1 } }), false);
  assert.equal(store.write({ seed: "x", camera: { x: Number.NaN, y: 0, zoom: 1 } }), false);

  store.clear();
  assert.equal(store.read(), null);
});

test("un almacenamiento bloqueado no rompe el guardado", () => {
  const broken = {
    getItem() {
      throw new Error("bloqueado");
    },
    setItem() {
      throw new Error("bloqueado");
    },
    removeItem() {
      throw new Error("bloqueado");
    },
  };
  const store = createSaveStore(broken);

  assert.equal(store.read(), null);
  assert.equal(store.write({ seed: "x", camera: { x: 0, y: 0, zoom: 1 } }), false);
  assert.doesNotThrow(() => store.clear());
  assert.equal(createSaveStore(null).read(), null);
});

test("la cámara mantiene la proyección al girar 90 grados", () => {
  const camera = new Camera({ x: 10, y: 20, zoom: 1, width: 800, height: 600 });

  for (let rotation = 0; rotation < 4; rotation += 1) {
    const before = camera.project(12.3, 8.4, 0);
    const world = camera.unproject(before.x, before.y);
    assert.ok(Math.abs(world.x - 12.3) < 1e-9);
    assert.ok(Math.abs(world.y - 8.4) < 1e-9);
    camera.rotate(1);
  }

  camera.rotate(1);
  assert.equal(camera.rotation, 1);
  const movement = camera.movementToWorld(0, 1);
  assert.ok(Number.isFinite(movement.x));
  assert.ok(Number.isFinite(movement.y));
});

test("la cámara interpola el giro y se puede desproyectar durante la transición", () => {
  const camera = new Camera({ x: 10, y: 20, zoom: 1, width: 800, height: 600 });

  camera.rotateSmooth(1);
  assert.equal(camera.rotation, 1);
  assert.equal(camera.viewRotation, 0);

  camera.update(0.016);
  assert.ok(camera.viewRotation > 0 && camera.viewRotation < 1);

  const screen = camera.project(12.3, 8.4, 0);
  const world = camera.unproject(screen.x, screen.y);
  assert.ok(Math.abs(world.x - 12.3) < 1e-7);
  assert.ok(Math.abs(world.y - 8.4) < 1e-7);

  for (let index = 0; index < 300; index += 1) {
    camera.update(0.016);
  }
  assert.ok(Math.abs(camera.viewRotation - 1) < 1e-6);
});

test("el modo plano ignora alturas y ediciones verticales", () => {
  const world = new World("flat-world", {
    biomeSet: "expanded",
    flat: true,
  });
  const spawn = world.findSpawn();
  const x = Math.floor(spawn.x);
  const y = Math.floor(spawn.y);

  assert.equal(world.heightAt(x, y), 0);
  assert.equal(world.heightForTile(x, y, 100, BIOME.ROCK), 0);
  world.changeHeightAt(x, y, 3);
  world.setHeightAt(x, y, -10);
  assert.equal(world.heightAt(x, y), 0);
  assert.deepEqual(world.exportHeightEdits(), []);
});

