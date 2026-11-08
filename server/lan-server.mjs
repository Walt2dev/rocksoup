import { createServer } from "node:http";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve, sep, dirname } from "node:path";
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
import {
  createLeaderboardStore,
  hashToken,
} from "./leaderboardStore.mjs";
import {
  adminAuthorized,
  bearerToken,
  buildAdminSnapshot,
  getAdminToken,
} from "./admin.mjs";
import { createWorldStore, normalizeWorldId } from "./worldStore.mjs";
import { createAmbientSync } from "./ambientSync.mjs";

const ROOT = resolve(process.cwd());
const SAVE_DIR = process.env.SAVE_DIR
  ? resolve(process.env.SAVE_DIR)
  : join(ROOT, "server");
const SAVE_PATH = process.env.SAVE_PATH
  ? resolve(process.env.SAVE_PATH)
  : join(SAVE_DIR, "lan-save.json");
const PORT = Number(process.env.PORT || 3000);
const WORLD_ID = normalizeWorldId(process.env.WORLD_ID);
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

function sanitizeDonkey(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    return null;
  }

  return {
    x: value.x,
    y: value.y,
    skinId: sanitizeSkinId(value.skinId),
    mounted: value.mounted === true,
    tamed: value.tamed === true,
  };
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

function normalizeState(parsed) {
  const state = createInitialState();

  if (!parsed || typeof parsed !== "object") {
    return state;
  }

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
    parsed.profiles && typeof parsed.profiles === "object"
      ? parsed.profiles
      : {};
  state.harvested = Array.isArray(parsed.harvested) ? parsed.harvested : [];
  state.planted = Array.isArray(parsed.planted) ? parsed.planted : [];
  state.farmPlots = sanitizeFarmPlots(parsed.farmPlots);
  state.leaderboard = sanitizeLeaderboard(parsed.leaderboard);

  return state;
}

async function loadState() {
  let parsed = null;

  if (worldStore.configured) {
    parsed = await worldStore.load(WORLD_ID);
  }

  if (!parsed && existsSync(SAVE_PATH)) {
    try {
      parsed = JSON.parse(await readFile(SAVE_PATH, "utf8"));
    } catch (error) {
      console.warn(
        "[LAN] No se pudo leer el guardado; se crea uno nuevo:",
        error.message,
      );
    }
  }

  if (!parsed) {
    return createInitialState();
  }

  return normalizeState(parsed);
}

const worldStore = createWorldStore();
await worldStore.init();
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
const ambientSync = createAmbientSync({ world, seed: state.seed });
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
const leaderboardStore = createLeaderboardStore();
await leaderboardStore.init();

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
    verticalOffset: client.verticalOffset,
    donkey: client.donkey,
    workers: client.workers,
    skinId: client.skinId,
    eventScore: pvp.scores[client.id]?.score ?? 0,
    eventKills: pvp.scores[client.id]?.kills ?? 0,
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

function decorateLeaderboardEntry(entry, client) {
  const fromDb = typeof entry.tokenHash === "string";

  return {
    name: entry.name,
    color: entry.color,
    points: entry.points,
    kills: entry.kills,
    deaths: entry.deaths,
    bestStreak: entry.bestStreak,
    eventsWon: entry.eventsWon,
    bestEventScore: entry.bestEventScore,
    isSelf: client
      ? fromDb
        ? entry.tokenHash === hashToken(client.token)
        : entry.token === client.token
      : false,
  };
}

async function getLeaderboardPayload(client = null) {
  const [dbPoints, dbBest] = await Promise.all([
    leaderboardStore.top("points", 10),
    leaderboardStore.top("best", 10),
  ]);

  if (dbPoints && dbBest) {
    const dbEmpty = dbPoints.length === 0 && dbBest.length === 0;
    const jsonHasEntries = Object.keys(state.leaderboard.entries ?? {}).length > 0;

    if (!(dbEmpty && jsonHasEntries)) {
      return {
        points: dbPoints.map((entry) => decorateLeaderboardEntry(entry, client)),
        best: dbBest.map((entry) => decorateLeaderboardEntry(entry, client)),
      };
    }
  }

  return {
    points: leaderboardTop(state.leaderboard, { sort: "points", limit: 10 }).map(
      (entry) => decorateLeaderboardEntry(entry, client),
    ),
    best: leaderboardTop(state.leaderboard, { sort: "best", limit: 10 }).map(
      (entry) => decorateLeaderboardEntry(entry, client),
    ),
  };
}

