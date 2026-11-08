import { createRng, randomSeed } from "./core/rng.js";
import { Game } from "./game/game.js";
import { createSaveStore } from "./game/save.js";
import {
  loadDonkeySkinId,
  loadLanName,
  loadSkinId,
  loadTouchControls,
  saveDonkeySkinId,
  saveLanName,
  saveSkinId,
  saveTouchControls,
} from "./game/settings.js";
import {
  CHARACTER_DEFS,
  DONKEY_DEFS,
  SPRITE_DEFS,
  TERRAIN_DEFS,
  getDefaultPackAssetEntries,
  getPackReference,
} from "./game/packRegistry.js";
import {
  clearDefaultPack,
  deleteInstalledPack,
  getActivePackId,
  getDefaultPackSummary,
  installPack,
  listInstalledPacks,
  loadActivePack,
  loadDefaultPack,
  setActivePackId,
  uploadDefaultPackFiles,
} from "./game/texturePacks.js";
import { LanClient } from "./net/lanClient.js";
import { SocialUI } from "./net/social.js";
import { HudMenu } from "./ui/hudMenu.js";
import { loadAssets } from "./render/assets.js";

const byId = (id) => document.getElementById(id);

const screens = {
  loading: byId("screen-loading"),
  menu: byId("screen-menu"),
  character: byId("screen-character"),
  dev: byId("screen-dev"),
  lan: byId("screen-lan"),
  game: byId("screen-game"),
  exit: byId("screen-exit"),
};

