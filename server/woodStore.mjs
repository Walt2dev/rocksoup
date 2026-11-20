import {
  BUILTIN_WOODS,
  WOOD_ID_PATTERN,
  WOOD_RENDER_MODES,
  WOOD_REALMS,
  createWoodCatalog,
  normalizeWood,
} from "../js/world/woods.js";

const MAX_SPRITE_BYTES = 1536 * 1024;
const MAX_SPRITE_SIZE = 512;
const TREE_VARIANTS = 6;

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

function spriteUrl(id, variant, updatedAt) {
  return `/api/woods/${encodeURIComponent(id)}/sprite/${variant}.png?v=${Number(updatedAt) || 0}`;
}

function rowToWood(row, sprites = []) {
  const style = parseJson(row.style_json) ?? {};
  const presentSprites = sprites.filter(Boolean);
  return {
    id: row.id,
    name: row.name,
    biomeId: row.biome_id === null ? null : Number(row.biome_id),
    realm: row.realm,
    active: Number(row.active) === 1,
    renderMode: row.render_mode,
    density: Number(row.density) || 1,
    style,
    updatedAt: Number(row.updated_at) || 0,
    spriteUrls: sprites.map((sprite) =>
      sprite
        ? spriteUrl(row.id, Number(sprite.variant), Number(sprite.updated_at))
        : null,
    ),
    sprites: presentSprites.map((sprite) => ({
      variant: Number(sprite.variant),
      width: Number(sprite.width) || 0,
      height: Number(sprite.height) || 0,
      updatedAt: Number(sprite.updated_at) || 0,
    })),
  };
}

