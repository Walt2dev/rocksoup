import { createRng } from "../core/rng.js";
import { normalizeSkinId } from "./skins.js";
import { FISH_SPECIES } from "./fishing.js";
import { BIRD_SPECIES } from "./birdwatching.js";
import { normalizeWaypoint } from "./compass.js";
import { sanitizeFarmPlots } from "./farming.js";
import { sanitizeSciencePoints } from "./science.js";
import {
  BUILDING_SLOTS,
  BUILDING_TYPES,
  GAME_MODES,
} from "./towerDefense.js";
import { MINERAL_TYPES } from "../world/minerals.js";
import { CAMERA } from "../world/params.js";
import {
  DEFAULT_CAPACITY,
  ITEM_KEYS,
  MAX_STACK,
  RESOURCE_KEYS,
  TOOL_KEYS,
  UPGRADE_KEYS,
} from "./inventory.js";

export const SAVE_KEY = "rocksoup.save.v1";
export const SAVE_VERSION = 2;

const MAX_CAPACITY = 9999;
const MAX_HARVESTED = 10000;
const MAX_COORDINATE = 10000000;
const MAX_WORKERS = 4;
const WORKER_AUTO_RADIUS = 5;
const MAX_WORKER_AUTO_RADIUS = 32;
const MAX_STONES = 80;
const MAX_STRUCTURES = 100;

function sanitizeResources(value) {
  const resources = {};

  for (const key of RESOURCE_KEYS) {
    const amount = value && typeof value === "object" ? value[key] : 0;
    resources[key] = Number.isFinite(amount)
      ? Math.min(MAX_STACK, Math.max(0, Math.floor(amount)))
      : 0;
  }

  return resources;
}

function sanitizeTools(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((tool) => TOOL_KEYS.includes(tool)))];
}

function sanitizeUpgrades(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((upgrade) => UPGRADE_KEYS.includes(upgrade)))];
}

function sanitizeItems(value) {
  const items = {};

  for (const key of ITEM_KEYS) {
    const amount = value && typeof value === "object" ? value[key] : 0;
    items[key] = Number.isFinite(amount)
      ? Math.min(MAX_STACK, Math.max(0, Math.floor(amount)))
      : 0;
  }

  return items;
}

function sanitizeInventory(value) {
  const inventory = value && typeof value === "object" ? value : {};
  const capacity = Number.isFinite(inventory.capacity)
    ? Math.min(MAX_CAPACITY, Math.max(1, Math.floor(inventory.capacity)))
    : DEFAULT_CAPACITY;

  return {
    resources: sanitizeResources(inventory.resources),
    capacity,
    tools: sanitizeTools(inventory.tools),
    items: sanitizeItems(inventory.items),
    upgrades: sanitizeUpgrades(inventory.upgrades),
  };
}

export function sanitizeFishingRecords(value) {
  const records = {};

  if (!value || typeof value !== "object") {
    return records;
  }

  for (const fish of FISH_SPECIES) {
    const record = value[fish.id];

    if (!record || typeof record !== "object") {
      continue;
    }

    records[fish.id] = {
      weight: Number.isFinite(record.weight)
        ? Math.min(fish.maxWeight, Math.max(0, record.weight))
        : 0,
      count: Number.isFinite(record.count)
        ? Math.min(MAX_HARVESTED, Math.max(0, Math.floor(record.count)))
        : 0,
    };
  }

  return records;
}

export function sanitizeBirdRecords(value) {
  const records = {};

  if (!value || typeof value !== "object") {
    return records;
  }

  for (const bird of BIRD_SPECIES) {
    const record = value[bird.id];

    if (!record || typeof record !== "object") {
      continue;
    }

    records[bird.id] = {
      count: Number.isFinite(record.count)
        ? Math.min(MAX_HARVESTED, Math.max(0, Math.floor(record.count)))
        : 0,
      best: Number.isFinite(record.best)
        ? Math.min(10000, Math.max(0, Math.floor(record.best)))
        : 0,
    };
  }

  return records;
}

