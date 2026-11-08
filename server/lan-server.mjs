import { createServer } from "node:http";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { networkInterfaces } from "node:os";
import { randomBytes } from "node:crypto";
import { WebSocketServer } from "ws";

import { World } from "../js/world/world.js";
import { MINERAL_TYPES } from "../js/world/minerals.js";
import { FISH_SPECIES } from "../js/game/fishing.js";
import { sanitizeFarmPlot } from "../js/game/farming.js";
import { sanitizeFeathers } from "../js/game/save.js";
import {
  PVP_CONFIG,
  addParticipants,
  createPvpState,
  ensureParticipant,
  recordKill,
  snapshotPvp,
  tickPvp,
} from "./pvp.mjs";
import {
  CHAT_CONFIG,
  ChatHistory,
  ChatLimiter,
  sanitizeChatText,
} from "./chat.mjs";
import {
  createLeaderboard,
  leaderboardTop,
  mergeEventResults,
  sanitizeLeaderboard,
} from "./leaderboard.mjs";

const ROOT = resolve(process.cwd());
const SAVE_DIR = process.env.SAVE_DIR
  ? resolve(process.env.SAVE_DIR)
  : join(ROOT, "server");
const SAVE_PATH = process.env.SAVE_PATH
  ? resolve(process.env.SAVE_PATH)
  : join(SAVE_DIR, "lan-save.json");
const PORT = Number(process.env.PORT || 3000);
const MAX_PLAYERS = 6;
const PLAYER_COLORS = ["#e0a458", "#7ec699", "#6ca9e0", "#d97b6c", "#b58ce0", "#d8c46a"];
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".map": "application/json",
  ".woff2": "font/woff2",
};

function sanitizeName(value) {
  const name = typeof value === "string" ? value.trim().slice(0, 18) : "";
  return name || "Jugador";
}

function sanitizeSkinId(value) {
  if (typeof value === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(value)) {
    return value;
  }
  return "explorer";
}

function sanitizeToken(value) {
  if (typeof value === "string" && /^[a-zA-Z0-9_-]{8,80}$/.test(value)) {
    return value;
  }
  return randomBytes(16).toString("hex");
}

function sanitizeInventory(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const json = JSON.stringify(value);
  if (json.length > 120000) {
    return null;
  }

  return JSON.parse(json);
}

function sanitizeStones(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((type) => Number.isInteger(type) && type >= 1 && type <= MINERAL_TYPES.length)
    .slice(0, 80);
}

function sanitizeFishingRecords(value) {
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
        ? Math.min(10000, Math.max(0, Math.floor(record.count)))
        : 0,
    };
  }

  return records;
}

function sanitizeFarmPlots(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const plots = new Map();

  for (const raw of value) {
    const plot = sanitizeFarmPlot(raw);

    if (!plot) {
      continue;
    }

    plots.set(`${plot.x}:${plot.y}`, plot);
    if (plots.size >= 200) {
      break;
    }
  }

  return [...plots.values()];
}

function sanitizeDiscoveries(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return [
    ...new Set(
      value
        .filter((id) => typeof id === "string")
        .map((id) => id.slice(0, 80)),
    ),
  ].slice(0, 200);
}

function clampSwimSeconds(value) {
  return Number.isFinite(value) ? Math.min(90, Math.max(0, value)) : 0;
}

function sanitizeStructureList(value, max = 200) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();
  const result = [];

  for (const entry of value) {
    if (!entry || !Number.isFinite(entry.x) || !Number.isFinite(entry.y)) {
      continue;
    }
    const x = entry.x;
    const y = entry.y;
    const key = `${x.toFixed(3)},${y.toFixed(3)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push({ x, y });
    if (result.length >= max) {
      break;
    }
  }

  return result;
}

function sanitizeTorches(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();
  const result = [];

  for (const entry of value) {
    if (!entry || !Number.isFinite(entry.x) || !Number.isFinite(entry.y)) {
      continue;
    }
    const key = `${entry.x.toFixed(3)},${entry.y.toFixed(3)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const torch = { x: entry.x, y: entry.y };
    if (Number.isFinite(entry.z)) {
      torch.z = Math.min(8, Math.max(-70, entry.z));
    }
    result.push(torch);
    if (result.length >= 200) {
      break;
    }
  }

  return result;
}

