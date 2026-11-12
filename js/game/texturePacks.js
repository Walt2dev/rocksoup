import { strFromU8, strToU8, unzipSync, zipSync } from "../vendor/fflate.js";
import { BUILTIN_SKINS } from "./skins.js";
import { BUILTIN_DONKEY_SKINS } from "./donkeySkins.js";
import {
  PACK_LIMITS,
  SPRITE_DEFS,
  TERRAIN_DEFS,
  buildDefaultPackManifest,
} from "./packRegistry.js";

const DB_NAME = "rocksoup-texture-packs";
const DB_VERSION = 1;
const STORE_NAME = "packs";
export const ACTIVE_PACK_KEY = "rocksoup.activePack.v1";
export const DEFAULT_PACK_ID = "__default__";

function safeName(value, fallback = "Pack sin nombre") {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 80)
    : fallback;
}

function safePath(value) {
  if (typeof value !== "string") {
    return null;
  }
  const path = value.replace(/\\/g, "/");
  return path.length > 0 &&
    path.length <= 200 &&
    !path.includes("..") &&
    !path.startsWith("/") &&
    path.toLowerCase().endsWith(".png")
    ? path
    : null;
}

function bytesFor(files, path) {
  const entry = files[path];
  return entry instanceof Uint8Array ? entry : null;
}

async function loadBitmap(bytes) {
  const blob = new Blob([bytes], { type: "image/png" });
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(blob);
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(blob);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("PNG inválido"));
    };
    image.src = url;
  });
}

function makeExternalSprite(image, existing, pixelArt = false) {
  const logicalWidth = existing?.width ?? Math.max(1, Math.round(image.width / 2));
  const logicalHeight = existing?.height ?? Math.max(1, Math.round(image.height / 2));
  const anchorX = existing?.anchorX ?? logicalWidth / 2;
  const anchorY = existing?.anchorY ?? logicalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(logicalWidth * 2));
  canvas.height = Math.max(1, Math.round(logicalHeight * 2));
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = !pixelArt;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return {
    canvas,
    width: logicalWidth,
    height: logicalHeight,
    anchorX,
    anchorY,
  };
}

function readAt(assets, path) {
  let value = assets;
  for (const key of path) {
    value = value?.[key];
  }
  return value ?? null;
}

function writeAt(assets, path, value) {
  if (path.length === 1) {
    assets[path[0]] = value;
    return;
  }

  let target = assets;
  for (let index = 0; index < path.length - 1; index += 1) {
    if (!target[path[index]]) {
      target[path[index]] = {};
    }
    target = target[path[index]];
  }
  target[path[path.length - 1]] = value;
}

