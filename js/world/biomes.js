import { WORLD } from "./params.js";

export const BIOME = Object.freeze({
  WATER: 0,
  BEACH: 1,
  GRASS: 2,
  FOREST: 3,
  ROCK: 4,
  SNOW: 5,
  DESERT: 6,
  JUNGLE: 7,
  WOLF: 8,
  CAVE_FLOOR: 9,
  CAVE_WALL: 10,
  CLOUD: 11,
  VOID: 12,
  GOLD_PATH: 13,
});

export const BIOMES = Object.freeze([
  Object.freeze({
    id: BIOME.WATER,
    key: "water",
    name: "Agua",
    walkable: false,
    shades: ["#1b4058", "#20506b", "#27617d"],
    mineralChance: 0,
  }),
  Object.freeze({
    id: BIOME.BEACH,
    key: "beach",
    name: "Playa",
    walkable: true,
    shades: ["#a89163", "#b7a070", "#c5af7e"],
    mineralChance: 0,
  }),
  Object.freeze({
    id: BIOME.GRASS,
    key: "grass",
    name: "Pradera",
    walkable: true,
    shades: ["#456b3b", "#4f7742", "#5a8249"],
    mineralChance: 0.002,
  }),
  Object.freeze({
    id: BIOME.FOREST,
    key: "forest",
    name: "Bosque",
    walkable: true,
    shades: ["#2c5432", "#345f39", "#3c6a40"],
    mineralChance: 0.005,
  }),
  Object.freeze({
    id: BIOME.ROCK,
    key: "rock",
    name: "Roca",
    walkable: true,
    shades: ["#5e6269", "#6b6f76", "#787c83"],
    mineralChance: 0.035,
  }),
  Object.freeze({
    id: BIOME.SNOW,
    key: "snow",
    name: "Nieve",
    walkable: true,
    shades: ["#b9c4ce", "#c9d3dc", "#d9e1e8"],
    mineralChance: 0.012,
  }),
  Object.freeze({
    id: BIOME.DESERT,
    key: "desert",
    name: "Desierto",
    walkable: true,
    shades: ["#b3793f", "#c48d4a", "#d6a05b"],
    mineralChance: 0.008,
  }),
  Object.freeze({
    id: BIOME.JUNGLE,
    key: "jungle",
    name: "Selva húmeda",
    walkable: true,
    shades: ["#1d4a2a", "#255b33", "#2e6c3c"],
    mineralChance: 0.004,
  }),
  Object.freeze({
    id: BIOME.WOLF,
    key: "wolf",
    name: "Bosque de lobos",
    walkable: true,
    shades: ["#233d34", "#2c4a3d", "#365846"],
    mineralChance: 0.008,
  }),
  Object.freeze({
    id: BIOME.CAVE_FLOOR,
    key: "cave_floor",
    name: "Suelo de cueva",
    walkable: true,
    shades: ["#2b2830", "#35313b", "#403a46"],
    mineralChance: 0.03,
  }),
  Object.freeze({
    id: BIOME.CAVE_WALL,
    key: "cave_wall",
    name: "Muro de cueva",
    walkable: false,
    shades: ["#121116", "#19171e", "#211e26"],
    mineralChance: 0,
  }),
  Object.freeze({
    id: BIOME.CLOUD,
    key: "cloud",
    name: "Nube",
    walkable: true,
    shades: ["#dbe8f5", "#e8f1fb", "#f4f8ff"],
    mineralChance: 0,
  }),
  Object.freeze({
    id: BIOME.VOID,
    key: "void",
    name: "Vacío",
    walkable: false,
    shades: ["#78a7d6", "#8db8e2", "#a2c8ed"],
    mineralChance: 0,
  }),
  Object.freeze({
    id: BIOME.GOLD_PATH,
    key: "gold_path",
    name: "Camino de oro",
    walkable: true,
    shades: ["#c99a2e", "#e0b243", "#f2ce6b"],
    mineralChance: 0,
  }),
]);

export function classifyBiome(elevation, moisture, config = WORLD) {
  if (elevation < config.seaLevel) return BIOME.WATER;
  if (elevation < config.beachLevel) return BIOME.BEACH;
  if (elevation > config.snowLevel) return BIOME.SNOW;
  if (elevation > config.rockLevel) return BIOME.ROCK;
  if (moisture > config.forestMoisture) return BIOME.FOREST;
  return BIOME.GRASS;
}

export function classifyBiomeExpanded(
  elevation,
  moisture,
  temperature,
  config = WORLD,
) {
  if (elevation < config.seaLevel) return BIOME.WATER;
  if (elevation < config.beachLevel) return BIOME.BEACH;
  if (elevation > config.snowLevel) return BIOME.SNOW;
  if (elevation > config.rockLevel) return BIOME.ROCK;
  if (
    config.wolfBiome === true &&
    temperature <= (config.wolfTemperature ?? config.coldTemperature) &&
    moisture >= (config.wolfMoisture ?? config.forestMoisture)
  ) {
    return BIOME.WOLF;
  }
  if (temperature <= config.coldTemperature) return BIOME.SNOW;
  if (temperature >= config.hotTemperature && moisture < config.desertMoisture) {
    return BIOME.DESERT;
  }
  if (moisture >= config.jungleMoisture) return BIOME.JUNGLE;
  if (moisture > config.forestMoisture) return BIOME.FOREST;
  return BIOME.GRASS;
}

export function classifyBiomeForSet(
  elevation,
  moisture,
  temperature,
  biomeSet = "legacy",
  config = WORLD,
) {
  return biomeSet === "expanded"
    ? classifyBiomeExpanded(elevation, moisture, temperature, config)
    : classifyBiome(elevation, moisture, config);
}

export function biomeById(id) {
  return BIOMES[id] ?? BIOMES[BIOME.WATER];
}

export function isWalkableBiome(id) {
  return biomeById(id).walkable;
}