function createInitialState() {
  return {
    version: 1,
    seed: randomBytes(4).toString("hex"),
    worldBiomes: "expanded",
    time: 0,
    structures: {
      campfires: [],
      ovens: [],
      brewingTables: [],
      torches: [],
      stonePaths: [],
    },
    groundItems: [],
    farmPlots: [],
    profiles: {},
    leaderboard: createLeaderboard(),
  };
}

async function loadState() {
  if (!existsSync(SAVE_PATH)) {
    return createInitialState();
  }

  try {
    const parsed = JSON.parse(await readFile(SAVE_PATH, "utf8"));
    const state = createInitialState();

    if (typeof parsed.seed === "string" && parsed.seed.length > 0) {
      state.seed = parsed.seed;
    }
    state.worldBiomes =
      parsed.worldBiomes === "expanded" ? "expanded" : "legacy";
    state.time = Number.isFinite(parsed.time) ? Math.max(0, parsed.time) : 0;
    state.structures = {
      campfires: sanitizeStructureList(parsed.structures?.campfires),
      ovens: sanitizeStructureList(parsed.structures?.ovens),
      brewingTables: sanitizeStructureList(parsed.structures?.brewingTables),
      torches: sanitizeTorches(parsed.structures?.torches),
      stonePaths: sanitizeStructureList(parsed.structures?.stonePaths, 1000),
    };
    state.groundItems = [];
    state.profiles =
      parsed.profiles && typeof parsed.profiles === "object" ? parsed.profiles : {};
    state.harvested = Array.isArray(parsed.harvested) ? parsed.harvested : [];
    state.planted = Array.isArray(parsed.planted) ? parsed.planted : [];
    state.farmPlots = sanitizeFarmPlots(parsed.farmPlots);
    state.leaderboard = sanitizeLeaderboard(parsed.leaderboard);

    return state;
  } catch (error) {
    console.warn("[LAN] No se pudo leer el guardado; se crea uno nuevo:", error.message);
    return createInitialState();
  }
}

const state = await loadState();
if (!Array.isArray(state.harvested)) {
  state.harvested = [];
}

const world = new World(state.seed, {
  biomeSet: state.worldBiomes,
  flat: true,
});
world.loadHarvested(state.harvested);
world.loadPlanted(state.planted ?? []);

let nextPlayerId = 1;
let hostId = null;
let started = false;
let saveTimer = null;
const clients = new Map();
const pvpConfig = {
  ...PVP_CONFIG,
  intervalMs:
    Number(process.env.PVP_INTERVAL_MS) > 0
      ? Math.floor(Number(process.env.PVP_INTERVAL_MS))
      : PVP_CONFIG.intervalMs,
  durationMs:
    Number(process.env.PVP_DURATION_MS) > 0
      ? Math.floor(Number(process.env.PVP_DURATION_MS))
      : PVP_CONFIG.durationMs,
};
const pvp = createPvpState(Date.now(), pvpConfig);
const chatHistory = new ChatHistory(CHAT_CONFIG.historyLimit);

function publicPlayer(client) {
  return {
    id: client.id,
    name: client.name,
    color: client.color,
    x: client.x,
    y: client.y,
    facing: client.facing,
    health: client.health,
    swimSeconds: client.swimSeconds,
    workers: client.workers,
    skinId: client.skinId,
  };
}

function lobbyPayload() {
  return {
    type: "lobby",
    hostId,
    started,
    players: [...clients.values()].map((client) => ({
      id: client.id,
      name: client.name,
      color: client.color,
      health: client.health,
    })),
  };
}

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcast(payload, { include } = {}) {
  for (const client of clients.values()) {
    if (include && !include(client)) {
      continue;
    }
    send(client.ws, payload);
  }
}

function broadcastLobby() {
  broadcast(lobbyPayload(), { include: (client) => !started });
}

function leaderboardEntriesFor(client) {
  return leaderboardTop(state.leaderboard, { limit: 10 }).map((entry) => ({
    name: entry.name,
    color: entry.color,
    points: entry.points,
    kills: entry.kills,
    deaths: entry.deaths,
    bestStreak: entry.bestStreak,
    eventsWon: entry.eventsWon,
    bestEventScore: entry.bestEventScore,
    isSelf: entry.token === client.token,
  }));
}