function sanitizeCompanion(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  if (value.species !== "perdiz") {
    return null;
  }
  return { species: "perdiz" };
}

function sanitizeWolfMission(value) {
  const mission = value && typeof value === "object" ? value : {};
  return {
    discovered: mission.discovered === true,
    kills: Number.isFinite(mission.kills)
      ? Math.max(0, Math.min(999, Math.floor(mission.kills)))
      : 0,
    completed: mission.completed === true,
    claimed: mission.claimed === true,
  };
}

function sanitizeUniversity(value) {
  const university = value && typeof value === "object" ? value : {};
  const researchedPotions = Array.isArray(university.researchedPotions)
    ? [
        ...new Set(
          university.researchedPotions
            .filter((id) => typeof id === "string")
            .map((id) => id.slice(0, 80)),
        ),
      ].slice(0, 100)
    : [];
  const libraryEntries = Array.isArray(university.libraryEntries)
    ? university.libraryEntries
        .filter((entry) => entry && typeof entry.id === "string")
        .map((entry) => ({
          id: entry.id.slice(0, 80),
          name:
            typeof entry.name === "string"
              ? entry.name.slice(0, 120)
              : entry.id,
          description:
            typeof entry.description === "string"
              ? entry.description.slice(0, 300)
              : "",
        }))
        .slice(0, 500)
    : [];
  const workerMapBonus = Number.isFinite(university.workerMapBonus)
    ? Math.min(7, Math.max(0, Math.floor(university.workerMapBonus)))
    : 0;

  return {
    bookOwned: university.bookOwned === true,
    researchedPotions,
    libraryEntries,
    workerMapBonus,
  };
}

function sanitizeWorkers(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const workers = [];

  for (const worker of value) {
    if (!worker || !Number.isFinite(worker.x) || !Number.isFinite(worker.y)) {
      continue;
    }

    const name =
      typeof worker.name === "string" && worker.name.trim().length > 0
        ? worker.name.trim().slice(0, 24)
        : `Duende ${workers.length + 1}`;
    let task = null;

    if (
      worker.task &&
      (worker.task.kind === "tree" ||
        worker.task.kind === "mineral" ||
        worker.task.kind === "bush" ||
        worker.task.kind === "grass" ||
        worker.task.kind === "restore") &&
      Number.isFinite(worker.task.x) &&
      Number.isFinite(worker.task.y)
    ) {
      task = {
        kind: worker.task.kind,
        x: Math.floor(worker.task.x),
        y: Math.floor(worker.task.y),
      };
    }

    workers.push({
      name,
      x: Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, worker.x)),
      y: Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, worker.y)),
      task,
      autoRepeat: worker.autoRepeat === true,
      autoRadius: Number.isFinite(worker.autoRadius)
        ? Math.min(
            MAX_WORKER_AUTO_RADIUS,
            Math.max(1, Math.floor(worker.autoRadius)),
          )
        : WORKER_AUTO_RADIUS,
    });

    if (workers.length >= MAX_WORKERS) {
      break;
    }
  }

  return workers;
}

function sanitizeStructureList(value, max = MAX_STRUCTURES) {
  if (!Array.isArray(value)) {
    return [];
  }

  const structures = new Map();

  for (const structure of value) {
    if (
      !structure ||
      !Number.isFinite(structure.x) ||
      !Number.isFinite(structure.y)
    ) {
      continue;
    }

    const x = Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, structure.x));
    const y = Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, structure.y));
    const key = `${x.toFixed(3)},${y.toFixed(3)}`;

    if (!structures.has(key)) {
      structures.set(key, { x, y });
    }
    if (structures.size >= max) {
      break;
    }
  }

  return [...structures.values()];
}