const ui = {
  progressTrack: byId("progress-track"),
  progressFill: byId("progress-fill"),
  loadStatus: byId("load-status"),
  loadPercent: byId("load-percent"),
  seedInput: byId("menu-seed"),
  menuError: byId("menu-error"),
  saveInfo: byId("save-info"),
  btnNew: byId("btn-new"),
  btnContinue: byId("btn-continue"),
  btnLan: byId("btn-lan"),
  btnPersonalization: byId("btn-personalization"),
  btnLanBack: byId("btn-lan-back"),
  lanSkin: byId("lan-skin"),
  lanConnectCard: byId("lan-connect-card"),
  lanLobbyCard: byId("lan-lobby-card"),
  lanName: byId("lan-name"),
  lanTouch: byId("lan-touch"),
  lanStatus: byId("lan-status"),
  lanConnection: byId("lan-connection"),
  lanPlayers: byId("lan-players"),
  lanLobbyStatus: byId("lan-lobby-status"),
  btnLanConnect: byId("btn-lan-connect"),
  btnLanLeave: byId("btn-lan-leave"),
  btnLanStart: byId("btn-lan-start"),
  characterGrid: byId("character-grid"),
  btnCharacterBack: byId("btn-character-back"),
  btnCharacterConfirm: byId("btn-character-confirm"),
  devStatus: byId("dev-status"),
  devPackFile: byId("dev-pack-file"),
  devPackSelect: byId("dev-pack-select"),
  devPackActivate: byId("dev-pack-activate"),
  devPackDelete: byId("dev-pack-delete"),
  devPackTemplate: byId("dev-pack-template"),
  devReference: byId("dev-reference"),
  devSkins: byId("dev-skins"),
  devDonkeys: byId("dev-donkeys"),
  devDefaultFiles: byId("dev-default-files"),
  devDefaultApply: byId("dev-default-apply"),
  devDefaultClear: byId("dev-default-clear"),
  devDefaultStatus: byId("dev-default-status"),
  devDefaultList: byId("dev-default-list"),
  btnDevBack: byId("btn-dev-back"),
  btnExit: byId("btn-exit"),
  btnExitBack: byId("btn-exit-back"),
  btnMenu: byId("btn-menu"),
  canvas: byId("view"),
  hud: {
    seed: byId("hud-seed"),
    biome: byId("hud-biome"),
    coords: byId("hud-coords"),
    chunks: byId("hud-chunks"),
    fps: byId("hud-fps"),
    fauna: byId("hud-fauna"),
    cycle: byId("hud-cycle"),
    cyclePhase: byId("hud-cycle-phase"),
    moon: byId("hud-moon"),
    statsPanel: byId("stats-panel"),
    statsDetails: byId("stats-details"),
    btnStatsToggle: byId("btn-stats-toggle"),
    cycleIndicator: byId("hud-cycle-indicator"),
    cycleBanner: byId("cycle-banner"),
    cycleBannerText: byId("cycle-banner-text"),
    energyFill: byId("hud-energy-fill"),
    energy: byId("hud-energy"),
    energyLabel: byId("hud-energy-label"),
    healthFill: byId("hud-health-fill"),
    health: byId("hud-health"),
    inventory: byId("hud-inventory"),
    hotbarInfo: byId("hotbar-info"),
    toast: byId("toast"),
    tooltip: byId("item-tooltip"),
    fishingPanel: byId("fishing-panel"),
    fishingTitle: byId("fishing-title"),
    fishingBar: byId("fishing-bar"),
    fishingMarker: byId("fishing-marker"),
    fishingHint: byId("fishing-hint"),
    craftPanel: byId("craft-panel"),
    recipeList: byId("recipe-list"),
    craftTabs: byId("craft-tabs"),
    craftSearch: byId("craft-search"),
    craftSearchWrap: byId("craft-search-wrap"),
    btnCraft: byId("btn-craft"),
    btnRecipes: byId("btn-recipes"),
    btnGameMode: byId("btn-game-mode"),
    gameModeLabel: byId("game-mode-label"),
    btnFief: byId("btn-fief"),
    waveTimer: byId("wave-timer"),
    fiefPanel: byId("fief-panel"),
    fiefModes: byId("fief-modes"),
    fiefWave: byId("fief-wave"),
    fiefVillages: byId("fief-villages"),
    fiefContent: byId("fief-content"),
    fiefStatus: byId("fief-status"),
    btnFiefClose: byId("btn-fief-close"),
    btnRotateLeft: byId("btn-rotate-left"),
    btnRotateRight: byId("btn-rotate-right"),
    recipeBookPanel: byId("recipe-book-panel"),
    btnRecipeBookClose: byId("btn-recipe-book-close"),
    recipeBookSearch: byId("recipe-book-search"),
    recipeBookList: byId("recipe-book-list"),
    btnCraftClose: byId("btn-craft-close"),
    btnPlaceFire: byId("btn-place-fire"),
    btnCoffee: byId("btn-coffee"),
    btnAttack: byId("btn-attack"),
    btnPlaceSelected: byId("btn-place-selected"),
    buff: byId("hud-buff"),
    buffLabel: byId("hud-buff-label"),
    effects: byId("hud-effects"),
    craftEyebrow: byId("craft-eyebrow"),
    craftTitle: byId("craft-title"),
    craftIntro: byId("craft-intro"),
    craftLevel: byId("craft-level"),
    craftXpLabel: byId("craft-xp-label"),
    craftXpFill: byId("craft-xp-fill"),
    btnQuest: byId("btn-quest"),
    questBadge: byId("quest-badge"),
    questPanel: byId("quest-panel"),
    questList: byId("quest-list"),
    btnQuestClose: byId("btn-quest-close"),
    stationExtra: byId("station-extra"),
    chestPanel: byId("chest-panel"),
    universityPanel: byId("university-panel"),
    universityTabs: byId("university-tabs"),
    universityBody: byId("university-body"),
    btnUniversityClose: byId("btn-university-close"),
    observatoryPanel: byId("observatory-panel"),
    btnObservatoryClose: byId("btn-observatory-close"),
    villagePanel: byId("village-panel"),
    villageTitle: byId("village-title"),
    villageShaman: byId("village-shaman"),
    villageRequest: byId("village-request"),
    villageStatus: byId("village-status"),
    villageReward: byId("village-reward"),
    btnVillagePrepare: byId("btn-village-prepare"),
    btnVillageDeliver: byId("btn-village-deliver"),
    btnVillageMarket: byId("btn-village-market"),
    btnVillageClose: byId("btn-village-close"),
    tradePanel: byId("trade-panel"),
    tradeVillages: byId("trade-villages"),
    tradeOrigin: byId("trade-origin"),
    tradeDestination: byId("trade-destination"),
    tradeGoods: byId("trade-goods"),
    tradeStatus: byId("trade-status"),
    tradeRoutes: byId("trade-routes"),
    btnTradeCreate: byId("btn-trade-create"),
    btnTradeClose: byId("btn-trade-close"),
    skyCanvas: byId("sky-canvas"),
    skySearch: byId("sky-search"),
    skyList: byId("sky-list"),
    skyMoon: byId("sky-moon"),
    skyStatus: byId("sky-status"),
    skyMission: byId("sky-mission"),
    skyNotes: byId("sky-notes"),
    btnSkyAlign: byId("btn-sky-align"),
    btnSkyObserve: byId("btn-sky-observe"),
    skyLens: byId("sky-lens"),
    skyDiary: byId("sky-diary"),
    skyInfo: byId("sky-info"),
    chestBackpack: byId("chest-backpack"),
    chestStorage: byId("chest-storage"),
    chestBackpackCap: byId("chest-backpack-cap"),
    chestStorageCap: byId("chest-storage-cap"),
    btnChestClose: byId("btn-chest-close"),
    workerPanel: byId("worker-panel"),
    workerName: byId("worker-name"),
    workerStatus: byId("worker-status"),
    btnWorkerAuto: byId("btn-worker-auto"),
    btnWorkerRestore: byId("btn-worker-restore"),
    btnWorkerCancel: byId("btn-worker-cancel"),
    btnWorkerDeselect: byId("btn-worker-deselect"),
    btnIdleWorker: byId("btn-idle-worker"),
    btnChat: byId("btn-chat"),
    chatBadge: byId("chat-badge"),
    btnRanking: byId("btn-ranking"),
    btnPlayers: byId("btn-players"),
    chatPanel: byId("chat-panel"),
    chatLog: byId("chat-log"),
    chatForm: byId("chat-form"),
    chatInput: byId("chat-input"),
    chatSend: byId("chat-send"),
    btnChatClose: byId("btn-chat-close"),
    rankingPanel: byId("ranking-panel"),
    rankingList: byId("ranking-list"),
    rankingNext: byId("ranking-next"),
    rankingTabs: byId("ranking-tabs"),
    btnRankingClose: byId("btn-ranking-close"),
    playersPanel: byId("players-panel"),
    playersList: byId("players-list"),
    btnPlayersClose: byId("btn-players-close"),
    pvpBanner: byId("pvp-banner"),
    pvpBannerTitle: byId("pvp-banner-title"),
    pvpBannerTimer: byId("pvp-banner-timer"),
    pvpBannerLeader: byId("pvp-banner-leader"),
    btnHudMenu: byId("btn-hud-menu"),
    hudMenu: byId("hud-menu"),
    btnHudMenuClose: byId("btn-hud-menu-close"),
    hudMenuHelp: byId("hud-menu-help"),
    btnContextAction: byId("btn-context-action"),
    contextActionLabel: byId("context-action-label"),
    contextActionIcon: byId("context-action-icon-use"),
    btnCrossCenter: byId("btn-cross-center"),
    btnCrossWorkers: byId("btn-cross-workers"),
    btnCrossWorkersBadge: byId("cross-workers-badge"),
    btnCrossJump: byId("btn-cross-jump"),
    btnCrossQuest: byId("btn-cross-quest"),
    btnHotbarToggle: byId("btn-hotbar-toggle"),
    btnStatsClose: byId("btn-stats-close"),
    playerPanel: byId("player-panel"),
    fiefMultiSelect: byId("fief-multi-select"),
    workerMultiSelect: byId("worker-multi-select"),
    selectionBox: byId("selection-box"),
    inventoryPanel: byId("inventory-panel"),
    inventoryGrid: byId("inventory-grid"),
    inventoryHotbar: byId("inventory-hotbar"),
    inventoryCapacity: byId("inventory-capacity"),
    btnInventoryClose: byId("btn-inventory-close"),
  },
};