function sendLeaderboard(client) {
  send(client.ws, {
    type: "leaderboard",
    entries: leaderboardEntriesFor(client),
  });
}

function broadcastLeaderboard() {
  for (const client of clients.values()) {
    sendLeaderboard(client);
  }
}

function pushChat(entry) {
  chatHistory.push(entry);
  broadcast(entry);
}

function pushSystemChat(text) {
  pushChat({
    type: "chat",
    system: true,
    text: String(text).slice(0, 240),
    at: Date.now(),
  });
}

function currentEventSnapshot() {
  return snapshotPvp(pvp, Date.now());
}

function handlePvpTransition(now) {
  const transition = tickPvp(pvp, now);

  if (!transition) {
    return;
  }

  if (transition.type === "active") {
    addParticipants(pvp, [...clients.values()]);
    pushSystemChat(
      `¡Evento PvP! Deathmatch de ${Math.round(pvp.config.durationMs / 1000)} s. Cada kill da puntos.`,
    );
  } else if (transition.type === "finished") {
    mergeEventResults(state.leaderboard, transition.results, {
      now,
      winnerToken: transition.winner?.token ?? null,
    });
    broadcastLeaderboard();

    if (transition.winner && transition.winner.score > 0) {
      pushSystemChat(
        `Evento PvP finalizado. Ganador: ${transition.winner.name} (${transition.winner.score} pts).`,
      );
    } else {
      pushSystemChat("Evento PvP finalizado sin puntuaciones.");
    }

    scheduleSave();
  }
}

function worldSnapshot() {
  return {
    worldBiomes: state.worldBiomes,
    time: state.time,
    harvested: world.exportHarvested(),
    planted: world.exportPlanted(),
    farmPlots: state.farmPlots,
    structures: state.structures,
    groundItems: state.groundItems,
  };
}

function profileFor(client) {
  return {
    name: client.name,
    color: client.color,
    skinId: client.skinId,
    x: client.x,
    y: client.y,
    health: client.health,
    inventory: client.inventory,
    stones: client.stones,
    fishingRecords: client.fishingRecords,
    feathers: client.feathers,
    observatoryDiscoveries: client.observatoryDiscoveries,
    swimSeconds: client.swimSeconds,
  };
}

function sendStart(client) {
  send(client.ws, {
    type: "start",
    seed: state.seed,
    world: worldSnapshot(),
    profile: profileFor(client),
    selfId: client.id,
    hostId,
    leaderboard: leaderboardEntriesFor(client),
    chat: chatHistory.snapshot(),
    event: currentEventSnapshot(),
  });
}

function scheduleSave() {
  if (saveTimer) {
    return;
  }

  saveTimer = setTimeout(() => {
    saveTimer = null;
    void saveState();
  }, 800);
}

async function saveState() {
  const profiles = {};

  for (const client of clients.values()) {
    profiles[client.token] = {
    name: client.name,
    color: client.color,
    skinId: client.skinId,
    x: client.x,
    y: client.y,
    health: client.health,
    inventory: client.inventory,
    stones: client.stones,
    fishingRecords: client.fishingRecords,
    feathers: client.feathers,
    observatoryDiscoveries: client.observatoryDiscoveries,
    swimSeconds: client.swimSeconds,
    lastSeen: Date.now(),
  };
  }

  for (const [token, profile] of Object.entries(state.profiles)) {
    if (!profiles[token]) {
      profiles[token] = profile;
    }
  }

  const payload = {
    version: 1,
    seed: state.seed,
    worldBiomes: state.worldBiomes,
    time: state.time,
    harvested: world.exportHarvested(),
    planted: world.exportPlanted(),
    farmPlots: state.farmPlots,
    structures: state.structures,
    groundItems: state.groundItems,
    profiles,
    leaderboard: state.leaderboard,
  };

  try {
    await mkdir(SAVE_DIR, { recursive: true });
    const temp = `${SAVE_PATH}.tmp`;
    await writeFile(temp, JSON.stringify(payload), "utf8");
    await rename(temp, SAVE_PATH);
  } catch (error) {
    console.warn("[LAN] No se pudo guardar:", error.message);
  }
}

