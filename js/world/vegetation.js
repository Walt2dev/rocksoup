import { BIOME } from "./biomes.js";
import { clamp01 } from "./noise.js";
import {
  BUILTIN_WOODS,
  LEGACY_WOOD_IDS,
  defaultWoodCatalog,
  legacySpeciesForWood,
  woodForBiome,
} from "./woods.js";

export const TREE_VARIANTS = 6;
export const BUSH_VARIANTS = 3;

export const TREE_SPECIES = Object.freeze(
  LEGACY_WOOD_IDS.map((key, id) => {
    const wood = BUILTIN_WOODS.find((entry) => entry.id === key);
    return Object.freeze({ id, key, name: wood?.name ?? key });
  }),
);

const DEFAULT_CATALOG = defaultWoodCatalog();

export const BUSH_STYLES = Object.freeze({
  NORMAL: "normal",
  DRY: "dry",
  JUNGLE: "jungle",
});

export function rollTree(
  rng,
  biomeId,
  moisture,
  density,
  catalog = DEFAULT_CATALOG,
) {
  const wood = woodForBiome(catalog, biomeId);
  if (!wood) {
    return null;
  }

  const canopy = clamp01((density - 0.38) / 0.62);
  let chance = 0;

  if (biomeId === BIOME.FOREST) {
    chance = (0.03 + canopy * 0.32) * (0.65 + moisture * 0.6);
  } else if (biomeId === BIOME.GRASS) {
    chance = (0.002 + canopy * 0.05) * (0.7 + moisture * 0.5);
  } else if (biomeId === BIOME.SNOW) {
    chance = 0.002 + canopy * 0.04;
  } else if (biomeId === BIOME.WOLF) {
    chance = (0.02 + canopy * 0.24) * (0.7 + moisture * 0.5);
  } else if (biomeId === BIOME.JUNGLE) {
    chance = (0.05 + canopy * 0.42) * (0.7 + moisture * 0.5);
  } else if (biomeId === BIOME.DESERT) {
    chance = 0.002 + canopy * 0.018;
  } else if (biomeId === BIOME.ROCK) {
    chance = 0.001 + canopy * 0.016;
  } else if (biomeId === BIOME.CAVE_FLOOR) {
    chance = 0.004 + canopy * 0.028;
  } else if (biomeId === BIOME.CLOUD) {
    chance = 0.012 + canopy * 0.05;
  }

  chance *= Math.max(0.1, Number(wood.density) || 1);

  if (chance <= 0 || !rng.chance(chance)) {
    return null;
  }

  return {
    woodId: wood.id,
    shape: wood.style?.shape ?? "tree",
    species: legacySpeciesForWood(wood.id),
    variant: rng.int(0, TREE_VARIANTS),
    scale: rng.float(0.75, 1.18),
  };
}

export function rollGrass(rng, biomeId, density) {
  let chance = 0;
  let style = "normal";

  if (biomeId === BIOME.GRASS) {
    chance = 0.02 * (0.7 + density * 0.6);
  } else if (biomeId === BIOME.FOREST) {
    chance = 0.012 * (0.7 + density * 0.5);
  } else if (biomeId === BIOME.JUNGLE) {
    chance = 0.03 * (0.7 + density * 0.6);
    style = "lush";
  } else if (biomeId === BIOME.WOLF) {
    chance = 0.012 * (0.7 + density * 0.5);
  } else if (biomeId === BIOME.DESERT) {
    chance = 0.003;
    style = "dry";
  }

  if (chance <= 0 || !rng.chance(chance)) {
    return null;
  }

  return {
    variant: rng.int(0, 4),
    scale: rng.float(0.75, 1.2),
    style,
  };
}

export function rollBush(rng, biomeId, density) {
  if (
    biomeId !== BIOME.GRASS &&
    biomeId !== BIOME.FOREST &&
    biomeId !== BIOME.DESERT &&
    biomeId !== BIOME.JUNGLE
  ) {
    return null;
  }

  let baseChance = 0.014;
  let style = BUSH_STYLES.NORMAL;

  if (biomeId === BIOME.FOREST) {
    baseChance = 0.032;
  } else if (biomeId === BIOME.JUNGLE) {
    baseChance = 0.045;
    style = BUSH_STYLES.JUNGLE;
  } else if (biomeId === BIOME.DESERT) {
    baseChance = 0.006;
    style = BUSH_STYLES.DRY;
  }

  const chance = baseChance * (0.6 + density * 0.8);

  if (!rng.chance(chance)) {
    return null;
  }

  return {
    variant: rng.int(0, BUSH_VARIANTS),
    scale: rng.float(0.8, 1.15),
    style,
  };
}
