import {
  ITEM_INFO,
  RESOURCE_INFO,
  TOOL_INFO,
  TOOL_KEYS,
  UPGRADE_INFO,
} from "../js/game/inventory.js";
import {
  CRAFT_RECIPES,
  applyCraftingContentOverrides,
} from "../js/game/crafting.js";
import {
  ECONOMY_PRODUCTS,
  applyStoreContentOverrides,
} from "../js/game/economy.js";
import { applyInventoryContentOverrides } from "../js/game/inventory.js";
import {
  CONTENT_FIELDS,
  CONTENT_KINDS,
  CONTENT_META,
  normalizeColorValue,
  normalizeNumberValue,
  normalizeTextValue,
} from "../js/game/contentSchema.js";
import { sourceFor } from "../js/game/resourceSources.js";
import { sanitizeGrants } from "./grants.mjs";

const MAX_SPRITE_BYTES = 1536 * 1024;
const MAX_SPRITE_SIZE = 512;
const DEFAULT_SETTINGS = Object.freeze({
  directionalSkinsEnabled: false,
});

function nowMs() {
  return Date.now();
}

function parseJson(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function httpError(message, status = 400, extra = {}) {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
}

function spriteUrl(kind, id, updatedAt) {
  return `/api/content/sprites/${encodeURIComponent(kind)}/${encodeURIComponent(id)}/0.png?v=${Number(updatedAt) || 0}`;
}

function pngInfo(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 24) {
    return null;
  }
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let index = 0; index < signature.length; index += 1) {
    if (buffer[index] !== signature[index]) {
      return null;
    }
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (
    width <= 0 ||
    height <= 0 ||
    width > MAX_SPRITE_SIZE ||
    height > MAX_SPRITE_SIZE
  ) {
    return null;
  }
  return { width, height };
}

function decodeSprite(input) {
  const raw = typeof input === "string" ? input : input?.dataUrl ?? input?.base64;
  if (typeof raw !== "string" || raw.length === 0) {
    throw httpError("Falta la imagen PNG", 400);
  }
  const base64 = raw.startsWith("data:")
    ? raw.replace(/^data:image\/png;base64,/i, "")
    : raw;
  if (!/^[a-zA-Z0-9+/=\s]+$/.test(base64)) {
    throw httpError("La imagen no es un PNG válido", 400);
  }
  const buffer = Buffer.from(base64.replace(/\s+/g, ""), "base64");
  if (buffer.length === 0 || buffer.length > MAX_SPRITE_BYTES) {
    throw httpError("El PNG supera el tamaño máximo de 1.5 MB", 413);
  }
  const info = pngInfo(buffer);
  if (!info) {
    throw httpError("El PNG debe medir como máximo 512×512", 400);
  }
  return { buffer, ...info };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeJsonField(value, fallback = null) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      throw httpError("JSON inválido", 400);
    }
  }
  return value;
}

function normalizeCosts(value) {
  const source = normalizeJsonField(value, {});
  if (!isPlainObject(source)) {
    throw httpError("Los costes deben ser un objeto JSON válido", 400);
  }
  const costs = {};
  for (const [key, amount] of Object.entries(source)) {
    const safeKey = String(key).slice(0, 32);
    const safeAmount = Math.floor(Number(amount));
    if (!(safeKey in RESOURCE_INFO)) {
      throw httpError(`Recurso desconocido en costes: ${safeKey}`, 400);
    }
    if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
      throw httpError(`Cantidad inválida para ${safeKey}`, 400);
    }
    costs[safeKey] = Math.min(9999, safeAmount);
  }
  return costs;
}

