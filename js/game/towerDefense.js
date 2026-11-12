export const DIFFICULTIES = Object.freeze({
  easy: Object.freeze({
    id: "easy",
    name: "Fácil",
    enemyCountScale: 0.7,
    healthScale: 0.8,
    damageScale: 0.75,
    stabilityScale: 0.7,
  }),
  normal: Object.freeze({
    id: "normal",
    name: "Normal",
    enemyCountScale: 1,
    healthScale: 1,
    damageScale: 1,
    stabilityScale: 1,
  }),
  hard: Object.freeze({
    id: "hard",
    name: "Difícil",
    enemyCountScale: 1.3,
    healthScale: 1.2,
    damageScale: 1.25,
    stabilityScale: 1.3,
  }),
});

export const GAME_MODES = DIFFICULTIES;
export const GAME_MODE_ORDER = Object.freeze(["easy", "normal", "hard"]);

export function difficultyById(id) {
  return DIFFICULTIES[id] ?? DIFFICULTIES.normal;
}

export function modeById(id) {
  return difficultyById(id);
}

export function nextDifficulty(id) {
  const index = GAME_MODE_ORDER.indexOf(id);
  return GAME_MODE_ORDER[(index + 1) % GAME_MODE_ORDER.length];
}

export function nextMode(id) {
  return nextDifficulty(id);
}

export const BUILDING_SLOTS = 4;
export const BASE_POPULATION = 10;
export const HOUSING_POPULATION_BONUS = 10;
export const MAX_HOUSING_PER_VILLAGE = 3;

export const BUILDING_TYPES = Object.freeze({
  armada: Object.freeze({
    id: "armada",
    name: "Armada",
    description: "Entrena soldados y arqueros para defender la aldea.",
    color: "#d8c46a",
    hp: 120,
    primaryUnit: "soldier",
    secondaryUnit: "archer",
    costs: Object.freeze({ madera: 10, piedra: 8, oro: 3 }),
  }),
  museo: Object.freeze({
    id: "museo",
    name: "Museo",
    description: "Guarda reliquias y forma guardianes y eruditos.",
    color: "#9fc7ff",
    hp: 100,
    primaryUnit: "guardian",
    secondaryUnit: "scholar",
    costs: Object.freeze({ piedra: 10, cuarzo: 3, oro: 4 }),
  }),
  templo: Object.freeze({
    id: "templo",
    name: "Templo",
    description: "Forma sanadores y exorcistas que protegen la aldea.",
    color: "#7ec699",
    hp: 110,
    primaryUnit: "healer",
    secondaryUnit: "exorcist",
    costs: Object.freeze({ piedra: 9, madera: 7, oro: 3 }),
  }),
  taberna: Object.freeze({
    id: "taberna",
    name: "Taberna",
    description: "Recluta mercenarios y exploradores; mejora el comercio.",
    color: "#e0a458",
    hp: 90,
    primaryUnit: "mercenary",
    secondaryUnit: "scout",
    costs: Object.freeze({ madera: 8, bayas: 4, oro: 2 }),
  }),
  caballeria: Object.freeze({
    id: "caballeria",
    name: "Caballería",
    description: "Forma jinetes y lanceros rápidos para atacar y flanquear.",
    color: "#c9a36a",
    hp: 130,
    primaryUnit: "rider",
    secondaryUnit: "lancer",
    costs: Object.freeze({ madera: 12, piedra: 6, oro: 3 }),
  }),
  arqueria: Object.freeze({
    id: "arqueria",
    name: "Arquería",
    description: "Entrena arqueros y exploradores de largo alcance.",
    color: "#b7c7e0",
    hp: 95,
    primaryUnit: "archer",
    secondaryUnit: "scout",
    costs: Object.freeze({ madera: 10, fibra: 6, piedra: 4 }),
  }),
  germanderia: Object.freeze({
    id: "germanderia",
    name: "Germandía",
    description: "Cuartel de piqueros y guardianes para la defensa cercana.",
    color: "#a8b5a0",
    hp: 125,
    primaryUnit: "pikeman",
    secondaryUnit: "guardian",
    costs: Object.freeze({ madera: 8, piedra: 8, Fe: 2 }),
  }),
  vivienda: Object.freeze({
    id: "vivienda",
    name: "Zona habitacional",
    description: "Aumenta la población máxima en 10. Máximo 3 por aldea.",
    color: "#c9b37a",
    hp: 80,
    primaryUnit: null,
    secondaryUnit: null,
    populationBonus: HOUSING_POPULATION_BONUS,
    maxPerVillage: MAX_HOUSING_PER_VILLAGE,
    costs: Object.freeze({ madera: 8, piedra: 4 }),
  }),
});