function sanitizeTorches(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const torches = new Map();

  for (const torch of value) {
    if (!torch || !Number.isFinite(torch.x) || !Number.isFinite(torch.y)) {
      continue;
    }

    const x = Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, torch.x));
    const y = Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, torch.y));
    const key = `${x.toFixed(3)},${y.toFixed(3)}`;

    if (!torches.has(key)) {
      const entry = { x, y };
      if (Number.isFinite(torch.z)) {
        entry.z = Math.min(8, Math.max(-70, torch.z));
      }
      torches.set(key, entry);
    }
    if (torches.size >= MAX_STRUCTURES) {
      break;
    }
  }

  return [...torches.values()];
}

function sanitizeChests(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const chests = new Map();

  for (const chest of value) {
    if (
      !chest ||
      !Number.isFinite(chest.x) ||
      !Number.isFinite(chest.y)
    ) {
      continue;
    }

    const x = Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, chest.x));
    const y = Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, chest.y));
    const key = `${x.toFixed(3)},${y.toFixed(3)}`;

    if (!chests.has(key)) {
      chests.set(key, {
        x,
        y,
        inventory: sanitizeInventory(chest.inventory),
      });
    }
    if (chests.size >= MAX_STRUCTURES) {
      break;
    }
  }

  return [...chests.values()];
}

function sanitizeGroundItems(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const items = [];

  for (const item of value) {
    if (!item || (item.kind !== "resource" && item.kind !== "item")) {
      continue;
    }
    if (
      (item.kind === "resource" && !RESOURCE_KEYS.includes(item.key)) ||
      (item.kind === "item" && !ITEM_KEYS.includes(item.key))
    ) {
      continue;
    }
    if (!Number.isFinite(item.x) || !Number.isFinite(item.y)) {
      continue;
    }

    const amount = Number.isFinite(item.amount)
      ? Math.min(MAX_STACK, Math.max(1, Math.floor(item.amount)))
      : 1;

    items.push({
      kind: item.kind,
      key: item.key,
      amount,
      x: Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, item.x)),
      y: Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, item.y)),
    });

    if (items.length >= 100) {
      break;
    }
  }

  return items;
}

function sanitizeStones(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const stones = [];

  for (const stone of value) {
    const type = typeof stone === "object" ? stone?.type : stone;

    if (!Number.isInteger(type) || !MINERAL_TYPES[type - 1]) {
      continue;
    }

    stones.push(type);
    if (stones.length >= MAX_STONES) {
      break;
    }
  }

  return stones;
}

function sanitizePlantedNodes(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const nodes = new Map();

  for (const node of value) {
    if (
      !node ||
      (node.kind !== "tree" && node.kind !== "grass") ||
      !Number.isFinite(node.x) ||
      !Number.isFinite(node.y) ||
      !node.data ||
      typeof node.data !== "object"
    ) {
      continue;
    }

    const x = Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, Math.floor(node.x)));
    const y = Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, Math.floor(node.y)));
    const key = `${node.kind}:${x}:${y}`;
    const data = {};

    if (Number.isFinite(node.data.species)) {
      data.species = Math.min(3, Math.max(0, Math.floor(node.data.species)));
    }
    if (Number.isFinite(node.data.variant)) {
      data.variant = Math.max(0, Math.floor(node.data.variant));
    }
    if (Number.isFinite(node.data.scale)) {
      data.scale = Math.min(2, Math.max(0.3, node.data.scale));
    }
    if (typeof node.data.style === "string") {
      data.style = node.data.style.slice(0, 20);
    }

    nodes.set(key, { kind: node.kind, x, y, data });
    if (nodes.size >= MAX_HARVESTED) {
      break;
    }
  }

  return [...nodes.values()];
}

const FEATHER_SPECIES_KEYS = Object.freeze(["vulture", "sparrow", "crow", "owl", "perdiz"]);

