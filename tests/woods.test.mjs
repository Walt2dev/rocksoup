import assert from "node:assert/strict";
import test from "node:test";

import { BIOME } from "../js/world/biomes.js";
import {
  BUILTIN_WOODS,
  LEGACY_WOOD_IDS,
  createWoodCatalog,
  defaultWoodCatalog,
  legacySpeciesForWood,
  legacyWoodIdForSpecies,
  normalizeWood,
  woodForBiome,
} from "../js/world/woods.js";
import { rollTree } from "../js/world/vegetation.js";
import { createRng } from "../js/core/rng.js";

test("el catálogo por defecto asigna una madera a cada bioma del juego", () => {
  const catalog = defaultWoodCatalog();
  assert.equal(catalog.woods.length, BUILTIN_WOODS.length);
  assert.equal(woodForBiome(catalog, BIOME.GRASS)?.id, "roble");
  assert.equal(woodForBiome(catalog, BIOME.FOREST)?.id, "haya");
  assert.equal(woodForBiome(catalog, BIOME.ROCK)?.id, "abeto");
  assert.equal(woodForBiome(catalog, BIOME.SNOW)?.id, "pino");
  assert.equal(woodForBiome(catalog, BIOME.DESERT)?.id, "cactus");
  assert.equal(woodForBiome(catalog, BIOME.JUNGLE)?.id, "ceiba");
  assert.equal(woodForBiome(catalog, BIOME.WOLF)?.id, "pino_lobo");
  assert.equal(woodForBiome(catalog, BIOME.CAVE_FLOOR)?.id, "hongo");
  assert.equal(woodForBiome(catalog, BIOME.CLOUD)?.id, "nube");
});

test("normalizeWood valida id, colores y densidad", () => {
  assert.equal(normalizeWood({ id: "con espacios" }), null);
  const wood = normalizeWood({
    id: "madera_test",
    name: "Madera Test",
    biomeId: BIOME.GRASS,
    density: 99,
    style: { trunk: "no-color", leaves: ["#112233"] },
  });
  assert.equal(wood.density, 2);
  assert.equal(wood.style.trunk, "#5a3e2a");
  assert.deepEqual(wood.style.leaves, ["#112233"]);
});

test("createWoodCatalog respeta maderas inactivas para guardados antiguos", () => {
  const catalog = createWoodCatalog([
    {
      id: "oculta",
      name: "Oculta",
      biomeId: BIOME.GRASS,
      active: false,
      style: {},
    },
    { id: "roble", name: "Roble", biomeId: BIOME.GRASS, active: true, style: {} },
  ]);
  assert.equal(catalog.byId.get("oculta")?.active, false);
  assert.equal(woodForBiome(catalog, BIOME.GRASS)?.id, "roble");
});

test("los ids antiguos siguen mapeando a las maderas nuevas", () => {
  assert.deepEqual(LEGACY_WOOD_IDS, ["roble", "pino", "ceiba", "cactus"]);
  assert.equal(legacyWoodIdForSpecies(0), "roble");
  assert.equal(legacyWoodIdForSpecies(3), "cactus");
  assert.equal(legacyWoodIdForSpecies(99), "roble");
  assert.equal(legacySpeciesForWood("pino"), 1);
  assert.equal(legacySpeciesForWood("nube"), 0);
});

test("rollTree usa la madera asignada al bioma", () => {
  const catalog = defaultWoodCatalog();
  let tree = null;
  for (let index = 0; index < 80 && !tree; index += 1) {
    tree = rollTree(createRng(`madera-${index}`), BIOME.JUNGLE, 0.9, 0.95, catalog);
  }
  assert.equal(tree?.woodId, "ceiba");
  assert.equal(tree?.species, 2);
  assert.equal(rollTree(createRng("sin-madera"), BIOME.WATER, 1, 1, catalog), null);
});
