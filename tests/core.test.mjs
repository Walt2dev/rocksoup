import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  createRng,
  hashSeed,
  isValidHexSeed,
  mulberry32,
  normalizeSeed,
  randomSeed,
  xmur3,
} from "../js/core/rng.js";
import { Vector2D } from "../js/core/vec2.js";
import { Vector3D } from "../js/core/vec3.js";
import {
  DEFAULT_ISO,
  compareDepth,
  depthOf,
  screenToTile,
  screenToWorld,
  worldToScreen,
} from "../js/core/iso.js";

function sequence(rng, count) {
  return Array.from({ length: count }, () => rng.next());
}

test("xmur3 produce enteros sin signo y deterministas", () => {
  const a = xmur3("deadbeef");
  const b = xmur3("deadbeef");
  for (let i = 0; i < 20; i += 1) {
    const value = a();
    assert.equal(value, b());
    assert.ok(Number.isInteger(value));
    assert.ok(value >= 0 && value <= 0xffffffff);
  }
});

test("hashSeed es estable y distingue seeds", () => {
  assert.equal(hashSeed("deadbeef"), hashSeed("deadbeef"));
  assert.notEqual(hashSeed("deadbeef"), hashSeed("deadbeee"));
  assert.equal(hashSeed(" deadbeef "), hashSeed("deadbeef"));
  assert.equal(hashSeed("0"), hashSeed(0));
});

test("createRng repite exactamente la misma secuencia", () => {
  const left = sequence(createRng("cafebabe"), 1000);
  const right = sequence(createRng("cafebabe"), 1000);

  assert.deepEqual(left, right);
  assert.ok(left.every((value) => value >= 0 && value < 1));
  assert.notDeepEqual(left, sequence(createRng("cafebabf"), 1000));
});

test("mulberry32 coincide con la secuencia de createRng", () => {
  const seed = hashSeed("1234abcd");
  const raw = mulberry32(seed);
  const rng = createRng("1234abcd");

  for (let i = 0; i < 50; i += 1) {
    assert.equal(rng.next(), raw());
  }
});

test("helpers de RNG respetan sus rangos", () => {
  const rng = createRng("fase1");

  for (let i = 0; i < 2000; i += 1) {
    const value = rng.int(-5, 7);
    assert.ok(Number.isInteger(value));
    assert.ok(value >= -5 && value < 7);

    const float = rng.float(2.5, 4.5);
    assert.ok(float >= 2.5 && float < 4.5);

    assert.equal(typeof rng.chance(0.5), "boolean");
  }

  assert.throws(() => rng.int(5, 5), RangeError);
  assert.throws(() => rng.int(1.5, 4), RangeError);
  assert.throws(() => rng.float(10, 1), RangeError);
  assert.throws(() => rng.chance(1.5), RangeError);
  assert.throws(() => rng.pick([]), RangeError);
});

test("shuffle es determinista, no muta y conserva los elementos", () => {
  const source = Array.from({ length: 40 }, (_, i) => i);
  const first = createRng("shuffle").shuffle(source);
  const second = createRng("shuffle").shuffle(source);

  assert.deepEqual(first, second);
  assert.notDeepEqual(first, source);
  assert.notEqual(first, source);
  assert.deepEqual(first.slice().sort((a, b) => a - b), source);
  assert.deepEqual(source, Array.from({ length: 40 }, (_, i) => i));
});

test("fork crea streams independientes y reproducibles", () => {
  const root = createRng("bosque");
  const worldA = root.fork("mundo");
  const worldB = root.fork("mundo");
  const trees = root.fork("vegetacion");

  assert.deepEqual(sequence(worldA, 50), sequence(worldB, 50));
  assert.notDeepEqual(sequence(root.fork("mundo"), 50), sequence(trees, 50));
  assert.throws(() => root.fork(""), Error);
});

test("validación y normalización de seeds", () => {
  assert.ok(isValidHexSeed("deadBEEF"));
  assert.ok(!isValidHexSeed("xyz"));
  assert.ok(!isValidHexSeed(""));
  assert.ok(!isValidHexSeed("abc".repeat(10)));

  assert.equal(normalizeSeed("  abc  "), "abc");
  assert.equal(normalizeSeed(0), "0");
  assert.throws(() => normalizeSeed("   "), Error);
  assert.throws(() => normalizeSeed(Number.NaN), TypeError);
  assert.throws(() => normalizeSeed(null), TypeError);
  assert.throws(() => normalizeSeed("x".repeat(65)), Error);
});

test("randomSeed genera hex válidos sin Math.random", () => {
  for (let i = 0; i < 20; i += 1) {
    const seed = randomSeed();
    assert.match(seed, /^[0-9a-f]{8}$/);
    assert.ok(isValidHexSeed(seed));
  }
});