function joinGameForClient(client) {
  if (started) {
    sendStart(client);
  } else {
    send(client.ws, {
      type: "welcome",
      protocol: 1,
      selfId: client.id,
      hostId,
      token: client.token,
      started,
    });
    broadcastLobby();
  }
}

function isTooCloseToPlayers(x, y, excludeId = null) {
  for (const client of clients.values()) {
    if (client.id === excludeId) {
      continue;
    }
    if (Math.hypot(client.x - x, client.y - y) < 1.5) {
      return true;
    }
  }
  return false;
}

function findAvailableSpawn(preferred = null, excludeId = null) {
  const base = preferred ?? world.findSpawn();
  const baseX = Number.isFinite(base.x) ? base.x : 0.5;
  const baseY = Number.isFinite(base.y) ? base.y : 0.5;

  if (
    world.isActorWalkableAt(Math.floor(baseX), Math.floor(baseY)) &&
    !isTooCloseToPlayers(baseX, baseY, excludeId)
  ) {
    return { x: baseX, y: baseY };
  }

  for (let radius = 1; radius <= 14; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) {
          continue;
        }
        const x = Math.floor(baseX) + dx + 0.5;
        const y = Math.floor(baseY) + dy + 0.5;
        if (!world.isActorWalkableAt(Math.floor(x), Math.floor(y))) {
          continue;
        }
        if (isTooCloseToPlayers(x, y, excludeId)) {
          continue;
        }
        return { x, y };
      }
    }
  }

  return { x: baseX, y: baseY };
}

function handleJoin(ws, message) {
  if (clients.has(ws)) {
    return;
  }
  if (clients.size >= MAX_PLAYERS) {
    send(ws, { type: "error", message: "La sala LAN está llena." });
    ws.close();
    return;
  }

  const token = sanitizeToken(message.token);
  const name = sanitizeName(message.name);

  for (const existing of clients.values()) {
    if (existing.token === token) {
      send(ws, { type: "error", message: "Ese jugador ya está conectado." });
      ws.close();
      return;
    }
  }

  const saved = state.profiles[token];
  const spawn = findAvailableSpawn(
    saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)
      ? { x: saved.x, y: saved.y }
      : null,
  );
  const color =
    saved?.color ?? PLAYER_COLORS[(Object.keys(state.profiles).length + clients.size) % PLAYER_COLORS.length];

  const client = {
    ws,
    id: nextPlayerId++,
    token,
    name: saved?.name || name,
    color,
    skinId: sanitizeSkinId(message.skinId ?? saved?.skinId),
    x: spawn.x,
    y: spawn.y,
    facing: 1,
    health: Number.isFinite(saved?.health) ? Math.max(1, Math.min(100, saved.health)) : 100,
    inventory: sanitizeInventory(saved?.inventory),
    stones: sanitizeStones(saved?.stones),
    fishingRecords: sanitizeFishingRecords(saved?.fishingRecords),
    feathers: sanitizeFeathers(saved?.feathers),
    observatoryDiscoveries: sanitizeDiscoveries(saved?.observatoryDiscoveries),
    swimSeconds: clampSwimSeconds(saved?.swimSeconds),
    workers: [],
    lastAttackAt: 0,
    lastStateAt: 0,
    lastLeaderboardAt: 0,
    chatLimiter: new ChatLimiter(),
  };

  clients.set(ws, client);
  if (pvp.phase === "active") {
    ensureParticipant(pvp, client);
  }
  state.profiles[token] = {
    ...state.profiles[token],
    name: client.name,
    color: client.color,
    x: client.x,
    y: client.y,
    health: client.health,
    inventory: client.inventory,
    stones: client.stones,
    fishingRecords: client.fishingRecords,
    feathers: client.feathers,
    observatoryDiscoveries: client.observatoryDiscoveries,
    swimSeconds: client.swimSeconds,
    lastSeen: Date.now(),
  };

  if (hostId === null) {
    hostId = client.id;
  }

  console.log(`[LAN] ${client.name} conectado (${clients.size}/${MAX_PLAYERS})`);
  joinGameForClient(client);
  scheduleSave();
}