let assets = null;
let game = null;
let hudMenu = null;
let exitTimer = null;
let saveStore;
let lanClient = null;
let lanPlaying = false;
let pendingNewSeed = null;
let selectedSkin = "explorer";

const social = new SocialUI({
  hud: ui.hud,
  notify: (message) => game?.notify(message),
});
social.attach();

try {
  saveStore = createSaveStore(window.localStorage);
} catch {
  saveStore = createSaveStore(null);
}

function showScreen(name) {
  for (const [screenName, element] of Object.entries(screens)) {
    element.classList.toggle("is-active", screenName === name);
    element.setAttribute("aria-hidden", screenName === name ? "false" : "true");
  }
  document.body.dataset.screen = name;
}

function setLoading(progress, label) {
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  ui.progressFill.style.width = `${percent}%`;
  ui.progressTrack.setAttribute("aria-valuenow", String(percent));
  ui.loadPercent.textContent = `${percent}%`;

  if (label) {
    ui.loadStatus.textContent = label;
  }
}

function updateUrlSeed(seed) {
  const url = new URL(window.location.href);
  url.searchParams.set("seed", seed);
  window.history.replaceState(null, "", url);
}

function readUrlSeed() {
  const raw = new URLSearchParams(window.location.search).get("seed");
  if (!raw) {
    return "";
  }

  try {
    return createRng(raw).seed;
  } catch {
    return "";
  }
}

function refreshSaveInfo() {
  const save = saveStore.read();

  ui.btnContinue.disabled = !save;
  ui.saveInfo.classList.toggle("is-empty", !save);

  if (!save) {
    ui.saveInfo.textContent = "No hay partidas individuales guardadas.";
    return;
  }

  const date = new Intl.DateTimeFormat("es", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(save.savedAt));

  ui.saveInfo.textContent = `Partida individual · ${save.seed} · ${date}`;
}

function attachHudMenu() {
  hudMenu?.destroy();
  hudMenu = null;

  if (!game) {
    return;
  }

  hudMenu = new HudMenu({ game, hud: ui.hud });
  game.hudMenu = hudMenu;
  hudMenu.attach();
}

function beginGame(seed, saveState, characterSkin = null) {
  ui.menuError.textContent = "";
  social.setEnabled(false);
  social.setClient(null);

  try {
    updateUrlSeed(seed);

    if (game) {
      game.stop();
      game = null;
    }

    showScreen("game");
    game = new Game({
      canvas: ui.canvas,
      assets,
      saveStore,
      seed,
      saveState,
      characterSkin,
      hud: ui.hud,
      onMenuRequested: returnToMenu,
    });
    game.start();
    attachHudMenu();

    if (new URLSearchParams(window.location.search).has("debug")) {
      window.__rocksoup = game;
    }
  } catch (error) {
    console.error(error);
    game?.stop();
    game = null;
    ui.menuError.textContent = "No se pudo iniciar la partida. Inténtalo de nuevo.";
    refreshSaveInfo();
    showScreen("menu");
  }
}

