import { MINERAL_TYPES } from "../world/minerals.js";

export const PACK_LIMITS = Object.freeze({
  maxZipBytes: 25 * 1024 * 1024,
  maxUncompressedBytes: 80 * 1024 * 1024,
  maxImages: 240,
  maxImageWidth: 512,
  maxImageHeight: 512,
});

export const TERRAIN_DEFS = Object.freeze([
  Object.freeze({ id: "water", biome: 0, file: "terrain/water.png", label: "Agua", width: 128, height: 64 }),
  Object.freeze({ id: "sand", biome: 1, file: "terrain/sand.png", label: "Arena / playa", width: 128, height: 64 }),
  Object.freeze({ id: "grass", biome: 2, file: "terrain/grass.png", label: "Pasto", width: 128, height: 64 }),
  Object.freeze({ id: "forest", biome: 3, file: "terrain/forest.png", label: "Bosque", width: 128, height: 64 }),
  Object.freeze({ id: "rock", biome: 4, file: "terrain/rock.png", label: "Roca", width: 128, height: 64 }),
  Object.freeze({ id: "snow", biome: 5, file: "terrain/snow.png", label: "Nieve", width: 128, height: 64 }),
  Object.freeze({ id: "desert", biome: 6, file: "terrain/desert.png", label: "Desierto", width: 128, height: 64 }),
  Object.freeze({ id: "jungle", biome: 7, file: "terrain/jungle.png", label: "Selva", width: 128, height: 64 }),
]);

const BUILDING_DEFS = [
  ["university", "buildings/university.png", ["universitySprites", 0], 1, "Universidad", 224, 208],
  ["observatory", "buildings/observatory.png", ["observatorySprites", 0], 1, "Observatorio", 144, 184],
  ["campfire", "buildings/campfire.png", ["campfireSprites"], 2, "Fogata", 128, 128],
  ["oven", "buildings/oven.png", ["ovenSprites"], 2, "Horno", 92, 100],
  ["brewingTable", "buildings/brewing_table.png", ["brewingTableSprites", 0], 1, "Mesa de brebajes", 92, 88],
  ["chest", "buildings/chest.png", ["chestSprites", 0], 1, "Cofre", 88, 68],
  ["tipi", "buildings/tipi.png", ["tipiSprites", 0], 1, "Tipi", 120, 128],
  ["fence", "buildings/fence.png", ["fenceSprites", 0], 1, "Valla", 88, 64],
  ["torch", "buildings/torch.png", ["torchSprites", 0], 1, "Antorcha", 44, 88],
  ["wall", "buildings/wall.png", ["wallSprites", 0], 1, "Muro", 96, 80],
  ["bed", "buildings/bed.png", ["bedSprites", 0], 1, "Cama", 104, 64],
  ["cauldron", "buildings/cauldron.png", ["cauldronSprites", 0], 1, "Caldero", 92, 84],
];

const TREE_KEYS = ["roble", "pino", "ceiba", "cactus"];
const BUSH_DEFS = [
  ["bush_normal", "objects/bush_normal.png", ["bushSprites"], 3, "Arbusto", 68, 60],
  ["bush_normal_picked", "objects/bush_normal_picked.png", ["pickedBushSprites"], 2, "Arbusto recogido", 68, 60],
  ["bush_dry", "objects/bush_dry.png", ["dryBushSprites"], 2, "Arbusto seco", 68, 60],
  ["bush_dry_picked", "objects/bush_dry_picked.png", ["pickedDryBushSprites"], 2, "Arbusto seco recogido", 68, 60],
  ["bush_jungle", "objects/bush_jungle.png", ["jungleBushSprites"], 3, "Arbusto de selva", 68, 60],
  ["bush_jungle_picked", "objects/bush_jungle_picked.png", ["pickedJungleBushSprites"], 2, "Arbusto de selva recogido", 68, 60],
];

const TREE_DEFS = [];
for (let species = 0; species < TREE_KEYS.length; species += 1) {
  for (let variant = 0; variant < 6; variant += 1) {
    TREE_DEFS.push([
      `tree_${TREE_KEYS[species]}_${variant}`,
      `objects/tree_${TREE_KEYS[species]}_${variant}.png`,
      ["treeSprites", species, variant],
      1,
      `Árbol ${TREE_KEYS[species]} ${variant + 1}`,
      192,
      384,
    ]);
  }
}

const MINERAL_DEFS = [];
for (let type = 0; type < MINERAL_TYPES.length; type += 1) {
  for (let variant = 0; variant < 2; variant += 1) {
    MINERAL_DEFS.push([
      `mineral_${MINERAL_TYPES[type].key}_${variant}`,
      `objects/mineral_${MINERAL_TYPES[type].key}_${variant}.png`,
      ["mineralSprites", type, variant],
      1,
      `Mineral ${MINERAL_TYPES[type].name} ${variant + 1}`,
      80,
      68,
    ]);
  }
}

export const SPRITE_DEFS = Object.freeze(
  [...BUILDING_DEFS, ...BUSH_DEFS, ...TREE_DEFS, ...MINERAL_DEFS].map(
    ([id, file, path, frames, label, width, height]) =>
      Object.freeze({
        id,
        file,
        path: Object.freeze(path),
        frames,
        label,
        width,
        height,
      }),
  ),
);

const DONKEY_LABELS = Object.freeze(["Gris", "Castaño", "Pinto"]);
const CHARACTER_LABELS = Object.freeze([
  "Explorador",
  "Artista",
  "Mago",
  "Guerrero",
]);