function parseManifest(files) {
  const raw = bytesFor(files, "pack.json");

  if (!raw) {
    throw new Error("El ZIP no contiene pack.json.");
  }

  let manifest;
  try {
    manifest = JSON.parse(strFromU8(raw).replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("pack.json no contiene JSON válido.");
  }

  if (!manifest || typeof manifest !== "object") {
    throw new Error("pack.json inválido.");
  }

  return manifest;
}

export async function parsePack(blob) {
  if (!(blob instanceof Blob) || blob.size > PACK_LIMITS.maxZipBytes) {
    throw new Error("El ZIP es demasiado grande.");
  }

  const rawFiles = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const uncompressedBytes = Object.values(rawFiles).reduce(
    (total, data) => total + data.length,
    0,
  );
  if (uncompressedBytes > PACK_LIMITS.maxUncompressedBytes) {
    throw new Error("El contenido descomprimido del pack es demasiado grande.");
  }
  const files = Object.fromEntries(
    Object.entries(rawFiles).map(([name, data]) => [
      name.replace(/\\/g, "/"),
      data,
    ]),
  );
  const manifest = parseManifest(files);
  const pngEntries = Object.entries(files).filter(([name]) => name.toLowerCase().endsWith(".png"));

  if (pngEntries.length > PACK_LIMITS.maxImages) {
    throw new Error("El pack tiene demasiadas imágenes.");
  }

  const images = new Map();

  for (const [name] of pngEntries) {
    const bytes = files[name];
    const image = await loadBitmap(bytes);
    if (
      image.width > PACK_LIMITS.maxImageWidth ||
      image.height > PACK_LIMITS.maxImageHeight
    ) {
      throw new Error(`${name} supera el tamaño máximo de ${PACK_LIMITS.maxImageWidth}×${PACK_LIMITS.maxImageHeight}.`);
    }
    images.set(name, image);
  }

  return {
    manifest,
    files: Object.fromEntries(pngEntries),
    images,
    name: safeName(manifest.name),
    author: safeName(manifest.author, "Anónimo"),
    version: Number.isFinite(manifest.version) ? Math.floor(manifest.version) : 1,
    pixelArt: manifest.pixelArt === true,
  };
}

export function applyPackToAssets(assets, pack) {
  const manifest = pack.manifest;
  assets.terrainTextures = assets.terrainTextures ?? {};

  const terrainManifest = manifest.terrain && typeof manifest.terrain === "object"
    ? manifest.terrain
    : {};

  for (const def of TERRAIN_DEFS) {
    const path = safePath(terrainManifest[def.id]);
    const image = path ? pack.images.get(path) : null;
    if (image) {
      assets.terrainTextures[def.biome] = image;
    }
  }

  const spriteManifest = {
    ...(manifest.buildings && typeof manifest.buildings === "object" ? manifest.buildings : {}),
    ...(manifest.objects && typeof manifest.objects === "object" ? manifest.objects : {}),
    ...(manifest.villages && typeof manifest.villages === "object" ? manifest.villages : {}),
    ...(manifest.units && typeof manifest.units === "object" ? manifest.units : {}),
    ...(manifest.animations && typeof manifest.animations === "object" ? manifest.animations : {}),
  };

  for (const def of SPRITE_DEFS) {
    const raw = spriteManifest[def.id];
    if (!raw) {
      continue;
    }

    const paths = Array.isArray(raw) ? raw : [raw];
    const frames = [];
    const existing = readAt(assets, def.path);
    const reference = Array.isArray(existing) ? existing[0] : existing;

    for (const pathValue of paths) {
      const path = safePath(pathValue);
      const image = path ? pack.images.get(path) : null;
      if (!image) {
        break;
      }
      frames.push(makeExternalSprite(image, reference, pack.pixelArt));
    }

    if (frames.length === 0) {
      continue;
    }

    if (def.frames > 1) {
      writeAt(assets, def.path, frames);
    } else {
      writeAt(assets, def.path, frames[0]);
    }
  }

  const characterManifest =
    manifest.characters && typeof manifest.characters === "object"
      ? manifest.characters
      : {};
  const explorerReference = assets.playerSkins?.explorer?.frames?.[0] ?? null;

  for (const [rawId, rawEntry] of Object.entries(characterManifest)) {
    if (
      !rawEntry ||
      typeof rawEntry !== "object" ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(rawId)
    ) {
      continue;
    }
    const frames = [];

    for (const pathValue of Array.isArray(rawEntry.frames) ? rawEntry.frames : []) {
      const path = safePath(pathValue);
      const image = path ? pack.images.get(path) : null;
      if (!image) {
        break;
      }
      frames.push(makeExternalSprite(image, explorerReference, pack.pixelArt));
    }

    if (frames.length !== 3) {
      continue;
    }

    const builtin = BUILTIN_SKINS.find((skin) => skin.id === rawId);
    assets.playerSkins[rawId] = {
      id: rawId,
      archetype: rawEntry.archetype ?? builtin?.archetype ?? "explorer",
      name: safeName(rawEntry.name, builtin?.name ?? rawId),
      description: safeName(
        rawEntry.description,
        builtin?.description ?? "Skin personalizada.",
      ),
      color: typeof rawEntry.color === "string" ? rawEntry.color : builtin?.color ?? "#e0a458",
      frames,
      custom: !builtin,
    };
  }

  const donkeyManifest =
    manifest.donkeys && typeof manifest.donkeys === "object"
      ? manifest.donkeys
      : {};
  const donkeyReference = assets.donkeySkins?.gris?.frames?.[0] ?? null;

  for (const [rawId, rawEntry] of Object.entries(donkeyManifest)) {
    if (
      !rawEntry ||
      typeof rawEntry !== "object" ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(rawId)
    ) {
      continue;
    }
    const frames = [];

    for (const pathValue of Array.isArray(rawEntry.frames) ? rawEntry.frames : []) {
      const path = safePath(pathValue);
      const image = path ? pack.images.get(path) : null;
      if (!image) {
        break;
      }
      frames.push(makeExternalSprite(image, donkeyReference, pack.pixelArt));
    }

    if (frames.length !== 3) {
      continue;
    }

    const builtin = BUILTIN_DONKEY_SKINS.find((skin) => skin.id === rawId);
    assets.donkeySkins[rawId] = {
      ...(builtin ?? {}),
      id: rawId,
      name: safeName(rawEntry.name, builtin?.name ?? rawId),
      description: safeName(
        rawEntry.description,
        builtin?.description ?? "Skin de burro personalizada.",
      ),
      frames,
      custom: !builtin,
    };
  }

  const riderManifest =
    manifest.riders && typeof manifest.riders === "object"
      ? manifest.riders
      : {};
  const riderReference =
    assets.riderSkins?.explorer?.[0] ??
    assets.playerSkins?.explorer?.frames?.[0] ??
    null;
  assets.riderSkins = assets.riderSkins ?? {};

  for (const [rawId, rawEntry] of Object.entries(riderManifest)) {
    if (
      !rawEntry ||
      typeof rawEntry !== "object" ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(rawId)
    ) {
      continue;
    }
    const frames = [];

    for (const pathValue of Array.isArray(rawEntry.frames) ? rawEntry.frames : []) {
      const path = safePath(pathValue);
      const image = path ? pack.images.get(path) : null;
      if (!image) {
        break;
      }
      frames.push(makeExternalSprite(image, riderReference, pack.pixelArt));
    }

    if (frames.length !== 3) {
      continue;
    }

    assets.riderSkins[rawId] = frames;
  }

  assets.playerSprites = assets.playerSkins.explorer.frames;
  assets.packInfo = {
    name: pack.name,
    author: pack.author,
    version: pack.version,
    pixelArt: pack.pixelArt,
  };
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, callback) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = callback(store);
    let result;
    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getDefaultPackSummary() {
  try {
    const record = await withStore("readonly", (store) =>
      store.get(DEFAULT_PACK_ID),
    );
    if (!record) {
      return { fileNames: [], size: 0 };
    }
    return {
      fileNames: Array.isArray(record.fileNames) ? record.fileNames : [],
      size: record.size ?? 0,
    };
  } catch {
    return { fileNames: [], size: 0 };
  }
}

export async function uploadDefaultPackFiles(pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return { fileNames: [], size: 0 };
  }

  const previous = await withStore("readonly", (store) =>
    store.get(DEFAULT_PACK_ID),
  );
  const files = {};

  if (previous?.blob) {
    try {
      const rawFiles = unzipSync(
        new Uint8Array(await previous.blob.arrayBuffer()),
      );
      for (const [name, data] of Object.entries(rawFiles)) {
        const normalized = name.replace(/\\/g, "/");
        if (normalized.toLowerCase().endsWith(".png")) {
          files[normalized] = data;
        }
      }
    } catch {
      // Si el pack anterior está corrupto, se reconstruye.
    }
  }

  for (const entry of pairs) {
    const path = safePath(entry?.path);
    if (!path || !(entry.file instanceof Blob)) {
      continue;
    }
    if (entry.file.size > PACK_LIMITS.maxZipBytes) {
      throw new Error(`${path} es demasiado grande.`);
    }

    const bytes = new Uint8Array(await entry.file.arrayBuffer());
    const image = await loadBitmap(bytes);
    if (
      image.width > PACK_LIMITS.maxImageWidth ||
      image.height > PACK_LIMITS.maxImageHeight
    ) {
      throw new Error(
        `${path} supera ${PACK_LIMITS.maxImageWidth}×${PACK_LIMITS.maxImageHeight}.`,
      );
    }
    files[path] = bytes;
  }

  files["pack.json"] = strToU8(
    JSON.stringify(buildDefaultPackManifest()),
  );
  const blob = new Blob([zipSync(files, { level: 6 })], {
    type: "application/zip",
  });
  const record = {
    id: DEFAULT_PACK_ID,
    name: "Pack por defecto",
    author: "Local",
    size: blob.size,
    createdAt: Date.now(),
    blob,
    fileNames: Object.keys(files)
      .filter((name) => name.toLowerCase().endsWith(".png"))
      .sort(),
  };
  await withStore("readwrite", (store) => store.put(record));
  return { fileNames: record.fileNames, size: record.size };
}