function normalizeHighlights(value) {
  const source = normalizeJsonField(value, []);
  if (!Array.isArray(source)) {
    throw httpError("Los destacados deben ser una lista JSON", 400);
  }
  return source
    .map((entry) => normalizeTextValue(entry, 80))
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeGrants(value, { allowEmpty = true } = {}) {
  if (value === null || value === undefined || value === "") {
    return allowEmpty ? {} : null;
  }
  const parsed = normalizeJsonField(value, {});
  const clean = sanitizeGrants(parsed);
  if (!allowEmpty && Object.keys(clean).length === 0) {
    return null;
  }
  return clean;
}

function buildDefaults() {
  const resources = {};
  for (const [key, info] of Object.entries(RESOURCE_INFO)) {
    resources[key] = {
      label: info.label,
      color: info.color,
      symbol: info.symbol,
      description: "",
      source: sourceFor("resource", key),
      active: true,
    };
  }

  const items = {};
  for (const [key, info] of Object.entries(ITEM_INFO)) {
    items[key] = {
      label: info.label,
      symbol: info.symbol,
      description: sourceFor("item", key),
      active: true,
    };
  }

  const tools = {};
  for (const [key, info] of Object.entries(TOOL_INFO)) {
    tools[key] = {
      label: info.label,
      short: info.short,
      symbol: info.symbol,
      description: sourceFor("tool", key),
      active: true,
    };
  }

  const upgrades = {};
  for (const [key, info] of Object.entries(UPGRADE_INFO)) {
    upgrades[key] = {
      label: info.label,
      description: "",
      active: true,
    };
  }

  const recipes = {};
  for (const recipe of CRAFT_RECIPES) {
    recipes[recipe.id] = {
      name: recipe.name,
      description: recipe.description,
      category: recipe.category,
      costs: { ...(recipe.costs ?? {}) },
      amount: Number(recipe.amount) || 1,
      requiresTool: recipe.requiresTool ?? "",
      requiresWolfMission: recipe.requiresWolfMission === true,
      active: true,
    };
  }

  const store = {};
  for (const product of ECONOMY_PRODUCTS) {
    store[product.id] = {
      name: product.name,
      description: product.description,
      icon: product.icon ?? "",
      price: { ...product.price },
      badge: product.badge ?? "",
      highlights: Array.isArray(product.highlights) ? [...product.highlights] : [],
      grants: { ...(product.grants ?? {}) },
      dailyGrants: { ...(product.dailyGrants ?? {}) },
      active: true,
    };
  }

  return { resource: resources, item: items, tool: tools, upgrade: upgrades, recipe: recipes, store };
}

function defaultEntity(kind, id) {
  const defaults = buildDefaults();
  return defaults[kind]?.[id] ?? null;
}

export function createContentStore({ db, logger = console } = {}) {
  let defaults = null;
  let overrideRows = [];
  let spriteRows = [];
  let settings = { ...DEFAULT_SETTINGS };

  async function init() {
    if (!db.isAvailable()) {
      return false;
    }
    defaults = buildDefaults();
    await refresh();
    logger.log?.("[CONTENT] Overrides de contenido cargados.");
    return true;
  }

  async function refresh() {
    if (!db.isAvailable()) {
      return;
    }
    overrideRows = await db.query(
      "SELECT kind, entity_id, data_json, active, updated_at FROM content_overrides",
    );
    spriteRows = await db.query(
      "SELECT kind, entity_id, variant, width, height, updated_at FROM content_sprites",
    );
    const settingRows = await db.query(
      "SELECT setting_key, value_json FROM app_settings",
    );
    settings = { ...DEFAULT_SETTINGS };
    for (const row of settingRows) {
      const value = parseJson(row.value_json);
      if (value !== null) {
        settings[row.setting_key] = value;
      }
    }
    applyOverrides();
  }

  function spriteFor(kind, id) {
    return spriteRows.find(
      (row) =>
        row.kind === kind &&
        row.entity_id === id &&
        Number(row.variant) === 0,
    ) ?? null;
  }

  function iconFor(kind, id) {
    const sprite = spriteFor(kind, id);
    return sprite
      ? spriteUrl(kind, id, sprite.updated_at)
      : null;
  }

  function overridesByKind() {
    const grouped = Object.fromEntries(
      CONTENT_KINDS.map((kind) => [kind, {}]),
    );
    for (const row of overrideRows) {
      if (!grouped[row.kind]) {
        continue;
      }
      const data = parseJson(row.data_json) ?? {};
      if (row.active !== undefined) {
        data.active = Number(row.active) === 1;
      }
      grouped[row.kind][row.entity_id] = data;
    }
    return grouped;
  }

  function applyOverrides() {
    const grouped = overridesByKind();
    const withIcons = (kind, map) => {
      const result = { ...map };
      for (const row of spriteRows) {
        if (row.kind !== kind) {
          continue;
        }
        result[row.entity_id] = {
          ...(result[row.entity_id] ?? {}),
          iconUrl: spriteUrl(row.kind, row.entity_id, row.updated_at),
        };
      }
      return result;
    };
    applyInventoryContentOverrides({
      resources: withIcons("resource", grouped.resource),
      items: withIcons("item", grouped.item),
      tools: withIcons("tool", grouped.tool),
      upgrades: withIcons("upgrade", grouped.upgrade),
    });
    applyCraftingContentOverrides(grouped.recipe);
    applyStoreContentOverrides(grouped.store);
  }

  function publicManifest() {
    const grouped = overridesByKind();
    const attachIcons = (kind, map) => {
      const result = {};
      for (const [id, data] of Object.entries(map)) {
        result[id] = { ...data };
      }
      for (const row of spriteRows) {
        if (row.kind !== kind) {
          continue;
        }
        result[row.entity_id] = {
          ...(result[row.entity_id] ?? {}),
          iconUrl: spriteUrl(row.kind, row.entity_id, row.updated_at),
        };
      }
      return result;
    };
    const version = Math.max(
      0,
      ...overrideRows.map((row) => Number(row.updated_at) || 0),
      ...spriteRows.map((row) => Number(row.updated_at) || 0),
    );
    return {
      version,
      settings: { ...settings },
      resources: attachIcons("resource", grouped.resource),
      items: attachIcons("item", grouped.item),
      tools: attachIcons("tool", grouped.tool),
      upgrades: attachIcons("upgrade", grouped.upgrade),
      recipes: grouped.recipe,
      store: grouped.store,
    };
  }

  function normalizeEntity(kind, id, input) {
    const base = defaults?.[kind]?.[id] ?? defaultEntity(kind, id);
    if (!base) {
      throw httpError("Contenido no encontrado", 404);
    }
    const source = isPlainObject(input) ? input : {};
    const fields = CONTENT_FIELDS[kind] ?? [];
    const result = {};

    for (const field of fields) {
      const value = source[field.key];
      if (field.key === "active") {
        result.active = value !== false;
        continue;
      }
      if (value === undefined) {
        continue;
      }
      if (field.type === "text" || field.type === "textarea") {
        result[field.key] = normalizeTextValue(
          value,
          field.max ?? 120,
          base[field.key] ?? "",
        );
      } else if (field.type === "color") {
        result[field.key] = normalizeColorValue(
          value,
          base[field.key] ?? "#8b929b",
        );
      } else if (field.type === "number") {
        result[field.key] = normalizeNumberValue(
          value,
          base[field.key] ?? field.min ?? 0,
          field.min ?? 0,
          field.max ?? 1000000,
        );
      } else if (field.type === "checkbox") {
        result[field.key] = value === true;
      } else if (field.type === "select") {
        const allowed = (field.options ?? []).map((option) => option.value);
        result[field.key] = allowed.includes(value) ? value : base[field.key];
      } else if (field.type === "json") {
        result[field.key] = value;
      }
    }

    if (kind === "recipe") {
      result.costs = normalizeCosts(source.costs ?? base.costs);
      result.amount = normalizeNumberValue(source.amount, base.amount ?? 1, 1, 9999);
      result.requiresTool = normalizeTextValue(
        source.requiresTool ?? base.requiresTool,
        32,
      );
      if (result.requiresTool && !TOOL_KEYS.includes(result.requiresTool)) {
        throw httpError("Herramienta requerida inválida", 400);
      }
      result.requiresWolfMission =
        (source.requiresWolfMission ?? base.requiresWolfMission) === true;
      if (!["tools", "build", "items", "upgrades"].includes(result.category)) {
        result.category = base.category;
      }
    }

    if (kind === "store") {
      const currency = ["drac", "prestige"].includes(source.priceCurrency)
        ? source.priceCurrency
        : base.price?.currency ?? "drac";
      const amount = normalizeNumberValue(
        source.priceAmount,
        base.price?.amount ?? 0,
        0,
        1000000,
      );
      result.price = { currency, amount };
      result.badge = normalizeTextValue(source.badge ?? base.badge, 32);
      result.highlights = normalizeHighlights(
        source.highlights ?? base.highlights,
      );
      result.grants = normalizeGrants(source.grants ?? base.grants);
      result.dailyGrants = normalizeGrants(
        source.dailyGrants ?? base.dailyGrants,
      );
    }

    result.active = result.active !== false;
    return result;
  }

  async function saveOverride(kind, id, data) {
    if (!db.isAvailable()) {
      throw httpError("La base de datos no está configurada", 503);
    }
    if (!CONTENT_KINDS.includes(kind)) {
      throw httpError("Tipo de contenido inválido", 400);
    }
    const normalized = normalizeEntity(kind, String(id), data);
    const now = nowMs();
    await db.execute(
      `INSERT INTO content_overrides
         (kind, entity_id, data_json, active, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         data_json = VALUES(data_json),
         active = VALUES(active),
         updated_at = VALUES(updated_at)`,
      [
        kind,
        String(id),
        JSON.stringify(normalized),
        normalized.active ? 1 : 0,
        now,
      ],
    );
    await refresh();
    return adminEntity(kind, String(id));
  }

  async function deleteOverride(kind, id) {
    if (!db.isAvailable()) {
      throw httpError("La base de datos no está configurada", 503);
    }
    const result = await db.execute(
      "DELETE FROM content_overrides WHERE kind = ? AND entity_id = ?",
      [kind, String(id)],
    );
    if (Number(result.affectedRows) === 0) {
      throw httpError("Override no encontrado", 404);
    }
    await refresh();
    return { ok: true };
  }

  function mergedEntity(kind, id) {
    const base = defaults?.[kind]?.[id] ?? defaultEntity(kind, id);
    const override = overrideRows.find(
      (row) => row.kind === kind && row.entity_id === id,
    );
    const data = override ? parseJson(override.data_json) ?? {} : {};
    return {
      ...(base ?? {}),
      ...data,
      active:
        override ? Number(override.active) === 1 : base?.active !== false,
    };
  }

  function adminEntity(kind, id) {
    return {
      kind,
      id,
      label: CONTENT_META[kind]?.singular ?? kind,
      default: defaults?.[kind]?.[id] ?? defaultEntity(kind, id),
      data: mergedEntity(kind, id),
      hasOverride: overrideRows.some(
        (row) => row.kind === kind && row.entity_id === id,
      ),
      iconUrl: iconFor(kind, id),
      sprite: spriteFor(kind, id)
        ? {
            width: Number(spriteFor(kind, id).width) || 0,
            height: Number(spriteFor(kind, id).height) || 0,
            updatedAt: Number(spriteFor(kind, id).updated_at) || 0,
          }
        : null,
    };
  }

  function adminSections() {
    return CONTENT_KINDS.map((kind) => ({
      kind,
      label: CONTENT_META[kind]?.label ?? kind,
      singular: CONTENT_META[kind]?.singular ?? kind,
      fields: CONTENT_FIELDS[kind] ?? [],
      items: Object.keys(defaults?.[kind] ?? {}).map((id) =>
        adminEntity(kind, id),
      ),
    }));
  }

  async function setSprite(kind, id, input) {
    if (!db.isAvailable()) {
      throw httpError("La base de datos no está configurada", 503);
    }
    if (!CONTENT_KINDS.includes(kind) || !(id in (defaults?.[kind] ?? {}))) {
      throw httpError("Contenido no encontrado", 404);
    }
    const sprite = decodeSprite(input);
    const now = nowMs();
    await db.execute(
      `INSERT INTO content_sprites
         (kind, entity_id, variant, mime, width, height, data, updated_at)
       VALUES (?, ?, 0, 'image/png', ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         mime = VALUES(mime),
         width = VALUES(width),
         height = VALUES(height),
         data = VALUES(data),
         updated_at = VALUES(updated_at)`,
      [kind, String(id), sprite.width, sprite.height, sprite.buffer, now],
    );
    await refresh();
    return {
      ok: true,
      url: spriteUrl(kind, id, now),
      width: sprite.width,
      height: sprite.height,
    };
  }

  async function deleteSprite(kind, id) {
    if (!db.isAvailable()) {
      throw httpError("La base de datos no está configurada", 503);
    }
    await db.execute(
      "DELETE FROM content_sprites WHERE kind = ? AND entity_id = ?",
      [kind, String(id)],
    );
    await refresh();
    return { ok: true };
  }

  async function getSprite(kind, id) {
    if (!db.isAvailable()) {
      return null;
    }
    const rows = await db.query(
      `SELECT mime, data FROM content_sprites
       WHERE kind = ? AND entity_id = ? AND variant = 0 LIMIT 1`,
      [kind, String(id)],
    );
    return rows[0] ?? null;
  }

  async function setSetting(key, value) {
    if (!db.isAvailable()) {
      throw httpError("La base de datos no está configurada", 503);
    }
    const settingKey = String(key).slice(0, 64);
    await db.execute(
      `INSERT INTO app_settings (setting_key, value_json, updated_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         value_json = VALUES(value_json),
         updated_at = VALUES(updated_at)`,
      [settingKey, JSON.stringify(value), nowMs()],
    );
    await refresh();
    return getSettings();
  }

  function getSettings() {
    return { ...settings };
  }

  return {
    init,
    refresh,
    publicManifest,
    adminSections,
    adminEntity,
    saveOverride,
    deleteOverride,
    setSprite,
    deleteSprite,
    getSprite,
    getSettings,
    setSetting,
    meta: CONTENT_META,
    kinds: CONTENT_KINDS,
  };
}
