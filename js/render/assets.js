import { BUILTIN_SKINS } from "../game/skins.js";
import { BUILTIN_DONKEY_SKINS } from "../game/donkeySkins.js";
import { MINERAL_TYPES, MINERAL_VARIANTS } from "../world/minerals.js";
import { TREE_VARIANTS } from "../world/vegetation.js";
import {
  createAmbientSprites,
  createBedSprites,
  createBrewingTableSprites,
  createBushSprites,
  createCutGrassSprites,
  createDonkeySprites,
  createDryBushSprites,
  createDryGrassSprites,
  createFiefSprites,
  createGrassSprites,
  createLushGrassSprites,
  createJungleBushSprites,
  createPickedDryBushSprites,
  createPickedJungleBushSprites,
  createChestSprites,
  createCauldronSprites,
  createFenceSprites,
  createCampfireSprites,
  createTorchSprites,
  createUniversitySprites,
  createWallSprites,
  createOvenSprites,
  createObservatorySprites,
  createPickedBushSprites,
  createPlayerSprites,
  createRiderSprites,
  createTipiSprites,
  createVillageSprites,
  createWorkerSprites,
  createWolfDenSprites,
  createWolfTotemSprites,
} from "./entitySprites.js";
import { createMineralSprite } from "./mineralSprites.js";
import { createTreeSprite, TREE_STYLES } from "./treeSprites.js";

const BOOT_SEED = "DracxGames:rocksoup:v1";
const MIN_LOAD_MS = 1750;
const SKIN_FILE_PREFIX = Object.freeze({
  explorer: "explorer",
  artist: "artist",
  mage: "mago",
  warrior: "warrior",
});

function nextFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`No se pudo cargar ${url}`));
    image.src = url;
  });
}

function createIllustratedSprite(image, reference) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(reference.width * 2));
  canvas.height = Math.max(1, Math.round(reference.height * 2));
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.drawImage(
    image,
    (canvas.width - width) / 2,
    canvas.height - height,
    width,
    height,
  );
  return {
    canvas,
    width: reference.width,
    height: reference.height,
    anchorX: reference.anchorX,
    anchorY: reference.anchorY,
  };
}