function handleState(client, message) {
  if (Number.isFinite(message.x) && Number.isFinite(message.y)) {
    client.x = message.x;
    client.y = message.y;
  }
  if (Number.isFinite(message.facing)) {
    client.facing = message.facing >= 0 ? 1 : -1;
  }
  if (Number.isFinite(message.swimSeconds)) {
    client.swimSeconds = clampSwimSeconds(message.swimSeconds);
  }
  if (Array.isArray(message.workers)) {
    client.workers = message.workers
      .filter(
        (worker) =>
          worker &&
          Number.isFinite(worker.x) &&
          Number.isFinite(worker.y) &&
          typeof worker.name === "string",
      )
      .slice(0, 8)
      .map((worker) => ({
        id: String(worker.id ?? "").slice(0, 32),
        name: worker.name.slice(0, 18),
        x: worker.x,
        y: worker.y,
        state: String(worker.state ?? "idle").slice(0, 24),
      }));
  }
  client.lastStateAt = Date.now();
}

function handleInventory(client, message) {
  const inventory = sanitizeInventory(message.inventory);
  if (inventory) {
    client.inventory = inventory;
    state.profiles[client.token] = {
      ...state.profiles[client.token],
      inventory,
      stones: sanitizeStones(message.stones),
      fishingRecords: sanitizeFishingRecords(message.fishingRecords),
      feathers: sanitizeFeathers(message.feathers),
      observatoryDiscoveries: sanitizeDiscoveries(message.observatoryDiscoveries),
      lastSeen: Date.now(),
    };
  }
  if (Array.isArray(message.stones)) {
    client.stones = sanitizeStones(message.stones);
  }
  if (message.fishingRecords && typeof message.fishingRecords === "object") {
    client.fishingRecords = sanitizeFishingRecords(message.fishingRecords);
  }
  if (message.feathers && typeof message.feathers === "object") {
    client.feathers = sanitizeFeathers(message.feathers);
  }
  if (Array.isArray(message.observatoryDiscoveries)) {
    client.observatoryDiscoveries = sanitizeDiscoveries(message.observatoryDiscoveries);
  }
  scheduleSave();
}

function handleChat(client, message) {
  const text = sanitizeChatText(message?.text);

  if (text.length === 0) {
    return;
  }

  if (!client.chatLimiter.allow(Date.now())) {
    send(client.ws, {
      type: "error",
      message: "Espera un poco antes de enviar otro mensaje.",
    });
    return;
  }

  pushChat({
    type: "chat",
    id: client.id,
    name: client.name,
    color: client.color,
    text,
    at: Date.now(),
  });
}

function handleLeaderboardRequest(client) {
  const now = Date.now();

  if (now - client.lastLeaderboardAt < 1500) {
    return;
  }
  client.lastLeaderboardAt = now;
  sendLeaderboard(client);
}

function handleHarvest(client, message) {
  const kind = message.kind;
  if (
    kind !== "tree" &&
    kind !== "mineral" &&
    kind !== "bush" &&
    kind !== "grass"
  ) {
    return;
  }
  if (!Number.isInteger(message.x) || !Number.isInteger(message.y)) {
    return;
  }

  world.harvestNode(kind, message.x, message.y);
  world.markHarvested(kind, message.x, message.y);
  broadcast(
    { type: "harvest", kind, x: message.x, y: message.y, by: client.id },
    { include: (other) => other.id !== client.id },
  );
  scheduleSave();
}

function handleRestore(client, message) {
  if (!Number.isInteger(message.x) || !Number.isInteger(message.y)) {
    return;
  }
  if (!world.isHarvested("mineral", message.x, message.y)) {
    return;
  }

  world.restoreMineral(message.x, message.y);
  broadcast(
    { type: "restore", x: message.x, y: message.y, by: client.id },
    { include: (other) => other.id !== client.id },
  );
  scheduleSave();
}

function handlePlant(client, message) {
  if (
    (message.kind !== "tree" && message.kind !== "grass") ||
    !Number.isInteger(message.x) ||
    !Number.isInteger(message.y) ||
    !message.data ||
    typeof message.data !== "object"
  ) {
    return;
  }

  world.plantNode(message.kind, message.x, message.y, message.data);
  broadcast(
    {
      type: "plant",
      kind: message.kind,
      x: message.x,
      y: message.y,
      data: message.data,
      by: client.id,
    },
    { include: (other) => other.id !== client.id },
  );
  scheduleSave();
}

