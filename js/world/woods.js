import { BIOME } from "./biomes.js";

export const LEGACY_WOOD_IDS = Object.freeze([
  "roble",
  "pino",
  "ceiba",
  "cactus",
]);

export const WOOD_RENDER_MODES = Object.freeze(["procedural", "sprite"]);
export const WOOD_REALMS = Object.freeze(["surface", "underground", "sky"]);
export const WOOD_ID_PATTERN = /^[a-zA-Z0-9_-]{1,48}$/;

const STYLE_DEFAULTS = Object.freeze({
  shape: "tree",
  trunk: "#5a3e2a",
  branch: "#6d4d33",
  leaves: Object.freeze(["#3d7138", "#4d8644", "#619d56"]),
  highlight: "#7db56a",
  angle: 25,
  branchScale: 0.72,
  trunkLength: 7.5,
  iterations: 3,
  leafScale: 1.18,
  leafAspectX: 1,
  leafAspectY: 0.9,
  clusters: 4,
});

function wood(entry) {
  return Object.freeze({
    active: true,
    renderMode: "procedural",
    density: 1,
    realm: "surface",
    ...entry,
    style: Object.freeze({ ...STYLE_DEFAULTS, ...(entry.style ?? {}) }),
  });
}

export const BUILTIN_WOODS = Object.freeze([
  wood({
    id: "roble",
    name: "Roble",
    biomeId: BIOME.GRASS,
    style: {
      trunk: "#5a3e2a",
      branch: "#6d4d33",
      leaves: ["#3d7138", "#4d8644", "#619d56"],
      highlight: "#7db56a",
      angle: 25,
      branchScale: 0.72,
      trunkLength: 7.5,
      leafScale: 1.18,
      leafAspectX: 1,
      leafAspectY: 0.9,
      clusters: 4,
    },
  }),
  wood({
    id: "haya",
    name: "Haya",
    biomeId: BIOME.FOREST,
    style: {
      trunk: "#6a5138",
      branch: "#7d6244",
      leaves: ["#3f7a3a", "#559848", "#72b362"],
      highlight: "#9bd07d",
      angle: 30,
      branchScale: 0.74,
      trunkLength: 8.2,
      leafScale: 1.25,
      clusters: 5,
    },
  }),
  wood({
    id: "pino",
    name: "Pino",
    biomeId: BIOME.SNOW,
    style: {
      trunk: "#4a3628",
      branch: "#5c4432",
      leaves: ["#2a5a3c", "#356e49", "#438156"],
      highlight: "#5d9e6e",
      angle: 17,
      branchScale: 0.79,
      trunkLength: 9,
      leafScale: 0.95,
      leafAspectX: 0.72,
      leafAspectY: 1.35,
      clusters: 3,
    },
  }),
  wood({
    id: "abeto",
    name: "Abeto de roca",
    biomeId: BIOME.ROCK,
    density: 0.65,
    style: {
      trunk: "#4b3d31",
      branch: "#5f4d3b",
      leaves: ["#2f5d46", "#3b7052", "#4d8761"],
      highlight: "#6ba47a",
      angle: 15,
      branchScale: 0.82,
      trunkLength: 8.5,
      leafScale: 0.88,
      leafAspectX: 0.7,
      leafAspectY: 1.4,
      clusters: 3,
    },
  }),
  wood({
    id: "ceiba",
    name: "Ceiba",
    biomeId: BIOME.JUNGLE,
    style: {
      trunk: "#59452d",
      branch: "#725a3a",
      leaves: ["#1f5a31", "#2b7040", "#3b8a4d"],
      highlight: "#69b86f",
      angle: 32,
      branchScale: 0.78,
      trunkLength: 8.5,
      leafScale: 1.4,
      leafAspectX: 1.15,
      leafAspectY: 0.95,
      clusters: 5,
    },
  }),
  wood({
    id: "cactus",
    name: "Cactus",
    biomeId: BIOME.DESERT,
    style: {
      shape: "cactus",
      trunk: "#3d7445",
      branch: "#4f8a52",
      leaves: ["#3d7445", "#4f8a52", "#65a563"],
      highlight: "#8cc47f",
      angle: 20,
      trunkLength: 8,
      iterations: 2,
      clusters: 2,
    },
  }),
  wood({
    id: "pino_lobo",
    name: "Pino de lobo",
    biomeId: BIOME.WOLF,
    style: {
      trunk: "#3f3128",
      branch: "#554235",
      leaves: ["#1f4b3a", "#2a5f48", "#377457"],
      highlight: "#619b78",
      angle: 18,
      branchScale: 0.8,
      trunkLength: 9.2,
      leafScale: 0.92,
      leafAspectX: 0.7,
      leafAspectY: 1.38,
      clusters: 3,
    },
  }),
  wood({
    id: "hongo",
    name: "Hongo de cueva",
    biomeId: BIOME.CAVE_FLOOR,
    realm: "underground",
    density: 0.8,
    style: {
      shape: "mushroom",
      trunk: "#c9c0a6",
      branch: "#a89e86",
      leaves: ["#7d4bb0", "#9a62cc", "#b184e0"],
      highlight: "#e2c6ff",
      angle: 0,
      trunkLength: 5,
      iterations: 1,
      leafScale: 1,
      clusters: 1,
    },
  }),
  wood({
    id: "nube",
    name: "Árbol de nube",
    biomeId: BIOME.CLOUD,
    realm: "sky",
    density: 0.7,
    style: {
      trunk: "#d8c46a",
      branch: "#f0d264",
      leaves: ["#eaf4ff", "#cfe4fb", "#b8d6f5"],
      highlight: "#ffffff",
      angle: 28,
      branchScale: 0.7,
      trunkLength: 7.4,
      leafScale: 1.3,
      clusters: 5,
    },
  }),
]);