test("Vector2D realiza operaciones inmutables", () => {
  const a = new Vector2D(3, 4);
  const b = new Vector2D(-1, 2);

  assert.ok(a.add(b).equals(new Vector2D(2, 6)));
  assert.ok(a.sub(b).equals(new Vector2D(4, 2)));
  assert.ok(a.scale(2).equals(new Vector2D(6, 8)));
  assert.ok(a.negate().equals(new Vector2D(-3, -4)));
  assert.equal(a.dot(b), 5);
  assert.equal(a.length(), 5);
  assert.ok(a.normalize().equals(new Vector2D(0.6, 0.8)));
  assert.ok(new Vector2D(0, 0).normalize().equals(new Vector2D(0, 0)));
  assert.equal(a.distanceTo(b), Math.hypot(4, 2));
  assert.ok(a.lerp(b, 0.5).equals(new Vector2D(1, 3)));
  assert.deepEqual(a.toArray(), [3, 4]);
  assert.equal(a.x, 3);
  assert.equal(a.y, 4);
});

test("Vector3D realiza operaciones inmutables", () => {
  const a = new Vector3D(1, 2, 3);
  const b = new Vector3D(4, -5, 6);

  assert.ok(a.add(b).equals(new Vector3D(5, -3, 9)));
  assert.ok(a.sub(b).equals(new Vector3D(-3, 7, -3)));
  assert.ok(a.scale(3).equals(new Vector3D(3, 6, 9)));
  assert.equal(a.dot(b), 12);
  assert.ok(a.cross(b).equals(new Vector3D(27, 6, -13)));
  assert.ok(a.normalize().length() - 1 < 1e-9);
  assert.ok(new Vector3D().normalize().equals(new Vector3D()));
  assert.equal(a.distanceTo(b), Math.hypot(3, 7, 3));
  assert.ok(a.lerp(b, 0.5).equals(new Vector3D(2.5, -1.5, 4.5)));
  assert.deepEqual(a.toArray(), [1, 2, 3]);
});

test("proyección isométrica usa la fórmula esperada", () => {
  assert.deepEqual(worldToScreen(0, 0), { x: 0, y: 0 });
  assert.deepEqual(worldToScreen(1, 0), { x: 32, y: 16 });
  assert.deepEqual(worldToScreen(0, 1), { x: -32, y: 16 });
  assert.deepEqual(worldToScreen(1, 1), { x: 0, y: 32 });
  assert.deepEqual(worldToScreen(2, 3), { x: -32, y: 80 });
  assert.deepEqual(worldToScreen(1, 0, 2), { x: 32, y: -16 });

  assert.deepEqual(worldToScreen(1, 0, 0, { tileW: 80, tileH: 40, originX: 10, originY: 20 }), {
    x: 50,
    y: 40,
  });
});

test("screenToWorld invierte worldToScreen", () => {
  const options = { tileW: 96, tileH: 48, originX: 123, originY: -45 };
  const points = [
    [0, 0],
    [1, 0],
    [0, 1],
    [2.5, -3.25],
    [-10.75, 8.5],
    [1000.125, -999.875],
  ];

  for (const [x, y] of points) {
    const screen = worldToScreen(x, y, 0, options);
    const world = screenToWorld(screen.x, screen.y, options);
    assert.ok(Math.abs(world.x - x) < 1e-9, `x: ${world.x} vs ${x}`);
    assert.ok(Math.abs(world.y - y) < 1e-9, `y: ${world.y} vs ${y}`);
  }
});

test("screenToTile devuelve el tile bajo el punto", () => {
  const tile = screenToTile(32, 16);
  assert.deepEqual(tile, { x: 1, y: 0 });

  const center = worldToScreen(7.5, 3.5);
  assert.deepEqual(screenToTile(center.x, center.y), { x: 7, y: 3 });
});

test("profundidad ordena por x + y + z", () => {
  assert.equal(depthOf(1, 2, 3), 6);
  assert.ok(compareDepth({ x: 0, y: 0 }, { x: 1, y: 0 }) < 0);
  assert.ok(compareDepth({ x: 2, y: 2, z: 1 }, { x: 1, y: 1, z: 0 }) > 0);

  const sorted = [
    { x: 3, y: 1, z: 0 },
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 2, z: 0.5 },
  ].sort(compareDepth);

  assert.deepEqual(sorted, [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 2, z: 0.5 },
    { x: 3, y: 1, z: 0 },
  ]);
});

test("opciones isométricas inválidas son rechazadas", () => {
  assert.throws(() => worldToScreen(0, 0, 0, { tileW: 0 }), RangeError);
  assert.throws(() => worldToScreen(0, 0, 0, { tileH: -1 }), RangeError);
  assert.throws(() => screenToWorld(0, 0, { tileW: Number.NaN }), RangeError);
  assert.equal(DEFAULT_ISO.tileW, 64);
});

test("el código de producción no usa Math.random", () => {
  const jsRoot = fileURLToPath(new URL("../js", import.meta.url));
  const files = readdirSync(jsRoot, { recursive: true })
    .filter((file) => String(file).endsWith(".js"))
    .map((file) => join(jsRoot, String(file)));

  assert.ok(files.length > 0);

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.ok(!source.includes("Math.random"), `${file} usa Math.random`);
  }
});
