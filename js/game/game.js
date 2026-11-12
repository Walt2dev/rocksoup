import { createRng } from "../core/rng.js";
import { Camera } from "../render/camera.js";
import { Effects } from "../render/effects.js";
import { TouchControls } from "../ui/touchControls.js";
import { resolveContextAction } from "./contextAction.js";
import { celestialStateAt, reflectionWorldPoint } from "./celestial.js";
import {
  compassState,
  normalizeWaypoint,
} from "./compass.js";
import {
  BIRD_MISSION,
  BIRD_SPECIES,
  birdById,
  birdForAmbientSpecies,
  birdMissionState,
  birdWatchMarkerAt,
  createBirdWatchAttempt,
  resolveBirdWatch,
  updateBirdWatchAttempt,
} from "./birdwatching.js";
import {
  WOLF_MISSION,
  findWolfDenSite,
  wolfMissionState,
} from "./wolfDen.js";
import {
  loadDonkeySkinId,
  loadHotbarSlots,
  loadStatsCollapsed,
  loadTouchControls,
  saveHotbarSlots,
  saveStatsCollapsed,
} from "./settings.js";
import {
  sanitizeBirdRecords,
  sanitizeFeathers,
  sanitizeFishingRecords,
} from "./save.js";
import { BUILTIN_SKINS, normalizeSkinId } from "./skins.js";
import { normalizeDonkeySkinId } from "./donkeySkins.js";
import { DONKEY_TRUST_REQUIRED, feedDonkey } from "./donkey.js";
import {
  HOTBAR_SLOT_COUNT,
  assignHotbarSlot,
  clearHotbarSlot,
  defaultHotbarSlots,
  firstEmptyHotbarSlot,
  hotbarEntryAt,
  normalizeHotbarSlots,
} from "./hotbar.js";
import {
  CROP_DATA,
  createFarmPlot,
  cropById,
  harvestFarmPlot,
  plantCrop,
  sanitizeFarmPlots,
  updateFarmPlot,
  waterFarmPlot,
} from "./farming.js";
import { sourceFor } from "./resourceSources.js";
import { PLANETS, SKY_OBJECTS, searchSkyObjects } from "./skyCatalog.js";
import { findVillageSites } from "./villages.js";
import {
  BUILDING_SLOTS,
  BUILDING_TYPES,
  GAME_MODES,
  UNIT_TYPES,
  buildingCost,
  buildingsForVillage,
  fiefRank,
  modeById,
  nextMode,
  unitCapForBuilding,
  waveDamageMultiplier,
  waveEnemyCount,
  waveHealthMultiplier,
  waveTypeForIndex,
} from "./towerDefense.js";
import {
  civicLineForVillage,
  civicRecipeState,
  craftCivicPotion,
} from "./civicPotions.js";
import {
  SCIENCE_BOOKS,
  SCIENCE_TIER_COSTS,
  lensForXp,
  nextLensForXp,
  scienceLevel,
  scienceModifiers,
  investigationReward,
  sanitizeSciencePoints,
} from "./science.js";
import {
  DAY_LENGTH_SECONDS,
  DAY_NIGHT_CYCLE,
  MOON_PHASES,
  NIGHT_LENGTH_SECONDS,
  gameDayAt,
  moonPhaseAt,
} from "./time.js";
import {
  TRADE_GOODS,
  productionYield,
  routeShare,
  tradeYield,
} from "./trade.js";
import {
  createFishingAttempt,
  fishById,
  fishingMarkerAt,
  formatFishWeight,
  resolveFishingCatch,
  updateFishingAttempt,
} from "./fishing.js";
import { WorldRenderer } from "../render/worldRenderer.js";
import { Component } from "../ecs/components.js";
import { EntityWorld } from "../ecs/ecs.js";
import {
  moveDirect,
  updateEnergy,
  updateGathering,
  updatePaths,
} from "../ecs/systems.js";
import { BIOME, biomeById } from "../world/biomes.js";
import { mineralById } from "../world/minerals.js";
import { CAMERA } from "../world/params.js";
import { World } from "../world/world.js";
import {
  CRAFT_CATEGORIES,
  CRAFT_RECIPES,
  craftLevelForXp,
  craftLevelProgress,
  craftRecipe,
  craftXpReward,
  recipeById,
  recipeState,
} from "./crafting.js";
import { POTION_DATA, potionById } from "./potions.js";
import {
  FALL_SAFE_BLOCKS,
  GRAVITY,
  JUMP_SPEED,
  fallDamage,
} from "./vertical.js";
import {
  MAX_WORKERS,
  WORKER_AUTO_RADIUS,
  WORKER_NAMES,
  createAmbientEntity,
  createPlayerEntity,
  createWorkerEntity,
} from "./entityFactory.js";
import {
  AMBIENT_SPECIES,
  buildAmbientData,
  isHostileSpecies,
  pickAmbientSpawn,
  updateAmbientSystem,
} from "./ambient.js";
import { GameInput } from "./input.js";
import {
  Inventory,
  ITEM_INFO,
  ITEM_KEYS,
  RESOURCE_INFO,
  RESOURCE_KEYS,
  TOOL_INFO,
  TOOL_KEYS,
} from "./inventory.js";
import {
  STATION_RECIPES,
  STATION_TYPES,
  costLabel,
  craftStationRecipe,
  stationRecipeById,
  stationRecipeState,
  stationRecipes,
} from "./brewing.js";
import { adjacentTiles, findPath, pathToCenters } from "./pathfinding.js";
import {
  GATHER_RANGE,
  gatherDuration,
  harvestEnergyCost,
  harvestYields,
} from "./resources.js";

const DPR_MAX = 1.5;
const HUD_INTERVAL = 0.25;
const AUTOSAVE_INTERVAL = 15;
const TOAST_DURATION = 2600;
const ENERGY_REGEN = 7;
const PATH_MAX_NODES = 4096;
const PLAYER_SPRITE_SCALE = 1.05;
const CAMPFIRE_RADIUS = 4;
const CAMPFIRE_REGEN_MULTIPLIER = 2.5;
const CAMPFIRE_PLACE_RANGE = 7;
const CAMPFIRE_MIN_DISTANCE = 0.9;
const STONE_PATH_PLACE_RANGE = 5;
const WORKER_SPRITE_SCALE = 0.95;
const WORKER_GATHER_MULTIPLIER = 1.35;
const RESTORE_MINERAL_SECONDS = 240;
const DONKEY_SPRITE_SCALE = 1.12;
const DONKEY_SPEED_MULTIPLIER = 1.6;
const DONKEY_INTERACT_RANGE = 3.2;
const RIDER_Z_OFFSET = 0.75;
const AMBIENT_TARGET = 8;
const AMBIENT_MAX = 10;
const AMBIENT_DESPAWN_RADIUS = 42;
const AMBIENT_SPAWN_INTERVAL = 2.5;
const NIGHT_MOB_TARGET = 4;
const NIGHT_MOB_MAX = 6;
const NIGHT_MOB_HEALTH = 60;
const SPIDER_HEALTH = 45;
const FOX_HEALTH = 35;
const GOAT_HEALTH = 55;
const BIRD_HEALTH = 20;
const PERDIZ_HEALTH = 16;
const WOLF_HEALTH = 70;
const CHICKEN_HEALTH = 14;
const WOLF_DAMAGE = 12;
const PERDIZ_CAPTURE_RANGE = 2.8;
const BIRD_WATCH_RANGE = 10;
const WOLF_TAME_RANGE = 3;
const WOLF_TAME_BONES = 3;
const NIGHT_MOB_DAMAGE = 9;
const NIGHT_MOB_ATTACK_INTERVAL = 1.25;
const PLAYER_ATTACK_RANGE = 2.4;
const PLAYER_BASE_ATTACK = 25;
const PLAYER_SPEAR_ATTACK = 50;
const PLAYER_SWORD_ATTACK = 42;
const PLAYER_BOW_ATTACK = 38;
const PLAYER_BOW_RANGE = 12;
const ATTACKABLE_AMBIENT_SPECIES = new Set([
  AMBIENT_SPECIES.NIGHTLING,
  AMBIENT_SPECIES.SPIDER,
  AMBIENT_SPECIES.FOX,
  AMBIENT_SPECIES.GOAT,
  AMBIENT_SPECIES.VULTURE,
  AMBIENT_SPECIES.SPARROW,
  AMBIENT_SPECIES.CROW,
  AMBIENT_SPECIES.OWL,
  AMBIENT_SPECIES.PERDIZ,
  AMBIENT_SPECIES.WOLF,
  AMBIENT_SPECIES.CHICKEN,
]);
const HEALTH_REGEN_DELAY = 8;
const HEALTH_REGEN_RATE = 3;
const ARMOR_DAMAGE_REDUCTION = 0.3;
const WOLF_CLOAK_DAMAGE_REDUCTION = 0.15;
const WOLF_CLOAK_SPEED_BONUS = 1.1;
const WATER_REACH = 3;
const SWIM_POTION_SECONDS = 90;
const SWIM_SPEED_MULTIPLIER = 0.7;
const FISHING_REACH = 3.5;
const FARM_REACH = 3.5;
const FARM_PLOT_LIMIT = 200;
const COFFEE_BUFF_SECONDS = 30;
const COFFEE_SPEED_MULTIPLIER = 1.5;
const MAX_STONES = 80;
const CHEST_CAPACITY = 18;
const TIPI_SAFE_RADIUS = 3.2;
const PLACEABLE_ITEM_KEYS = new Set([
  ...CRAFT_RECIPES.filter((recipe) => recipe.type === "placeable").map(
    (recipe) => recipe.item,
  ),
  "cauldron",
]);
const FEATHER_LABELS = Object.freeze({
  vulture: "Zopilote",
  sparrow: "Gorrión",
  crow: "Cuervo",
  owl: "Búho",
  perdiz: "Perdiz",
});
const AMBIENT_SCALES = Object.freeze({
  [AMBIENT_SPECIES.FOX]: 0.95,
  [AMBIENT_SPECIES.FROG]: 0.85,
  [AMBIENT_SPECIES.VULTURE]: 1.2,
  [AMBIENT_SPECIES.GOAT]: 1.05,
  [AMBIENT_SPECIES.SPARROW]: 0.65,
  [AMBIENT_SPECIES.CROW]: 0.8,
  [AMBIENT_SPECIES.OWL]: 0.85,
  [AMBIENT_SPECIES.NIGHTLING]: 1,
  [AMBIENT_SPECIES.SPIDER]: 0.9,
  [AMBIENT_SPECIES.DONKEY]: DONKEY_SPRITE_SCALE,
  [AMBIENT_SPECIES.PERDIZ]: 0.78,
  [AMBIENT_SPECIES.WOLF]: 1.12,
  [AMBIENT_SPECIES.CHICKEN]: 0.72,
});

export class Game {
  constructor({
    canvas,
    assets,
    saveStore,
    seed,
    saveState = null,
    characterSkin = null,
    hud,
    onMenuRequested,
    network = null,
    networkSelfId = null,
  }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.assets = assets;
    this.saveStore = saveStore;
    this.hud = hud;
    this.onMenuRequested = onMenuRequested;
    this.network = network;
    this.networkSelfId = networkSelfId ?? network?.selfId ?? null;
    this.worldBiomes = saveState
      ? saveState.worldBiomes === "expanded"
        ? "expanded"
        : "legacy"
      : "expanded";
    this.wolfBiome = saveState ? saveState.wolfBiome === true : true;
    this.world = new World(seed, {
      biomeSet: this.worldBiomes,
      flat: true,
      wolfBiome: this.wolfBiome,
    });
    this.world.loadHarvested(saveState?.harvestedNodes);
    this.world.loadPlanted(saveState?.plantedNodes);
    this.inventory = Inventory.fromJSON(saveState?.inventory);
    this.characterSkin = normalizeSkinId(
      saveState?.characterSkin ?? characterSkin,
    );
    this.playerSprites =
      this.assets.playerSkins?.[this.characterSkin]?.frames ??
      this.assets.playerSprites;
    this.campfires = Array.isArray(saveState?.campfires)
      ? saveState.campfires
          .filter((fire) => fire && Number.isFinite(fire.x) && Number.isFinite(fire.y))
          .map((fire) => ({ x: fire.x, y: fire.y }))
      : [];
    this.ovens = Array.isArray(saveState?.ovens)
      ? saveState.ovens
          .filter((item) => item && Number.isFinite(item.x) && Number.isFinite(item.y))
          .map((item) => ({ x: item.x, y: item.y }))
      : [];
    this.brewingTables = Array.isArray(saveState?.brewingTables)
      ? saveState.brewingTables
          .filter((item) => item && Number.isFinite(item.x) && Number.isFinite(item.y))
          .map((item) => ({ x: item.x, y: item.y }))
      : [];
    this.chests = Array.isArray(saveState?.chests)
      ? saveState.chests
          .filter((item) => item && Number.isFinite(item.x) && Number.isFinite(item.y))
          .map((item) => {
            const inventory = Inventory.fromJSON(item.inventory);
            inventory.setCapacity(CHEST_CAPACITY);
            return { x: item.x, y: item.y, inventory };
          })
      : [];
    this.tipis = Array.isArray(saveState?.tipis)
      ? saveState.tipis
          .filter((item) => item && Number.isFinite(item.x) && Number.isFinite(item.y))
          .map((item) => ({ x: item.x, y: item.y }))
      : [];
    this.fences = Array.isArray(saveState?.fences)
      ? saveState.fences
          .filter((item) => item && Number.isFinite(item.x) && Number.isFinite(item.y))
          .map((item) => ({ x: item.x, y: item.y }))
      : [];
    this.torches = Array.isArray(saveState?.torches)
      ? saveState.torches
          .filter((item) => item && Number.isFinite(item.x) && Number.isFinite(item.y))
          .map((item) => ({
            x: item.x,
            y: item.y,
            z: Number.isFinite(item.z)
              ? item.z
              : this.world.heightAt(item.x, item.y),
          }))
      : [];
    this.walls = Array.isArray(saveState?.walls)
      ? saveState.walls
          .filter((item) => item && Number.isFinite(item.x) && Number.isFinite(item.y))
          .map((item) => ({ x: item.x, y: item.y }))
      : [];
    this.stonePaths = Array.isArray(saveState?.stonePaths)
      ? saveState.stonePaths
          .filter((item) => item && Number.isFinite(item.x) && Number.isFinite(item.y))
          .map((item) => ({ x: item.x, y: item.y }))
      : [];
    this.beds = Array.isArray(saveState?.beds)
      ? saveState.beds
          .filter((item) => item && Number.isFinite(item.x) && Number.isFinite(item.y))
          .map((item) => ({ x: item.x, y: item.y }))
      : [];
    this.cauldrons = Array.isArray(saveState?.cauldrons)
      ? saveState.cauldrons
          .filter((item) => item && Number.isFinite(item.x) && Number.isFinite(item.y))
          .map((item) => ({ x: item.x, y: item.y }))
      : [];
    const universitySave =
      saveState?.university && typeof saveState.university === "object"
        ? saveState.university
        : {};
    this.researchBookOwned = universitySave.bookOwned === true;
    this.researchedPotions = new Set(
      Array.isArray(universitySave.researchedPotions)
        ? universitySave.researchedPotions.filter((id) => potionById(id))
        : [],
    );
    this.libraryEntries = Array.isArray(universitySave.libraryEntries)
      ? universitySave.libraryEntries
          .filter((entry) => entry && typeof entry.id === "string")
          .map((entry) => ({
            id: entry.id,
            name: typeof entry.name === "string" ? entry.name : entry.id,
            description:
              typeof entry.description === "string" ? entry.description : "",
          }))
      : [];
    this.workerMapBonus = Number.isFinite(universitySave.workerMapBonus)
      ? Math.min(7, Math.max(0, Math.floor(universitySave.workerMapBonus)))
      : 0;
    this.stonePouch = Array.isArray(saveState?.stones)
      ? saveState.stones
          .map((type) => mineralById(type))
          .filter(Boolean)
          .map((mineral) => ({
            type: mineral.id,
            chemistry: { ...mineral.chemistry },
          }))
      : [];
    this.groundItems = Array.isArray(saveState?.groundItems)
      ? saveState.groundItems
          .map((item) => {
            if (item.kind === "resource") {
              const info = RESOURCE_INFO[item.key];
              if (!info) return null;
              return { ...item, label: info.label, color: info.color };
            }

            const info = ITEM_INFO[item.key];
            if (!info) return null;
            return { ...item, label: info.label, color: "#c9a36a" };
          })
          .filter(Boolean)
      : [];
    this.ecs = new EntityWorld();
    this.effects = new Effects();
    this.renderer = new WorldRenderer();
    this.running = false;
    this.raf = null;
    this.lastTime = 0;
    this.hudTimer = 0;
    this.fpsFrames = 0;
    this.fpsTime = 0;
    this.resizeObserver = null;
    this.saveTimer = 0;
    this.toastTimer = null;
    this.cycleBannerTimer = null;
    this.cycleExpanded = false;
    this.statsCollapsed = loadStatsCollapsed();
    this.cameraFollow = true;
    this.craftingOpen = false;
    this.recipeBookOpen = false;
    this.recipeBookSearch = "";
    this.activeCraftCategory = "all";
    this.craftSearch = "";
    this.craftXp = Number.isFinite(saveState?.craftXp)
      ? Math.max(0, Math.floor(saveState.craftXp))
      : 0;
    this.craftLevel = craftLevelForXp(this.craftXp);
    this.activeStation = null;
    this.chestOpen = false;
    this.activeChest = null;
    this.universityOpen = false;
    this.universityTab = "shop";
    this.university = null;
    this.compassOwned = saveState?.compassOwned === true;
    this.waypoint = normalizeWaypoint(saveState?.waypoint);
    this.mapOpen = false;
    this.mapView = null;
    this.placingItem = null;
    this.hoverScreen = null;
    this.hover = null;
    this.lastPaintTile = null;
    this.energyBoosted = false;
    this.gameTime = Number.isFinite(saveState?.time) ? Math.max(0, saveState.time) : 0;
    this.wasNight = this.isNight();
    this.lastDamageTime = -HEALTH_REGEN_DELAY;
    this.mobDamageCooldown = 0;
    this.selectedWorkerId = null;
    this.selectedWorkerIds = new Set();
    this.selectedUnitIds = new Set();
    this.selectedUnitType = null;
    this.selectionMode = null;
    this.selectionDrag = null;
    this.selectedHotbar = null;
    const storedHotbar = loadHotbarSlots();
    this.hotbarSlots = storedHotbar
      ? normalizeHotbarSlots(storedHotbar)
      : defaultHotbarSlots(this.inventoryEntries());
    this.hotbarAutoFill = !storedHotbar;
    if (!storedHotbar && this.hotbarSlots.some(Boolean)) {
      saveHotbarSlots(this.hotbarSlots);
    }
    this.inventoryOpen = false;
    this.hotbarDrag = null;
    this.suppressInventoryClick = false;
    this.craftSwipe = null;
    this.tooltipTimer = null;
    this.tooltipPointer = null;
    this.tooltipStart = null;
    this.tooltipTarget = null;
    this.inventoryHudSignature = "";
    this.fishing = null;
    this.projectiles = [];
    this.fishingRng = createRng(`${this.world.seed}:fishing`);
    this.fishingRecords = sanitizeFishingRecords(saveState?.fishingRecords);
    this.feathers = sanitizeFeathers(saveState?.feathers);
    this.birdRng = createRng(`${this.world.seed}:birds`);
    this.birdWatch = null;
    this.birdPanelOpen = false;
    this.birdObservations = new Set(
      Array.isArray(saveState?.birdObservations)
        ? saveState.birdObservations.filter((id) =>
            BIRD_SPECIES.some((bird) => bird.id === id),
          )
        : [],
    );
    this.birdRecords = sanitizeBirdRecords(saveState?.birdRecords);
    this.birdMissionCompleted = saveState?.birdMissionCompleted === true;
    this.companionSpecies =
      saveState?.companion?.species === "perdiz" ||
      saveState?.companion?.species === "wolf"
        ? saveState.companion.species
        : null;
    this.companionId = null;
    this.pendingTameNetworkId = null;
    this.wolfTotems = Array.isArray(saveState?.wolfTotems)
      ? saveState.wolfTotems
          .filter(
            (totem) =>
              totem && Number.isFinite(totem.x) && Number.isFinite(totem.y),
          )
          .map((totem) => ({ x: totem.x, y: totem.y }))
          .slice(0, 100)
      : [];
    this.wolfMission = {
      discovered: saveState?.wolfMission?.discovered === true,
      kills: Number.isFinite(saveState?.wolfMission?.kills)
        ? Math.max(0, Math.floor(saveState.wolfMission.kills))
        : 0,
      completed: saveState?.wolfMission?.completed === true,
      claimed: saveState?.wolfMission?.claimed === true,
    };
    this.wolfDen = null;
    this.wolfOpen = false;
    this.wolfNotified = false;
    this.farmPlots = sanitizeFarmPlots(saveState?.farmPlots);
    this.swimRemaining = Number.isFinite(saveState?.player?.swimSeconds)
      ? Math.min(SWIM_POTION_SECONDS, Math.max(0, saveState.player.swimSeconds))
      : 0;
    this.isNewGame = !saveState;
    this.speedBuffRemaining = Number.isFinite(saveState?.player?.buffSeconds)
      ? Math.min(30, Math.max(0, saveState.player.buffSeconds))
      : 0;
    this.attackBuffRemaining = 0;
    this.resistanceBuffRemaining = 0;
    this.poisonRemaining = 0;
    this.poisonTickTimer = 0;
    this.slowRemaining = 0;
    this.weaknessRemaining = 0;
    this.maxHealth = 100;
    this.health = Number.isFinite(saveState?.player?.health)
      ? Math.min(100, Math.max(0, saveState.player.health))
      : 100;
    this.remotePlayers = new Map();
    this.remoteWorkers = new Map();
    this.networkAmbient = new Map();
    this.networkAmbientTime = 0;
    this.attackCooldown = 0;
    this.networkTimer = 0;
    this.inventorySendTimer = 0;
    this.touchControls = null;
    this.hudMenu = null;
    this.ambientRng = createRng(`${this.world.seed}:ambient`);
    this.ambientSpawnTimer = 0;
    this.wolfSpawnCooldown = 0;
    this.ambientSpawnSlot = 0;
    this.donkeyId = null;
    this.donkeyMounted = false;
    this.donkeySkinId = normalizeDonkeySkinId(
      loadDonkeySkinId(),
      Object.keys(this.assets.donkeySkins ?? {}),
    );
    this.nightSpawnSlot = 0;


    const start = this.resolvePlayerStart(saveState);
    this.spawnPoint = { x: start.x, y: start.y };
    this.university = this.findUniversityLocation(this.world.findSpawn());
    this.observatory = this.findObservatoryLocation(this.university);
    this.observatoryOpen = false;
    this.skyView = { ra: 12, dec: 0, zoom: 1 };
    this.skySearch = "";
    this.skySelected = null;
    this.skyDragging = null;
    this.observatoryDiscoveries = new Set(
      Array.isArray(saveState?.observatoryDiscoveries)
        ? saveState.observatoryDiscoveries.filter(
            (id) => typeof id === "string" && SKY_OBJECTS.some((object) => object.id === id),
          )
        : [],
    );
    this.observationNotes = new Set(
      Array.isArray(saveState?.observationNotes)
        ? saveState.observationNotes.filter(
            (id) => typeof id === "string" && SKY_OBJECTS.some((object) => object.id === id),
          )
        : [],
    );
    this.completedVillages = new Set(
      Array.isArray(saveState?.completedVillages)
        ? saveState.completedVillages.filter((id) => typeof id === "string")
        : [],
    );
    this.sciencePoints = sanitizeSciencePoints(saveState?.sciencePoints);
    this.investigations = Array.isArray(saveState?.investigations)
      ? saveState.investigations
          .filter((entry) => entry && typeof entry.objectId === "string")
          .slice(-200)
      : [];
    this.lensXp = Number.isFinite(saveState?.lensXp)
      ? Math.max(0, saveState.lensXp)
      : 0;
    this.lensLevel = lensForXp(this.lensXp).id;
    this.tradeRoutes = Array.isArray(saveState?.tradeRoutes)
      ? saveState.tradeRoutes.filter((route) => route && typeof route.id === "string")
      : [];
    this.villageProgress = {};
    this.villageSeen = new Set(
      Array.isArray(saveState?.seenVillages)
        ? saveState.seenVillages.filter((id) => typeof id === "string")
        : [],
    );
    this.villageOpen = false;
    this.questOpen = false;
    this.villageNotified = new Set();
    this.activeVillage = null;
    this.tradeOpen = false;
    this.tradeStatusText = "";
    this.skyAlign = null;
    this.gameMode = saveState?.gameMode
      ? modeById(saveState.gameMode).id
      : "survival";
    this.wavesStarted = saveState?.wavesStarted === true;
    this.wavesSurvived = Number.isFinite(saveState?.wavesSurvived)
      ? Math.max(0, Math.floor(saveState.wavesSurvived))
      : 0;
    this.waveIndex = Number.isFinite(saveState?.waveIndex)
      ? Math.max(0, Math.floor(saveState.waveIndex))
      : 0;
    this.waveTimer = Number.isFinite(saveState?.waveTimer)
      ? Math.max(0, saveState.waveTimer)
      : (GAME_MODES[this.gameMode].interval ?? 90);
    this.waveActive = false;
    this.waveEnemyIds = new Set();
    this.waveTargetVillageId = null;
    this.units = [];
    this.unitSeq = 0;
    this.selectedUnitId = null;
    this.fiefOpen = false;
    this.fiefSelectedVillageId = null;
    this.fiefStatusText = "";
    this.villages = findVillageSites(
      this.world,
      this.world.seed,
      start,
      [this.university, this.observatory],
    );
    for (const village of this.villages) {
      const saved = saveState?.villageProgress?.[village.id] ?? {};
      const line = civicLineForVillage(village);
      const delivered = Number.isFinite(saved.delivered)
        ? Math.max(0, Math.min(line.length, Math.floor(saved.delivered)))
        : 0;
      const buildings = buildingsForVillage(saved).map((building) => {
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
          hp: Number.isFinite(building.hp)
            ? Math.max(0, Math.min(maxHp, building.hp))
            : maxHp,
          maxHp,
        };
      });
      this.villageProgress[village.id] = {
        stability: Number.isFinite(saved.stability)
          ? Math.max(0, Math.min(100, saved.stability))
          : 100,
        delivered,
        allied: saved.allied === true || delivered >= 4,
        crafted: typeof saved.crafted === "string" ? saved.crafted : null,
        lastProduction: Number.isFinite(saved.lastProduction)
          ? saved.lastProduction
          : this.gameTime,
        buildings,
      };
    }
    this.wolfDen = findWolfDenSite(
      this.world,
      this.world.seed,
      start,
      [this.university, this.observatory, ...this.villages],
    );
    if (this.wolfDen) {
      this.wolfDen.discovered = this.wolfMission.discovered;
    }
    this.playerId = createPlayerEntity(this.ecs, {
      x: start.x,
      y: start.y,
      energy: saveState?.player?.energy ?? 100,
    });
    this.basePlayerSpeed = this.playerMotion.speed;
    this.playerGroundHeight = this.world.heightAt(start.x, start.y);
    this.playerVerticalOffset = 0;
    this.playerVerticalVelocity = 0;
    this.playerAirborne = false;
    this.playerMaxFeetHeight = this.playerGroundHeight;

    this.camera = new Camera({
      x: start.x,
      y: start.y,
      zoom: saveState?.camera?.zoom ?? CAMERA.initialZoom,
      rotation: saveState?.camera?.rotation ?? 0,
      z: this.world.heightAt(start.x, start.y) * 0.72,
    });

    this.input = new GameInput(canvas, this.camera, {
      onMenu: () => this.handleMenuRequest(),
      onRecenter: () => this.recenterCamera(),
      onClick: (screenX, screenY, shiftKey) =>
        this.handleClick(screenX, screenY, { shiftKey }),
      onRightClick: () => this.handleRightClick(),
      onCameraPan: () => {
        this.cameraFollow = false;
      },
      onCraft: () => this.toggleCrafting(),
      onRecipes: () => this.toggleRecipeBook(),
      onQuest: () => this.toggleQuest(),
      onBirds: () => this.toggleBirdPanel(),
      onMap: () => this.toggleMap(),
      onPlace: () => this.handlePlaceRequest(),
      onHotbar: (index) => this.selectHotbar(index),
      onUseSelected: () => this.useSelectedItem(),
      onDropSelected: (wholeStack) => this.dropSelected(wholeStack),
      onAttack: () => this.attack(),
      onHover: (screenX, screenY) => this.handlePointerHover(screenX, screenY),
      onHoverEnd: () => this.clearPointerHover(),
      onDragStart: (screenX, screenY) => this.handleDragStart(screenX, screenY),
      onDragMove: (screenX, screenY) => this.handleDragMove(screenX, screenY),
      onDragEnd: (screenX, screenY, event) =>
        this.handleDragEnd(screenX, screenY, event),
      onRotateLeft: () => this.rotateCamera(-1),
      onRotateRight: () => this.rotateCamera(1),
      onJump: () => this.jump(),
      onGameMode: () => this.toggleGameMode(),
      onFief: () => this.toggleFief(),
    });

    this.frame = this.frame.bind(this);
    this.resize = this.resize.bind(this);
    this.handleVisibility = this.handleVisibility.bind(this);
    this.handlePageHide = this.handlePageHide.bind(this);
    this.toggleCrafting = this.toggleCrafting.bind(this);
    this.closeCrafting = this.closeCrafting.bind(this);
    this.toggleRecipeBook = this.toggleRecipeBook.bind(this);
    this.closeRecipeBook = this.closeRecipeBook.bind(this);
    this.handleRecipeBookSearch = this.handleRecipeBookSearch.bind(this);
    this.handlePlaceRequest = this.handlePlaceRequest.bind(this);
    this.handlePlaceSelected = this.handlePlaceSelected.bind(this);
    this.handleDropButton = this.handleDropButton.bind(this);
    this.handleHudDrop = this.handleHudDrop.bind(this);
    this.handleInventoryDrop = this.handleInventoryDrop.bind(this);
    this.handleInventoryDropStack = this.handleInventoryDropStack.bind(this);
    this.handleRotateLeft = this.handleRotateLeft.bind(this);
    this.handleRotateRight = this.handleRotateRight.bind(this);
    this.handleRecipeListClick = this.handleRecipeListClick.bind(this);
    this.handleCraftTabsClick = this.handleCraftTabsClick.bind(this);
    this.handleCraftSearch = this.handleCraftSearch.bind(this);
    this.handleWorkerAutoToggle = this.handleWorkerAutoToggle.bind(this);
    this.handleWorkerRestore = this.handleWorkerRestore.bind(this);
    this.handleWorkerCancel = this.handleWorkerCancel.bind(this);
    this.handleWorkerDeselect = this.handleWorkerDeselect.bind(this);
    this.handleIdleWorkerRequest = this.handleIdleWorkerRequest.bind(this);
    this.handleFiefMultiSelectChange = this.handleFiefMultiSelectChange.bind(this);
    this.handleWorkerMultiSelectChange = this.handleWorkerMultiSelectChange.bind(this);
    this.handleCraftSwipeStart = this.handleCraftSwipeStart.bind(this);
    this.handleCraftSwipeEnd = this.handleCraftSwipeEnd.bind(this);
    this.handleCraftSwipeCancel = this.handleCraftSwipeCancel.bind(this);
    this.handleCraftEdgeSwipeStart = this.handleCraftEdgeSwipeStart.bind(this);
    this.handleCraftEdgeSwipeEnd = this.handleCraftEdgeSwipeEnd.bind(this);
    this.toggleQuest = this.toggleQuest.bind(this);
    this.closeQuest = this.closeQuest.bind(this);
    this.handleQuestClick = this.handleQuestClick.bind(this);
    this.toggleBirdPanel = this.toggleBirdPanel.bind(this);
    this.closeBirdPanel = this.closeBirdPanel.bind(this);
    this.openWolfDen = this.openWolfDen.bind(this);
    this.closeWolfDen = this.closeWolfDen.bind(this);
    this.claimWolfMission = this.claimWolfMission.bind(this);
    this.handleTooltipOver = this.handleTooltipOver.bind(this);
    this.handleTooltipOut = this.handleTooltipOut.bind(this);
    this.handleTooltipDown = this.handleTooltipDown.bind(this);
    this.handleTooltipMove = this.handleTooltipMove.bind(this);
    this.handleTooltipRelease = this.handleTooltipRelease.bind(this);
    this.handleTooltipCancel = this.handleTooltipCancel.bind(this);
    this.openObservatory = this.openObservatory.bind(this);
    this.closeObservatory = this.closeObservatory.bind(this);
    this.handleSkySearch = this.handleSkySearch.bind(this);
    this.handleSkyListClick = this.handleSkyListClick.bind(this);
    this.handleSkyPointerDown = this.handleSkyPointerDown.bind(this);
    this.handleSkyPointerMove = this.handleSkyPointerMove.bind(this);
    this.handleSkyPointerUp = this.handleSkyPointerUp.bind(this);
    this.handleSkyWheel = this.handleSkyWheel.bind(this);
    this.startSkyAlignment = this.startSkyAlignment.bind(this);
    this.observeSelectedSky = this.observeSelectedSky.bind(this);
    this.openVillage = this.openVillage.bind(this);
    this.closeVillage = this.closeVillage.bind(this);
    this.prepareVillagePotion = this.prepareVillagePotion.bind(this);
    this.deliverVillageRequest = this.deliverVillageRequest.bind(this);
    this.openTrade = this.openTrade.bind(this);
    this.closeTrade = this.closeTrade.bind(this);
    this.createTradeRoute = this.createTradeRoute.bind(this);
    this.handleTradeClick = this.handleTradeClick.bind(this);
    this.handleInventoryClick = this.handleInventoryClick.bind(this);
    this.openInventory = this.openInventory.bind(this);
    this.closeInventory = this.closeInventory.bind(this);
    this.toggleInventory = this.toggleInventory.bind(this);
    this.handleInventoryPointerDown = this.handleInventoryPointerDown.bind(this);
    this.handleInventoryPointerMove = this.handleInventoryPointerMove.bind(this);
    this.handleInventoryPointerUp = this.handleInventoryPointerUp.bind(this);
    this.handleChestClick = this.handleChestClick.bind(this);
    this.closeChest = this.closeChest.bind(this);
    this.handleUniversityTabsClick = this.handleUniversityTabsClick.bind(this);
    this.handleUniversityBodyClick = this.handleUniversityBodyClick.bind(this);
    this.closeUniversity = this.closeUniversity.bind(this);
    this.toggleMap = this.toggleMap.bind(this);
    this.openMap = this.openMap.bind(this);
    this.closeMap = this.closeMap.bind(this);
    this.handleMapPointer = this.handleMapPointer.bind(this);
    this.clearWaypoint = this.clearWaypoint.bind(this);
    this.walkToWaypoint = this.walkToWaypoint.bind(this);
    this.handleCrossWaypoint = this.handleCrossWaypoint.bind(this);
    this.renderMap = this.renderMap.bind(this);
    this.handleMapLandmarkClick = this.handleMapLandmarkClick.bind(this);
    this.toggleStatsCollapsed = this.toggleStatsCollapsed.bind(this);
    this.toggleCycleInfo = this.toggleCycleInfo.bind(this);
    this.handleCycleKey = this.handleCycleKey.bind(this);
    this.applyStatsCollapsed = this.applyStatsCollapsed.bind(this);
    this.drinkCoffee = this.drinkCoffee.bind(this);
    this.attack = this.attack.bind(this);
    this.toggleFief = this.toggleFief.bind(this);
    this.closeFief = this.closeFief.bind(this);
    this.handleFiefClick = this.handleFiefClick.bind(this);

    this.setupWorkers(saveState);
    this.setupDonkey(saveState);
    this.setupCompanion();
    this.syncAllVillageUnits();
    if (!this.network) {
      this.spawnAmbientBatch(AMBIENT_TARGET);
    }
    this.hud.seed.textContent = this.world.seed;
    this.updateHud();

    if (this.wolfDen && !this.wolfMission.discovered) {
      this.wolfHintTimer = window.setTimeout(() => {
        if (this.wolfMission.discovered || !this.wolfDen) {
          return;
        }
        const distance = Math.round(
          Math.hypot(
            this.wolfDen.x - this.playerTransform.x,
            this.wolfDen.y - this.playerTransform.y,
          ),
        );
        this.notify(
          `Rastros de lobos: hay una cueva a ${distance} m. Los lobos merodean cerca.`,
        );
      }, 7000);
    }
  }

  get playerTransform() {
    return this.ecs.getComponent(this.playerId, Component.TRANSFORM);
  }

  get playerMotion() {
    return this.ecs.getComponent(this.playerId, Component.MOTION);
  }

  get playerEnergy() {
    return this.ecs.getComponent(this.playerId, Component.ENERGY);
  }

  resolvePlayerStart(saveState) {
    const player = saveState?.player;

    if (player && Number.isFinite(player.x) && Number.isFinite(player.y)) {
      return this.findClearStart({ x: player.x, y: player.y });
    }

    return this.findClearStart(this.world.findSpawn());
  }

  findUniversityLocation(origin) {
    const tileX = Math.floor(origin.x);
    const tileY = Math.floor(origin.y);

    for (let radius = 10; radius <= 28; radius += 2) {
      for (let step = 0; step < 16; step += 1) {
        const angle = (step / 16) * Math.PI * 2;
        const x = Math.floor(tileX + Math.cos(angle) * radius);
        const y = Math.floor(tileY + Math.sin(angle) * radius);
        let clear = true;

        for (let dy = -1; dy <= 1 && clear; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (!this.world.isActorWalkableAt(x + dx, y + dy)) {
              clear = false;
              break;
            }
          }
        }

        if (clear) {
          return { x: x + 0.5, y: y + 0.5 };
        }
      }
    }

    return { x: tileX + 0.5, y: tileY + 0.5 };
  }

  findObservatoryLocation(origin) {
    const tileX = Math.floor(origin.x);
    const tileY = Math.floor(origin.y);

    for (let radius = 4; radius <= 9; radius += 1) {
      for (let step = 0; step < 12; step += 1) {
        const angle = (step / 12) * Math.PI * 2;
        const x = Math.floor(tileX + Math.cos(angle) * radius);
        const y = Math.floor(tileY + Math.sin(angle) * radius);

        if (
          this.isActorWalkableAt(x, y) &&
          this.isActorWalkableAt(x + 1, y) &&
          this.isActorWalkableAt(x, y + 1) &&
          this.isActorWalkableAt(x + 1, y + 1)
        ) {
          return { x: x + 0.5, y: y + 0.5 };
        }
      }
    }

    return { x: tileX + 4.5, y: tileY + 0.5 };
  }

  findClearStart(position) {
    const tileX = Math.floor(position.x);
    const tileY = Math.floor(position.y);

    if (this.isActorWalkableAt(tileX, tileY)) {
      return { x: position.x, y: position.y };
    }

    for (let radius = 1; radius <= 12; radius += 1) {
      let best = null;

      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) {
            continue;
          }

          const x = tileX + dx;
          const y = tileY + dy;

          if (!this.isActorWalkableAt(x, y)) {
            continue;
          }

          const distance = Math.hypot(dx, dy);
          if (!best || distance < best.distance) {
            best = { x: x + 0.5, y: y + 0.5, distance };
          }
        }
      }

      if (best) {
        return { x: best.x, y: best.y };
      }
    }

    return { x: tileX + 0.5, y: tileY + 0.5 };
  }

  getWorkerIds() {
    return this.ecs.query(Component.WORKER, Component.TRANSFORM);
  }

  getAmbientIds() {
    return this.ecs.query(Component.AMBIENT, Component.TRANSFORM, Component.MOTION);
  }

  getDonkey() {
    if (!this.donkeyId || !this.ecs.hasComponent(this.donkeyId, Component.AMBIENT)) {
      return null;
    }
    return this.ecs.getComponent(this.donkeyId, Component.AMBIENT);
  }

  setupDonkey(saveState) {
    const player = this.playerTransform;
    const saved =
      saveState?.donkey && typeof saveState.donkey === "object"
        ? saveState.donkey
        : null;
    let x = Number.isFinite(saved?.x) ? saved.x : null;
    let y = Number.isFinite(saved?.y) ? saved.y : null;

    if (x === null || y === null) {
      const spawn =
        pickAmbientSpawn(this.ambientRng, this.world, player.x, player.y, {
          preferredSpecies: AMBIENT_SPECIES.DONKEY,
          minRadius: 4,
          maxRadius: 12,
          attempts: 64,
        }) ??
        pickAmbientSpawn(this.ambientRng, this.world, player.x, player.y, {
          minRadius: 2,
          maxRadius: 8,
          attempts: 64,
        });

      if (spawn) {
        x = spawn.x;
        y = spawn.y;
      } else {
        x = Math.floor(player.x) + 1.5;
        y = Math.floor(player.y) + 0.5;
      }
    }

    const ambient = buildAmbientData(
      this.ambientRng,
      AMBIENT_SPECIES.DONKEY,
      x,
      y,
    );
    ambient.donkey = true;
    ambient.tamed = saved?.tamed === true;
    ambient.trust = Number.isFinite(saved?.trust)
      ? Math.max(0, Math.min(DONKEY_TRUST_REQUIRED, Math.floor(saved.trust)))
      : 0;
    ambient.health = 120;
    ambient.skinId = normalizeDonkeySkinId(
      this.donkeySkinId,
      Object.keys(this.assets.donkeySkins ?? {}),
    );
    ambient.mounted = false;
    this.donkeyId = createAmbientEntity(this.ecs, {
      species: AMBIENT_SPECIES.DONKEY,
      x,
      y,
      ambient,
    });
  }

  syncMountedDonkey() {
    if (!this.donkeyMounted) {
      return;
    }

    const ambient = this.getDonkey();
    if (!ambient) {
      this.donkeyMounted = false;
      return;
    }

    const donkeyTransform = this.ecs.getComponent(
      this.donkeyId,
      Component.TRANSFORM,
    );
    const playerTransform = this.playerTransform;
    donkeyTransform.x = playerTransform.x;
    donkeyTransform.y = playerTransform.y;
    donkeyTransform.z = 0;
    ambient.mounted = true;
  }

  serializeDonkey() {
    const ambient = this.getDonkey();
    if (!ambient) {
      return null;
    }
    const transform = this.ecs.getComponent(
      this.donkeyId,
      Component.TRANSFORM,
    );
    return {
      x: transform.x,
      y: transform.y,
      trust: ambient.trust ?? 0,
      tamed: ambient.tamed === true,
      skinId: ambient.skinId ?? this.donkeySkinId,
    };
  }

  donkeySkin(ambient) {
    const id = normalizeDonkeySkinId(
      ambient?.skinId ?? this.donkeySkinId,
      Object.keys(this.assets.donkeySkins ?? {}),
    );
    return (
      this.assets.donkeySkins?.[id] ??
      this.assets.donkeySkins?.[this.donkeySkinId] ??
      this.assets.ambientSprites?.donkey ??
      null
    );
  }

  companionInfo(species = this.companionSpecies) {
    if (species === "wolf") {
      return {
        species: AMBIENT_SPECIES.WOLF,
        health: WOLF_HEALTH,
        offsetX: -1.6,
        offsetY: 1,
      };
    }
    if (species === "perdiz") {
      return {
        species: AMBIENT_SPECIES.PERDIZ,
        health: PERDIZ_HEALTH,
        offsetX: -1.4,
        offsetY: 0.8,
      };
    }
    return null;
  }

  releaseCompanion() {
    if (
      this.companionId &&
      this.ecs.hasComponent(this.companionId, Component.AMBIENT)
    ) {
      this.ecs.destroyEntity(this.companionId);
    }
    this.companionId = null;
    this.companionSpecies = null;
  }

  setupCompanion() {
    const info = this.companionInfo();
    if (!info) {
      return;
    }
    const transform = this.playerTransform;
    const x = transform.x + info.offsetX;
    const y = transform.y + info.offsetY;
    const ambient = buildAmbientData(this.ambientRng, info.species, x, y);
    ambient.companion = true;
    ambient.tamed = true;
    ambient.health = info.health;
    this.companionId = createAmbientEntity(this.ecs, {
      species: info.species,
      x,
      y,
      ambient,
    });
  }

  serializeCompanion() {
    if (!this.companionSpecies) {
      return null;
    }
    if (
      !this.companionId ||
      !this.ecs.hasComponent(this.companionId, Component.AMBIENT)
    ) {
      return { species: this.companionSpecies };
    }
    return { species: this.companionSpecies };
  }

  spawnWolvesNearDen() {
    if (!this.wolfDen || this.network) {
      return 0;
    }

    const player = this.playerTransform;
    const denDistance = Math.hypot(
      this.wolfDen.x - player.x,
      this.wolfDen.y - player.y,
    );

    if (denDistance > 44) {
      return 0;
    }

    let wolves = 0;
    for (const id of this.getAmbientIds()) {
      const ambient = this.ecs.getComponent(id, Component.AMBIENT);
      if (
        ambient?.species === AMBIENT_SPECIES.WOLF &&
        !ambient.companion &&
        !ambient.tamed
      ) {
        wolves += 1;
      }
    }

    const target = 2;
    let spawned = 0;

    while (wolves < target) {
      const angle = this.ambientRng.float(0, Math.PI * 2);
      const radius = this.ambientRng.float(4, 9);
      const x = this.wolfDen.x + Math.cos(angle) * radius;
      const y = this.wolfDen.y + Math.sin(angle) * radius;

      if (!this.world.isActorWalkableAt(x, y)) {
        break;
      }

      const ambient = buildAmbientData(
        this.ambientRng,
        AMBIENT_SPECIES.WOLF,
        x,
        y,
      );
      ambient.health = WOLF_HEALTH;
      ambient.denX = this.wolfDen.x;
      ambient.denY = this.wolfDen.y;
      createAmbientEntity(this.ecs, {
        species: AMBIENT_SPECIES.WOLF,
        x,
        y,
        ambient,
      });
      wolves += 1;
      spawned += 1;
    }

    return spawned;
  }

  spawnRoamingWolves() {
    if (this.network) {
      return 0;
    }

    const player = this.playerTransform;
    const biome = this.world.biomeAt(player.x, player.y);
    const inWolfBiome = biome === BIOME.WOLF || biome === BIOME.SNOW;
    const night = this.isNight();

    if (!inWolfBiome || this.wolfSpawnCooldown > 0) {
      return 0;
    }

    let nearby = 0;
    for (const id of this.getAmbientIds()) {
      const ambient = this.ecs.getComponent(id, Component.AMBIENT);
      if (
        ambient?.species !== AMBIENT_SPECIES.WOLF ||
        ambient.companion ||
        ambient.tamed
      ) {
        continue;
      }
      const transform = this.ecs.getComponent(id, Component.TRANSFORM);
      if (
        transform &&
        Math.hypot(transform.x - player.x, transform.y - player.y) <= 32
      ) {
        nearby += 1;
      }
    }

    const target = night ? 2 : 1;
    if (nearby >= target) {
      return 0;
    }

    for (let attempt = 0; attempt < 32; attempt += 1) {
      const angle = this.ambientRng.float(0, Math.PI * 2);
      const distance = this.ambientRng.float(10, 18);
      const x = Math.round(player.x + Math.cos(angle) * distance) + 0.5;
      const y = Math.round(player.y + Math.sin(angle) * distance) + 0.5;

      if (!this.world.isActorWalkableAt(x, y)) {
        continue;
      }
      if (
        this.world.biomeAt(Math.floor(x), Math.floor(y)) !== BIOME.WOLF &&
        this.world.biomeAt(Math.floor(x), Math.floor(y)) !== BIOME.SNOW
      ) {
        continue;
      }

      const ambient = buildAmbientData(
        this.ambientRng,
        AMBIENT_SPECIES.WOLF,
        x,
        y,
      );
      ambient.health = WOLF_HEALTH;
      if (this.wolfDen) {
        ambient.denX = this.wolfDen.x;
        ambient.denY = this.wolfDen.y;
      }
      createAmbientEntity(this.ecs, {
        species: AMBIENT_SPECIES.WOLF,
        x,
        y,
        ambient,
      });
      this.wolfSpawnCooldown = 16;
      return 1;
    }

    return 0;
  }

  spawnAmbientBatch(count) {
    const player = this.playerTransform;
    let spawned = 0;

    const speciesPlan = [
      AMBIENT_SPECIES.FOX,
      AMBIENT_SPECIES.FROG,
      AMBIENT_SPECIES.VULTURE,
      AMBIENT_SPECIES.GOAT,
      AMBIENT_SPECIES.SPARROW,
      AMBIENT_SPECIES.CROW,
      AMBIENT_SPECIES.OWL,
      AMBIENT_SPECIES.PERDIZ,
      AMBIENT_SPECIES.CHICKEN,
    ];

    while (
      spawned < count &&
      this.getAmbientIds().length < AMBIENT_MAX
    ) {
      const preferredSpecies =
        speciesPlan[this.ambientSpawnSlot % speciesPlan.length];
      this.ambientSpawnSlot += 1;

      const spawn =
        pickAmbientSpawn(this.ambientRng, this.world, player.x, player.y, {
          preferredSpecies,
          attempts:
            preferredSpecies === AMBIENT_SPECIES.FROG ? 80 : 32,
        }) ??
        pickAmbientSpawn(this.ambientRng, this.world, player.x, player.y);

      if (!spawn) {
        break;
      }

      const ambient = buildAmbientData(
        this.ambientRng,
        spawn.species,
        spawn.x,
        spawn.y,
      );
      if (spawn.species === AMBIENT_SPECIES.FOX) {
        ambient.health = FOX_HEALTH;
      } else if (spawn.species === AMBIENT_SPECIES.GOAT) {
        ambient.health = GOAT_HEALTH;
      } else if (spawn.species === AMBIENT_SPECIES.PERDIZ) {
        ambient.health = PERDIZ_HEALTH;
      } else if (spawn.species === AMBIENT_SPECIES.CHICKEN) {
        ambient.health = CHICKEN_HEALTH;
      } else if (
        spawn.species === AMBIENT_SPECIES.SPARROW ||
        spawn.species === AMBIENT_SPECIES.CROW ||
        spawn.species === AMBIENT_SPECIES.OWL
      ) {
        ambient.health = BIRD_HEALTH;
      }
      createAmbientEntity(this.ecs, {
        species: spawn.species,
        x: spawn.x,
        y: spawn.y,
        ambient,
      });
      spawned += 1;
    }

    return spawned;
  }

  updateAmbientPopulation(deltaSeconds) {
    if (this.network) {
      return;
    }

    this.wolfSpawnCooldown = Math.max(
      0,
      this.wolfSpawnCooldown - deltaSeconds,
    );
    this.ambientSpawnTimer -= deltaSeconds;

    if (this.ambientSpawnTimer > 0) {
      return;
    }

    this.ambientSpawnTimer = AMBIENT_SPAWN_INTERVAL;
    const player = this.playerTransform;
    const night = this.isNight();
    this.spawnWolvesNearDen();
    this.spawnRoamingWolves();

    for (const id of this.getAmbientIds()) {
      if (id === this.donkeyId || id === this.companionId) {
        continue;
      }
      const transform = this.ecs.getComponent(id, Component.TRANSFORM);
      const ambient = this.ecs.getComponent(id, Component.AMBIENT);
      if (ambient.wave || ambient.companion) {
        continue;
      }
      const distance = Math.hypot(transform.x - player.x, transform.y - player.y);
      const isNightMob =
        ambient.species === AMBIENT_SPECIES.NIGHTLING ||
        ambient.species === AMBIENT_SPECIES.SPIDER;

      if (isNightMob && !night) {
        this.ecs.destroyEntity(id);
        continue;
      }

      if (distance > AMBIENT_DESPAWN_RADIUS) {
        this.ecs.destroyEntity(id);
      }
    }

    let passiveCount = 0;
    let nightMobCount = 0;

    for (const id of this.getAmbientIds()) {
      if (id === this.donkeyId || id === this.companionId) {
        continue;
      }
      const ambient = this.ecs.getComponent(id, Component.AMBIENT);
      if (ambient.wave || ambient.companion) {
        continue;
      }
      if (
        ambient.species === AMBIENT_SPECIES.NIGHTLING ||
        ambient.species === AMBIENT_SPECIES.SPIDER
      ) {
        nightMobCount += 1;
      } else if (ambient.species === AMBIENT_SPECIES.WOLF) {
        continue;
      } else {
        passiveCount += 1;
      }
    }

    if (!night) {
      if (passiveCount < AMBIENT_TARGET) {
        this.spawnAmbientBatch(AMBIENT_TARGET - passiveCount);
      }
      return;
    }

    const passiveTarget = Math.max(2, Math.floor(AMBIENT_TARGET / 2));
    if (passiveCount < passiveTarget) {
      this.spawnAmbientBatch(passiveTarget - passiveCount);
    }
    if (nightMobCount < NIGHT_MOB_TARGET) {
      this.spawnNightBatch(NIGHT_MOB_TARGET - nightMobCount);
    }
  }

  spawnNightBatch(count) {
    if (this.network) {
      return 0;
    }

    const player = this.playerTransform;
    let spawned = 0;

    while (
      spawned < count &&
      this.getAmbientIds().length < AMBIENT_MAX + NIGHT_MOB_MAX
    ) {
      const species =
        this.nightSpawnSlot % 2 === 0
          ? AMBIENT_SPECIES.NIGHTLING
          : AMBIENT_SPECIES.SPIDER;
      this.nightSpawnSlot += 1;

      const spawn = pickAmbientSpawn(this.ambientRng, this.world, player.x, player.y, {
        preferredSpecies: species,
        minRadius: 8,
        maxRadius: 15,
        attempts: 48,
      });

      if (!spawn) {
        break;
      }

      const ambient = buildAmbientData(
        this.ambientRng,
        species,
        spawn.x,
        spawn.y,
      );
      ambient.health =
        species === AMBIENT_SPECIES.SPIDER ? SPIDER_HEALTH : NIGHT_MOB_HEALTH;
      createAmbientEntity(this.ecs, {
        species,
        x: spawn.x,
        y: spawn.y,
        ambient,
      });
      spawned += 1;
    }

    return spawned;
  }

  isNight() {
    return (this.gameTime % DAY_NIGHT_CYCLE) >= DAY_LENGTH_SECONDS;
  }

  nightOverlayStrength() {
    const cycle = this.gameTime % DAY_NIGHT_CYCLE;

    if (cycle < DAY_LENGTH_SECONDS) {
      return 0;
    }

    const nightElapsed = cycle - DAY_LENGTH_SECONDS;
    return Math.max(
      0,
      Math.min(1, nightElapsed / 1.5, (NIGHT_LENGTH_SECONDS - nightElapsed) / 1.5),
    );
  }

  currentGameDay() {
    return gameDayAt(this.gameTime);
  }

  moonPhase() {
    return moonPhaseAt(this.gameTime);
  }

  nextPhaseDay(phase, fromDay = this.currentGameDay()) {
    const targetIndex = phase === "full" ? 4 : 0;
    const currentIndex = (fromDay - 1) % MOON_PHASES.length;
    const delta = (targetIndex - currentIndex + MOON_PHASES.length) % MOON_PHASES.length;
    return fromDay + delta;
  }

  villageRecipe(village) {
    const progress = this.villageProgress[village.id];
    if (!progress) {
      return null;
    }
    const line = civicLineForVillage(village);
    return line[progress.delivered] ?? null;
  }

  nearestVillageRequest() {
    const player = this.playerTransform;
    const candidates = this.villages
      .map((village) => ({
        village,
        recipe: this.villageRecipe(village),
      }))
      .filter(
        ({ recipe }) =>
          recipe?.noteRequired &&
          recipe.constellationId &&
          !this.observationNotes.has(recipe.constellationId),
      );

    candidates.sort(
      (a, b) =>
        Math.hypot(a.village.x - player.x, a.village.y - player.y) -
        Math.hypot(b.village.x - player.x, b.village.y - player.y),
    );
    return candidates[0] ?? null;
  }

  getObservationMission() {
    const current = this.nearestVillageRequest();

    if (current) {
      const { village, recipe } = current;
      const day = recipe.moonPhase
        ? this.nextPhaseDay(recipe.moonPhase, this.currentGameDay())
        : this.currentGameDay() + (this.isNight() ? 0 : 1);
      return {
        constellationId: recipe.constellationId,
        constellationName: recipe.constellationName,
        day,
        phase:
          recipe.moonPhase ??
          moonPhaseAt((day - 1) * DAY_NIGHT_CYCLE).id,
        villageId: village.id,
        villageName: village.name,
        source: "shaman",
        recipeId: recipe.id,
      };
    }

    const day = this.currentGameDay();
    const constellations = SKY_OBJECTS.filter(
      (object) => object.kind === "constellation",
    );
    const rng = createRng(`${this.world.seed}:observation:${day}`);
    const constellation = constellations[rng.int(0, constellations.length)];
    const phase = moonPhaseAt((day - 1) * DAY_NIGHT_CYCLE).id;

    return {
      constellationId: constellation.id,
      constellationName: constellation.name,
      day,
      phase,
      villageId: null,
      villageName: null,
      source: "free",
    };
  }

  renderObservationMission() {
    const mission = this.getObservationMission();
    const container = this.hud.skyMission;
    const notes = this.hud.skyNotes;
    const lens = lensForXp(this.lensXp);
    const nextLens = nextLensForXp(this.lensXp);

    if (this.hud.skyLens) {
      this.hud.skyLens.textContent = nextLens
        ? `${lens.name} · ${Math.round(this.lensXp)}/${nextLens.xp} XP`
        : `${lens.name} · nivel máximo`;
    }
    if (this.hud.btnSkyAlign) {
      const noteOwned = mission
        ? this.observationNotes.has(mission.constellationId)
        : true;
      this.hud.btnSkyAlign.disabled = !mission || noteOwned || Boolean(this.skyAlign);
      this.hud.btnSkyAlign.textContent = this.skyAlign
        ? "Alineando..."
        : noteOwned
          ? "Apunte completado"
          : "Alinear misión";
    }
    if (this.hud.btnSkyObserve) {
      this.hud.btnSkyObserve.disabled =
        this.skySelected?.kind !== "constellation" || Boolean(this.skyAlign);
    }

    if (container) {
      if (!mission) {
        container.classList.add("is-complete");
        container.textContent = "Todas las aldeas tienen su apunte. El cielo queda libre para observar.";
      } else {
        const noteOwned = this.observationNotes.has(mission.constellationId);
        container.classList.toggle("is-complete", noteOwned);
        container.innerHTML = noteOwned
          ? `Apunte completado: <strong>${mission.constellationName}</strong>. El brebaje lunar está listo para prepararse.`
          : `Misión de observación: localiza <strong>${mission.constellationName}</strong> el <strong>día ${mission.day}</strong> durante la noche.${mission.villageName ? ` El chamán de ${mission.villageName} lo necesita.` : ""} Puedes observarla antes para el diario; el día indicado da bonus.`;
      }
    }

    if (notes) {
      const names = [...this.observationNotes]
        .map((id) => SKY_OBJECTS.find((object) => object.id === id)?.name)
        .filter(Boolean);
      notes.textContent = names.length
        ? `Apuntes: ${names.join(" · ")}`
        : "Aún no tienes apuntes de observación.";
    }

    if (this.hud.skyDiary) {
      const title = document.createElement("div");
      title.className = "sky-diary-title";
      title.textContent = `Diario astronómico · ${this.investigations.length} registros`;
      const entries = this.investigations
        .slice(-12)
        .reverse()
        .map((entry) => {
          const item = document.createElement("div");
          const phaseName =
            MOON_PHASES.find((phase) => phase.id === entry.phase)?.name ??
            entry.phase;
          const bookName =
            SCIENCE_BOOKS.find((book) => book.id === entry.category)?.name ??
            entry.category;
          item.className = "sky-diary-entry";
          item.textContent = `Día ${entry.day} · ${phaseName} · ${entry.name} · ${Math.round(entry.precision)}% · ${bookName}`;
          return item;
        });
      if (entries.length === 0) {
        const empty = document.createElement("div");
        empty.className = "sky-diary-entry";
        empty.textContent = "Todavía no has registrado ninguna conjunción. Observa una constelación de noche.";
        entries.push(empty);
      }
      this.hud.skyDiary.replaceChildren(title, ...entries);
    }
  }

  skyScreenPoint(ra, dec, width, height) {
    const scaleX = 38 * this.skyView.zoom;
    const scaleY = 4.2 * this.skyView.zoom;
    const deltaRa = ((ra - this.skyView.ra + 36) % 24) - 12;
    return {
      x: width / 2 + deltaRa * scaleX,
      y: height / 2 + (dec - this.skyView.dec) * -scaleY,
    };
  }

  startSkyAlignment(objectId = null, freeObservation = false) {
    let mission = this.getObservationMission();
    let constellation = objectId
      ? SKY_OBJECTS.find((object) => object.id === objectId)
      : SKY_OBJECTS.find((object) => object.id === mission?.constellationId);

    if (!constellation || constellation.kind !== "constellation") {
      this.notify("Selecciona una constelación del catálogo.");
      return;
    }
    if (!freeObservation && !mission) {
      this.notify("No hay una investigación pendiente.");
      return;
    }
    if (!this.isNight()) {
      this.notify("La observación solo puede hacerse de noche.");
      return;
    }
    if (!freeObservation) {
      if (this.currentGameDay() !== mission.day) {
        this.notify(`La conjunción será visible el día ${mission.day}.`);
        return;
      }
    }

    const canvas = this.hud.skyCanvas;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    this.skySelected = constellation;
    this.skyView.ra = constellation.ra + 0.3;
    this.skyView.dec = constellation.dec + 1.5;
    this.skyView.zoom = Math.max(1.7, this.skyView.zoom);
    this.skyAlign = {
      mission:
        mission?.constellationId === constellation.id ? mission : null,
      constellation,
      freeObservation,
      companion: {
        ra: constellation.ra + 0.5,
        dec: constellation.dec + 2.2,
      },
      reticleX: rect.width * 0.25,
      reticleY: rect.height * 0.28,
      progress: 0,
      precision: 0,
      hold: 0,
    };
    this.renderObservatory();
    this.notify(
      "Mueve la retícula con el ratón o el dedo y mantén la conjunción estable.",
    );
  }

  observeSelectedSky() {
    if (this.skySelected?.kind !== "constellation") {
      this.notify("Selecciona primero una constelación.");
      return;
    }
    this.startSkyAlignment(this.skySelected.id, true);
  }

  updateSkyAlignment(deltaSeconds) {
    if (!this.skyAlign) {
      return;
    }
    const canvas = this.hud.skyCanvas;
    if (!canvas) {
      this.skyAlign = null;
      return;
    }
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const lens = lensForXp(this.lensXp);
    const targetA = this.skyScreenPoint(
      this.skyAlign.constellation.ra,
      this.skyAlign.constellation.dec,
      rect.width,
      rect.height,
    );
    const targetB = this.skyScreenPoint(
      this.skyAlign.companion.ra,
      this.skyAlign.companion.dec,
      rect.width,
      rect.height,
    );
    const tolerance = 30 + lens.tolerance;
    const distanceA = Math.hypot(
      this.skyAlign.reticleX - targetA.x,
      this.skyAlign.reticleY - targetA.y,
    );
    const distanceB = Math.hypot(
      this.skyAlign.reticleX - targetB.x,
      this.skyAlign.reticleY - targetB.y,
    );
    const aligned = distanceA <= tolerance && distanceB <= tolerance;
    const holdDuration = 1.6 * lens.holdMultiplier;

    if (aligned) {
      this.skyAlign.hold = Math.min(
        holdDuration,
        this.skyAlign.hold + deltaSeconds,
      );
      this.skyAlign.precision = Math.max(
        0,
        Math.min(
          100,
          100 -
            ((distanceA + distanceB) / (tolerance * 2)) * 45 +
            lens.qualityBonus,
        ),
      );
    } else {
      this.skyAlign.hold = Math.max(
        0,
        this.skyAlign.hold - deltaSeconds * 1.5,
      );
      this.skyAlign.precision = Math.max(0, this.skyAlign.precision - deltaSeconds * 20);
    }

    this.skyAlign.progress = Math.min(1, this.skyAlign.hold / holdDuration);
    this.drawSky();

    if (this.skyAlign.progress >= 1) {
      this.completeSkyAlignment();
    }
  }

  completeSkyAlignment() {
    const align = this.skyAlign;
    if (!align) {
      return;
    }
    const lens = lensForXp(this.lensXp);
    const missionBonus =
      align.mission &&
      align.mission.day === this.currentGameDay() &&
      this.isNight()
        ? 25
        : 0;
    const reward = investigationReward(
      align.constellation,
      align.precision,
      lens.qualityBonus,
    );
    reward.points += missionBonus;
    this.sciencePoints[reward.category] =
      (this.sciencePoints[reward.category] ?? 0) + reward.points;
    this.lensXp += reward.lensXp;
    const nextLens = lensForXp(this.lensXp);
    const previousLens = this.lensLevel;
    this.lensLevel = nextLens.id;
    this.observationNotes.add(align.constellation.id);
    this.observatoryDiscoveries.add(align.constellation.id);
    this.investigations.push({
      objectId: align.constellation.id,
      name: align.constellation.name,
      category: reward.category,
      day: this.currentGameDay(),
      phase: this.moonPhase().id,
      precision: Math.round(align.precision),
    });
    this.investigations = this.investigations.slice(-200);
    this.skyAlign = null;
    this.save();
    this.renderObservatory();
    this.effects.addText(
      `Conjunción ${Math.round(reward.precision)}%`,
      this.playerTransform.x,
      this.playerTransform.y,
      { color: "#9fc7ff" },
    );
    const bookName =
      SCIENCE_BOOKS.find((book) => book.id === reward.category)?.name ??
      reward.category;
    this.notify(
      missionBonus > 0
        ? `${align.constellation.name}: misión completada. Diario actualizado (+${reward.points} ${bookName}).`
        : `${align.constellation.name}: observación guardada en el diario (+${reward.points} ${bookName}).`,
    );
    if (this.lensLevel > previousLens) {
      this.notify(`Lentes mejorados: ${nextLens.name}.`);
    }
  }

  moonRequirementText(recipe) {
    const phases = recipe?.moonVariants
      ? Object.keys(recipe.moonVariants)
      : recipe?.moonPhases;
    if (!phases) {
      return "";
    }
    return phases
      .map((id) => MOON_PHASES.find((phase) => phase.id === id)?.name ?? id)
      .join(" o ");
  }

  cycleHudInfo() {
    const cycle = this.gameTime % DAY_NIGHT_CYCLE;
    const night = cycle >= DAY_LENGTH_SECONDS;
    const elapsed = night ? cycle - DAY_LENGTH_SECONDS : cycle;
    const minutes = Math.floor(elapsed / 60);
    const seconds = String(Math.floor(elapsed % 60)).padStart(2, "0");
    const moon = this.moonPhase();
    return {
      day: this.currentGameDay(),
      night,
      phase: night ? "Noche" : "Día",
      time: `${minutes}:${seconds}`,
      moon,
    };
  }

  toggleCycleInfo() {
    this.cycleExpanded = !this.cycleExpanded;
    this.hud.cycleStat?.classList.toggle("is-expanded", this.cycleExpanded);
    this.hud.cycleStat?.setAttribute(
      "aria-expanded",
      String(this.cycleExpanded),
    );
  }

  handleCycleKey(event) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    this.toggleCycleInfo();
  }

  toggleStatsCollapsed() {
    this.statsCollapsed = !this.statsCollapsed;
    saveStatsCollapsed(this.statsCollapsed);
    this.applyStatsCollapsed();
  }

  applyStatsCollapsed() {
    const panel = this.hud.statsPanel;
    const button = this.hud.btnStatsToggle;

    if (panel) {
      panel.classList.toggle("is-collapsed", this.statsCollapsed);
    }
    if (button) {
      button.setAttribute("aria-expanded", String(!this.statsCollapsed));
      button.setAttribute(
        "aria-label",
        this.statsCollapsed ? "Expandir datos" : "Contraer datos",
      );
    }
  }

  showCycleBanner(night) {
    const phase = night ? "night" : "day";
    const indicator = this.hud.cycleIndicator;
    const banner = this.hud.cycleBanner;

    if (indicator) {
      indicator.dataset.phase = phase;
      indicator.classList.remove("is-changing");
      void indicator.offsetWidth;
      indicator.classList.add("is-changing");
      window.setTimeout(() => indicator.classList.remove("is-changing"), 1000);
    }

    if (!banner) {
      return;
    }

    if (this.hud.cycleBannerText) {
      const day = this.currentGameDay();
      this.hud.cycleBannerText.textContent = night
        ? `Comienza la noche del día ${day}`
        : `Comienza el día ${day}`;
    }

    banner.dataset.phase = phase;
    banner.classList.remove("is-visible");
    void banner.offsetWidth;
    banner.classList.add("is-visible");

    if (this.cycleBannerTimer) {
      window.clearTimeout(this.cycleBannerTimer);
    }
    this.cycleBannerTimer = window.setTimeout(() => {
      banner.classList.remove("is-visible");
      this.cycleBannerTimer = null;
    }, 3600);
  }

  updateNightCombat(deltaSeconds) {
    const transform = this.playerTransform;
    let touching = false;
    let touchDamage = NIGHT_MOB_DAMAGE;

    for (const id of this.getAmbientIds()) {
      const ambient = this.ecs.getComponent(id, Component.AMBIENT);

      if (ambient.wave || ambient.companion || ambient.tamed) {
        continue;
      }

      if (
        ambient.species !== AMBIENT_SPECIES.NIGHTLING &&
        ambient.species !== AMBIENT_SPECIES.SPIDER &&
        ambient.species !== AMBIENT_SPECIES.WOLF
      ) {
        continue;
      }

      const mobTransform = this.ecs.getComponent(id, Component.TRANSFORM);
      const distance = Math.hypot(
        mobTransform.x - transform.x,
        mobTransform.y - transform.y,
      );
      const heightDelta = Math.abs(
        this.world.heightAt(mobTransform.x, mobTransform.y) -
          this.world.heightAt(transform.x, transform.y),
      );

      if (distance <= 1.15 && heightDelta <= 1) {
        touching = true;
        touchDamage =
          ambient.species === AMBIENT_SPECIES.WOLF
            ? WOLF_DAMAGE
            : NIGHT_MOB_DAMAGE;
        break;
      }
    }

    if (touching && this.mobDamageCooldown <= 0 && !this.isPlayerSheltered()) {
      this.mobDamageCooldown = NIGHT_MOB_ATTACK_INTERVAL;
      this.damagePlayer(touchDamage);
    }

    if (
      this.health < this.maxHealth &&
      this.gameTime - this.lastDamageTime > HEALTH_REGEN_DELAY
    ) {
      this.health = Math.min(
        this.maxHealth,
        this.health + HEALTH_REGEN_RATE * deltaSeconds,
      );
    }
  }

  damagePlayer(amount, { bypassReduction = false } = {}) {
    if (amount <= 0) {
      return;
    }

    const armorReduction =
      !bypassReduction && this.inventory.hasUpgrade("leatherArmor")
        ? ARMOR_DAMAGE_REDUCTION
        : 0;
    const potionReduction =
      !bypassReduction && this.resistanceBuffRemaining > 0 ? 0.35 : 0;
    const cloakReduction =
      !bypassReduction && this.inventory.hasUpgrade("wolfCloak")
        ? WOLF_CLOAK_DAMAGE_REDUCTION
        : 0;
    const reduction = Math.min(
      0.7,
      armorReduction + potionReduction + cloakReduction,
    );
    const damage = Math.max(1, Math.round(amount * (1 - reduction)));

    this.health = Math.max(0, this.health - damage);
    this.lastDamageTime = this.gameTime;
    this.effects.addText(`-${damage}`, this.playerTransform.x, this.playerTransform.y, {
      color: "#e06c75",
    });
    this.updateHealthHud();

    if (this.health <= 0) {
      this.handleDeath();
    }
  }

  handleDeath() {
    const spawn = this.spawnPoint ?? this.world.findSpawn();
    this.cancelPlayerAction();
    if (this.donkeyMounted) {
      const ambient = this.getDonkey();
      if (ambient) {
        ambient.mounted = false;
        ambient.anchorX = this.playerTransform.x;
        ambient.anchorY = this.playerTransform.y;
      }
      this.donkeyMounted = false;
    }
    this.swimRemaining = 0;
    this.health = this.maxHealth;
    this.playerTransform.x = spawn.x;
    this.playerTransform.y = spawn.y;
    this.resetPlayerVertical();
    this.cameraFollow = true;
    this.camera.x = spawn.x;
    this.camera.y = spawn.y;
    this.camera.z = this.world.heightAt(spawn.x, spawn.y) * 0.72;
    this.lastDamageTime = this.gameTime;
    this.mobDamageCooldown = NIGHT_MOB_ATTACK_INTERVAL * 2;
    this.updateHealthHud();
    this.save();
    this.notify("Has caído. Despiertas en tu punto inicial sin perder objetos.");
  }

  setupWorkers(saveState) {
    const savedWorkers = Array.isArray(saveState?.workers) ? saveState.workers : [];

    if (savedWorkers.length > 0) {
      for (const saved of savedWorkers) {
        const id = this.spawnWorker({
          x: saved.x,
          y: saved.y,
          name: saved.name,
          autoRepeat: saved.autoRepeat === true,
          autoRadius: Number.isFinite(saved.autoRadius)
            ? Math.max(1, Math.floor(saved.autoRadius))
            : WORKER_AUTO_RADIUS,
          silent: true,
        });

        if (id && saved.task) {
          if (saved.task.kind === "restore") {
            this.commandWorkerRestore(id, saved.task.x, saved.task.y, {
              silent: true,
            });
          } else {
            this.commandWorkerGather(id, saved.task.kind, saved.task.x, saved.task.y, {
              silent: true,
            });
          }
        }
      }
    } else {
      this.spawnWorker({ silent: true });
    }
  }

  getWorkerName(ids) {
    const used = new Set(ids.map((id) => this.ecs.getComponent(id, Component.WORKER).name));
    return (
      WORKER_NAMES.find((name) => !used.has(name)) ??
      `Duende ${ids.length + 1}`
    );
  }

  spawnWorker({
    x = null,
    y = null,
    name = null,
    autoRepeat = false,
    autoRadius = WORKER_AUTO_RADIUS,
    silent = false,
  } = {}) {
    const ids = this.getWorkerIds();

    if (ids.length >= MAX_WORKERS) {
      return null;
    }

    let position;

    if (
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      this.isActorWalkableAt(Math.floor(x), Math.floor(y)) &&
      !this.isTileOccupiedByWorker(x, y)
    ) {
      position = { x, y };
    } else {
      position = this.findWorkerSpawn();
    }

    const workerName = name || this.getWorkerName(ids);
    const id = createWorkerEntity(this.ecs, {
      x: position.x,
      y: position.y,
      name: workerName,
      autoRepeat,
      autoRadius,
    });

    if (!silent) {
      this.selectWorker(id);
      this.effects.addText(workerName, position.x, position.y, { color: "#9bd0ac" });
      this.notify(`${workerName} se une a la partida.`);
      this.updateHud();
    }

    return id;
  }

  findWorkerSpawn() {
    const transform = this.playerTransform;
    const tileX = Math.floor(transform.x);
    const tileY = Math.floor(transform.y);

    for (let radius = 1; radius <= 6; radius += 1) {
      const candidates = [];

      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) {
            continue;
          }

          const x = tileX + dx;
          const y = tileY + dy;

          if (!this.isActorWalkableAt(x, y)) {
            continue;
          }
          if (this.isTileOccupiedByWorker(x, y)) {
            continue;
          }
          if (
            this.campfires.some(
              (fire) => Math.floor(fire.x) === x && Math.floor(fire.y) === y,
            )
          ) {
            continue;
          }

          const screenSide = Math.abs(dx - dy);
          const frontBonus = dx + dy >= 0 ? 0.5 : 0;
          candidates.push({
            x: x + 0.5,
            y: y + 0.5,
            score: screenSide * 2 + frontBonus,
          });
        }
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        return { x: candidates[0].x, y: candidates[0].y };
      }
    }

    return { x: transform.x, y: transform.y };
  }

  isTileOccupiedByWorker(x, y, excludeId = null) {
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);

    return this.getWorkerIds().some((id) => {
      if (id === excludeId) {
        return false;
      }
      const transform = this.ecs.getComponent(id, Component.TRANSFORM);
      return Math.floor(transform.x) === tileX && Math.floor(transform.y) === tileY;
    });
  }

  selectWorker(id, { additive = false, toggle = false } = {}) {
    if (!this.ecs.hasComponent(id, Component.WORKER)) {
      return;
    }

    const multi = additive || toggle || this.selectionMode === "worker";

    if (multi) {
      if (this.selectedWorkerIds.has(id)) {
        this.selectedWorkerIds.delete(id);
      } else {
        this.selectedWorkerIds.add(id);
      }
    } else {
      this.selectedWorkerIds.clear();
      this.selectedWorkerIds.add(id);
    }

    this.selectedWorkerId = this.getSelectedWorkerIds()[0] ?? null;
    this.updateWorkerPanel();
  }

  deselectWorker() {
    this.selectedWorkerIds.clear();
    this.selectedWorkerId = null;
    this.updateWorkerPanel();
  }

  workerStatusText(worker) {
    if (worker.state === "restoring") {
      return "Restaurando veta";
    }
    if (worker.state === "gathering") {
      if (worker.task?.kind === "tree") {
        return "Talando madera";
      }
      if (worker.task?.kind === "bush") {
        return "Recolectando bayas";
      }
      if (worker.task?.kind === "grass") {
        return "Cortando hierba";
      }
      return "Minando piedra";
    }
    if (worker.state === "seeking") {
      return worker.task?.kind === "restore"
        ? "Yendo a la veta"
        : "Yendo al recurso";
    }
    if (worker.state === "moving") {
      return "Caminando";
    }
    return "Sin tarea";
  }

  updateWorkerPanel() {
    const panel = this.hud.workerPanel;

    if (!panel) {
      return;
    }

    const ids = this.getSelectedWorkerIds();
    if (ids.length === 0) {
      panel.hidden = true;
      this.selectedWorkerId = null;
      return;
    }

    const workers = ids
      .map((id) => this.ecs.getComponent(id, Component.WORKER))
      .filter(Boolean);
    if (workers.length === 0) {
      panel.hidden = true;
      this.selectedWorkerId = null;
      return;
    }

    const worker = workers[0];
    this.selectedWorkerId = ids[0];
    panel.hidden = false;
    this.hud.workerName.textContent =
      workers.length > 1 ? `${workers.length} duendes` : worker.name;
    this.hud.workerStatus.textContent =
      workers.length > 1 ? "Selección múltiple" : this.workerStatusText(worker);

    const anyActive = workers.some((entry) => entry.state !== "idle");
    if (this.hud.btnWorkerCancel) {
      this.hud.btnWorkerCancel.disabled = !anyActive;
    }

    const autoOn = workers.every((entry) => entry.autoRepeat === true);
    if (this.hud.btnWorkerAuto) {
      this.hud.btnWorkerAuto.textContent = autoOn ? "Auto: ON" : "Auto: OFF";
      this.hud.btnWorkerAuto.classList.toggle("is-active", autoOn);
      this.hud.btnWorkerAuto.setAttribute("aria-pressed", String(autoOn));
      this.hud.btnWorkerAuto.title = autoOn
        ? `Busca m\u00E1s recursos en ${(worker.autoRadius ?? WORKER_AUTO_RADIUS) + this.workerMapBonus} bloques`
        : "Activar tarea autom\u00E1tica";
    }

    if (this.hud.btnWorkerRestore) {
      const unlocked = this.inventory.hasUpgrade("veinRestorer");
      const active = workers.some((entry) => entry.task?.kind === "restore");
      const candidate =
        unlocked && !active
          ? ids.some((id) => {
              const entry = this.ecs.getComponent(id, Component.WORKER);
              if (!entry) {
                return false;
              }
              const radius =
                (entry.autoRadius ?? WORKER_AUTO_RADIUS) + this.workerMapBonus;
              return Boolean(this.findNearestHarvestedMineral(id, radius));
            })
          : false;

      this.hud.btnWorkerRestore.hidden = !unlocked;
      this.hud.btnWorkerRestore.disabled = !active && !candidate;
      this.hud.btnWorkerRestore.textContent = active
        ? "Restaurando..."
        : "Restaurar veta";
      this.hud.btnWorkerRestore.title = active
        ? "Los duendes están restaurando vetas"
        : candidate
          ? "Env\u00EDa a los duendes a restaurar vetas agotadas (4 min)"
          : "No hay vetas agotadas cerca";
    }
  }

  handleWorkerAutoToggle() {
    const workers = this.getSelectedWorkerIds()
      .map((id) => this.ecs.getComponent(id, Component.WORKER))
      .filter(Boolean);
    if (workers.length === 0) {
      return;
    }

    const next = !workers.every((entry) => entry.autoRepeat === true);
    for (const worker of workers) {
      worker.autoRepeat = next;
    }

    this.updateWorkerPanel();
    this.save();
    this.notify(
      next
        ? `${workers.length} duende${workers.length === 1 ? "" : "s"} repetir\u00E1n la tarea.`
        : `${workers.length} duende${workers.length === 1 ? "" : "s"} se detendr\u00E1n al terminar.`,
    );
  }

  handleWorkerRestore() {
    const ids = this.getSelectedWorkerIds();
    if (ids.length === 0) {
      return;
    }

    if (!this.inventory.hasUpgrade("veinRestorer")) {
      this.notify("Necesitas el Restaurador de vetas.");
      return;
    }

    let assigned = 0;
    for (const id of ids) {
      const worker = this.ecs.getComponent(id, Component.WORKER);
      if (!worker || worker.task?.kind === "restore") {
        continue;
      }
      const radius =
        (worker.autoRadius ?? WORKER_AUTO_RADIUS) + this.workerMapBonus;
      const target = this.findNearestHarvestedMineral(id, radius);
      if (target) {
        this.commandWorkerRestore(id, target.x, target.y, { silent: true });
        assigned += 1;
      }
    }

    if (assigned === 0) {
      this.notify("No hay vetas agotadas cerca.");
    } else {
      this.notify(
        `${assigned} duende${assigned === 1 ? "" : "s"} restaurando veta${
          assigned === 1 ? "" : "s"
        }.`,
      );
    }
    this.updateWorkerPanel();
  }

  handleWorkerCancel() {
    const ids = this.getSelectedWorkerIds();
    let cancelled = 0;

    for (const id of ids) {
      if (this.cancelWorkerTask(id, { silent: true })) {
        cancelled += 1;
      }
    }

    if (cancelled > 0) {
      this.notify(
        `${cancelled} duende${cancelled === 1 ? "" : "s"} dejaron la tarea.`,
      );
    }
  }

  handleWorkerDeselect() {
    this.deselectWorker();
  }

  getIdleWorkerIds() {
    return this.getWorkerIds().filter((id) => {
      const worker = this.ecs.getComponent(id, Component.WORKER);
      return worker && worker.state === "idle" && !worker.task;
    });
  }

  handleIdleWorkerRequest() {
    const idleIds = this.getIdleWorkerIds();

    if (idleIds.length === 0) {
      this.notify("No hay duendes inactivos.");
      return;
    }

    const currentIndex = idleIds.indexOf(this.selectedWorkerId);
    const nextId = idleIds[(currentIndex + 1) % idleIds.length];
    const transform = this.ecs.getComponent(nextId, Component.TRANSFORM);
    const worker = this.ecs.getComponent(nextId, Component.WORKER);

    this.selectWorker(nextId);
    this.cameraFollow = true;
    this.camera.x = transform.x;
    this.camera.y = transform.y;
    this.effects.addText(worker.name, transform.x, transform.y, { color: "#9bd0ac" });
    this.notify(
      idleIds.length === 1
        ? `${worker.name} está inactivo.`
        : `${worker.name} · ${idleIds.length} duendes inactivos.`,
    );
  }

  getSelectedWorkerIds() {
    return [...this.selectedWorkerIds].filter((id) =>
      this.ecs.hasComponent(id, Component.WORKER),
    );
  }

  handleFiefMultiSelectChange(event) {
    this.setSelectionMode("fief", event.target.checked);
  }

  handleWorkerMultiSelectChange(event) {
    this.setSelectionMode("worker", event.target.checked);
  }

  setSelectionMode(target, enabled) {
    if (enabled) {
      this.selectionMode = target;
    } else if (this.selectionMode === target) {
      this.selectionMode = null;
    }

    if (target === "fief" && this.hud.workerMultiSelect) {
      this.hud.workerMultiSelect.checked = false;
    }
    if (target === "worker" && this.hud.fiefMultiSelect) {
      this.hud.fiefMultiSelect.checked = false;
    }

    this.clearSelectionBox();

    if (enabled) {
      this.notify(
        target === "fief"
          ? "Selección múltiple de unidades activada. Arrastra o toca para agrupar."
          : "Selección múltiple de duendes activada. Arrastra o toca para agrupar.",
      );
    } else {
      this.notify("Selección múltiple desactivada.");
    }
  }

  selectWorkers(ids, { additive = false } = {}) {
    if (!additive) {
      this.selectedWorkerIds.clear();
    }

    for (const id of ids) {
      if (this.ecs.hasComponent(id, Component.WORKER)) {
        this.selectedWorkerIds.add(id);
      }
    }

    this.selectedWorkerId = this.getSelectedWorkerIds()[0] ?? null;
    this.updateWorkerPanel();
  }

  selectFiefUnits(units, { additive = false } = {}) {
    const valid = units.filter((unit) => unit?.hp > 0);

    if (valid.length === 0) {
      if (!additive) {
        this.clearFiefSelection();
      }
      return;
    }

    const type = valid[0].type;

    if (additive && this.selectedUnitType && type !== this.selectedUnitType) {
      this.selectedUnitIds.clear();
    }
    if (!additive) {
      this.selectedUnitIds.clear();
    }

    this.selectedUnitType = type;
    for (const unit of valid) {
      if (unit.type === type) {
        this.selectedUnitIds.add(unit.id);
      }
    }

    const count = this.selectedUnitIds.size;
    this.notify(
      `${count} unidad${count === 1 ? "" : "es"} seleccionada${
        count === 1 ? "" : "s"
      }.`,
    );
  }

  clearSelectionBox() {
    this.selectionDrag = null;
    if (this.hud.selectionBox) {
      this.hud.selectionBox.hidden = true;
    }
  }

  updateSelectionBox() {
    const box = this.hud.selectionBox;
    const drag = this.selectionDrag;
    if (!box || !drag) {
      return;
    }

    const left = Math.min(drag.startX, drag.currentX);
    const top = Math.min(drag.startY, drag.currentY);
    const width = Math.abs(drag.currentX - drag.startX);
    const height = Math.abs(drag.currentY - drag.startY);

    box.hidden = width < 4 && height < 4;
    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
    box.style.width = `${width}px`;
    box.style.height = `${height}px`;
  }

  finalizeSelectionRect(left, top, right, bottom, additive = false) {
    const inside = (screen) =>
      screen.x >= left &&
      screen.x <= right &&
      screen.y >= top &&
      screen.y <= bottom;

    if (this.selectionMode === "fief") {
      const units = this.units.filter((unit) => {
        if (unit.hp <= 0) {
          return false;
        }
        const screen = this.camera.project(
          unit.x,
          unit.y,
          this.world.heightAt(unit.x, unit.y) * 0.72,
        );
        return inside(screen);
      });
      this.selectFiefUnits(units, { additive });
      return;
    }

    if (this.selectionMode === "worker") {
      const ids = [];
      for (const id of this.getWorkerIds()) {
        const transform = this.ecs.getComponent(id, Component.TRANSFORM);
        if (!transform) {
          continue;
        }
        const screen = this.camera.project(
          transform.x,
          transform.y,
          this.world.heightAt(transform.x, transform.y) * 0.72,
        );
        if (inside(screen)) {
          ids.push(id);
        }
      }
      this.selectWorkers(ids, { additive });
    }
  }

  handleDragEnd(screenX, screenY, event = {}) {
    if (!this.selectionDrag) {
      return;
    }

    this.selectionDrag.currentX = screenX;
    this.selectionDrag.currentY = screenY;
    this.updateSelectionBox();

    const left = Math.min(this.selectionDrag.startX, screenX);
    const right = Math.max(this.selectionDrag.startX, screenX);
    const top = Math.min(this.selectionDrag.startY, screenY);
    const bottom = Math.max(this.selectionDrag.startY, screenY);

    this.clearSelectionBox();
    if (right - left < 4 && bottom - top < 4) {
      return;
    }
    this.finalizeSelectionRect(left, top, right, bottom, event.shiftKey === true);
  }

  commandWorkersGather(ids, kind, x, y) {
    const workers = ids.filter((id) =>
      this.ecs.hasComponent(id, Component.WORKER),
    );
    if (workers.length === 0) {
      return;
    }
    if (workers.length === 1) {
      this.commandWorkerGather(workers[0], kind, x, y);
      return;
    }

    const candidates = [];
    const seen = new Set();
    for (let radius = 0; radius <= 6; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (radius > 0 && Math.max(Math.abs(dx), Math.abs(dy)) !== radius) {
            continue;
          }
          const nx = x + dx;
          const ny = y + dy;
          const key = `${nx}:${ny}`;
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          if (this.world.getNodeAt(kind, nx, ny)) {
            candidates.push({
              x: nx,
              y: ny,
              distance: Math.hypot(nx - x, ny - y),
            });
          }
        }
      }
    }

    candidates.sort((a, b) => a.distance - b.distance);
    const used = new Set();
    let assigned = 0;

    for (const id of workers) {
      const candidate = candidates.find(
        (entry) => !used.has(`${entry.x}:${entry.y}`),
      );
      if (!candidate) {
        break;
      }
      used.add(`${candidate.x}:${candidate.y}`);
      this.commandWorkerGather(id, kind, candidate.x, candidate.y, {
        silent: true,
      });
      assigned += 1;
    }

    if (assigned === 0) {
      this.notify("No hay recursos de ese tipo cerca.");
    } else if (assigned < workers.length) {
      this.notify(`${assigned} duendes asignados; faltan recursos cercanos.`);
    } else {
      this.notify(`${assigned} duendes asignados a recursos.`);
    }
  }

  commandWorkersMove(ids, x, y) {
    const workers = ids.filter((id) =>
      this.ecs.hasComponent(id, Component.WORKER),
    );
    if (workers.length === 0) {
      return;
    }

    const offsets = [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ];

    let moved = 0;
    for (let index = 0; index < workers.length; index += 1) {
      const [dx, dy] = offsets[index % offsets.length];
      const x2 = x + dx;
      const y2 = y + dy;
      if (!this.isActorWalkableAt(x2, y2)) {
        continue;
      }
      this.commandWorkerMove(workers[index], x2, y2);
      moved += 1;
    }

    if (moved === 0) {
      this.notify("No hay una casilla libre cerca para los duendes.");
    } else {
      this.notify(
        `${moved} duende${moved === 1 ? "" : "s"} en camino.`,
      );
    }
  }

  handleCraftSwipeStart(event) {
    if (!this.craftingOpen || event.button !== 0) {
      return;
    }

    if (
      event.target.closest(
        "input, textarea, select, button, a, [contenteditable='true']",
      )
    ) {
    this.craftSwipe = null;
    this.craftEdgeSwipe = null;
      return;
    }

    this.craftSwipe = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: performance.now(),
    };
  }

  handleCraftSwipeEnd(event) {
    const swipe = this.craftSwipe;

    if (!swipe || event.pointerId !== swipe.pointerId) {
      return;
    }

    this.craftSwipe = null;
    const dx = event.clientX - swipe.startX;
    const dy = event.clientY - swipe.startY;
    const elapsed = performance.now() - swipe.startedAt;

    if (
      this.craftingOpen &&
      dx > 70 &&
      Math.abs(dx) > Math.abs(dy) * 1.25 &&
      elapsed < 900
    ) {
      this.closeCrafting();
    }
  }

  handleCraftSwipeCancel(event) {
    if (!this.craftSwipe || event.pointerId !== this.craftSwipe.pointerId) {
      return;
    }
    this.craftSwipe = null;
  }

  handleCraftEdgeSwipeStart(event) {
    if (this.craftingOpen || event.button !== 0) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const localX = event.clientX - rect.left;

    if (localX < rect.width - 56) {
      this.craftEdgeSwipe = null;
      return;
    }

    this.craftEdgeSwipe = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: performance.now(),
    };
  }

  handleCraftEdgeSwipeEnd(event) {
    const swipe = this.craftEdgeSwipe;

    if (!swipe || event.pointerId !== swipe.pointerId) {
      return;
    }

    this.craftEdgeSwipe = null;
    const dx = event.clientX - swipe.startX;
    const dy = event.clientY - swipe.startY;
    const elapsed = performance.now() - swipe.startedAt;

    if (
      !this.craftingOpen &&
      dx < -70 &&
      Math.abs(dx) > Math.abs(dy) * 1.25 &&
      elapsed < 900
    ) {
      this.toggleCrafting();
    }
  }

  showTooltipFor(element) {
    const tooltip = this.hud.tooltip;
    const text = element?.dataset?.tooltip;

    if (!tooltip || !text) {
      return;
    }

    tooltip.textContent = text;
    tooltip.hidden = false;

    const rect = element.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();
    const margin = 8;
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.max(margin, Math.min(window.innerWidth - tipRect.width - margin, left));
    let top = rect.top - tipRect.height - margin;

    if (top < margin) {
      top = rect.bottom + margin;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  hideTooltip() {
    this.tooltipTarget = null;
    if (this.hud.tooltip) {
      this.hud.tooltip.hidden = true;
    }
  }

  clearTooltipTimer() {
    if (this.tooltipTimer !== null) {
      window.clearTimeout(this.tooltipTimer);
      this.tooltipTimer = null;
    }
  }

  handleTooltipOver(event) {
    if (event.pointerType === "touch") {
      return;
    }

    const target = event.target.closest?.("[data-tooltip]");

    if (!target) {
      return;
    }
    if (event.relatedTarget && target.contains(event.relatedTarget)) {
      return;
    }

    this.showTooltipFor(target);
  }

  handleTooltipOut(event) {
    const target = event.target.closest?.("[data-tooltip]");

    if (!target) {
      return;
    }
    if (event.relatedTarget && target.contains(event.relatedTarget)) {
      return;
    }

    this.hideTooltip();
  }

  handleTooltipDown(event) {
    const target = event.target.closest?.("[data-tooltip]");

    this.clearTooltipTimer();
    this.tooltipTarget = target ?? null;

    if (!target) {
      return;
    }

    if (event.pointerType === "mouse") {
      return;
    }

    this.tooltipPointer = event.pointerId;
    this.tooltipStart = { x: event.clientX, y: event.clientY };
    this.tooltipTimer = window.setTimeout(() => {
      this.tooltipTimer = null;
      this.showTooltipFor(target);
    }, 450);
  }

  handleTooltipMove(event) {
    if (
      this.tooltipTimer === null ||
      event.pointerId !== this.tooltipPointer ||
      !this.tooltipStart
    ) {
      return;
    }

    if (
      Math.hypot(
        event.clientX - this.tooltipStart.x,
        event.clientY - this.tooltipStart.y,
      ) > 10
    ) {
      this.clearTooltipTimer();
      this.hideTooltip();
    }
  }

  handleTooltipRelease() {
    this.clearTooltipTimer();
    this.tooltipPointer = null;
    this.tooltipStart = null;

    if (this.tooltipTarget) {
      this.hideTooltip();
    }
  }

  handleTooltipCancel() {
    this.clearTooltipTimer();
    this.tooltipPointer = null;
    this.tooltipStart = null;
    this.hideTooltip();
  }

  start() {
    if (this.running) {
      return;
    }

    this.running = true;
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(this.canvas.parentElement);
    this.resize();
    this.input.attach();
    this.hud.btnCraft?.addEventListener("click", this.toggleCrafting);
    this.hud.btnRecipes?.addEventListener("click", this.toggleRecipeBook);
    this.hud.btnRotateLeft?.addEventListener("click", this.handleRotateLeft);
    this.hud.btnRotateRight?.addEventListener("click", this.handleRotateRight);
    this.hud.btnRecipeBookClose?.addEventListener("click", this.closeRecipeBook);
    this.hud.recipeBookSearch?.addEventListener("input", this.handleRecipeBookSearch);
    this.hud.btnCraftClose?.addEventListener("click", this.closeCrafting);
    this.hud.craftTabs?.addEventListener("click", this.handleCraftTabsClick);
    this.hud.craftSearch?.addEventListener("input", this.handleCraftSearch);
    this.hud.btnPlaceFire?.addEventListener("click", this.handlePlaceRequest);
    this.hud.btnPlaceSelected?.addEventListener("click", this.handlePlaceSelected);
    this.hud.btnDrop?.addEventListener("click", this.handleHudDrop);
    this.hud.btnInventoryDrop?.addEventListener("click", this.handleInventoryDrop);
    this.hud.btnInventoryDropStack?.addEventListener("click", this.handleInventoryDropStack);
    this.hud.btnCoffee?.addEventListener("click", this.drinkCoffee);
    this.hud.recipeList?.addEventListener("click", this.handleRecipeListClick);
    this.hud.inventory?.addEventListener("click", this.handleInventoryClick);
    this.hud.btnInventoryClose?.addEventListener("click", this.closeInventory);
    this.hud.inventoryPanel?.addEventListener("click", this.handleInventoryClick);
    this.hud.inventoryPanel?.addEventListener("pointerdown", this.handleInventoryPointerDown);
    window.addEventListener("pointermove", this.handleInventoryPointerMove);
    window.addEventListener("pointerup", this.handleInventoryPointerUp);
    window.addEventListener("pointercancel", this.handleInventoryPointerUp);
    this.hud.btnChestClose?.addEventListener("click", this.closeChest);
    this.hud.chestBackpack?.addEventListener("click", this.handleChestClick);
    this.hud.chestStorage?.addEventListener("click", this.handleChestClick);
    this.hud.btnUniversityClose?.addEventListener("click", this.closeUniversity);
    this.hud.universityTabs?.addEventListener("click", this.handleUniversityTabsClick);
    this.hud.universityBody?.addEventListener("click", this.handleUniversityBodyClick);
    this.hud.compassHud?.addEventListener("click", this.toggleMap);
    this.hud.btnCrossWaypoint?.addEventListener("click", this.handleCrossWaypoint);
    this.hud.btnMapClose?.addEventListener("click", this.closeMap);
    this.hud.btnMapClear?.addEventListener("click", this.clearWaypoint);
    this.hud.btnMapWalk?.addEventListener("click", this.walkToWaypoint);
    this.hud.btnMapCenter?.addEventListener("click", this.renderMap);
    this.hud.mapCanvas?.addEventListener("click", this.handleMapPointer);
    this.hud.mapLandmarks?.addEventListener("click", this.handleMapLandmarkClick);
    this.hud.btnGameMode?.addEventListener("click", this.toggleGameMode);
    this.hud.btnFief?.addEventListener("click", this.toggleFief);
    this.hud.btnFiefClose?.addEventListener("click", this.closeFief);
    this.hud.fiefModes?.addEventListener("click", this.handleFiefClick);
    this.hud.fiefVillages?.addEventListener("click", this.handleFiefClick);
    this.hud.fiefContent?.addEventListener("click", this.handleFiefClick);
    this.hud.btnObservatoryClose?.addEventListener("click", this.closeObservatory);
    this.hud.btnSkyAlign?.addEventListener("click", this.startSkyAlignment);
    this.hud.btnSkyObserve?.addEventListener("click", this.observeSelectedSky);
    this.hud.btnVillageClose?.addEventListener("click", this.closeVillage);
    this.hud.btnVillagePrepare?.addEventListener("click", this.prepareVillagePotion);
    this.hud.btnVillageDeliver?.addEventListener("click", this.deliverVillageRequest);
    this.hud.btnVillageMarket?.addEventListener("click", this.openTrade);
    this.hud.btnTradeClose?.addEventListener("click", this.closeTrade);
    this.hud.btnTradeCreate?.addEventListener("click", this.createTradeRoute);
    this.hud.tradeVillages?.addEventListener("click", this.handleTradeClick);
    this.hud.tradeRoutes?.addEventListener("click", this.handleTradeClick);
    this.hud.skySearch?.addEventListener("input", this.handleSkySearch);
    this.hud.skyList?.addEventListener("click", this.handleSkyListClick);
    this.hud.skyCanvas?.addEventListener("pointerdown", this.handleSkyPointerDown);
    this.hud.skyCanvas?.addEventListener("pointermove", this.handleSkyPointerMove);
    this.hud.skyCanvas?.addEventListener("pointerup", this.handleSkyPointerUp);
    this.hud.skyCanvas?.addEventListener("pointercancel", this.handleSkyPointerUp);
    this.hud.skyCanvas?.addEventListener("wheel", this.handleSkyWheel, { passive: false });
    this.hud.btnStatsToggle?.addEventListener("click", this.toggleStatsCollapsed);
    this.hud.cycleStat?.addEventListener("click", this.toggleCycleInfo);
    this.hud.cycleStat?.addEventListener("keydown", this.handleCycleKey);
    this.hud.btnWorkerAuto?.addEventListener("click", this.handleWorkerAutoToggle);
    this.hud.btnWorkerRestore?.addEventListener("click", this.handleWorkerRestore);
    this.hud.btnWorkerCancel?.addEventListener("click", this.handleWorkerCancel);
    this.hud.btnWorkerDeselect?.addEventListener("click", this.handleWorkerDeselect);
    this.hud.btnIdleWorker?.addEventListener("click", this.handleIdleWorkerRequest);
    this.hud.fiefMultiSelect?.addEventListener("change", this.handleFiefMultiSelectChange);
    this.hud.workerMultiSelect?.addEventListener("change", this.handleWorkerMultiSelectChange);
    if (this.hud.fiefMultiSelect) {
      this.hud.fiefMultiSelect.checked = false;
    }
    if (this.hud.workerMultiSelect) {
      this.hud.workerMultiSelect.checked = false;
    }
    this.hud.craftPanel?.addEventListener("pointerdown", this.handleCraftSwipeStart);
    this.canvas.addEventListener("pointerdown", this.handleCraftEdgeSwipeStart);
    window.addEventListener("pointerup", this.handleCraftEdgeSwipeEnd);
    window.addEventListener("pointercancel", this.handleCraftEdgeSwipeEnd);
    window.addEventListener("pointerup", this.handleCraftSwipeEnd);
    window.addEventListener("pointercancel", this.handleCraftSwipeCancel);
    this.hud.btnQuest?.addEventListener("click", this.toggleQuest);
    this.hud.btnQuestClose?.addEventListener("click", this.closeQuest);
    this.hud.questList?.addEventListener("click", this.handleQuestClick);
    this.hud.btnBirdClose?.addEventListener("click", this.closeBirdPanel);
    this.hud.btnWolfClose?.addEventListener("click", this.closeWolfDen);
    this.hud.btnWolfClaim?.addEventListener("click", this.claimWolfMission);
    for (const container of [this.hud.inventory, this.hud.recipeList]) {
      container?.addEventListener("pointerover", this.handleTooltipOver);
      container?.addEventListener("pointerout", this.handleTooltipOut);
      container?.addEventListener("pointerdown", this.handleTooltipDown);
      container?.addEventListener("pointermove", this.handleTooltipMove);
    }
    window.addEventListener("pointerup", this.handleTooltipRelease);
    window.addEventListener("pointercancel", this.handleTooltipCancel);
    this.hud.btnAttack?.addEventListener("click", this.attack);
    if (this.hud.btnAttack) {
      this.hud.btnAttack.hidden = false;
    }
    if (loadTouchControls()) {
      this.touchControls = new TouchControls(this);
      this.touchControls.attach();
    }
    this.camera.x = this.playerTransform.x;
    this.camera.y = this.playerTransform.y;
    this.camera.z = this.world.heightAt(
      this.playerTransform.x,
      this.playerTransform.y,
    ) * 0.72;
    this.save();
    if (this.network) {
      this.sendNetworkState();
      this.sendNetworkInventory();
    }
    document.addEventListener("visibilitychange", this.handleVisibility);
    window.addEventListener("pagehide", this.handlePageHide);
    this.lastTime = performance.now();
    this.raf = window.requestAnimationFrame(this.frame);
    this.renderCraftProgress();
    this.updateQuestButton();
    this.updateHud();
    this.applyStatsCollapsed();
    this.showCycleBanner(this.isNight());

    if (this.isNewGame && !this.network && this.getWorkerIds().length > 0) {
      this.notify("Haz clic en un duende y luego en un recurso para darle una tarea.");
    }
  }

  stop() {
    if (!this.running) {
      return;
    }

    this.running = false;
    window.cancelAnimationFrame(this.raf);
    this.raf = null;
    if (this.wolfHintTimer) {
      window.clearTimeout(this.wolfHintTimer);
      this.wolfHintTimer = null;
    }
    this.input.detach();
    this.hud.btnCraft?.removeEventListener("click", this.toggleCrafting);
    this.hud.btnRecipes?.removeEventListener("click", this.toggleRecipeBook);
    this.hud.btnRotateLeft?.removeEventListener("click", this.handleRotateLeft);
    this.hud.btnRotateRight?.removeEventListener("click", this.handleRotateRight);
    this.hud.btnRecipeBookClose?.removeEventListener("click", this.closeRecipeBook);
    this.hud.recipeBookSearch?.removeEventListener("input", this.handleRecipeBookSearch);
    this.hud.btnCraftClose?.removeEventListener("click", this.closeCrafting);
    this.hud.craftTabs?.removeEventListener("click", this.handleCraftTabsClick);
    this.hud.craftSearch?.removeEventListener("input", this.handleCraftSearch);
    this.hud.btnPlaceFire?.removeEventListener("click", this.handlePlaceRequest);
    this.hud.btnPlaceSelected?.removeEventListener("click", this.handlePlaceSelected);
    this.hud.btnDrop?.removeEventListener("click", this.handleHudDrop);
    this.hud.btnInventoryDrop?.removeEventListener("click", this.handleInventoryDrop);
    this.hud.btnInventoryDropStack?.removeEventListener("click", this.handleInventoryDropStack);
    this.hud.btnCoffee?.removeEventListener("click", this.drinkCoffee);
    this.hud.recipeList?.removeEventListener("click", this.handleRecipeListClick);
    this.hud.inventory?.removeEventListener("click", this.handleInventoryClick);
    this.hud.btnInventoryClose?.removeEventListener("click", this.closeInventory);
    this.hud.inventoryPanel?.removeEventListener("click", this.handleInventoryClick);
    this.hud.inventoryPanel?.removeEventListener("pointerdown", this.handleInventoryPointerDown);
    window.removeEventListener("pointermove", this.handleInventoryPointerMove);
    window.removeEventListener("pointerup", this.handleInventoryPointerUp);
    window.removeEventListener("pointercancel", this.handleInventoryPointerUp);
    this.hud.btnChestClose?.removeEventListener("click", this.closeChest);
    this.hud.chestBackpack?.removeEventListener("click", this.handleChestClick);
    this.hud.chestStorage?.removeEventListener("click", this.handleChestClick);
    this.hud.btnUniversityClose?.removeEventListener("click", this.closeUniversity);
    this.hud.universityTabs?.removeEventListener("click", this.handleUniversityTabsClick);
    this.hud.universityBody?.removeEventListener("click", this.handleUniversityBodyClick);
    this.hud.compassHud?.removeEventListener("click", this.toggleMap);
    this.hud.btnCrossWaypoint?.removeEventListener("click", this.handleCrossWaypoint);
    this.hud.btnMapClose?.removeEventListener("click", this.closeMap);
    this.hud.btnMapClear?.removeEventListener("click", this.clearWaypoint);
    this.hud.btnMapWalk?.removeEventListener("click", this.walkToWaypoint);
    this.hud.btnMapCenter?.removeEventListener("click", this.renderMap);
    this.hud.mapCanvas?.removeEventListener("click", this.handleMapPointer);
    this.hud.mapLandmarks?.removeEventListener("click", this.handleMapLandmarkClick);
    this.hud.btnGameMode?.removeEventListener("click", this.toggleGameMode);
    this.hud.btnFief?.removeEventListener("click", this.toggleFief);
    this.hud.btnFiefClose?.removeEventListener("click", this.closeFief);
    this.hud.fiefModes?.removeEventListener("click", this.handleFiefClick);
    this.hud.fiefVillages?.removeEventListener("click", this.handleFiefClick);
    this.hud.fiefContent?.removeEventListener("click", this.handleFiefClick);
    this.hud.btnObservatoryClose?.removeEventListener("click", this.closeObservatory);
    this.hud.btnSkyAlign?.removeEventListener("click", this.startSkyAlignment);
    this.hud.btnSkyObserve?.removeEventListener("click", this.observeSelectedSky);
    this.hud.btnVillageClose?.removeEventListener("click", this.closeVillage);
    this.hud.btnVillagePrepare?.removeEventListener("click", this.prepareVillagePotion);
    this.hud.btnVillageDeliver?.removeEventListener("click", this.deliverVillageRequest);
    this.hud.btnVillageMarket?.removeEventListener("click", this.openTrade);
    this.hud.btnTradeClose?.removeEventListener("click", this.closeTrade);
    this.hud.btnTradeCreate?.removeEventListener("click", this.createTradeRoute);
    this.hud.tradeVillages?.removeEventListener("click", this.handleTradeClick);
    this.hud.tradeRoutes?.removeEventListener("click", this.handleTradeClick);
    this.hud.skySearch?.removeEventListener("input", this.handleSkySearch);
    this.hud.skyList?.removeEventListener("click", this.handleSkyListClick);
    this.hud.skyCanvas?.removeEventListener("pointerdown", this.handleSkyPointerDown);
    this.hud.skyCanvas?.removeEventListener("pointermove", this.handleSkyPointerMove);
    this.hud.skyCanvas?.removeEventListener("pointerup", this.handleSkyPointerUp);
    this.hud.skyCanvas?.removeEventListener("pointercancel", this.handleSkyPointerUp);
    this.hud.skyCanvas?.removeEventListener("wheel", this.handleSkyWheel);
    this.hud.btnStatsToggle?.removeEventListener("click", this.toggleStatsCollapsed);
    this.hud.cycleStat?.removeEventListener("click", this.toggleCycleInfo);
    this.hud.cycleStat?.removeEventListener("keydown", this.handleCycleKey);
    this.hud.btnWorkerAuto?.removeEventListener("click", this.handleWorkerAutoToggle);
    this.hud.btnWorkerRestore?.removeEventListener("click", this.handleWorkerRestore);
    this.hud.btnWorkerCancel?.removeEventListener("click", this.handleWorkerCancel);
    this.hud.btnWorkerDeselect?.removeEventListener("click", this.handleWorkerDeselect);
    this.hud.btnIdleWorker?.removeEventListener("click", this.handleIdleWorkerRequest);
    this.hud.fiefMultiSelect?.removeEventListener("change", this.handleFiefMultiSelectChange);
    this.hud.workerMultiSelect?.removeEventListener("change", this.handleWorkerMultiSelectChange);
    this.hud.craftPanel?.removeEventListener("pointerdown", this.handleCraftSwipeStart);
    this.canvas.removeEventListener("pointerdown", this.handleCraftEdgeSwipeStart);
    window.removeEventListener("pointerup", this.handleCraftEdgeSwipeEnd);
    window.removeEventListener("pointercancel", this.handleCraftEdgeSwipeEnd);
    window.removeEventListener("pointerup", this.handleCraftSwipeEnd);
    window.removeEventListener("pointercancel", this.handleCraftSwipeCancel);
    this.hud.btnQuest?.removeEventListener("click", this.toggleQuest);
    this.hud.btnQuestClose?.removeEventListener("click", this.closeQuest);
    this.hud.questList?.removeEventListener("click", this.handleQuestClick);
    this.hud.btnBirdClose?.removeEventListener("click", this.closeBirdPanel);
    this.hud.btnWolfClose?.removeEventListener("click", this.closeWolfDen);
    this.hud.btnWolfClaim?.removeEventListener("click", this.claimWolfMission);
    for (const container of [this.hud.inventory, this.hud.recipeList]) {
      container?.removeEventListener("pointerover", this.handleTooltipOver);
      container?.removeEventListener("pointerout", this.handleTooltipOut);
      container?.removeEventListener("pointerdown", this.handleTooltipDown);
      container?.removeEventListener("pointermove", this.handleTooltipMove);
    }
    window.removeEventListener("pointerup", this.handleTooltipRelease);
    window.removeEventListener("pointercancel", this.handleTooltipCancel);
    this.clearTooltipTimer();
    this.hideTooltip();
    this.hud.btnAttack?.removeEventListener("click", this.attack);
    this.touchControls?.destroy();
    this.touchControls = null;
    this.hudMenu?.destroy();
    this.hudMenu = null;
    this.closeCrafting();
    this.closeRecipeBook();
    this.closeChest();
    this.closeObservatory();
    this.cancelPlacement();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    document.removeEventListener("visibilitychange", this.handleVisibility);
    window.removeEventListener("pagehide", this.handlePageHide);
    this.clearToast();
    if (this.cycleBannerTimer) {
      window.clearTimeout(this.cycleBannerTimer);
      this.cycleBannerTimer = null;
    }
    this.hud.cycleBanner?.classList.remove("is-visible");
    this.hud.cycleIndicator?.classList.remove("is-changing");
    this.save();
  }

  save() {
    if (this.network) {
      this.sendNetworkState();
      this.sendNetworkInventory();
      return true;
    }

    const transform = this.playerTransform;
    const energy = this.playerEnergy;

    return this.saveStore?.write({
      seed: this.world.seed,
      worldBiomes: this.worldBiomes,
      wolfBiome: this.wolfBiome,
      characterSkin: this.characterSkin,
      donkey: this.serializeDonkey(),
      companion: this.serializeCompanion(),
      compassOwned: this.compassOwned,
      waypoint: this.waypoint ? { ...this.waypoint } : null,
      time: this.gameTime,
      camera: {
        x: this.camera.x,
        y: this.camera.y,
        zoom: this.camera.zoom,
        rotation: this.camera.rotation,
      },
      player: {
        x: transform.x,
        y: transform.y,
        energy: energy.current,
        buffSeconds: this.speedBuffRemaining,
        swimSeconds: this.swimRemaining,
      },
      inventory: this.inventory.toJSON(),
      harvestedNodes: this.world.exportHarvested(),
      plantedNodes: this.world.exportPlanted(),
      campfires: this.campfires.map((fire) => ({ x: fire.x, y: fire.y })),
      ovens: this.ovens.map((oven) => ({ x: oven.x, y: oven.y })),
      brewingTables: this.brewingTables.map((table) => ({ x: table.x, y: table.y })),
      chests: this.chests.map((chest) => ({
        x: chest.x,
        y: chest.y,
        inventory: chest.inventory.toJSON(),
      })),
      tipis: this.tipis.map((tipi) => ({ x: tipi.x, y: tipi.y })),
      fences: this.fences.map((fence) => ({ x: fence.x, y: fence.y })),
      torches: this.torches.map((torch) => ({
        x: torch.x,
        y: torch.y,
        z: torch.z,
      })),
      walls: this.walls.map((wall) => ({ x: wall.x, y: wall.y })),
      stonePaths: this.stonePaths.map((path) => ({ x: path.x, y: path.y })),
      beds: this.beds.map((bed) => ({ x: bed.x, y: bed.y })),
      cauldrons: this.cauldrons.map((cauldron) => ({ x: cauldron.x, y: cauldron.y })),
      wolfTotems: this.wolfTotems.map((totem) => ({ x: totem.x, y: totem.y })),
      university: {
        bookOwned: this.researchBookOwned,
        researchedPotions: [...this.researchedPotions],
        libraryEntries: this.libraryEntries.map((entry) => ({ ...entry })),
        workerMapBonus: this.workerMapBonus,
      },
      stones: this.stonePouch.map((stone) => stone.type),
      groundItems: this.groundItems.map((item) => ({
        kind: item.kind,
        key: item.key,
        amount: item.amount,
        x: item.x,
        y: item.y,
      })),
      fishingRecords: { ...this.fishingRecords },
      feathers: { ...this.feathers },
      birdObservations: [...this.birdObservations],
      birdRecords: { ...this.birdRecords },
      birdMissionCompleted: this.birdMissionCompleted,
      wolfMission: { ...this.wolfMission },
      observatoryDiscoveries: [...this.observatoryDiscoveries],
      observationNotes: [...this.observationNotes],
      completedVillages: [...this.completedVillages],
      seenVillages: [...this.villageSeen],
      craftXp: this.craftXp,
      sciencePoints: { ...this.sciencePoints },
      investigations: this.investigations.map((entry) => ({ ...entry })),
      lensXp: this.lensXp,
      lensLevel: this.lensLevel,
      tradeRoutes: this.tradeRoutes.map((route) => ({ ...route })),
      gameMode: this.gameMode,
      wavesStarted: this.wavesStarted,
      wavesSurvived: this.wavesSurvived,
      waveIndex: this.waveIndex,
      waveTimer: this.waveTimer,
      villageProgress: Object.fromEntries(
        Object.entries(this.villageProgress).map(([id, progress]) => [
          id,
          {
            ...progress,
            buildings: buildingsForVillage(progress).map((building) =>
              building ? { ...building } : null,
            ),
          },
        ]),
      ),
      farmPlots: this.farmPlots.map((plot) => ({ ...plot })),
      workers: this.getWorkerIds().map((id) => {
        const transform = this.ecs.getComponent(id, Component.TRANSFORM);
        const worker = this.ecs.getComponent(id, Component.WORKER);
        return {
          name: worker.name,
          x: transform.x,
          y: transform.y,
          task: worker.task ? { ...worker.task } : null,
          autoRepeat: worker.autoRepeat === true,
          autoRadius: worker.autoRadius ?? WORKER_AUTO_RADIUS,
        };
      }),
      savedAt: Date.now(),
    });
  }

  sendNetworkState() {
    if (!this.network) {
      return;
    }

    const transform = this.playerTransform;
    const motion = this.playerMotion;
    const workers = this.getWorkerIds().map((id) => {
      const workerTransform = this.ecs.getComponent(id, Component.TRANSFORM);
      const worker = this.ecs.getComponent(id, Component.WORKER);
      return {
        id,
        name: worker.name,
        x: workerTransform.x,
        y: workerTransform.y,
        state: worker.state,
      };
    });

    const donkey = this.serializeDonkey();
    if (donkey) {
      donkey.mounted = this.donkeyMounted === true;
    }

    this.network.sendState(
      transform.x,
      transform.y,
      motion.facing,
      workers,
      this.swimRemaining,
      this.playerVerticalOffset,
      donkey,
    );
  }

  sendNetworkInventory() {
    if (!this.network) {
      return;
    }

    this.network.sendInventory(
      this.inventory.toJSON(),
      this.stonePouch.map((stone) => stone.type),
      this.fishingRecords,
      this.feathers,
      [...this.observatoryDiscoveries],
    );
  }

  handleNetworkTime(message) {
    if (Number.isFinite(message.time)) {
      this.gameTime = Math.max(0, message.time);
    }
  }

  handleNetworkPlayers(message) {
    const selfId = this.networkSelfId ?? this.network?.selfId;
    const players = Array.isArray(message.players) ? message.players : [];
    const seen = new Set();
    this.remoteWorkers.clear();

    for (const player of players) {
      if (player.id === selfId) {
        if (Number.isFinite(player.health)) {
          this.health = Math.max(0, Math.min(this.maxHealth, player.health));
        }
      } else {
        seen.add(player.id);
        const existing = this.remotePlayers.get(player.id);
        const remote = existing ?? {
          id: player.id,
          x: player.x,
          y: player.y,
          z: player.verticalOffset ?? 0,
          targetX: player.x,
          targetY: player.y,
          targetZ: player.verticalOffset ?? 0,
          facing: player.facing ?? 1,
          targetFacing: player.facing ?? 1,
          health: player.health ?? 100,
          name: player.name ?? "Jugador",
          color: player.color ?? "#e0a458",
          skinId: player.skinId ?? "explorer",
          donkey: null,
          moving: false,
          walkTime: 0,
        };

        remote.targetX = player.x;
        remote.targetY = player.y;
        remote.targetZ = player.verticalOffset ?? 0;
        remote.targetFacing = player.facing ?? 1;
        remote.health = player.health ?? remote.health;
        remote.name = player.name ?? remote.name;
        remote.color = player.color ?? remote.color;
        remote.skinId = player.skinId ?? remote.skinId ?? "explorer";

        const donkey =
          player.donkey &&
          Number.isFinite(player.donkey.x) &&
          Number.isFinite(player.donkey.y)
            ? player.donkey
            : null;

        if (donkey) {
          if (!remote.donkey) {
            remote.donkey = {
              x: donkey.x,
              y: donkey.y,
              targetX: donkey.x,
              targetY: donkey.y,
              skinId: donkey.skinId,
              mounted: donkey.mounted === true,
            };
          }
          remote.donkey.targetX = donkey.x;
          remote.donkey.targetY = donkey.y;
          remote.donkey.skinId = donkey.skinId ?? remote.donkey.skinId;
          remote.donkey.mounted = donkey.mounted === true;
        } else {
          remote.donkey = null;
        }

        this.remotePlayers.set(player.id, remote);
      }

      for (const worker of player.workers ?? []) {
        this.remoteWorkers.set(`${player.id}:${worker.id}`, {
          ...worker,
          ownerId: player.id,
          ownerColor: player.color ?? "#7ec699",
        });
      }
    }

    for (const id of this.remotePlayers.keys()) {
      if (!seen.has(id)) {
        this.remotePlayers.delete(id);
      }
    }
  }

  handleNetworkAmbient(message) {
    const entities = Array.isArray(message?.entities) ? message.entities : [];
    const seen = new Set();
    const clock = Number.isFinite(message?.time)
      ? message.time
      : this.networkAmbientTime;
    this.networkAmbientTime = clock;
    const speciesList = Object.values(AMBIENT_SPECIES);

    for (const entry of entities) {
      const networkId = Number(entry?.id);
      if (
        !Number.isInteger(networkId) ||
        !speciesList.includes(entry?.species) ||
        !Number.isFinite(entry.x) ||
        !Number.isFinite(entry.y)
      ) {
        continue;
      }

      seen.add(networkId);
      let localId = this.networkAmbient.get(networkId);

      if (!localId || !this.ecs.hasComponent(localId, Component.AMBIENT)) {
        const ambient = {
          species: entry.species,
          phase: Number.isFinite(entry.phase) ? entry.phase : 0,
          health: Number.isFinite(entry.health) ? entry.health : 1,
          network: true,
          networkId,
          clock,
          targetX: entry.x,
          targetY: entry.y,
          targetZ: Number.isFinite(entry.z) ? entry.z : 0,
          targetFacing: entry.facing ?? 1,
          targetMoving: entry.moving === true,
          targetWalkTime: Number.isFinite(entry.walkTime) ? entry.walkTime : 0,
        };
        localId = createAmbientEntity(this.ecs, {
          species: entry.species,
          x: entry.x,
          y: entry.y,
          ambient,
        });
        this.networkAmbient.set(networkId, localId);

        const transform = this.ecs.getComponent(localId, Component.TRANSFORM);
        const motion = this.ecs.getComponent(localId, Component.MOTION);
        if (transform) {
          transform.z = ambient.targetZ;
        }
        if (motion) {
          motion.facing = ambient.targetFacing;
          motion.moving = ambient.targetMoving;
          motion.walkTime = ambient.targetWalkTime;
        }
        continue;
      }

      const ambient = this.ecs.getComponent(localId, Component.AMBIENT);
      if (!ambient) {
        continue;
      }
      ambient.phase = Number.isFinite(entry.phase) ? entry.phase : ambient.phase;
      ambient.health = Number.isFinite(entry.health)
        ? entry.health
        : ambient.health;
      ambient.clock = clock;
      ambient.targetX = entry.x;
      ambient.targetY = entry.y;
      ambient.targetZ = Number.isFinite(entry.z) ? entry.z : 0;
      ambient.targetFacing = entry.facing ?? 1;
      ambient.targetMoving = entry.moving === true;
      ambient.targetWalkTime = Number.isFinite(entry.walkTime)
        ? entry.walkTime
        : ambient.targetWalkTime;
    }

    for (const [networkId, localId] of [...this.networkAmbient]) {
      if (seen.has(networkId)) {
        continue;
      }
      this.ecs.destroyEntity(localId);
      this.networkAmbient.delete(networkId);
    }
  }

  updateNetworkAmbient(deltaSeconds) {
    const factor = 1 - Math.exp(-18 * deltaSeconds);

    for (const localId of this.networkAmbient.values()) {
      if (!this.ecs.hasComponent(localId, Component.AMBIENT)) {
        continue;
      }
      const transform = this.ecs.getComponent(localId, Component.TRANSFORM);
      const motion = this.ecs.getComponent(localId, Component.MOTION);
      const ambient = this.ecs.getComponent(localId, Component.AMBIENT);

      if (!transform || !motion || !ambient) {
        continue;
      }

      transform.x += ((ambient.targetX ?? transform.x) - transform.x) * factor;
      transform.y += ((ambient.targetY ?? transform.y) - transform.y) * factor;
      transform.z += ((ambient.targetZ ?? 0) - transform.z) * factor;
      motion.facing = ambient.targetFacing ?? motion.facing;
      motion.moving = ambient.targetMoving === true;
      motion.walkTime = ambient.targetWalkTime ?? motion.walkTime;
    }
  }

  handleNetworkAmbientHit(message) {
    const localId = this.networkAmbient.get(Number(message?.id));
    if (!localId) {
      return;
    }
    const ambient = this.ecs.getComponent(localId, Component.AMBIENT);
    const transform = this.ecs.getComponent(localId, Component.TRANSFORM);
    if (!ambient || !transform) {
      return;
    }
    const health = Number(message.health);
    if (Number.isFinite(health)) {
      const damage = Math.max(0, (ambient.health ?? health) - health);
      ambient.health = health;
      const selfId = this.networkSelfId ?? this.network?.selfId;
      if (damage > 0 && message.attackerId !== selfId) {
        this.effects.addText(`-${damage}`, transform.x, transform.y, {
          color: "#f0b5ae",
        });
      }
    }
  }

  handleNetworkAmbientKilled(message) {
    const networkId = Number(message?.id);
    const localId = this.networkAmbient.get(networkId);
    if (localId) {
      this.ecs.destroyEntity(localId);
      this.networkAmbient.delete(networkId);
    }

    const selfId = this.networkSelfId ?? this.network?.selfId;
    if (message?.killerId !== selfId) {
      return;
    }

    if (this.pendingTameNetworkId === networkId) {
      this.pendingTameNetworkId = null;
      if (this.inventory.remove("huesoPollo", WOLF_TAME_BONES) <= 0) {
        this.notify("Faltan huesos de pollo para completar la domesticación.");
        return;
      }
      if (this.companionSpecies) {
        this.releaseCompanion();
      }
      this.companionSpecies = "wolf";
      this.setupCompanion();
      this.notify("¡Lobo domesticado! Ahora te acompaña y ya no es hostil.");
      this.updateHud();
      this.save();
      return;
    }

    const species = String(message.species ?? "");
    const x = Number(message.x);
    const y = Number(message.y);
    if (
      !Object.values(AMBIENT_SPECIES).includes(species) ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    ) {
      return;
    }

    this.awardAmbientDrop(species, x, y);
    if (species === AMBIENT_SPECIES.WOLF) {
      this.wolfMission.kills += 1;
    }
    this.notify(`${this.ambientLabel(species)} derrotado.`);
  }

  handleNetworkHit(message) {
    const selfId = this.networkSelfId ?? this.network?.selfId;
    const target = message.targetId === selfId
      ? { x: this.playerTransform.x, y: this.playerTransform.y }
      : this.remotePlayers.get(message.targetId);

    if (message.targetId === selfId) {
      this.health = Math.max(0, Math.min(this.maxHealth, message.health));
      this.effects.addText(`-${message.damage}`, target.x, target.y, {
        color: "#e06c75",
      });
      this.updateHealthHud();
      return;
    }

    if (target) {
      target.health = message.health;
      this.effects.addText(`-${message.damage}`, target.x, target.y, {
        color: "#e06c75",
      });
    }
  }

  handleNetworkRespawn(message) {
    const selfId = this.networkSelfId ?? this.network?.selfId;

    if (message.id === selfId) {
      this.health = message.health;
      this.cancelPlayerAction();
      if (this.donkeyMounted) {
        const ambient = this.getDonkey();
        if (ambient) {
          ambient.mounted = false;
          ambient.anchorX = this.playerTransform.x;
          ambient.anchorY = this.playerTransform.y;
        }
        this.donkeyMounted = false;
      }
      this.playerTransform.x = message.x;
      this.playerTransform.y = message.y;
      this.resetPlayerVertical();
      this.cameraFollow = true;
      this.camera.x = message.x;
      this.camera.y = message.y;
      this.camera.z = this.world.heightAt(message.x, message.y) * 0.72;
      this.updateHud();
      this.notify("Has reaparecido. No pierdes objetos.");
      return;
    }

    const remote = this.remotePlayers.get(message.id);
    if (remote) {
      remote.x = message.x;
      remote.y = message.y;
      remote.targetX = message.x;
      remote.targetY = message.y;
      remote.health = message.health;
    }
  }

  applyNetworkHarvest(message) {
    if (!message || !["tree", "mineral", "bush"].includes(message.kind)) {
      return;
    }
    if (this.world.isHarvested(message.kind, message.x, message.y)) {
      return;
    }

    this.world.harvestNode(message.kind, message.x, message.y);
    this.world.markHarvested(message.kind, message.x, message.y);
    this.updateHud();
  }

  applyNetworkRestore(message) {
    if (
      !message ||
      !Number.isFinite(message.x) ||
      !Number.isFinite(message.y)
    ) {
      return;
    }
    if (!this.world.isHarvested("mineral", message.x, message.y)) {
      return;
    }

    this.world.restoreMineral(message.x, message.y);
    this.updateHud();
  }

  applyNetworkPlant(message) {
    if (
      (message?.kind !== "tree" && message?.kind !== "grass") ||
      !Number.isFinite(message.x) ||
      !Number.isFinite(message.y) ||
      !message.data
    ) {
      return;
    }

    this.world.plantNode(message.kind, message.x, message.y, message.data);
  }

  applyNetworkHeight(message) {
    if (
      Number.isFinite(message?.x) &&
      Number.isFinite(message?.y) &&
      Number.isFinite(message?.height)
    ) {
      this.world.setHeightAt(message.x, message.y, message.height);
    }
  }

  applyNetworkFarm(message) {
    const plot = sanitizeFarmPlots([message?.plot])[0];

    if (!plot) {
      return;
    }

    const index = this.farmPlots.findIndex(
      (entry) => entry.x === plot.x && entry.y === plot.y,
    );

    if (index >= 0) {
      this.farmPlots[index] = plot;
    } else {
      this.farmPlots.push(plot);
    }
  }

  applyNetworkStructure(message) {
    const lists = {
      campfire: this.campfires,
      oven: this.ovens,
      brewingTable: this.brewingTables,
      tipi: this.tipis,
      valla: this.fences,
      torch: this.torches,
      stoneWall: this.walls,
      bed: this.beds,
      cauldron: this.cauldrons,
    };
    const list = lists[message.itemId];

    if (message.itemId === "stonePath") {
      const tileX = Math.floor(message.x);
      const tileY = Math.floor(message.y);
      if (!this.isStonePathAt(tileX, tileY)) {
        this.stonePaths.push({ x: message.x, y: message.y });
      }
      return;
    }

    if (this.isStructureAt(Math.floor(message.x), Math.floor(message.y))) {
      return;
    }

    if (message.itemId === "chest") {
      this.chests.push({
        x: message.x,
        y: message.y,
        inventory: new Inventory({ capacity: CHEST_CAPACITY }),
      });
      return;
    }

    if (!list) {
      return;
    }
    const entry = { x: message.x, y: message.y };
    if (message.itemId === "torch" && Number.isFinite(message.z)) {
      entry.z = message.z;
    }
    list.push(entry);
  }

  getAttackWeapon() {
    const selected = this.getSelectedEntry();

    if (
      selected?.kind === "tool" &&
      (selected.key === "spear" ||
        selected.key === "sword" ||
        selected.key === "bow")
    ) {
      return selected.key;
    }

    if (this.inventory.hasTool("sword")) {
      return "sword";
    }
    if (this.inventory.hasTool("spear")) {
      return "spear";
    }
    return "fist";
  }

  attackDamage(weapon) {
    let damage =
      weapon === "bow"
        ? PLAYER_BOW_ATTACK
        : weapon === "sword"
          ? PLAYER_SWORD_ATTACK
          : weapon === "spear"
            ? PLAYER_SPEAR_ATTACK
            : PLAYER_BASE_ATTACK;
    damage *= scienceModifiers(this.sciencePoints).attackMultiplier;

    if (this.attackBuffRemaining > 0) {
      damage *= 1.5;
    }
    if (this.weaknessRemaining > 0) {
      damage *= 0.7;
    }
    return Math.max(1, Math.round(damage));
  }

  getWeaponCooldown(weapon) {
    if (weapon === "bow") return 0.8;
    if (weapon === "sword") return 0.42;
    if (weapon === "spear") return 0.55;
    return 0.45;
  }

  showAttackSwing() {
    const transform = this.playerTransform;
    this.effects.addText("\u2694", transform.x, transform.y, {
      color: "#f0c07a",
      duration: 0.38,
      rise: 16,
    });
  }

  findNetworkPlayerInRange(range) {
    const transform = this.playerTransform;
    let best = null;
    let bestDistance = range;

    for (const remote of this.remotePlayers.values()) {
      const distance = Math.hypot(remote.x - transform.x, remote.y - transform.y);
      if (distance <= bestDistance) {
        bestDistance = distance;
        best = remote;
      }
    }

    return best;
  }

  attack() {
    if (this.fishing) {
      this.cancelFishing();
    }

    if (this.attackCooldown > 0) {
      return;
    }

    const weapon = this.getAttackWeapon();
    const cooldown = this.getWeaponCooldown(weapon);

    if (weapon === "bow" && this.inventory.itemCount("arrow") <= 0) {
      this.notify("No tienes flechas. Fabrica flechas en Crafteo.");
      return;
    }

    this.attackCooldown = cooldown;
    const range = weapon === "bow" ? PLAYER_BOW_RANGE : weapon === "sword" ? 2.6 : 2.4;
    const target = this.findAttackTargetInRange(range);

    if (this.network) {
      if (target?.ambient?.network && Number.isInteger(target.ambient.networkId)) {
        if (weapon === "bow") {
          this.inventory.removeItem("arrow", 1);
        }
        const damage = this.attackDamage(weapon);
        this.network.sendAmbientHit(target.ambient.networkId, damage);
        this.effects.addText(`-${damage}`, target.transform.x, target.transform.y, {
          color: "#f0b5ae",
        });
        this.showAttackSwing();
        this.updateHud();
        return;
      }

      if (this.findNetworkPlayerInRange(range)) {
        if (weapon === "bow") {
          this.inventory.removeItem("arrow", 1);
        }
        this.network.sendAttack(weapon);
        this.showAttackSwing();
        this.updateHud();
        return;
      }

      this.showAttackSwing();
      this.notify(
        weapon === "bow"
          ? "No hay objetivos a distancia."
          : "No hay criaturas al alcance.",
      );
      this.updateHud();
      return;
    }

    if (!target) {
      this.showAttackSwing();
      this.notify(
        weapon === "bow"
          ? "No hay objetivos a distancia."
          : "No hay criaturas al alcance.",
      );
      return;
    }

    const damage = this.attackDamage(weapon);
    this.showAttackSwing();

    if (weapon === "bow") {
      this.inventory.removeItem("arrow", 1);
      this.fireArrow(target, damage);
    } else {
      this.damageAmbient(target.id, damage);
    }

    this.updateHud();
  }

  fireArrow(target, damage) {
    const transform = this.playerTransform;
    const distance = Math.hypot(
      target.transform.x - transform.x,
      target.transform.y - transform.y,
    );
    this.projectiles.push({
      x: transform.x,
      y: transform.y,
      targetId: target.id,
      damage,
      elapsed: 0,
      duration: Math.max(0.12, distance / 22),
    });
    this.effects.addText("¡Flecha!", transform.x, transform.y, {
      color: "#d8e0ea",
    });
  }

  updateProjectiles(deltaSeconds) {
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];
      const targetTransform = this.ecs.getComponent(
        projectile.targetId,
        Component.TRANSFORM,
      );

      if (!targetTransform || !this.ecs.hasComponent(projectile.targetId, Component.AMBIENT)) {
        this.projectiles.splice(index, 1);
        continue;
      }

      projectile.elapsed += deltaSeconds;
      const ratio = Math.min(1, projectile.elapsed / projectile.duration);
      const startX = this.playerTransform.x;
      const startY = this.playerTransform.y;
      projectile.x = startX + (targetTransform.x - startX) * ratio;
      projectile.y = startY + (targetTransform.y - startY) * ratio;

      if (ratio >= 1) {
        this.damageAmbient(projectile.targetId, projectile.damage);
        this.projectiles.splice(index, 1);
      }
    }
  }

  drawProjectiles() {
    if (this.projectiles.length === 0) {
      return;
    }

    const ctx = this.ctx;
    const zoom = this.camera.zoom;

    for (const projectile of this.projectiles) {
      const screen = this.camera.project(
        projectile.x,
        projectile.y,
        this.world.heightAt(projectile.x, projectile.y) * 0.72 + 0.7,
      );
      ctx.save();
      ctx.strokeStyle = "#f0e4c8";
      ctx.lineWidth = Math.max(1, 1.4 * zoom);
      ctx.beginPath();
      ctx.moveTo(screen.x - 8 * zoom, screen.y + 2 * zoom);
      ctx.lineTo(screen.x + 5 * zoom, screen.y - 2 * zoom);
      ctx.stroke();
      ctx.restore();
    }
  }

  damageAmbient(id, amount) {
    const ambient = this.ecs.getComponent(id, Component.AMBIENT);
    const transform = this.ecs.getComponent(id, Component.TRANSFORM);

    if (!ambient || !transform || amount <= 0) {
      return;
    }

    const maxHealth = this.ambientMaxHealth(ambient.species);
    ambient.health = (ambient.health ?? maxHealth) - amount;
    this.effects.addText(`-${amount}`, transform.x, transform.y, {
      color: "#f0b5ae",
    });

    if (ambient.health <= 0) {
      const wave = ambient.wave === true;
      this.ecs.destroyEntity(id);
      this.waveEnemyIds.delete(id);
      if (!wave) {
        if (ambient.species === AMBIENT_SPECIES.WOLF) {
          this.wolfMission.kills += 1;
          this.notify(
            `Lobo derrotado (${this.wolfMission.kills}/${WOLF_MISSION.wolvesRequired}).`,
          );
          this.renderWolfPanel();
        }
        this.awardAmbientDrop(ambient.species, transform.x, transform.y);
        this.notify(`${this.ambientLabel(ambient.species)} derrotado.`);
      }
    }
  }

  ambientMaxHealth(species) {
    if (species === AMBIENT_SPECIES.SPIDER) {
      return SPIDER_HEALTH;
    }
    if (species === AMBIENT_SPECIES.FOX) {
      return FOX_HEALTH;
    }
    if (species === AMBIENT_SPECIES.GOAT) {
      return GOAT_HEALTH;
    }
    if (species === AMBIENT_SPECIES.DONKEY) {
      return 120;
    }
    if (species === AMBIENT_SPECIES.PERDIZ) {
      return PERDIZ_HEALTH;
    }
    if (species === AMBIENT_SPECIES.CHICKEN) {
      return CHICKEN_HEALTH;
    }
    if (species === AMBIENT_SPECIES.WOLF) {
      return WOLF_HEALTH;
    }
    if (
      species === AMBIENT_SPECIES.SPARROW ||
      species === AMBIENT_SPECIES.CROW ||
      species === AMBIENT_SPECIES.OWL ||
      species === AMBIENT_SPECIES.VULTURE
    ) {
      return BIRD_HEALTH;
    }
    return NIGHT_MOB_HEALTH;
  }

  ambientLabel(species) {
    if (species === AMBIENT_SPECIES.FOX) {
      return "Zorro";
    }
    if (species === AMBIENT_SPECIES.GOAT) {
      return "Cabra";
    }
    if (species === AMBIENT_SPECIES.DONKEY) {
      return "Burro";
    }
    if (species === AMBIENT_SPECIES.SPARROW) {
      return "Gorrión";
    }
    if (species === AMBIENT_SPECIES.CROW) {
      return "Cuervo";
    }
    if (species === AMBIENT_SPECIES.OWL) {
      return "Búho";
    }
    if (species === AMBIENT_SPECIES.VULTURE) {
      return "Zopilote";
    }
    if (species === AMBIENT_SPECIES.PERDIZ) {
      return "Perdiz";
    }
    if (species === AMBIENT_SPECIES.CHICKEN) {
      return "Pollo";
    }
    if (species === AMBIENT_SPECIES.WOLF) {
      return "Lobo";
    }
    if (species === AMBIENT_SPECIES.SPIDER) {
      return "Ara\u00F1a nocturna";
    }
    return "Criatura nocturna";
  }

  awardAmbientDrop(species, x, y) {
    let key = null;
    let amount = 0;

    if (species === AMBIENT_SPECIES.FOX || species === AMBIENT_SPECIES.GOAT) {
      key = "piel";
      amount = 1;
    } else if (species === AMBIENT_SPECIES.SPIDER) {
      key = "telarana";
      amount = 1;
    } else if (species === AMBIENT_SPECIES.WOLF) {
      key = "pielLobo";
      amount = 1;
    } else if (species === AMBIENT_SPECIES.CHICKEN) {
      key = "huesoPollo";
      amount = 1;
    } else if (
      species === AMBIENT_SPECIES.VULTURE ||
      species === AMBIENT_SPECIES.SPARROW ||
      species === AMBIENT_SPECIES.CROW ||
      species === AMBIENT_SPECIES.OWL ||
      species === AMBIENT_SPECIES.PERDIZ
    ) {
      key = "pluma";
      amount = 1;
      this.feathers[species] = (this.feathers[species] ?? 0) + 1;
    }

    if (!key) {
      return;
    }

    const added = this.inventory.add(key, amount);

    if (added > 0) {
      this.effects.addText(
        `+${added} ${RESOURCE_INFO[key].label}`,
        x,
        y,
        { color: RESOURCE_INFO[key].color },
      );
    }

    if (amount - added > 0) {
      this.groundItems.push({
        kind: "resource",
        key,
        amount: amount - added,
        label: RESOURCE_INFO[key].label,
        color: RESOURCE_INFO[key].color,
        x,
        y,
      });
    }
  }

  findAttackTargetInRange(range = PLAYER_ATTACK_RANGE) {
    const transform = this.playerTransform;
    let best = null;
    let bestDistance = range;

    for (const id of this.getAmbientIds()) {
      const ambient = this.ecs.getComponent(id, Component.AMBIENT);

      if (
        ambient.companion ||
        ambient.tamed ||
        !ATTACKABLE_AMBIENT_SPECIES.has(ambient.species)
      ) {
        continue;
      }

      const mobTransform = this.ecs.getComponent(id, Component.TRANSFORM);
      const distance = Math.hypot(
        mobTransform.x - transform.x,
        mobTransform.y - transform.y,
      );

      if (distance <= bestDistance) {
        bestDistance = distance;
        best = { id, ambient, transform: mobTransform };
      }
    }

    return best;
  }

  updateHealthHud() {
    const percent = (this.health / this.maxHealth) * 100;

    if (this.hud.healthFill) {
      this.hud.healthFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
      this.hud.healthFill.classList.toggle("is-low", percent < 30);
    }
    if (this.hud.health) {
      this.hud.health.textContent = String(Math.round(this.health));
    }
  }

  handleVisibility() {
    if (document.visibilityState === "hidden") {
      this.save();
    }
  }

  handlePageHide() {
    this.save();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.camera.resize(width, height);

    if (this.observatoryOpen) {
      this.renderObservatory();
    }
  }

  frame(now) {
    if (!this.running) {
      return;
    }

    const deltaSeconds = Math.min(0.05, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;
    this.update(deltaSeconds);
    this.render();
    this.tickHud(deltaSeconds);
    this.saveTimer += deltaSeconds;

    if (this.saveTimer >= AUTOSAVE_INTERVAL) {
      this.saveTimer = 0;
      this.save();
    }

    this.raf = window.requestAnimationFrame(this.frame);
  }

  update(deltaSeconds) {
    this.camera.update(deltaSeconds);
    this.updateSkyAlignment(deltaSeconds);
    this.speedBuffRemaining = Math.max(0, this.speedBuffRemaining - deltaSeconds);
    this.attackBuffRemaining = Math.max(0, this.attackBuffRemaining - deltaSeconds);
    this.resistanceBuffRemaining = Math.max(0, this.resistanceBuffRemaining - deltaSeconds);
    this.slowRemaining = Math.max(0, this.slowRemaining - deltaSeconds);
    this.weaknessRemaining = Math.max(0, this.weaknessRemaining - deltaSeconds);
    this.attackCooldown = Math.max(0, this.attackCooldown - deltaSeconds);
    this.mobDamageCooldown = Math.max(0, this.mobDamageCooldown - deltaSeconds);

    const wasSwimming = this.swimRemaining > 0;
    this.swimRemaining = Math.max(0, this.swimRemaining - deltaSeconds);

    if (wasSwimming && this.swimRemaining === 0) {
      const transform = this.playerTransform;
      if (this.world.biomeAt(transform.x, transform.y) === BIOME.WATER) {
        this.emergencyShore();
      }
    }

    this.updateFishing(deltaSeconds);
    this.updateBirdWatch(deltaSeconds);
    this.updateFarmPlots(deltaSeconds);
    this.updateFarmAnimals(deltaSeconds);
    this.updateProjectiles(deltaSeconds);

    if (this.poisonRemaining > 0) {
      this.poisonRemaining = Math.max(0, this.poisonRemaining - deltaSeconds);
      this.poisonTickTimer -= deltaSeconds;

      if (this.poisonTickTimer <= 0) {
        this.poisonTickTimer += 1;
        this.health = Math.max(0, this.health - 4);
        this.lastDamageTime = this.gameTime;
        this.effects.addText("-4", this.playerTransform.x, this.playerTransform.y, {
          color: "#b06bff",
        });
        this.updateHealthHud();

        if (this.health <= 0) {
          this.handleDeath();
        }
      }
    } else {
      this.poisonTickTimer = 0;
    }

    const slowMultiplier = this.slowRemaining > 0 ? 0.6 : 1;
    const waterMultiplier = this.isSwimming() ? SWIM_SPEED_MULTIPLIER : 1;
    const biomeNow = this.world.biomeAt(
      this.playerTransform.x,
      this.playerTransform.y,
    );
    const cloakMultiplier =
      this.inventory.hasUpgrade("wolfCloak") &&
      (biomeNow === BIOME.WOLF || biomeNow === BIOME.SNOW)
        ? WOLF_CLOAK_SPEED_BONUS
        : 1;
    this.playerMotion.speed =
      this.basePlayerSpeed *
      (this.speedBuffRemaining > 0 ? COFFEE_SPEED_MULTIPLIER : 1) *
      slowMultiplier *
      waterMultiplier *
      cloakMultiplier *
      (this.donkeyMounted ? DONKEY_SPEED_MULTIPLIER : 1);

    for (const remote of this.remotePlayers.values()) {
      const factor = 1 - Math.exp(-12 * deltaSeconds);
      const dx = remote.targetX - remote.x;
      const dy = remote.targetY - remote.y;
      const dz = remote.targetZ - remote.z;
      const distance = Math.hypot(dx, dy);
      remote.x += dx * factor;
      remote.y += dy * factor;
      remote.z += dz * factor;
      remote.facing = remote.targetFacing;
      remote.moving = distance > 0.03;
      if (remote.moving) {
        remote.walkTime += deltaSeconds;
      }

      if (remote.donkey) {
        const ddx = remote.donkey.targetX - remote.donkey.x;
        const ddy = remote.donkey.targetY - remote.donkey.y;
        remote.donkey.x += ddx * factor;
        remote.donkey.y += ddy * factor;
      }
    }

    if (this.network) {
      this.networkTimer -= deltaSeconds;
      this.inventorySendTimer -= deltaSeconds;

      if (this.networkTimer <= 0) {
        this.networkTimer = 0.1;
        this.sendNetworkState();
      }
      if (this.inventorySendTimer <= 0) {
        this.inventorySendTimer = 2;
        this.sendNetworkInventory();
      }
    }

    const transform = this.playerTransform;
    const motion = this.playerMotion;
    const energy = this.playerEnergy;
    const movement = this.input.movement();
    const directMovement = movement.x !== 0 || movement.y !== 0;

    if (directMovement) {
      this.cameraFollow = true;
      this.cancelPlayerAction();
      const worldMovement = this.camera.movementToWorld(
        movement.x,
        movement.y,
      );
      let worldX = worldMovement.x;
      let worldY = worldMovement.y;
      const length = Math.hypot(worldX, worldY);

      if (length > 0) {
        worldX /= length;
        worldY /= length;
      }

      const moved = moveDirect(
        transform,
        worldX * motion.speed * deltaSeconds,
        worldY * motion.speed * deltaSeconds,
        (x, y) => this.isPlayerWalkableAt(x, y),
      );

      motion.moving = moved.movedX !== 0 || moved.movedY !== 0;

      if (motion.moving) {
        motion.walkTime += deltaSeconds;
        if (movement.x > 0.1) {
          motion.facing = 1;
        } else if (movement.x < -0.1) {
          motion.facing = -1;
        }
      }
    }

    const completedPaths = updatePaths(this.ecs, deltaSeconds);

    for (const completed of completedPaths) {
      if (completed.id === this.playerId) {
        const intent = completed.path.intent;
        if (intent?.type === "gather") {
          this.tryStartGather(intent.kind, intent.x, intent.y, { fromPath: true });
        }
        continue;
      }

      if (this.ecs.hasComponent(completed.id, Component.WORKER)) {
        const worker = this.ecs.getComponent(completed.id, Component.WORKER);
        const intent = completed.path.intent;

        if (intent?.type === "worker-gather") {
          const started = this.tryStartWorkerGather(
            completed.id,
            intent.kind,
            intent.x,
            intent.y,
            { silent: true },
          );
          if (!started) {
            worker.state = "idle";
            worker.task = null;
          }
        } else if (intent?.type === "worker-restore") {
          const started = this.tryStartWorkerRestore(
            completed.id,
            intent.x,
            intent.y,
            { silent: true },
          );
          if (!started) {
            worker.state = "idle";
            worker.task = null;
          }
        } else {
          worker.state = "idle";
          worker.task = null;
        }
        this.updateWorkerPanel();
      }
    }

    const gather = this.ecs.getComponent(this.playerId, Component.GATHER);

    if (gather) {
      const node = this.world.getNodeAt(gather.kind, gather.x, gather.y);

      if (node && this.distanceToNode(node, transform) <= GATHER_RANGE + 0.35) {
        motion.moving = false;
      } else {
        this.ecs.removeComponent(this.playerId, Component.GATHER);
        energy.paused = false;
        if (!node) {
          this.notify("El recurso ya no está disponible.");
        }
      }
    }

    for (const workerId of this.ecs.query(
      Component.WORKER,
      Component.GATHER,
      Component.TRANSFORM,
    )) {
      const workerGather = this.ecs.getComponent(workerId, Component.GATHER);
      const workerTransform = this.ecs.getComponent(workerId, Component.TRANSFORM);
      const worker = this.ecs.getComponent(workerId, Component.WORKER);
      let valid;

      if (workerGather.kind === "restore") {
        const target = {
          worldX: workerGather.x + 0.5,
          worldY: workerGather.y + 0.5,
        };
        valid =
          this.world.isHarvested("mineral", workerGather.x, workerGather.y) &&
          this.distanceToNode(target, workerTransform) <= GATHER_RANGE + 0.35;
      } else {
        const node = this.world.getNodeAt(
          workerGather.kind,
          workerGather.x,
          workerGather.y,
        );
        valid =
          Boolean(node) &&
          this.distanceToNode(node, workerTransform) <= GATHER_RANGE + 0.35;
      }

      if (!valid) {
        this.ecs.removeComponent(workerId, Component.GATHER);
        worker.state = "idle";
        worker.task = null;
        this.updateWorkerPanel();
      }
    }

    const completedGathers = updateGathering(this.ecs, deltaSeconds);

    for (const completed of completedGathers) {
      if (completed.id === this.playerId) {
        this.completeGather(completed.gather);
      } else if (this.ecs.hasComponent(completed.id, Component.WORKER)) {
        this.completeWorkerGather(completed.id, completed.gather);
      }
    }

    energy.paused = this.ecs.hasComponent(this.playerId, Component.GATHER);

    if (
      !directMovement &&
      !this.ecs.hasComponent(this.playerId, Component.PATH) &&
      !this.ecs.hasComponent(this.playerId, Component.GATHER)
    ) {
      motion.moving = false;
    }

    if (!this.network) {
      this.gameTime += deltaSeconds;
    }
    const nightNow = this.isNight();

    if (nightNow !== this.wasNight) {
      this.wasNight = nightNow;
      this.showCycleBanner(nightNow);

      if (nightNow) {
        this.nightSpawnSlot = 0;
        this.spawnNightBatch(NIGHT_MOB_TARGET);
      }
    }

    if (this.hud.cycleIndicator) {
      this.hud.cycleIndicator.dataset.phase = nightNow ? "night" : "day";
    }

    updateAmbientSystem(this.ecs, deltaSeconds, {
      playerX: transform.x,
      playerY: transform.y,
      isWalkable: (x, y) => this.isActorWalkableAt(x, y),
      time: this.gameTime,
      campfires: [...this.campfires, ...this.tipis, ...this.torches],
      totems: this.wolfTotems,
    });
    this.updateNetworkAmbient(deltaSeconds);
    this.updateAmbientPopulation(deltaSeconds);
    this.updateNightCombat(deltaSeconds);
    this.updateAmbientPoison(deltaSeconds);
    this.updateWolfMissionDiscovery();

    this.energyBoosted = this.isNearCampfire(transform);
    updateEnergy(this.ecs, deltaSeconds, {
      regenPerSecond: this.energyBoosted
        ? ENERGY_REGEN * CAMPFIRE_REGEN_MULTIPLIER
        : ENERGY_REGEN,
    });

    for (const village of this.villages) {
      if (this.villageSeen.has(village.id) || this.villageNotified.has(village.id)) {
        continue;
      }
      if (Math.hypot(village.x - transform.x, village.y - transform.y) <= 9) {
        this.villageNotified.add(village.id);
        this.notify(
          `${village.name}: un chamán necesita ayuda. Habla con ${village.shamanName}.`,
        );
      }
    }

    this.effects.update(deltaSeconds);
    this.updateVillageBalance(deltaSeconds);
    this.updateTowerDefense(deltaSeconds);
    this.updatePlayerVertical(deltaSeconds);
    this.syncMountedDonkey();

    const targetCameraZ = this.world.heightAt(transform.x, transform.y) * 0.72;
    const zSmoothing = 1 - Math.exp(-14 * deltaSeconds);
    this.camera.z += (targetCameraZ - this.camera.z) * zSmoothing;

    if (this.cameraFollow) {
      const smoothing = 1 - Math.exp(-9 * deltaSeconds);
      this.camera.x += (transform.x - this.camera.x) * smoothing;
      this.camera.y += (transform.y - this.camera.y) * smoothing;
    }
  }

  updatePlayerVertical(deltaSeconds) {
    const transform = this.playerTransform;
    const ground = this.world.heightAt(transform.x, transform.y);

    if (!this.playerAirborne) {
      if (ground < this.playerGroundHeight - 0.001) {
        this.playerAirborne = true;
        this.playerVerticalOffset = 0;
        this.playerVerticalVelocity = 0;
        this.playerMaxFeetHeight = this.playerGroundHeight;
      } else {
        this.playerGroundHeight = ground;
        this.playerVerticalOffset = 0;
        return;
      }
    }

    this.playerVerticalVelocity -= GRAVITY * deltaSeconds;
    this.playerVerticalOffset += this.playerVerticalVelocity * deltaSeconds;
    this.playerMaxFeetHeight = Math.max(
      this.playerMaxFeetHeight,
      this.playerGroundHeight + this.playerVerticalOffset,
    );

    const feet = this.playerGroundHeight + this.playerVerticalOffset;
    if (feet > ground) {
      return;
    }

    const drop = this.playerMaxFeetHeight - ground;
    this.playerGroundHeight = ground;
    this.playerVerticalOffset = 0;
    this.playerVerticalVelocity = 0;
    this.playerAirborne = false;

    if (drop > FALL_SAFE_BLOCKS && this.world.biomeAt(transform.x, transform.y) !== BIOME.WATER) {
      const damage = fallDamage(drop);
      if (damage > 0) {
        this.damagePlayer(damage, { bypassReduction: true });
        this.notify(`Caída desde ${Math.floor(drop)} bloques: -${damage} salud.`);
      }
    }
  }

  handleClick(screenX, screenY, { shiftKey = false } = {}) {
    if (this.birdWatch) {
      this.focusBirdWatch();
      return;
    }

    if (this.fishing) {
      if (this.fishing.phase === "bite") {
        this.resolveFishingTap();
      }
      return;
    }

    if (this.placingItem) {
      this.tryPlaceStructure(
        screenX,
        screenY,
        this.tileAtScreen(screenX, screenY),
      );
      return;
    }

    const selectedEntry = this.getSelectedEntry();
    if (
      selectedEntry?.kind === "item" &&
      (selectedEntry.key === "poisonPotion" ||
        selectedEntry.key === "moonPoisonPotion")
    ) {
      const targetId = this.pickAmbientAt(screenX, screenY, {
        hostileOnly: true,
      });

      if (!targetId) {
        this.notify("Selecciona un enemigo para lanzar el veneno.");
        return;
      }

      const targetTransform = this.ecs.getComponent(
        targetId,
        Component.TRANSFORM,
      );
      const playerTransform = this.playerTransform;
      const distance = Math.hypot(
        targetTransform.x - playerTransform.x,
        targetTransform.y - playerTransform.y,
      );

      if (distance > 7) {
        this.notify("El enemigo está demasiado lejos.");
        return;
      }

      this.throwPoisonPotion(targetId);
      return;
    }

    if (
      selectedEntry?.kind === "tool" &&
      selectedEntry.key === "binoculars"
    ) {
      const birdId = this.pickBirdAt(screenX, screenY);
      if (birdId) {
        this.startBirdWatch(birdId);
      } else {
        this.notify("Selecciona un ave cercana para observarla.");
      }
      return;
    }

    if (selectedEntry?.kind === "resource") {
      if (selectedEntry.key === "huesoPollo") {
        const wolfId = this.pickAmbientAt(screenX, screenY, {
          species: AMBIENT_SPECIES.WOLF,
        });
        if (wolfId) {
          this.tameWolf(wolfId);
          return;
        }
      }
      const perdizId = this.pickAmbientAt(screenX, screenY, {
        species: AMBIENT_SPECIES.PERDIZ,
      });
      if (perdizId) {
        this.capturePerdiz(perdizId);
        return;
      }
    }

    if (this.selectedUnitId) {
      const target = this.tileAtScreen(screenX, screenY);
      const unit = this.units.find((entry) => entry.id === this.selectedUnitId);
      if (unit) {
        unit.rally = { x: target.x + 0.5, y: target.y + 0.5 };
        unit.manual = true;
        this.notify(`${unit.name}: nueva orden de posición.`);
        return;
      }
    }

    if (this.pickAmbientAt(screenX, screenY, { attackable: true })) {
      this.attack();
      return;
    }

    const fiefUnit = this.pickFiefUnitAt(screenX, screenY);
    if (fiefUnit) {
      this.selectFiefUnit(fiefUnit, {
        additive: shiftKey || this.selectionMode === "fief",
        toggle: shiftKey || this.selectionMode === "fief",
      });
      return;
    }

    if (
      this.selectedWorkerIds.size > 0 &&
      this.pickPlayerAt(screenX, screenY)
    ) {
      this.deselectWorker();
      return;
    }

    const workerId = this.pickWorkerAt(screenX, screenY);

    if (workerId) {
      this.selectWorker(workerId, {
        additive: shiftKey || this.selectionMode === "worker",
        toggle: shiftKey || this.selectionMode === "worker",
      });
      return;
    }

    if (this.selectedUnitIds.size > 0) {
      const target = this.tileAtScreen(screenX, screenY);
      for (const id of this.selectedUnitIds) {
        const unit = this.units.find((entry) => entry.id === id);
        if (unit) {
          unit.rally = { x: target.x + 0.5, y: target.y + 0.5 };
          unit.manual = true;
        }
      }
      this.notify(
        `${this.selectedUnitIds.size} unidad${
          this.selectedUnitIds.size === 1 ? "" : "es"
        }: nueva orden.`,
      );
      return;
    }

    if (!this.donkeyMounted) {
      const donkeyId = this.pickAmbientAt(screenX, screenY, {
        species: AMBIENT_SPECIES.DONKEY,
      });
      if (donkeyId) {
        this.handleDonkeyInteraction(donkeyId);
        return;
      }
    }

    const shamanVillage = this.pickShamanAt(screenX, screenY);
    if (shamanVillage) {
      this.openVillage(shamanVillage);
      return;
    }

    if (this.pickWolfDenAt(screenX, screenY)) {
      this.openWolfDen();
      return;
    }

    if (this.tryPickupGroundItemAt(screenX, screenY)) {
      return;
    }

    if (this.tryOpenStationAt(screenX, screenY)) {
      return;
    }

    const pickable = this.renderer.pickNode(screenX, screenY);

    if (pickable) {
      const workerIds = this.getSelectedWorkerIds();
      if (workerIds.length > 0) {
        this.commandWorkersGather(
          workerIds,
          pickable.kind,
          pickable.x,
          pickable.y,
        );
      } else {
        this.commandGather(pickable.kind, pickable.x, pickable.y);
      }
      return;
    }

    const targetTile = this.tileAtScreen(screenX, screenY);
    const goalX = targetTile.x;
    const goalY = targetTile.y;

    if (this.tryFarmInteraction(goalX, goalY)) {
      return;
    }

    if (this.tryPlantSeed(goalX, goalY, selectedEntry)) {
      return;
    }

    if (this.tryPlaceSelectedAt(screenX, screenY, selectedEntry, targetTile)) {
      return;
    }

    if (this.world.biomeAt(goalX, goalY) === BIOME.WATER) {
      const selectedRod =
        selectedEntry?.kind === "tool" &&
        selectedEntry.key === "fishingRod" &&
        this.inventory.hasTool("fishingRod");

      if (selectedRod) {
        this.startFishing(goalX, goalY);
        return;
      }

      const waterDistance = Math.hypot(
        goalX + 0.5 - this.playerTransform.x,
        goalY + 0.5 - this.playerTransform.y,
      );

      if (this.swimRemaining <= 0 || waterDistance <= WATER_REACH) {
        this.collectWater(goalX, goalY);
        return;
      }
    }

    const workerIds = this.getSelectedWorkerIds();
    const hasWorkers = workerIds.length > 0;
    const walkable = hasWorkers
      ? (x, y) => this.isActorWalkableAt(x, y)
      : (x, y) => this.isPlayerWalkableAt(x, y);

    if (!walkable(goalX, goalY)) {
      this.notify("No puedes caminar ah��.");
      return;
    }

    if (hasWorkers) {
      this.commandWorkersMove(workerIds, goalX, goalY);
      return;
    }

    const transform = this.playerTransform;
    const path = findPath({
      startX: Math.floor(transform.x),
      startY: Math.floor(transform.y),
      goalX,
      goalY,
      isWalkable: walkable,
      getHeight: (x, y) => this.world.heightAt(x, y),
      maxStepHeight: 1,
      maxDropHeight: Infinity,
      maxNodes: PATH_MAX_NODES,
    });

    if (path === null) {
      this.notify("No hay camino hasta ese lugar.");
      return;
    }

    this.cameraFollow = true;
    this.cancelPlayerAction();

    if (path.length > 0) {
      this.setPlayerPath(path, null);
    }
  }

  handlePointerHover(screenX, screenY) {
    if (
      this.fishing ||
      this.craftingOpen ||
      this.recipeBookOpen ||
      this.universityOpen ||
      this.observatoryOpen ||
      this.chestOpen
    ) {
      this.hoverScreen = null;
      this.hover = null;
      this.canvas.classList.remove("is-targeting");
      return;
    }

    this.hoverScreen = { x: screenX, y: screenY };
    this.hoverUpdatedAt = performance.now();
    this.updateHoverPreview();
  }

  clearPointerHover() {
    this.hoverScreen = null;
    this.hover = null;
    this.canvas.classList.remove("is-targeting");
  }

  updateHoverPreview() {
    if (!this.hoverScreen) {
      this.hover = null;
      this.canvas.classList.remove("is-targeting");
      return;
    }

    const selected = this.getSelectedEntry();
    const itemId = this.placingItem;
    let mode = null;
    let target = null;

    if (itemId === "stonePath") {
      mode = "path";
    } else if (itemId && PLACEABLE_ITEM_KEYS.has(itemId)) {
      mode = "structure";
    } else if (
      selected?.kind === "item" &&
      selected.key === "stonePath"
    ) {
      mode = "path";
    } else if (
      selected?.kind === "item" &&
      PLACEABLE_ITEM_KEYS.has(selected.key)
    ) {
      mode = "structure";
    }

    if (!mode) {
      this.hover = null;
      this.canvas.classList.remove("is-targeting");
      return;
    }

    const tile = this.tileAtScreen(this.hoverScreen.x, this.hoverScreen.y);
    const height = this.world.heightAt(tile.x, tile.y);

    if (mode === "path" || mode === "structure") {
      const placementItem = mode === "path" ? "stonePath" : itemId ?? selected.key;
      const status = this.getPlacementStatus(placementItem, tile.x, tile.y);
      this.hover = {
        mode,
        itemId: placementItem,
        tileX: tile.x,
        tileY: tile.y,
        height,
        valid: status.ok,
        reason: status.reason ?? "",
        centerX: status.centerX,
        centerY: status.centerY,
      };
      this.canvas.classList.add("is-targeting");
      return;
    }

    this.hover = null;
    this.canvas.classList.remove("is-targeting");
  }

  handleDragStart(screenX, screenY) {
    if (this.selectionMode) {
      this.selectionDrag = {
        startX: screenX,
        startY: screenY,
        currentX: screenX,
        currentY: screenY,
      };
      this.updateSelectionBox();
      return true;
    }

    if (
      this.placingItem !== "stonePath" ||
      this.inventory.itemCount("stonePath") <= 0
    ) {
      return false;
    }

    this.lastPaintTile = null;
    this.paintStonePathAtScreen(screenX, screenY);
    return true;
  }

  handleDragMove(screenX, screenY) {
    if (this.selectionDrag) {
      this.selectionDrag.currentX = screenX;
      this.selectionDrag.currentY = screenY;
      this.updateSelectionBox();
      return;
    }

    if (this.placingItem !== "stonePath") {
      return;
    }

    this.paintStonePathAtScreen(screenX, screenY);
  }

  paintStonePathAtScreen(screenX, screenY) {
    const tile = this.tileAtScreen(screenX, screenY);
    const key = `${tile.x},${tile.y}`;

    if (this.lastPaintTile === key) {
      return;
    }
    this.lastPaintTile = key;

    if (this.inventory.itemCount("stonePath") <= 0) {
      this.cancelPlacement();
      return;
    }

    if (this.isStonePathAt(tile.x, tile.y)) {
      return;
    }

    this.tryPlaceStructure(screenX, screenY, tile, { silent: true });
  }

  pickPlayerAt(screenX, screenY) {
    const spriteSet = this.playerSprites;

    if (!spriteSet || spriteSet.length === 0) {
      return false;
    }

    const transform = this.playerTransform;
    const motion = this.playerMotion;
    const frame = motion.moving
      ? 1 + (Math.floor(motion.walkTime * 8) % 2)
      : 0;
    const sprite = spriteSet[frame] ?? spriteSet[0];
    const base = this.camera.project(
      transform.x,
      transform.y,
      (this.world.heightAt(transform.x, transform.y) +
        this.playerVerticalOffset) *
        0.72,
    );
    const scale = PLAYER_SPRITE_SCALE * this.camera.zoom;
    const left = base.x - sprite.anchorX * scale;
    const top = base.y - sprite.anchorY * scale;
    const width = sprite.width * scale;
    const height = sprite.height * scale;

    return (
      screenX >= left &&
      screenX <= left + width &&
      screenY >= top &&
      screenY <= top + height
    );
  }

  ambientSpriteSet(ambient) {
    if (ambient.species === AMBIENT_SPECIES.DONKEY) {
      return this.donkeySkin(ambient)?.frames ?? this.assets.ambientSprites?.donkey;
    }

    return this.assets.ambientSprites?.[ambient.species] ?? null;
  }

  pickAmbientAt(
    screenX,
    screenY,
    { hostileOnly = false, attackable = false, species = null } = {},
  ) {
    const sprites = this.assets.ambientSprites;
    let best = null;

    if (!sprites) {
      return null;
    }

    for (const id of this.getAmbientIds()) {
      const ambient = this.ecs.getComponent(id, Component.AMBIENT);

      if (ambient.companion || ambient.tamed) {
        continue;
      }

      if (species && ambient.species !== species) {
        continue;
      }

      if (attackable) {
        if (!ATTACKABLE_AMBIENT_SPECIES.has(ambient.species)) {
          continue;
        }
      } else if (hostileOnly && !isHostileSpecies(ambient.species)) {
        continue;
      }

      const spriteSet = this.ambientSpriteSet(ambient);

      if (!spriteSet || spriteSet.length === 0) {
        continue;
      }

      const transform = this.ecs.getComponent(id, Component.TRANSFORM);
      const motion = this.ecs.getComponent(id, Component.MOTION);
      const frame = motion.moving
        ? 1 + (Math.floor(motion.walkTime * 7) % 2)
        : 0;
      const sprite = spriteSet[frame] ?? spriteSet[0];
      const base = this.camera.project(
        transform.x,
        transform.y,
        (transform.z ?? 0) + this.world.heightAt(transform.x, transform.y) * 0.72,
      );
      const scale =
        (AMBIENT_SCALES[ambient.species] ?? 1) * this.camera.zoom;
      const left = base.x - sprite.anchorX * scale;
      const top = base.y - sprite.anchorY * scale;
      const width = sprite.width * scale;
      const height = sprite.height * scale;

      if (
        screenX >= left &&
        screenX <= left + width &&
        screenY >= top &&
        screenY <= top + height
      ) {
        const depth = transform.x + transform.y;
        if (!best || depth > best.depth) {
          best = { id, depth };
        }
      }
    }

    return best?.id ?? null;
  }

  handleDonkeyInteraction(id) {
    const ambient = this.ecs.getComponent(id, Component.AMBIENT);
    const transform = this.ecs.getComponent(id, Component.TRANSFORM);

    if (!ambient || !transform) {
      return;
    }

    const distance = Math.hypot(
      transform.x - this.playerTransform.x,
      transform.y - this.playerTransform.y,
    );
    if (distance > DONKEY_INTERACT_RANGE) {
      this.notify("Acércate al burro.");
      return;
    }

    if (ambient.tamed) {
      this.mountDonkey();
      return;
    }

    const selected = this.getSelectedEntry();
    if (
      selected?.kind !== "resource" ||
      (selected.key !== "trigo" && selected.key !== "bayas")
    ) {
      this.notify("Selecciona trigo o bayas y vuelve a hacer clic para domesticarlo.");
      return;
    }

    if (this.inventory.remove(selected.key, 1) <= 0) {
      this.notify("No tienes ese alimento.");
      return;
    }

    const fed = feedDonkey(ambient);
    this.effects.addText(
      `Confianza ${fed.trust}/${DONKEY_TRUST_REQUIRED}`,
      transform.x,
      transform.y,
      { color: "#f0c07a" },
    );

    if (fed.tamedNow) {
      this.notify("¡Burro domesticado! Haz clic en él para montarlo.");
      this.effects.addText("¡Domesticado!", transform.x, transform.y, {
        color: "#7ec699",
      });
    } else {
      this.notify(
        `El burro come de tu mano. Confianza ${fed.trust}/${DONKEY_TRUST_REQUIRED}.`,
      );
    }

    this.updateHud();
    this.save();
  }

  mountDonkey() {
    const ambient = this.getDonkey();
    if (!ambient?.tamed) {
      return;
    }

    this.donkeyMounted = true;
    ambient.mounted = true;
    this.syncMountedDonkey();
    this.cameraFollow = true;
    this.notify("Montado. Te mueves más rápido. Pulsa Usar (Shift+E) para desmontar.");
    this.save();
  }

  dismountDonkey() {
    if (!this.donkeyMounted) {
      return;
    }

    const ambient = this.getDonkey();
    this.donkeyMounted = false;
    if (ambient) {
      ambient.mounted = false;
      ambient.anchorX = this.playerTransform.x;
      ambient.anchorY = this.playerTransform.y;
    }
    this.notify("Has desmontado del burro.");
    this.save();
  }

  pickWorkerAt(screenX, screenY) {
    const spriteSet = this.assets.workerSprites;
    let best = null;

    if (!spriteSet || spriteSet.length === 0) {
      return null;
    }

    for (const id of this.getWorkerIds()) {
      const transform = this.ecs.getComponent(id, Component.TRANSFORM);
      const motion = this.ecs.getComponent(id, Component.MOTION);
      const frame = motion.moving ? 1 + (Math.floor(motion.walkTime * 8) % 2) : 0;
      const sprite = spriteSet[frame] ?? spriteSet[0];
      const base = this.camera.project(
        transform.x,
        transform.y,
        this.world.heightAt(transform.x, transform.y) * 0.72,
      );
      const scale = WORKER_SPRITE_SCALE * this.camera.zoom;
      const left = base.x - sprite.anchorX * scale;
      const top = base.y - sprite.anchorY * scale;
      const width = sprite.width * scale;
      const height = sprite.height * scale;

      if (
        screenX >= left &&
        screenX <= left + width &&
        screenY >= top &&
        screenY <= top + height
      ) {
        const depth = transform.x + transform.y;
        if (!best || depth > best.depth) {
          best = { id, depth };
        }
      }
    }

    return best?.id ?? null;
  }

  pickStructureAt(screenX, screenY) {
    const candidates = [];

    if (this.university) {
      candidates.push({
        type: "university",
        x: this.university.x,
        y: this.university.y,
        spriteSet: this.assets.universitySprites,
        university: this.university,
      });
    }

    if (this.observatory) {
      candidates.push({
        type: "observatory",
        x: this.observatory.x,
        y: this.observatory.y,
        spriteSet: this.assets.observatorySprites,
      });
    }

    for (const oven of this.ovens) {
      candidates.push({
        type: STATION_TYPES.OVEN,
        x: oven.x,
        y: oven.y,
        spriteSet: this.assets.ovenSprites,
      });
    }

    for (const table of this.brewingTables) {
      candidates.push({
        type: STATION_TYPES.BREWING_TABLE,
        x: table.x,
        y: table.y,
        spriteSet: this.assets.brewingTableSprites,
      });
    }

    for (const chest of this.chests) {
      candidates.push({
        type: "chest",
        x: chest.x,
        y: chest.y,
        spriteSet: this.assets.chestSprites,
        chest,
      });
    }

    for (const cauldron of this.cauldrons) {
      candidates.push({
        type: STATION_TYPES.CAULDRON,
        x: cauldron.x,
        y: cauldron.y,
        spriteSet: this.assets.cauldronSprites,
      });
    }

    for (const bed of this.beds) {
      candidates.push({
        type: "bed",
        x: bed.x,
        y: bed.y,
        spriteSet: this.assets.bedSprites,
        bed,
      });
    }

    let best = null;

    for (const candidate of candidates) {
      const sprite = candidate.spriteSet?.[0];
      if (!sprite) {
        continue;
      }

      const base = this.camera.project(
        candidate.x,
        candidate.y,
        this.world.heightAt(candidate.x, candidate.y) * 0.72,
      );
      const scale = this.camera.zoom;
      const left = base.x - sprite.anchorX * scale;
      const top = base.y - sprite.anchorY * scale;
      const width = sprite.width * scale;
      const height = sprite.height * scale;

      if (
        screenX >= left &&
        screenX <= left + width &&
        screenY >= top &&
        screenY <= top + height
      ) {
        const depth = candidate.x + candidate.y;
        if (!best || depth > best.depth) {
          best = { ...candidate, depth };
        }
      }
    }

    return best;
  }

  tryOpenStationAt(screenX, screenY) {
    const structure = this.pickStructureAt(screenX, screenY);

    if (!structure) {
      return false;
    }

    const transform = this.playerTransform;
    const distance = Math.hypot(structure.x - transform.x, structure.y - transform.y);

    if (distance > 3.5 && structure.type === "chest") {
      this.notify("AcǸrcate al cofre para abrirlo.");
      return true;
    }

    if (distance > 3.5 && structure.type === "bed") {
      this.notify("Acercate a la cama para usarla.");
      return true;
    }

    if (structure.type === "university") {
      if (distance > 6) {
        this.notify("Acercate a la Universidad para entrar.");
        return true;
      }
      this.openUniversity();
      return true;
    }

    if (structure.type === "observatory") {
      if (distance > 6) {
        this.notify("Acércate al observatorio para entrar.");
        return true;
      }
      this.openObservatory();
      return true;
    }

    if (distance > 3.5 && structure.type === STATION_TYPES.CAULDRON) {
      this.notify("Acercate al caldero para usarlo.");
      return true;
    }

    if (distance > 3.5) {
      this.notify(
        structure.type === STATION_TYPES.OVEN
          ? "Acércate al horno para usarlo."
          : "Acércate a la mesa de brebajes para usarla.",
      );
      return true;
    }

    if (structure.type === "chest") {
      this.openChest(structure.chest);
      return true;
    }

    if (structure.type === "bed") {
      this.useBed(structure.bed);
      return true;
    }

    this.openStation(structure.type, structure);
    return true;
  }

  useBed(bed) {
    if (!bed) {
      return;
    }

    this.spawnPoint = { x: bed.x, y: bed.y };
    this.health = this.maxHealth;
    this.lastDamageTime = this.gameTime;
    this.updateHealthHud();
    this.save();
    this.effects.addText("Descanso", bed.x, bed.y, { color: "#7ec699" });
    this.notify("Cama de piel: punto de reaparicion actualizado y salud restaurada.");
  }

  collectWater(tileX, tileY) {
    const transform = this.playerTransform;
    const distance = Math.hypot(
      tileX + 0.5 - transform.x,
      tileY + 0.5 - transform.y,
    );

    if (distance > WATER_REACH) {
      this.notify("Acércate al agua para recoger una gota.");
      return;
    }

    if (this.inventory.add("agua", 1) <= 0) {
      this.notify("Inventario lleno.");
      return;
    }

    this.effects.addText("+1 Gota de agua", tileX + 0.5, tileY + 0.5, {
      color: "#8fd1e8",
    });
    this.updateHud();
  }

  getFarmPlotAt(x, y) {
    return (
      this.farmPlots.find(
        (plot) => plot.x === Math.floor(x) && plot.y === Math.floor(y),
      ) ?? null
    );
  }

  isTillableAt(x, y) {
    if (this.world.biomeAt(x, y) === BIOME.WATER) {
      return false;
    }
    if (!this.isPlayerWalkableAt(x, y)) {
      return false;
    }
    if (this.isStructureAt(x, y)) {
      return false;
    }
    if (this.getFarmPlotAt(x, y)) {
      return false;
    }
    return !this.world.getNodeAt("tree", x, y) &&
      !this.world.getNodeAt("mineral", x, y) &&
      !this.world.getNodeAt("bush", x, y) &&
      !this.world.getNodeAt("grass", x, y);
  }

  syncFarmPlot(plot) {
    this.network?.sendFarm(plot);
    this.save();
  }

  tryFarmInteraction(tileX, tileY) {
    const selected = this.getSelectedEntry();
    const plot = this.getFarmPlotAt(tileX, tileY);
    const transform = this.playerTransform;
    const distance = Math.hypot(
      tileX + 0.5 - transform.x,
      tileY + 0.5 - transform.y,
    );

    if (selected?.kind === "tool" && selected.key === "hoe") {
      if (plot) {
        this.notify("Aquí ya hay una parcela.");
        return true;
      }
      if (distance > FARM_REACH) {
        this.notify("Acércate para preparar la tierra.");
        return true;
      }
      if (!this.isTillableAt(tileX, tileY)) {
        this.notify("No puedes preparar una parcela aquí.");
        return true;
      }
      if (this.farmPlots.length >= FARM_PLOT_LIMIT) {
        this.notify("Demasiadas parcelas.");
        return true;
      }
      const newPlot = createFarmPlot(tileX, tileY);
      this.farmPlots.push(newPlot);
      this.effects.addText("Parcela", tileX + 0.5, tileY + 0.5, {
        color: "#b98a4e",
      });
      this.syncFarmPlot(newPlot);
      this.notify("Parcela creada. Selecciona una semilla de cultivo y colócala.");
      return true;
    }

    if (!plot) {
      return false;
    }

    if (distance > FARM_REACH) {
      this.notify("Acércate a la parcela.");
      return true;
    }

    if (plot.crop && plot.stage >= 3) {
      const result = harvestFarmPlot(plot);
      if (!result) {
        return true;
      }
      this.inventory.add(result.crop.produce, result.produce);
      this.inventory.add(result.crop.seed, result.seeds);
      this.effects.addText(
        `+${result.produce} ${result.crop.name}`,
        tileX + 0.5,
        tileY + 0.5,
        { color: result.crop.color },
      );
      this.syncFarmPlot(plot);
      this.updateHud();
      this.notify(`${result.crop.name} cosechado.`);
      return true;
    }

    if (selected?.kind === "resource") {
      const crop = Object.values(CROP_DATA).find(
        (entry) => entry.seed === selected.key,
      );

      if (crop) {
        if (!plantCrop(plot, crop.id, this.gameTime)) {
          this.notify("Esta parcela ya tiene un cultivo.");
          return true;
        }
        if (this.inventory.remove(selected.key, 1) <= 0) {
          plot.crop = null;
          this.notify("No tienes semillas.");
          return true;
        }
        this.effects.addText(crop.name, tileX + 0.5, tileY + 0.5, {
          color: crop.color,
        });
        this.syncFarmPlot(plot);
        this.updateHud();
        this.notify(`${crop.name} plantado. Riega la parcela para acelerar el crecimiento.`);
        return true;
      }

      if (selected.key === "agua") {
        if (waterFarmPlot(plot)) {
          if (this.inventory.remove("agua", 1) <= 0) {
            plot.watered = false;
            this.notify("No tienes agua.");
            return true;
          }
          this.effects.addText("Regado", tileX + 0.5, tileY + 0.5, {
            color: "#8fd1e8",
          });
          this.syncFarmPlot(plot);
          this.updateHud();
          this.notify("Parcela regada.");
        } else if (!plot.crop) {
          this.notify("Primero planta un cultivo.");
        } else {
          this.notify("Esta parcela ya está regada.");
        }
        return true;
      }
    }

    if (plot.crop) {
      const crop = cropById(plot.crop);
      this.notify(
        `${crop?.name ?? "Cultivo"} · etapa ${plot.stage + 1}/4${plot.watered ? " · regado" : ""}`,
      );
    } else {
      this.notify("Parcela vacía. Planta semilla de trigo o maíz.");
    }
    return true;
  }

  tryPlantSeed(tileX, tileY, selected) {
    if (selected?.kind !== "resource") {
      return false;
    }
    if (selected.key !== "semillaArbol" && selected.key !== "semillaHierba") {
      return false;
    }

    const transform = this.playerTransform;
    const distance = Math.hypot(
      tileX + 0.5 - transform.x,
      tileY + 0.5 - transform.y,
    );

    if (distance > FARM_REACH) {
      this.notify("Acércate al lugar donde quieres plantar.");
      return true;
    }

    if (
      this.world.biomeAt(tileX, tileY) === BIOME.WATER ||
      !this.isPlayerWalkableAt(tileX, tileY) ||
      this.isStructureAt(tileX, tileY) ||
      this.getFarmPlotAt(tileX, tileY) ||
      this.world.getNodeAt("tree", tileX, tileY) ||
      this.world.getNodeAt("mineral", tileX, tileY) ||
      this.world.getNodeAt("bush", tileX, tileY) ||
      this.world.getNodeAt("grass", tileX, tileY)
    ) {
      this.notify("No puedes plantar aquí.");
      return true;
    }

    const rng = createRng(
      `${this.world.seed}:plant:${selected.key}:${tileX}:${tileY}`,
    );
    const biome = this.world.biomeAt(tileX, tileY);
    let data;

    if (selected.key === "semillaArbol") {
      const species =
        biome === BIOME.SNOW
          ? 1
          : biome === BIOME.JUNGLE
            ? 2
            : biome === BIOME.DESERT
              ? 3
              : rng.chance(0.8)
                ? 0
                : 1;
      data = {
        species,
        variant: rng.int(0, 6),
        scale: rng.float(0.75, 1.18),
      };
      this.world.plantNode("tree", tileX, tileY, data);
      this.network?.sendPlant("tree", tileX, tileY, data);
    } else {
      const style =
        biome === BIOME.JUNGLE ? "lush" : biome === BIOME.DESERT ? "dry" : "normal";
      data = {
        variant: rng.int(0, 4),
        scale: rng.float(0.75, 1.2),
        style,
      };
      this.world.plantNode("grass", tileX, tileY, data);
      this.network?.sendPlant("grass", tileX, tileY, data);
    }

    this.inventory.remove(selected.key, 1);
    this.effects.addText("Plantado", tileX + 0.5, tileY + 0.5, {
      color: selected.color,
    });
    this.updateHud();
    this.save();
    this.notify(
      selected.key === "semillaArbol" ? "Árbol plantado." : "Hierba plantada.",
    );
    return true;
  }

  updateFarmPlots(deltaSeconds) {
    for (const plot of this.farmPlots) {
      if (updateFarmPlot(plot, deltaSeconds)) {
        this.syncFarmPlot(plot);
      }
    }
  }

  updateFarmAnimals(deltaSeconds) {
    const eaters = new Set([
      AMBIENT_SPECIES.GOAT,
      AMBIENT_SPECIES.SPARROW,
      AMBIENT_SPECIES.CROW,
      AMBIENT_SPECIES.OWL,
    ]);

    for (const id of this.getAmbientIds()) {
      const ambient = this.ecs.getComponent(id, Component.AMBIENT);

      if (!eaters.has(ambient.species)) {
        continue;
      }

      ambient.farmEatTimer =
        (ambient.farmEatTimer ?? 3.5 + (ambient.phase % 2)) - deltaSeconds;

      if (ambient.farmEatTimer > 0) {
        continue;
      }
      ambient.farmEatTimer = 4 + (ambient.phase % 3);

      const transform = this.ecs.getComponent(id, Component.TRANSFORM);

      if (ambient.species === AMBIENT_SPECIES.GOAT) {
        const plot = this.farmPlots.find(
          (entry) =>
            entry.crop &&
            Math.hypot(entry.x + 0.5 - transform.x, entry.y + 0.5 - transform.y) < 1.4,
        );

        if (plot) {
          plot.crop = null;
          plot.stage = 0;
          plot.growth = 0;
          plot.watered = false;
          plot.plantedAt = 0;
          this.syncFarmPlot(plot);
          this.effects.addText("Cabra hambrienta", plot.x + 0.5, plot.y + 0.5, {
            color: "#d8c7a8",
          });
          this.notify("Una cabra se comió un cultivo.");
        }
      } else {
        const seedIndex = this.groundItems.findIndex(
          (item) =>
            item.kind === "resource" &&
            item.key.startsWith("semilla") &&
            Math.hypot(item.x - transform.x, item.y - transform.y) < 1.3,
        );

        if (seedIndex >= 0) {
          const item = this.groundItems[seedIndex];
          item.amount -= 1;
          if (item.amount <= 0) {
            this.groundItems.splice(seedIndex, 1);
          }
          this.effects.addText("Semilla comida", transform.x, transform.y, {
            color: "#d8e0ea",
          });
        }
      }
    }
  }

  startFishing(tileX, tileY) {
    if (this.fishing) {
      return;
    }

    const selected = this.getSelectedEntry();

    if (!this.inventory.hasTool("fishingRod")) {
      this.notify("Necesitas una caña de pescar.");
      return;
    }

    if (!(selected?.kind === "tool" && selected.key === "fishingRod")) {
      this.notify("Selecciona la caña de pescar en la barra (1-9).");
      return;
    }

    if (this.world.biomeAt(tileX, tileY) !== BIOME.WATER) {
      return;
    }

    const transform = this.playerTransform;
    const distance = Math.hypot(
      tileX + 0.5 - transform.x,
      tileY + 0.5 - transform.y,
    );

    if (distance > FISHING_REACH) {
      this.notify("Acércate al agua para lanzar la caña.");
      return;
    }

    this.cancelPlayerAction();
    this.cameraFollow = true;
    this.playerMotion.moving = false;
    this.playerMotion.facing =
      tileX + 0.5 - transform.x >= 0 ? 1 : -1;
    this.fishing = createFishingAttempt(this.fishingRng, {
      x: tileX + 0.5,
      y: tileY + 0.5,
    });
    this.updateFishingOverlay();
    this.effects.addText("Línea al agua", transform.x, transform.y, {
      color: "#8fd1e8",
    });
  }

  updateFishing(deltaSeconds) {
    if (!this.fishing) {
      this.updateFishingOverlay();
      return;
    }

    const status = updateFishingAttempt(this.fishing, deltaSeconds);

    if (status === "bite") {
      this.effects.addText("¡PICÓ!", this.fishing.x, this.fishing.y, {
        color: "#f0c07a",
      });
    } else if (status === "escape") {
      this.cancelFishing("El pez escapó. Prueba otra vez.");
      return;
    }

    this.updateFishingOverlay();
  }

  updateFishingOverlay() {
    const panel = this.hud.fishingPanel;

    if (!panel) {
      return;
    }

    if (!this.fishing) {
      panel.hidden = true;
      return;
    }

    const waiting = this.fishing.phase === "waiting";
    panel.hidden = false;
    panel.dataset.phase = waiting ? "waiting" : "bite";

    if (this.hud.fishingTitle) {
      this.hud.fishingTitle.textContent = waiting
        ? "Esperando a que piquen..."
        : "¡PICÓ! Toca o pulsa E";
    }
    if (this.hud.fishingBar) {
      this.hud.fishingBar.hidden = waiting;
    }
    if (this.hud.fishingHint) {
      this.hud.fishingHint.textContent = waiting
        ? "E / Usar o clic derecho para recoger la caña"
        : "Toca la pantalla o pulsa E en el momento justo";
    }
    if (!waiting && this.hud.fishingMarker) {
      this.hud.fishingMarker.style.left = `${fishingMarkerAt(this.fishing) * 100}%`;
    }
    const zoneLeft = (this.fishing.zoneCenter - this.fishing.zoneHalf) * 100;
    const zoneWidth = this.fishing.zoneHalf * 200;
    const perfectLeft = (this.fishing.zoneCenter - this.fishing.perfectHalf) * 100;
    const perfectWidth = this.fishing.perfectHalf * 200;
    panel.style.setProperty("--fishing-zone-left", `${zoneLeft}%`);
    panel.style.setProperty("--fishing-zone-width", `${zoneWidth}%`);
    panel.style.setProperty("--fishing-perfect-left", `${perfectLeft}%`);
    panel.style.setProperty("--fishing-perfect-width", `${perfectWidth}%`);
  }

  resolveFishingTap() {
    if (!this.fishing || this.fishing.phase !== "bite") {
      return;
    }

    const attempt = this.fishing;
    const marker = fishingMarkerAt(attempt);
    const result = resolveFishingCatch(attempt, marker);

    if (!result.caught) {
      this.cancelFishing("Fallaste el tirón. El pez escapó.");
      return;
    }

    const added = this.inventory.addItem("pescado", 1);
    const previous = this.fishingRecords[result.species.id];
    const isRecord = !previous || result.weight > previous.weight;

    this.fishingRecords[result.species.id] = {
      weight: isRecord ? result.weight : previous.weight,
      count: (previous?.count ?? 0) + 1,
    };

    if (added <= 0) {
      this.groundItems.push({
        kind: "item",
        key: "pescado",
        amount: 1,
        label: ITEM_INFO.pescado.label,
        color: "#c9a36a",
        x: attempt.x,
        y: attempt.y,
      });
    }

    this.fishing = null;
    this.updateFishingOverlay();
    this.updateHud();
    this.save();
    this.effects.addText(
      `+1 ${result.species.name}`,
      attempt.x,
      attempt.y,
      { color: result.species.color },
    );

    const weight = formatFishWeight(result.weight);
    this.notify(
      added > 0
        ? `¡${result.species.name}! ${weight}${isRecord ? " · nuevo récord" : ""}`
        : `Pescado en el suelo (inventario lleno): ${result.species.name} ${weight}.`,
    );
  }

  cancelFishing(message = null) {
    if (!this.fishing) {
      return false;
    }

    this.fishing = null;
    this.updateFishingOverlay();

    if (message) {
      this.notify(message);
    }

    return true;
  }

  birdMissionProgress() {
    return birdMissionState({
      observations: [...this.birdObservations],
      completed: this.birdMissionCompleted,
    });
  }

  pickBirdAt(screenX, screenY) {
    const sprites = this.assets.ambientSprites;
    let best = null;

    if (!sprites) {
      return null;
    }

    for (const id of this.getAmbientIds()) {
      const ambient = this.ecs.getComponent(id, Component.AMBIENT);
      const bird = birdForAmbientSpecies(ambient?.species);
      if (!bird) {
        continue;
      }

      const spriteSet = this.ambientSpriteSet(ambient);
      if (!spriteSet || spriteSet.length === 0) {
        continue;
      }

      const transform = this.ecs.getComponent(id, Component.TRANSFORM);
      const motion = this.ecs.getComponent(id, Component.MOTION);
      const frame = motion.moving
        ? 1 + (Math.floor(motion.walkTime * 7) % Math.max(1, spriteSet.length - 1))
        : 0;
      const sprite = spriteSet[frame] ?? spriteSet[0];
      const base = this.camera.project(
        transform.x,
        transform.y,
        (transform.z ?? 0) + this.world.heightAt(transform.x, transform.y) * 0.72,
      );
      const scale = (AMBIENT_SCALES[ambient.species] ?? 1) * this.camera.zoom;
      const left = base.x - sprite.anchorX * scale;
      const top = base.y - sprite.anchorY * scale;

      if (
        screenX >= left &&
        screenX <= left + sprite.width * scale &&
        screenY >= top &&
        screenY <= top + sprite.height * scale
      ) {
        const depth = transform.x + transform.y;
        if (!best || depth > best.depth) {
          best = { id, depth };
        }
      }
    }

    return best?.id ?? null;
  }

  startBirdWatch(targetId) {
    if (!this.inventory.hasTool("binoculars")) {
      this.notify("Necesitas prismáticos para observar aves.");
      return;
    }

    const ambient = this.ecs.getComponent(targetId, Component.AMBIENT);
    const transform = this.ecs.getComponent(targetId, Component.TRANSFORM);
    const bird = birdForAmbientSpecies(ambient?.species);

    if (!ambient || !transform || !bird) {
      this.notify("Ese animal no es un ave observables.");
      return;
    }

    const distance = Math.hypot(
      transform.x - this.playerTransform.x,
      transform.y - this.playerTransform.y,
    );

    if (distance > BIRD_WATCH_RANGE) {
      this.notify("El ave está demasiado lejos. Acércate con los prismáticos.");
      return;
    }

    this.cancelFishing();
    this.birdWatch = createBirdWatchAttempt(this.birdRng, bird, {
      skill: this.lensLevel === "bronce" ? 0 : 1,
    });
    this.birdWatch.targetId = targetId;
    this.birdWatch.speciesName = bird.name;
    this.updateBirdWatchOverlay();
    this.notify(`Observando: ${bird.name}. Enfoca en el momento justo.`);
  }

  updateBirdWatch(deltaSeconds) {
    if (!this.birdWatch) {
      this.updateBirdWatchOverlay();
      return;
    }

    if (this.birdWatch.phase !== "aiming") {
      return;
    }

    if (
      this.birdWatch.targetId &&
      !this.ecs.hasComponent(this.birdWatch.targetId, Component.AMBIENT)
    ) {
      this.cancelBirdWatch("El ave se marchó.");
      return;
    }

    const status = updateBirdWatchAttempt(this.birdWatch, deltaSeconds);
    if (status.expired) {
      this.cancelBirdWatch("El ave se cansó de esperar y se fue.");
      return;
    }

    this.updateBirdWatchOverlay();
  }

  updateBirdWatchOverlay() {
    const panel = this.hud.birdWatchPanel;
    if (!panel) {
      return;
    }

    if (!this.birdWatch) {
      panel.hidden = true;
      panel.classList.remove("is-open");
      return;
    }

    panel.hidden = false;
    panel.classList.add("is-open");

    if (this.hud.birdWatchTitle) {
      this.hud.birdWatchTitle.textContent = `Observando: ${this.birdWatch.speciesName}`;
    }
    if (this.hud.birdWatchHint) {
      this.hud.birdWatchHint.textContent =
        "Pulsa Enfocar o toca la barra cuando el marcador esté en la zona.";
    }
    if (this.hud.birdWatchMarker) {
      this.hud.birdWatchMarker.style.left = `${birdWatchMarkerAt(this.birdWatch) * 100}%`;
    }
    const zoneLeft = (this.birdWatch.zoneCenter - this.birdWatch.zoneHalf) * 100;
    const zoneWidth = this.birdWatch.zoneHalf * 200;
    const perfectLeft =
      (this.birdWatch.zoneCenter - this.birdWatch.perfectHalf) * 100;
    const perfectWidth = this.birdWatch.perfectHalf * 200;
    panel.style.setProperty("--bird-zone-left", `${zoneLeft}%`);
    panel.style.setProperty("--bird-zone-width", `${zoneWidth}%`);
    panel.style.setProperty("--bird-perfect-left", `${perfectLeft}%`);
    panel.style.setProperty("--bird-perfect-width", `${perfectWidth}%`);
  }

  focusBirdWatch() {
    if (!this.birdWatch || this.birdWatch.phase !== "aiming") {
      return;
    }

    const attempt = this.birdWatch;
    const marker = birdWatchMarkerAt(attempt);
    const result = resolveBirdWatch(attempt, marker);

    if (!result.ok) {
      this.cancelBirdWatch("El ave se asustó y escapó. Inténtalo otra vez.");
      return;
    }

    const bird = birdById(attempt.speciesId);
    if (bird) {
      this.recordBirdObservation(bird, result.perfect);
    }

    this.cancelBirdWatch(
      result.perfect
        ? `¡Observación perfecta de ${bird?.name ?? "ave"}!`
        : `Has observado un ${bird?.name ?? "ave"}.`,
    );
  }

  recordBirdObservation(bird, perfect = false) {
    const id = bird.id;
    const first = !this.birdObservations.has(id);
    this.birdObservations.add(id);

    const record = this.birdRecords[id] ?? { count: 0, best: 0 };
    record.count += 1;
    record.best = Math.max(record.best, perfect ? 2 : 1);
    this.birdRecords[id] = record;

    this.feathers[bird.ambient] = (this.feathers[bird.ambient] ?? 0) + 1;
    const added = this.inventory.add("pluma", 1);
    if (added <= 0) {
      this.groundItems.push({
        kind: "resource",
        key: "pluma",
        amount: 1,
        label: RESOURCE_INFO.pluma.label,
        color: RESOURCE_INFO.pluma.color,
        x: this.playerTransform.x,
        y: this.playerTransform.y,
      });
    }

    const mission = this.birdMissionProgress();
    if (mission.complete && !this.birdMissionCompleted) {
      this.birdMissionCompleted = true;
      this.inventory.add("pluma", BIRD_MISSION.rewardFeathers);
      this.notify(
        `¡Misión de aves completada! +${BIRD_MISSION.rewardFeathers} plumas.`,
      );
      this.effects.addText("¡Cuaderno completo!", this.playerTransform.x, this.playerTransform.y, {
        color: "#8fd1e8",
      });
    }

    this.updateHud();
    this.renderBirdPanel();
    this.save();
    return first;
  }

  cancelBirdWatch(message = null) {
    const had = Boolean(this.birdWatch);
    this.birdWatch = null;
    this.updateBirdWatchOverlay();
    if (message) {
      this.notify(message);
    }
    return had;
  }

  toggleBirdPanel() {
    if (this.birdPanelOpen) {
      this.closeBirdPanel();
      return;
    }

    this.closeQuest();
    this.closeObservatory();
    this.closeCrafting();
    this.closeRecipeBook();
    this.closeChest();
    this.closeUniversity();
    this.closeTrade();
    this.closeVillage();
    this.closeWolfDen();
    this.closeMap();
    this.birdPanelOpen = true;
    if (this.hud.birdPanel) {
      this.hud.birdPanel.hidden = false;
    }
    this.hud.birdPanel?.classList.add("is-open");
    this.hud.birdPanel?.setAttribute("aria-hidden", "false");
    this.hud.btnBirds?.setAttribute("aria-expanded", "true");
    this.renderBirdPanel();
  }

  closeBirdPanel() {
    this.birdPanelOpen = false;
    if (this.hud.birdPanel) {
      this.hud.birdPanel.hidden = true;
    }
    this.hud.birdPanel?.classList.remove("is-open");
    this.hud.birdPanel?.setAttribute("aria-hidden", "true");
    this.hud.btnBirds?.setAttribute("aria-expanded", "false");
  }

  renderBirdPanel() {
    const list = this.hud.birdList;
    if (!list) {
      return;
    }

    const mission = this.birdMissionProgress();
    if (this.hud.birdStatus) {
      this.hud.birdStatus.textContent = mission.complete
        ? "Misión completada: cuaderno de aves reunido."
        : `${BIRD_MISSION.title} · ${mission.count}/${mission.required}`;
    }

    const fragment = document.createDocumentFragment();
    for (const bird of BIRD_SPECIES) {
      const observed = this.birdObservations.has(bird.id);
      const record = this.birdRecords[bird.id];
      const row = document.createElement("article");
      row.className = "bird-row";
      row.classList.toggle("is-observed", observed);

      const name = document.createElement("strong");
      name.textContent = observed ? bird.name : "???";
      const meta = document.createElement("small");
      meta.textContent = observed
        ? `${bird.rarity} · ${record?.count ?? 0} avistamientos`
        : "Sin observar";
      const desc = document.createElement("small");
      desc.className = "bird-desc";
      desc.textContent = observed
        ? bird.description
        : "Usa los prismáticos para descubrir esta especie.";

      row.append(name, meta, desc);
      fragment.append(row);
    }

    if (fragment.childNodes.length === 0) {
      const empty = document.createElement("p");
      empty.className = "quest-empty";
      empty.textContent = "Aún no hay especies registradas.";
      fragment.append(empty);
    }

    list.replaceChildren(fragment);
  }

  wolfMissionProgress() {
    return wolfMissionState({
      kills: this.wolfMission.kills,
      pelts: this.inventory.count("pielLobo"),
      completed: this.wolfMission.completed,
      claimed: this.wolfMission.claimed,
    });
  }

  updateWolfMissionDiscovery() {
    if (!this.wolfDen || this.wolfMission.discovered) {
      return;
    }

    const distance = Math.hypot(
      this.wolfDen.x - this.playerTransform.x,
      this.wolfDen.y - this.playerTransform.y,
    );

    if (distance <= 55) {
      this.wolfMission.discovered = true;
      this.wolfDen.discovered = true;
      this.wolfNotified = true;
      this.notify(
        "Has descubierto una cueva de lobos. Derrota 3 lobos y trae 2 pieles de lobo.",
      );
      this.updateQuestButton();
      this.save();
    }
  }

  openWolfDen() {
    if (!this.wolfDen) {
      return;
    }

    const distance = Math.hypot(
      this.wolfDen.x - this.playerTransform.x,
      this.wolfDen.y - this.playerTransform.y,
    );

    if (distance > 4.5) {
      this.notify("Acércate a la cueva de lobos.");
      return;
    }

    this.closeQuest();
    this.closeBirdPanel();
    this.closeObservatory();
    this.closeCrafting();
    this.closeRecipeBook();
    this.closeChest();
    this.closeUniversity();
    this.closeTrade();
    this.closeVillage();
    this.closeMap();
    this.wolfOpen = true;
    if (this.hud.wolfPanel) {
      this.hud.wolfPanel.hidden = false;
    }
    this.hud.wolfPanel?.classList.add("is-open");
    this.hud.wolfPanel?.setAttribute("aria-hidden", "false");
    this.renderWolfPanel();
  }

  closeWolfDen() {
    this.wolfOpen = false;
    if (this.hud.wolfPanel) {
      this.hud.wolfPanel.hidden = true;
    }
    this.hud.wolfPanel?.classList.remove("is-open");
    this.hud.wolfPanel?.setAttribute("aria-hidden", "true");
  }

  renderWolfPanel() {
    if (!this.wolfOpen) {
      return;
    }

    const state = this.wolfMissionProgress();
    if (this.hud.wolfTitle) {
      this.hud.wolfTitle.textContent = WOLF_MISSION.name;
    }
    if (this.hud.wolfStatus) {
      this.hud.wolfStatus.textContent = state.completed
        ? "Misión completada. La manada ya no amenaza el bosque."
        : `${WOLF_MISSION.description} Lobos ${state.kills}/${state.wolvesRequired} · Pieles ${state.pelts}/${state.peltsRequired}`;
    }
    if (this.hud.wolfProgress) {
      this.hud.wolfProgress.textContent = state.completed
        ? `Recompensa entregada · ${state.kills} lobos derrotados`
        : `Progreso: lobos ${state.kills}/${state.wolvesRequired}, pieles ${state.pelts}/${state.peltsRequired}`;
    }
    if (this.hud.btnWolfClaim) {
      this.hud.btnWolfClaim.disabled = !state.canClaim;
      this.hud.btnWolfClaim.textContent = state.completed
        ? "Completada"
        : state.canClaim
          ? "Entregar 2 pieles"
          : "Faltan objetivos";
    }
  }

  claimWolfMission() {
    if (!this.wolfDen) {
      return;
    }

    const state = this.wolfMissionProgress();
    if (state.completed) {
      this.notify("La misión de la cueva ya está completada.");
      return;
    }
    if (!state.canClaim) {
      this.notify("Necesitas 3 lobos derrotados y 2 pieles de lobo.");
      return;
    }

    if (this.inventory.remove("pielLobo", WOLF_MISSION.peltsRequired) <= 0) {
      this.notify("No tienes suficientes pieles de lobo.");
      return;
    }

    this.inventory.add("pielLobo", WOLF_MISSION.rewardPelts);
    this.wolfMission.completed = true;
    this.wolfMission.claimed = true;
    this.wolfDen.discovered = true;
    this.notify(
      `¡Cueva de lobos completada! +${WOLF_MISSION.rewardPelts} pieles y recetas especiales desbloqueadas.`,
    );
    this.effects.addText("¡Misión completada!", this.wolfDen.x, this.wolfDen.y, {
      color: "#8fd1e8",
    });
    this.updateHud();
    this.renderWolfPanel();
    this.save();
  }

  capturePerdiz(id) {
    const ambient = this.ecs.getComponent(id, Component.AMBIENT);
    const transform = this.ecs.getComponent(id, Component.TRANSFORM);
    if (!ambient || !transform) {
      return;
    }

    if (this.companionSpecies) {
      this.releaseCompanion();
      this.notify("Tu mascota anterior se marchó para dejar sitio a la perdiz.");
    }

    const distance = Math.hypot(
      transform.x - this.playerTransform.x,
      transform.y - this.playerTransform.y,
    );

    if (distance > PERDIZ_CAPTURE_RANGE) {
      this.notify("Acércate más a la perdiz.");
      return;
    }

    const selected = this.getSelectedEntry();
    const foodKeys = new Set(["semillaHierba", "semillaTrigo", "trigo", "bayas"]);
    if (selected?.kind !== "resource" || !foodKeys.has(selected.key)) {
      this.notify("Selecciona semillas, trigo o bayas para atraer a la perdiz.");
      return;
    }

    if (this.inventory.remove(selected.key, 1) <= 0) {
      this.notify("No tienes ese alimento.");
      return;
    }

    this.ecs.destroyEntity(id);
    this.companionSpecies = "perdiz";
    this.setupCompanion();
    this.recordBirdObservation(birdById("perdiz"), true);
    this.effects.addText("¡Perdiz capturada!", transform.x, transform.y, {
      color: "#7ec699",
    });
    this.notify("Perdiz capturada. Ahora te acompaña como mascota.");
    this.updateHud();
    this.save();
  }

  tameWolf(id) {
    const ambient = this.ecs.getComponent(id, Component.AMBIENT);
    const transform = this.ecs.getComponent(id, Component.TRANSFORM);
    if (!ambient || !transform || ambient.species !== AMBIENT_SPECIES.WOLF) {
      return;
    }
    if (ambient.companion || ambient.tamed) {
      this.notify("Ese lobo ya te acompaña.");
      return;
    }

    const distance = Math.hypot(
      transform.x - this.playerTransform.x,
      transform.y - this.playerTransform.y,
    );
    if (distance > WOLF_TAME_RANGE) {
      this.notify("Acércate más al lobo con los huesos de pollo.");
      return;
    }
    if (this.inventory.count("huesoPollo") < WOLF_TAME_BONES) {
      this.notify(`Necesitas ${WOLF_TAME_BONES} huesos de pollo para domesticar un lobo.`);
      return;
    }

    if (ambient.network) {
      this.pendingTameNetworkId = ambient.networkId;
      this.network?.sendAmbientHit(ambient.networkId, 9999);
      this.notify("Ofreces los huesos al lobo...");
      this.save();
      return;
    }

    if (this.inventory.remove("huesoPollo", WOLF_TAME_BONES) <= 0) {
      this.notify("No tienes suficientes huesos de pollo.");
      return;
    }

    if (this.companionSpecies) {
      this.releaseCompanion();
      this.notify("Tu mascota anterior se marchó para dejar sitio al lobo.");
    }

    ambient.companion = true;
    ambient.tamed = true;
    ambient.health = WOLF_HEALTH;
    ambient.state = "idle";
    ambient.anchorX = transform.x;
    ambient.anchorY = transform.y;
    this.companionId = id;
    this.companionSpecies = "wolf";
    this.effects.addText("¡Lobo domesticado!", transform.x, transform.y, {
      color: "#7ec699",
    });
    this.notify("¡Lobo domesticado! Ahora te acompaña y ya no es hostil.");
    this.updateHud();
    this.save();
  }

  drinkSwimPotion() {
    if (this.swimRemaining >= SWIM_POTION_SECONDS) {
      this.notify("La poción de nado ya está activa.");
      return;
    }

    if (this.inventory.removeItem("swimPotion", 1) <= 0) {
      this.notify("No tienes pociones de nado.");
      return;
    }

    this.swimRemaining = SWIM_POTION_SECONDS;
    this.updateHud();
    this.save();
    this.effects.addText("Nado: 90 s", this.playerTransform.x, this.playerTransform.y, {
      color: "#8fd1e8",
    });
    this.notify("Poción de nado: puedes cruzar agua durante 90 segundos.");
  }

  usePan() {
    if (this.health >= this.maxHealth) {
      this.notify("Ya tienes la salud completa.");
      return;
    }
    if (this.inventory.removeItem("pan", 1) <= 0) {
      this.notify("No tienes pan.");
      return;
    }
    this.health = Math.min(this.maxHealth, this.health + 40);
    this.updateHealthHud();
    this.updateHud();
    this.save();
    this.effects.addText("+40 salud", this.playerTransform.x, this.playerTransform.y, {
      color: "#d8c46a",
    });
    this.notify("Pan de trigo: recuperaste 40 de salud.");
  }

  eatMaize() {
    if (this.inventory.remove("maiz", 1) <= 0) {
      this.notify("No tienes maíz.");
      return;
    }
    this.health = Math.min(this.maxHealth, this.health + 15);
    this.updateHealthHud();
    this.updateHud();
    this.save();
    this.effects.addText("+15 salud", this.playerTransform.x, this.playerTransform.y, {
      color: "#e0b85e",
    });
    this.notify("Maíz: recuperaste 15 de salud.");
  }

  useFriedFish() {
    if (this.health >= this.maxHealth) {
      this.notify("Ya tienes la salud completa.");
      return;
    }

    if (this.inventory.removeItem("pescadoFrito", 1) <= 0) {
      this.notify("No tienes pescado frito.");
      return;
    }

    this.health = Math.min(this.maxHealth, this.health + 35);
    this.updateHealthHud();
    this.updateHud();
    this.save();
    this.effects.addText("+35 salud", this.playerTransform.x, this.playerTransform.y, {
      color: "#7ec699",
    });
    this.notify("Pescado frito: recuperaste 35 de salud.");
  }

  collectChemicalStone(node) {
    if (node?.kind !== "mineral") {
      return;
    }

    const mineral = mineralById(node.type);

    if (!mineral) {
      return;
    }

    if (this.stonePouch.length >= MAX_STONES) {
      this.notify("Mochila de piedras llena.");
      return;
    }

    this.stonePouch.push({
      type: mineral.id,
      chemistry: { ...mineral.chemistry },
    });
    this.effects.addText(`Piedra de ${mineral.name}`, node.worldX, node.worldY + 0.25, {
      color: "#b7c7d9",
    });
  }

  drinkCoffee() {
    if (this.inventory.itemCount("coffee") <= 0) {
      this.notify("No tienes café. Prepara uno en la mesa de brebajes.");
      return;
    }

    this.inventory.removeItem("coffee", 1);
    this.speedBuffRemaining = COFFEE_BUFF_SECONDS;
    this.updateHud();
    this.save();
    this.effects.addText("Café: +50% velocidad", this.playerTransform.x, this.playerTransform.y, {
      color: "#e0a458",
    });
    this.notify("Café caliente: +50% de velocidad durante 30 segundos.");
  }

  useBandage() {
    if (this.health >= this.maxHealth) {
      this.notify("Ya tienes la salud completa.");
      return;
    }

    if (this.inventory.removeItem("bandage", 1) <= 0) {
      this.notify("No tienes vendas.");
      return;
    }

    this.health = Math.min(this.maxHealth, this.health + 35);
    this.updateHealthHud();
    this.effects.addText("+35 salud", this.playerTransform.x, this.playerTransform.y, {
      color: "#7ec699",
    });
    this.save();
    this.notify("Venda aplicada: recuperaste 35 de salud.");
  }

  throwPoisonPotion(targetId) {
    const itemId =
      this.getSelectedEntry()?.key === "moonPoisonPotion"
        ? "moonPoisonPotion"
        : "poisonPotion";

    if (this.inventory.removeItem(itemId, 1) <= 0) {
      this.notify("No tienes brebajes de veneno.");
      return;
    }

    const ambient = this.ecs.getComponent(targetId, Component.AMBIENT);
    const transform = this.ecs.getComponent(targetId, Component.TRANSFORM);

    if (!ambient || !transform) {
      return;
    }

    ambient.poisonSeconds = itemId === "moonPoisonPotion" ? 12 : 8;
    ambient.poisonTickTimer = 0;
    this.effects.addText(
      itemId === "moonPoisonPotion" ? "Sombra lunar" : "Veneno",
      transform.x,
      transform.y,
      { color: "#b06bff" },
    );
    this.notify(
      itemId === "moonPoisonPotion"
        ? "Brebaje de sombra aplicado al enemigo."
        : "Veneno aplicado al enemigo.",
    );
    this.updateHud();
    this.save();
  }

  usePotionItem(itemId) {
    const potion = potionById(itemId);

    if (!potion) {
      return;
    }

    if (potion.offensive) {
      this.notify("Selecciona la pocion y haz clic en un enemigo.");
      return;
    }

    if (this.inventory.removeItem(itemId, 1) <= 0) {
      this.notify("No tienes esa pocion.");
      return;
    }

    const effect = potion.effect;
    const potionMultiplier = scienceModifiers(this.sciencePoints).potionMultiplier;

    if (effect.type === "heal") {
      const amount = Math.round(effect.amount * potionMultiplier);
      this.health = Math.min(this.maxHealth, this.health + amount);
      this.updateHealthHud();
      this.effects.addText(`+${amount} salud`, this.playerTransform.x, this.playerTransform.y, {
        color: "#7ec699",
      });
      this.notify(`Pocion de curacion: +${amount} salud.`);
    } else if (effect.type === "attackBuff") {
      this.attackBuffRemaining = Math.max(
        this.attackBuffRemaining,
        effect.duration * potionMultiplier,
      );
      this.notify("Pocion de furia: ataque aumentado.");
    } else if (effect.type === "resistanceBuff") {
      this.resistanceBuffRemaining = Math.max(
        this.resistanceBuffRemaining,
        effect.duration * potionMultiplier,
      );
      this.notify("Pocion de resistencia: dano reducido.");
    } else if (effect.type === "unstable") {
      this.applyUnstablePotion();
    }

    this.updateHud();
    this.save();
  }

  applyUnstablePotion() {
    const roll = this.ambientRng.next();
    const buffs = ["speed", "attack", "resistance"];
    const debuffs = ["poison", "slow", "weakness"];

    const applyBuff = (type) => {
      if (type === "speed") {
        this.speedBuffRemaining = Math.max(this.speedBuffRemaining, 20);
      } else if (type === "attack") {
        this.attackBuffRemaining = Math.max(this.attackBuffRemaining, 25);
      } else {
        this.resistanceBuffRemaining = Math.max(
          this.resistanceBuffRemaining,
          25,
        );
      }
    };

    const applyDebuff = (type) => {
      if (type === "poison") {
        this.poisonRemaining = Math.max(this.poisonRemaining, 6);
        this.poisonTickTimer = 0;
      } else if (type === "slow") {
        this.slowRemaining = Math.max(this.slowRemaining, 15);
      } else {
        this.weaknessRemaining = Math.max(this.weaknessRemaining, 15);
      }
    };

    if (roll < 0.4) {
      applyBuff(buffs[this.ambientRng.int(0, buffs.length)]);
      this.notify("Pocion inestable: obtuviste una ventaja.");
    } else if (roll < 0.7) {
      applyBuff(buffs[this.ambientRng.int(0, buffs.length)]);
      applyDebuff(debuffs[this.ambientRng.int(0, debuffs.length)]);
      this.notify("Pocion inestable: ventaja con efecto secundario.");
    } else {
      applyDebuff(debuffs[this.ambientRng.int(0, debuffs.length)]);
      this.notify("Pocion inestable: efecto adverso.");
    }

    this.effects.addText("Inestable", this.playerTransform.x, this.playerTransform.y, {
      color: "#d8c46a",
    });
  }

  updateAmbientPoison(deltaSeconds) {
    for (const id of this.getAmbientIds()) {
      const ambient = this.ecs.getComponent(id, Component.AMBIENT);

      if (!ambient || !(ambient.poisonSeconds > 0)) {
        continue;
      }

      ambient.poisonSeconds -= deltaSeconds;
      ambient.poisonTickTimer = (ambient.poisonTickTimer ?? 0) - deltaSeconds;

      if (ambient.poisonTickTimer <= 0) {
        ambient.poisonTickTimer += 1;
        this.damageAmbient(id, 5);
      }
    }
  }

  renderPotionEffects() {
    const container = this.hud.effects;

    if (!container) {
      return;
    }

    const fragment = document.createDocumentFragment();
    const effects = [];

    if (this.attackBuffRemaining > 0) {
      effects.push({ label: "Ataque", seconds: this.attackBuffRemaining });
    }
    if (this.swimRemaining > 0) {
      effects.push({ label: "Nado", seconds: this.swimRemaining });
    }
    if (this.resistanceBuffRemaining > 0) {
      effects.push({
        label: "Resistencia",
        seconds: this.resistanceBuffRemaining,
      });
    }
    if (this.poisonRemaining > 0) {
      effects.push({
        label: "Veneno",
        seconds: this.poisonRemaining,
        negative: true,
      });
    }
    if (this.slowRemaining > 0) {
      effects.push({
        label: "Lento",
        seconds: this.slowRemaining,
        negative: true,
      });
    }
    if (this.weaknessRemaining > 0) {
      effects.push({
        label: "Debil",
        seconds: this.weaknessRemaining,
        negative: true,
      });
    }

    for (const effect of effects) {
      const chip = document.createElement("span");
      const dot = document.createElement("span");
      const label = document.createElement("span");

      chip.className = "effect-chip";
      chip.classList.toggle("is-negative", effect.negative === true);
      dot.className = "effect-dot";
      label.textContent = `${effect.label} ${Math.ceil(effect.seconds)} s`;
      chip.append(dot, label);
      fragment.append(chip);
    }

    container.replaceChildren(fragment);
  }

  handleRightClick() {
    if (this.birdWatch) {
      this.cancelBirdWatch("Observación cancelada.");
      return;
    }

    if (this.placingItem) {
      this.cancelPlacement();
      this.notify("Colocación cancelada.");
      return;
    }

    if (this.questOpen) {
      this.closeQuest();
      return;
    }

    if (this.birdPanelOpen) {
      this.closeBirdPanel();
      return;
    }

    if (this.mapOpen) {
      this.closeMap();
      return;
    }

    if (this.wolfOpen) {
      this.closeWolfDen();
      return;
    }

    if (this.recipeBookOpen) {
      this.closeRecipeBook();
      return;
    }

    if (this.fiefOpen) {
      this.closeFief();
      return;
    }

    if (this.tradeOpen) {
      this.closeTrade();
      return;
    }

    if (this.villageOpen) {
      this.closeVillage();
      return;
    }

    if (this.observatoryOpen) {
      this.closeObservatory();
      return;
    }

    if (this.universityOpen) {
      this.closeUniversity();
      return;
    }

    if (this.chestOpen) {
      this.closeChest();
      return;
    }

    if (this.craftingOpen) {
      this.closeCrafting();
      return;
    }

    if (this.selectedWorkerId) {
      const workerId = this.selectedWorkerId;
      this.cancelWorkerTask(workerId);
      this.deselectWorker();
      return;
    }

    const cancelled = this.cancelPlayerAction();

    if (cancelled) {
      this.notify("Acción cancelada.");
    }
  }

  handleMenuRequest() {
    if (this.inventoryOpen) {
      this.closeInventory();
      return;
    }

    if (!this.placingItem && this.selectedUnitIds.size > 0) {
      this.clearFiefSelection();
      this.notify("Unidades en modo automático.");
      return;
    }

    if (!this.placingItem && this.selectedWorkerIds.size > 0) {
      this.deselectWorker();
      this.notify("Duendes en modo automático.");
      return;
    }

    if (this.placingItem) {
      this.cancelPlacement();
      this.notify("Colocación cancelada.");
      return;
    }

    if (this.selectedUnitId) {
      this.clearFiefSelection();
      this.notify("Unidad en modo automático.");
      return;
    }

    if (this.recipeBookOpen) {
      this.closeRecipeBook();
      return;
    }

    if (this.questOpen) {
      this.closeQuest();
      return;
    }

    if (this.fiefOpen) {
      this.closeFief();
      return;
    }

    if (this.tradeOpen) {
      this.closeTrade();
      return;
    }

    if (this.villageOpen) {
      this.closeVillage();
      return;
    }

    if (this.observatoryOpen) {
      this.closeObservatory();
      return;
    }

    if (this.universityOpen) {
      this.closeUniversity();
      return;
    }

    if (this.chestOpen) {
      this.closeChest();
      return;
    }

    if (this.craftingOpen) {
      this.closeCrafting();
      return;
    }

    if (this.selectedWorkerId) {
      this.deselectWorker();
      return;
    }

    this.onMenuRequested?.();
  }

  toggleRecipeBook() {
    if (this.recipeBookOpen) {
      this.closeRecipeBook();
      return;
    }

    this.closeCrafting();
    this.closeChest();
    this.closeUniversity();
    this.closeObservatory();
    this.closeMap();
    this.recipeBookOpen = true;
    this.recipeBookSearch = "";
    if (this.hud.recipeBookSearch) {
      this.hud.recipeBookSearch.value = "";
    }
    this.hud.recipeBookPanel?.classList.add("is-open");
    this.hud.recipeBookPanel?.setAttribute("aria-hidden", "false");
    this.hud.btnRecipes?.setAttribute("aria-expanded", "true");
    this.renderRecipeBook();
  }

  closeRecipeBook() {
    this.recipeBookOpen = false;
    this.hud.recipeBookPanel?.classList.remove("is-open");
    this.hud.recipeBookPanel?.setAttribute("aria-hidden", "true");
    this.hud.btnRecipes?.setAttribute("aria-expanded", "false");
  }

  handleRecipeBookSearch(event) {
    this.recipeBookSearch = String(event.target.value ?? "");
    this.renderRecipeBook();
  }

  recipeBookOutputText(recipe) {
    if (recipe.type === "tool") {
      return TOOL_INFO[recipe.tool]?.label ?? recipe.tool;
    }
    if (recipe.type === "upgrade") {
      return `Mejora: ${recipe.upgrade}`;
    }
    if (recipe.type === "worker") {
      return "Duende trabajador";
    }
    if (recipe.outputs?.length) {
      return recipe.outputs
        .map((output) => `${output.amount} ${ITEM_INFO[output.item]?.label ?? output.item}`)
        .join(" · ");
    }
    return `${recipe.amount ?? 1} ${ITEM_INFO[recipe.item]?.label ?? recipe.item}`;
  }

  renderRecipeBook() {
    const list = this.hud.recipeBookList;

    if (!list) {
      return;
    }

    const query = this.normalizeCraftText(this.recipeBookSearch).trim();
    const stationNames = {
      [STATION_TYPES.OVEN]: "Horno",
      [STATION_TYPES.BREWING_TABLE]: "Mesa de brebajes",
      [STATION_TYPES.CAULDRON]: "Caldero",
    };
    const entries = [
      ...CRAFT_RECIPES.map((recipe) => ({
        ...recipe,
        source: "Taller del viajero",
        costs: { resources: recipe.costs, items: {} },
      })),
      ...STATION_RECIPES.map((recipe) => ({
        ...recipe,
        source: stationNames[recipe.station] ?? recipe.station,
      })),
    ].filter((recipe) => {
      if (!query) {
        return true;
      }
      const costs = [
        ...Object.keys(recipe.costs.resources ?? {}),
        ...Object.keys(recipe.costs.items ?? {}),
      ]
        .map((key) => RESOURCE_INFO[key]?.label ?? ITEM_INFO[key]?.label ?? key)
        .join(" ");
      return this.normalizeCraftText(
        `${recipe.name} ${recipe.description} ${costs}`,
      ).includes(query);
    });

    const fragment = document.createDocumentFragment();

    for (const recipe of entries) {
      const card = document.createElement("article");
      const top = document.createElement("div");
      const name = document.createElement("span");
      const source = document.createElement("span");
      const desc = document.createElement("p");
      const costs = document.createElement("div");
      const footer = document.createElement("div");

      card.className = "recipe-book-card";
      top.className = "recipe-top";
      name.className = "recipe-name";
      name.textContent = recipe.name;
      source.className = "recipe-status";
      source.textContent = recipe.source;
      top.append(name, source);

      desc.className = "recipe-desc";
      desc.textContent = recipe.description;
      costs.className = "recipe-costs";

      for (const [key, amount] of Object.entries(recipe.costs.resources ?? {})) {
        const info = RESOURCE_INFO[key];
        if (!info) continue;
        const cost = document.createElement("span");
        const dot = document.createElement("span");
        const label = document.createElement("span");
        cost.className = "recipe-cost";
        cost.dataset.tooltip = `${info.label}\n${sourceFor("resource", key)}`;
        cost.title = cost.dataset.tooltip;
        cost.style.setProperty("--resource-color", info.color);
        dot.className = "dot";
        label.textContent = `${info.label} ${amount}`;
        cost.append(dot, label);
        costs.append(cost);
      }

      for (const [key, amount] of Object.entries(recipe.costs.items ?? {})) {
        const item = ITEM_INFO[key];
        if (!item) continue;
        const cost = document.createElement("span");
        const dot = document.createElement("span");
        const label = document.createElement("span");
        cost.className = "recipe-cost";
        cost.dataset.tooltip = `${item.label}\n${sourceFor("item", key)}`;
        cost.title = cost.dataset.tooltip;
        cost.style.setProperty("--resource-color", "#c9a36a");
        dot.className = "dot";
        label.textContent = `${item.label} ${amount}`;
        cost.append(dot, label);
        costs.append(cost);
      }

      footer.className = "recipe-footer";
      const result = document.createElement("span");
      result.className = "recipe-owned";
      result.textContent = `Resultado: ${this.recipeBookOutputText(recipe)}`;
      footer.append(result);

      if (recipe.moonPhases) {
        const moon = document.createElement("span");
        moon.className = "recipe-status";
        moon.textContent = `Solo ${this.moonRequirementText(recipe)}`;
        footer.append(moon);
      }

      card.append(top, desc, costs, footer);
      fragment.append(card);
    }

    if (fragment.childNodes.length === 0) {
      const empty = document.createElement("p");
      empty.className = "recipe-empty";
      empty.textContent = "No hay recetas que coincidan con la búsqueda.";
      fragment.append(empty);
    }

    list.replaceChildren(fragment);
  }

  toggleCrafting() {
    if (this.placingItem) {
      this.cancelPlacement();
    }

    this.cancelFishing();
    this.closeRecipeBook();
    this.closeObservatory();
    this.closeChest();
    this.closeUniversity();
    this.closeMap();

    if (this.craftingOpen && !this.activeStation) {
      this.closeCrafting();
      return;
    }

    this.activeStation = null;
    this.craftingOpen = true;
    this.hud.craftPanel?.classList.add("is-open");
    this.hud.craftPanel?.setAttribute("aria-hidden", "false");
    this.hud.btnCraft?.setAttribute("aria-expanded", "true");
    this.setCraftHeader(
      "Taller del viajero",
      "Crafteo",
      "Combina lo que recolectas para hacerte la vida mÇ­s fÇ­cil.",
    );
    this.craftSearch = "";
    if (this.hud.craftSearch) {
      this.hud.craftSearch.value = "";
    }
    if (this.hud.craftTabs) {
      this.hud.craftTabs.hidden = false;
    }
    if (this.hud.craftSearchWrap) {
      this.hud.craftSearchWrap.hidden = false;
    }
    this.renderCraftProgress();
    this.renderRecipes();
  }

  openStation(stationType, structure) {
    if (!stationType) {
      return;
    }

    this.activeStation = { type: stationType, structure };
    this.craftingOpen = true;
    this.hud.craftPanel?.classList.add("is-open");
    this.hud.craftPanel?.setAttribute("aria-hidden", "false");
    this.hud.btnCraft?.setAttribute("aria-expanded", "true");

    if (stationType === STATION_TYPES.OVEN) {
      this.setCraftHeader(
        "Estación de cocina",
        "Horno",
        "Tuesta bayas y cocina pescado con carbón para recuperar salud.",
      );
    } else if (stationType === STATION_TYPES.CAULDRON) {
      this.setCraftHeader(
        "Alquimia mineral",
        "Caldero",
        "Investiga y prepara pociones usando minerales, agua y recursos.",
      );
    } else {
      this.setCraftHeader(
        "Alquimia y brebajes",
        "Mesa de brebajes",
        "Combina ingredientes y observa la química de tus piedras.",
      );
    }

    this.renderCraftProgress();
    this.renderStationRecipes();
  }

  setCraftHeader(eyebrow, title, intro) {
    if (this.hud.craftEyebrow) {
      this.hud.craftEyebrow.textContent = eyebrow;
    }
    if (this.hud.craftTitle) {
      this.hud.craftTitle.textContent = title;
    }
    if (this.hud.craftIntro) {
      this.hud.craftIntro.textContent = intro;
    }
  }

  closeCrafting() {
    this.craftingOpen = false;
    this.activeStation = null;
    this.hud.craftPanel?.classList.remove("is-open");
    this.hud.craftPanel?.setAttribute("aria-hidden", "true");
    this.hud.btnCraft?.setAttribute("aria-expanded", "false");
    this.setStationExtra(null);
  }

  storageEntries(inventory) {
    const entries = [];

    for (const key of RESOURCE_KEYS) {
      const count = inventory.count(key);
      if (count > 0) {
        entries.push({
          kind: "resource",
          key,
          count,
          label: RESOURCE_INFO[key].label,
          color: RESOURCE_INFO[key].color,
        });
      }
    }

    for (const key of ITEM_KEYS) {
      const count = inventory.itemCount(key);
      if (count > 0) {
        entries.push({
          kind: "item",
          key,
          count,
          label: ITEM_INFO[key].label,
          color: "#c9a36a",
        });
      }
    }

    return entries;
  }

  openChest(chest) {
    if (!chest) {
      return;
    }

    this.closeObservatory();
    this.closeRecipeBook();
    this.closeCrafting();
    this.closeUniversity();
    this.activeChest = chest;
    this.chestOpen = true;
    this.hud.chestPanel?.classList.add("is-open");
    this.hud.chestPanel?.setAttribute("aria-hidden", "false");
    this.renderChestPanel();
  }

  closeChest() {
    this.chestOpen = false;
    this.activeChest = null;
    this.hud.chestPanel?.classList.remove("is-open");
    this.hud.chestPanel?.setAttribute("aria-hidden", "true");
  }

  renderChestPanel() {
    if (!this.activeChest || !this.hud.chestBackpack || !this.hud.chestStorage) {
      return;
    }

    this.renderChestList(
      this.hud.chestBackpack,
      this.storageEntries(this.inventory),
      "backpack",
    );
    this.renderChestList(
      this.hud.chestStorage,
      this.storageEntries(this.activeChest.inventory),
      "chest",
    );

    if (this.hud.chestBackpackCap) {
      this.hud.chestBackpackCap.textContent =
        `${this.inventory.slotsUsed()}/${this.inventory.capacity}`;
    }
    if (this.hud.chestStorageCap) {
      this.hud.chestStorageCap.textContent =
        `${this.activeChest.inventory.slotsUsed()}/${this.activeChest.inventory.capacity}`;
    }
  }

  renderChestList(container, entries, side) {
    const fragment = document.createDocumentFragment();

    if (entries.length === 0) {
      const empty = document.createElement("p");
      empty.className = "chest-empty";
      empty.textContent =
        side === "backpack" ? "Tu mochila está vacía." : "El cofre está vacío.";
      fragment.append(empty);
    }

    for (const entry of entries) {
      const row = document.createElement("button");
      const dot = document.createElement("span");
      const label = document.createElement("span");
      const value = document.createElement("b");

      row.type = "button";
      row.className = "chest-row";
      row.dataset.chestSide = side;
      row.dataset.chestKind = entry.kind;
      row.dataset.chestKey = entry.key;
      row.style.setProperty("--resource-color", entry.color);
      row.title =
        side === "backpack"
          ? `Guardar ${entry.label} en el cofre`
          : `Sacar ${entry.label} del cofre`;
      dot.className = "dot";
      label.className = "chest-row-label";
      label.textContent = entry.label;
      value.textContent = String(entry.count);
      row.append(dot, label, value);
      fragment.append(row);
    }

    container.replaceChildren(fragment);
  }

  handleChestClick(event) {
    const row = event.target.closest(".chest-row[data-chest-key]");

    if (!row || !this.activeChest) {
      return;
    }

    this.transferChestItem(
      row.dataset.chestSide,
      row.dataset.chestKind,
      row.dataset.chestKey,
      event.shiftKey,
    );
  }

  transferChestItem(side, kind, key, wholeStack) {
    if (!this.activeChest) {
      return;
    }

    const fromChest = side === "chest";
    const source = fromChest ? this.activeChest.inventory : this.inventory;
    const target = fromChest ? this.inventory : this.activeChest.inventory;
    const available =
      kind === "resource" ? source.count(key) : source.itemCount(key);
    const amount = wholeStack ? available : Math.min(1, available);

    if (amount <= 0) {
      return;
    }

    const added =
      kind === "resource"
        ? target.add(key, amount)
        : target.addItem(key, amount);

    if (added <= 0) {
      this.notify(
        fromChest ? "No tienes espacio en la mochila." : "El cofre está lleno.",
      );
      return;
    }

    if (kind === "resource") {
      source.remove(key, added);
    } else {
      source.removeItem(key, added);
    }

    const label =
      kind === "resource" ? RESOURCE_INFO[key].label : ITEM_INFO[key].label;
    this.effects.addText(
      `${fromChest ? "+" : "-"}${added} ${label}`,
      this.activeChest.x,
      this.activeChest.y,
      { color: fromChest ? "#7ec699" : "#e0a458" },
    );
    this.updateHud();
    this.renderChestPanel();
    this.save();
  }

  openObservatory() {
    this.cancelFishing();
    this.closeRecipeBook();
    this.closeCrafting();
    this.closeChest();
    this.closeUniversity();
    this.closeMap();
    this.observatoryOpen = true;
    this.hud.observatoryPanel?.classList.add("is-open");
    this.hud.observatoryPanel?.setAttribute("aria-hidden", "false");
    this.renderObservatory();
  }

  closeObservatory() {
    this.observatoryOpen = false;
    this.hud.observatoryPanel?.classList.remove("is-open");
    this.hud.observatoryPanel?.setAttribute("aria-hidden", "true");
    this.skyDragging = null;
    this.skyAlign = null;
  }

  pickWolfDenAt(screenX, screenY) {
    const sprite = this.assets.wolfDenSprites?.[0];
    if (!sprite || !this.wolfDen) {
      return null;
    }

    const base = this.camera.project(
      this.wolfDen.x,
      this.wolfDen.y,
      this.world.heightAt(this.wolfDen.x, this.wolfDen.y) * 0.72,
    );
    const scale = this.camera.zoom;
    const left = base.x - sprite.anchorX * scale;
    const top = base.y - sprite.anchorY * scale;

    return (
      screenX >= left &&
      screenX <= left + sprite.width * scale &&
      screenY >= top &&
      screenY <= top + sprite.height * scale
    );
  }

  pickShamanAt(screenX, screenY) {
    const sprite = this.assets.villageSprites?.shaman;
    if (!sprite) {
      return null;
    }

    for (const village of this.villages) {
      const base = this.camera.project(
        village.x,
        village.y,
        this.world.heightAt(village.x, village.y) * 0.72,
      );
      const scale = this.camera.zoom;
      const left = base.x - sprite.anchorX * scale;
      const top = base.y - sprite.anchorY * scale;
      if (
        screenX >= left &&
        screenX <= left + sprite.width * scale &&
        screenY >= top &&
        screenY <= top + sprite.height * scale
      ) {
        return village;
      }
    }

    return null;
  }

  pickFiefUnitAt(screenX, screenY) {
    const sprites = this.assets.fiefSprites?.units;
    if (!sprites) {
      return null;
    }
    for (const unit of this.units) {
      if (unit.hp <= 0) {
        continue;
      }
      const sprite = sprites[unit.type];
      if (!sprite) {
        continue;
      }
      const base = this.camera.project(
        unit.x,
        unit.y,
        this.world.heightAt(unit.x, unit.y) * 0.72,
      );
      const scale = this.camera.zoom * 0.9;
      const left = base.x - sprite.anchorX * scale;
      const top = base.y - sprite.anchorY * scale;
      if (
        screenX >= left &&
        screenX <= left + sprite.width * scale &&
        screenY >= top &&
        screenY <= top + sprite.height * scale
      ) {
        return unit;
      }
    }
    return null;
  }

  selectFiefUnit(unit, { additive = false, toggle = false } = {}) {
    if (!unit) {
      this.clearFiefSelection();
      return;
    }

    const multi = additive || toggle || this.selectionMode === "fief";

    if (multi) {
      if (
        this.selectedUnitIds.size > 0 &&
        this.selectedUnitType !== unit.type
      ) {
        this.selectedUnitIds.clear();
      }
      this.selectedUnitType = unit.type;
      if (this.selectedUnitIds.has(unit.id)) {
        this.selectedUnitIds.delete(unit.id);
      } else {
        this.selectedUnitIds.add(unit.id);
      }
      if (this.selectedUnitIds.size === 0) {
        this.selectedUnitType = null;
      }
    } else {
      this.selectedUnitIds.clear();
      this.selectedUnitIds.add(unit.id);
      this.selectedUnitType = unit.type;
    }

    this.selectedUnitId = null;
    const count = this.selectedUnitIds.size;
    this.notify(
      `${count} unidad${count === 1 ? "" : "es"} seleccionada${
        count === 1 ? "" : "s"
      }. Haz clic en el mapa para dar la orden.`,
    );
  }

  clearFiefSelection() {
    this.selectedUnitIds.clear();
    this.selectedUnitType = null;
    this.selectedUnitId = null;
  }

  openVillage(village) {
    if (!village) {
      return;
    }

    const distance = Math.hypot(
      village.x - this.playerTransform.x,
      village.y - this.playerTransform.y,
    );
    if (distance > 4.5) {
      this.notify("Acércate al chamán para hablar.");
      return;
    }

    this.villageSeen.add(village.id);
    this.updateQuestButton();

    this.cancelFishing();
    this.closeRecipeBook();
    this.closeCrafting();
    this.closeChest();
    this.closeUniversity();
    this.closeObservatory();
    this.closeTrade();
    this.closeQuest();
    this.activeVillage = village;
    this.villageOpen = true;
    this.hud.villagePanel?.classList.add("is-open");
    this.hud.villagePanel?.setAttribute("aria-hidden", "false");
    this.renderVillage();
  }

  closeVillage() {
    this.villageOpen = false;
    this.activeVillage = null;
    this.closeTrade();
    this.hud.villagePanel?.classList.remove("is-open");
    this.hud.villagePanel?.setAttribute("aria-hidden", "true");
  }

  toggleQuest() {
    if (this.questOpen) {
      this.closeQuest();
      return;
    }

    this.closeRecipeBook();
    this.closeCrafting();
    this.closeChest();
    this.closeUniversity();
    this.closeObservatory();
    this.closeTrade();
    this.closeVillage();
    this.closeBirdPanel();
    this.closeWolfDen();
    this.closeMap();
    this.questOpen = true;
    this.hud.questPanel?.classList.add("is-open");
    this.hud.questPanel?.setAttribute("aria-hidden", "false");
    this.hud.btnQuest?.setAttribute("aria-expanded", "true");
    this.renderQuest();
  }

  closeQuest() {
    this.questOpen = false;
    this.hud.questPanel?.classList.remove("is-open");
    this.hud.questPanel?.setAttribute("aria-hidden", "true");
    this.hud.btnQuest?.setAttribute("aria-expanded", "false");
  }

  updateQuestButton() {
    if (!this.hud.btnQuest) {
      return;
    }

    const seen = this.villages.filter((village) =>
      this.villageSeen.has(village.id),
    );
    const wolfVisible = Boolean(this.wolfDen && this.wolfMission.discovered);
    this.hud.btnQuest.hidden = seen.length === 0 && !wolfVisible;
    this.hud.btnQuest.classList.toggle("is-active", this.questOpen);

    if (this.hud.questBadge) {
      let pending = seen.filter(
        (village) => !this.villageProgress[village.id]?.allied,
      ).length;
      if (wolfVisible && !this.wolfMission.completed) {
        pending += 1;
      }
      this.hud.questBadge.hidden = pending === 0;
      this.hud.questBadge.textContent = String(pending);
    }
  }

  questProductionLabel(village, progress) {
    const elapsed = Math.min(
      600,
      Math.max(0, this.gameTime - progress.lastProduction),
    );
    const yields = productionYield(village, progress.stability, elapsed);
    const label = Object.entries(yields)
      .map(([key, amount]) => `${RESOURCE_INFO[key]?.label ?? key} ${amount}`)
      .join(" · ");
    return { elapsed, label };
  }

  renderQuest() {
    const list = this.hud.questList;
    if (!list) {
      return;
    }

    const seen = this.villages.filter((village) =>
      this.villageSeen.has(village.id),
    );

    if (seen.length === 0 && !this.wolfMission.discovered) {
      const empty = document.createElement("p");
      empty.className = "quest-empty";
      empty.textContent =
        "Aún no has conocido a ningún chamán. Explora el mundo para descubrir aldeas.";
      list.replaceChildren(empty);
      return;
    }

    const fragment = document.createDocumentFragment();

    if (this.wolfDen && this.wolfMission.discovered) {
      const state = this.wolfMissionProgress();
      const row = document.createElement("article");
      row.className = "quest-row";
      row.classList.toggle("is-allied", state.completed);

      const ring = document.createElement("div");
      ring.className = "quest-ring";
      ring.style.setProperty(
        "--ring-progress",
        String(
          Math.min(
            100,
            (state.kills / state.wolvesRequired) * 50 +
              (Math.min(state.pelts, state.peltsRequired) / state.peltsRequired) * 50,
          ),
        ),
      );
      const ringLabel = document.createElement("span");
      ringLabel.className = "quest-ring-label";
      ringLabel.textContent = state.completed ? "✓" : `${state.kills}/${state.wolvesRequired}`;
      ring.append(ringLabel);

      const info = document.createElement("div");
      info.className = "quest-info";
      const name = document.createElement("strong");
      name.textContent = WOLF_MISSION.name;
      const shaman = document.createElement("small");
      shaman.textContent = "Bosque de lobos · manada hostil";
      const mission = document.createElement("small");
      mission.className = "quest-mission";
      mission.textContent = state.completed
        ? "Misión completada: recetas especiales desbloqueadas."
        : `Lobos ${state.kills}/${state.wolvesRequired} · Pieles ${state.pelts}/${state.peltsRequired}`;
      info.append(name, shaman, mission);

      const actions = document.createElement("div");
      actions.className = "quest-actions";
      const hint = document.createElement("small");
      hint.textContent = state.completed
        ? "Recompensa entregada."
        : "Ve a la cueva para entregar las pieles.";
      actions.append(hint);

      row.append(ring, info, actions);
      fragment.append(row);
    }

    for (const village of seen) {
      const progress = this.villageProgress[village.id];
      const line = civicLineForVillage(village);
      const recipe = line[progress.delivered] ?? null;
      const allied = progress.allied === true;
      const trustSteps = Math.min(4, line.length);
      const trust = allied
        ? trustSteps
        : Math.min(trustSteps, progress.delivered);
      const ringPercent = trustSteps > 0 ? (trust / trustSteps) * 100 : 100;

      const row = document.createElement("article");
      row.className = "quest-row";
      row.classList.toggle("is-allied", allied);

      const ring = document.createElement("div");
      ring.className = "quest-ring";
      ring.style.setProperty("--ring-progress", String(ringPercent));
      ring.setAttribute(
        "aria-label",
        allied ? "Confianza completa" : `Confianza ${trust} de ${trustSteps}`,
      );
      const ringLabel = document.createElement("span");
      ringLabel.className = "quest-ring-label";
      ringLabel.textContent = allied ? "✓" : `${trust}/${trustSteps}`;
      ring.append(ringLabel);

      const info = document.createElement("div");
      info.className = "quest-info";
      const name = document.createElement("strong");
      name.textContent = village.name;
      const shaman = document.createElement("small");
      shaman.textContent = `${village.shamanName} · ${village.biomeName} · equilibrio ${Math.round(progress.stability)}%`;
      const mission = document.createElement("small");
      mission.className = "quest-mission";
      mission.textContent = allied
        ? "Alianza activa: los duendes generan recursos."
        : recipe
          ? `Misión: ${recipe.name}`
          : "Peticiones completadas.";
      const stability = document.createElement("div");
      stability.className = "quest-stability";
      const stabilityFill = document.createElement("span");
      stabilityFill.style.width = `${Math.max(0, Math.min(100, progress.stability))}%`;
      stability.append(stabilityFill);
      info.append(name, shaman, mission, stability);

      const actions = document.createElement("div");
      actions.className = "quest-actions";

      if (allied) {
        const production = this.questProductionLabel(village, progress);
        const yieldText = document.createElement("small");
        yieldText.textContent =
          production.label.length > 0
            ? `${production.label} en ${Math.round(production.elapsed)} s`
            : "Reuniendo recursos...";
        const claim = document.createElement("button");
        claim.type = "button";
        claim.className = "quest-claim";
        claim.dataset.questClaim = village.id;
        claim.disabled = production.elapsed < 30;
        claim.textContent = "Recolectar";
        actions.append(yieldText, claim);
      } else {
        const progressText = document.createElement("small");
        progressText.textContent = `${progress.delivered}/${line.length} rituales`;
        actions.append(progressText);
      }

      row.append(ring, info, actions);
      fragment.append(row);
    }

    list.replaceChildren(fragment);
  }

  handleQuestClick(event) {
    const claim = event.target.closest("[data-quest-claim]");
    if (!claim) {
      return;
    }

    this.claimVillageProduction(claim.dataset.questClaim);
    if (this.questOpen) {
      this.renderQuest();
    }
  }

  renderVillage() {
    const village = this.activeVillage;
    if (!village || !this.villageOpen) {
      return;
    }

    const progress = this.villageProgress[village.id];
    const line = civicLineForVillage(village);
    const recipe = line[progress.delivered] ?? null;
    const completed = !recipe;
    const state = recipe
      ? civicRecipeState(recipe, this.inventory, {
          observationIds: [...this.observationNotes],
          moonPhase: this.moonPhase().id,
          scienceLevels: Object.fromEntries(
            SCIENCE_BOOKS.map((book) => [
              book.id,
              scienceLevel(this.sciencePoints, book.id),
            ]),
          ),
        })
      : null;
    const noteOwned =
      !recipe?.noteRequired ||
      this.observationNotes.has(recipe.constellationId);
    const crafted = Boolean(recipe && progress.crafted === recipe.id);
    const missionDay = recipe?.constellationId
      ? recipe.moonPhase
        ? this.nextPhaseDay(recipe.moonPhase, this.currentGameDay())
        : this.currentGameDay() + (this.isNight() ? 0 : 1)
      : null;
    const ingredients = recipe
      ? Object.entries(recipe.ingredients)
          .map(([key, amount]) => `${RESOURCE_INFO[key]?.label ?? key} ${amount}`)
          .join(" · ")
      : "";

    if (this.hud.villageTitle) {
      this.hud.villageTitle.textContent = village.name;
    }
    if (this.hud.villageShaman) {
      this.hud.villageShaman.textContent =
        `${village.shamanName} · chamán de ${village.biomeName} · equilibrio ${Math.round(progress.stability)}%`;
    }
    if (this.hud.villageRequest) {
      this.hud.villageRequest.textContent = completed
        ? progress.allied
          ? "La aldea está sana y forma parte de la alianza."
          : "La aldea ha completado sus peticiones."
        : `${village.shamanName} necesita ${recipe.name}: ${recipe.description}`;
    }
    if (this.hud.villageStatus) {
      if (completed) {
        this.hud.villageStatus.textContent = progress.allied
          ? "Los duendes de la aldea producen recursos para la alianza."
          : "Peticiones completadas.";
        this.hud.villageStatus.classList.remove("is-ready");
      } else {
        const pieces = [
          `Ritual ${progress.delivered + 1}/${line.length}`,
          progress.allied ? "Alianza activa" : `Alianza tras el ritual 4`,
          `Ingredientes: ${ingredients}`,
        ];
        if (recipe.noteRequired) {
          pieces.push(
            noteOwned
              ? `Apunte de ${recipe.constellationName}: listo`
              : `Falta el apunte de ${recipe.constellationName} (día ${missionDay}, noche)`,
          );
        }
        if (recipe.scienceBook) {
          const level = scienceLevel(this.sciencePoints, recipe.scienceBook);
          pieces.push(`Ciencia de brebajes ${level}/${recipe.scienceTier}`);
        }
        if (recipe.moonPhase) {
          pieces.push(`Luna requerida: ${recipe.moonPhase === "full" ? "llena" : "nueva"}`);
        }
        pieces.push(crafted ? "Ritual preparado: listo para entregar" : "Ritual pendiente de preparar");
        this.hud.villageStatus.textContent = pieces.join(" · ");
        this.hud.villageStatus.classList.toggle("is-ready", crafted);
      }
    }
    if (this.hud.villageReward) {
      this.hud.villageReward.textContent = progress.allied
        ? "Mercado desbloqueado: producción de duendes y caravanas."
        : progress.delivered < 4
          ? "Al completar el cuarto ritual, la aldea se unirá a la alianza."
          : "";
    }
    if (this.hud.btnVillagePrepare) {
      this.hud.btnVillagePrepare.hidden = completed;
      this.hud.btnVillagePrepare.disabled =
        completed || crafted || !state?.canCraft;
      this.hud.btnVillagePrepare.textContent = crafted
        ? "Ritual preparado"
        : "Preparar ritual";
    }
    if (this.hud.btnVillageDeliver) {
      this.hud.btnVillageDeliver.hidden = completed;
      this.hud.btnVillageDeliver.disabled = completed || !crafted;
      this.hud.btnVillageDeliver.textContent = completed
        ? "Peticiones completadas"
        : "Entregar ritual";
    }
    if (this.hud.btnVillageMarket) {
      this.hud.btnVillageMarket.hidden = !progress.allied;
    }
  }

  prepareVillagePotion() {
    const village = this.activeVillage;
    if (!village) {
      return;
    }
    const progress = this.villageProgress[village.id];
    const recipe = this.villageRecipe(village);
    if (!recipe || progress.crafted === recipe.id) {
      return;
    }

    const state = civicRecipeState(recipe, this.inventory, {
      observationIds: [...this.observationNotes],
      moonPhase: this.moonPhase().id,
      scienceLevels: Object.fromEntries(
        SCIENCE_BOOKS.map((book) => [
          book.id,
          scienceLevel(this.sciencePoints, book.id),
        ]),
      ),
    });

    if (!state.canCraft) {
      if (state.missingNote) {
        this.notify("Falta el apunte de observación de esa constelación.");
      } else if (state.wrongMoon) {
        this.notify("La fase lunar no es la correcta para este ritual.");
      } else if (state.missingScience) {
        this.notify("La ciencia de brebajes todavía no es suficiente.");
      } else {
        this.notify("Faltan ingredientes para preparar el ritual.");
      }
      return;
    }

    if (!craftCivicPotion(recipe, this.inventory)) {
      this.notify("No se pudieron consumir los ingredientes.");
      return;
    }

    progress.crafted = recipe.id;
    this.awardCraftXp(recipe);
    this.updateHud();
    this.save();
    this.renderVillage();
    this.notify(`${recipe.name} preparado. Ya puedes entregarlo al chamán.`);
  }

  deliverVillageRequest() {
    const village = this.activeVillage;
    if (!village) {
      return;
    }
    const progress = this.villageProgress[village.id];
    const recipe = this.villageRecipe(village);
    if (!recipe || progress.crafted !== recipe.id) {
      this.notify("Prepara primero el ritual en la aldea.");
      return;
    }

    const effectStability =
      recipe.effect?.type === "stability"
        ? recipe.effect.amount
        : 8 + recipe.tier;
    progress.crafted = null;
    progress.delivered += 1;
    this.villageSeen.add(village.id);
    progress.stability = Math.min(100, progress.stability + effectStability);
    const wasAllied = progress.allied;
    if (progress.delivered >= 4) {
      progress.allied = true;
      if (!wasAllied) {
        progress.lastProduction = this.gameTime;
        this.notify(`${village.name} se ha unido a la alianza.`);
      }
    }
    const line = civicLineForVillage(village);
    if (progress.delivered >= line.length) {
      this.completedVillages.add(village.id);
    }
    this.effects.addText("Ritual entregado", village.x, village.y, {
      color: "#7ec699",
    });
    this.notify(`${recipe.name}: el chamán ha estabilizado la aldea.`);
    this.updateHud();
    this.save();
    this.renderVillage();
  }

﻿  fiefVillages() {
    return this.villages.filter(
      (village) => this.villageProgress[village.id]?.allied,
    );
  }

  fiefBuildingPosition(village, slot) {
    const offsets = [
      [-3.2, 0.2],
      [3.1, -0.4],
      [0.2, -3.2],
      [0.4, 3.1],
    ];
    const [dx, dy] = offsets[slot] ?? offsets[0];
    return { x: village.x + dx, y: village.y + dy };
  }

  fiefBuildingLevels(villageId) {
    return buildingsForVillage(this.villageProgress[villageId]).reduce(
      (total, building) => total + (building?.level ?? 0),
      0,
    );
  }

  fiefRank() {
    const allied = this.fiefVillages();
    if (allied.length === 0) {
      return "aldeano";
    }
    const mainIds = new Set(
      this.villages
        .filter((village) => [2, 3, 5, 6].includes(village.biome))
        .map((village) => village.id),
    );
    const mainAllied = allied.filter((village) => mainIds.has(village.id)).length;
    const buildingLevels = allied.reduce(
      (total, village) => total + this.fiefBuildingLevels(village.id),
      0,
    );
    const stability =
      allied.reduce(
        (total, village) => total + this.villageProgress[village.id].stability,
        0,
      ) / allied.length;

    return fiefRank({
      alliedCount: allied.length,
      buildingLevels,
      wavesSurvived: this.wavesSurvived,
      mainAllied,
      stability,
    });
  }

  syncVillageUnits(villageId) {
    this.units = this.units.filter((unit) => unit.villageId !== villageId);
    const village = this.villages.find((entry) => entry.id === villageId);
    const progress = this.villageProgress[villageId];
    if (!village || !progress?.allied) {
      return;
    }
    const slots = buildingsForVillage(progress);
    for (let slot = 0; slot < slots.length; slot += 1) {
      const building = slots[slot];
      if (!building || building.hp <= 0) {
        continue;
      }
      const type = BUILDING_TYPES[building.type];
      const count = Math.min(3, building.level);
      for (let index = 0; index < count; index += 1) {
        if (this.units.length >= 40) {
          return;
        }
        const unitType = index === 2 ? type.secondaryUnit : type.primaryUnit;
        const stats = UNIT_TYPES[unitType];
        const position = this.fiefBuildingPosition(village, slot);
        this.unitSeq += 1;
        this.units.push({
          id: `unit:${this.unitSeq}`,
          villageId,
          type: unitType,
          name: stats.name,
          x: position.x + (index - 1) * 0.55,
          y: position.y + 0.8,
          hp: stats.hp,
          maxHp: stats.hp,
          damage: stats.damage,
          range: stats.range,
          speed: stats.speed,
          role: stats.role,
          color: stats.color,
          cooldown: 0,
          rally: null,
          manual: false,
        });
      }
    }
  }

  syncAllVillageUnits() {
    for (const village of this.fiefVillages()) {
      this.syncVillageUnits(village.id);
    }
  }

  buildFiefBuilding(villageId, slot, typeId) {
    const village = this.villages.find((entry) => entry.id === villageId);
    const progress = this.villageProgress[villageId];
    const type = BUILDING_TYPES[typeId];
    if (!village || !progress?.allied || !type) {
      return false;
    }
    const slots = buildingsForVillage(progress);
    if (slots[slot]) {
      return false;
    }
    const costs = buildingCost(typeId, 1);
    if (!this.inventory.has(costs)) {
      this.notify("Faltan recursos para construir ese edificio.");
      return false;
    }
    this.inventory.spend(costs);
    slots[slot] = { type: typeId, level: 1, hp: type.hp, maxHp: type.hp };
    progress.buildings = slots;
    this.syncVillageUnits(villageId);
    this.save();
    this.notify(`${type.name} construida en ${village.name}.`);
    return true;
  }

  upgradeFiefBuilding(villageId, slot) {
    const progress = this.villageProgress[villageId];
    const slots = buildingsForVillage(progress);
    const building = slots[slot];
    if (!building || building.level >= 3) {
      return false;
    }
    const type = BUILDING_TYPES[building.type];
    const costs = buildingCost(building.type, building.level + 1);
    if (!this.inventory.has(costs)) {
      this.notify("Faltan recursos para mejorar el edificio.");
      return false;
    }
    this.inventory.spend(costs);
    building.level += 1;
    building.maxHp = type.hp * building.level;
    building.hp = building.maxHp;
    progress.buildings = slots;
    this.syncVillageUnits(villageId);
    this.save();
    this.notify(`${type.name} mejorada a nivel ${building.level}.`);
    return true;
  }

  repairFiefBuilding(villageId, slot) {
    const progress = this.villageProgress[villageId];
    const slots = buildingsForVillage(progress);
    const building = slots[slot];
    if (!building || building.hp >= building.maxHp) {
      return false;
    }
    const costs = buildingCost(building.type, building.level);
    for (const key of Object.keys(costs)) {
      costs[key] = Math.max(1, Math.ceil(costs[key] * 0.25));
    }
    if (!this.inventory.has(costs)) {
      this.notify("Faltan recursos para reparar el edificio.");
      return false;
    }
    this.inventory.spend(costs);
    building.hp = building.maxHp;
    progress.buildings = slots;
    this.syncVillageUnits(villageId);
    this.save();
    this.notify("Edificio reparado.");
    return true;
  }

  setGameMode(modeId) {
    const mode = GAME_MODES[modeId];
    if (!mode) {
      return;
    }
    this.gameMode = mode.id;
    if (mode.id === "peaceful") {
      this.clearWave();
    } else if (this.wavesStarted) {
      this.waveTimer = mode.interval;
    }
    this.save();
    this.notify(`Modo: ${mode.name}.`);
    this.renderFief();
  }

  toggleGameMode() {
    this.setGameMode(nextMode(this.gameMode));
  }

  clearWave() {
    for (const id of this.waveEnemyIds) {
      this.ecs.destroyEntity(id);
    }
    this.waveEnemyIds.clear();
    this.waveActive = false;
    this.waveTargetVillageId = null;
  }

﻿
  toggleFief() {
    if (this.fiefOpen) {
      this.closeFief();
    } else {
      this.openFief();
    }
  }

  openFief() {
    this.fiefOpen = true;
    const allied = this.fiefVillages();
    this.fiefSelectedVillageId =
      this.fiefSelectedVillageId && allied.some((village) => village.id === this.fiefSelectedVillageId)
        ? this.fiefSelectedVillageId
        : allied[0]?.id ?? null;
    this.fiefStatusText = allied.length
      ? ""
      : "Aún no tienes aldeas aliadas. Completa el cuarto ritual de una aldea principal.";
    this.hud.fiefPanel?.classList.add("is-open");
    this.hud.fiefPanel?.setAttribute("aria-hidden", "false");
    this.renderFief();
  }

  closeFief() {
    this.fiefOpen = false;
    this.hud.fiefPanel?.classList.remove("is-open");
    this.hud.fiefPanel?.setAttribute("aria-hidden", "true");
  }

  renderFief() {
    if (!this.fiefOpen) {
      return;
    }
    const allied = this.fiefVillages();
    if (this.hud.fiefModes) {
      this.hud.fiefModes.replaceChildren(
        ...Object.values(GAME_MODES).map((mode) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "fief-mode";
          button.classList.toggle("is-active", this.gameMode === mode.id);
          button.dataset.fiefMode = mode.id;
          button.textContent = mode.name;
          return button;
        }),
      );
    }
    if (this.hud.fiefWave) {
      const target = this.villages.find((village) => village.id === this.waveTargetVillageId);
      this.hud.fiefWave.textContent = !this.wavesStarted
        ? "Las oleadas comienzan tras el 4.º ritual de una aldea principal."
        : this.gameMode === "peaceful"
          ? "Modo pacífico: oleadas en pausa."
          : this.waveActive
            ? `Oleada ${this.waveIndex} atacando ${target?.name ?? "la alianza"}.`
            : `Próxima oleada en ${Math.max(0, Math.ceil(this.waveTimer))} s · Modo ${modeById(this.gameMode).name}.`;
    }
    if (this.hud.fiefVillages) {
      this.hud.fiefVillages.replaceChildren(
        ...allied.map((village) => {
          const button = document.createElement("button");
          const progress = this.villageProgress[village.id];
          button.type = "button";
          button.className = "fief-village";
          button.classList.toggle("is-active", village.id === this.fiefSelectedVillageId);
          button.dataset.fiefVillage = village.id;
          button.textContent = `${village.name} · ${Math.round(progress.stability)}%`;
          return button;
        }),
      );
    }

    const village = this.villages.find((entry) => entry.id === this.fiefSelectedVillageId);
    if (!this.hud.fiefContent) {
      return;
    }
    if (!village) {
      this.hud.fiefContent.replaceChildren();
      return;
    }
    const progress = this.villageProgress[village.id];
    const slots = buildingsForVillage(progress);
    const cards = [];
    for (let slot = 0; slot < BUILDING_SLOTS; slot += 1) {
      const building = slots[slot];
      const card = document.createElement("article");
      card.className = "fief-building";
      if (!building) {
        const title = document.createElement("strong");
        title.textContent = `Solar ${slot + 1} · vacío`;
        card.append(title);
        const actions = document.createElement("div");
        actions.className = "fief-building-actions";
        for (const type of Object.values(BUILDING_TYPES)) {
          const button = document.createElement("button");
          button.type = "button";
          button.dataset.fiefBuild = type.id;
          button.dataset.fiefSlot = String(slot);
          button.dataset.fiefVillage = village.id;
          const costs = buildingCost(type.id, 1);
          button.textContent = `${type.name} (${Object.entries(costs).map(([key, amount]) => `${RESOURCE_INFO[key]?.label ?? key} ${amount}`).join(", ")})`;
          actions.append(button);
        }
        card.append(actions);
      } else {
        const type = BUILDING_TYPES[building.type];
        const title = document.createElement("strong");
        title.textContent = `${type.name} · Nivel ${building.level}`;
        const info = document.createElement("span");
        info.textContent = `Vida ${Math.round(building.hp)}/${building.maxHp}`;
        card.append(title, info);
        const actions = document.createElement("div");
        actions.className = "fief-building-actions";
        if (building.level < 3) {
          const upgrade = document.createElement("button");
          upgrade.type = "button";
          upgrade.dataset.fiefUpgrade = String(slot);
          upgrade.dataset.fiefVillage = village.id;
          upgrade.textContent = "Mejorar";
          actions.append(upgrade);
        }
        if (building.hp < building.maxHp) {
          const repair = document.createElement("button");
          repair.type = "button";
          repair.dataset.fiefRepair = String(slot);
          repair.dataset.fiefVillage = village.id;
          repair.textContent = "Reparar";
          actions.append(repair);
        }
        card.append(actions);
      }
      cards.push(card);
    }
    const units = document.createElement("div");
    units.className = "fief-units";
    const villageUnits = this.units.filter((unit) => unit.villageId === village.id && unit.hp > 0);
    units.textContent = `Unidades: ${villageUnits.length} · ${villageUnits.map((unit) => unit.name).join(", ") || "sin unidades"} · Rango del feudo: ${this.fiefRank()}`;
    const regroup = document.createElement("button");
    regroup.type = "button";
    regroup.className = "fief-mode";
    regroup.dataset.fiefRegroup = village.id;
    regroup.textContent = "Reagrupar defensa";
    units.append(" ", regroup);
    cards.push(units);
    this.hud.fiefContent.replaceChildren(...cards);
    if (this.hud.fiefStatus) {
      this.hud.fiefStatus.textContent = this.fiefStatusText;
    }
  }

  handleFiefClick(event) {
    const mode = event.target.closest("[data-fief-mode]");
    if (mode) {
      this.setGameMode(mode.dataset.fiefMode);
      return;
    }
    const villageButton = event.target.closest("[data-fief-village][data-fief-village]");
    if (villageButton && !event.target.closest("button[data-fief-build]")) {
      if (!event.target.dataset.fiefBuild && !event.target.dataset.fiefUpgrade && !event.target.dataset.fiefRepair && !event.target.dataset.fiefRegroup) {
        this.fiefSelectedVillageId = villageButton.dataset.fiefVillage;
        this.renderFief();
        return;
      }
    }
    const build = event.target.closest("[data-fief-build]");
    if (build) {
      if (this.buildFiefBuilding(build.dataset.fiefVillage, Number(build.dataset.fiefSlot), build.dataset.fiefBuild)) {
        this.renderFief();
      }
      return;
    }
    const upgrade = event.target.closest("[data-fief-upgrade]");
    if (upgrade) {
      if (this.upgradeFiefBuilding(upgrade.dataset.fiefVillage, Number(upgrade.dataset.fiefUpgrade))) {
        this.renderFief();
      }
      return;
    }
    const repair = event.target.closest("[data-fief-repair]");
    if (repair) {
      if (this.repairFiefBuilding(repair.dataset.fiefVillage, Number(repair.dataset.fiefRepair))) {
        this.renderFief();
      }
      return;
    }
    const regroup = event.target.closest("[data-fief-regroup]");
    if (regroup) {
      const village = this.villages.find((entry) => entry.id === regroup.dataset.fiefRegroup);
      for (const unit of this.units) {
        if (unit.villageId === village?.id) {
          unit.rally = { x: village.x, y: village.y };
          unit.manual = true;
        }
      }
      if (village) {
        this.notify(`Unidades de ${village.name} reagrupadas.`);
      }
    }
  }

  updateTowerDefense(deltaSeconds) {
    this.fiefAiTimer = (this.fiefAiTimer ?? 0) + Math.max(0, deltaSeconds);

    if (this.fiefAiTimer < 0.1) {
      return;
    }

    deltaSeconds = this.fiefAiTimer;
    this.fiefAiTimer = 0;

    if (!this.wavesStarted) {
      const firstMain = this.fiefVillages().some((village) =>
        [2, 3, 5, 6].includes(village.biome),
      );
      if (firstMain) {
        this.wavesStarted = true;
        this.waveTimer = GAME_MODES[this.gameMode].interval ?? 90;
        this.notify("¡Las oleadas enemigas han comenzado!");
      }
    }

    this.updateFiefUnits(deltaSeconds);

    if (!this.wavesStarted || this.gameMode === "peaceful") {
      return;
    }

    if (this.waveActive) {
      this.updateWaveEnemies(deltaSeconds);
      return;
    }

    this.waveTimer = Math.max(
      0,
      this.waveTimer - Math.max(0, deltaSeconds),
    );
    if (this.waveTimer <= 0) {
      this.startWave();
    }
  }

  startWave() {
    const allied = this.fiefVillages();
    if (allied.length === 0) {
      this.waveTimer = GAME_MODES[this.gameMode].interval ?? 90;
      return;
    }
    const target = allied.reduce((best, village) =>
      this.villageProgress[village.id].stability <
      this.villageProgress[best.id].stability
        ? village
        : best,
    );
    this.waveTargetVillageId = target.id;
    this.waveIndex += 1;
    this.waveActive = true;
    const count = waveEnemyCount(this.waveIndex);
    const targetProgress = this.villageProgress[target.id];

    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + this.waveIndex * 0.37;
      const radius = 11 + (index % 3) * 1.5;
      const x = target.x + Math.cos(angle) * radius;
      const y = target.y + Math.sin(angle) * radius;
      const type = waveTypeForIndex(index, this.waveIndex);
      const species =
        type === "archer" ? AMBIENT_SPECIES.SPIDER : AMBIENT_SPECIES.NIGHTLING;
      const ambient = buildAmbientData(this.ambientRng, species, x, y);
      ambient.wave = true;
      ambient.raidType = type;
      ambient.waveTargetVillageId = target.id;
      ambient.health = Math.round(
        (type === "brute" ? 120 : type === "shaman" ? 90 : 60) *
          waveHealthMultiplier(this.waveIndex),
      );
      ambient.damage = Math.round(
        (type === "brute" ? 18 : type === "shaman" ? 8 : 10) *
          waveDamageMultiplier(this.waveIndex),
      );
      const id = createAmbientEntity(this.ecs, {
        species,
        x,
        y,
        ambient,
      });
      this.waveEnemyIds.add(id);
    }

    this.notify(
      `Oleada ${this.waveIndex}: ${count} enemigos atacan ${target.name}.`,
    );
    this.save();
  }

  updateWaveEnemies(deltaSeconds) {
    const targetVillage = this.villages.find(
      (village) => village.id === this.waveTargetVillageId,
    );
    const targetProgress = targetVillage
      ? this.villageProgress[targetVillage.id]
      : null;

    for (const id of [...this.waveEnemyIds]) {
      const ambient = this.ecs.getComponent(id, Component.AMBIENT);
      const transform = this.ecs.getComponent(id, Component.TRANSFORM);
      const motion = this.ecs.getComponent(id, Component.MOTION);
      if (!ambient || !transform || !motion || ambient.health <= 0) {
        this.waveEnemyIds.delete(id);
        continue;
      }

      ambient.attackCooldown = Math.max(
        0,
        (ambient.attackCooldown ?? 0) - deltaSeconds,
      );

      let unitTarget = null;
      let unitDistance = Infinity;
      for (const unit of this.units) {
        const distance = Math.hypot(unit.x - transform.x, unit.y - transform.y);
        if (distance < unitDistance) {
          unitDistance = distance;
          unitTarget = unit;
        }
      }

      const playerDistance = Math.hypot(
        this.playerTransform.x - transform.x,
        this.playerTransform.y - transform.y,
      );

      if (unitTarget && unitDistance <= 1.35) {
        if (ambient.attackCooldown <= 0) {
          unitTarget.hp = Math.max(0, unitTarget.hp - ambient.damage);
          ambient.attackCooldown = 1.1;
          if (unitTarget.hp <= 0) {
            this.notify(`${unitTarget.name} ha caído.`);
          }
        }
        continue;
      }
      if (playerDistance <= 1.25) {
        if (ambient.attackCooldown <= 0) {
          this.damagePlayer(ambient.damage);
          ambient.attackCooldown = 1.1;
        }
        continue;
      }

      if (!targetVillage) {
        continue;
      }
      const centerDistance = Math.hypot(
        transform.x - targetVillage.x,
        transform.y - targetVillage.y,
      );
      if (centerDistance <= 1.8) {
        if (ambient.attackCooldown <= 0) {
          ambient.attackCooldown = 1.3;
          const slots = buildingsForVillage(targetProgress);
          const intact = slots
            .map((building, slot) => ({ building, slot }))
            .filter((entry) => entry.building && entry.building.hp > 0);
          if (intact.length > 0) {
            const pick = intact[this.waveIndex % intact.length];
            pick.building.hp = Math.max(0, pick.building.hp - ambient.damage);
            targetProgress.buildings = slots;
            if (pick.building.hp <= 0) {
              this.syncVillageUnits(targetVillage.id);
              this.notify(`Un edificio de ${targetVillage.name} ha sido destruido.`);
            }
          } else {
            targetProgress.stability = Math.max(
              0,
              targetProgress.stability - ambient.damage * 0.25,
            );
          }
        }
        continue;
      }

      const dx = targetVillage.x - transform.x;
      const dy = targetVillage.y - transform.y;
      const length = Math.hypot(dx, dy) || 1;
      const step = 1.65 * deltaSeconds;
      ambient.anchorX = targetVillage.x;
      ambient.anchorY = targetVillage.y;
      ambient.state = "raid";
      motion.moving = true;
      motion.walkTime += deltaSeconds;
      moveDirect(
        transform,
        (dx / length) * step,
        (dy / length) * step,
        (x, y) => this.isActorWalkableAt(x, y),
      );
      if (Math.abs(dx - dy) > 0.01) {
        motion.facing = dx - dy > 0 ? 1 : -1;
      }
    }

    this.units = this.units.filter((unit) => unit.hp > 0);
    if (this.waveEnemyIds.size === 0) {
      this.completeWave();
    }
  }

  updateFiefUnits(deltaSeconds) {
    if (this.units.length === 0) {
      return;
    }

    for (const unit of this.units) {
      if (unit.hp <= 0) {
        continue;
      }
      unit.cooldown = Math.max(0, unit.cooldown - deltaSeconds);

      let targetId = null;
      let targetDistance = Infinity;
      for (const id of this.waveEnemyIds) {
        const ambient = this.ecs.getComponent(id, Component.AMBIENT);
        const transform = this.ecs.getComponent(id, Component.TRANSFORM);
        if (!ambient || !transform) {
          continue;
        }
        const distance = Math.hypot(transform.x - unit.x, transform.y - unit.y);
        if (distance < targetDistance) {
          targetDistance = distance;
          targetId = id;
        }
      }

      if (unit.role === "healer") {
        const healTarget =
          this.health < this.maxHealth &&
          Math.hypot(this.playerTransform.x - unit.x, this.playerTransform.y - unit.y) < unit.range
            ? "player"
            : this.units.find(
                (other) =>
                  other.hp < other.maxHp &&
                  Math.hypot(other.x - unit.x, other.y - unit.y) < unit.range,
              );
        if (healTarget && unit.cooldown <= 0) {
          if (healTarget === "player") {
            this.health = Math.min(this.maxHealth, this.health + 8);
            this.updateHealthHud();
          } else {
            healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + 8);
          }
          unit.cooldown = 1.4;
        }
      }

      if (targetId && targetDistance <= unit.range) {
        if (unit.cooldown <= 0) {
          this.damageAmbient(targetId, unit.damage);
          unit.cooldown = 0.9;
        }
        continue;
      }

      let goal = unit.rally;
      if (!goal && targetId) {
        const transform = this.ecs.getComponent(targetId, Component.TRANSFORM);
        goal = transform ? { x: transform.x, y: transform.y } : null;
      }
      if (!goal) {
        const village = this.villages.find((entry) => entry.id === unit.villageId);
        goal = village ? { x: village.x, y: village.y } : null;
      }
      if (!goal) {
        continue;
      }
      const dx = goal.x - unit.x;
      const dy = goal.y - unit.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= 0.35) {
        unit.manual = false;
        unit.rally = null;
        continue;
      }
      const move = Math.min(distance, unit.speed * deltaSeconds);
      unit.x += (dx / distance) * move;
      unit.y += (dy / distance) * move;
    }

    this.units = this.units.filter((unit) => unit.hp > 0);
  }

  completeWave() {
    this.waveActive = false;
    this.wavesSurvived += 1;
    this.waveEnemyIds.clear();
    this.waveTimer = GAME_MODES[this.gameMode].interval ?? 90;
    this.inventory.add("oro", 2 + Math.floor(this.waveIndex / 2));
    this.inventory.add("bayas", 3);
    this.syncAllVillageUnits();
    if (this.waveTargetVillageId) {
      const village = this.villages.find((entry) => entry.id === this.waveTargetVillageId);
      const progress = this.villageProgress[this.waveTargetVillageId];
      if (village && progress) {
        progress.stability = Math.min(100, progress.stability + 8);
      }
    }
    this.notify(`Oleada ${this.waveIndex} superada. La alianza resiste.`);
    this.save();
  }

  updateVillageBalance(deltaSeconds) {
    for (const village of this.villages) {
      const progress = this.villageProgress[village.id];
      if (!progress || progress.stability <= 0) {
        continue;
      }
      const line = civicLineForVillage(village);
      const pending = progress.delivered < line.length ? 1 : 0;
      const decay = (0.009 + pending * 0.003 + progress.delivered * 0.0002) * deltaSeconds;
      const before = progress.stability;
      progress.stability = Math.max(0, progress.stability - decay);
      if (before > 0 && progress.stability === 0) {
        this.notify(`${village.name} está en crisis. Lleva un ritual al chamán.`);
      }
    }
  }

  alliedVillages() {
    return this.villages.filter(
      (village) => this.villageProgress[village.id]?.allied,
    );
  }

  openTrade() {
    if (this.alliedVillages().length === 0) {
      this.notify("Primero debes unir una aldea a la alianza.");
      return;
    }
    this.tradeOpen = true;
    this.hud.tradePanel?.classList.add("is-open");
    this.hud.tradePanel?.setAttribute("aria-hidden", "false");
    this.renderTrade();
  }

  closeTrade() {
    this.tradeOpen = false;
    this.hud.tradePanel?.classList.remove("is-open");
    this.hud.tradePanel?.setAttribute("aria-hidden", "true");
  }

  villageNameById(id) {
    return this.villages.find((village) => village.id === id)?.name ?? id;
  }

  renderTrade() {
    if (!this.tradeOpen) {
      return;
    }
    const allied = this.alliedVillages();
    const progressFor = (village) => this.villageProgress[village.id];

    if (this.hud.tradeVillages) {
      this.hud.tradeVillages.replaceChildren(
        ...allied.map((village) => {
          const progress = progressFor(village);
          const row = document.createElement("div");
          const label = document.createElement("span");
          const button = document.createElement("button");
          row.className = "trade-village";
          label.innerHTML = `<strong>${village.name}</strong> · equilibrio ${Math.round(progress.stability)}% · ${Math.floor((this.gameTime - progress.lastProduction) / 60)} min acumulados`;
          button.type = "button";
          button.className = "recipe-action";
          button.dataset.tradeClaim = village.id;
          button.textContent = "Reclamar";
          row.append(label, button);
          return row;
        }),
      );
    }

    const fillVillageSelect = (select) => {
      if (!select) return;
      const previous = select.value;
      select.replaceChildren(
        ...allied.map((village) => {
          const option = document.createElement("option");
          option.value = village.id;
          option.textContent = village.name;
          return option;
        }),
      );
      if (allied.some((village) => village.id === previous)) {
        select.value = previous;
      }
    };

    fillVillageSelect(this.hud.tradeOrigin);
    fillVillageSelect(this.hud.tradeDestination);
    if (this.hud.tradeGoods) {
      const previous = this.hud.tradeGoods.value;
      this.hud.tradeGoods.replaceChildren(
        ...TRADE_GOODS.map((goods) => {
          const option = document.createElement("option");
          option.value = goods.id;
          option.textContent = goods.label;
          return option;
        }),
      );
      if (TRADE_GOODS.some((goods) => goods.id === previous)) {
        this.hud.tradeGoods.value = previous;
      }
    }

    if (this.hud.tradeRoutes) {
      this.hud.tradeRoutes.replaceChildren(
        ...this.tradeRoutes.map((route) => {
          const row = document.createElement("div");
          const elapsed = Math.max(0, this.gameTime - route.startedAt);
          const ready = elapsed >= route.duration;
          row.className = "trade-route";
          row.textContent = `${this.villageNameById(route.originId)} → ${this.villageNameById(route.destinationId)} · ${route.goods} · ${ready ? "listo para recoger" : `${Math.round((elapsed / route.duration) * 100)}%`} · ${Math.round(route.share * 100)}% para ti`;
          if (ready) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "recipe-action";
            button.dataset.tradeCollect = route.id;
            button.textContent = "Recoger";
            row.append(button);
          }
          return row;
        }),
      );
    }

    if (this.hud.tradeStatus) {
      this.hud.tradeStatus.textContent = this.tradeStatusText;
    }
  }

  handleTradeClick(event) {
    const claim = event.target.closest("[data-trade-claim]");
    if (claim) {
      this.claimVillageProduction(claim.dataset.tradeClaim);
      return;
    }
    const collect = event.target.closest("[data-trade-collect]");
    if (collect) {
      this.collectTradeRoute(collect.dataset.tradeCollect);
    }
  }

  claimVillageProduction(villageId) {
    const village = this.villages.find((entry) => entry.id === villageId);
    const progress = this.villageProgress[villageId];
    if (!village || !progress?.allied) {
      return;
    }
    if (progress.stability <= 0) {
      this.tradeStatusText = `${village.name} está en crisis; resuélvela antes de comerciar.`;
      this.renderTrade();
      return;
    }
    const elapsed = Math.min(600, Math.max(0, this.gameTime - progress.lastProduction));
    if (elapsed < 30) {
      this.tradeStatusText = "Los duendes necesitan al menos 30 segundos.";
      this.renderTrade();
      return;
    }
    const yields = productionYield(village, progress.stability, elapsed);
    if (Object.keys(yields).length === 0 || !this.inventory.canAddAll(yields)) {
      this.tradeStatusText = "No tienes espacio para la producción.";
      this.renderTrade();
      return;
    }
    for (const [key, amount] of Object.entries(yields)) {
      this.inventory.add(key, amount);
    }
    progress.lastProduction = this.gameTime;
    const label = Object.entries(yields)
      .map(([key, amount]) => `${RESOURCE_INFO[key]?.label ?? key} ${amount}`)
      .join(" · ");
    this.tradeStatusText = `${village.name}: recibiste ${label}.`;
    this.updateHud();
    this.save();
    this.renderTrade();
  }

  createTradeRoute() {
    const allied = this.alliedVillages();
    const originId = this.hud.tradeOrigin?.value;
    const destinationId = this.hud.tradeDestination?.value;
    const goods = this.hud.tradeGoods?.value ?? TRADE_GOODS[0].id;

    if (!originId || !destinationId || originId === destinationId) {
      this.tradeStatusText = "Elige dos aldeas diferentes.";
      this.renderTrade();
      return;
    }
    if (!allied.some((village) => village.id === originId) || !allied.some((village) => village.id === destinationId)) {
      this.tradeStatusText = "Solo puedes comerciar con aldeas aliadas.";
      this.renderTrade();
      return;
    }
    if (this.tradeRoutes.length >= 3) {
      this.tradeStatusText = "Ya tienes 3 caravanas en ruta.";
      this.renderTrade();
      return;
    }

    const origin = this.villageProgress[originId];
    const destination = this.villageProgress[destinationId];
    if (!origin || !destination || origin.stability <= 0 || destination.stability <= 0) {
      this.tradeStatusText = "Una de las aldeas está en crisis.";
      this.renderTrade();
      return;
    }
    const share = routeShare((origin.stability + destination.stability) / 2);
    this.tradeRoutes.push({
      id: globalThis.crypto?.randomUUID?.() ?? `route-${Date.now()}`,
      originId,
      destinationId,
      goods,
      startedAt: this.gameTime,
      duration: 180,
      share,
    });
    this.tradeStatusText = "Caravana enviada. Estará lista en 3 minutos de juego.";
    this.save();
    this.renderTrade();
  }

  collectTradeRoute(id) {
    const index = this.tradeRoutes.findIndex((route) => route.id === id);
    if (index < 0) {
      return;
    }
    const route = this.tradeRoutes[index];
    if (this.gameTime - route.startedAt < route.duration) {
      return;
    }
    const origin = this.villageProgress[route.originId];
    const destination = this.villageProgress[route.destinationId];
    const stability = ((origin?.stability ?? 0) + (destination?.stability ?? 0)) / 2;
    const result = tradeYield(route.goods, stability, route.share);
    if (!this.inventory.canAddAll(result.resources)) {
      this.tradeStatusText = "No tienes espacio para el botín de la caravana.";
      this.renderTrade();
      return;
    }
    for (const [key, amount] of Object.entries(result.resources)) {
      this.inventory.add(key, amount);
    }
    if (origin) origin.stability = Math.min(100, origin.stability + 2);
    if (destination) destination.stability = Math.min(100, destination.stability + 2);
    this.tradeRoutes.splice(index, 1);
    const label = Object.entries(result.resources)
      .map(([key, amount]) => `${RESOURCE_INFO[key]?.label ?? key} ${amount}`)
      .join(" · ");
    this.tradeStatusText = `Caravana completada: ${label}.`;
    this.updateHud();
    this.save();
    this.renderTrade();
  }

  renderObservatory() {
    if (!this.observatoryOpen) {
      return;
    }

    const canvas = this.hud.skyCanvas;
    const moon = this.moonPhase();

    if (this.hud.skyMoon) {
      this.hud.skyMoon.textContent = `${moon.icon} ${moon.name}`;
    }
    if (this.hud.skyStatus) {
      this.hud.skyStatus.textContent = `Día ${this.currentGameDay()} · ${this.observatoryDiscoveries.size}/${SKY_OBJECTS.length} descubiertos`;
    }
    if (this.hud.skyInfo) {
      this.hud.skyInfo.textContent = this.skySelected?.description ??
        "Arrastra para mirar, usa la rueda para acercar y selecciona un objeto.";
    }

    this.renderObservationMission();
    this.renderSkyList();
    this.drawSky();
  }

  renderSkyList() {
    const list = this.hud.skyList;

    if (!list) {
      return;
    }

    const fragment = document.createDocumentFragment();
    const objects = searchSkyObjects(this.skySearch);
    const mission = this.getObservationMission();

    for (const object of objects) {
      const button = document.createElement("button");
      const name = document.createElement("span");
      const discovered = document.createElement("span");

      button.type = "button";
      button.dataset.skyId = object.id;
      button.classList.toggle("is-selected", this.skySelected?.id === object.id);
      button.classList.toggle(
        "sky-mission-target",
        mission?.constellationId === object.id,
      );
      name.textContent = `${object.kind === "planet" ? "-?" : "✦"} ${object.name}`;
      discovered.className = "sky-discovered";
      discovered.textContent =
        mission?.constellationId === object.id
          ? this.observationNotes.has(object.id)
            ? "Apuntado"
            : "Misión"
          : this.observatoryDiscoveries.has(object.id)
            ? "Visto"
            : "";
      button.append(name, discovered);
      fragment.append(button);
    }

    if (fragment.childNodes.length === 0) {
      const empty = document.createElement("p");
      empty.className = "university-empty";
      empty.textContent = "No hay objetos que coincidan.";
      fragment.append(empty);
    }

    list.replaceChildren(fragment);
  }

  drawSky() {
    const canvas = this.hud.skyCanvas;

    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    }

    const ctx = canvas.getContext("2d");
    const width = rect.width;
    const height = rect.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      10,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.7,
    );
    gradient.addColorStop(0, "#0b1730");
    gradient.addColorStop(0.55, "#070d1d");
    gradient.addColorStop(1, "#02040a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const scaleX = 38 * this.skyView.zoom;
    const scaleY = 4.2 * this.skyView.zoom;
    const toScreen = (ra, dec) => {
      let deltaRa = ((ra - this.skyView.ra + 36) % 24) - 12;
      return {
        x: width / 2 + deltaRa * scaleX,
        y: height / 2 + (dec - this.skyView.dec) * -scaleY,
      };
    };

    for (const constellation of SKY_OBJECTS.filter((object) => object.kind === "constellation")) {
      const points = constellation.stars.map((star) => toScreen(star.ra, star.dec));

      ctx.strokeStyle = "rgba(120, 160, 255, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();

      for (let index = 0; index < constellation.stars.length; index += 1) {
        const star = constellation.stars[index];
        const point = points[index];
        const radius = Math.max(0.7, (3.6 - star.magnitude * 0.35) * this.skyView.zoom);
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = index === 2 ? "#e6f0ff" : "#b9c8f0";
        ctx.fill();
      }

      const labelPoint = toScreen(constellation.ra, constellation.dec);
      if (
        labelPoint.x > -100 &&
        labelPoint.x < width + 100 &&
        labelPoint.y > -40 &&
        labelPoint.y < height + 40
      ) {
        ctx.font = '9px "Segoe UI", sans-serif';
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(180, 205, 255, 0.55)";
        ctx.fillText(constellation.abbr, labelPoint.x, labelPoint.y + 14);
      }
    }

    if (this.skyAlign) {
      const align = this.skyAlign;
      const targetA = toScreen(align.constellation.ra, align.constellation.dec);
      const targetB = toScreen(align.companion.ra, align.companion.dec);
      const lens = lensForXp(this.lensXp);
      const tolerance = 30 + lens.tolerance;

      ctx.strokeStyle = "rgba(159, 199, 255, 0.65)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(targetA.x, targetA.y);
      ctx.lineTo(targetB.x, targetB.y);
      ctx.stroke();
      ctx.setLineDash([]);

      for (const target of [targetA, targetB]) {
        ctx.beginPath();
        ctx.arc(target.x, target.y, 7, 0, Math.PI * 2);
        ctx.strokeStyle = "#9fc7ff";
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(target.x, target.y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = "#e6f0ff";
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(240, 192, 122, 0.8)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(align.reticleX, align.reticleY, tolerance, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(align.reticleX - 9, align.reticleY);
      ctx.lineTo(align.reticleX + 9, align.reticleY);
      ctx.moveTo(align.reticleX, align.reticleY - 9);
      ctx.lineTo(align.reticleX, align.reticleY + 9);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(
        align.reticleX,
        align.reticleY,
        tolerance + 5,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * align.progress,
      );
      ctx.strokeStyle = "#7ec699";
      ctx.lineWidth = 2.4;
      ctx.stroke();

      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.textAlign = "center";
      ctx.fillStyle = "#f0c07a";
      ctx.fillText(
        `Precisión ${Math.round(align.precision)}%`,
        align.reticleX,
        align.reticleY + tolerance + 18,
      );
    }

    const mission = this.getObservationMission();
    if (
      mission &&
      !this.observationNotes.has(mission.constellationId)
    ) {
      const constellation = SKY_OBJECTS.find(
        (object) => object.id === mission.constellationId,
      );
      if (constellation) {
        const point = toScreen(constellation.ra, constellation.dec);
        ctx.strokeStyle = "rgba(240, 192, 122, 0.9)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = '10px "Segoe UI", sans-serif';
        ctx.textAlign = "center";
        ctx.fillStyle = "#f0c07a";
        ctx.fillText("Misión", point.x, point.y - 24);
      }
    }

    for (const planet of PLANETS) {
      const point = toScreen(planet.ra, planet.dec);
      ctx.beginPath();
      ctx.arc(point.x, point.y, planet.size * this.skyView.zoom, 0, Math.PI * 2);
      ctx.fillStyle = planet.color;
      ctx.fill();
      ctx.font = '9px "Segoe UI", sans-serif';
      ctx.textAlign = "center";
      ctx.fillStyle = planet.color;
      ctx.fillText(planet.name, point.x, point.y - 7 * this.skyView.zoom);
    }

    if (this.skySelected) {
      const point = toScreen(this.skySelected.ra, this.skySelected.dec);
      ctx.strokeStyle = "#f0c07a";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(point.x - 18, point.y);
      ctx.lineTo(point.x - 8, point.y);
      ctx.moveTo(point.x + 8, point.y);
      ctx.lineTo(point.x + 18, point.y);
      ctx.moveTo(point.x, point.y - 18);
      ctx.lineTo(point.x, point.y - 8);
      ctx.moveTo(point.x, point.y + 8);
      ctx.lineTo(point.x, point.y + 18);
      ctx.stroke();
    }
  }

  handleSkySearch(event) {
    this.skySearch = String(event.target.value ?? "");
    this.renderSkyList();
  }

  handleSkyListClick(event) {
    const button = event.target.closest("[data-sky-id]");

    if (!button) {
      return;
    }

    const object = SKY_OBJECTS.find((entry) => entry.id === button.dataset.skyId);

    if (object) {
      this.selectSkyObject(object);
    }
  }

  selectSkyObject(object) {
    this.skySelected = object;
    this.skyView.ra = object.ra;
    this.skyView.dec = object.dec;

    if (!this.observatoryDiscoveries.has(object.id)) {
      this.observatoryDiscoveries.add(object.id);
      this.save();
      this.notify(`Descubrimiento: ${object.name}.`);
    }

    const mission = this.getObservationMission();
    if (
      mission &&
      mission.constellationId === object.id &&
      !this.observationNotes.has(object.id)
    ) {
      this.notify(
        "Pulsa Iniciar alineación y encaja la conjunción con la retícula.",
      );
    }

    this.renderObservatory();
  }

  moveSkyReticle(event) {
    if (!this.skyAlign) {
      return;
    }
    const canvas = this.hud.skyCanvas;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    this.skyAlign.reticleX = Math.max(
      0,
      Math.min(rect.width, event.clientX - rect.left),
    );
    this.skyAlign.reticleY = Math.max(
      0,
      Math.min(rect.height, event.clientY - rect.top),
    );
    this.drawSky();
  }

  handleSkyPointerDown(event) {
    event.preventDefault();
    if (this.skyAlign) {
      this.moveSkyReticle(event);
      return;
    }
    const canvas = this.hud.skyCanvas;
    this.skyDragging = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      ra: this.skyView.ra,
      dec: this.skyView.dec,
    };
    canvas?.setPointerCapture?.(event.pointerId);
    canvas?.classList.add("is-dragging");
  }

  handleSkyPointerMove(event) {
    if (this.skyAlign) {
      event.preventDefault();
      this.moveSkyReticle(event);
      return;
    }

    const drag = this.skyDragging;

    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    event.preventDefault();
    const scaleX = 38 * this.skyView.zoom;
    const scaleY = 4.2 * this.skyView.zoom;
    this.skyView.ra = (drag.ra - (event.clientX - drag.x) / scaleX + 24) % 24;
    this.skyView.dec = Math.max(
      -85,
      Math.min(85, drag.dec + (event.clientY - drag.y) / scaleY),
    );
    this.drawSky();
  }

  handleSkyPointerUp(event) {
    if (this.skyAlign) {
      return;
    }
    if (!this.skyDragging || event.pointerId !== this.skyDragging.pointerId) {
      return;
    }

    const drag = this.skyDragging;
    this.skyDragging = null;
    this.hud.skyCanvas?.releasePointerCapture?.(event.pointerId);
    this.hud.skyCanvas?.classList.remove("is-dragging");

    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5) {
      this.pickSkyObject(event);
    }
  }

  handleSkyWheel(event) {
    event.preventDefault();
    this.skyView.zoom = Math.max(
      0.5,
      Math.min(3.5, this.skyView.zoom * Math.exp(-event.deltaY * 0.0012)),
    );
    this.drawSky();
  }

  pickSkyObject(event) {
    const canvas = this.hud.skyCanvas;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const scaleX = 38 * this.skyView.zoom;
    const scaleY = 4.2 * this.skyView.zoom;
    let best = null;
    let bestDistance = 16;
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;

    for (const object of SKY_OBJECTS) {
      const deltaRa = ((object.ra - this.skyView.ra + 36) % 24) - 12;
      const x = width / 2 + deltaRa * scaleX;
      const y = height / 2 + (object.dec - this.skyView.dec) * -scaleY;
      const distance = Math.hypot(pointerX - x, pointerY - y);

      if (distance < bestDistance) {
        bestDistance = distance;
        best = object;
      }
    }

    if (best) {
      this.selectSkyObject(best);
    }
  }

  openUniversity() {
    this.closeObservatory();
    this.closeRecipeBook();
    this.closeCrafting();
    this.closeChest();
    this.closeMap();
    if (!this.compassOwned) {
      this.compassOwned = true;
      this.notify(
        "La biblioteca te regala una brújula. Pulsa G o toca la brújula para abrir el mapa.",
      );
      this.effects.addText("Brújula obtenida", this.playerTransform.x, this.playerTransform.y, {
        color: "#8fd1e8",
      });
      this.updateHud();
      this.save();
    }
    this.universityOpen = true;
    this.hud.universityPanel?.classList.add("is-open");
    this.hud.universityPanel?.setAttribute("aria-hidden", "false");
    this.renderUniversity();
  }

  closeUniversity() {
    this.universityOpen = false;
    this.hud.universityPanel?.classList.remove("is-open");
    this.hud.universityPanel?.setAttribute("aria-hidden", "true");
  }

  toggleMap() {
    if (this.mapOpen) {
      this.closeMap();
    } else {
      this.openMap();
    }
  }

  openMap() {
    if (!this.compassOwned) {
      this.notify("La biblioteca de la Universidad puede darte una brújula.");
      return;
    }

    this.closeQuest();
    this.closeBirdPanel();
    this.closeWolfDen();
    this.closeObservatory();
    this.closeCrafting();
    this.closeRecipeBook();
    this.closeChest();
    this.closeUniversity();
    this.closeTrade();
    this.closeVillage();
    this.mapOpen = true;
    if (this.hud.mapPanel) {
      this.hud.mapPanel.hidden = false;
    }
    this.hud.mapPanel?.classList.add("is-open");
    this.hud.mapPanel?.setAttribute("aria-hidden", "false");
    this.renderMap();
  }

  closeMap() {
    this.mapOpen = false;
    if (this.hud.mapPanel) {
      this.hud.mapPanel.hidden = true;
    }
    this.hud.mapPanel?.classList.remove("is-open");
    this.hud.mapPanel?.setAttribute("aria-hidden", "true");
  }

  setWaypoint(x, y, label = "Destino") {
    this.waypoint = normalizeWaypoint({ x, y, label });
    this.updateCompassHud();
    this.renderMap();
    this.save();
  }

  clearWaypoint() {
    this.waypoint = null;
    this.updateCompassHud();
    this.renderMap();
    this.save();
    this.notify("Destino borrado. La brújula queda libre.");
  }

  handleMapLandmarkClick(event) {
    const button = event.target.closest("[data-map-target]");
    if (!button) {
      return;
    }
    const x = Number(button.dataset.mapX);
    const y = Number(button.dataset.mapY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }
    this.setWaypoint(x, y, button.dataset.mapTarget || "Destino");
    this.notify(`Destino marcado: ${button.dataset.mapTarget}.`);
  }

  handleMapPointer(event) {
    if (!this.mapOpen || !this.mapView || !this.hud.mapCanvas) {
      return;
    }
    const rect = this.hud.mapCanvas.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const view = this.mapView;

    if (
      localX < view.offsetX ||
      localX > view.offsetX + view.size ||
      localY < view.offsetY ||
      localY > view.offsetY + view.size
    ) {
      return;
    }

    const ratioX = (localX - view.offsetX) / view.size;
    const ratioY = (localY - view.offsetY) / view.size;
    const worldX = view.centerX - view.range + ratioX * view.range * 2;
    const worldY = view.centerY - view.range + ratioY * view.range * 2;
    this.setWaypoint(worldX, worldY, "Punto marcado");
    this.notify("Punto marcado. La flecha de la brújula te guiará.");
  }

  walkToWaypoint() {
    if (!this.waypoint) {
      this.openMap();
      return;
    }

    const goal = this.waypoint;
    const baseX = Math.floor(goal.x);
    const baseY = Math.floor(goal.y);
    let target = null;

    for (let radius = 0; radius <= 8 && !target; radius += 1) {
      for (let dy = -radius; dy <= radius && !target; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) {
            continue;
          }
          const x = baseX + dx;
          const y = baseY + dy;
          if (this.isPlayerWalkableAt(x, y)) {
            target = { x, y };
            break;
          }
        }
      }
    }

    if (!target) {
      this.notify("No hay una casilla transitable cerca del destino.");
      return;
    }

    const transform = this.playerTransform;
    const path = findPath({
      startX: Math.floor(transform.x),
      startY: Math.floor(transform.y),
      goalX: target.x,
      goalY: target.y,
      isWalkable: (x, y) => this.isPlayerWalkableAt(x, y),
      getHeight: (x, y) => this.world.heightAt(x, y),
      maxStepHeight: 1,
      maxDropHeight: Infinity,
      maxNodes: PATH_MAX_NODES,
    });

    if (path === null) {
      this.notify("No hay camino hasta el destino.");
      return;
    }

    this.closeMap();
    this.cameraFollow = true;
    this.cancelPlayerAction();
    if (path.length > 0) {
      this.setPlayerPath(path, null);
    }
    this.notify(`Caminando hacia ${goal.label}.`);
  }

  handleCrossWaypoint() {
    if (!this.compassOwned) {
      this.notify("La biblioteca de la Universidad puede darte una brújula.");
      return;
    }
    if (this.waypoint) {
      this.walkToWaypoint();
    } else {
      this.openMap();
    }
  }

  renderMap() {
    const canvas = this.hud.mapCanvas;
    const panel = this.hud.mapPanel;
    if (!canvas || !panel || !this.mapOpen) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (
      canvas.width !== Math.floor(rect.width * dpr) ||
      canvas.height !== Math.floor(rect.height * dpr)
    ) {
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = rect.width;
    const height = rect.height;
    const size = Math.min(width, height);
    const offsetX = (width - size) / 2;
    const offsetY = (height - size) / 2;
    const range = 100;
    const step = 3;
    const cells = Math.ceil((range * 2) / step);
    const cellSize = size / cells;
    const player = this.playerTransform;
    const centerX = player.x;
    const centerY = player.y;
    const view = {
      centerX,
      centerY,
      range,
      size,
      offsetX,
      offsetY,
      cells,
      cellSize,
    };
    this.mapView = view;

    ctx.fillStyle = "#0b141d";
    ctx.fillRect(0, 0, width, height);

    for (let row = 0; row < cells; row += 1) {
      for (let col = 0; col < cells; col += 1) {
        const worldX = centerX - range + col * step + step / 2;
        const worldY = centerY - range + row * step + step / 2;
        const biome = this.world.biomeAt(
          Math.floor(worldX),
          Math.floor(worldY),
        );
        const info = biomeById(biome);
        ctx.fillStyle = info?.shades?.[0] ?? "#1b4058";
        ctx.fillRect(
          offsetX + col * cellSize,
          offsetY + row * cellSize,
          cellSize + 0.6,
          cellSize + 0.6,
        );
      }
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX, offsetY, size, size);

    const toMap = (worldX, worldY) => ({
      x: offsetX + ((worldX - (centerX - range)) / (range * 2)) * size,
      y: offsetY + ((worldY - (centerY - range)) / (range * 2)) * size,
    });

    const inView = (worldX, worldY) =>
      Math.abs(worldX - centerX) <= range && Math.abs(worldY - centerY) <= range;

    const drawMarker = (worldX, worldY, color, radius = 4, shape = "circle") => {
      if (!inView(worldX, worldY)) {
        return;
      }
      const point = toMap(worldX, worldY);
      ctx.save();
      ctx.fillStyle = color;
      ctx.strokeStyle = "rgba(4, 8, 12, 0.9)";
      ctx.lineWidth = 1.5;
      if (shape === "diamond") {
        ctx.beginPath();
        ctx.moveTo(point.x, point.y - radius);
        ctx.lineTo(point.x + radius, point.y);
        ctx.lineTo(point.x, point.y + radius);
        ctx.lineTo(point.x - radius, point.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (shape === "triangle") {
        ctx.beginPath();
        ctx.moveTo(point.x, point.y - radius);
        ctx.lineTo(point.x + radius, point.y + radius);
        ctx.lineTo(point.x - radius, point.y + radius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    };

    if (this.university) {
      drawMarker(this.university.x, this.university.y, "#8fd1e8", 5);
    }
    if (this.observatory) {
      drawMarker(this.observatory.x, this.observatory.y, "#b58ce0", 5);
    }
    if (this.wolfDen) {
      drawMarker(this.wolfDen.x, this.wolfDen.y, "#d97b6c", 5, "triangle");
    }
    for (const village of this.villages) {
      drawMarker(village.x, village.y, "#f0c07a", 4);
    }
    if (this.spawnPoint) {
      drawMarker(this.spawnPoint.x, this.spawnPoint.y, "#7ec699", 4);
    }
    if (this.waypoint) {
      drawMarker(this.waypoint.x, this.waypoint.y, "#f4f1ea", 6, "diamond");
    }

    const playerPoint = toMap(player.x, player.y);
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#0b141d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(playerPoint.x, playerPoint.y, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    if (this.hud.mapStatus) {
      const distance = this.waypoint
        ? Math.round(
            Math.hypot(
              this.waypoint.x - player.x,
              this.waypoint.y - player.y,
            ),
          )
        : null;
      this.hud.mapStatus.textContent = this.waypoint
        ? `Destino: ${this.waypoint.label} · ${distance} m`
        : "Toca el mapa para marcar un destino.";
    }

    this.renderMapLandmarks();
  }

  renderMapLandmarks() {
    const container = this.hud.mapLandmarks;
    if (!container) {
      return;
    }

    const landmarks = [
      this.university && {
        x: this.university.x,
        y: this.university.y,
        label: "Universidad",
      },
      this.observatory && {
        x: this.observatory.x,
        y: this.observatory.y,
        label: "Observatorio",
      },
      this.wolfDen && {
        x: this.wolfDen.x,
        y: this.wolfDen.y,
        label: "Cueva de lobos",
      },
      ...this.villages.map((village) => ({
        x: village.x,
        y: village.y,
        label: village.name,
      })),
      this.spawnPoint && {
        x: this.spawnPoint.x,
        y: this.spawnPoint.y,
        label: "Cama / reaparición",
      },
    ].filter(Boolean);

    const fragment = document.createDocumentFragment();
    for (const landmark of landmarks) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "map-landmark";
      button.dataset.mapTarget = landmark.label;
      button.dataset.mapX = String(landmark.x);
      button.dataset.mapY = String(landmark.y);
      button.textContent = landmark.label;
      fragment.append(button);
    }

    container.replaceChildren(fragment);
  }

  updateCompassHud() {
    const compass = this.hud.compassHud;
    const cross = this.hud.btnCrossWaypoint;
    const crossLabel = this.hud.btnCrossWaypointLabel;

    if (!this.compassOwned) {
      if (compass) {
        compass.hidden = true;
      }
      if (cross) {
        cross.hidden = true;
      }
      return;
    }

    if (compass) {
      compass.hidden = false;
    }
    if (cross) {
      cross.hidden = false;
    }

    if (!this.waypoint) {
      if (cross) {
        cross.setAttribute("aria-label", "Abrir mapa y marcar destino");
        cross.title = "Abrir mapa y marcar destino";
      }
      if (crossLabel) {
        crossLabel.textContent = "Mapa";
      }
    } else {
      if (cross) {
        cross.setAttribute("aria-label", `Ir a ${this.waypoint.label}`);
        cross.title = `Ir a ${this.waypoint.label}`;
      }
      if (crossLabel) {
        crossLabel.textContent = "Ir";
      }
    }

    const arrow = this.hud.compassArrow;
    if (!this.waypoint) {
      if (arrow) {
        arrow.style.transform = "rotate(0deg)";
      }
      if (this.hud.compassDistance) {
        this.hud.compassDistance.textContent = "Mapa";
      }
      if (this.hud.compassLabel) {
        this.hud.compassLabel.textContent = "Sin destino";
      }
      if (compass) {
        compass.setAttribute("aria-label", "Abrir mapa y marcar destino");
      }
      return;
    }

    const state = compassState({
      player: this.playerTransform,
      target: this.waypoint,
      camera: this.camera,
    });
    if (arrow) {
      arrow.style.transform = `rotate(${(state.angle * 180) / Math.PI + 90}deg)`;
    }
    if (this.hud.compassDistance) {
      this.hud.compassDistance.textContent = `${Math.round(state.distance)} m`;
    }
    if (this.hud.compassLabel) {
      this.hud.compassLabel.textContent = state.label;
    }
    if (compass) {
      compass.setAttribute(
        "aria-label",
        `Brújula hacia ${state.label}, ${Math.round(state.distance)} metros`,
      );
    }
  }

  renderUniversityTabs() {
    const container = this.hud.universityTabs;

    if (!container) {
      return;
    }

    const tabs = [
      { id: "shop", label: "Tienda" },
      { id: "research", label: "Investigaci\u00F3n" },
      { id: "library", label: "Biblioteca" },
      { id: "collection", label: "Colección" },
    ];
    const fragment = document.createDocumentFragment();

    for (const tab of tabs) {
      const button = document.createElement("button");
      const active = this.universityTab === tab.id;

      button.type = "button";
      button.className = "craft-tab";
      button.dataset.universityTab = tab.id;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(active));
      button.classList.toggle("is-active", active);
      button.textContent = tab.label;
      fragment.append(button);
    }

    container.replaceChildren(fragment);
  }

  appendUniversityCosts(container, costs) {
    for (const [key, amount] of Object.entries(costs)) {
      const info = RESOURCE_INFO[key];

      if (!info) {
        continue;
      }

      const chip = document.createElement("span");
      const dot = document.createElement("span");
      const label = document.createElement("span");

      chip.className = "university-cost";
      chip.style.setProperty("--resource-color", info.color);
      dot.className = "dot";
      label.textContent = `${info.label} ${amount}`;
      chip.append(dot, label);
      container.append(chip);
    }
  }

  createUniversityCard({ name, description, tag, costs, actions }) {
    const card = document.createElement("article");
    const top = document.createElement("div");
    const nameEl = document.createElement("span");
    const tagEl = document.createElement("span");
    const desc = document.createElement("p");
    const costsEl = document.createElement("div");
    const actionsEl = document.createElement("div");

    card.className = "university-card";
    top.className = "university-card-top";
    nameEl.className = "university-name";
    nameEl.textContent = name;
    tagEl.className = "university-tag";
    tagEl.textContent = tag ?? "";
    top.append(nameEl, tagEl);

    desc.className = "university-desc";
    desc.textContent = description;

    costsEl.className = "university-costs";
    this.appendUniversityCosts(costsEl, costs ?? {});

    actionsEl.className = "university-actions";

    for (const action of actions ?? []) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "recipe-action";
      button.dataset.universityAction = action.action;

      if (action.value !== undefined) {
        button.dataset.universityValue = String(action.value);
      }
      button.disabled = action.disabled === true;
      button.textContent = action.label;
      actionsEl.append(button);
    }

    card.append(top, desc, costsEl, actionsEl);
    return card;
  }

  renderUniversityShop() {
    const fragment = document.createDocumentFragment();
    const bookCosts = { Fe: 4, Cu: 3, piel: 2 };
    const cauldronCosts = { piedra: 12, Fe: 2 };
    const mapCosts = { Cu: 3, piel: 2 };
    const cauldronCount = this.inventory.itemCount("cauldron");

    fragment.append(
      this.createUniversityCard({
        name: "Libro de recetas",
        description:
          "Desbloquea la investigaci\u00F3n de pociones y el uso del caldero.",
        tag: this.researchBookOwned ? "Adquirido" : "Pendiente",
        costs: this.researchBookOwned ? {} : bookCosts,
        actions: [
          {
            label: this.researchBookOwned ? "Adquirido" : "Comprar",
            action: "buy-book",
            disabled:
              this.researchBookOwned || !this.inventory.has(bookCosts),
          },
        ],
      }),
    );

    const cauldronActions = [
      {
        label: "Comprar",
        action: "buy-cauldron",
        disabled: !this.inventory.has(cauldronCosts),
      },
    ];

    if (cauldronCount > 0) {
      cauldronActions.push({
        label: "Colocar",
        action: "place-cauldron",
      });
    }

    fragment.append(
      this.createUniversityCard({
        name: "Caldero",
        description:
          "Estaci\u00F3n para preparar pociones investigadas con minerales.",
        tag: `En mochila: ${cauldronCount}`,
        costs: cauldronCosts,
        actions: cauldronActions,
      }),
    );

    fragment.append(
      this.createUniversityCard({
        name: "Mapa de duende",
        description:
          "Ampl\u00EDa en 1 bloque el radio de b\u00FAsqueda de la auto-tarea.",
        tag: `Radio actual: ${WORKER_AUTO_RADIUS + this.workerMapBonus}`,
        costs: mapCosts,
        actions: [
          {
            label:
              this.workerMapBonus >= 7 ? "Radio m\u00E1ximo" : "Comprar mapa",
            action: "buy-map",
            disabled:
              this.workerMapBonus >= 7 || !this.inventory.has(mapCosts),
          },
        ],
      }),
    );

    return fragment;
  }

  renderUniversityResearch() {
    const fragment = document.createDocumentFragment();

    if (!this.researchBookOwned) {
      const empty = document.createElement("p");
      empty.className = "university-empty";
      empty.textContent =
        "Compra primero el Libro de recetas en la tienda de la Universidad.";
      fragment.append(empty);
      return fragment;
    }

    for (const potion of POTION_DATA) {
      const researched = this.researchedPotions.has(potion.id);
      const affordable = this.inventory.has(potion.researchCosts);

      fragment.append(
        this.createUniversityCard({
          name: potion.name,
          description: potion.description,
          tag: researched ? "Investigada" : "Pendiente",
          costs: researched ? {} : potion.researchCosts,
          actions: [
            {
              label: researched ? "Investigada" : "Investigar",
              action: "research",
              value: potion.id,
              disabled: researched || !affordable,
            },
          ],
        }),
      );
    }

    return fragment;
  }

  renderUniversityLibrary() {
    const fragment = document.createDocumentFragment();
    const entries = this.libraryEntries;
    const bookCosts = { Fe: 4, Cu: 3, piel: 2 };

    fragment.append(
      this.createUniversityCard({
        name: "Brújula de la biblioteca",
        description:
          "Regalo de bienvenida: marca un punto en el mapa y una flecha te guiará hasta él.",
        tag: this.compassOwned ? "Obtenida" : "Pendiente",
        costs: {},
        actions: [],
      }),
    );

    if (!this.researchBookOwned) {
      fragment.append(
        this.createUniversityCard({
          name: "Libro de recetas",
          description:
            "La biblioteca guarda los apuntes de pociones. Compra el libro para empezar a investigar.",
          tag: "Pendiente",
          costs: bookCosts,
          actions: [
            {
              label: "Comprar libro",
              action: "buy-book",
              disabled: !this.inventory.has(bookCosts),
            },
          ],
        }),
      );
    }

    for (const book of SCIENCE_BOOKS) {
      const points = this.sciencePoints[book.id] ?? 0;
      const level = scienceLevel(this.sciencePoints, book.id);
      const nextCost = SCIENCE_TIER_COSTS[Math.min(level + 1, SCIENCE_TIER_COSTS.length - 1)];
      fragment.append(
        this.createUniversityCard({
          name: book.name,
          description: book.description,
          tag: `Nivel ${level}/${SCIENCE_TIER_COSTS.length - 1}`,
          costs: {},
          actions: [],
        }),
      );
      const progress = document.createElement("p");
      progress.className = "university-desc";
      progress.textContent = `Apuntes: ${points}${level < SCIENCE_TIER_COSTS.length - 1 ? ` / ${nextCost} para el siguiente nivel` : " · nivel máximo"}`;
      fragment.append(progress);
    }

    const lens = lensForXp(this.lensXp);
    const nextLens = nextLensForXp(this.lensXp);
    fragment.append(
      this.createUniversityCard({
        name: "Telescopio y lentes",
        description: nextLens
          ? `Siguiente mejora: ${nextLens.name}. Las conjunciones más precisas mejoran los lentes.`
          : "Lentes al máximo: tolerancia y precisión mejoradas.",
        tag: lens.name,
        costs: {},
        actions: [],
      }),
    );
    const lensProgress = document.createElement("p");
    lensProgress.className = "university-desc";
    lensProgress.textContent = nextLens
      ? `Investigación óptica: ${Math.round(this.lensXp)} / ${nextLens.xp} XP · ${this.investigations.length} conjunciones registradas`
      : `${Math.round(this.lensXp)} XP · ${this.investigations.length} conjunciones registradas`;
    fragment.append(lensProgress);

    if (entries.length === 0) {
      const empty = document.createElement("p");
      empty.className = "university-empty";
      empty.textContent =
        "La biblioteca está vacía. Investiga pociones para llenar la estantería.";
      fragment.append(empty);
    }

    const shelfSize = 8;
    const shelfCount = Math.max(
      3,
      Math.ceil((entries.length + 1) / shelfSize),
    );

    for (let shelf = 0; shelf < shelfCount; shelf += 1) {
      const section = document.createElement("section");
      const title = document.createElement("h3");
      const slots = document.createElement("div");

      section.className = "university-shelf";
      title.textContent = `Estante ${shelf + 1}`;
      slots.className = "university-slots";

      for (let slot = 0; slot < shelfSize; slot += 1) {
        const index = shelf * shelfSize + slot;
        const entry = entries[index];
        const cell = document.createElement("div");

        cell.className = "university-slot";
        if (entry) {
          cell.classList.add("is-filled");
          cell.textContent = entry.name;
          cell.title = entry.description ?? "";
        } else {
          cell.textContent = "Vac\u00EDo";
        }
        slots.append(cell);
      }

      section.append(title, slots);
      fragment.append(section);
    }

    return fragment;
  }

  renderUniversityCollection() {
    const fragment = document.createDocumentFragment();
    const featherCount = Object.values(this.feathers).reduce(
      (total, count) => total + count,
      0,
    );
    const featherEntries = Object.entries(FEATHER_LABELS)
      .map(([id, name]) => `${name}: ${this.feathers[id] ?? 0}`)
      .join(" · ");
    const mineralEntries = [
      `Amatista: ${this.inventory.count("amatista")}`,
      `Cuarzo: ${this.inventory.count("cuarzo")}`,
    ].join(" · ");
    const fishEntries = Object.entries(this.fishingRecords)
      .map(
        ([id, record]) =>
          `${fishById(id)?.name ?? id} ${(record.weight ?? 0).toFixed(2)} kg`,
      )
      .join(" · ");

    fragment.append(
      this.createUniversityCard({
        name: "Plumas de aves",
        description: `Colección de plumas · ${featherCount} en total`,
        tag: featherCount > 0 ? "En progreso" : "Sin descubrir",
        actions: [],
      }),
    );
    const featherDetail = document.createElement("p");
    featherDetail.className = "university-desc";
    featherDetail.textContent = featherEntries;
    fragment.append(featherDetail);

    fragment.append(
      this.createUniversityCard({
        name: "Minerales raros",
        description: "Amatistas y cuarzos encontrados en tus vetas.",
        tag: this.inventory.count("amatista") + this.inventory.count("cuarzo") > 0
          ? "Encontrados"
          : "Sin descubrir",
        actions: [],
      }),
    );
    const mineralDetail = document.createElement("p");
    mineralDetail.className = "university-desc";
    mineralDetail.textContent = mineralEntries;
    fragment.append(mineralDetail);

    fragment.append(
      this.createUniversityCard({
        name: "Récords de pesca",
        description: fishEntries || "Aún no has pescado ningún pez.",
        tag: Object.keys(this.fishingRecords).length > 0 ? "Con récords" : "Sin récords",
        actions: [],
      }),
    );

    fragment.append(
      this.createUniversityCard({
        name: "Cielo descubierto",
        description: `${this.observatoryDiscoveries.size} objetos celestes registrados en el observatorio.`,
        tag: this.observatoryDiscoveries.size > 0 ? "Con descubrimientos" : "Sin descubrir",
        actions: [],
      }),
    );

    return fragment;
  }

  renderUniversity() {
    if (!this.universityOpen) {
      return;
    }

    this.renderUniversityTabs();
    const body = this.hud.universityBody;

    if (!body) {
      return;
    }

    if (this.universityTab === "research") {
      body.replaceChildren(this.renderUniversityResearch());
    } else if (this.universityTab === "library") {
      body.replaceChildren(this.renderUniversityLibrary());
    } else if (this.universityTab === "collection") {
      body.replaceChildren(this.renderUniversityCollection());
    } else {
      body.replaceChildren(this.renderUniversityShop());
    }
  }

  handleUniversityTabsClick(event) {
    const tab = event.target.closest("[data-university-tab]");

    if (!tab) {
      return;
    }

    this.universityTab = tab.dataset.universityTab;
    this.renderUniversity();
  }

  handleUniversityBodyClick(event) {
    const button = event.target.closest("[data-university-action]");

    if (!button || button.disabled) {
      return;
    }

    const action = button.dataset.universityAction;

    if (action === "buy-book") {
      this.buyUniversityBook();
    } else if (action === "buy-cauldron") {
      this.buyUniversityCauldron();
    } else if (action === "buy-map") {
      this.buyUniversityMap();
    } else if (action === "place-cauldron") {
      this.closeUniversity();
      this.startPlacement("cauldron");
    } else if (action === "research") {
      this.researchPotion(button.dataset.universityValue);
    }
  }

  buyUniversityBook() {
    if (this.researchBookOwned) {
      return;
    }

    const costs = { Fe: 4, Cu: 3, piel: 2 };

    if (!this.inventory.has(costs)) {
      this.notify("Faltan recursos para el Libro de recetas.");
      return;
    }

    this.inventory.spend(costs);
    this.researchBookOwned = true;
    this.save();
    this.renderUniversity();
    this.notify("Libro de recetas adquirido. Ya puedes investigar pociones.");
  }

  buyUniversityCauldron() {
    const costs = { piedra: 12, Fe: 2 };

    if (!this.inventory.has(costs)) {
      this.notify("Faltan recursos para el Caldero.");
      return;
    }

    if (this.inventory.addItem("cauldron", 1) <= 0) {
      this.notify("No hay espacio para guardar el Caldero.");
      return;
    }

    this.inventory.spend(costs);
    this.save();
    this.renderUniversity();
    this.notify("Caldero comprado. Puedes colocarlo desde la Universidad.");
  }

  buyUniversityMap() {
    if (this.workerMapBonus >= 7) {
      this.notify("El radio de los duendes ya est\u00E1 al m\u00E1ximo.");
      return;
    }

    const costs = { Cu: 3, piel: 2 };

    if (!this.inventory.has(costs)) {
      this.notify("Faltan recursos para el mapa.");
      return;
    }

    this.inventory.spend(costs);
    this.workerMapBonus += 1;
    this.save();
    this.renderUniversity();
    this.updateWorkerPanel();
    this.notify(
      `Mapa comprado. Radio de auto-tarea: ${WORKER_AUTO_RADIUS + this.workerMapBonus}.`,
    );
  }

  researchPotion(id) {
    const potion = potionById(id);

    if (!potion || !this.researchBookOwned || this.researchedPotions.has(id)) {
      return;
    }

    if (!this.inventory.has(potion.researchCosts)) {
      this.notify("Faltan minerales para investigar esta poci\u00F3n.");
      return;
    }

    this.inventory.spend(potion.researchCosts);
    this.researchedPotions.add(id);
    this.libraryEntries.push({
      id: potion.id,
      name: potion.name,
      description: potion.description,
    });
    this.save();
    this.renderUniversity();
    this.notify(`Investigaci\u00F3n completada: ${potion.name}.`);
  }

  normalizeCraftText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  matchesCraftFilters(recipe) {
    if (
      this.activeCraftCategory !== "all" &&
      recipe.category !== this.activeCraftCategory
    ) {
      return false;
    }

    const query = this.normalizeCraftText(this.craftSearch).trim();

    if (!query) {
      return true;
    }

    return this.normalizeCraftText(
      `${recipe.name} ${recipe.description}`,
    ).includes(query);
  }

  renderCraftTabs() {
    const container = this.hud.craftTabs;

    if (!container) {
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const category of CRAFT_CATEGORIES) {
      const button = document.createElement("button");
      const active = category.id === this.activeCraftCategory;

      button.type = "button";
      button.className = "craft-tab";
      button.dataset.craftCategory = category.id;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(active));
      button.classList.toggle("is-active", active);
      button.textContent = category.label;
      fragment.append(button);
    }

    container.replaceChildren(fragment);
  }

  handleCraftTabsClick(event) {
    const tab = event.target.closest(".craft-tab[data-craft-category]");

    if (!tab) {
      return;
    }

    this.activeCraftCategory = tab.dataset.craftCategory;
    this.renderRecipes();
  }

  handleCraftSearch(event) {
    this.craftSearch = String(event.target.value ?? "");
    this.renderRecipes();
  }

  renderRecipes() {
    const list = this.hud.recipeList;

    if (!list) {
      return;
    }

    this.setStationExtra(null);
    if (this.hud.craftTabs) {
      this.hud.craftTabs.hidden = false;
    }
    if (this.hud.craftSearchWrap) {
      this.hud.craftSearchWrap.hidden = false;
    }
    this.renderCraftTabs();
    const fragment = document.createDocumentFragment();
    const context = this.craftContext();

    for (const recipe of CRAFT_RECIPES) {
      if (!this.matchesCraftFilters(recipe)) {
        continue;
      }

      const state = recipeState(recipe, this.inventory, context);
      const card = document.createElement("article");
      const top = document.createElement("div");
      const name = document.createElement("span");
      const status = document.createElement("span");
      const description = document.createElement("p");
      const costs = document.createElement("div");
      const footer = document.createElement("div");
      const owned = document.createElement("span");
      const buttons = document.createElement("div");
      const action = document.createElement("button");

      card.className = "recipe-card";
      card.dataset.recipeId = recipe.id;
      card.classList.toggle("is-owned", state.owned);

      top.className = "recipe-top";
      name.className = "recipe-name";
      name.textContent = recipe.name;
      status.className = "recipe-status";
      status.textContent = this.recipeStatusText(recipe, state);
      top.append(name, status);

      description.className = "recipe-desc";
      description.textContent = recipe.description;

      costs.className = "recipe-costs";

      for (const [key, amount] of Object.entries(recipe.costs)) {
        const info = RESOURCE_INFO[key];
        const cost = document.createElement("span");
        const dot = document.createElement("span");
        const label = document.createElement("span");

        cost.className = "recipe-cost";
        cost.dataset.resource = key;
        cost.dataset.tooltip = `${info.label}\n${sourceFor("resource", key)}`;
        cost.title = cost.dataset.tooltip;
        cost.style.setProperty("--resource-color", info.color);
        cost.classList.toggle("is-missing", this.inventory.count(key) < amount);

        dot.className = "dot";
        label.textContent = `${info.label} ${amount}`;
        cost.append(dot, label);
        costs.append(cost);
      }

      footer.className = "recipe-footer";
      owned.className = "recipe-owned";
      owned.textContent = this.recipeOwnedText(recipe, state);
      buttons.className = "recipe-buttons";

      action.type = "button";
      action.className = "recipe-action";
      action.dataset.recipe = recipe.id;
      action.disabled = !state.canCraft;
      action.textContent = this.recipeActionText(recipe, state);
      buttons.append(action);

      if (recipe.type === "placeable") {
        const place = document.createElement("button");
        place.type = "button";
        place.className = "recipe-action recipe-place";
        place.dataset.place = recipe.item;
        place.disabled = state.count <= 0;
        place.textContent = `Colocar ×${state.count}`;
        buttons.append(place);
      }

      footer.append(owned, buttons);
      card.append(top, description, costs, footer);
      fragment.append(card);
    }

    if (fragment.childNodes.length === 0) {
      const empty = document.createElement("p");
      empty.className = "recipe-empty";
      empty.textContent = "No hay recetas que coincidan con la búsqueda.";
      fragment.append(empty);
    }

    list.replaceChildren(fragment);
  }

  recipeStatusText(recipe, state) {
    if (state.owned) {
      return "Fabricada";
    }
    if (state.locked) {
      return "Misión de lobos";
    }
    if (state.limit) {
      return "Máximo";
    }
    if (recipe.type === "placeable") {
      return state.count > 0 ? `×${state.count}` : "Colocable";
    }
    if (recipe.type === "worker") {
      return state.affordable ? "Disponible" : "Faltan recursos";
    }
    return state.affordable ? "Lista" : "Faltan recursos";
  }

  recipeOwnedText(recipe, state) {
    if (state.owned) {
      return "Ya la tienes";
    }
    if (state.locked) {
      return "Completa la Cueva de lobos";
    }
    if (recipe.type === "placeable") {
      return `En mochila: ${state.count}`;
    }
    if (recipe.type === "worker") {
      return `Duendes: ${state.workerCount}/${recipe.maxWorkers ?? MAX_WORKERS}`;
    }
    return "Consume recursos";
  }

  recipeActionText(recipe, state) {
    if (state.owned) {
      return "Fabricada";
    }
    if (state.locked) {
      return "Bloqueada";
    }
    if (state.limit) {
      return "Máximo";
    }
    if (!state.canCraft) {
      return "Faltan recursos";
    }
    return recipe.type === "worker" ? "Invocar" : "Fabricar";
  }

  awardCraftXp(recipe) {
    const previousLevel = craftLevelForXp(this.craftXp);
    this.craftXp += craftXpReward(recipe);
    this.craftLevel = craftLevelForXp(this.craftXp);
    this.renderCraftProgress();

    if (this.craftLevel > previousLevel) {
      this.hud.btnCraft?.classList.add("craft-level-up");
      window.setTimeout(() => {
        this.hud.btnCraft?.classList.remove("craft-level-up");
      }, 900);
      this.notify(
        `¡Artesano nivel ${this.craftLevel}! Nuevas metas de crafteo desbloqueadas.`,
      );
    }
  }

  renderCraftProgress() {
    const progress = craftLevelProgress(this.craftXp);

    if (this.hud.craftLevel) {
      this.hud.craftLevel.textContent = `Artesano · nivel ${progress.level}`;
    }
    if (this.hud.craftXpLabel) {
      this.hud.craftXpLabel.textContent = `${progress.current}/${progress.needed} XP`;
    }
    if (this.hud.craftXpFill) {
      this.hud.craftXpFill.style.width = `${progress.percent}%`;
    }
  }

  craftContext() {
    return {
      workerCount: this.getWorkerIds().length,
      wolfMissionComplete: this.wolfMission.completed === true,
    };
  }

  renderStationRecipes() {
    const list = this.hud.recipeList;
    const station = this.activeStation;

    if (!list || !station) {
      return;
    }

    if (this.hud.craftTabs) {
      this.hud.craftTabs.hidden = true;
    }
    if (this.hud.craftSearchWrap) {
      this.hud.craftSearchWrap.hidden = true;
    }

    const fragment = document.createDocumentFragment();
    let recipes = stationRecipes(station.type);

    if (station.type === STATION_TYPES.CAULDRON) {
      recipes = recipes.filter((recipe) =>
        recipe.id === "moonBrew"
          ? this.observationNotes.size > 0
          : this.researchBookOwned && this.researchedPotions.has(recipe.id),
      );
    }

    for (const recipe of recipes) {
      const state = stationRecipeState(recipe, this.inventory, {
        moonPhase: this.moonPhase().id,
        observationIds: [...this.observationNotes],
      });
      const card = document.createElement("article");
      const top = document.createElement("div");
      const name = document.createElement("span");
      const status = document.createElement("span");
      const description = document.createElement("p");
      const costs = document.createElement("div");
      const footer = document.createElement("div");
      const result = document.createElement("span");
      const action = document.createElement("button");

      card.className = "recipe-card";
      card.dataset.stationRecipeId = recipe.id;

      top.className = "recipe-top";
      name.className = "recipe-name";
      name.textContent = recipe.name;
      status.className = "recipe-status";
      status.textContent = state.needsObservation
        ? "Falta un apunte de observación"
        : state.moonLocked
          ? `Solo ${this.moonRequirementText(recipe)}`
          : state.canCraft
            ? "Disponible"
            : "Faltan recursos";
      top.append(name, status);

      description.className = "recipe-desc";
      description.textContent = recipe.description;

      costs.className = "recipe-costs";

      for (const [key, amount] of Object.entries(recipe.costs.resources)) {
        const info = RESOURCE_INFO[key];
        const cost = document.createElement("span");
        const dot = document.createElement("span");
        const label = document.createElement("span");

        cost.className = "recipe-cost";
        cost.dataset.costType = "resource";
        cost.dataset.costKey = key;
        cost.dataset.tooltip = `${info.label}\n${sourceFor("resource", key)}`;
        cost.title = cost.dataset.tooltip;
        cost.style.setProperty("--resource-color", info.color);
        cost.classList.toggle("is-missing", this.inventory.count(key) < amount);
        dot.className = "dot";
        label.textContent = `${info.label} ${amount}`;
        cost.append(dot, label);
        costs.append(cost);
      }

      for (const [key, amount] of Object.entries(recipe.costs.items)) {
        const cost = document.createElement("span");
        const dot = document.createElement("span");
        const label = document.createElement("span");

        cost.className = "recipe-cost";
        cost.dataset.costType = "item";
        cost.dataset.costKey = key;
        cost.dataset.tooltip = `${ITEM_INFO[key]?.label ?? key}\n${sourceFor("item", key)}`;
        cost.title = cost.dataset.tooltip;
        cost.style.setProperty("--resource-color", "#c9a36a");
        cost.classList.toggle("is-missing", this.inventory.itemCount(key) < amount);
        dot.className = "dot";
        label.textContent = `${ITEM_INFO[key]?.label ?? key} ${amount}`;
        cost.append(dot, label);
        costs.append(cost);
      }

      footer.className = "recipe-footer";
      result.className = "recipe-owned";
      result.textContent = `Resultado: ${recipe.outputs
        .map((output) => `${output.amount} ${ITEM_INFO[output.item]?.label ?? output.item}`)
        .join(" · ")}`;

      action.type = "button";
      action.className = "recipe-action station-recipe-action";
      action.dataset.stationRecipe = recipe.id;
      action.disabled = !state.canCraft;
      action.textContent = state.moonLocked
        ? "Fase incorrecta"
        : state.canCraft
          ? recipe.action
          : "Faltan recursos";

      footer.append(result, action);
      card.append(top, description, costs, footer);
      fragment.append(card);
    }

    if (fragment.childNodes.length === 0) {
      const empty = document.createElement("p");
      empty.className = "recipe-empty";
      empty.textContent = this.researchBookOwned
        ? "No hay pociones investigadas todavía. Ve a la Universidad."
        : "Necesitas el Libro de recetas de la Universidad.";
      fragment.append(empty);
    }

    list.replaceChildren(fragment);

    if (station.type === STATION_TYPES.BREWING_TABLE) {
      this.setStationExtra(this.renderStoneComposition());
    } else {
      this.setStationExtra(null);
    }
  }

  renderStoneComposition() {
    const container = document.createElement("div");
    const title = document.createElement("div");
    const hint = document.createElement("p");
    const vector = document.createElement("div");
    const totals = {};

    container.className = "station-extra-card";
    title.className = "station-extra-title";
    title.textContent = `Piedras químicas · ${this.stonePouch.length}/${MAX_STONES}`;
    hint.className = "station-extra-hint";
    vector.className = "chemistry-vector";

    for (const stone of this.stonePouch) {
      for (const [key, amount] of Object.entries(stone.chemistry)) {
        totals[key] = (totals[key] ?? 0) + amount;
      }
    }

    if (Object.keys(totals).length === 0) {
      hint.textContent = "Aún no has levantado piedras químicas. Mina nodos minerales para conseguirlas.";
    } else {
      hint.textContent = "Suma de la composición de tu mochila de piedras:";

      for (const [key, amount] of Object.entries(totals)) {
        const chip = document.createElement("span");
        const dot = document.createElement("span");
        const label = document.createElement("span");

        chip.className = "chemistry-chip";
        chip.style.setProperty("--resource-color", RESOURCE_INFO[key]?.color ?? "#8b929b");
        dot.className = "dot";
        label.textContent = `${RESOURCE_INFO[key]?.label ?? key} ${amount}`;
        chip.append(dot, label);
        vector.append(chip);
      }
    }

    container.append(title, hint, vector);
    return container;
  }

  setStationExtra(content) {
    const extra = this.hud.stationExtra;

    if (!extra) {
      return;
    }

    extra.replaceChildren();

    if (!content) {
      extra.hidden = true;
      return;
    }

    extra.hidden = false;
    extra.append(content);
  }

  refreshStationRecipeStates() {
    if (!this.activeStation || !this.hud.recipeList) {
      return;
    }

    for (const card of this.hud.recipeList.children) {
      const recipe = stationRecipeById(card.dataset.stationRecipeId);

      if (!recipe) {
        continue;
      }

      const state = stationRecipeState(recipe, this.inventory, {
        moonPhase: this.moonPhase().id,
        observationIds: [...this.observationNotes],
      });
      const status = card.querySelector(".recipe-status");
      if (status) {
        status.textContent = state.needsObservation
          ? "Falta un apunte de observación"
          : state.moonLocked
            ? `Solo ${this.moonRequirementText(recipe)}`
            : state.canCraft
              ? "Disponible"
              : "Faltan recursos";
      }

      for (const cost of card.querySelectorAll(".recipe-cost")) {
        const key = cost.dataset.costKey;
        const type = cost.dataset.costType;
        const amount = type === "item"
          ? recipe.costs.items[key]
          : recipe.costs.resources[key];
        const available = type === "item"
          ? this.inventory.itemCount(key)
          : this.inventory.count(key);
        cost.classList.toggle("is-missing", available < amount);
      }

      const action = card.querySelector(".station-recipe-action");
      if (action) {
        action.disabled = !state.canCraft;
        action.textContent = state.needsObservation
          ? "Falta apunte"
          : state.moonLocked
            ? "Fase incorrecta"
            : state.canCraft
              ? recipe.action
              : "Faltan recursos";
      }
    }

    if (this.activeStation.type === STATION_TYPES.BREWING_TABLE) {
      this.setStationExtra(this.renderStoneComposition());
    }
  }

  craftAtStation(recipeId) {
    const result = craftStationRecipe(recipeId, this.inventory, {
      moonPhase: this.moonPhase().id,
      observationIds: [...this.observationNotes],
    });

    if (!result.ok) {
      this.notify(
        result.reason === "moon"
          ? "La fase lunar no es la correcta."
          : result.reason === "observation"
            ? "Necesitas un apunte de observación del observatorio."
            : "Faltan ingredientes para prepararlo.",
      );
      return;
    }

    const recipe = result.recipe;
    this.awardCraftXp(recipe);
    this.updateHud();
    this.save();
    this.effects.addText(recipe.name, this.playerTransform.x, this.playerTransform.y, {
      color: "#e0a458",
    });

    if (recipe.id === "moonBrew") {
      const output = result.outputs?.[0]?.item;
      this.notify(
        output === "moonHealingPotion"
          ? "Luna llena: el brebaje se ha vuelto curativo."
          : "Luna nueva: el brebaje se ha vuelto sombrío.",
      );
    } else if (recipe.id === "coffee") {
      this.notify("Café preparado. Pulsa 1 para beberlo.");
    } else {
      this.notify(`${recipe.name} listas.`);
    }
  }

  refreshRecipeStates() {
    if (!this.craftingOpen || !this.hud.recipeList) {
      return;
    }

    if (this.activeStation) {
      this.refreshStationRecipeStates();
      return;
    }

    const context = this.craftContext();

    for (const card of this.hud.recipeList.children) {
      const recipe = recipeById(card.dataset.recipeId);

      if (!recipe) {
        continue;
      }

      const state = recipeState(recipe, this.inventory, context);
      card.classList.toggle("is-owned", state.owned);

      const status = card.querySelector(".recipe-status");
      if (status) {
        status.textContent = this.recipeStatusText(recipe, state);
      }

      for (const cost of card.querySelectorAll(".recipe-cost")) {
        const key = cost.dataset.resource;
        cost.classList.toggle("is-missing", this.inventory.count(key) < recipe.costs[key]);
      }

      const owned = card.querySelector(".recipe-owned");
      if (owned) {
        owned.textContent = this.recipeOwnedText(recipe, state);
      }

      const action = card.querySelector(".recipe-action");
      if (action) {
        action.disabled = !state.canCraft;
        action.textContent = this.recipeActionText(recipe, state);
      }

      const place = card.querySelector(".recipe-place");
      if (place) {
        place.disabled = state.count <= 0;
        place.textContent = `Colocar ×${state.count}`;
      }
    }
  }

  handleRecipeListClick(event) {
    const place = event.target.closest(".recipe-place");
    if (place && !place.disabled) {
      this.startPlacement(place.dataset.place);
      return;
    }

    const stationAction = event.target.closest(".station-recipe-action");
    if (stationAction && !stationAction.disabled) {
      this.craftAtStation(stationAction.dataset.stationRecipe);
      return;
    }

    const button = event.target.closest(".recipe-action");

    if (!button || button.disabled) {
      return;
    }

    this.craftRecipe(button.dataset.recipe);
  }

  craftRecipe(id) {
    const result = craftRecipe(id, this.inventory, this.craftContext());

    if (!result.ok) {
      if (result.reason === "owned") {
        this.notify("Ya tienes esa mejora.");
      } else if (result.reason === "limit") {
        this.notify(`Ya tienes el máximo de duendes (${MAX_WORKERS}).`);
      } else if (result.reason === "resources") {
        this.notify("Faltan recursos para fabricarlo.");
      } else if (result.reason === "locked") {
        this.notify("Completa la misión de la Cueva de lobos para desbloquearlo.");
      }
      return;
    }

    const recipe = result.recipe;
    this.awardCraftXp(recipe);

    if (recipe.type === "worker") {
      this.spawnWorker({ silent: false });
      this.save();
      return;
    }

    this.updateHud();
    this.save();
    this.effects.addText(recipe.name, this.playerTransform.x, this.playerTransform.y, {
      color: "#f0c07a",
    });

    if (recipe.type === "placeable") {
      this.notify(`${recipe.name} fabricada. Elige dónde colocarla.`);
      this.startPlacement(recipe.item);
      return;
    }

    if (recipe.type === "upgrade") {
      this.updateWorkerPanel();
      if (recipe.upgrade === "veinRestorer") {
        this.notify(
          `${recipe.name} fabricado. Selecciona un duende y pulsa Restaurar veta.`,
        );
      } else {
        this.notify(`${recipe.name} fabricada. Capacidad: ${this.inventory.capacity}.`);
      }
    } else {
      this.notify(`${recipe.name} fabricada.`);
    }
  }

  updatePlaceButton() {
    const button = this.hud.btnPlaceFire;

    if (!button) {
      return;
    }

    const count = this.inventory.itemCount("campfire");
    const placingCampfire = this.placingItem === "campfire";
    button.hidden = !placingCampfire && count <= 0;
    button.classList.toggle("is-active", placingCampfire);

    if (placingCampfire) {
      button.innerHTML = "Cancelar <kbd>F</kbd>";
    } else {
      button.innerHTML =
        count > 1 ? `Fogata <kbd>F</kbd> ×${count}` : "Fogata <kbd>F</kbd>";
    }
  }

  handlePlaceRequest() {
    if (this.placingItem) {
      this.cancelPlacement();
      this.notify("Colocación cancelada.");
      return;
    }

    if (this.inventory.itemCount("campfire") <= 0) {
      this.notify("No tienes fogatas. Fabrica una en Crafteo (C).");
      return;
    }

    this.startPlacement("campfire");
  }

  startPlacement(itemId) {
    if (this.inventory.itemCount(itemId) <= 0) {
      this.notify(`No tienes ${ITEM_INFO[itemId]?.label ?? "ese objeto"}.`);
      return;
    }

    this.closeCrafting();
    this.selectedHotbar = { kind: "item", key: itemId };
    this.renderInventoryHud();
    this.placingItem = itemId;
    this.lastPaintTile = null;
    this.canvas.classList.add("is-placing");
    this.updatePlaceButton();
    this.notify(
      itemId === "stonePath"
        ? "Haz clic o arrastra sobre el suelo para pintar el camino. Clic derecho para terminar."
        : `Haz clic en el suelo para colocar ${ITEM_INFO[itemId]?.label ?? "el objeto"}. Clic derecho para cancelar.`,
    );
  }

  cancelPlacement() {
    this.placingItem = null;
    this.lastPaintTile = null;
    this.canvas.classList.remove("is-placing");
    this.updatePlaceButton();
  }

  isStonePathAt(tileX, tileY) {
    return this.stonePaths.some(
      (path) => Math.floor(path.x) === tileX && Math.floor(path.y) === tileY,
    );
  }

  getPlacementStatus(itemId, tileX, tileY) {
    const centerX = tileX + 0.5;
    const centerY = tileY + 0.5;
    const transform = this.playerTransform;
    const distance = Math.hypot(centerX - transform.x, centerY - transform.y);

    if (itemId === "stonePath") {
      if (distance > STONE_PATH_PLACE_RANGE) {
        return { ok: false, reason: "Demasiado lejos.", centerX, centerY };
      }
      if (this.world.biomeAt(tileX, tileY) === BIOME.WATER) {
        return { ok: false, reason: "No puedes poner un camino sobre el agua.", centerX, centerY };
      }
      if (this.isStructureAt(tileX, tileY) || this.getFarmPlotAt(tileX, tileY)) {
        return { ok: false, reason: "Hay algo construido en esa casilla.", centerX, centerY };
      }
      if (this.isStonePathAt(tileX, tileY)) {
        return { ok: false, reason: "Ya hay un camino aquí.", centerX, centerY };
      }
      if (!this.isActorWalkableAt(tileX, tileY)) {
        return { ok: false, reason: "No se puede colocar ahí.", centerX, centerY };
      }
      return { ok: true, reason: "", centerX, centerY };
    }

    if (distance < CAMPFIRE_MIN_DISTANCE) {
      return { ok: false, reason: "Demasiado cerca. Busca un poco de espacio.", centerX, centerY };
    }
    if (distance > CAMPFIRE_PLACE_RANGE) {
      return { ok: false, reason: "Demasiado lejos. Acércate un poco.", centerX, centerY };
    }
    if (!this.isActorWalkableAt(tileX, tileY)) {
      return { ok: false, reason: "No se puede colocar ahí.", centerX, centerY };
    }
    if (this.isStructureAt(tileX, tileY)) {
      return { ok: false, reason: "Ya hay algo construido aquí.", centerX, centerY };
    }

    return { ok: true, reason: "", centerX, centerY };
  }

  getTerrainStatus(action, tileX, tileY, selected) {
    const transform = this.playerTransform;
    const distance = Math.hypot(
      tileX + 0.5 - transform.x,
      tileY + 0.5 - transform.y,
    );

    if (action === "raise") {
      if (distance > 4) {
        return { ok: false, reason: "Acércate para colocar el bloque." };
      }
      if (this.world.biomeAt(tileX, tileY) === BIOME.WATER) {
        return { ok: false, reason: "No puedes colocar bloques sobre el agua." };
      }
      if (this.isStructureAt(tileX, tileY) || this.getFarmPlotAt(tileX, tileY)) {
        return { ok: false, reason: "Hay algo construido en esa casilla." };
      }
      if (this.world.heightAt(tileX, tileY) >= 8) {
        return { ok: false, reason: "Esta columna ya está al máximo." };
      }
      if (!selected || this.inventory.count(selected.key) <= 0) {
        return { ok: false, reason: "No tienes ese material." };
      }
      return { ok: true, reason: "" };
    }

    if (distance > 4) {
      return { ok: false, reason: "Acércate para excavar." };
    }
    if (this.world.biomeAt(tileX, tileY) === BIOME.WATER) {
      return { ok: false, reason: "No puedes excavar directamente en el agua." };
    }
    if (this.isStructureAt(tileX, tileY) || this.getFarmPlotAt(tileX, tileY)) {
      return { ok: false, reason: "No puedes excavar debajo de una construcción." };
    }
    if (this.world.heightAt(tileX, tileY) <= -70) {
      return { ok: false, reason: "Esta columna ya está en el fondo (-70)." };
    }

    const material =
      this.world.biomeAt(tileX, tileY) === BIOME.ROCK ||
      this.world.biomeAt(tileX, tileY) === BIOME.SNOW
        ? "piedra"
        : "tierra";

    if (this.inventory.canAdd(material, 1) <= 0) {
      return { ok: false, reason: "Inventario lleno." };
    }

    return { ok: true, reason: "" };
  }

  isStructureAt(tileX, tileY) {
    const universityBlocked =
      this.university &&
      Math.floor(this.university.x) === tileX &&
      Math.floor(this.university.y) === tileY;
    const observatoryBlocked =
      this.observatory &&
      Math.floor(this.observatory.x) === tileX &&
      Math.floor(this.observatory.y) === tileY;
    const wolfDenBlocked =
      this.wolfDen &&
      Math.floor(this.wolfDen.x) === tileX &&
      Math.floor(this.wolfDen.y) === tileY;

    return (
      universityBlocked ||
      observatoryBlocked ||
      wolfDenBlocked ||
      [
        ...this.campfires,
        ...this.ovens,
        ...this.brewingTables,
        ...this.chests,
        ...this.tipis,
        ...this.fences,
        ...this.torches,
        ...this.walls,
        ...this.beds,
        ...this.cauldrons,
        ...this.wolfTotems,
      ].some(
        (item) => Math.floor(item.x) === tileX && Math.floor(item.y) === tileY,
      )
    );
  }

  isFenceAt(x, y) {
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    const universityBlocked =
      this.university &&
      Math.floor(this.university.x) === tileX &&
      Math.floor(this.university.y) === tileY;
    const observatoryBlocked =
      this.observatory &&
      Math.floor(this.observatory.x) === tileX &&
      Math.floor(this.observatory.y) === tileY;

    return (
      universityBlocked ||
      observatoryBlocked ||
      [...this.fences, ...this.walls].some(
        (barrier) =>
          Math.floor(barrier.x) === tileX && Math.floor(barrier.y) === tileY,
      )
    );
  }

  isActorWalkableAt(x, y) {
    return (
      this.world["isActorWalkableAt"](x, y) &&
      !this.isFenceAt(x, y)
    );
  }

  isPlayerWalkableAt(x, y) {
    const feetHeight =
      this.playerGroundHeight + this.playerVerticalOffset;
    const nextHeight = this.world.heightAt(x, y);
    const maxRise = this.playerAirborne ? 0.05 : 1.01;

    if (nextHeight > feetHeight + maxRise) {
      return false;
    }

    if (
      this.swimRemaining > 0 &&
      this.world.biomeAt(x, y) === BIOME.WATER
    ) {
      return !this.world.isBlockedAt(x, y) && !this.isFenceAt(x, y);
    }

    return this.isActorWalkableAt(x, y);
  }

  isSwimming() {
    const transform = this.playerTransform;
    return (
      this.swimRemaining > 0 &&
      this.world.biomeAt(transform.x, transform.y) === BIOME.WATER
    );
  }

  emergencyShore() {
    const transform = this.playerTransform;
    const tileX = Math.floor(transform.x);
    const tileY = Math.floor(transform.y);

    for (let radius = 1; radius <= 24; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) {
            continue;
          }

          const x = tileX + dx;
          const y = tileY + dy;

          if (this.isActorWalkableAt(x, y)) {
            transform.x = x + 0.5;
            transform.y = y + 0.5;
            this.resetPlayerVertical();
            this.cameraFollow = true;
            this.notify("La poción de nado terminó y llegaste a la orilla.");
            return;
          }
        }
      }
    }

    const spawn = this.spawnPoint ?? this.world.findSpawn();
    transform.x = spawn.x;
    transform.y = spawn.y;
    this.resetPlayerVertical();
    this.cameraFollow = true;
    this.notify("La poción de nado terminó. Regresaste al campamento.");
  }

  tryPlaceStructure(screenX, screenY, targetTile = null, { silent = false } = {}) {
    const itemId = this.placingItem;

    if (!itemId) {
      return false;
    }

    const target = targetTile ?? this.tileAtScreen(screenX, screenY);
    const tileX = target.x;
    const tileY = target.y;
    const status = this.getPlacementStatus(itemId, tileX, tileY);

    if (!status.ok) {
      if (!silent) {
        this.notify(status.reason);
      }
      return false;
    }

    const centerX = status.centerX;
    const centerY = status.centerY;

    if (this.inventory.removeItem(itemId, 1) <= 0) {
      this.cancelPlacement();
      return false;
    }

    if (itemId === "stonePath") {
      this.stonePaths.push({ x: centerX, y: centerY });
    } else if (itemId === "campfire") {
      this.campfires.push({ x: centerX, y: centerY });
    } else if (itemId === "oven") {
      this.ovens.push({ x: centerX, y: centerY });
    } else if (itemId === "brewingTable") {
      this.brewingTables.push({ x: centerX, y: centerY });
    } else if (itemId === "chest") {
      this.chests.push({
        x: centerX,
        y: centerY,
        inventory: new Inventory({ capacity: CHEST_CAPACITY }),
      });
    } else if (itemId === "tipi") {
      this.tipis.push({ x: centerX, y: centerY });
    } else if (itemId === "valla") {
      this.fences.push({ x: centerX, y: centerY });
    } else if (itemId === "torch") {
      this.torches.push({
        x: centerX,
        y: centerY,
        z: this.world.heightAt(tileX, tileY),
      });
    } else if (itemId === "stoneWall") {
      this.walls.push({ x: centerX, y: centerY });
    } else if (itemId === "bed") {
      this.beds.push({ x: centerX, y: centerY });
    } else if (itemId === "cauldron") {
      this.cauldrons.push({ x: centerX, y: centerY });
    } else if (itemId === "wolfTotem") {
      this.wolfTotems.push({ x: centerX, y: centerY });
    }

    this.network?.sendStructure(
      itemId,
      centerX,
      centerY,
      itemId === "torch" ? this.world.heightAt(tileX, tileY) : null,
    );

    this.updateHud();
    this.save();
    this.clearPointerHover();

    if (itemId === "stonePath") {
      if (this.inventory.itemCount("stonePath") <= 0) {
        this.cancelPlacement();
      }
      if (!silent) {
        this.effects.addText(
          ITEM_INFO[itemId]?.label ?? "Camino",
          centerX,
          centerY,
          { color: "#c9b9a3" },
        );
      }
      return true;
    }

    const label = ITEM_INFO[itemId]?.label ?? "Objeto";
    this.cancelPlacement();
    this.effects.addText(label, centerX, centerY, { color: "#f0c07a" });

    if (itemId === "campfire") {
      this.notify("Fogata colocada. La energía se recupera más rápido cerca.");
    } else {
      this.notify(`${label}: construcción colocada.`);
    }
    return true;
  }

  tryPlaceSelectedAt(screenX, screenY, selected, targetTile = null) {
    if (selected?.kind !== "item" || !PLACEABLE_ITEM_KEYS.has(selected.key)) {
      return false;
    }

    const itemId = selected.key;
    this.placingItem = itemId;
    this.canvas.classList.add("is-placing");
    this.tryPlaceStructure(screenX, screenY, targetTile);
    this.placingItem = null;
    this.canvas.classList.remove("is-placing");
    this.updatePlaceButton();
    return true;
  }

  handlePlaceSelected() {
    const selected = this.getSelectedEntry();

    if (this.placingItem) {
      this.cancelPlacement();
      this.notify("Colocación cancelada.");
      return;
    }

    if (selected?.kind === "item" && PLACEABLE_ITEM_KEYS.has(selected.key)) {
      this.startPlacement(selected.key);
      return;
    }

    this.notify("Selecciona un objeto colocable para usar Colocar.");
  }

  isNearCampfire(transform) {
    if (this.campfires.length === 0) {
      return false;
    }

    const maxDistanceSq = CAMPFIRE_RADIUS * CAMPFIRE_RADIUS;

    return this.campfires.some((fire) => {
      const dx = fire.x - transform.x;
      const dy = fire.y - transform.y;
      return dx * dx + dy * dy <= maxDistanceSq;
    });
  }

  isPlayerSheltered() {
    if (this.tipis.length === 0) {
      return false;
    }

    const transform = this.playerTransform;
    const maxDistanceSq = TIPI_SAFE_RADIUS * TIPI_SAFE_RADIUS;

    return this.tipis.some((tipi) => {
      const dx = tipi.x - transform.x;
      const dy = tipi.y - transform.y;
      return dx * dx + dy * dy <= maxDistanceSq;
    });
  }

  commandGather(kind, x, y) {
    const node = this.world.getNodeAt(kind, x, y);

    if (!node) {
      this.notify("Ese recurso ya no está.");
      return;
    }

    const gather = this.ecs.getComponent(this.playerId, Component.GATHER);

    if (gather && gather.kind === kind && gather.x === x && gather.y === y) {
      return;
    }

    const transform = this.playerTransform;
    this.cameraFollow = true;
    this.cancelPlayerAction();

    if (this.distanceToNode(node, transform) <= GATHER_RANGE) {
      this.tryStartGather(kind, x, y);
      return;
    }

    const candidates = adjacentTiles(x, y)
      .filter((tile) => this.isPlayerWalkableAt(tile.x, tile.y))
      .map((tile) => ({
        ...tile,
        distance: Math.hypot(tile.x + 0.5 - transform.x, tile.y + 0.5 - transform.y),
      }))
      .sort((a, b) => a.distance - b.distance);

    for (const tile of candidates) {
      const path = findPath({
        startX: Math.floor(transform.x),
        startY: Math.floor(transform.y),
        goalX: tile.x,
        goalY: tile.y,
        isWalkable: (worldX, worldY) => this.isPlayerWalkableAt(worldX, worldY),
        getHeight: (worldX, worldY) => this.world.heightAt(worldX, worldY),
        maxStepHeight: 1,
        maxNodes: PATH_MAX_NODES,
      });

      if (path === null) {
        continue;
      }

      if (path.length === 0) {
        this.tryStartGather(kind, x, y, { fromPath: true });
      } else {
        this.setPlayerPath(path, { type: "gather", kind, x, y });
      }
      return;
    }

    this.notify("No hay camino hasta ese recurso.");
  }

  tryStartGather(kind, x, y, { fromPath = false } = {}) {
    const node = this.world.getNodeAt(kind, x, y);

    if (!node) {
      if (fromPath) {
        this.notify("El recurso ya no está disponible.");
      }
      return false;
    }

    const transform = this.playerTransform;
    const energy = this.playerEnergy;

    if (this.distanceToNode(node, transform) > GATHER_RANGE + 0.35) {
      if (!fromPath) {
        this.commandGather(kind, x, y);
      }
      return false;
    }

    const current = this.ecs.getComponent(this.playerId, Component.GATHER);
    if (current && current.kind === kind && current.x === x && current.y === y) {
      return true;
    }

    const yields = harvestYields(kind, node, this.inventory.tools);

    if (!this.inventory.canAddAll(yields)) {
      this.notify("Inventario lleno.");
      return false;
    }

    if (energy.current < harvestEnergyCost(kind)) {
      this.notify("Estás sin energía. Espera a recuperarte.");
      return false;
    }

    this.ecs.removeComponent(this.playerId, Component.PATH);
    this.ecs.removeComponent(this.playerId, Component.GATHER);
    this.ecs.addComponent(this.playerId, Component.GATHER, {
      kind,
      x,
      y,
      duration:
        gatherDuration(kind, this.inventory.tools) *
        scienceModifiers(this.sciencePoints).gatherMultiplier,
      elapsed: 0,
      active: true,
    });

    const motion = this.playerMotion;
    motion.moving = false;
    energy.paused = true;

    const screenDelta = node.worldX - transform.x - (node.worldY - transform.y);
    if (Math.abs(screenDelta) > 0.01) {
      motion.facing = screenDelta > 0 ? 1 : -1;
    }

    return true;
  }

  completeGather(gather) {
    const node = this.world.getNodeAt(gather.kind, gather.x, gather.y);

    if (!node) {
      this.ecs.removeComponent(this.playerId, Component.GATHER);
      this.playerEnergy.paused = false;
      return;
    }

    const transform = this.playerTransform;

    if (this.distanceToNode(node, transform) > GATHER_RANGE + 0.35) {
      this.ecs.removeComponent(this.playerId, Component.GATHER);
      this.playerEnergy.paused = false;
      return;
    }

    const yields = harvestYields(gather.kind, node, this.inventory.tools);

    if (!this.inventory.canAddAll(yields)) {
      this.ecs.removeComponent(this.playerId, Component.GATHER);
      this.playerEnergy.paused = false;
      this.notify("Inventario lleno.");
      return;
    }

    const harvested = this.world.harvestNode(gather.kind, gather.x, gather.y);

    if (!harvested) {
      this.ecs.removeComponent(this.playerId, Component.GATHER);
      this.playerEnergy.paused = false;
      return;
    }

    if (harvested.kind === "mineral") {
      this.collectChemicalStone(harvested);
    }
    this.network?.sendHarvest(gather.kind, gather.x, gather.y);

    for (const [key, amount] of Object.entries(yields)) {
      this.inventory.add(key, amount);
    }

    const energy = this.playerEnergy;
    energy.current = Math.max(0, energy.current - harvestEnergyCost(gather.kind));
    energy.paused = false;
    energy.regenDelay = 1.5;
    this.ecs.removeComponent(this.playerId, Component.GATHER);

    const text = Object.entries(yields)
      .map(([key, amount]) => `+${amount} ${RESOURCE_INFO[key]?.label ?? key}`)
      .join(" · ");
    this.effects.addText(text, node.worldX, node.worldY);

    this.updateHud();
  }

  cancelWorkerTask(workerId, { silent = false } = {}) {
    const worker = this.ecs.getComponent(workerId, Component.WORKER);

    if (!worker) {
      return false;
    }

    const hadTask =
      Boolean(worker.task) ||
      this.ecs.hasComponent(workerId, Component.PATH) ||
      this.ecs.hasComponent(workerId, Component.GATHER);

    this.ecs.removeComponent(workerId, Component.PATH);
    this.ecs.removeComponent(workerId, Component.GATHER);
    const motion = this.ecs.getComponent(workerId, Component.MOTION);
    if (motion) {
      motion.moving = false;
    }
    worker.state = "idle";
    worker.task = null;
    this.updateWorkerPanel();

    if (hadTask && !silent) {
      this.notify(`${worker.name} dejó la tarea.`);
    }

    return hadTask;
  }

  setWorkerPath(workerId, path, intent, state) {
    const worker = this.ecs.getComponent(workerId, Component.WORKER);
    const motion = this.ecs.getComponent(workerId, Component.MOTION);

    this.ecs.removeComponent(workerId, Component.GATHER);
    this.ecs.addComponent(workerId, Component.PATH, {
      waypoints: pathToCenters(path),
      index: 0,
      intent,
    });
    worker.state = state;
    motion.moving = true;
    this.updateWorkerPanel();
  }

  commandWorkerGather(workerId, kind, x, y, { silent = false } = {}) {
    const worker = this.ecs.getComponent(workerId, Component.WORKER);
    const node = this.world.getNodeAt(kind, x, y);

    if (!worker) {
      return false;
    }

    if (!node) {
      if (!silent) {
        this.notify("Ese recurso ya no está.");
      }
      return false;
    }

    if (worker.task?.kind === kind && worker.task?.x === x && worker.task?.y === y) {
      return true;
    }

    this.cancelWorkerTask(workerId, { silent: true });
    worker.task = { kind, x, y };

    const transform = this.ecs.getComponent(workerId, Component.TRANSFORM);

    if (this.distanceToNode(node, transform) <= GATHER_RANGE) {
      return this.tryStartWorkerGather(workerId, kind, x, y, { silent });
    }

    const candidates = adjacentTiles(x, y)
      .filter((tile) => this.isActorWalkableAt(tile.x, tile.y))
      .map((tile) => ({
        ...tile,
        distance: Math.hypot(tile.x + 0.5 - transform.x, tile.y + 0.5 - transform.y),
      }))
      .sort((a, b) => a.distance - b.distance);

    for (const tile of candidates) {
      const path = findPath({
        startX: Math.floor(transform.x),
        startY: Math.floor(transform.y),
        goalX: tile.x,
        goalY: tile.y,
        isWalkable: (worldX, worldY) => this.isActorWalkableAt(worldX, worldY),
        maxNodes: PATH_MAX_NODES,
      });

      if (path === null) {
        continue;
      }

      if (path.length === 0) {
        return this.tryStartWorkerGather(workerId, kind, x, y, { silent });
      }

      this.setWorkerPath(workerId, path, { type: "worker-gather", kind, x, y }, "seeking");
      return true;
    }

    worker.state = "idle";
    worker.task = null;
    this.updateWorkerPanel();

    if (!silent) {
      this.notify(`${worker.name} no puede llegar a ese recurso.`);
    }

    return false;
  }

  commandWorkerRestore(workerId, x, y, { silent = false } = {}) {
    const worker = this.ecs.getComponent(workerId, Component.WORKER);

    if (!worker) {
      return false;
    }

    if (!this.inventory.hasUpgrade("veinRestorer")) {
      if (!silent) {
        this.notify("Necesitas el Restaurador de vetas.");
      }
      return false;
    }

    if (!this.world.isHarvested("mineral", x, y)) {
      if (!silent) {
        this.notify("Esa veta no está agotada.");
      }
      return false;
    }

    if (this.isStructureAt(x, y) || this.getFarmPlotAt(x, y)) {
      if (!silent) {
        this.notify("Hay una construcción sobre esa veta.");
      }
      return false;
    }

    if (
      worker.task?.kind === "restore" &&
      worker.task?.x === x &&
      worker.task?.y === y
    ) {
      return true;
    }

    this.cancelWorkerTask(workerId, { silent: true });
    worker.task = { kind: "restore", x, y };

    const transform = this.ecs.getComponent(workerId, Component.TRANSFORM);
    const target = { worldX: x + 0.5, worldY: y + 0.5 };

    if (this.distanceToNode(target, transform) <= GATHER_RANGE) {
      return this.tryStartWorkerRestore(workerId, x, y, { silent });
    }

    const candidates = adjacentTiles(x, y)
      .filter((tile) => this.isActorWalkableAt(tile.x, tile.y))
      .map((tile) => ({
        ...tile,
        distance: Math.hypot(
          tile.x + 0.5 - transform.x,
          tile.y + 0.5 - transform.y,
        ),
      }))
      .sort((a, b) => a.distance - b.distance);

    for (const tile of candidates) {
      const path = findPath({
        startX: Math.floor(transform.x),
        startY: Math.floor(transform.y),
        goalX: tile.x,
        goalY: tile.y,
        isWalkable: (worldX, worldY) => this.isActorWalkableAt(worldX, worldY),
        maxNodes: PATH_MAX_NODES,
      });

      if (path === null) {
        continue;
      }

      if (path.length === 0) {
        return this.tryStartWorkerRestore(workerId, x, y, { silent });
      }

      this.setWorkerPath(
        workerId,
        path,
        { type: "worker-restore", x, y },
        "seeking",
      );
      return true;
    }

    worker.state = "idle";
    worker.task = null;
    this.updateWorkerPanel();

    if (!silent) {
      this.notify(`${worker.name} no puede llegar a esa veta.`);
    }

    return false;
  }

  tryStartWorkerRestore(workerId, x, y, { silent = false } = {}) {
    const worker = this.ecs.getComponent(workerId, Component.WORKER);

    if (!worker || !this.world.isHarvested("mineral", x, y)) {
      return false;
    }

    const transform = this.ecs.getComponent(workerId, Component.TRANSFORM);
    const target = { worldX: x + 0.5, worldY: y + 0.5 };

    if (this.distanceToNode(target, transform) > GATHER_RANGE + 0.35) {
      return false;
    }

    this.ecs.removeComponent(workerId, Component.PATH);
    this.ecs.removeComponent(workerId, Component.GATHER);
    this.ecs.addComponent(workerId, Component.GATHER, {
      kind: "restore",
      x,
      y,
      duration: RESTORE_MINERAL_SECONDS,
      elapsed: 0,
      active: true,
    });

    const motion = this.ecs.getComponent(workerId, Component.MOTION);
    if (motion) {
      motion.moving = false;
      const screenDelta = target.worldX - transform.x - (target.worldY - transform.y);
      if (Math.abs(screenDelta) > 0.01) {
        motion.facing = screenDelta > 0 ? 1 : -1;
      }
    }

    worker.state = "restoring";
    worker.task = { kind: "restore", x, y };
    this.updateWorkerPanel();

    if (!silent) {
      this.notify(`${worker.name} empieza a restaurar la veta (4 min).`);
    }

    return true;
  }

  commandWorkerMove(workerId, goalX, goalY) {
    const worker = this.ecs.getComponent(workerId, Component.WORKER);

    if (!worker) {
      return false;
    }

    if (!this.isActorWalkableAt(goalX, goalY)) {
      this.notify("El duende no puede caminar ahí.");
      return false;
    }

    this.cancelWorkerTask(workerId, { silent: true });
    const transform = this.ecs.getComponent(workerId, Component.TRANSFORM);
    const path = findPath({
      startX: Math.floor(transform.x),
      startY: Math.floor(transform.y),
      goalX,
      goalY,
      isWalkable: (x, y) => this.isActorWalkableAt(x, y),
      maxNodes: PATH_MAX_NODES,
    });

    if (path === null) {
      this.notify(`${worker.name} no puede llegar hasta ahí.`);
      return false;
    }

    if (path.length > 0) {
      this.setWorkerPath(workerId, path, null, "moving");
    } else {
      worker.state = "idle";
      this.updateWorkerPanel();
    }

    return true;
  }

  tryStartWorkerGather(workerId, kind, x, y, { silent = false } = {}) {
    const worker = this.ecs.getComponent(workerId, Component.WORKER);
    const node = this.world.getNodeAt(kind, x, y);

    if (!worker || !node) {
      return false;
    }

    const transform = this.ecs.getComponent(workerId, Component.TRANSFORM);

    if (this.distanceToNode(node, transform) > GATHER_RANGE + 0.35) {
      return false;
    }

    const yields = harvestYields(kind, node, new Set());

    if (!this.inventory.canAddAll(yields)) {
      worker.state = "idle";
      worker.task = null;
      this.updateWorkerPanel();
      this.notify("Inventario lleno. El duende no puede guardar más.");
      return false;
    }

    this.ecs.removeComponent(workerId, Component.PATH);
    this.ecs.removeComponent(workerId, Component.GATHER);
    this.ecs.addComponent(workerId, Component.GATHER, {
      kind,
      x,
      y,
      duration: gatherDuration(kind, new Set()) * WORKER_GATHER_MULTIPLIER,
      elapsed: 0,
      active: true,
    });

    const motion = this.ecs.getComponent(workerId, Component.MOTION);
    motion.moving = false;
    const screenDelta = node.worldX - transform.x - (node.worldY - transform.y);
    if (Math.abs(screenDelta) > 0.01) {
      motion.facing = screenDelta > 0 ? 1 : -1;
    }

    worker.state = "gathering";
    worker.task = { kind, x, y };
    this.updateWorkerPanel();

    if (!silent) {
      this.notify(`${worker.name} empieza a recolectar.`);
    }

    return true;
  }

  completeWorkerGather(workerId, gather) {
    if (gather.kind === "restore") {
      this.completeWorkerRestore(workerId, gather);
      return;
    }

    const worker = this.ecs.getComponent(workerId, Component.WORKER);
    const node = this.world.getNodeAt(gather.kind, gather.x, gather.y);

    if (!worker) {
      return;
    }

    const transform = this.ecs.getComponent(workerId, Component.TRANSFORM);

    if (!node || this.distanceToNode(node, transform) > GATHER_RANGE + 0.35) {
      this.ecs.removeComponent(workerId, Component.GATHER);
      worker.state = "idle";
      worker.task = null;
      this.updateWorkerPanel();
      return;
    }

    const yields = harvestYields(gather.kind, node, new Set());

    if (!this.inventory.canAddAll(yields)) {
      this.ecs.removeComponent(workerId, Component.GATHER);
      worker.state = "idle";
      worker.task = null;
      this.updateWorkerPanel();
      this.notify("Inventario lleno.");
      return;
    }

    const harvested = this.world.harvestNode(gather.kind, gather.x, gather.y);

    if (!harvested) {
      this.ecs.removeComponent(workerId, Component.GATHER);
      worker.state = "idle";
      worker.task = null;
      this.updateWorkerPanel();
      return;
    }

    if (harvested.kind === "mineral") {
      this.collectChemicalStone(harvested);
    }
    this.network?.sendHarvest(gather.kind, gather.x, gather.y);

    for (const [key, amount] of Object.entries(yields)) {
      this.inventory.add(key, amount);
    }

    this.ecs.removeComponent(workerId, Component.GATHER);
    worker.state = "idle";
    worker.task = null;

    const text = Object.entries(yields)
      .map(([key, amount]) => `+${amount} ${RESOURCE_INFO[key]?.label ?? key}`)
      .join(" · ");
    this.effects.addText(text, node.worldX, node.worldY, { color: "#9bd0ac" });

    this.updateHud();
    this.updateWorkerPanel();

    if (worker.autoRepeat) {
      const next = this.findNearestWorkerNode(
        workerId,
        gather.kind,
        (worker.autoRadius ?? WORKER_AUTO_RADIUS) + this.workerMapBonus,
      );

      if (next) {
        this.commandWorkerGather(workerId, gather.kind, next.x, next.y, {
          silent: true,
        });
      } else {
        this.notify(
          `${worker.name} no encontr\u00F3 m\u00E1s recursos cercanos.`,
        );
      }
    }
  }

  completeWorkerRestore(workerId, gather) {
    const worker = this.ecs.getComponent(workerId, Component.WORKER);

    if (!worker) {
      return;
    }

    this.ecs.removeComponent(workerId, Component.GATHER);
    worker.state = "idle";
    worker.task = null;

    if (!this.world.isHarvested("mineral", gather.x, gather.y)) {
      this.updateWorkerPanel();
      return;
    }

    if (
      this.isStructureAt(gather.x, gather.y) ||
      this.getFarmPlotAt(gather.x, gather.y)
    ) {
      this.notify(`${worker.name} no puede restaurar: hay una construcción.`);
      this.updateWorkerPanel();
      return;
    }

    this.world.restoreMineral(gather.x, gather.y);
    this.network?.sendRestore(gather.x, gather.y);
    this.effects.addText(
      "Veta restaurada",
      gather.x + 0.5,
      gather.y + 0.5,
      { color: "#e0b84f" },
    );
    this.notify(`${worker.name} ha restaurado una veta.`);
    this.updateHud();
    this.updateWorkerPanel();
    this.save();

    if (worker.autoRepeat) {
      const next = this.findNearestHarvestedMineral(
        workerId,
        (worker.autoRadius ?? WORKER_AUTO_RADIUS) + this.workerMapBonus,
      );

      if (next) {
        this.commandWorkerRestore(workerId, next.x, next.y, { silent: true });
      } else {
        this.notify(`${worker.name} no encontr\u00F3 m\u00E1s vetas agotadas.`);
      }
    }
  }

  findNearestHarvestedMineral(workerId, radius = WORKER_AUTO_RADIUS) {
    const transform = this.ecs.getComponent(workerId, Component.TRANSFORM);

    if (!transform) {
      return null;
    }

    const candidates = this.world.findHarvestedMineralsNear(
      transform.x,
      transform.y,
      radius,
    );

    for (const node of candidates) {
      if (
        this.isStructureAt(node.x, node.y) ||
        this.getFarmPlotAt(node.x, node.y)
      ) {
        continue;
      }
      return node;
    }

    return null;
  }

  findNearestWorkerNode(workerId, kind, radius = WORKER_AUTO_RADIUS) {
    const transform = this.ecs.getComponent(workerId, Component.TRANSFORM);

    if (!transform) {
      return null;
    }

    const centerX = Math.floor(transform.x);
    const centerY = Math.floor(transform.y);
    const range = Math.max(1, Math.floor(radius));
    let best = null;
    let bestDistance = Infinity;

    for (let y = centerY - range; y <= centerY + range; y += 1) {
      for (let x = centerX - range; x <= centerX + range; x += 1) {
        const node = this.world.getNodeAt(kind, x, y);

        if (!node) {
          continue;
        }

        const distance = Math.hypot(
          node.worldX - transform.x,
          node.worldY - transform.y,
        );

        if (distance <= range && distance < bestDistance) {
          bestDistance = distance;
          best = { kind, x, y };
        }
      }
    }

    return best;
  }

  setPlayerPath(path, intent) {
    this.ecs.removeComponent(this.playerId, Component.GATHER);
    this.ecs.addComponent(this.playerId, Component.PATH, {
      waypoints: pathToCenters(path),
      index: 0,
      intent,
    });
    this.playerMotion.moving = true;
    this.playerEnergy.paused = false;
  }

  cancelPlayerAction() {
    let cancelled = this.cancelFishing();

    if (this.ecs.hasComponent(this.playerId, Component.PATH)) {
      this.ecs.removeComponent(this.playerId, Component.PATH);
      cancelled = true;
    }

    if (this.ecs.hasComponent(this.playerId, Component.GATHER)) {
      this.ecs.removeComponent(this.playerId, Component.GATHER);
      cancelled = true;
    }

    this.playerEnergy.paused = false;
    this.playerMotion.moving = false;
    return cancelled;
  }

  distanceToNode(node, transform) {
    return Math.hypot(node.worldX - transform.x, node.worldY - transform.y);
  }

  tileAtScreen(screenX, screenY) {
    const approximate = this.camera.unproject(screenX, screenY);
    const approxX = Math.floor(approximate.x);
    const approxY = Math.floor(approximate.y);
    const halfW = (this.camera.tileW / 2) * this.camera.zoom;
    const halfH = (this.camera.tileH / 2) * this.camera.zoom;
    let best = null;

    for (let dy = -8; dy <= 8; dy += 1) {
      for (let dx = -8; dx <= 8; dx += 1) {
        const x = approxX + dx;
        const y = approxY + dy;
        const height = this.world.heightAt(x, y);
        const center = this.camera.project(x + 0.5, y + 0.5, height * 0.72);
        const localX = Math.abs(screenX - center.x) / halfW;
        const localY = Math.abs(screenY - center.y) / halfH;

        if (localX + localY > 1) {
          continue;
        }

        const depth = x + y;
        if (!best || depth > best.depth) {
          best = { x, y, depth };
        }
      }
    }

    return best ?? { x: approxX, y: approxY, depth: approxX + approxY };
  }

  handleRotateLeft() {
    this.rotateCamera(-1);
  }

  handleRotateRight() {
    this.rotateCamera(1);
  }

  resetPlayerVertical() {
    const transform = this.playerTransform;
    this.playerGroundHeight = this.world.heightAt(transform.x, transform.y);
    this.playerVerticalOffset = 0;
    this.playerVerticalVelocity = 0;
    this.playerAirborne = false;
    this.playerMaxFeetHeight = this.playerGroundHeight;
  }

  jump() {
    if (
      this.playerAirborne ||
      this.isSwimming() ||
      this.craftingOpen ||
      this.recipeBookOpen ||
      this.universityOpen ||
      this.observatoryOpen ||
      this.chestOpen
    ) {
      return;
    }

    this.playerAirborne = true;
    this.playerVerticalVelocity = JUMP_SPEED;
    this.playerVerticalOffset = 0;
    this.playerMaxFeetHeight = this.playerGroundHeight;
    this.cancelPlayerAction();
  }

  rotateCamera(delta) {
    this.camera.rotateSmooth(delta);
    this.cameraFollow = true;
    this.notify(
      `Perspectiva: ${["sureste", "suroeste", "noroeste", "noreste"][this.camera.rotation]}`,
    );
  }

  recenterCamera() {
    const transform = this.playerTransform;
    this.cameraFollow = true;
    this.camera.x = transform.x;
    this.camera.y = transform.y;
    this.camera.z = this.world.heightAt(transform.x, transform.y) * 0.72;
  }

  render() {
    const now = performance.now();

    if (!this.hoverUpdatedAt || now - this.hoverUpdatedAt > 80) {
      this.updateHoverPreview();
      this.hoverUpdatedAt = now;
    }

    const transform = this.playerTransform;
    const motion = this.playerMotion;
    const frame = motion.moving ? 1 + (Math.floor(motion.walkTime * 8) % 2) : 0;
    const sprite =
      this.playerSprites?.[frame] ?? this.playerSprites?.[0] ?? null;
    const fireFrame = Math.floor(this.gameTime * 5) % 2;
    const fireSprite =
      this.assets.campfireSprites?.[fireFrame] ?? this.assets.campfireSprites?.[0] ?? null;
    const actors = [
      {
        kind: "player",
        x: transform.x,
        y: transform.y,
        z:
          this.playerVerticalOffset +
          (this.donkeyMounted ? RIDER_Z_OFFSET : 0),
        sprite,
        flip: motion.facing,
        scale: PLAYER_SPRITE_SCALE,
        walkPhase: motion.walkTime,
        moving: motion.moving === true,
      },
    ];

    if (this.donkeyMounted) {
      const donkey = this.getDonkey();
      const frames = this.donkeySkin(donkey)?.frames ?? [];
      const donkeyFrame = motion.moving
        ? 1 + (Math.floor(motion.walkTime * 8) % 2)
        : 0;
      const donkeySprite = frames[donkeyFrame] ?? frames[0] ?? null;

      if (donkeySprite) {
        actors.push({
          kind: "donkey",
          x: transform.x,
          y: transform.y,
          z: this.playerVerticalOffset,
          sprite: donkeySprite,
          flip: motion.facing,
          scale: DONKEY_SPRITE_SCALE,
          walkPhase: motion.walkTime,
          moving: motion.moving === true,
        });
      }
    }

    for (const remote of this.remotePlayers.values()) {
      const remoteFrame = remote.moving
        ? 1 + (Math.floor(remote.walkTime * 8) % 2)
        : 0;
      const remoteFrames =
        this.assets.playerSkins?.[remote.skinId]?.frames ??
        this.assets.playerSprites;
      const remoteSprite =
        remoteFrames?.[remoteFrame] ?? remoteFrames?.[0] ?? null;
      const mounted = remote.donkey?.mounted === true;

      if (remote.donkey) {
        const remoteDonkeyFrames = this.donkeySkin(remote.donkey)?.frames ?? [];
        const remoteDonkeyFrame = remote.moving
          ? 1 + (Math.floor(remote.walkTime * 8) % 2)
          : 0;
        const remoteDonkeySprite =
          remoteDonkeyFrames[remoteDonkeyFrame] ??
          remoteDonkeyFrames[0] ??
          null;

        if (remoteDonkeySprite) {
          actors.push({
            kind: "donkey",
            x: mounted ? remote.x : remote.donkey.x,
            y: mounted ? remote.y : remote.donkey.y,
            z: mounted ? remote.z ?? 0 : 0,
            sprite: remoteDonkeySprite,
            flip: remote.facing,
            scale: DONKEY_SPRITE_SCALE,
          });
        }
      }

      actors.push({
        kind: "remotePlayer",
        x: remote.x,
        y: remote.y,
        z: (remote.z ?? 0) + (mounted ? RIDER_Z_OFFSET : 0),
        sprite: remoteSprite,
        flip: remote.facing,
        scale: PLAYER_SPRITE_SCALE,
        ringColor: remote.color,
        walkPhase: remote.walkTime,
        moving: remote.moving === true,
      });
    }

    for (const remoteWorker of this.remoteWorkers.values()) {
      const remoteFrame = 1 + (Math.floor(this.gameTime * 6) % 2);
      const remoteSprite =
        this.assets.workerSprites?.[remoteFrame] ??
        this.assets.workerSprites?.[0] ??
        null;

      actors.push({
        kind: "remoteWorker",
        x: remoteWorker.x,
        y: remoteWorker.y,
        z: 0,
        sprite: remoteSprite,
        flip: 1,
        scale: WORKER_SPRITE_SCALE,
        ringColor: remoteWorker.ownerColor,
      });
    }

    for (const id of this.getWorkerIds()) {
      const workerTransform = this.ecs.getComponent(id, Component.TRANSFORM);
      const workerMotion = this.ecs.getComponent(id, Component.MOTION);
      const workerFrame = workerMotion.moving
        ? 1 + (Math.floor(workerMotion.walkTime * 8) % 2)
        : 0;
      const workerSprite =
        this.assets.workerSprites?.[workerFrame] ??
        this.assets.workerSprites?.[0] ??
        null;

      actors.push({
        kind: "worker",
        x: workerTransform.x,
        y: workerTransform.y,
        z: 0,
        sprite: workerSprite,
        flip: workerMotion.facing,
        scale: WORKER_SPRITE_SCALE,
        selected: id === this.selectedWorkerId,
        walkPhase: workerMotion.walkTime,
        moving: workerMotion.moving === true,
      });
    }

    for (const id of this.getAmbientIds()) {
      if (this.donkeyMounted && id === this.donkeyId) {
        continue;
      }
      const ambientTransform = this.ecs.getComponent(id, Component.TRANSFORM);
      const ambientMotion = this.ecs.getComponent(id, Component.MOTION);
      const ambient = this.ecs.getComponent(id, Component.AMBIENT);
      const spriteSet = this.ambientSpriteSet(ambient);

      if (!spriteSet || spriteSet.length === 0) {
        continue;
      }

      let ambientFrame = 0;

      if (
        ambient.species === AMBIENT_SPECIES.FOX ||
        ambient.species === AMBIENT_SPECIES.GOAT ||
        ambient.species === AMBIENT_SPECIES.DONKEY ||
        ambient.species === AMBIENT_SPECIES.PERDIZ ||
        ambient.species === AMBIENT_SPECIES.WOLF ||
        ambient.species === AMBIENT_SPECIES.CHICKEN
      ) {
        ambientFrame = ambientMotion.moving
          ? 1 + (Math.floor(ambientMotion.walkTime * 8) % 2)
          : 0;
      } else if (ambient.species === AMBIENT_SPECIES.FROG) {
        ambientFrame = ambientTransform.z > 0.05 ? 1 : 0;
      } else if (
        ambient.species === AMBIENT_SPECIES.VULTURE ||
        ambient.species === AMBIENT_SPECIES.SPARROW ||
        ambient.species === AMBIENT_SPECIES.CROW ||
        ambient.species === AMBIENT_SPECIES.OWL
      ) {
        const clock = ambient.network ? ambient.clock ?? this.gameTime : this.gameTime;
        ambientFrame = Math.floor(clock * 7 + ambient.phase) % spriteSet.length;
      } else if (
        ambient.species === AMBIENT_SPECIES.NIGHTLING ||
        ambient.species === AMBIENT_SPECIES.SPIDER
      ) {
        ambientFrame = ambientMotion.moving
          ? 1 + (Math.floor(ambientMotion.walkTime * 7) % 2)
          : 0;
      }

      const ambientSprite =
        spriteSet[ambientFrame % spriteSet.length] ?? spriteSet[0];

      actors.push({
        kind: "ambient",
        x: ambientTransform.x,
        y: ambientTransform.y,
        z: ambientTransform.z,
        sprite: ambientSprite,
        flip: ambientMotion.facing,
        scale: AMBIENT_SCALES[ambient.species] ?? 1,
        walkPhase: ambientMotion.walkTime,
        moving:
          ambientMotion.moving === true &&
          (ambientTransform.z ?? 0) <= 0.05,
        flying:
          ambient.species === AMBIENT_SPECIES.VULTURE ||
          ambient.species === AMBIENT_SPECIES.SPARROW ||
          ambient.species === AMBIENT_SPECIES.CROW ||
          ambient.species === AMBIENT_SPECIES.OWL,
      });
    }

    if (fireSprite) {
      for (const fire of this.campfires) {
        actors.push({
          kind: "campfire",
          x: fire.x,
          y: fire.y,
          z: 0,
          sprite: fireSprite,
          flip: 1,
          scale: 1,
          glow: true,
        });
      }
    }

    const ovenSprites = this.assets.ovenSprites;
    if (ovenSprites && ovenSprites.length > 0) {
      for (let index = 0; index < this.ovens.length; index += 1) {
        const oven = this.ovens[index];
        const frame = Math.floor(this.gameTime * 4 + index) % ovenSprites.length;
        actors.push({
          kind: "structure",
          x: oven.x,
          y: oven.y,
          z: 0,
          sprite: ovenSprites[frame],
          flip: 1,
          scale: 1,
          glow: true,
        });
      }
    }

    const tableSprite = this.assets.brewingTableSprites?.[0];
    if (tableSprite) {
      for (const table of this.brewingTables) {
        actors.push({
          kind: "structure",
          x: table.x,
          y: table.y,
          z: 0,
          sprite: tableSprite,
          flip: 1,
          scale: 1,
        });
      }
    }

    const chestSprite = this.assets.chestSprites?.[0];
    if (chestSprite) {
      for (const chest of this.chests) {
        actors.push({
          kind: "structure",
          x: chest.x,
          y: chest.y,
          z: 0,
          sprite: chestSprite,
          flip: 1,
          scale: 1,
        });
      }
    }

    const tipiSprite = this.assets.tipiSprites?.[0];
    if (tipiSprite) {
      for (const tipi of this.tipis) {
        actors.push({
          kind: "structure",
          x: tipi.x,
          y: tipi.y,
          z: 0,
          sprite: tipiSprite,
          flip: 1,
          scale: 1,
        });
      }
    }

    const wolfDenSprite = this.assets.wolfDenSprites?.[0];
    if (wolfDenSprite && this.wolfDen) {
      actors.push({
        kind: "structure",
        x: this.wolfDen.x,
        y: this.wolfDen.y,
        z: 0,
        sprite: wolfDenSprite,
        flip: 1,
        scale: 1,
      });
    }

    const wolfTotemSprite = this.assets.wolfTotemSprites?.[0];
    if (wolfTotemSprite) {
      for (const totem of this.wolfTotems) {
        actors.push({
          kind: "structure",
          x: totem.x,
          y: totem.y,
          z: 0,
          sprite: wolfTotemSprite,
          flip: 1,
          scale: 1,
        });
      }
    }

    const fenceSprite = this.assets.fenceSprites?.[0];
    if (fenceSprite) {
      for (const fence of this.fences) {
        actors.push({
          kind: "structure",
          x: fence.x,
          y: fence.y,
          z: 0,
          sprite: fenceSprite,
          flip: 1,
          scale: 1,
        });
      }
    }

    const wallSprite = this.assets.wallSprites?.[0];
    if (wallSprite) {
      for (const wall of this.walls) {
        actors.push({
          kind: "structure",
          x: wall.x,
          y: wall.y,
          z: 0,
          sprite: wallSprite,
          flip: 1,
          scale: 1,
        });
      }
    }

    const torchSprite = this.assets.torchSprites?.[0];
    if (torchSprite) {
      for (const torch of this.torches) {
        actors.push({
          kind: "structure",
          x: torch.x,
          y: torch.y,
          z: 0,
          sprite: torchSprite,
          flip: 1,
          scale: 1,
          glow: true,
        });
      }
    }

    const bedSprite = this.assets.bedSprites?.[0];
    if (bedSprite) {
      for (const bed of this.beds) {
        actors.push({
          kind: "structure",
          x: bed.x,
          y: bed.y,
          z: 0,
          sprite: bedSprite,
          flip: 1,
          scale: 1,
        });
      }
    }

    const cauldronSprite = this.assets.cauldronSprites?.[0];
    if (cauldronSprite) {
      for (const cauldron of this.cauldrons) {
        actors.push({
          kind: "structure",
          x: cauldron.x,
          y: cauldron.y,
          z: 0,
          sprite: cauldronSprite,
          flip: 1,
          scale: 1,
          glow: true,
        });
      }
    }

    const universitySprite = this.assets.universitySprites?.[0];
    if (universitySprite && this.university) {
      actors.push({
        kind: "structure",
        x: this.university.x,
        y: this.university.y,
        z: 0,
        sprite: universitySprite,
        flip: 1,
        scale: 1,
      });
    }

    const observatorySprite = this.assets.observatorySprites?.[0];
    if (observatorySprite && this.observatory) {
      actors.push({
        kind: "structure",
        x: this.observatory.x,
        y: this.observatory.y,
        z: 0,
        sprite: observatorySprite,
        flip: 1,
        scale: 1,
      });
    }

    const hutSprite = this.assets.villageSprites?.hut;
    const shamanSprite = this.assets.villageSprites?.shaman;
    if (hutSprite && shamanSprite) {
      for (const village of this.villages) {
        for (const hut of village.huts) {
          actors.push({
            kind: "structure",
            x: hut.x,
            y: hut.y,
            z: 0,
            sprite: hutSprite,
            flip: 1,
            scale: 1,
          });
        }
        actors.push({
          kind: "structure",
          x: village.x,
          y: village.y,
          z: 0,
          sprite: shamanSprite,
          flip: 1,
          scale: 1,
        });
      }
    }

    const fiefSprites = this.assets.fiefSprites;
    if (fiefSprites) {
      for (const village of this.villages) {
        const progress = this.villageProgress[village.id];
        if (!progress?.allied) {
          continue;
        }
        const slots = buildingsForVillage(progress);
        for (let slot = 0; slot < slots.length; slot += 1) {
          const building = slots[slot];
          const sprite = building ? fiefSprites.buildings[building.type] : null;
          if (!building || !sprite || building.hp <= 0) {
            continue;
          }
          const position = this.fiefBuildingPosition(village, slot);
          actors.push({
            kind: "structure",
            x: position.x,
            y: position.y,
            z: 0,
            sprite,
            flip: 1,
            scale: 0.92,
          });
        }
      }

      for (const unit of this.units) {
        if (unit.hp <= 0) {
          continue;
        }
        const sprite = fiefSprites.units[unit.type];
        if (!sprite) {
          continue;
        }
        actors.push({
          kind: "fiefUnit",
          x: unit.x,
          y: unit.y,
          z: 0,
          sprite,
          flip: 1,
          scale: 0.9,
          ringColor: this.selectedUnitIds.has(unit.id) ? "#f0c07a" : undefined,
        });
      }
    }

    const celestial = celestialStateAt(this.gameTime);
    celestial.reflectionWorld = reflectionWorldPoint(transform, celestial);
    this.renderer.render(this.ctx, {
      world: this.world,
      camera: this.camera,
      assets: this.assets,
      width: this.camera.width,
      height: this.camera.height,
      actors,
      stonePaths: this.stonePaths,
      celestial,
    });

    this.drawFarmPlots();
    this.drawQuestRings();
    this.drawWaypointMarker();
    this.drawProjectiles();
    this.drawSwimRipple();
    this.drawFishingLine();
    this.drawNightOverlay();
    this.drawCursorPreview();
    this.drawWorkerTaskLine();
    this.drawGroundItems();
    this.effects.draw(
      this.ctx,
      this.camera,
      (x, y) => this.world.heightAt(x, y),
    );
    this.drawNightMobHealthBars();
    this.drawNetworkLabels();
    this.drawGatherProgressBars();
  }

  tileDiamondPoints(tileX, tileY, height) {
    const camera = this.camera;
    const z = height * 0.72;
    const x = tileX + 0.5;
    const y = tileY + 0.5;
    return [
      camera.project(x - 0.5, y - 0.5, z),
      camera.project(x + 0.5, y - 0.5, z),
      camera.project(x + 0.5, y + 0.5, z),
      camera.project(x - 0.5, y + 0.5, z),
    ];
  }

  traceTilePoints(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.lineTo(points[2].x, points[2].y);
    ctx.lineTo(points[3].x, points[3].y);
    ctx.closePath();
  }

  drawWaypointMarker() {
    if (!this.compassOwned || !this.waypoint) {
      return;
    }

    const ctx = this.ctx;
    const camera = this.camera;
    const point = camera.project(this.waypoint.x, this.waypoint.y, 0);
    const margin = 42;
    const onScreen =
      point.x >= -margin &&
      point.x <= camera.width + margin &&
      point.y >= -margin &&
      point.y <= camera.height + margin;

    if (!onScreen) {
      const centerX = camera.width / 2;
      const centerY = camera.height / 2;
      const dx = point.x - centerX;
      const dy = point.y - centerY;
      const angle = Math.atan2(dy, dx);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const limitX = centerX - 46;
      const limitY = centerY - 46;
      const scale = Math.min(
        limitX / Math.max(0.001, Math.abs(cos)),
        limitY / Math.max(0.001, Math.abs(sin)),
      );
      const x = centerX + cos * scale;
      const y = centerY + sin * scale;
      const distance = Math.round(
        Math.hypot(
          this.waypoint.x - this.playerTransform.x,
          this.waypoint.y - this.playerTransform.y,
        ),
      );

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = "rgba(240, 192, 122, 0.95)";
      ctx.strokeStyle = "rgba(20, 26, 32, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-7, -7);
      ctx.lineTo(-7, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = "rgba(240, 192, 122, 0.9)";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${distance} m`, x, y + 20);
      ctx.restore();
      return;
    }

    const zoom = camera.zoom;
    const pulse = (Math.sin(this.gameTime * 2.6) + 1) / 2;
    const radius = (16 + pulse * 7) * zoom;
    const beamHeight = 108 * zoom;
    const diamondY = point.y - beamHeight - Math.sin(this.gameTime * 2.2) * 5 * zoom;

    ctx.save();

    ctx.beginPath();
    ctx.ellipse(point.x, point.y, radius, radius * 0.5, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(240, 192, 122, ${0.45 + pulse * 0.4})`;
    ctx.lineWidth = Math.max(1.5, 2 * zoom);
    ctx.stroke();

    const beam = ctx.createLinearGradient(
      point.x,
      point.y,
      point.x,
      point.y - beamHeight,
    );
    beam.addColorStop(0, `rgba(240, 192, 122, ${0.32 + pulse * 0.16})`);
    beam.addColorStop(1, "rgba(240, 192, 122, 0)");
    ctx.fillStyle = beam;
    ctx.fillRect(
      point.x - 2.5 * zoom,
      point.y - beamHeight,
      5 * zoom,
      beamHeight,
    );

    ctx.beginPath();
    ctx.moveTo(point.x, diamondY - 9 * zoom);
    ctx.lineTo(point.x + 8 * zoom, diamondY);
    ctx.lineTo(point.x, diamondY + 9 * zoom);
    ctx.lineTo(point.x - 8 * zoom, diamondY);
    ctx.closePath();
    ctx.fillStyle = "rgba(240, 192, 122, 0.95)";
    ctx.strokeStyle = "rgba(20, 26, 32, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    const distance = Math.round(
      Math.hypot(
        this.waypoint.x - this.playerTransform.x,
        this.waypoint.y - this.playerTransform.y,
      ),
    );
    ctx.fillStyle = "rgba(240, 236, 220, 0.92)";
    ctx.font = `600 ${Math.max(10, Math.round(11 * zoom))}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(`${this.waypoint.label} · ${distance} m`, point.x, diamondY - 14 * zoom);

    ctx.restore();
  }

  drawQuestRings() {
    const ctx = this.ctx;
    const camera = this.camera;

    for (const village of this.villages) {
      if (!this.villageSeen.has(village.id)) {
        continue;
      }

      const progress = this.villageProgress[village.id];
      if (!progress) {
        continue;
      }

      const point = camera.project(village.x, village.y, 0);
      if (
        point.x < -80 ||
        point.x > camera.width + 80 ||
        point.y < -120 ||
        point.y > camera.height + 120
      ) {
        continue;
      }

      const allied = progress.allied === true;
      const steps = Math.min(4, civicLineForVillage(village).length) || 4;
      const trust = allied ? steps : Math.min(steps, progress.delivered);
      const ratio = steps > 0 ? trust / steps : 1;
      const radius = Math.max(18, 24 * camera.zoom);
      const radiusY = radius * 0.52;
      const color = allied ? "#7ec699" : "#e0a458";
      const bright = allied ? "#b8ecc7" : "#f0c07a";

      ctx.save();

      ctx.beginPath();
      ctx.ellipse(point.x, point.y, radius, radiusY, 0, 0, Math.PI * 2);
      ctx.setLineDash(allied ? [] : [6, 5]);
      ctx.lineWidth = Math.max(1.5, 2 * camera.zoom);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.75;
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      if (!allied) {
        ctx.beginPath();
        ctx.ellipse(
          point.x,
          point.y,
          radius,
          radiusY,
          0,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * ratio,
        );
        ctx.lineWidth = Math.max(2.5, 4 * camera.zoom);
        ctx.strokeStyle = bright;
        ctx.stroke();
      }

      const markerY = point.y - radiusY - Math.max(16, 22 * camera.zoom);
      ctx.beginPath();
      ctx.moveTo(point.x, markerY - 9);
      ctx.lineTo(point.x + 8, markerY);
      ctx.lineTo(point.x, markerY + 9);
      ctx.lineTo(point.x - 8, markerY);
      ctx.closePath();
      ctx.fillStyle = allied ? color : "#1b2530";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = bright;
      ctx.stroke();

      ctx.fillStyle = bright;
      ctx.font = `700 ${Math.max(9, Math.round(11 * camera.zoom))}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(allied ? "✓" : `${trust}/${steps}`, point.x, markerY + 1);

      ctx.restore();
    }

    if (this.wolfDen && this.wolfMission.discovered) {
      const point = camera.project(this.wolfDen.x, this.wolfDen.y, 0);
      if (
        point.x >= -80 &&
        point.x <= camera.width + 80 &&
        point.y >= -120 &&
        point.y <= camera.height + 120
      ) {
        const state = this.wolfMissionProgress();
        const radius = Math.max(20, 26 * camera.zoom);
        const radiusY = radius * 0.52;
        const color = state.completed ? "#7ec699" : "#d97b6c";
        const bright = state.completed ? "#b8ecc7" : "#f0b5ae";

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(point.x, point.y, radius, radiusY, 0, 0, Math.PI * 2);
        ctx.setLineDash(state.completed ? [] : [6, 5]);
        ctx.lineWidth = Math.max(1.5, 2 * camera.zoom);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.stroke();
        ctx.setLineDash([]);

        const markerY = point.y - radiusY - Math.max(16, 22 * camera.zoom);
        ctx.beginPath();
        ctx.moveTo(point.x, markerY - 9);
        ctx.lineTo(point.x + 8, markerY);
        ctx.lineTo(point.x, markerY + 9);
        ctx.lineTo(point.x - 8, markerY);
        ctx.closePath();
        ctx.fillStyle = "#1b2530";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = bright;
        ctx.stroke();

        ctx.fillStyle = bright;
        ctx.font = `700 ${Math.max(9, Math.round(11 * camera.zoom))}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          state.completed ? "✓" : `${state.kills}/${state.wolvesRequired}`,
          point.x,
          markerY + 1,
        );
        ctx.restore();
      }
    }
  }

  drawCursorPreview() {
    const hover = this.hover;

    if (
      !hover ||
      this.fishing ||
      this.craftingOpen ||
      this.recipeBookOpen ||
      this.universityOpen ||
      this.observatoryOpen ||
      this.chestOpen
    ) {
      return;
    }

    const ctx = this.ctx;
    const camera = this.camera;
    const color = hover.valid
      ? hover.mode === "mine"
        ? "#f0c07a"
        : "#7ec699"
      : "#d97b6c";
    ctx.save();

    if (hover.mode === "structure") {
      const sprite = this.placementSprite(hover.itemId);
      const zoom = camera.zoom;
      const screen = camera.project(
        hover.tileX + 0.5,
        hover.tileY + 0.5,
        hover.height * 0.72,
      );

      if (sprite) {
        ctx.globalAlpha = hover.valid ? 0.58 : 0.28;
        ctx.drawImage(
          sprite.canvas,
          screen.x - sprite.anchorX * zoom,
          screen.y - sprite.anchorY * zoom,
          sprite.width * zoom,
          sprite.height * zoom,
        );
      }
    } else if (hover.mode === "path") {
      this.renderer.drawStonePathTile(ctx, {
        camera,
        worldX: hover.tileX + 0.5,
        worldY: hover.tileY + 0.5,
        height: hover.height,
        alpha: hover.valid ? 0.62 : 0.34,
        outline: color,
      });
    } else if (hover.mode === "block") {
      const points = this.tileDiamondPoints(
        hover.tileX,
        hover.tileY,
        hover.height + 1,
      );
      ctx.globalAlpha = 0.38;
      this.traceTilePoints(ctx, points);
      ctx.fillStyle = RESOURCE_INFO[hover.itemId]?.color ?? "#d8c46a";
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const points = this.tileDiamondPoints(
      hover.tileX,
      hover.tileY,
      hover.height,
    );
    this.traceTilePoints(ctx, points);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = hover.valid ? 1.8 : 2.4;
    ctx.stroke();

    if (!hover.valid) {
      const center = {
        x: (points[0].x + points[2].x) / 2,
        y: (points[0].y + points[2].y) / 2,
      };
      const halfW = Math.abs(points[1].x - points[3].x) * 0.28;
      const halfH = Math.abs(points[2].y - points[0].y) * 0.28;
      ctx.beginPath();
      ctx.moveTo(center.x - halfW, center.y - halfH);
      ctx.lineTo(center.x + halfW, center.y + halfH);
      ctx.moveTo(center.x + halfW, center.y - halfH);
      ctx.lineTo(center.x - halfW, center.y + halfH);
      ctx.strokeStyle = "rgba(217, 123, 108, 0.8)";
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }

    ctx.restore();
  }

  placementSprite(itemId) {
    const sprites = {
      campfire: this.assets.campfireSprites?.[0],
      oven: this.assets.ovenSprites?.[0],
      brewingTable: this.assets.brewingTableSprites?.[0],
      chest: this.assets.chestSprites?.[0],
      tipi: this.assets.tipiSprites?.[0],
      valla: this.assets.fenceSprites?.[0],
      torch: this.assets.torchSprites?.[0],
      stoneWall: this.assets.wallSprites?.[0],
      bed: this.assets.bedSprites?.[0],
      cauldron: this.assets.cauldronSprites?.[0],
      wolfTotem: this.assets.wolfTotemSprites?.[0],
    };

    return sprites[itemId] ?? null;
  }

  drawCelestialSky() {
    const celestial = celestialStateAt(this.gameTime);
    const active = celestial.night ? celestial.moon : celestial.sun;

    if (!active || !active.visible) {
      return;
    }

    const ctx = this.ctx;
    const width = this.camera.width;
    const height = this.camera.height;
    const progress = active.progress ?? 0;
    const x = width * (0.18 + progress * 0.64);
    const y = height * (0.26 - (active.elevation ?? 0) * 0.05);

    ctx.save();

    if (celestial.night) {
      ctx.fillStyle = "rgba(220, 232, 255, 0.55)";
      for (let index = 0; index < 28; index += 1) {
        const sx = (Math.sin(index * 12.9898) * 43758.5453) % 1;
        const sy = (Math.sin(index * 78.233) * 12543.791) % 1;
        const px = Math.abs(sx) * width;
        const py = Math.abs(sy) * height * 0.34;
        const size = index % 5 === 0 ? 1.4 : 0.8;
        ctx.globalAlpha = 0.35 + ((index * 7) % 5) * 0.08;
        ctx.fillRect(px, py, size, size);
      }
      ctx.globalAlpha = 1;
    }

    const radius = Math.max(16, Math.min(width, height) * 0.035);
    const glow = ctx.createRadialGradient(x, y, 1, x, y, radius * 4.2);
    if (celestial.night) {
      glow.addColorStop(0, "rgba(220, 232, 255, 0.4)");
      glow.addColorStop(0.45, "rgba(150, 180, 235, 0.16)");
      glow.addColorStop(1, "rgba(120, 150, 210, 0)");
    } else {
      glow.addColorStop(0, "rgba(255, 238, 178, 0.55)");
      glow.addColorStop(0.45, "rgba(255, 200, 110, 0.2)");
      glow.addColorStop(1, "rgba(255, 176, 74, 0)");
    }
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius * 4.2, 0, Math.PI * 2);
    ctx.fill();

    if (celestial.night) {
      const illumination = Math.max(0, Math.min(1, celestial.moon.illumination ?? 0));
      if (illumination <= 0.02) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(220, 232, 255, 0.6)";
        ctx.lineWidth = 1.6;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#e2eaff";
        ctx.fill();

        if (illumination < 0.96) {
          const offset =
            (1 - illumination) *
            radius *
            1.95 *
            ((celestial.moon.phaseIndex ?? 0) <= 4 ? -1 : 1);
          ctx.beginPath();
          ctx.arc(x + offset, y, radius * 1.02, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(14, 20, 36, 0.92)";
          ctx.fill();
        }
      }
    } else {
      const sun = ctx.createRadialGradient(x, y, 1, x, y, radius);
      sun.addColorStop(0, "#fff9dc");
      sun.addColorStop(0.55, "#ffd071");
      sun.addColorStop(1, "#f2a93c");
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = celestial.night
      ? "rgba(224, 234, 255, 0.72)"
      : "rgba(255, 236, 180, 0.75)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(
      celestial.night
        ? `Luna · ${celestial.moon.phase.name}`
        : "Sol",
      x,
      y + radius + 18,
    );

    ctx.restore();
  }

  drawNightOverlay() {
    const strength = this.nightOverlayStrength();

    if (strength <= 0) {
      return;
    }

    const ctx = this.ctx;
    const width = this.camera.width;
    const height = this.camera.height;

    ctx.save();
    ctx.fillStyle = `rgba(7, 12, 30, ${0.38 * strength})`;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";

    for (const fire of this.campfires) {
      const screen = this.camera.project(
        fire.x,
        fire.y,
        this.world.heightAt(fire.x, fire.y) * 0.72,
      );
      const radius = 74 * Math.max(0.8, this.camera.zoom);
      const gradient = ctx.createRadialGradient(
        screen.x,
        screen.y - 6,
        4,
        screen.x,
        screen.y - 6,
        radius,
      );
      gradient.addColorStop(0, `rgba(255, 176, 92, ${0.22 * strength})`);
      gradient.addColorStop(1, "rgba(255, 176, 92, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y - 6, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const torch of this.torches) {
      const screen = this.camera.project(
        torch.x,
        torch.y,
        (Number.isFinite(torch.z)
          ? torch.z
          : this.world.heightAt(torch.x, torch.y)) * 0.72,
      );
      const radius = 58 * Math.max(0.8, this.camera.zoom);
      const gradient = ctx.createRadialGradient(
        screen.x,
        screen.y - 10,
        3,
        screen.x,
        screen.y - 10,
        radius,
      );
      gradient.addColorStop(0, `rgba(255, 205, 130, ${0.18 * strength})`);
      gradient.addColorStop(1, "rgba(255, 205, 130, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y - 10, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawFarmPlots() {
    if (this.farmPlots.length === 0) {
      return;
    }

    const ctx = this.ctx;
    const zoom = this.camera.zoom;

    for (const plot of this.farmPlots) {
      const screen = this.camera.project(
        plot.x + 0.5,
        plot.y + 0.5,
        this.world.heightAt(plot.x, plot.y) * 0.72,
      );

      if (
        screen.x < -80 ||
        screen.x > this.camera.width + 80 ||
        screen.y < -80 ||
        screen.y > this.camera.height + 80
      ) {
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(screen.x, screen.y, 20 * zoom, 9 * zoom, 0, 0, Math.PI * 2);
      ctx.fillStyle = plot.watered ? "#4c3a2a" : "#6b5134";
      ctx.fill();
      ctx.strokeStyle = "rgba(43, 31, 20, 0.8)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.strokeStyle = "rgba(206, 174, 126, 0.28)";
      ctx.lineWidth = Math.max(0.7, zoom);
      for (let row = -1; row <= 1; row += 1) {
        ctx.beginPath();
        ctx.moveTo(screen.x - 13 * zoom, screen.y + row * 3.5 * zoom);
        ctx.lineTo(screen.x + 13 * zoom, screen.y + row * 3.5 * zoom);
        ctx.stroke();
      }

      if (plot.crop) {
        const crop = cropById(plot.crop);
        const height = (5 + plot.stage * 5) * zoom;
        ctx.strokeStyle = crop?.color ?? "#d8c46a";
        ctx.lineWidth = Math.max(1, 1.4 * zoom);
        for (let stem = -2; stem <= 2; stem += 1) {
          ctx.beginPath();
          ctx.moveTo(screen.x + stem * 4 * zoom, screen.y);
          ctx.quadraticCurveTo(
            screen.x + stem * 5 * zoom,
            screen.y - height * 0.6,
            screen.x + stem * 6 * zoom,
            screen.y - height,
          );
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = "rgba(240, 230, 210, 0.5)";
        ctx.beginPath();
        ctx.arc(screen.x, screen.y - 2 * zoom, 2.2 * zoom, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  drawSwimRipple() {
    if (!this.isSwimming()) {
      return;
    }

    const transform = this.playerTransform;
    const screen = this.camera.project(
      transform.x,
      transform.y,
      this.world.heightAt(transform.x, transform.y) * 0.72,
    );
    const zoom = this.camera.zoom;
    const pulse = (Math.sin(this.gameTime * 5) + 1) / 2;

    this.ctx.save();
    this.ctx.strokeStyle = `rgba(143, 209, 232, ${0.2 + pulse * 0.2})`;
    this.ctx.lineWidth = 1.4;
    for (let ring = 0; ring < 2; ring += 1) {
      const radius = (12 + ring * 8 + pulse * 5) * zoom;
      this.ctx.beginPath();
      this.ctx.ellipse(screen.x, screen.y + 2, radius, radius * 0.42, 0, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawFishingLine() {
    if (!this.fishing) {
      return;
    }

    const zoom = this.camera.zoom;
    const transform = this.playerTransform;
    const from = this.camera.project(
      transform.x,
      transform.y,
      this.world.heightAt(transform.x, transform.y) * 0.72,
    );
    const to = this.camera.project(
      this.fishing.x,
      this.fishing.y,
      this.world.heightAt(this.fishing.x, this.fishing.y) * 0.72,
    );
    const facing = this.playerMotion.facing;
    const rodTipX = from.x + facing * 18 * zoom;
    const rodTipY = from.y - 34 * zoom;
    const bob =
      this.fishing.phase === "waiting"
        ? Math.sin(this.gameTime * 3.2) * 2 * zoom
        : Math.sin(this.gameTime * 12) * 3 * zoom;
    const bobberY = to.y - 3 * zoom + bob;
    const ctx = this.ctx;

    ctx.save();
    ctx.strokeStyle = "rgba(230, 240, 250, 0.55)";
    ctx.lineWidth = Math.max(0.8, zoom);
    ctx.beginPath();
    ctx.moveTo(rodTipX, rodTipY);
    ctx.quadraticCurveTo(
      (rodTipX + to.x) / 2,
      Math.min(rodTipY, bobberY) - 18 * zoom,
      to.x,
      bobberY,
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(to.x, to.y + 1, 8 * zoom, 3 * zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(8, 20, 28, 0.35)";
    ctx.fill();

    const bite = this.fishing.phase === "bite";
    ctx.beginPath();
    ctx.arc(to.x, bobberY, (bite ? 4.5 : 3.2) * zoom, 0, Math.PI * 2);
    ctx.fillStyle = bite ? "#f0c07a" : "#e7eef6";
    ctx.fill();
    ctx.strokeStyle = bite ? "#e06c75" : "#4b6677";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    if (bite) {
      ctx.font = `700 ${Math.max(12, 15 * zoom)}px "Segoe UI", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(8, 12, 16, 0.8)";
      ctx.strokeText("!", to.x, bobberY - 10 * zoom);
      ctx.fillStyle = "#f0c07a";
      ctx.fillText("!", to.x, bobberY - 10 * zoom);
    }

    ctx.restore();
  }

  drawNightMobHealthBars() {
    const zoom = this.camera.zoom;
    const ctx = this.ctx;
    ctx.save();

    for (const id of this.getAmbientIds()) {
      const ambient = this.ecs.getComponent(id, Component.AMBIENT);
      const species = ambient.species;
      const isHostile =
        species === AMBIENT_SPECIES.NIGHTLING ||
        species === AMBIENT_SPECIES.SPIDER;

      if (!isHostile && species !== AMBIENT_SPECIES.FOX) {
        continue;
      }

      const maxHealth = this.ambientMaxHealth(species);
      const health = Math.max(0, ambient.health ?? maxHealth);

      if (species === AMBIENT_SPECIES.FOX && health >= maxHealth) {
        continue;
      }

      const ratio = Math.max(0, Math.min(1, health / maxHealth));
      const transform = this.ecs.getComponent(id, Component.TRANSFORM);
      const screen = this.camera.project(
        transform.x,
        transform.y,
        this.world.heightAt(transform.x, transform.y) * 0.72,
      );
      const y = screen.y - 34 * zoom;
      const barWidth = 26 * zoom;
      const barHeight = 3 * Math.max(0.8, zoom);

      ctx.fillStyle = "rgba(8, 12, 16, 0.8)";
      ctx.fillRect(screen.x - barWidth / 2 - 1, y - 1, barWidth + 2, barHeight + 2);
      ctx.fillStyle =
        ratio > 0.35
          ? species === AMBIENT_SPECIES.FOX
            ? "#e0a458"
            : "#b06bff"
          : "#e06c75";
      ctx.fillRect(screen.x - barWidth / 2, y, barWidth * ratio, barHeight);
    }

    ctx.restore();
  }

  drawNetworkLabels() {
    if (this.remotePlayers.size === 0) {
      return;
    }

    const zoom = this.camera.zoom;
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    for (const remote of this.remotePlayers.values()) {
      const screen = this.camera.project(
        remote.x,
        remote.y,
        this.world.heightAt(remote.x, remote.y) * 0.72,
      );
      const y = screen.y - 78 * zoom;
      const barWidth = 42 * zoom;
      const barHeight = 4 * Math.max(0.8, zoom);
      const healthRatio = Math.max(0, Math.min(1, remote.health / 100));

      ctx.font = `${Math.max(9, 10 * zoom)}px "Segoe UI", sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(8, 12, 16, 0.8)";
      ctx.strokeText(remote.name, screen.x, y);
      ctx.fillStyle = remote.color;
      ctx.fillText(remote.name, screen.x, y);

      ctx.fillStyle = "rgba(8, 12, 16, 0.8)";
      ctx.fillRect(screen.x - barWidth / 2 - 1, y + 3, barWidth + 2, barHeight + 2);
      ctx.fillStyle = healthRatio > 0.3 ? "#7ec699" : "#e06c75";
      ctx.fillRect(screen.x - barWidth / 2, y + 4, barWidth * healthRatio, barHeight);
    }

    ctx.restore();
  }

  drawWorkerTaskLine() {
    if (!this.selectedWorkerId) {
      return;
    }

    const worker = this.ecs.getComponent(this.selectedWorkerId, Component.WORKER);

    if (!worker?.task) {
      return;
    }

    const transform = this.ecs.getComponent(this.selectedWorkerId, Component.TRANSFORM);
    const from = this.camera.project(
      transform.x,
      transform.y,
      this.world.heightAt(transform.x, transform.y) * 0.72,
    );
    const to = this.camera.project(
      worker.task.x + 0.5,
      worker.task.y + 0.5,
      this.world.heightAt(worker.task.x, worker.task.y) * 0.72,
    );
    const zoom = this.camera.zoom;

    this.ctx.save();
    this.ctx.strokeStyle = "rgba(240, 192, 122, 0.5)";
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y - 9 * zoom);
    this.ctx.lineTo(to.x, to.y - 9 * zoom);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.strokeStyle = "rgba(240, 192, 122, 0.8)";
    this.ctx.beginPath();
    this.ctx.ellipse(to.x, to.y, 10 * zoom, 4 * zoom, 0, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawGatherProgressBars() {
    const zoom = this.camera.zoom;

    for (const id of this.ecs.query(Component.TRANSFORM, Component.GATHER)) {
      const gather = this.ecs.getComponent(id, Component.GATHER);

      if (!gather || !gather.active) {
        continue;
      }

      const transform = this.ecs.getComponent(id, Component.TRANSFORM);
      const screen = this.camera.project(
        transform.x,
        transform.y,
        this.world.heightAt(transform.x, transform.y) * 0.72,
      );
      const isWorker = this.ecs.hasComponent(id, Component.WORKER);
      const width = (isWorker ? 34 : 46) * Math.max(0.8, zoom);
      const height = 5 * Math.max(0.8, zoom);
      const x = screen.x - width / 2;
      const y = screen.y - (isWorker ? 60 : 76) * zoom;
      const progress = gather.duration > 0 ? gather.elapsed / gather.duration : 0;

      this.ctx.save();
      this.ctx.fillStyle = "rgba(8, 12, 16, 0.82)";
      this.ctx.fillRect(x - 1, y - 1, width + 2, height + 2);
      this.ctx.fillStyle = isWorker ? "#9bd0ac" : "#e0a458";
      this.ctx.fillRect(x, y, width * Math.min(1, progress), height);
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, y, width, height);
      this.ctx.restore();
    }
  }

  tickHud(deltaSeconds) {
    this.hudTimer += deltaSeconds;
    this.fpsFrames += 1;
    this.fpsTime += deltaSeconds;

    if (this.hudTimer < HUD_INTERVAL) {
      return;
    }

    const fps = this.fpsTime > 0 ? Math.round(this.fpsFrames / this.fpsTime) : 0;
    this.hud.fps.textContent = String(fps);
    this.hud.chunks.textContent = String(this.world.chunks.size);
    this.hudTimer = 0;
    this.fpsFrames = 0;
    this.fpsTime = 0;
    if (this.tradeOpen) {
      this.renderTrade();
    }
    if (this.villageOpen) {
      this.renderVillage();
    }
    if (this.questOpen) {
      this.renderQuest();
    }
    if (this.fiefOpen) {
      this.renderFief();
    }
    this.updateHud();
  }

  updateHud() {
    const transform = this.playerTransform;
    const tile = this.world.getTile(transform.x, transform.y);
    const biome = biomeById(tile.biome);
    const mineral = mineralById(tile.mineral);

    this.hud.coords.textContent = `${tile.x}, ${tile.y}`;
    this.hud.biome.textContent = mineral ? `${biome.name} · ${mineral.name}` : biome.name;
    this.hud.fauna.textContent = String(this.getAmbientIds().length);
    if (this.hud.gameModeLabel) {
      this.hud.gameModeLabel.textContent = modeById(this.gameMode).name;
    }
    if (this.hud.waveTimer) {
      const target = this.villages.find((village) => village.id === this.waveTargetVillageId);
      this.hud.waveTimer.hidden = !this.wavesStarted;
      this.hud.waveTimer.textContent = !this.wavesStarted
        ? ""
        : this.gameMode === "peaceful"
          ? "Pacífico"
          : this.waveActive
            ? `Oleada ${this.waveIndex} · ${target?.name ?? "defensa"}`
            : `Oleada en ${Math.max(0, Math.ceil(this.waveTimer))} s`;
    }
    const cycleInfo = this.cycleHudInfo();
    if (this.hud.cycle) {
      this.hud.cycle.textContent = `${cycleInfo.phase} ${cycleInfo.day}`;
    }
    if (this.hud.cyclePhase) {
      this.hud.cyclePhase.textContent = cycleInfo.time;
    }
    if (this.hud.moon) {
      this.hud.moon.textContent = `${cycleInfo.moon.icon} ${cycleInfo.moon.name}`;
      this.hud.moon.title = `Calendario lunar · ${cycleInfo.moon.name}`;
    }
    this.drawCelestialHud();
    if (this.hud.cycleIndicator) {
      this.hud.cycleIndicator.dataset.phase = this.isNight() ? "night" : "day";
    }
    document.body.classList.toggle("is-night", this.isNight());
    this.updateEnergyHud();
    this.updateHealthHud();
    this.renderInventoryHud();
    this.updateCoffeeHud();
    this.renderPotionEffects();
    this.updatePlaceButton();
    const placeSelected = this.getSelectedEntry();
    if (this.hud.btnPlaceSelected) {
      const canPlace =
        placeSelected?.kind === "item" &&
        PLACEABLE_ITEM_KEYS.has(placeSelected.key);
      this.hud.btnPlaceSelected.classList.toggle("is-active", canPlace);
      this.hud.btnPlaceSelected.title = canPlace
        ? "Colocar el objeto seleccionado"
        : "Selecciona un objeto colocable";
    }
    this.refreshRecipeStates();
    this.updateWorkerPanel();
    this.updateQuestButton();
    this.updateCompassHud();
    const dropEntry = this.getSelectedEntry();
    if (this.hud.btnDrop) {
      const canDrop = Boolean(dropEntry) && dropEntry.kind !== "tool";
      this.hud.btnDrop.disabled = !canDrop;
      this.hud.btnDrop.textContent = canDrop ? "Soltar 1" : "Soltar";
      this.hud.btnDrop.title = canDrop
        ? `Soltar 1 ${dropEntry.label}`
        : "Selecciona un objeto o recurso para soltar";
    }
    const idleWorkers = this.getIdleWorkerIds().length;
    if (this.hud.btnIdleWorker) {
      this.hud.btnIdleWorker.textContent =
        idleWorkers > 0 ? `Duendes ${idleWorkers}` : "Duendes";
      this.hud.btnIdleWorker.classList.toggle("is-active", idleWorkers > 0);
      this.hud.btnIdleWorker.title =
        idleWorkers > 0
          ? `Centrar en ${idleWorkers} duende${idleWorkers === 1 ? "" : "s"} inactivo${idleWorkers === 1 ? "" : "s"}`
          : "No hay duendes inactivos";
    }
    this.touchControls?.setIdleWorkerCount(idleWorkers);
    if (this.hud.btnCrossWorkersBadge) {
      this.hud.btnCrossWorkersBadge.hidden = idleWorkers <= 0;
      this.hud.btnCrossWorkersBadge.textContent =
        idleWorkers > 99 ? "99+" : String(idleWorkers);
    }
    this.hud.btnCrossWorkers?.classList.toggle("is-active", idleWorkers > 0);
    this.hudMenu?.refreshContextActions();
  }

  drawCelestialHud() {
    const canvas = this.hud.celestial;
    if (!canvas) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 30;
    if (canvas.width !== Math.floor(size * dpr)) {
      canvas.width = Math.floor(size * dpr);
      canvas.height = Math.floor(size * dpr);
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const celestial = celestialStateAt(this.gameTime);
    const cx = size / 2;
    const cy = size / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    if (celestial.night) {
      const moon = celestial.moon;
      const illumination = moon.illumination;
      const radius = 9;

      ctx.beginPath();
      ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(150, 180, 235, 0.16)";
      ctx.fill();

      if (illumination > 0.02) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#dbe4ff";
        ctx.fill();

        if (illumination < 0.96) {
          const offset =
            (1 - illumination) *
            radius *
            1.95 *
            ((moon.phaseIndex ?? 0) <= 4 ? -1 : 1);
          ctx.beginPath();
          ctx.arc(cx + offset, cy, radius * 1.02, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(12, 18, 32, 0.9)";
          ctx.fill();
        }
      } else {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(190, 206, 236, 0.45)";
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    } else {
      const sun = ctx.createRadialGradient(cx, cy, 1, cx, cy, 12);
      sun.addColorStop(0, "#fff6cf");
      sun.addColorStop(0.55, "#ffd071");
      sun.addColorStop(1, "rgba(255, 176, 74, 0)");
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  updateCoffeeHud() {
    const count = this.inventory.itemCount("coffee");

    if (this.hud.btnCoffee) {
      this.hud.btnCoffee.hidden = count <= 0;
      if (count > 0) {
        this.hud.btnCoffee.textContent = `Café ×${count}`;
      }
    }

    if (this.hud.buff) {
      const active = this.speedBuffRemaining > 0;
      this.hud.buff.hidden = !active;
      if (active && this.hud.buffLabel) {
        this.hud.buffLabel.textContent = `Café · ${Math.ceil(this.speedBuffRemaining)} s`;
      }
    }
  }

  updateEnergyHud() {
    const energy = this.playerEnergy;
    const percent = (energy.current / energy.max) * 100;

    this.hud.energyFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    this.hud.energyFill.classList.toggle("is-low", percent < 25);
    this.hud.energy.textContent = String(Math.round(energy.current));

    if (this.hud.energyLabel) {
      this.hud.energyLabel.textContent = this.energyBoosted
        ? "Energía · fogata"
        : "Energía";
      this.hud.energyLabel.classList.toggle("is-boosted", this.energyBoosted);
    }
  }

  inventoryEntries() {
    const entries = [];

    for (const key of RESOURCE_KEYS) {
      const count = this.inventory.count(key);
      if (count > 0) {
        entries.push({
          kind: "resource",
          key,
          count,
          label: RESOURCE_INFO[key].label,
          color: RESOURCE_INFO[key].color,
          symbol: RESOURCE_INFO[key].symbol,
          source: sourceFor("resource", key),
        });
      }
    }

    for (const key of ITEM_KEYS) {
      const count = this.inventory.itemCount(key);
      if (count > 0) {
        entries.push({
          kind: "item",
          key,
          count,
          label: ITEM_INFO[key].label,
          color: "#c9a36a",
          symbol: ITEM_INFO[key].symbol,
          source: sourceFor("item", key),
        });
      }
    }

    for (const key of TOOL_KEYS) {
      if (this.inventory.hasTool(key)) {
        entries.push({
          kind: "tool",
          key,
          count: 1,
          label: TOOL_INFO[key].short,
          color: "#7ec699",
          symbol: TOOL_INFO[key].symbol,
          source: sourceFor("tool", key),
        });
      }
    }

    return entries;
  }

  getSelectedEntry(entries = this.inventoryEntries()) {
    if (!this.selectedHotbar) {
      return null;
    }

    return (
      entries.find(
        (entry) =>
          entry.kind === this.selectedHotbar.kind &&
          entry.key === this.selectedHotbar.key,
      ) ?? null
    );
  }

  selectHotbar(index) {
    const slotIndex = index - 1;
    const entry = hotbarEntryAt(
      this.hotbarSlots,
      slotIndex,
      this.inventoryEntries(),
    );

    if (!entry) {
      return;
    }

    this.selectedHotbar = { kind: entry.kind, key: entry.key };
    this.renderInventoryHud();
    this.renderInventoryPanel();
  }

  getContextAction() {
    return resolveContextAction({
      entry: this.getSelectedEntry(),
      placing: Boolean(this.placingItem),
      mounted: this.donkeyMounted,
      nearDonkey: Boolean(this.getNearbyDonkeyId()),
      fishing: this.fishing,
      birdWatch: this.birdWatch,
    });
  }

  getNearbyDonkeyId() {
    if (!this.donkeyId) {
      return null;
    }
    const transform = this.ecs.getComponent(this.donkeyId, Component.TRANSFORM);
    if (!transform) {
      return null;
    }
    const distance = Math.hypot(
      transform.x - this.playerTransform.x,
      transform.y - this.playerTransform.y,
    );
    return distance <= DONKEY_INTERACT_RANGE ? this.donkeyId : null;
  }

  runContextAction() {
    const action = this.getContextAction();

    if (action.id === "place") {
      this.handlePlaceSelected();
    } else if (action.id === "use" || action.id === "fish") {
      this.useSelectedItem();
    } else if (action.id === "bird") {
      if (this.birdWatch?.phase === "aiming") {
        this.focusBirdWatch();
      } else {
        this.cancelBirdWatch();
      }
    } else if (action.id === "observe") {
      this.notify("Haz clic en un ave cercana con los prismáticos seleccionados.");
    } else if (action.id === "dismount") {
      this.dismountDonkey();
    } else if (action.id === "mount") {
      const donkeyId = this.getNearbyDonkeyId();
      if (donkeyId) {
        this.handleDonkeyInteraction(donkeyId);
      } else {
        this.notify("Acércate al burro.");
      }
    } else if (action.id === "plant") {
      const selected = this.getSelectedEntry();
      const tileX = Math.floor(this.playerTransform.x);
      const tileY = Math.floor(this.playerTransform.y);
      if (!this.tryPlantSeed(tileX, tileY, selected)) {
        this.notify("Toca el suelo o una parcela para sembrar.");
      }
    } else if (action.id === "till") {
      const tileX = Math.floor(this.playerTransform.x);
      const tileY = Math.floor(this.playerTransform.y);
      if (!this.tryFarmInteraction(tileX, tileY)) {
        this.notify("Toca tierra para preparar una parcela.");
      }
    }
  }

  handleInventoryClick(event) {
    if (this.suppressInventoryClick) {
      return;
    }

    const slot = event.target.closest("[data-hotbar-slot]");
    if (slot) {
      this.selectHotbar(Number(slot.dataset.hotbarSlot) + 1);
      return;
    }

    const item = event.target.closest(
      "[data-inventory-kind][data-inventory-key]",
    );
    if (!item) {
      return;
    }

    const entry = this.inventoryEntries().find(
      (candidate) =>
        candidate.kind === item.dataset.inventoryKind &&
        candidate.key === item.dataset.inventoryKey,
    );
    if (!entry) {
      return;
    }

    const existing = this.hotbarSlots.findIndex(
      (assigned) =>
        assigned &&
        assigned.kind === entry.kind &&
        assigned.key === entry.key,
    );

    if (existing >= 0) {
      this.selectHotbar(existing + 1);
      return;
    }

    const empty = firstEmptyHotbarSlot(this.hotbarSlots);
    if (empty < 0) {
      this.notify(
        "La fila rápida está llena. Arrastra un objeto a un slot para reemplazarlo.",
      );
      return;
    }

    this.assignInventoryEntry(entry, empty);
  }

  useOrPlaceSelected() {
    const action = this.getContextAction();

    if (!action || action.id === "attack") {
      this.notify("Selecciona un objeto para usar o colocar.");
      return;
    }

    this.runContextAction();
  }

  openInventory() {
    if (!this.hud.inventoryPanel) {
      return;
    }
    this.closeMap();
    this.inventoryOpen = true;
    this.input?.keys?.clear();
    this.hud.inventoryPanel.classList.add("is-open");
    this.hud.inventoryPanel.setAttribute("aria-hidden", "false");
    this.renderInventoryPanel();
  }

  closeInventory() {
    this.inventoryOpen = false;
    this.hud.inventoryPanel?.classList.remove("is-open");
    this.hud.inventoryPanel?.setAttribute("aria-hidden", "true");
    this.cancelHotbarDrag();
  }

  toggleInventory() {
    if (this.inventoryOpen) {
      this.closeInventory();
    } else {
      this.openInventory();
    }
  }

  saveHotbar() {
    saveHotbarSlots(this.hotbarSlots);
  }

  assignInventoryEntry(entry, targetIndex) {
    this.hotbarAutoFill = false;
    this.hotbarSlots = assignHotbarSlot(this.hotbarSlots, targetIndex, {
      kind: entry.kind,
      key: entry.key,
    });
    this.saveHotbar();
    this.selectedHotbar = { kind: entry.kind, key: entry.key };
    this.renderInventoryHud();
    this.renderInventoryPanel();
  }

  moveHotbarEntry(fromIndex, toIndex) {
    if (fromIndex === toIndex) {
      return;
    }
    this.hotbarAutoFill = false;
    this.hotbarSlots = assignHotbarSlot(
      this.hotbarSlots,
      toIndex,
      this.hotbarSlots[fromIndex],
      { sourceIndex: fromIndex },
    );
    this.saveHotbar();
    this.renderInventoryHud();
    this.renderInventoryPanel();
  }

  removeHotbarEntry(index) {
    this.hotbarAutoFill = false;
    this.hotbarSlots = clearHotbarSlot(this.hotbarSlots, index);
    this.saveHotbar();
    this.renderInventoryHud();
    this.renderInventoryPanel();
  }

  handleInventoryPointerDown(event) {
    if (!this.inventoryOpen || event.button !== 0) {
      return;
    }

    const item = event.target.closest(
      "[data-inventory-kind][data-inventory-key]",
    );
    const slot = event.target.closest("[data-hotbar-slot]");
    let source = null;

    if (item) {
      source = {
        type: "inventory",
        kind: item.dataset.inventoryKind,
        key: item.dataset.inventoryKey,
        fromSlot: null,
      };
    } else if (slot) {
      const index = Number(slot.dataset.hotbarSlot);
      const assigned = this.hotbarSlots[index];
      if (!assigned) {
        return;
      }
      source = {
        type: "slot",
        kind: assigned.kind,
        key: assigned.key,
        fromSlot: index,
      };
    }

    if (!source) {
      return;
    }

    this.hotbarDrag = {
      ...source,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      ghost: null,
      targetSlot: null,
    };
    this.suppressInventoryClick = false;
  }

  handleInventoryPointerMove(event) {
    const drag = this.hotbarDrag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    const distance = Math.hypot(
      event.clientX - drag.startX,
      event.clientY - drag.startY,
    );

    if (!drag.active && distance < 6) {
      return;
    }

    if (!drag.active) {
      drag.active = true;
      this.suppressInventoryClick = true;
      const entry = this.inventoryEntries().find(
        (candidate) =>
          candidate.kind === drag.kind && candidate.key === drag.key,
      );
      const ghost = document.createElement("div");
      ghost.className = "hotbar-drag-ghost";
      ghost.textContent = entry?.symbol ?? "?";
      if (entry?.color) {
        ghost.style.borderColor = entry.color;
        ghost.style.color = entry.color;
      }
      document.body.append(ghost);
      drag.ghost = ghost;
    }

    event.preventDefault();
    drag.ghost.style.left = `${event.clientX}px`;
    drag.ghost.style.top = `${event.clientY}px`;
    this.updateHotbarDragTarget(event);
  }

  updateHotbarDragTarget(event) {
    const drag = this.hotbarDrag;
    if (!drag) {
      return;
    }

    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest("[data-hotbar-slot]");
    const index = target ? Number(target.dataset.hotbarSlot) : null;

    if (drag.targetSlot === index) {
      return;
    }

    this.hud.inventoryHotbar
      ?.querySelectorAll(".inventory-slot.is-drag-over")
      .forEach((element) => element.classList.remove("is-drag-over"));
    drag.targetSlot = index;
    target?.classList.add("is-drag-over");
    this.hud.inventoryPanel?.classList.toggle(
      "is-remove-target",
      drag.type === "slot" && index === null,
    );
  }

  handleInventoryPointerUp(event) {
    const drag = this.hotbarDrag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    const wasActive = drag.active;

    if (wasActive) {
      event.preventDefault();
      event.stopPropagation();
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-hotbar-slot]");
      const index = target ? Number(target.dataset.hotbarSlot) : null;

      if (index !== null) {
        if (drag.type === "inventory") {
          this.assignInventoryEntry(
            { kind: drag.kind, key: drag.key },
            index,
          );
        } else {
          this.moveHotbarEntry(drag.fromSlot, index);
        }
      } else if (drag.type === "slot") {
        this.removeHotbarEntry(drag.fromSlot);
      }

      this.hud.inventoryPanel?.classList.remove("is-remove-target");
      this.hud.inventoryHotbar
        ?.querySelectorAll(".inventory-slot.is-drag-over")
        .forEach((element) => element.classList.remove("is-drag-over"));
    }

    this.cancelHotbarDrag({ suppressClick: wasActive });
  }

  cancelHotbarDrag({ suppressClick = false } = {}) {
    const drag = this.hotbarDrag;
    if (drag?.ghost) {
      drag.ghost.remove();
    }
    this.hotbarDrag = null;

    if (suppressClick) {
      this.suppressInventoryClick = true;
      window.setTimeout(() => {
        this.suppressInventoryClick = false;
      }, 50);
    } else {
      this.suppressInventoryClick = false;
    }
  }

  renderInventoryPanel() {
    if (!this.inventoryOpen || !this.hud.inventoryPanel) {
      return;
    }

    const entries = this.inventoryEntries();
    const selected = this.getSelectedEntry(entries);
    const grid = this.hud.inventoryGrid;

    if (grid) {
      const fragment = document.createDocumentFragment();

      for (const entry of entries) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "inventory-item";
        item.dataset.inventoryKind = entry.kind;
        item.dataset.inventoryKey = entry.key;
        item.style.setProperty("--resource-color", entry.color);
        const assigned = this.hotbarSlots.some(
          (slot) =>
            slot && slot.kind === entry.kind && slot.key === entry.key,
        );
        item.classList.toggle("is-assigned", assigned);
        if (
          selected &&
          selected.kind === entry.kind &&
          selected.key === entry.key
        ) {
          item.classList.add("is-selected");
        }
        item.setAttribute(
          "aria-label",
          `${entry.label} ×${entry.count}. Arrastra a la fila rápida.`,
        );

        const icon = document.createElement("span");
        icon.className = "inventory-item-icon";
        icon.textContent = entry.symbol ?? "?";
        const label = document.createElement("span");
        label.className = "inventory-item-label";
        label.textContent = entry.label;
        const count = document.createElement("b");
        count.textContent = String(entry.count);
        item.append(icon, label, count);
        fragment.append(item);
      }

      if (entries.length === 0) {
        const empty = document.createElement("p");
        empty.className = "inventory-empty";
        empty.textContent = "Tu inventario está vacío.";
        fragment.append(empty);
      }

      grid.replaceChildren(fragment);
    }

    if (this.hud.inventoryCapacity) {
      this.hud.inventoryCapacity.textContent = `${this.inventory.slotsUsed()}/${this.inventory.capacity}`;
    }

    const canDrop = Boolean(selected) && selected.kind !== "tool";
    if (this.hud.btnInventoryDrop) {
      this.hud.btnInventoryDrop.disabled = !canDrop;
      this.hud.btnInventoryDrop.textContent = canDrop
        ? `Soltar 1 ${selected.label}`
        : "Soltar 1";
    }
    if (this.hud.btnInventoryDropStack) {
      this.hud.btnInventoryDropStack.disabled = !canDrop;
      this.hud.btnInventoryDropStack.textContent = canDrop
        ? `Soltar pila (${selected.count})`
        : "Soltar pila";
    }

    const hotbar = this.hud.inventoryHotbar;
    if (!hotbar) {
      return;
    }

    const fragment = document.createDocumentFragment();

    for (let index = 0; index < HOTBAR_SLOT_COUNT; index += 1) {
      const entry = hotbarEntryAt(this.hotbarSlots, index, entries);
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "inventory-slot";
      slot.dataset.hotbarSlot = String(index);

      const number = document.createElement("span");
      number.className = "inventory-slot-number";
      number.textContent = String(index + 1);
      slot.append(number);

      if (entry) {
        slot.style.setProperty("--resource-color", entry.color);
        slot.classList.add("has-item");
        if (
          selected &&
          selected.kind === entry.kind &&
          selected.key === entry.key
        ) {
          slot.classList.add("is-selected");
        }
        const icon = document.createElement("span");
        icon.className = "inventory-item-icon";
        icon.textContent = entry.symbol ?? "?";
        const count = document.createElement("b");
        count.textContent = String(entry.count);
        slot.append(icon, count);
        slot.title = `${entry.label} ×${entry.count}`;
      } else {
        slot.classList.add("is-empty");
        slot.title = `Espacio ${index + 1} libre`;
      }

      fragment.append(slot);
    }

    hotbar.replaceChildren(fragment);
  }

  useSelectedItem() {
    if (this.fishing) {
      if (this.fishing.phase === "bite") {
        this.resolveFishingTap();
      } else {
        this.cancelFishing("Recogiste la caña.");
      }
      return;
    }

    if (this.donkeyMounted) {
      this.dismountDonkey();
      return;
    }

    const entry = this.getSelectedEntry();

    if (!entry) {
      this.notify("Selecciona un objeto con 1-9 o haciendo clic.");
      return;
    }

    if (entry.kind === "item" && entry.key === "coffee") {
      this.drinkCoffee();
      return;
    }

    if (entry.kind === "item" && entry.key === "bandage") {
      this.useBandage();
      return;
    }

    if (entry.kind === "item" && entry.key === "pescadoFrito") {
      this.useFriedFish();
      return;
    }

    if (entry.kind === "item" && entry.key === "pan") {
      this.usePan();
      return;
    }

    if (entry.kind === "resource" && entry.key === "maiz") {
      this.eatMaize();
      return;
    }

    if (entry.kind === "item" && entry.key === "swimPotion") {
      this.drinkSwimPotion();
      return;
    }

    if (entry.kind === "item" && entry.key === "moonHealingPotion") {
      if (this.inventory.removeItem("moonHealingPotion", 1) <= 0) {
        return;
      }
      const amount = Math.round(
        65 * scienceModifiers(this.sciencePoints).potionMultiplier,
      );
      this.health = Math.min(this.maxHealth, this.health + amount);
      this.effects.addText(`+${amount} salud`, this.playerTransform.x, this.playerTransform.y, {
        color: "#7ec699",
      });
      this.updateHealthHud();
      this.updateHud();
      this.save();
      this.notify(`Brebaje lunar de curación: +${amount} salud.`);
      return;
    }

    if (entry.kind === "item" && entry.key === "moonPoisonPotion") {
      this.notify("Selecciona el brebaje y haz clic en un enemigo.");
      return;
    }

    if (entry.kind === "item" && potionById(entry.key)) {
      this.usePotionItem(entry.key);
      return;
    }

    if (entry.kind === "tool" && entry.key === "fishingRod") {
      this.notify("Caña lista: haz clic en un tile de agua cercano.");
      return;
    }

    this.notify(`${entry.label} no se puede usar directamente.`);
  }

  handleDropButton(wholeStack = false) {
    if (!this.getSelectedEntry()) {
      this.notify("Selecciona primero un objeto o recurso.");
      return;
    }
    this.dropSelected(wholeStack === true);
  }

  handleInventoryDrop() {
    this.handleDropButton(false);
  }

  handleHudDrop() {
    this.handleDropButton(false);
  }

  handleInventoryDropStack() {
    this.handleDropButton(true);
  }

  dropSelected(wholeStack = false) {
    const entry = this.getSelectedEntry();

    if (!entry) {
      this.notify("Selecciona un objeto con 1-9 o haciendo clic.");
      return;
    }

    if (entry.kind === "tool") {
      this.notify("No puedes tirar una herramienta equipada.");
      return;
    }

    const amount = wholeStack ? entry.count : 1;
    const removed =
      entry.kind === "resource"
        ? this.inventory.remove(entry.key, amount)
        : this.inventory.removeItem(entry.key, amount);

    if (removed <= 0) {
      return;
    }

    const angle = this.groundItems.length * 1.7;
    const groundX = this.playerTransform.x + Math.cos(angle) * 0.55;
    const groundY = this.playerTransform.y + Math.sin(angle) * 0.55;

    this.groundItems.push({
      kind: entry.kind,
      key: entry.key,
      amount: removed,
      label: entry.label,
      color: entry.color,
      x: groundX,
      y: groundY,
    });
    this.effects.addText(`-${removed} ${entry.label}`, groundX, groundY, {
      color: "#d97b6c",
    });
    this.updateHud();
    this.save();
    this.notify(
      `Dejaste ${removed} ${entry.label} en el suelo. Haz clic en la bolsa para recuperarlo.`,
    );
  }

  tryPickupGroundItemAt(screenX, screenY) {
    const zoom = this.camera.zoom;
    const hitRadius = 18 * Math.max(0.8, zoom) + 8;
    let target = null;
    let targetIndex = -1;

    for (let index = this.groundItems.length - 1; index >= 0; index -= 1) {
      const item = this.groundItems[index];
      const screen = this.camera.project(
        item.x,
        item.y,
        this.world.heightAt(item.x, item.y) * 0.72,
      );
      const dx = screenX - screen.x;
      const dy = screenY - (screen.y - 5 * zoom);

      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        target = item;
        targetIndex = index;
        break;
      }
    }

    if (!target) {
      return false;
    }

    const playerDistance = Math.hypot(
      target.x - this.playerTransform.x,
      target.y - this.playerTransform.y,
    );

    if (playerDistance > 3.5) {
      this.notify("Acércate a la bolsa para recogerla.");
      return true;
    }

    const added =
      target.kind === "resource"
        ? this.inventory.add(target.key, target.amount)
        : this.inventory.addItem(target.key, target.amount);

    if (added <= 0) {
      this.notify("No hay espacio para recoger eso.");
      return true;
    }

    target.amount -= added;

    if (target.amount <= 0) {
      this.groundItems.splice(targetIndex, 1);
    }

    this.effects.addText(`+${added} ${target.label}`, target.x, target.y, {
      color: target.color,
    });
    this.updateHud();
    this.save();
    return true;
  }

  drawGroundItems() {
    if (this.groundItems.length === 0) {
      return;
    }

    const zoom = this.camera.zoom;
    const scale = Math.max(0.8, zoom);

    for (const item of this.groundItems) {
      const screen = this.camera.project(
        item.x,
        item.y,
        this.world.heightAt(item.x, item.y) * 0.72,
      );

      if (
        screen.x < -60 ||
        screen.x > this.camera.width + 60 ||
        screen.y < -60 ||
        screen.y > this.camera.height + 60
      ) {
        continue;
      }

      const ctx = this.ctx;
      const bagY = screen.y - 5 * scale;

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(screen.x, screen.y + 1, 9 * scale, 3.5 * scale, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(screen.x, bagY, 8 * scale, 7 * scale, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(24, 21, 18, 0.92)";
      ctx.fill();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(screen.x, bagY + 1 * scale, 2.4 * scale, 0, Math.PI * 2);
      ctx.fillStyle = item.color;
      ctx.fill();

      ctx.font = `${Math.max(8, 9 * scale)}px Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(8, 12, 16, 0.8)";
      ctx.strokeText(String(item.amount), screen.x, bagY - 8 * scale);
      ctx.fillStyle = "#f4f1ea";
      ctx.fillText(String(item.amount), screen.x, bagY - 8 * scale);
      ctx.restore();
    }
  }

  renderInventoryHud() {
    const entries = this.inventoryEntries();

    if (
      this.hotbarAutoFill &&
      this.hotbarSlots.every((slot) => slot === null) &&
      entries.length > 0
    ) {
      this.hotbarSlots = defaultHotbarSlots(entries);
      this.hotbarAutoFill = false;
      saveHotbarSlots(this.hotbarSlots);
    }

    const selected = this.getSelectedEntry(entries);

    if (this.selectedHotbar && !selected) {
      this.selectedHotbar = null;
    }

    const selectedIndex = selected
      ? this.hotbarSlots.findIndex(
          (slot) =>
            slot &&
            slot.kind === selected.kind &&
            slot.key === selected.key,
        )
      : -1;
    const hotbarSignature = this.hotbarSlots
      .map((slot) => (slot ? `${slot.kind}:${slot.key}` : "-"))
      .join(",");
    const signature = `${entries
      .map((entry) => `${entry.kind}:${entry.key}:${entry.count}`)
      .join("|")}|${selected?.kind ?? ""}:${selected?.key ?? ""}|${hotbarSignature}|${this.inventory.slotsUsed()}/${this.inventory.capacity}`;

    if (signature === this.inventoryHudSignature) {
      return;
    }
    this.inventoryHudSignature = signature;

    const fragment = document.createDocumentFragment();

    for (let index = 0; index < HOTBAR_SLOT_COUNT; index += 1) {
      const entry = hotbarEntryAt(this.hotbarSlots, index, entries);

      if (!entry) {
        const empty = document.createElement("span");
        empty.className = "resource-chip hotbar-slot is-empty";
        empty.title = `Espacio ${index + 1} libre`;
        empty.dataset.hotbarSlot = String(index);
        const slot = document.createElement("span");
        slot.className = "slot-key";
        slot.textContent = String(index + 1);
        empty.append(slot);
        fragment.append(empty);
        continue;
      }

      const chip = document.createElement("span");
      const icon = document.createElement("span");
      const value = document.createElement("b");
      const tooltip = `${entry.label} \u00D7${entry.count}\n${entry.source}`;

      chip.className = "resource-chip hotbar-slot";
      if (entry.kind === "tool") {
        chip.classList.add("tool-chip");
      } else if (entry.kind === "item") {
        chip.classList.add("item-chip");
      }
      chip.classList.toggle("is-selected", index === selectedIndex);
      chip.dataset.hotbarSlot = String(index);
      chip.dataset.hotbarKind = entry.kind;
      chip.dataset.hotbarKey = entry.key;
      chip.dataset.tooltip = tooltip;
      chip.title = tooltip;
      chip.setAttribute("aria-label", tooltip.replace("\n", " · "));
      chip.style.setProperty("--resource-color", entry.color);

      const slot = document.createElement("span");
      slot.className = "slot-key";
      slot.textContent = String(index + 1);
      chip.append(slot);

      icon.className = "hotbar-icon";
      icon.textContent = entry.symbol ?? "?";
      value.textContent = String(entry.count);
      chip.append(icon, value);
      fragment.append(chip);
    }

    this.hud.inventory.replaceChildren(fragment);

    if (this.hud.hotbarInfo) {
      this.hud.hotbarInfo.textContent = selected
        ? `Seleccionado: ${selected.label} ×${selected.count}`
        : "Arrastra objetos desde la mochila a la fila rápida.";
    }

    this.renderInventoryPanel();
  }

  notify(message) {
    if (!this.hud.toast) {
      return;
    }

    this.clearToast();
    this.hud.toast.textContent = message;
    this.hud.toast.classList.add("is-visible");
    this.toastTimer = window.setTimeout(() => {
      this.hud.toast.classList.remove("is-visible");
      this.toastTimer = null;
    }, TOAST_DURATION);
  }

  clearToast() {
    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    this.hud.toast?.classList.remove("is-visible");
  }
}