function getSkinEntries() {
  return Object.values(assets?.playerSkins ?? {});
}

function drawSkinPreview(canvas, skin) {
  const frame = skin?.frames?.[0];
  canvas.width = 184;
  canvas.height = 264;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!frame?.canvas) {
    return;
  }

  const scale = Math.min(
    canvas.width / frame.canvas.width,
    canvas.height / frame.canvas.height,
  );
  const width = frame.canvas.width * scale;
  const height = frame.canvas.height * scale;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(
    frame.canvas,
    (canvas.width - width) / 2,
    (canvas.height - height) / 2,
    width,
    height,
  );
}

function renderSkinGrid(container, current, onSelect) {
  const skins = getSkinEntries();
  container.replaceChildren(
    ...skins.map((skin) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "character-choice";
      button.classList.toggle("is-selected", skin.id === current);
      button.setAttribute("aria-pressed", skin.id === current ? "true" : "false");

      const canvas = document.createElement("canvas");
      const name = document.createElement("strong");
      const description = document.createElement("small");
      drawSkinPreview(canvas, skin);
      name.textContent = skin.name ?? skin.id;
      description.textContent = skin.custom
        ? `Pack · ${skin.description ?? "Skin personalizada"}`
        : skin.description ?? "Aventurero";

      button.append(canvas, name, description);
      button.addEventListener("click", () => onSelect(skin.id));
      return button;
    }),
  );
}

function renderDonkeySkinGrid(container, current, onSelect) {
  const skins = Object.values(assets?.donkeySkins ?? {});
  container.replaceChildren(
    ...skins.map((skin) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "character-choice";
      button.classList.toggle("is-selected", skin.id === current);
      button.setAttribute("aria-pressed", skin.id === current ? "true" : "false");

      const canvas = document.createElement("canvas");
      const name = document.createElement("strong");
      const description = document.createElement("small");
      drawSkinPreview(canvas, skin);
      name.textContent = skin.name ?? skin.id;
      description.textContent = skin.custom
        ? `Pack · ${skin.description ?? "Burro personalizado"}`
        : skin.description ?? "Burro de carga";

      button.append(canvas, name, description);
      button.addEventListener("click", () => onSelect(skin.id));
      return button;
    }),
  );
}

function refreshDonkeySkins() {
  let selected = loadDonkeySkinId();
  if (!assets?.donkeySkins?.[selected]) {
    selected = Object.keys(assets?.donkeySkins ?? {})[0] ?? "gris";
  }

  const select = (skinId) => {
    selected = skinId;
    saveDonkeySkinId(skinId);
    renderDonkeySkinGrid(ui.devDonkeys, selected, select);
  };

  renderDonkeySkinGrid(ui.devDonkeys, selected, select);
}

function openCharacterSelect(seed) {
  pendingNewSeed = seed;
  const saved = loadSkinId();
  selectedSkin = assets?.playerSkins?.[saved] ? saved : "explorer";

  const select = (skinId) => {
    selectedSkin = skinId;
    renderSkinGrid(ui.characterGrid, selectedSkin, select);
  };

  renderSkinGrid(ui.characterGrid, selectedSkin, select);
  showScreen("character");
}

function startNewGame() {
  const rawSeed = ui.seedInput.value.trim();
  let seed;

  try {
    seed = rawSeed ? createRng(rawSeed).seed : randomSeed();
  } catch (error) {
    ui.menuError.textContent = error.message;
    return;
  }

  openCharacterSelect(seed);
}

function continueGame() {
  const save = saveStore.read();

  if (!save) {
    refreshSaveInfo();
    return;
  }

  beginGame(save.seed, save);
}

function setLanStatus(message, isError = false) {
  ui.lanStatus.textContent = message;
  ui.lanStatus.classList.toggle("lan-status-error", isError);
}

function resetLanUi({ clearStatus = true } = {}) {
  ui.lanConnectCard.hidden = false;
  ui.lanLobbyCard.hidden = true;
  ui.btnLanStart.hidden = true;
  ui.lanPlayers.replaceChildren();
  ui.lanLobbyStatus.textContent = "El host inicia la partida cuando todos estén conectados.";

  if (clearStatus) {
    setLanStatus(
      "Enciende el servidor en el PC con npm run lan y abre esta página desde la tablet usando la IP LAN del PC.",
    );
  }
}

function populateSkinSelect(select, value) {
  const skins = getSkinEntries();
  const selected = skins.some((skin) => skin.id === value) ? value : "explorer";
  select.replaceChildren(
    ...skins.map((skin) => {
      const option = document.createElement("option");
      option.value = skin.id;
      option.textContent = skin.custom ? `${skin.name} (pack)` : skin.name;
      return option;
    }),
  );
  select.value = selected;
}

