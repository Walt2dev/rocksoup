import test from "node:test";
import assert from "node:assert/strict";

import { BUILTIN_SKINS, normalizeSkinId } from "../js/game/skins.js";
import {
  BUILTIN_DONKEY_SKINS,
  normalizeDonkeySkinId,
} from "../js/game/donkeySkins.js";
import {
  CHARACTER_DEFS,
  DONKEY_DEFS,
  PACK_LIMITS,
  SPRITE_DEFS,
  TERRAIN_DEFS,
  buildDefaultPackManifest,
  getDefaultPackAssetEntries,
  getPackReference,
} from "../js/game/packRegistry.js";

test("los arquetipos integrados son cosméticos y normalizan su id", () => {
  assert.deepEqual(
    BUILTIN_SKINS.map((skin) => skin.id),
    ["explorer", "artist", "mage", "warrior"],
  );
  assert.equal(new Set(BUILTIN_SKINS.map((skin) => skin.name)).size, 4);
  assert.equal(normalizeSkinId(undefined), "explorer");
  assert.equal(normalizeSkinId(""), "explorer");
  assert.equal(normalizeSkinId("custom_pack"), "custom_pack");
  assert.equal(normalizeSkinId("x".repeat(80)).length, 64);
});

test("las skins de burro incluidas se normalizan", () => {
  assert.deepEqual(
    BUILTIN_DONKEY_SKINS.map((skin) => skin.id),
    ["gris", "castano", "pinto"],
  );
  assert.equal(normalizeDonkeySkinId("pinto"), "pinto");
  assert.equal(normalizeDonkeySkinId("desconocida", ["gris", "pinto"]), "gris");
  assert.equal(normalizeDonkeySkinId("", ["gris", "pinto"]), "gris");
});

test("el registro de packs cubre terreno, edificios, objetos y personajes", () => {
  assert.equal(TERRAIN_DEFS.length, 8);
  assert.deepEqual(
    TERRAIN_DEFS.map((def) => def.biome),
    [0, 1, 2, 3, 4, 5, 6, 7],
  );
  assert.equal(new Set(SPRITE_DEFS.map((def) => def.id)).size, SPRITE_DEFS.length);
  assert.equal(new Set(SPRITE_DEFS.map((def) => def.file)).size, SPRITE_DEFS.length);
  assert.equal(CHARACTER_DEFS.length, 4);
  assert.equal(new Set(CHARACTER_DEFS.map((def) => def.id)).size, 4);
  assert.equal(DONKEY_DEFS.length, 3);
  assert.equal(new Set(DONKEY_DEFS.map((def) => def.id)).size, 3);
  assert.ok(SPRITE_DEFS.some((def) => def.id === "university"));
  assert.ok(SPRITE_DEFS.some((def) => def.id.startsWith("tree_roble_")));
  assert.ok(SPRITE_DEFS.some((def) => def.id.startsWith("mineral_")));
  assert.ok(PACK_LIMITS.maxZipBytes > 0);
  assert.ok(PACK_LIMITS.maxImages > 0);
});

test("la referencia del modo desarrollador incluye todas las entradas", () => {
  const rows = getPackReference(null);
  assert.equal(
    rows.length,
    TERRAIN_DEFS.length +
      SPRITE_DEFS.length +
      CHARACTER_DEFS.length +
      DONKEY_DEFS.length,
  );
  assert.equal(new Set(rows.map((row) => row.file)).size, rows.length);
  assert.ok(rows.every((row) => row.resolution.includes("×")));
  assert.ok(rows.every((row) => row.frames >= 1));
});

test("el pack por defecto conoce todos los PNG y genera su manifiesto", () => {
  const entries = getDefaultPackAssetEntries();
  assert.ok(entries.length > 90);
  assert.equal(new Set(entries.map((entry) => entry.path)).size, entries.length);
  assert.ok(entries.some((entry) => entry.path === "terrain/grass.png"));
  assert.ok(entries.some((entry) => entry.path === "characters/mage_0.png"));
  assert.ok(entries.some((entry) => entry.path === "donkeys/gris_0.png"));

  const manifest = buildDefaultPackManifest();
  assert.equal(manifest.terrain.grass, "terrain/grass.png");
  assert.deepEqual(manifest.characters.mage.frames, [
    "characters/mage_0.png",
    "characters/mage_1.png",
    "characters/mage_2.png",
  ]);
  assert.deepEqual(manifest.donkeys.castano.frames, [
    "donkeys/castano_0.png",
    "donkeys/castano_1.png",
    "donkeys/castano_2.png",
  ]);
});
