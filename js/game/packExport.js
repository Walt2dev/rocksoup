import { strToU8, zipSync } from "../vendor/fflate.js";
import {
  ANIMATION_DEFS,
  CHARACTER_DEFS,
  DONKEY_DEFS,
  FIEF_BUILDING_DEFS,
  FIEF_UNIT_DEFS,
  RIDER_DEFS,
  SPRITE_DEFS,
  VILLAGE_DEFS,
} from "./packRegistry.js";

function readAt(assets, path) {
  let value = assets;
  for (const key of path) {
    value = value?.[key];
  }
  return value ?? null;
}

function frameFiles(def) {
  if (def.frames === 1) {
    return [def.file];
  }
  const stem = def.file.replace(/\.png$/i, "");
  return Array.from({ length: def.frames }, (_, index) => `${stem}_${index}.png`);
}

function sectionForFile(file) {
  if (file.startsWith("buildings/")) return "buildings";
  if (file.startsWith("villages/")) return "villages";
  if (file.startsWith("units/")) return "units";
  if (file.startsWith("animations/")) return "animations";
  return "objects";
}

function extraSpriteDefs() {
  return [
    ...VILLAGE_DEFS,
    ...FIEF_BUILDING_DEFS,
    ...FIEF_UNIT_DEFS,
    ...ANIMATION_DEFS,
  ].map(([id, file, path, frames, label, width, height]) => ({
    id,
    file,
    path,
    frames,
    label,
    width,
    height,
    section: sectionForFile(file),
  }));
}

function buildingCoreDefs() {
  return SPRITE_DEFS.filter(
    (def) => def.id === "university" || def.id === "observatory",
  );
}

function selectedCharacter(id) {
  return CHARACTER_DEFS.find((def) => def.id === id) ?? null;
}

function selectedDonkey(id) {
  return DONKEY_DEFS.find((def) => def.id === id) ?? null;
}

function selectedRider(id) {
  return RIDER_DEFS.find((def) => def.id === id) ?? null;
}

export function buildAnimationPackManifest() {
  const manifest = {
    name: "Pack de animación Rocksoup",
    version: 1,
    author: "DracxGames",
    pixelArt: false,
    terrain: {},
    buildings: {},
    objects: {},
    villages: {},
    units: {},
    animations: {},
    characters: {},
    donkeys: {},
    riders: {},
  };

  for (const def of [...extraSpriteDefs(), ...buildingCoreDefs()]) {
    const files = frameFiles(def);
    manifest[def.section][def.id] =
      def.frames === 1 ? def.file : files;
  }

  const character = selectedCharacter("explorer");
  if (character) {
    manifest.characters.explorer = {
      name: character.label,
      frames: [...character.files],
    };
  }

  const donkey = selectedDonkey("gris");
  if (donkey) {
    manifest.donkeys.gris = {
      name: donkey.label,
      frames: [...donkey.files],
    };
  }

  const rider = selectedRider("explorer");
  if (rider) {
    manifest.riders.explorer = {
      name: rider.label,
      frames: [...rider.files],
    };
  }

  return manifest;
}

function canvasToPng(sprite) {
  return new Promise((resolve, reject) => {
    if (!sprite?.canvas) {
      resolve(null);
      return;
    }
    sprite.canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("No se pudo convertir un sprite a PNG."));
        return;
      }
      blob
        .arrayBuffer()
        .then((buffer) => resolve(new Uint8Array(buffer)))
        .catch(reject);
    }, "image/png");
  });
}

function framesFor(assets, path) {
  const value = readAt(assets, path);
  if (Array.isArray(value)) {
    return value;
  }
  return value ? [value] : [];
}

async function addSpriteFiles(files, assets, def) {
  const spriteFrames = framesFor(assets, def.path);
  const paths = frameFiles(def);
  for (let index = 0; index < paths.length; index += 1) {
    const sprite = spriteFrames[index];
    if (!sprite) {
      continue;
    }
    const bytes = await canvasToPng(sprite);
    if (bytes) {
      files[paths[index]] = bytes;
    }
  }
}

async function addFrames(files, frames, paths) {
  for (let index = 0; index < paths.length; index += 1) {
    const sprite = frames[index];
    if (!sprite) {
      continue;
    }
    const bytes = await canvasToPng(sprite);
    if (bytes) {
      files[paths[index]] = bytes;
    }
  }
}

export async function exportAnimationPack(assets) {
  const manifest = buildAnimationPackManifest();
  const files = {};

  for (const def of [...extraSpriteDefs(), ...buildingCoreDefs()]) {
    await addSpriteFiles(files, assets, def);
  }

  const character = selectedCharacter("explorer");
  if (character) {
    await addFrames(
      files,
      assets.playerSkins?.explorer?.frames ?? [],
      character.files,
    );
  }

  const donkey = selectedDonkey("gris");
  if (donkey) {
    await addFrames(
      files,
      assets.donkeySkins?.gris?.frames ?? [],
      donkey.files,
    );
  }

  const rider = selectedRider("explorer");
  if (rider) {
    await addFrames(
      files,
      assets.riderSkins?.explorer ?? [],
      rider.files,
    );
  }

  files["pack.json"] = strToU8(JSON.stringify(manifest, null, 2));
  files["README.txt"] = strToU8(
    [
      "Pack de animación de Rocksoup",
      "",
      "Incluye: personaje explorador, jinete, burro gris, lobo, casas de aldea,",
      "chamán, edificios del feudo, universidad, observatorio y unidades.",
      "",
      "Cómo editar:",
      "1. Abre los PNG manteniendo el mismo nombre y número de frames.",
      "2. No cambies la estructura de carpetas.",
      "3. Comprime de nuevo la carpeta con pack.json en la raíz.",
      "4. Sube el ZIP desde Personalización y packs > Subir pack .zip.",
      "",
      "Los sprites de animación usan _0.png, _1.png y _2.png.",
      "Los edificios y unidades son una sola imagen PNG.",
      "",
    ].join("\n"),
  );

  const zip = zipSync(files, { level: 6 });
  return {
    blob: new Blob([zip], { type: "application/zip" }),
    manifest,
    fileNames: Object.keys(files).sort(),
  };
}