function openLanScreen() {
  resetLanUi();
  ui.lanName.value = loadLanName();
  ui.lanTouch.checked = loadTouchControls();
  populateSkinSelect(ui.lanSkin, loadSkinId());
  showScreen("lan");
}

function closeLanConnection() {
  social.setEnabled(false);
  social.setClient(null);
  if (lanClient) {
    lanClient.close();
    lanClient = null;
  }
  lanPlaying = false;
}

function updateLanLobby(message) {
  ui.lanConnectCard.hidden = true;
  ui.lanLobbyCard.hidden = false;

  const players = Array.isArray(message.players) ? message.players : [];
  const isHost = lanClient?.selfId !== null && lanClient?.selfId === message.hostId;

  ui.lanConnection.textContent = `Conectado · ${players.length} jugador${
    players.length === 1 ? "" : "es"
  }`;
  ui.lanPlayers.replaceChildren(
    ...players.map((player) => {
      const item = document.createElement("li");
      const dot = document.createElement("span");
      const name = document.createElement("span");
      dot.className = "lan-player-color";
      dot.style.background = player.color ?? "#e0a458";
      name.textContent =
        player.id === lanClient?.selfId ? `${player.name} (tú)` : player.name;
      item.append(dot, name);

      if (player.id === message.hostId) {
        const badge = document.createElement("span");
        badge.className = "lan-player-host";
        badge.textContent = "host";
        item.append(badge);
      }

      return item;
    }),
  );

  ui.btnLanStart.hidden = !isHost;
  ui.lanLobbyStatus.textContent = isHost
    ? "Eres el host. Inicia el mundo cuando tu hermano haya entrado."
    : "Esperando a que el host inicie la partida...";
}

function startLanGame(message) {
  if (!message?.seed || !lanClient) {
    return;
  }

  lanPlaying = true;
  saveTouchControls(ui.lanTouch.checked);

  const profile = message.profile ?? {};
  const world = message.world ?? {};
  const saveState = {
    worldBiomes: world.worldBiomes === "expanded" ? "expanded" : "legacy",
    characterSkin: profile.skinId ?? ui.lanSkin.value,
    time: Number.isFinite(world.time) ? world.time : 0,
    player: {
      x: Number.isFinite(profile.x) ? profile.x : 0.5,
      y: Number.isFinite(profile.y) ? profile.y : 0.5,
      energy: 100,
      health: Number.isFinite(profile.health) ? profile.health : 100,
      buffSeconds: 0,
      swimSeconds: Number.isFinite(profile.swimSeconds) ? profile.swimSeconds : 0,
    },
    inventory: profile.inventory ?? undefined,
    stones: Array.isArray(profile.stones) ? profile.stones : [],
    fishingRecords:
      profile.fishingRecords && typeof profile.fishingRecords === "object"
        ? profile.fishingRecords
        : {},
    feathers:
      profile.feathers && typeof profile.feathers === "object"
        ? profile.feathers
        : {},
    observatoryDiscoveries: Array.isArray(profile.observatoryDiscoveries)
      ? profile.observatoryDiscoveries
      : [],
    harvestedNodes: Array.isArray(world.harvested) ? world.harvested : [],
    plantedNodes: Array.isArray(world.planted) ? world.planted : [],
    heightEdits: Array.isArray(world.heightEdits) ? world.heightEdits : [],
    farmPlots: Array.isArray(world.farmPlots) ? world.farmPlots : [],
    campfires: Array.isArray(world.structures?.campfires) ? world.structures.campfires : [],
    ovens: Array.isArray(world.structures?.ovens) ? world.structures.ovens : [],
    brewingTables: Array.isArray(world.structures?.brewingTables)
      ? world.structures.brewingTables
      : [],
    torches: Array.isArray(world.structures?.torches)
      ? world.structures.torches
      : [],
    stonePaths: Array.isArray(world.structures?.stonePaths)
      ? world.structures.stonePaths
      : [],
    groundItems: [],
    workers: [],
  };

  if (game) {
    game.stop();
    game = null;
  }

  showScreen("game");

  try {
    game = new Game({
      canvas: ui.canvas,
      assets,
      saveStore,
      seed: message.seed,
      saveState,
      hud: ui.hud,
      onMenuRequested: returnToMenu,
      network: lanClient,
      networkSelfId: message.selfId ?? lanClient.selfId,
    });
    game.start();
    attachHudMenu();

    social.setClient(lanClient);
    social.setEnabled(true);
    social.setChatHistory(message.chat);
    social.setLeaderboard(message.leaderboard, message.leaderboardBest);
    social.setEvent(message.event);
    hudMenu?.refresh();

    if (new URLSearchParams(window.location.search).has("debug")) {
      window.__rocksoup = game;
    }
  } catch (error) {
    console.error(error);
    game?.stop();
    game = null;
    lanPlaying = false;
    resetLanUi();
    setLanStatus("No se pudo iniciar la partida LAN.", true);
    showScreen("lan");
  }
}