function handleHeight(client, message) {
  if (
    !Number.isFinite(message.x) ||
    !Number.isFinite(message.y) ||
    !Number.isFinite(message.height)
  ) {
    return;
  }

  const height = world.setHeightAt(message.x, message.y, message.height);
  broadcast(
    { type: "height", x: message.x, y: message.y, height, by: client.id },
    { include: (other) => other.id !== client.id },
  );
  scheduleSave();
}

function handleFarm(client, message) {
  const plot = sanitizeFarmPlot(message.plot);

  if (!plot) {
    return;
  }

  const index = state.farmPlots.findIndex(
    (entry) => entry.x === plot.x && entry.y === plot.y,
  );

  if (index >= 0) {
    state.farmPlots[index] = plot;
  } else if (state.farmPlots.length < 200) {
    state.farmPlots.push(plot);
  }

  broadcast(
    { type: "farm", plot, by: client.id },
    { include: (other) => other.id !== client.id },
  );
  scheduleSave();
}

function handleStructure(client, message) {
  const maps = {
    campfire: "campfires",
    oven: "ovens",
    brewingTable: "brewingTables",
    torch: "torches",
    stonePath: "stonePaths",
  };
  const key = maps[message.itemId];
  if (!key || !Number.isFinite(message.x) || !Number.isFinite(message.y)) {
    return;
  }

  const list = state.structures[key];
  if (
    list.some(
      (entry) =>
        Math.floor(entry.x) === Math.floor(message.x) &&
        Math.floor(entry.y) === Math.floor(message.y),
    )
  ) {
    return;
  }

  const entry = { x: message.x, y: message.y };
  if (message.itemId === "torch" && Number.isFinite(message.z)) {
    entry.z = Math.min(8, Math.max(-70, message.z));
  }
  list.push(entry);
  broadcast(
    {
      type: "structure",
      itemId: message.itemId,
      x: entry.x,
      y: entry.y,
      z: entry.z,
      by: client.id,
    },
    { include: (other) => other.id !== client.id },
  );
  scheduleSave();
}

function handleAttack(client, message = {}) {
  if (!started) {
    return;
  }

  const weapon = ["spear", "sword", "bow"].includes(message.weapon)
    ? message.weapon
    : "fist";
  const cooldown = weapon === "bow" ? 900 : weapon === "sword" ? 450 : 550;

  const now = Date.now();
  if (now - client.lastAttackAt < cooldown) {
    return;
  }
  client.lastAttackAt = now;

  let target = null;
  let bestDistance =
    weapon === "bow" ? 12 : weapon === "spear" ? 2.6 : 2.4;

  for (const other of clients.values()) {
    if (other.id === client.id || other.health <= 0) {
      continue;
    }
    const distance = Math.hypot(other.x - client.x, other.y - client.y);
    if (distance <= bestDistance) {
      bestDistance = distance;
      target = other;
    }
  }

  if (!target) {
    return;
  }

  const damage = weapon === "bow" ? 18 : weapon === "spear" ? 25 : weapon === "sword" ? 22 : 15;
  target.health = Math.max(0, target.health - damage);
  const health = target.health;

  broadcast({
    type: "hit",
    attackerId: client.id,
    targetId: target.id,
    damage,
    health,
  });
  scheduleSave();

  if (health <= 0) {
    const kill = recordKill(pvp, Date.now(), client, target);
    if (kill) {
      broadcast({ type: "kill", ...kill });
    }

    const spawn = findAvailableSpawn(null, target.id);
    target.x = spawn.x;
    target.y = spawn.y;
    target.health = 100;
    target.lastAttackAt = 0;
    broadcast({
      type: "respawn",
      id: target.id,
      x: target.x,
      y: target.y,
      health: target.health,
    });
    scheduleSave();
  }
}

