import { biomeById, isWalkableBiome } from "./biomes.js";
import { WORLD } from "./params.js";

export const MINERAL_TYPES = Object.freeze([
  Object.freeze({
    id: 1,
    key: "Fe",
    name: "Hierro",
    color: "#a96545",
    light: "#c9865f",
    chemistry: Object.freeze({ Fe: 3, Si: 1 }),
  }),
  Object.freeze({
    id: 2,
    key: "Ca",
    name: "Calcio",
    color: "#c9c2aa",
    light: "#e0d9c2",
    chemistry: Object.freeze({ Ca: 3, Mg: 1 }),
  }),
  Object.freeze({
    id: 3,
    key: "Mg",
    name: "Magnesio",
    color: "#7f9c72",
    light: "#9bb88c",
    chemistry: Object.freeze({ Mg: 3, Si: 1 }),
  }),
  Object.freeze({
    id: 4,
    key: "Zn",
    name: "Zinc",
    color: "#7c8fa8",
    light: "#9cb0c9",
    chemistry: Object.freeze({ Zn: 2, Cu: 1 }),
  }),
  Object.freeze({
    id: 5,
    key: "Si",
    name: "Silicio",
    color: "#8a8f97",
    light: "#a8adb5",
    chemistry: Object.freeze({ Si: 4 }),
  }),
  Object.freeze({
    id: 6,
    key: "Cu",
    name: "Cobre",
    color: "#5f9b8f",
    light: "#7fb9ab",
    chemistry: Object.freeze({ Cu: 3, Fe: 1 }),
  }),
  Object.freeze({
    id: 7,
    key: "C",
    name: "Carb\u00F3n",
    color: "#3f3c40",
    light: "#5b565d",
    chemistry: Object.freeze({ C: 4 }),
  }),
  Object.freeze({
    id: 8,
    key: "amatista",
    name: "Amatista",
    color: "#7d4bb0",
    light: "#b184e0",
    spawnWeight: 0.08,
    chemistry: Object.freeze({ Si: 2, Fe: 1 }),
  }),
  Object.freeze({
    id: 9,
    key: "cuarzo",
    name: "Cuarzo",
    color: "#a8c3d6",
    light: "#e2f1fa",
    spawnWeight: 0.12,
    chemistry: Object.freeze({ Si: 3 }),
  }),
  Object.freeze({
    id: 10,
    key: "oro",
    name: "Oro",
    color: "#c9a227",
    light: "#f0d264",
    spawnWeight: 0,
    chemistry: Object.freeze({ oro: 4 }),
  }),
]);

export const GOLD_MINERAL_ID = 10;
export const GOLD_WATER_MARGIN = 0.06;
export const GOLD_VEIN_CHANCE = 0.004;

export const MINERAL_VARIANTS = 2;

function rollStoneAmount(rng) {
  const roll = rng.next();
  if (roll < 0.25) return 32;
  if (roll < 0.6) return 48;
  return 64;
}

function rollGoldAmount(rng) {
  const roll = rng.next();
  if (roll < 0.45) return 32;
  if (roll < 0.8) return 48;
  return 64;
}

export function mineralById(id) {
  return MINERAL_TYPES[id - 1] ?? null;
}

export function rollMineral(rng, biomeId, veinValue) {
  const biome = biomeById(biomeId);

  if (!biome.walkable || biome.mineralChance <= 0) {
    return null;
  }

  const veinBoost = Math.max(0, veinValue - 0.5) * 2;
  const chance = biome.mineralChance * (0.35 + veinBoost * 2.2);

  if (!rng.chance(chance)) {
    return null;
  }

  const rollable = MINERAL_TYPES.filter(
    (mineral) => (mineral.spawnWeight ?? 1) > 0,
  );
  const totalWeight = rollable.reduce(
    (total, mineral) => total + (mineral.spawnWeight ?? 1),
    0,
  );
  let roll = rng.float(0, totalWeight);
  let type = rollable[rollable.length - 1] ?? null;

  for (const mineral of rollable) {
    roll -= mineral.spawnWeight ?? 1;
    if (roll <= 0) {
      type = mineral;
      break;
    }
  }

  if (!type) {
    return null;
  }

  return {
    type: type.id,
    variant: rng.int(0, MINERAL_VARIANTS),
    scale: rng.float(0.8, 1.15),
    offsetX: rng.float(-0.22, 0.22),
    offsetY: rng.float(-0.22, 0.22),
    amount: rollStoneAmount(rng),
  };
}

export function rollGoldVein(rng, terrain, veinValue, config = WORLD) {
  if (!terrain || !isWalkableBiome(terrain.biome)) {
    return null;
  }

  if (terrain.elevation - config.seaLevel > GOLD_WATER_MARGIN) {
    return null;
  }

  const veinBoost = Math.max(0, veinValue - 0.5) * 2;
  const chance = GOLD_VEIN_CHANCE * (0.35 + veinBoost * 2.2);

  if (!rng.chance(chance)) {
    return null;
  }

  return {
    type: GOLD_MINERAL_ID,
    variant: rng.int(0, MINERAL_VARIANTS),
    scale: rng.float(0.8, 1.15),
    offsetX: rng.float(-0.22, 0.22),
    offsetY: rng.float(-0.22, 0.22),
    amount: rollGoldAmount(rng),
  };
}