function connectLan() {
  const name = ui.lanName.value.trim() || "Jugador";
  const skinId = ui.lanSkin.value || "explorer";
  ui.lanName.value = name;

  saveLanName(name);
  saveSkinId(skinId);
  saveTouchControls(ui.lanTouch.checked);

  if (lanClient) {
    lanClient.close();
    lanClient = null;
  }

  setLanStatus("Conectando al servidor LAN...");
  ui.lanConnectCard.hidden = false;
  ui.lanLobbyCard.hidden = true;

  lanClient = new LanClient({
    onWelcome: () => {
      ui.lanConnectCard.hidden = true;
      ui.lanLobbyCard.hidden = false;
      ui.lanLobbyStatus.textContent = "Conectado. Esperando lista de jugadores...";
    },
    onLobby: (message) => updateLanLobby(message),
    onStart: (message) => startLanGame(message),
    onPlayers: (message) => {
      game?.handleNetworkPlayers(message);
      social.setPlayers(message.players, lanClient?.selfId);
    },
    onTime: (message) => {
      game?.handleNetworkTime(message);
      social.setEvent(message.event);
    },
    onHarvest: (message) => game?.applyNetworkHarvest(message),
    onRestore: (message) => game?.applyNetworkRestore(message),
    onPlant: (message) => game?.applyNetworkPlant(message),
    onFarm: (message) => game?.applyNetworkFarm(message),
    onHeight: (message) => game?.applyNetworkHeight(message),
    onStructure: (message) => game?.applyNetworkStructure(message),
    onHit: (message) => game?.handleNetworkHit(message),
    onRespawn: (message) => game?.handleNetworkRespawn(message),
    onChat: (message) => social.pushChat(message),
    onLeaderboard: (message) =>
      social.setLeaderboard(message.entries, message.bestEntries),
    onEvent: (event) => social.setEvent(event),
    onKill: (message) => social.pushKill(message),
    onError: (message) => {
      if (lanPlaying && game) {
        game.notify(message);
      } else {
        setLanStatus(message, true);
      }
    },
    onClose: (info) => {
      lanClient = null;
      const wasPlaying = lanPlaying;
      lanPlaying = false;
      social.setEnabled(false);
      social.setClient(null);

      if (game) {
        game.stop();
        game = null;
      }

      resetLanUi({ clearStatus: false });
      const suffix = info?.code
        ? ` (código ${info.code}${info.reason ? `: ${info.reason}` : ""})`
        : "";
      setLanStatus(
        wasPlaying
          ? `Se perdió la conexión con el mundo LAN.${suffix}`
          : `No se pudo conectar a ${info?.url ?? "el servidor"}.${suffix}`,
        true,
      );
      console.warn("[LAN] WebSocket cerrado:", info);
      showScreen("lan");
    },
  });

  lanClient.connect(name, skinId);
}

function refreshDevReference() {
  const rows = getPackReference(assets);
  ui.devReference.replaceChildren(
    ...rows.map((row) => {
      const item = document.createElement("div");
      const file = document.createElement("strong");
      const resolution = document.createElement("span");
      const frames = document.createElement("span");
      item.className = "dev-ref-row";
      file.textContent = row.file;
      resolution.textContent = row.resolution;
      frames.textContent = `${row.frames} frame${row.frames === 1 ? "" : "s"}`;
      item.append(file, resolution, frames);
      return item;
    }),
  );
}

function refreshDevSkins() {
  renderSkinGrid(ui.devSkins, null, () => {});
}

function spriteTemplateFiles(def) {
  if (def.frames === 1) {
    return def.file;
  }

  const stem = def.file.replace(/\.png$/i, "");
  return Array.from({ length: def.frames }, (_, index) => `${stem}_${index}.png`);
}