export const DONKEY_DEFS = Object.freeze(
  ["gris", "castano", "pinto"].map((id, index) =>
    Object.freeze({
      id,
      label: DONKEY_LABELS[index] ?? id,
      files: Object.freeze([
        `donkeys/${id}_0.png`,
        `donkeys/${id}_1.png`,
        `donkeys/${id}_2.png`,
      ]),
      width: 128,
      height: 96,
    }),
  ),
);

export const CHARACTER_DEFS = Object.freeze(
  ["explorer", "artist", "mage", "warrior"].map((id, index) =>
    Object.freeze({
      id,
      label: CHARACTER_LABELS[index] ?? id,
      files: Object.freeze([
        `characters/${id}_0.png`,
        `characters/${id}_1.png`,
        `characters/${id}_2.png`,
      ]),
      width: 128,
      height: 192,
    }),
  ),
);

function spriteFrameFiles(def) {
  if (def.frames === 1) {
    return [def.file];
  }

  const stem = def.file.replace(/\.png$/i, "");
  return Array.from(
    { length: def.frames },
    (_, index) => `${stem}_${index}.png`,
  );
}

export function getDefaultPackAssetEntries() {
  const entries = [];

  for (const def of TERRAIN_DEFS) {
    entries.push({
      path: def.file,
      label: def.label,
      category: "Terreno",
      frame: null,
    });
  }

  for (const def of SPRITE_DEFS) {
    const files = spriteFrameFiles(def);
    files.forEach((path, index) => {
      entries.push({
        path,
        label: def.frames > 1 ? `${def.label} (${index + 1}/${files.length})` : def.label,
        category: def.file.startsWith("buildings/") ? "Edificios" : "Objetos",
        frame: def.frames > 1 ? index : null,
      });
    });
  }

  for (const def of CHARACTER_DEFS) {
    def.files.forEach((path, index) => {
      entries.push({
        path,
        label: `Personaje ${def.label} (${index + 1}/3)`,
        category: "Personajes",
        frame: index,
      });
    });
  }

  for (const def of DONKEY_DEFS) {
    def.files.forEach((path, index) => {
      entries.push({
        path,
        label: `Burro ${def.label} (${index + 1}/3)`,
        category: "Burros",
        frame: index,
      });
    });
  }

  return entries;
}

export function buildDefaultPackManifest() {
  const manifest = {
    name: "Pack por defecto",
    version: 1,
    author: "Local",
    pixelArt: false,
    terrain: {},
    buildings: {},
    objects: {},
    characters: {},
    donkeys: {},
  };

  for (const def of TERRAIN_DEFS) {
    manifest.terrain[def.id] = def.file;
  }

  for (const def of SPRITE_DEFS) {
    const target = def.file.startsWith("buildings/")
      ? manifest.buildings
      : manifest.objects;
    target[def.id] = def.frames === 1 ? def.file : spriteFrameFiles(def);
  }

  for (const def of CHARACTER_DEFS) {
    manifest.characters[def.id] = {
      name: def.label,
      frames: [...def.files],
    };
  }

  for (const def of DONKEY_DEFS) {
    manifest.donkeys[def.id] = {
      name: def.label,
      frames: [...def.files],
    };
  }

  return manifest;
}

function spriteAt(assets, path) {
  let value = assets;
  for (const key of path) {
    value = value?.[key];
  }
  return value ?? null;
}

export function getPackReference(assets = null) {
  const rows = [
    ...TERRAIN_DEFS.map((def) => ({
      file: def.file,
      label: def.label,
      resolution: `${def.width}×${def.height}`,
      frames: 1,
    })),
    ...BUILDING_DEFS.map(([id, file, path, frames, label, width, height]) => {
      const current = assets ? spriteAt(assets, path) : null;
      const frame = Array.isArray(current) ? current[0] : current;
      return {
        file,
        label,
        resolution: `${Math.round((frame?.width ?? width / 2) * 2)}×${Math.round((frame?.height ?? height / 2) * 2)}`,
        frames,
      };
    }),
    ...TREE_DEFS.map(([id, file, path, frames, label]) => {
      const current = assets ? spriteAt(assets, path) : null;
      return {
        file,
        label,
        resolution: current
          ? `${Math.round(current.width * 2)}×${Math.round(current.height * 2)}`
          : "2× el sprite actual",
        frames,
      };
    }),
    ...BUSH_DEFS.map(([id, file, path, frames, label, width, height]) => {
      const current = assets ? spriteAt(assets, path) : null;
      const frame = Array.isArray(current) ? current[0] : current;
      return {
        file,
        label,
        resolution: `${Math.round((frame?.width ?? width / 2) * 2)}×${Math.round((frame?.height ?? height / 2) * 2)}`,
        frames,
      };
    }),
    ...MINERAL_DEFS.map(([id, file, path, frames, label, width, height]) => {
      const current = assets ? spriteAt(assets, path) : null;
      return {
        file,
        label,
        resolution: `${Math.round((current?.width ?? width / 2) * 2)}×${Math.round((current?.height ?? height / 2) * 2)}`,
        frames,
      };
    }),
    ...CHARACTER_DEFS.map((def) => ({
      file: def.files[0].replace("_0.png", "_0.png / _1.png / _2.png"),
      label: `Personaje ${def.label}`,
      resolution: `${def.width}×${def.height}`,
      frames: 3,
    })),
    ...DONKEY_DEFS.map((def) => ({
      file: def.files[0].replace("_0.png", "_0.png / _1.png / _2.png"),
      label: `Burro ${def.label}`,
      resolution: `${def.width}×${def.height}`,
      frames: 3,
    })),
  ];

  return rows;
}