export const UNIT_TYPES = Object.freeze({
  soldier: Object.freeze({ id: "soldier", name: "Soldado", hp: 80, damage: 12, range: 1.25, speed: 2.2, color: "#d8c46a", role: "melee" }),
  archer: Object.freeze({ id: "archer", name: "Arquero", hp: 55, damage: 10, range: 5.5, speed: 2, color: "#b7c7e0", role: "ranged" }),
  guardian: Object.freeze({ id: "guardian", name: "Guardián", hp: 130, damage: 10, range: 1.2, speed: 1.6, color: "#9fc7ff", role: "tank" }),
  scholar: Object.freeze({ id: "scholar", name: "Erudito", hp: 45, damage: 7, range: 4.5, speed: 1.8, color: "#cfd6e6", role: "support" }),
  healer: Object.freeze({ id: "healer", name: "Sanador", hp: 50, damage: 5, range: 3.5, speed: 1.8, color: "#7ec699", role: "healer" }),
  exorcist: Object.freeze({ id: "exorcist", name: "Exorcista", hp: 60, damage: 16, range: 4, speed: 1.9, color: "#b06bff", role: "magic" }),
  mercenary: Object.freeze({ id: "mercenary", name: "Mercenario", hp: 70, damage: 14, range: 1.3, speed: 2.5, color: "#e0a458", role: "melee" }),
  scout: Object.freeze({ id: "scout", name: "Explorador", hp: 50, damage: 9, range: 6, speed: 2.8, color: "#c9b9a3", role: "ranged" }),
  rider: Object.freeze({ id: "rider", name: "Jinete", hp: 110, damage: 18, range: 1.4, speed: 3, color: "#d6b47a", role: "melee" }),
  lancer: Object.freeze({ id: "lancer", name: "Lancero", hp: 85, damage: 15, range: 1.8, speed: 2.4, color: "#c9a36a", role: "melee" }),
  pikeman: Object.freeze({ id: "pikeman", name: "Piquero", hp: 95, damage: 14, range: 1.5, speed: 1.9, color: "#a8b5a0", role: "melee" }),
});

export const WAVE_TYPES = Object.freeze(["raider", "archer", "brute", "shaman"]);

export const BANNER_RECRUITS = Object.freeze({
  soldier: Object.freeze({ id: "soldier", category: "attack", cost: Object.freeze({ madera: 2, piedra: 2 }) }),
  archer: Object.freeze({ id: "archer", category: "attack", cost: Object.freeze({ madera: 2, fibra: 2 }) }),
  pikeman: Object.freeze({ id: "pikeman", category: "defense", cost: Object.freeze({ madera: 3, piedra: 3 }) }),
  guardian: Object.freeze({ id: "guardian", category: "defense", cost: Object.freeze({ piedra: 4, madera: 2 }) }),
  rider: Object.freeze({ id: "rider", category: "attack", cost: Object.freeze({ madera: 4, piedra: 2, oro: 1 }) }),
  mercenary: Object.freeze({ id: "mercenary", category: "attack", cost: Object.freeze({ oro: 2, bayas: 2 }) }),
  healer: Object.freeze({ id: "healer", category: "defense", cost: Object.freeze({ bayas: 3, fibra: 2 }) }),
  exorcist: Object.freeze({ id: "exorcist", category: "defense", cost: Object.freeze({ cuarzo: 2, Fe: 2 }) }),
});

export const HORDE_START_NIGHT = 2;

export function shouldStartHorde({
  night = false,
  day = 1,
  moonPhaseId = "new",
  hordesStarted = false,
  lastHordeDay = 0,
} = {}) {
  if (!night) {
    return false;
  }
  if (!hordesStarted) {
    return day >= HORDE_START_NIGHT;
  }
  return moonPhaseId === "new" && day !== lastHordeDay;
}

export function nextNewMoonDay(fromDay = 1) {
  const safe = Math.max(1, Math.floor(fromDay));
  const cycleIndex = (safe - 1) % 8;
  return safe + ((8 - cycleIndex) % 8);
}

export function buildingsForVillage(progress) {
  const slots = Array.isArray(progress?.buildings) ? progress.buildings.slice(0, BUILDING_SLOTS) : [];
  while (slots.length < BUILDING_SLOTS) slots.push(null);
  return slots;
}

export function buildingCost(typeId, level) {
  const type = BUILDING_TYPES[typeId];
  if (!type) return {};
  const multiplier = 1 + Math.max(0, level - 1) * 0.6;
  return Object.fromEntries(
    Object.entries(type.costs).map(([key, amount]) => [key, Math.ceil(amount * multiplier)]),
  );
}

export function unitCapForBuilding(level) {
  return Math.min(4, Math.max(2, level + 1));
}

export function housingCountForVillage(progress) {
  return buildingsForVillage(progress).filter(
    (building) => building?.type === "vivienda" && building.hp > 0,
  ).length;
}

export function populationCapForProgresses(progresses = []) {
  let cap = BASE_POPULATION;
  for (const progress of progresses) {
    cap += housingCountForVillage(progress) * HOUSING_POPULATION_BONUS;
  }
  return cap;
}

export function waveEnemyCount(wave, difficultyId = "normal") {
  const scale = difficultyById(difficultyId).enemyCountScale;
  return Math.min(30, Math.round((4 + Math.max(0, wave - 1) * 2) * scale));
}

export function waveHealthMultiplier(wave, difficultyId = "normal") {
  const scale = difficultyById(difficultyId).healthScale;
  return (1 + Math.max(0, wave - 1) * 0.15) * scale;
}

export function waveDamageMultiplier(wave, difficultyId = "normal") {
  const scale = difficultyById(difficultyId).damageScale;
  return (1 + Math.max(0, wave - 1) * 0.08) * scale;
}

export function waveTypeForIndex(index, wave) {
  if (wave >= 6 && index % 9 === 8) return "shaman";
  if (wave >= 4 && index % 5 === 4) return "brute";
  if (wave >= 2 && index % 3 === 2) return "archer";
  return "raider";
}

export function fiefRank({ alliedCount = 0, buildingLevels = 0, wavesSurvived = 0, mainAllied = 0, stability = 0, victory = false } = {}) {
  if (victory) return "principe";
  if (mainAllied >= 4 && buildingLevels >= 4 && stability >= 70 && wavesSurvived >= 10) return "feudo";
  if (alliedCount >= 2 && buildingLevels >= 2) return "senor";
  if (alliedCount >= 1) return "caudillo";
  return "aldeano";
}