function downloadPackTemplate() {
  const buildings = {};
  const objects = {};

  for (const def of SPRITE_DEFS) {
    const target = def.file.startsWith("buildings/") ? buildings : objects;
    target[def.id] = spriteTemplateFiles(def);
  }

  const characters = {};
  for (const def of CHARACTER_DEFS) {
    characters[def.id] = {
      name: def.label,
      frames: [...def.files],
    };
  }

  const donkeys = {};
  for (const def of DONKEY_DEFS) {
    donkeys[def.id] = {
      name: def.label,
      frames: [...def.files],
    };
  }

  const template = {
    name: "Mi pack de texturas",
    version: 1,
    author: "Tu nombre",
    pixelArt: false,
    terrain: Object.fromEntries(
      TERRAIN_DEFS.map((def) => [def.id, def.file]),
    ),
    buildings,
    objects,
    characters,
    donkeys,
  };
  const blob = new Blob([JSON.stringify(template, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "pack.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function refreshDevPacks() {
  const packs = await listInstalledPacks();
  const activeId = getActivePackId();
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Sin pack (procedural)";
  ui.devPackSelect.replaceChildren(
    empty,
    ...packs.map((pack) => {
      const option = document.createElement("option");
      option.value = pack.id;
      option.textContent = `${pack.name} · ${pack.author}`;
      return option;
    }),
  );
  ui.devPackSelect.value = packs.some((pack) => pack.id === activeId) ? activeId : "";
  ui.devPackActivate.disabled = false;
  ui.devPackDelete.disabled = packs.length === 0;

  const active = packs.find((pack) => pack.id === activeId);
  if (!ui.devStatus.textContent) {
    ui.devStatus.textContent = active
      ? `Pack activo: ${active.name}. Recarga para volver a aplicarlo.`
      : "No hay ningún pack activo. Se usan los gráficos procedurales.";
  }
}

async function refreshDefaultPack() {
  const summary = await getDefaultPackSummary();
  const count = summary.fileNames.length;
  ui.devDefaultStatus.textContent =
    count > 0
      ? `${count} PNG en el pack por defecto. Pulsa Aplicar y recargar para verlos.`
      : "Todavía no hay PNG personalizados en el pack por defecto.";
  ui.devDefaultClear.disabled = count === 0;
  ui.devDefaultList.replaceChildren(
    ...summary.fileNames.map((name) => {
      const chip = document.createElement("span");
      chip.className = "dev-default-file";
      chip.textContent = name;
      return chip;
    }),
  );
  return summary;
}

function defaultPackFileMaps() {
  const byPath = new Map();
  const byName = new Map();

  for (const entry of getDefaultPackAssetEntries()) {
    byPath.set(entry.path, entry.path);
    const base = entry.path.split("/").pop();
    if (!byName.has(base)) {
      byName.set(base, entry.path);
    }
  }

  for (let index = 0; index < 3; index += 1) {
    byName.set(`mago_${index}.png`, `characters/mage_${index}.png`);
    byPath.set(
      `characters/mago_${index}.png`,
      `characters/mage_${index}.png`,
    );
  }

  return { byPath, byName };
}

async function uploadDefaultPngs(fileList) {
  const files = Array.from(fileList ?? []);
  if (files.length === 0) {
    return;
  }

  const { byPath, byName } = defaultPackFileMaps();
  const pairs = [];
  const unknown = [];

  for (const file of files) {
    const relative = String(file.webkitRelativePath || file.name).replace(
      /\\/g,
      "/",
    );
    const base = relative.split("/").pop();
    const path = byPath.get(relative) ?? byName.get(base);

    if (!path) {
      unknown.push(file.name);
      continue;
    }
    pairs.push({ path, file });
  }

  ui.devDefaultFiles.value = "";
  ui.devDefaultStatus.classList.remove("lan-status-error");

  if (pairs.length === 0) {
    ui.devDefaultStatus.classList.add("lan-status-error");
    ui.devDefaultStatus.textContent = `No se reconoció ningún PNG. Revisa los nombres: ${unknown.join(", ")}`;
    return;
  }

  try {
    ui.devDefaultStatus.textContent = "Guardando PNGs...";
    const result = await uploadDefaultPackFiles(pairs);
    const message = unknown.length
      ? `${pairs.length} PNG guardados. No reconocidos: ${unknown.join(", ")}`
      : `${pairs.length} PNG guardados en el pack por defecto (${result.fileNames.length} en total). Pulsa Aplicar y recargar.`;
    await refreshDefaultPack();
    ui.devDefaultStatus.textContent = message;
  } catch (error) {
    ui.devDefaultStatus.classList.add("lan-status-error");
    ui.devDefaultStatus.textContent = error.message;
  }
}

async function clearDefaultPackFiles() {
  if (!window.confirm("¿Vaciar todos los PNG del pack por defecto?")) {
    return;
  }

  try {
    await clearDefaultPack();
    ui.devDefaultStatus.textContent =
      "Pack por defecto vaciado. Recarga para volver a los gráficos base.";
    await refreshDefaultPack();
  } catch (error) {
    ui.devDefaultStatus.classList.add("lan-status-error");
    ui.devDefaultStatus.textContent = error.message;
  }
}

function applyDefaultPackFiles() {
  window.location.reload();
}

function openDevScreen() {
  ui.devStatus.textContent = "";
  refreshDevReference();
  refreshDevSkins();
  refreshDonkeySkins();
  refreshDefaultPack();
  refreshDevPacks();
  showScreen("dev");
}

async function installDevPack(file) {
  if (!file) {
    return;
  }

  ui.devStatus.textContent = "Validando pack...";
  ui.devStatus.classList.remove("lan-status-error");

  try {
    const result = await installPack(file);
    ui.devStatus.textContent = `Pack "${result.name}" instalado. Actívalo para jugar con él.`;
    ui.devPackFile.value = "";
    await refreshDevPacks();
  } catch (error) {
    ui.devStatus.textContent = error.message;
    ui.devStatus.classList.add("lan-status-error");
  }
}

function activateDevPack() {
  const id = ui.devPackSelect.value;
  setActivePackId(id || null);
  window.location.reload();
}

async function removeDevPack() {
  const id = ui.devPackSelect.value;
  if (!id) {
    return;
  }

  if (!window.confirm("¿Eliminar este pack de este navegador?")) {
    return;
  }

  try {
    await deleteInstalledPack(id);
    ui.devStatus.textContent = "Pack eliminado.";
    await refreshDevPacks();
  } catch (error) {
    ui.devStatus.textContent = error.message;
    ui.devStatus.classList.add("lan-status-error");
  }
}

function returnToMenu() {
  if (game) {
    game.stop();
    game = null;
  }

  closeLanConnection();
  window.__rocksoup = null;
  refreshSaveInfo();
  showScreen("menu");
}

function exitGame() {
  if (game) {
    game.stop();
    game = null;
  }

  closeLanConnection();
  window.__rocksoup = null;
  showScreen("exit");
  window.clearTimeout(exitTimer);
  exitTimer = window.setTimeout(() => {
    exitTimer = null;
    window.close();
  }, 700);
}

async function boot() {
  const urlSeed = readUrlSeed();
  if (urlSeed) {
    ui.seedInput.value = urlSeed;
  }

  showScreen("loading");
  setLoading(0, "Encendiendo la fogata...");

  try {
    assets = await loadAssets(setLoading);
    await loadDefaultPack(assets);
    await loadActivePack(assets);
    await new Promise((resolve) => window.setTimeout(resolve, 140));
    refreshSaveInfo();
    showScreen("menu");
  } catch (error) {
    console.error(error);
    ui.loadStatus.textContent = "No se pudo preparar el mundo. Recarga la página.";
    ui.progressFill.style.background = "var(--danger)";
  }
}

ui.btnNew.addEventListener("click", startNewGame);
ui.btnCharacterBack.addEventListener("click", () => {
  pendingNewSeed = null;
  showScreen("menu");
});
ui.btnCharacterConfirm.addEventListener("click", () => {
  if (!pendingNewSeed || !assets?.playerSkins?.[selectedSkin]) {
    return;
  }
  const seed = pendingNewSeed;
  pendingNewSeed = null;
  saveSkinId(selectedSkin);
  beginGame(seed, null, selectedSkin);
});
ui.btnPersonalization.addEventListener("click", openDevScreen);
ui.btnDevBack.addEventListener("click", () => {
  refreshSaveInfo();
  showScreen("menu");
});
ui.devPackFile.addEventListener("change", () => {
  installDevPack(ui.devPackFile.files?.[0]);
});
ui.devPackActivate.addEventListener("click", activateDevPack);
ui.devPackDelete.addEventListener("click", removeDevPack);
ui.devPackTemplate.addEventListener("click", downloadPackTemplate);
ui.devDefaultFiles.addEventListener("change", () => {
  uploadDefaultPngs(ui.devDefaultFiles.files);
});
ui.devDefaultApply.addEventListener("click", applyDefaultPackFiles);
ui.devDefaultClear.addEventListener("click", clearDefaultPackFiles);
ui.btnContinue.addEventListener("click", continueGame);
ui.btnLan.addEventListener("click", openLanScreen);
ui.btnLanConnect.addEventListener("click", connectLan);
ui.btnLanStart.addEventListener("click", () => {
  ui.lanLobbyStatus.textContent = "Iniciando mundo...";
  lanClient?.startGame();
});
ui.btnLanLeave.addEventListener("click", () => {
  closeLanConnection();
  resetLanUi();
  setLanStatus("Te has desconectado del mundo LAN.");
  showScreen("lan");
});
ui.lanTouch.addEventListener("change", () => {
  saveTouchControls(ui.lanTouch.checked);
});
ui.lanName.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    connectLan();
  }
});
ui.btnLanBack.addEventListener("click", () => {
  closeLanConnection();
  refreshSaveInfo();
  showScreen("menu");
});
ui.btnExit.addEventListener("click", exitGame);
ui.btnExitBack.addEventListener("click", () => {
  window.clearTimeout(exitTimer);
  exitTimer = null;
  refreshSaveInfo();
  showScreen("menu");
});
ui.btnMenu.addEventListener("click", returnToMenu);

ui.seedInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    startNewGame();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.dataset.screen === "lan") {
    closeLanConnection();
    refreshSaveInfo();
    showScreen("menu");
  } else if (
    event.key === "Escape" &&
    document.body.dataset.screen === "character"
  ) {
    pendingNewSeed = null;
    showScreen("menu");
  } else if (event.key === "Escape" && document.body.dataset.screen === "dev") {
    refreshSaveInfo();
    showScreen("menu");
  }
});

window.addEventListener("pagehide", () => {
  game?.save();
});

boot();