function handleMessage(ws, raw) {
  let message;
  try {
    message = JSON.parse(raw.toString());
  } catch {
    return;
  }
  if (!message || typeof message.type !== "string") {
    return;
  }

  const client = clients.get(ws);

  if (message.type === "join") {
    handleJoin(ws, message);
    return;
  }

  if (!client) {
    return;
  }

  if (message.type === "start") {
    if (client.id !== hostId || started || clients.size === 0) {
      return;
    }
    started = true;
    hostId = client.id;
    pvp.nextAt = Date.now() + pvp.config.intervalMs;
    broadcast({ type: "lobby", hostId, started, players: [] });
    for (const other of clients.values()) {
      sendStart(other);
    }
    scheduleSave();
    return;
  }

  if (message.type === "state") {
    handleState(client, message);
    return;
  }

  if (message.type === "inventory") {
    handleInventory(client, message);
    return;
  }

  if (message.type === "harvest") {
    handleHarvest(client, message);
    return;
  }

  if (message.type === "restore") {
    handleRestore(client, message);
    return;
  }

  if (message.type === "plant") {
    handlePlant(client, message);
    return;
  }

  if (message.type === "farm") {
    handleFarm(client, message);
    return;
  }

  if (message.type === "height") {
    handleHeight(client, message);
    return;
  }

  if (message.type === "structure") {
    handleStructure(client, message);
    return;
  }

  if (message.type === "chat") {
    handleChat(client, message);
    return;
  }

  if (message.type === "leaderboard") {
    handleLeaderboardRequest(client);
    return;
  }

  if (message.type === "attack") {
    handleAttack(client, message);
  }
}

function handleClose(ws) {
  const client = clients.get(ws);
  if (!client) {
    return;
  }

  clients.delete(ws);
  console.log(`[LAN] ${client.name} desconectado`);

  if (client.id === hostId) {
    hostId = clients.values().next().value?.id ?? null;
  }

  state.profiles[client.token] = {
    ...state.profiles[client.token],
    name: client.name,
    color: client.color,
    skinId: client.skinId,
    x: client.x,
    y: client.y,
    health: client.health,
    inventory: client.inventory,
    stones: client.stones,
    fishingRecords: client.fishingRecords,
    feathers: client.feathers,
    observatoryDiscoveries: client.observatoryDiscoveries,
    swimSeconds: client.swimSeconds,
    lastSeen: Date.now(),
  };

  broadcastLobby();
  scheduleSave();
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    let pathname = decodeURIComponent(url.pathname);

    if (pathname === "/") {
      pathname = "/index.html";
    }

    const allowed =
      pathname === "/index.html" ||
      pathname === "/favicon.svg" ||
      pathname.startsWith("/css/") ||
      pathname.startsWith("/characters/") ||
      pathname.startsWith("/js/");

    if (!allowed) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const filePath = resolve(ROOT, `.${pathname}`);
    if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${sep}`)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    const body = await readFile(filePath);
    const type = MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    try {
      handleMessage(ws, raw);
    } catch (error) {
      console.warn("[LAN] Mensaje inválido:", error.message);
    }
  });
  ws.on("close", () => handleClose(ws));
  ws.on("error", () => handleClose(ws));
});

setInterval(() => {
  if (!started || clients.size === 0) {
    return;
  }
  broadcast({
    type: "players",
    players: [...clients.values()].map(publicPlayer),
    hostId,
  });
}, 100);

let lastClockTick = Date.now();

setInterval(() => {
  const now = Date.now();
  const elapsed = Math.max(0, (now - lastClockTick) / 1000);
  lastClockTick = now;

  if (!started || clients.size === 0) {
    return;
  }

  handlePvpTransition(now);
  state.time += elapsed;
  broadcast({
    type: "time",
    time: state.time,
    event: currentEventSnapshot(),
  });
}, 1000);

setInterval(() => {
  for (const client of clients.values()) {
    if (client.health <= 0) {
      continue;
    }
  }
  void saveState();
}, 15000);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[LAN] Servidor listo en el puerto ${PORT}`);
  console.log(`[LAN] PC local: http://localhost:${PORT}`);
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        console.log(`[LAN] Tablet/otros: http://${entry.address}:${PORT}`);
      }
    }
  }
  console.log("[LAN] Los jugadores deben estar en la misma red Wi-Fi.");
});

process.on("SIGINT", async () => {
  await saveState();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await saveState();
  process.exit(0);
});