export function sanitizeFeathers(value) {
  const feathers = {};

  if (!value || typeof value !== "object") {
    return feathers;
  }

  for (const key of FEATHER_SPECIES_KEYS) {
    if (Number.isFinite(value[key])) {
      feathers[key] = Math.min(10000, Math.max(0, Math.floor(value[key])));
    }
  }

  return feathers;
}

function sanitizePlayer(value) {
  const player = value && typeof value === "object" ? value : {};
  const x = Number.isFinite(player.x) ? player.x : null;
  const y = Number.isFinite(player.y) ? player.y : null;
  const energy = Number.isFinite(player.energy)
    ? Math.min(100, Math.max(0, player.energy))
    : 100;
  const buffSeconds = Number.isFinite(player.buffSeconds)
    ? Math.min(30, Math.max(0, player.buffSeconds))
    : 0;
  const swimSeconds = Number.isFinite(player.swimSeconds)
    ? Math.min(90, Math.max(0, player.swimSeconds))
    : 0;

  return {
    x,
    y,
    energy,
    buffSeconds,
    swimSeconds,
  };
}

function sanitizeHarvestedNodes(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const nodes = new Map();

  for (const node of value) {
    if (
      !node ||
      (node.kind !== "tree" &&
        node.kind !== "mineral" &&
        node.kind !== "bush" &&
        node.kind !== "grass")
    ) {
      continue;
    }
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
      continue;
    }

    const x = Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, Math.floor(node.x)));
    const y = Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, Math.floor(node.y)));
    const key = `${node.kind}:${x}:${y}`;

    if (!nodes.has(key)) {
      nodes.set(key, { kind: node.kind, x, y });
    }
    if (nodes.size >= MAX_HARVESTED) {
      break;
    }
  }

  return [...nodes.values()];
}

function sanitizeDonkey(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    return null;
  }

  return {
    x: Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, value.x)),
    y: Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, value.y)),
    trust: Number.isFinite(value.trust)
      ? Math.max(0, Math.min(3, Math.floor(value.trust)))
      : 0,
    tamed: value.tamed === true,
    skinId:
      typeof value.skinId === "string" &&
      /^[a-zA-Z0-9_-]{1,64}$/.test(value.skinId)
        ? value.skinId
        : "gris",
  };
}

function sanitizeInvestigations(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (entry) =>
        entry &&
        typeof entry.objectId === "string" &&
        typeof entry.category === "string",
    )
    .slice(-200)
    .map((entry) => ({
      objectId: entry.objectId.slice(0, 80),
      name: typeof entry.name === "string" ? entry.name.slice(0, 80) : entry.objectId,
      category: entry.category.slice(0, 20),
      day: Number.isFinite(entry.day) ? Math.max(1, Math.floor(entry.day)) : 1,
      phase: typeof entry.phase === "string" ? entry.phase.slice(0, 30) : "unknown",
      precision: Number.isFinite(entry.precision)
        ? Math.max(0, Math.min(100, entry.precision))
        : 0,
    }));
}

function sanitizeVillageProgress(value) {
  if (!value || typeof value !== "object") {
    return {};
  }

  const result = {};
  for (const [id, raw] of Object.entries(value)) {
    if (!raw || typeof raw !== "object") {
      continue;
    }
    result[id.slice(0, 80)] = {
      stability: Number.isFinite(raw.stability)
        ? Math.max(0, Math.min(100, raw.stability))
        : 100,
      delivered: Number.isFinite(raw.delivered)
        ? Math.max(0, Math.min(12, Math.floor(raw.delivered)))
        : 0,
      allied: raw.allied === true,
      crafted: typeof raw.crafted === "string" ? raw.crafted.slice(0, 80) : null,
      lastProduction: Number.isFinite(raw.lastProduction)
        ? Math.max(0, raw.lastProduction)
        : 0,
      buildings: Array.from({ length: BUILDING_SLOTS }, (_, slot) => {
        const building = Array.isArray(raw.buildings) ? raw.buildings[slot] : null;
        if (!building || !BUILDING_TYPES[building.type]) {
          return null;
        }
        const level = Number.isFinite(building.level)
          ? Math.max(1, Math.min(3, Math.floor(building.level)))
          : 1;
        const maxHp = BUILDING_TYPES[building.type].hp * level;
        return {
          type: building.type,
          level,
          maxHp,
          hp: Number.isFinite(building.hp)
            ? Math.max(0, Math.min(maxHp, building.hp))
            : maxHp,
        };
      }),
    };
  }
  return result;
}