export function defaultWoodCatalog() {
  return createWoodCatalog(BUILTIN_WOODS);
}

export function legacyWoodIdForSpecies(species) {
  const id = LEGACY_WOOD_IDS[Math.floor(Number(species) || 0)];
  return id ?? LEGACY_WOOD_IDS[0];
}

export function legacySpeciesForWood(woodId) {
  const index = LEGACY_WOOD_IDS.indexOf(woodId);
  return index >= 0 ? index : 0;
}

export function normalizeWoodStyle(value) {
  const source = value && typeof value === "object" ? value : {};
  const color = (input, fallback) =>
    typeof input === "string" && /^#[0-9a-fA-F]{3,8}$/.test(input)
      ? input.slice(0, 9)
      : fallback;
  const number = (input, fallback, min, max) =>
    Number.isFinite(Number(input))
      ? Math.min(max, Math.max(min, Number(input)))
      : fallback;
  const leaves = Array.isArray(source.leaves)
    ? source.leaves
        .map((entry, index) => color(entry, STYLE_DEFAULTS.leaves[index] ?? "#3d7138"))
        .slice(0, 5)
    : [...STYLE_DEFAULTS.leaves];

  return {
    shape: ["tree", "cactus", "mushroom"].includes(source.shape)
      ? source.shape
      : "tree",
    trunk: color(source.trunk, STYLE_DEFAULTS.trunk),
    branch: color(source.branch, STYLE_DEFAULTS.branch),
    leaves: leaves.length > 0 ? leaves : [...STYLE_DEFAULTS.leaves],
    highlight: color(source.highlight, STYLE_DEFAULTS.highlight),
    angle: number(source.angle, STYLE_DEFAULTS.angle, 4, 60),
    branchScale: number(source.branchScale, STYLE_DEFAULTS.branchScale, 0.4, 0.95),
    trunkLength: number(source.trunkLength, STYLE_DEFAULTS.trunkLength, 3, 16),
    iterations: Math.round(number(source.iterations, STYLE_DEFAULTS.iterations, 1, 5)),
    leafScale: number(source.leafScale, STYLE_DEFAULTS.leafScale, 0.3, 2.5),
    leafAspectX: number(source.leafAspectX, STYLE_DEFAULTS.leafAspectX, 0.3, 2),
    leafAspectY: number(source.leafAspectY, STYLE_DEFAULTS.leafAspectY, 0.3, 2),
    clusters: Math.round(number(source.clusters, STYLE_DEFAULTS.clusters, 1, 8)),
  };
}

export function normalizeWood(value) {
  const source = value && typeof value === "object" ? value : {};
  const id = String(source.id ?? "").slice(0, 48);
  if (!WOOD_ID_PATTERN.test(id)) {
    return null;
  }
  return {
    id,
    name: String(source.name ?? id).trim().slice(0, 80) || id,
    biomeId: Number.isFinite(Number(source.biomeId))
      ? Math.max(0, Math.floor(Number(source.biomeId)))
      : null,
    realm: WOOD_REALMS.includes(source.realm) ? source.realm : "surface",
    active: source.active !== false,
    renderMode: WOOD_RENDER_MODES.includes(source.renderMode)
      ? source.renderMode
      : "procedural",
    density: Number.isFinite(Number(source.density))
      ? Math.min(2, Math.max(0.1, Number(source.density)))
      : 1,
    style: normalizeWoodStyle(source.style),
    spriteUrls: Array.isArray(source.spriteUrls)
      ? source.spriteUrls.slice(0, 12)
      : [],
    updatedAt: Number(source.updatedAt) || 0,
  };
}

export function createWoodCatalog(values) {
  const woods = [];
  const seen = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    const normalized = normalizeWood(value);
    if (!normalized || seen.has(normalized.id)) {
      continue;
    }
    seen.add(normalized.id);
    woods.push(normalized);
  }
  const byId = new Map(woods.map((entry) => [entry.id, entry]));
  const byBiome = new Map();
  for (const entry of woods) {
    if (entry.active && entry.biomeId !== null && !byBiome.has(entry.biomeId)) {
      byBiome.set(entry.biomeId, entry);
    }
  }
  return {
    woods,
    byId,
    byBiome,
    version: Math.max(0, ...woods.map((entry) => entry.updatedAt)),
  };
}

export function mergeWoodCatalog(base, overrides) {
  const map = new Map();
  for (const entry of base?.woods ?? []) {
    map.set(entry.id, entry);
  }
  for (const entry of overrides?.woods ?? []) {
    map.set(entry.id, entry);
  }
  return createWoodCatalog([...map.values()]);
}

export function woodForBiome(catalog, biomeId) {
  return catalog?.byBiome?.get(Number(biomeId)) ?? null;
}