async function sendLeaderboard(client) {
  const leaderboard = await getLeaderboardPayload(client);
  send(client.ws, {
    type: "leaderboard",
    entries: leaderboard.points,
    bestEntries: leaderboard.best,
  });
}

async function broadcastLeaderboard() {
  await Promise.allSettled(
    [...clients.values()].map((client) => sendLeaderboard(client)),
  );
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

async function handlePvpTransition(now) {
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
    const winnerToken = transition.winner?.token ?? null;
    mergeEventResults(state.leaderboard, transition.results, {
      now,
      winnerToken,
    });
    await leaderboardStore.merge(transition.results, { winnerToken, now });
    await broadcastLeaderboard();

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

async function sendStart(client) {
  const leaderboard = await getLeaderboardPayload(client);
  send(client.ws, {
    type: "start",
    seed: state.seed,
    world: worldSnapshot(),
    profile: profileFor(client),
    selfId: client.id,
    hostId,
    leaderboard: leaderboard.points,
    leaderboardBest: leaderboard.best,
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

function buildSavePayload() {
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

  return {
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
}

function serializeState(source) {
  return {
    version: 1,
    seed: source.seed,
    worldBiomes: source.worldBiomes,
    time: source.time,
    harvested: source.harvested,
    planted: source.planted,
    farmPlots: source.farmPlots,
    structures: source.structures,
    groundItems: source.groundItems,
    profiles: source.profiles,
    leaderboard: source.leaderboard,
  };
}

async function writeSavePayload(payload) {
  try {
    await mkdir(dirname(SAVE_PATH), { recursive: true });
    const temp = `${SAVE_PATH}.tmp`;
    await writeFile(temp, JSON.stringify(payload), "utf8");
    await rename(temp, SAVE_PATH);
    return true;
  } catch (error) {
    console.warn("[LAN] No se pudo guardar:", error.message);
    return false;
  }
}

async function saveState() {
  const payload = buildSavePayload();
  await worldStore.save(WORLD_ID, payload);
  await writeSavePayload(payload);
}

function joinGameForClient(client) {
  if (started) {
    sendStart(client).catch((error) => {
      console.warn("[LAN] No se pudo enviar el estado inicial:", error.message);
    });
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
    verticalOffset: 0,
    donkey: null,
    workers: [],
    lastAttackAt: 0,
    lastAmbientAttackAt: 0,
    lastStateAt: 0,
    lastLeaderboardAt: 0,
    connectedAt: Date.now(),
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
  if (Number.isFinite(message.verticalOffset)) {
    client.verticalOffset = Math.min(8, Math.max(0, message.verticalOffset));
  }
  client.donkey = sanitizeDonkey(message.donkey);
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
  sendLeaderboard(client).catch((error) => {
    console.warn("[LAN] No se pudo enviar el ranking:", error.message);
  });
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

function handleAmbientHit(client, message) {
  if (!started) {
    return;
  }

  const now = Date.now();
  if (now - client.lastAmbientAttackAt < 120) {
    return;
  }
  client.lastAmbientAttackAt = now;

  const id = Number(message?.id);
  const damage = Number(message?.damage);
  if (!Number.isInteger(id) || !Number.isFinite(damage)) {
    return;
  }

  const position = ambientSync.position(id);
  if (!position) {
    return;
  }

  if (Math.hypot(position.x - client.x, position.y - client.y) > 12) {
    return;
  }

  const result = ambientSync.damage(
    id,
    Math.max(1, Math.min(100, Math.round(damage))),
  );
  if (!result) {
    return;
  }

  broadcast({
    type: "ambientHit",
    id: result.id,
    health: result.health,
    attackerId: client.id,
    killerId: result.killed ? client.id : null,
  });

  if (result.killed) {
    broadcast({
      type: "ambientKilled",
      id: result.id,
      species: result.species,
      x: result.x,
      y: result.y,
      killerId: client.id,
    });
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

  if (message.type === "leave") {
    handleClose(ws);
    ws.close();
    return;
  }

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
      sendStart(other).catch((error) => {
        console.warn("[LAN] No se pudo iniciar a un jugador:", error.message);
      });
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

  if (message.type === "ambientHit") {
    handleAmbientHit(client, message);
  }
}

function handleClose(ws) {
  const client = clients.get(ws);
  if (!client) {
    return;
  }

  clients.delete(ws);
  ambientSync.removeOwner(client.id);
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

function verifyAdminRequest(req) {
  const adminToken = getAdminToken();
  if (!adminToken) {
    return { ok: false, status: 404 };
  }
  if (!adminAuthorized(adminToken, bearerToken(req.headers.authorization))) {
    return { ok: false, status: 401 };
  }
  return { ok: true, status: 200 };
}

function readRequestBody(req, limit = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    let pathname = decodeURIComponent(url.pathname);

    if (pathname === "/") {
      pathname = "/index.html";
    }

    if (pathname === "/admin") {
      pathname = "/admin.html";
    }

    if (pathname === "/api/admin/players") {
      if (req.method !== "GET") {
        res.writeHead(405, { Allow: "GET" });
        res.end();
        return;
      }

      const adminToken = getAdminToken();

      if (!adminToken) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      if (!adminAuthorized(adminToken, bearerToken(req.headers.authorization))) {
        res.writeHead(401, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "WWW-Authenticate": "Bearer",
        });
        res.end(JSON.stringify({ error: "No autorizado" }));
        return;
      }

      const leaderboard = await getLeaderboardPayload(null);
      const snapshot = buildAdminSnapshot({
        clients: [...clients.values()],
        pvp,
        started,
        hostId,
        now: Date.now(),
        leaderboard,
        rankingSource: leaderboardStore.isAvailable() ? "mysql" : "json",
      });

      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(snapshot));
      return;
    }

    if (pathname === "/api/admin/world") {
      const auth = verifyAdminRequest(req);

      if (!auth.ok) {
        if (auth.status === 404) {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Not found");
        } else {
          res.writeHead(401, {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "WWW-Authenticate": "Bearer",
          });
          res.end(JSON.stringify({ error: "No autorizado" }));
        }
        return;
      }

      if (req.method === "GET") {
        const payload = buildSavePayload();
        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": 'attachment; filename="rocksoup-world.json"',
          "Cache-Control": "no-store",
        });
        res.end(JSON.stringify(payload));
        return;
      }

      if (req.method === "POST") {
        try {
          const raw = await readRequestBody(req);
          const parsed = JSON.parse(raw);

          if (
            !parsed ||
            typeof parsed.seed !== "string" ||
            parsed.seed.length === 0
          ) {
            res.writeHead(400, {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "no-store",
            });
            res.end(JSON.stringify({ error: "Mundo inválido: falta seed." }));
            return;
          }

          const imported = normalizeState(parsed);
          const payload = serializeState(imported);
          const persistedToDb = await worldStore.save(WORLD_ID, payload);
          const persistedToFile = await writeSavePayload(payload);

          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          });
          res.end(
            JSON.stringify({
              ok: true,
              restartRequired: true,
              worldId: WORLD_ID,
              persistedToDb,
              persistedToFile,
            }),
          );
        } catch (error) {
          res.writeHead(400, {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          });
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      res.writeHead(405, { Allow: "GET, POST" });
      res.end();
      return;
    }

    const allowed =
      pathname === "/index.html" ||
      pathname === "/admin.html" ||
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
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });
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

const heartbeatTimer = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {
      ws.terminate();
    }
  }
}, 20000);

wss.on("close", () => {
  clearInterval(heartbeatTimer);
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

let lastAmbientTick = Date.now();

setInterval(() => {
  const now = Date.now();
  const elapsed = Math.max(0, Math.min(0.5, (now - lastAmbientTick) / 1000));
  lastAmbientTick = now;

  if (!started || clients.size === 0) {
    ambientSync.clear();
    return;
  }

  ambientSync.tick(
    elapsed,
    [...clients.values()],
    state.time,
    state.structures.campfires,
  );
  broadcast({
    type: "ambient",
    time: ambientSync.time,
    entities: ambientSync.snapshot(),
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

  handlePvpTransition(now).catch((error) => {
    console.warn("[LAN] Error en el evento PvP:", error.message);
  });
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
  console.log(
    `[LAN] Mundo persistente: ${WORLD_ID} · ${
      worldStore.isAvailable() ? "MySQL" : "JSON"
    }`,
  );
});

process.on("SIGINT", async () => {
  await saveState();
  await leaderboardStore.close();
  await worldStore.close();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await saveState();
  await leaderboardStore.close();
  await worldStore.close();
  process.exit(0);
});