function spriteArray(rows) {
  const result = Array.from({ length: TREE_VARIANTS }, () => null);
  for (const row of rows) {
    const variant = Number(row.variant);
    if (variant >= 0 && variant < TREE_VARIANTS) {
      result[variant] = row;
    }
  }
  return result;
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

export function createWoodStore({ db, logger = console } = {}) {
  async function init() {
    if (!db.isAvailable()) {
      return false;
    }
    const rows = await db.query("SELECT COUNT(*) AS total FROM wood_types");
    if (Number(rows[0]?.total) > 0) {
      return true;
    }
    const now = nowMs();
    for (const wood of BUILTIN_WOODS) {
      await db.execute(
        `INSERT IGNORE INTO wood_types
           (id, name, biome_id, realm, active, render_mode, density,
            style_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          wood.id,
          wood.name,
          wood.biomeId,
          wood.realm,
          wood.active ? 1 : 0,
          wood.renderMode,
          wood.density,
          JSON.stringify(wood.style),
          now,
          now,
        ],
      );
    }
    logger.log?.("[WOODS] Catálogo inicial de maderas creado.");
    return true;
  }

  async function listRows() {
    if (!db.isAvailable()) {
      return [];
    }
    return db.query(
      "SELECT * FROM wood_types ORDER BY realm ASC, biome_id ASC, name ASC",
    );
  }

  async function listSpriteRows(ids) {
    if (!db.isAvailable() || ids.length === 0) {
      return [];
    }
    const placeholders = ids.map(() => "?").join(", ");
    return db.query(
      `SELECT wood_id, variant, width, height, updated_at
       FROM wood_sprites
       WHERE wood_id IN (${placeholders})
       ORDER BY wood_id ASC, variant ASC`,
      ids,
    );
  }

  async function listAll() {
    const rows = await listRows();
    const sprites = await listSpriteRows(rows.map((row) => row.id));
    const grouped = new Map();
    for (const sprite of sprites) {
      const list = grouped.get(sprite.wood_id) ?? [];
      list.push(sprite);
      grouped.set(sprite.wood_id, list);
    }
    return rows.map((row) =>
      rowToWood(row, spriteArray(grouped.get(row.id) ?? [])),
    );
  }

  async function publicCatalog() {
    const woods = await listAll();
    const catalog = createWoodCatalog(woods);
    return {
      version: catalog.version,
      woods,
      biomes: Object.fromEntries(
        [...catalog.byBiome.entries()].map(([biomeId, wood]) => [
          String(biomeId),
          wood.id,
        ]),
      ),
    };
  }

  async function getWood(id) {
    const rows = await listRows();
    const row = rows.find((entry) => entry.id === id);
    if (!row) {
      return null;
    }
    const sprites = await listSpriteRows([id]);
    return rowToWood(row, spriteArray(sprites));
  }

  function validateInput(input, { isUpdate = false } = {}) {
    const source = input && typeof input === "object" ? input : {};
    const id = String(source.id ?? "").trim();
    if (!isUpdate && !WOOD_ID_PATTERN.test(id)) {
      throw httpError(
        "El identificador debe tener 1-48 letras, números, guiones o guiones bajos.",
        400,
      );
    }
    const normalized = normalizeWood({
      ...source,
      id: isUpdate ? source.id : id,
      active: source.active !== false,
    });
    if (!normalized) {
      throw httpError("Datos de madera inválidos", 400);
    }
    if (!WOOD_REALMS.includes(normalized.realm)) {
      throw httpError("Reino inválido", 400);
    }
    if (!WOOD_RENDER_MODES.includes(normalized.renderMode)) {
      throw httpError("Modo de render inválido", 400);
    }
    return normalized;
  }

  async function ensureBiomeAvailable(normalized, ignoreId = null) {
    if (normalized.biomeId === null) {
      return;
    }
    const rows = await db.query(
      `SELECT id FROM wood_types
       WHERE realm = ? AND biome_id = ? AND id <> ?
       LIMIT 1`,
      [normalized.realm, normalized.biomeId, ignoreId ?? ""],
    );
    if (rows.length > 0) {
      throw httpError(
        `Ese bioma ya está asignado a la madera "${rows[0].id}".`,
        409,
      );
    }
  }

  async function createWood(input) {
    if (!db.isAvailable()) {
      throw httpError("La base de datos no está configurada", 503);
    }
    const normalized = validateInput(input);
    const existing = await db.query(
      "SELECT id FROM wood_types WHERE id = ? LIMIT 1",
      [normalized.id],
    );
    if (existing.length > 0) {
      throw httpError("Ya existe una madera con ese identificador", 409);
    }
    await ensureBiomeAvailable(normalized);
    const now = nowMs();
    await db.execute(
      `INSERT INTO wood_types
         (id, name, biome_id, realm, active, render_mode, density,
          style_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        normalized.id,
        normalized.name,
        normalized.biomeId,
        normalized.realm,
        normalized.active ? 1 : 0,
        normalized.renderMode,
        normalized.density,
        JSON.stringify(normalized.style),
        now,
        now,
      ],
    );
    return getWood(normalized.id);
  }

  async function updateWood(id, input) {
    if (!db.isAvailable()) {
      throw httpError("La base de datos no está configurada", 503);
    }
    const rows = await db.query(
      "SELECT id FROM wood_types WHERE id = ? LIMIT 1",
      [String(id)],
    );
    if (rows.length === 0) {
      throw httpError("Madera no encontrada", 404);
    }
    const normalized = validateInput({ ...input, id }, { isUpdate: true });
    await ensureBiomeAvailable(normalized, String(id));
    await db.execute(
      `UPDATE wood_types
       SET name = ?, biome_id = ?, realm = ?, active = ?, render_mode = ?,
           density = ?, style_json = ?, updated_at = ?
       WHERE id = ?`,
      [
        normalized.name,
        normalized.biomeId,
        normalized.realm,
        normalized.active ? 1 : 0,
        normalized.renderMode,
        normalized.density,
        JSON.stringify(normalized.style),
        nowMs(),
        String(id),
      ],
    );
    return getWood(String(id));
  }

  async function deleteWood(id) {
    if (!db.isAvailable()) {
      throw httpError("La base de datos no está configurada", 503);
    }
    const result = await db.execute(
      `UPDATE wood_types
       SET active = 0, biome_id = NULL, updated_at = ?
       WHERE id = ?`,
      [nowMs(), String(id)],
    );
    if (Number(result.affectedRows) === 0) {
      throw httpError("Madera no encontrada", 404);
    }
    return { ok: true };
  }

  async function setSprite(id, variantValue, input) {
    if (!db.isAvailable()) {
      throw httpError("La base de datos no está configurada", 503);
    }
    const variant = Math.floor(Number(variantValue));
    if (!Number.isInteger(variant) || variant < 0 || variant >= TREE_VARIANTS) {
      throw httpError("Variante inválida", 400);
    }
    const rows = await db.query(
      "SELECT id FROM wood_types WHERE id = ? LIMIT 1",
      [String(id)],
    );
    if (rows.length === 0) {
      throw httpError("Madera no encontrada", 404);
    }
    const sprite = decodeSprite(input);
    const now = nowMs();
    await db.execute(
      `INSERT INTO wood_sprites
         (wood_id, variant, mime, width, height, data, updated_at)
       VALUES (?, ?, 'image/png', ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         mime = VALUES(mime),
         width = VALUES(width),
         height = VALUES(height),
         data = VALUES(data),
         updated_at = VALUES(updated_at)`,
      [String(id), variant, sprite.width, sprite.height, sprite.buffer, now],
    );
    await db.execute(
      "UPDATE wood_types SET updated_at = ? WHERE id = ?",
      [now, String(id)],
    );
    return {
      ok: true,
      variant,
      width: sprite.width,
      height: sprite.height,
      url: spriteUrl(id, variant, now),
    };
  }

  async function deleteSprite(id, variantValue) {
    if (!db.isAvailable()) {
      throw httpError("La base de datos no está configurada", 503);
    }
    const variant = Math.floor(Number(variantValue));
    if (!Number.isInteger(variant) || variant < 0 || variant >= TREE_VARIANTS) {
      throw httpError("Variante inválida", 400);
    }
    await db.execute(
      "DELETE FROM wood_sprites WHERE wood_id = ? AND variant = ?",
      [String(id), variant],
    );
    await db.execute(
      "UPDATE wood_types SET updated_at = ? WHERE id = ?",
      [nowMs(), String(id)],
    );
    return { ok: true };
  }

  async function getSprite(id, variantValue) {
    if (!db.isAvailable()) {
      return null;
    }
    const variant = Math.floor(Number(variantValue));
    if (!Number.isInteger(variant) || variant < 0 || variant >= TREE_VARIANTS) {
      return null;
    }
    const rows = await db.query(
      `SELECT mime, data, updated_at FROM wood_sprites
       WHERE wood_id = ? AND variant = ? LIMIT 1`,
      [String(id), variant],
    );
    return rows[0] ?? null;
  }

  async function serverCatalog() {
    const woods = await listAll();
    return createWoodCatalog(woods);
  }

  return {
    init,
    listAll,
    publicCatalog,
    serverCatalog,
    getWood,
    createWood,
    updateWood,
    deleteWood,
    setSprite,
    deleteSprite,
    getSprite,
  };
}
