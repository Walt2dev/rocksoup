export const SCIENCE_BOOKS = Object.freeze([
  Object.freeze({
    id: "tools",
    name: "Tratado de Artes",
    description: "Observaciones que mejoran la recolección, la energía y el rendimiento de herramientas.",
    color: "#d8c46a",
  }),
  Object.freeze({
    id: "weapons",
    name: "Códice de Combate",
    description: "Estudio de trayectorias y materiales para mejorar armas y defensa.",
    color: "#e06c75",
  }),
  Object.freeze({
    id: "potions",
    name: "Herbario Alquímico",
    description: "Apuntes de mezclas, minerales y reacciones para potenciar pociones.",
    color: "#7ec699",
  }),
  Object.freeze({
    id: "brews",
    name: "Rituales Lunares",
    description: "Conjunciones y fases lunares para desbloquear brebajes rituales.",
    color: "#9fc7ff",
  }),
]);

export const SCIENCE_TIER_COSTS = Object.freeze([0, 120, 300, 600, 1000]);
export const SCIENCE_MAX_TIER = SCIENCE_TIER_COSTS.length - 1;

export const LENS_LEVELS = Object.freeze([
  Object.freeze({
    id: 0,
    name: "Lente de bronce",
    xp: 0,
    tolerance: 0,
    holdMultiplier: 1,
    qualityBonus: 0,
  }),
  Object.freeze({
    id: 1,
    name: "Lente de cuarzo",
    xp: 160,
    tolerance: 4,
    holdMultiplier: 0.92,
    qualityBonus: 5,
  }),
  Object.freeze({
    id: 2,
    name: "Lente prismática",
    xp: 420,
    tolerance: 8,
    holdMultiplier: 0.84,
    qualityBonus: 10,
  }),
  Object.freeze({
    id: 3,
    name: "Lente estelar",
    xp: 800,
    tolerance: 12,
    holdMultiplier: 0.76,
    qualityBonus: 15,
  }),
  Object.freeze({
    id: 4,
    name: "Lente de aurora",
    xp: 1300,
    tolerance: 16,
    holdMultiplier: 0.68,
    qualityBonus: 20,
  }),
]);

export function scienceCategoryForObject(object) {
  const ra = Number.isFinite(object?.ra) ? ((object.ra % 24) + 24) % 24 : 0;

  if (ra < 6) return "tools";
  if (ra < 12) return "weapons";
  if (ra < 18) return "potions";
  return "brews";
}

export function scienceLevel(points, bookId) {
  const value = Number.isFinite(points?.[bookId]) ? points[bookId] : 0;
  let level = 0;

  for (let index = 0; index < SCIENCE_TIER_COSTS.length; index += 1) {
    if (value >= SCIENCE_TIER_COSTS[index]) {
      level = index;
    }
  }

  return level;
}

export function scienceModifiers(points = {}) {
  const tools = scienceLevel(points, "tools");
  const weapons = scienceLevel(points, "weapons");
  const potions = scienceLevel(points, "potions");
  const brews = scienceLevel(points, "brews");

  return {
    tools,
    weapons,
    potions,
    brews,
    gatherMultiplier: 1 - tools * 0.04,
    attackMultiplier: 1 + weapons * 0.06,
    potionMultiplier: 1 + potions * 0.1,
  };
}

export function lensForXp(xp) {
  const value = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  let lens = LENS_LEVELS[0];

  for (const entry of LENS_LEVELS) {
    if (value >= entry.xp) {
      lens = entry;
    }
  }

  return lens;
}

export function nextLensForXp(xp) {
  const value = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  return LENS_LEVELS.find((entry) => entry.xp > value) ?? null;
}

export function investigationReward(object, precision, lensQualityBonus = 0) {
  const category = scienceCategoryForObject(object);
  const cleanPrecision = Math.min(
    100,
    Math.max(0, Number.isFinite(precision) ? precision : 0),
  );
  const points = Math.round(20 + cleanPrecision * 0.3 + lensQualityBonus);

  return {
    category,
    points,
    lensXp: Math.round(12 + cleanPrecision * 0.35 + lensQualityBonus * 0.5),
    precision: cleanPrecision,
  };
}

export function sanitizeSciencePoints(value) {
  const result = {};
  for (const book of SCIENCE_BOOKS) {
    result[book.id] = Number.isFinite(value?.[book.id])
      ? Math.max(0, Math.min(100000, Math.floor(value[book.id])))
      : 0;
  }
  return result;
}