function sanitizeTradeRoutes(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (route) =>
        route &&
        typeof route.id === "string" &&
        typeof route.originId === "string" &&
        typeof route.destinationId === "string" &&
        typeof route.goods === "string",
    )
    .slice(0, 8)
    .map((route) => ({
      id: route.id.slice(0, 80),
      originId: route.originId.slice(0, 80),
      destinationId: route.destinationId.slice(0, 80),
      goods: route.goods.slice(0, 20),
      startedAt: Number.isFinite(route.startedAt) ? Math.max(0, route.startedAt) : 0,
      duration: Number.isFinite(route.duration) ? Math.max(1, route.duration) : 1,
      share: Number.isFinite(route.share)
        ? Math.max(0, Math.min(1, route.share))
        : 0.2,
    }));
}

export function sanitizeSave(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  let seed;
  try {
    seed = createRng(value.seed).seed;
  } catch {
    return null;
  }

  const camera = value.camera;
  if (
    !camera ||
    typeof camera !== "object" ||
    !Number.isFinite(camera.x) ||
    !Number.isFinite(camera.y)
  ) {
    return null;
  }

  const zoom = Number.isFinite(camera.zoom) ? camera.zoom : CAMERA.initialZoom;
  const player = sanitizePlayer(value.player);

  if (player.x === null || player.y === null) {
    player.x = camera.x;
    player.y = camera.y;
  }

  return {
    version: SAVE_VERSION,
    seed,
    worldBiomes: value.worldBiomes === "expanded" ? "expanded" : "legacy",
    characterSkin: normalizeSkinId(value.characterSkin),
    donkey: sanitizeDonkey(value.donkey),
    time: Number.isFinite(value.time) ? Math.max(0, value.time) : 0,
    camera: {
      x: camera.x,
      y: camera.y,
      zoom: Math.min(CAMERA.maxZoom, Math.max(CAMERA.minZoom, zoom)),
      rotation: Number.isFinite(camera.rotation)
        ? ((Math.floor(camera.rotation) % 4) + 4) % 4
        : 0,
    },
    player,
    inventory: sanitizeInventory(value.inventory),
    harvestedNodes: sanitizeHarvestedNodes(value.harvestedNodes),
    plantedNodes: sanitizePlantedNodes(value.plantedNodes),
    campfires: sanitizeStructureList(value.campfires, 200),
    ovens: sanitizeStructureList(value.ovens),
    brewingTables: sanitizeStructureList(value.brewingTables),
    chests: sanitizeChests(value.chests),
    tipis: sanitizeStructureList(value.tipis),
    fences: sanitizeStructureList(value.fences),
    torches: sanitizeTorches(value.torches),
    walls: sanitizeStructureList(value.walls),
    stonePaths: sanitizeStructureList(value.stonePaths, 1000),
    beds: sanitizeStructureList(value.beds),
    cauldrons: sanitizeStructureList(value.cauldrons),
    university: sanitizeUniversity(value.university),
    workers: sanitizeWorkers(value.workers),
    stones: sanitizeStones(value.stones),
    groundItems: sanitizeGroundItems(value.groundItems),
    fishingRecords: sanitizeFishingRecords(value.fishingRecords),
    farmPlots: sanitizeFarmPlots(value.farmPlots),
    feathers: sanitizeFeathers(value.feathers),
    observatoryDiscoveries: Array.isArray(value.observatoryDiscoveries)
      ? [...new Set(
          value.observatoryDiscoveries
            .filter((id) => typeof id === "string")
            .map((id) => id.slice(0, 80)),
        )].slice(0, 200)
      : [],
    observationNotes: Array.isArray(value.observationNotes)
      ? [...new Set(
          value.observationNotes
            .filter((id) => typeof id === "string")
            .map((id) => id.slice(0, 80)),
        )].slice(0, 200)
      : [],
    completedVillages: Array.isArray(value.completedVillages)
      ? [...new Set(
          value.completedVillages
            .filter((id) => typeof id === "string")
            .map((id) => id.slice(0, 80)),
        )].slice(0, 100)
      : [],
    seenVillages: Array.isArray(value.seenVillages)
      ? [...new Set(
          value.seenVillages
            .filter((id) => typeof id === "string")
            .map((id) => id.slice(0, 80)),
        )].slice(0, 100)
      : [],
    birdObservations: Array.isArray(value.birdObservations)
      ? [...new Set(
          value.birdObservations
            .filter((id) => typeof id === "string")
            .map((id) => id.slice(0, 80)),
        )].slice(0, 50)
      : [],
    birdRecords: sanitizeBirdRecords(value.birdRecords),
    birdMissionCompleted: value.birdMissionCompleted === true,
    companion: sanitizeCompanion(value.companion),
    wolfBiome: value.wolfBiome === true,
    wolfMission: sanitizeWolfMission(value.wolfMission),
    wolfTotems: sanitizeStructureList(value.wolfTotems, 100),
    compassOwned: value.compassOwned === true,
    waypoint: normalizeWaypoint(value.waypoint),
    craftXp: Number.isFinite(value.craftXp)
      ? Math.max(0, Math.min(10000000, Math.floor(value.craftXp)))
      : 0,
    sciencePoints: sanitizeSciencePoints(value.sciencePoints),
    investigations: sanitizeInvestigations(value.investigations),
    lensXp: Number.isFinite(value.lensXp) ? Math.max(0, value.lensXp) : 0,
    lensLevel: Number.isFinite(value.lensLevel)
      ? Math.max(0, Math.min(4, Math.floor(value.lensLevel)))
      : 0,
    gameMode: GAME_MODES[value.gameMode] ? value.gameMode : "survival",
    wavesStarted: value.wavesStarted === true,
    wavesSurvived: Number.isFinite(value.wavesSurvived)
      ? Math.max(0, Math.floor(value.wavesSurvived))
      : 0,
    waveIndex: Number.isFinite(value.waveIndex)
      ? Math.max(0, Math.floor(value.waveIndex))
      : 0,
    waveTimer: Number.isFinite(value.waveTimer)
      ? Math.max(0, value.waveTimer)
      : 90,
    tradeRoutes: sanitizeTradeRoutes(value.tradeRoutes),
    villageProgress: sanitizeVillageProgress(value.villageProgress),
    savedAt: Number.isFinite(value.savedAt) ? value.savedAt : Date.now(),
  };
}

export function createSaveStore(storage) {
  function read() {
    if (!storage) {
      return null;
    }

    try {
      const raw = storage.getItem(SAVE_KEY);
      if (!raw) {
        return null;
      }
      return sanitizeSave(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  function write(value) {
    const clean = sanitizeSave(value);
    if (!clean || !storage) {
      return false;
    }

    try {
      storage.setItem(SAVE_KEY, JSON.stringify(clean));
      return true;
    } catch {
      return false;
    }
  }

  function clear() {
    if (!storage) {
      return;
    }
    try {
      storage.removeItem(SAVE_KEY);
    } catch {
      // El almacenamiento puede estar bloqueado por el navegador.
    }
  }

  return { key: SAVE_KEY, read, write, clear };
}