export async function loadAssets(onProgress = () => {}) {
  const startedAt = performance.now();
  const report = (progress, label) => {
    onProgress(Math.min(1, Math.max(0, progress)), label);
  };

  report(0.02, "Encendiendo la fogata...");
  await nextFrame();

  const treeSprites = [];
  const totalTrees = TREE_STYLES.length * TREE_VARIANTS;
  let treesDone = 0;

  for (let species = 0; species < TREE_STYLES.length; species += 1) {
    const variants = [];
    for (let variant = 0; variant < TREE_VARIANTS; variant += 1) {
      variants.push(createTreeSprite(species, variant, BOOT_SEED));
      treesDone += 1;
      report(0.04 + (treesDone / totalTrees) * 0.56, `Plantando árboles... ${treesDone}/${totalTrees}`);
      await nextFrame();
    }
    treeSprites.push(variants);
  }

  report(0.61, "Cultivando arbustos...");
  const bushSprites = createBushSprites();
  const pickedBushSprites = createPickedBushSprites();
  const grassSprites = createGrassSprites();
  const lushGrassSprites = createLushGrassSprites();
  const dryGrassSprites = createDryGrassSprites();
  const cutGrassSprites = createCutGrassSprites();
  const dryBushSprites = createDryBushSprites();
  const pickedDryBushSprites = createPickedDryBushSprites();
  const jungleBushSprites = createJungleBushSprites();
  const pickedJungleBushSprites = createPickedJungleBushSprites();
  await nextFrame();

  const mineralSprites = [];
  const totalMinerals = MINERAL_TYPES.length * MINERAL_VARIANTS;
  let mineralsDone = 0;

  for (let type = 0; type < MINERAL_TYPES.length; type += 1) {
    const variants = [];
    for (let variant = 0; variant < MINERAL_VARIANTS; variant += 1) {
      variants.push(createMineralSprite(type, variant, BOOT_SEED));
      mineralsDone += 1;
      report(0.62 + (mineralsDone / totalMinerals) * 0.2, `Puliendo piedras... ${mineralsDone}/${totalMinerals}`);
      await nextFrame();
    }
    mineralSprites.push(variants);
  }

  report(0.85, "Vistiendo al viajero...");
  const playerSkins = {};
  for (const skin of BUILTIN_SKINS) {
    playerSkins[skin.id] = {
      ...skin,
      frames: createPlayerSprites(skin.archetype),
      custom: false,
    };
  }
  for (const skin of BUILTIN_SKINS) {
    const prefix = SKIN_FILE_PREFIX[skin.id];
    if (!prefix) {
      continue;
    }

    try {
      const reference = playerSkins[skin.id].frames[0];
      const frames = await Promise.all(
        [0, 1, 2].map(async (index) => {
          const url = new URL(
            `../../characters/${prefix}_${index}.png`,
            import.meta.url,
          ).href;
          const image = await loadImage(url);
          return createIllustratedSprite(image, reference);
        }),
      );
      playerSkins[skin.id].frames = frames;
      playerSkins[skin.id].illustrated = true;
    } catch (error) {
      console.warn(
        `[Assets] Se usará ${skin.id} procedural:`,
        error.message,
      );
    }
  }

  const donkeySkins = {};
  for (const skin of BUILTIN_DONKEY_SKINS) {
    donkeySkins[skin.id] = {
      ...skin,
      frames: createDonkeySprites(skin),
      custom: false,
    };
  }

  const riderSkins = {};
  for (const skin of BUILTIN_SKINS) {
    riderSkins[skin.id] = createRiderSprites(skin.archetype);
  }

  const playerSprites = playerSkins.explorer.frames;
  await nextFrame();

  report(0.88, "Despertando duendes...");
  const workerSprites = createWorkerSprites();
  await nextFrame();

  report(0.91, "Llamando a la fauna...");
  const ambientSprites = createAmbientSprites();
  await nextFrame();

  report(0.94, "Encendiendo fogatas...");
  const campfireSprites = createCampfireSprites();
  await nextFrame();

  report(0.96, "Construyendo estaciones...");
  const ovenSprites = createOvenSprites();
  const brewingTableSprites = createBrewingTableSprites();
  const chestSprites = createChestSprites();
  const tipiSprites = createTipiSprites();
  const fenceSprites = createFenceSprites();
  const torchSprites = createTorchSprites();
  const wallSprites = createWallSprites();
  const bedSprites = createBedSprites();
  const cauldronSprites = createCauldronSprites();
  const universitySprites = createUniversitySprites();
  const observatorySprites = createObservatorySprites();
  const villageSprites = createVillageSprites();
  const fiefSprites = createFiefSprites();
  const wolfDenSprites = createWolfDenSprites();
  const wolfTotemSprites = createWolfTotemSprites();
  await nextFrame();

  report(0.98, "Sirviendo el caldo...");
  const remaining = MIN_LOAD_MS - (performance.now() - startedAt);
  if (remaining > 0) {
    await wait(remaining);
  }
  report(1, "Todo listo");

  return {
    treeSprites,
    bushSprites,
    pickedBushSprites,
    grassSprites,
    lushGrassSprites,
    dryGrassSprites,
    cutGrassSprites,
    dryBushSprites,
    pickedDryBushSprites,
    jungleBushSprites,
    pickedJungleBushSprites,
    mineralSprites,
    playerSprites,
    playerSkins,
    donkeySkins,
    riderSkins,
    terrainTextures: {},
    workerSprites,
    ambientSprites,
    campfireSprites,
    ovenSprites,
    brewingTableSprites,
    chestSprites,
    tipiSprites,
    fenceSprites,
    torchSprites,
    wallSprites,
    bedSprites,
    cauldronSprites,
    universitySprites,
    observatorySprites,
    villageSprites,
    fiefSprites,
    wolfDenSprites,
    wolfTotemSprites,
    bootSeed: BOOT_SEED,
  };
}
