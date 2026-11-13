import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { strFromU8, unzipSync } from "../js/vendor/fflate.js";
import { PACK_LIMITS } from "../js/game/packRegistry.js";

const zipUrl = new URL("../packs/pack_original.zip", import.meta.url);
const raw = readFileSync(zipUrl);
const files = unzipSync(new Uint8Array(raw));
const manifest = JSON.parse(strFromU8(files["pack.json"]).replace(/^\uFEFF/, ""));

function collectPaths(value, result = []) {
  if (typeof value === "string") {
    if (value.toLowerCase().endsWith(".png")) {
      result.push(value);
    }
  } else if (Array.isArray(value)) {
    for (const item of value) {
      collectPaths(item, result);
    }
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      collectPaths(item, result);
    }
  }
  return result;
}

test("el pack original existe y tiene un manifiesto válido", () => {
  assert.ok(raw.length > 0);
  assert.equal(typeof manifest.name, "string");
  assert.equal(manifest.version, 1);
  for (const section of [
    "characters",
    "donkeys",
    "riders",
    "animations",
    "villages",
    "buildings",
    "units",
  ]) {
    assert.ok(section in manifest, `Falta la sección ${section}`);
  }
});

test("todos los PNG del pack original están incluidos", () => {
  const paths = [
    ...collectPaths(manifest.terrain),
    ...collectPaths(manifest.buildings),
    ...collectPaths(manifest.objects),
    ...collectPaths(manifest.villages),
    ...collectPaths(manifest.units),
    ...collectPaths(manifest.animations),
    ...collectPaths(manifest.characters),
    ...collectPaths(manifest.donkeys),
    ...collectPaths(manifest.riders),
  ];
  assert.ok(paths.length > 0);

  for (const path of paths) {
    assert.ok(
      files[path] instanceof Uint8Array,
      `Falta el archivo ${path} dentro del ZIP`,
    );
  }

  const pngCount = Object.keys(files).filter((name) =>
    name.toLowerCase().endsWith(".png"),
  ).length;
  assert.ok(pngCount > 0);
  assert.ok(pngCount <= PACK_LIMITS.maxImages);
});

test("el pack original incluye las animaciones y jinetes esperados", () => {
  assert.deepEqual(manifest.animations.animation_wolf, [
    "animations/wolf_0.png",
    "animations/wolf_1.png",
    "animations/wolf_2.png",
  ]);
  assert.deepEqual(manifest.riders.explorer.frames, [
    "riders/explorer_0.png",
    "riders/explorer_1.png",
    "riders/explorer_2.png",
  ]);
  assert.equal(manifest.villages.village_hut, "villages/hut.png");
  assert.equal(manifest.units.fief_unit_soldier, "units/fief_soldier.png");
});