export async function clearDefaultPack() {
  await withStore("readwrite", (store) => store.delete(DEFAULT_PACK_ID));
}

export async function loadDefaultPack(assets) {
  try {
    const record = await withStore("readonly", (store) =>
      store.get(DEFAULT_PACK_ID),
    );
    if (!record?.blob) {
      return null;
    }
    const pack = await parsePack(record.blob);
    applyPackToAssets(assets, pack);
    return pack;
  } catch (error) {
    console.warn("[Packs] No se pudo cargar el pack por defecto:", error.message);
    return null;
  }
}

export async function listInstalledPacks() {
  try {
    const records = await withStore("readonly", (store) => store.getAll());
    return records
      .filter((record) => record.id !== DEFAULT_PACK_ID)
      .map((record) => ({
      id: record.id,
      name: record.name,
      author: record.author,
      size: record.size,
      createdAt: record.createdAt,
    }));
  } catch {
    return [];
  }
}

export async function installPack(file) {
  const pack = await parsePack(file);
  const record = {
    id: globalThis.crypto?.randomUUID?.() ?? `pack-${Date.now()}`,
    name: pack.name,
    author: pack.author,
    size: file.size,
    createdAt: Date.now(),
    blob: file,
  };
  await withStore("readwrite", (store) => store.put(record));
  return { id: record.id, name: record.name, author: record.author };
}

export async function deleteInstalledPack(id) {
  await withStore("readwrite", (store) => store.delete(id));
  if (getActivePackId() === id) {
    setActivePackId(null);
  }
}

export function getActivePackId() {
  try {
    return window.localStorage.getItem(ACTIVE_PACK_KEY);
  } catch {
    return null;
  }
}

export function setActivePackId(id) {
  try {
    if (id) {
      window.localStorage.setItem(ACTIVE_PACK_KEY, id);
    } else {
      window.localStorage.removeItem(ACTIVE_PACK_KEY);
    }
  } catch {
    // Almacenamiento bloqueado.
  }
}

export async function loadActivePack(assets) {
  const id = getActivePackId();
  if (!id) {
    return null;
  }

  try {
    const record = await withStore("readonly", (store) => store.get(id));
    if (!record?.blob) {
      return null;
    }
    const pack = await parsePack(record.blob);
    applyPackToAssets(assets, pack);
    return pack;
  } catch (error) {
    console.warn("[Packs] No se pudo cargar el pack activo:", error.message);
    return null;
  }
}
