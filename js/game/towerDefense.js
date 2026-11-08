export const GAME_MODES = Object.freeze({
  peaceful: Object.freeze({ id: "peaceful", name: "Pacífico", interval: null }),
  normal: Object.freeze({ id: "normal", name: "Normal", interval: 180 }),
  survival: Object.freeze({ id: "survival", name: "Supervivencia", interval: 90 }),
});

export const GAME_MODE_ORDER = Object.freeze(["peaceful", "normal", "survival"]);

export const BUILDING_SLOTS = 4;

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
});

export const WAVE_TYPES = Object.freeze(["raider", "archer", "brute", "shaman"]);

export function modeById(id) {
  return GAME_MODES[id] ?? GAME_MODES.normal;
}

export function nextMode(id) {
  const index = GAME_MODE_ORDER.indexOf(id);
  return GAME_MODE_ORDER[(index + 1) % GAME_MODE_ORDER.length];
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

export function waveEnemyCount(wave) {
  return Math.min(24, 4 + Math.max(0, wave - 1) * 2);
}

export function waveHealthMultiplier(wave) {
  return 1 + Math.max(0, wave - 1) * 0.15;
}

export function waveDamageMultiplier(wave) {
  return 1 + Math.max(0, wave - 1) * 0.08;
}

export function waveTypeForIndex(index, wave) {
  if (wave >= 6 && index % 9 === 8) return "shaman";
  if (wave >= 4 && index % 5 === 4) return "brute";
  if (wave >= 2 && index % 3 === 2) return "archer";
  return "raider";
}

export function fiefRank({ alliedCount = 0, buildingLevels = 0, wavesSurvived = 0, mainAllied = 0, stability = 0 } = {}) {
  if (mainAllied >= 4 && buildingLevels >= 4 && stability >= 70 && wavesSurvived >= 10) return "feudo";
  if (alliedCount >= 2 && buildingLevels >= 2) return "senor";
  if (alliedCount >= 1) return "caudillo";
  return "aldeano";
}
