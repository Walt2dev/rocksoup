import { randomUUID } from "node:crypto";

import { sanitizeSave } from "../js/game/save.js";
import {
  applyGrantsToSave,
  grantsAreEmpty,
  mergeGrants,
  sanitizeGrants,
} from "./grants.mjs";
import { createLore, loreSummary, sanitizeLore } from "./lore.mjs";

const FREE_WORLD_SLOTS = 1;
const MAX_NAME = 64;

function nowMs() {
  return Date.now();
}

function safeName(value, fallback = "Mundo sin nombre") {
  const name = typeof value === "string" ? value.trim() : "";
  return (name || fallback).slice(0, MAX_NAME);
}

function safeSeed(value) {
  const seed = typeof value === "string" ? value.trim() : "";
  return seed.slice(0, 64);
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

function worldRowToMeta(row) {
  const lore = sanitizeLore(parseJson(row.lore), row.name);
  return {
    id: row.id,
    name: row.name,
    seed: row.seed,
    mode: row.mode,
    slotIndex: Number(row.slot_index) || 0,
    version: Number(row.version) || 0,
    savedAt: Number(row.saved_at) || 0,
    createdAt: Number(row.created_at) || 0,
    updatedAt: Number(row.updated_at) || 0,
    lore: loreSummary(lore),
  };
}

function worldRowToFull(row) {
  return {
    ...worldRowToMeta(row),
    payload: parseJson(row.payload),
    loreData: sanitizeLore(parseJson(row.lore), row.name),
  };
}

export function createAccountStore({ db, logger = console } = {}) {
  async function getSlots(userId) {
    const rows = await db.query(
      "SELECT purchased_slots FROM user_world_slots WHERE user_id = ? LIMIT 1",
      [Number(userId)],
    );
    return Number(rows[0]?.purchased_slots) || 0;
  }

  async function getWallet(userId) {
    const rows = await db.query(
      "SELECT diamonds FROM user_wallets WHERE user_id = ? LIMIT 1",
      [Number(userId)],
    );
    return Number(rows[0]?.diamonds) || 0;
  }

  async function listWorlds(userId) {
    const rows = await db.query(
      `SELECT id, name, seed, mode, slot_index, version, saved_at,
              created_at, updated_at, lore
       FROM player_worlds
       WHERE user_id = ?
       ORDER BY updated_at DESC`,
      [Number(userId)],
    );
    return rows.map(worldRowToMeta);
  }

  async function getWorld(userId, worldId) {
    const rows = await db.query(
      `SELECT * FROM player_worlds
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [String(worldId), Number(userId)],
    );
    return rows[0] ? worldRowToFull(rows[0]) : null;
  }

  async function createWorld(
    userId,
    { name, seed, mode = "solo", payload = null, lore = null } = {},
  ) {
    const cleanSeed = safeSeed(seed);
    if (!cleanSeed) {
      const error = new Error("Falta la semilla del mundo");
      error.status = 400;
      throw error;
    }

    const cleanPayload = payload ? sanitizeSave(payload) : null;
    if (payload && !cleanPayload) {
      const error = new Error("La partida enviada no es válida");
      error.status = 400;
      throw error;
    }

    return db.transaction(async (connection) => {
      const [slotRows] = await connection.execute(
        "SELECT purchased_slots FROM user_world_slots WHERE user_id = ? FOR UPDATE",
        [Number(userId)],
      );
      const purchased = Number(slotRows[0]?.purchased_slots) || 0;
      const capacity = FREE_WORLD_SLOTS + purchased;

      const [worldRows] = await connection.execute(
        "SELECT id FROM player_worlds WHERE user_id = ? FOR UPDATE",
        [Number(userId)],
      );
      const total = worldRows.length;
      if (total >= capacity) {
        const error = new Error(
          `Límite de mundos alcanzado (${capacity}). Compra otro slot por 15 MXN.`,
        );
        error.status = 409;
        error.code = "SLOT_LIMIT";
        error.capacity = capacity;
        throw error;
      }

      const id = randomUUID();
      const now = nowMs();
      const cleanName = safeName(name);
      const loreData = lore
        ? sanitizeLore(lore, cleanName)
        : createLore(cleanName, { now, seed: cleanSeed });

      await connection.execute(
        `INSERT INTO player_worlds
           (id, user_id, name, seed, mode, slot_index, payload, lore, version,
            saved_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
        [
          id,
          Number(userId),
          cleanName,
          cleanSeed,
          mode === "coop" ? "coop" : "solo",
          total,
          cleanPayload ? JSON.stringify(cleanPayload) : null,
          JSON.stringify(loreData),
          cleanPayload?.savedAt ?? 0,
          now,
          now,
        ],
      );

      return {
        id,
        name: cleanName,
        seed: cleanSeed,
        mode: mode === "coop" ? "coop" : "solo",
        slotIndex: total,
        version: 0,
        savedAt: cleanPayload?.savedAt ?? 0,
        createdAt: now,
        updatedAt: now,
        lore: loreSummary(loreData),
      };
    });
  }

  async function saveWorld(
    userId,
    worldId,
    { payload, lore = null, name = null, expectedVersion = null } = {},
  ) {
    const cleanPayload = sanitizeSave(payload);
    if (!cleanPayload) {
      const error = new Error("La partida enviada no es válida");
      error.status = 400;
      throw error;
    }

    const rows = await db.query(
      "SELECT * FROM player_worlds WHERE id = ? AND user_id = ? LIMIT 1",
      [String(worldId), Number(userId)],
    );
    const existing = rows[0];
    if (!existing) {
      const error = new Error("Mundo no encontrado");
      error.status = 404;
      throw error;
    }

    if (
      Number.isFinite(expectedVersion) &&
      Number(expectedVersion) !== Number(existing.version)
    ) {
      const error = new Error(
        "El mundo cambió en otro dispositivo. Vuelve a cargarlo antes de guardar.",
      );
      error.status = 409;
      error.code = "VERSION_CONFLICT";
      error.currentVersion = Number(existing.version);
      throw error;
    }

    const now = nowMs();
    const nextVersion = Number(existing.version) + 1;
    const cleanName = name ? safeName(name, existing.name) : existing.name;
    const loreData = lore
      ? sanitizeLore(lore, cleanName)
      : sanitizeLore(parseJson(existing.lore), cleanName);

    await db.execute(
      `UPDATE player_worlds
       SET name = ?, payload = ?, lore = ?, version = ?, saved_at = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
      [
        cleanName,
        JSON.stringify(cleanPayload),
        JSON.stringify(loreData),
        nextVersion,
        cleanPayload.savedAt ?? now,
        now,
        String(worldId),
        Number(userId),
      ],
    );

    return {
      id: worldId,
      name: cleanName,
      version: nextVersion,
      savedAt: cleanPayload.savedAt ?? now,
      updatedAt: now,
      lore: loreSummary(loreData),
    };
  }

  async function deleteWorld(userId, worldId) {
    const result = await db.execute(
      "DELETE FROM player_worlds WHERE id = ? AND user_id = ?",
      [String(worldId), Number(userId)],
    );
    return Number(result.affectedRows) > 0;
  }

  async function addWorldSlots(userId, amount) {
    const slots = Math.max(0, Math.floor(Number(amount) || 0));
    if (slots === 0) {
      return await getSlots(userId);
    }
    const now = nowMs();
    await db.execute(
      `INSERT INTO user_world_slots (user_id, purchased_slots, updated_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         purchased_slots = purchased_slots + VALUES(purchased_slots),
         updated_at = VALUES(updated_at)`,
      [Number(userId), slots, now],
    );
    return await getSlots(userId);
  }

  async function addDiamonds(userId, amount) {
    const diamonds = Math.max(0, Math.floor(Number(amount) || 0));
    if (diamonds === 0) {
      return await getWallet(userId);
    }
    const now = nowMs();
    await db.execute(
      `INSERT INTO user_wallets (user_id, diamonds, updated_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         diamonds = diamonds + VALUES(diamonds),
         updated_at = VALUES(updated_at)`,
      [Number(userId), diamonds, now],
    );
    return await getWallet(userId);
  }

  async function listEntitlements(userId) {
    const rows = await db.query(
      `SELECT entitlement_key, quantity, source, created_at, expires_at
       FROM user_entitlements
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [Number(userId)],
    );
    return rows.map((row) => ({
      key: row.entitlement_key,
      quantity: Number(row.quantity) || 0,
      source: row.source,
      createdAt: Number(row.created_at) || 0,
      expiresAt: Number(row.expires_at) || 0,
    }));
  }

  async function addEntitlements(userId, keys, { source = null } = {}) {
    const now = nowMs();
    for (const key of Array.isArray(keys) ? keys : []) {
      if (typeof key !== "string" || key.length === 0) {
        continue;
      }
      await db.execute(
        `INSERT INTO user_entitlements
           (user_id, entitlement_key, quantity, source, created_at, expires_at)
         VALUES (?, ?, 1, ?, ?, NULL)`,
        [Number(userId), key.slice(0, 64), source, now],
      );
    }
  }

  async function addPendingGrants(userId, grants, { worldId = null } = {}) {
    const clean = sanitizeGrants(grants);
    if (grantsAreEmpty(clean)) {
      return false;
    }
    await db.execute(
      `INSERT INTO user_pending_grants (user_id, world_id, grants_json, created_at, applied_at)
       VALUES (?, ?, ?, ?, NULL)`,
      [Number(userId), worldId ? String(worldId) : null, JSON.stringify(clean), nowMs()],
    );
    return true;
  }

  async function takePendingGrants(userId, { worldId = null } = {}) {
    if (!db.isAvailable()) {
      return {};
    }
    return db.transaction(async (connection) => {
      const params = [Number(userId)];
      let where = "user_id = ? AND applied_at IS NULL";
      if (worldId) {
        where += " AND (world_id IS NULL OR world_id = ?)";
        params.push(String(worldId));
      }
      const [rows] = await connection.execute(
        `SELECT id, grants_json FROM user_pending_grants
         WHERE ${where}
         ORDER BY id ASC
         FOR UPDATE`,
        params,
      );
      if (rows.length === 0) {
        return {};
      }
      let grants = {};
      for (const row of rows) {
        grants = mergeGrants(grants, parseJson(row.grants_json));
      }
      const ids = rows.map((row) => row.id);
      const placeholders = ids.map(() => "?").join(", ");
      await connection.execute(
        `UPDATE user_pending_grants SET applied_at = ? WHERE id IN (${placeholders})`,
        [nowMs(), ...ids],
      );
      return grants;
    });
  }

  async function pendingGrantCount(userId) {
    const rows = await db.query(
      `SELECT COUNT(*) AS total FROM user_pending_grants
       WHERE user_id = ? AND applied_at IS NULL`,
      [Number(userId)],
    );
    return Number(rows[0]?.total) || 0;
  }

  async function applyGrantsToWorld(userId, worldId, grants) {
    const world = await getWorld(userId, worldId);
    if (!world || !world.payload) {
      return false;
    }
    const nextPayload = applyGrantsToSave(world.payload, grants);
    const saved = await saveWorld(userId, worldId, {
      payload: nextPayload,
      lore: world.loreData,
      expectedVersion: world.version,
    });
    return saved;
  }

  async function summary(userId) {
    const [worlds, slots, diamonds, pending, entitlements] = await Promise.all([
      listWorlds(userId),
      getSlots(userId),
      getWallet(userId),
      pendingGrantCount(userId),
      listEntitlements(userId),
    ]);
    return {
      worlds,
      slots: {
        free: FREE_WORLD_SLOTS,
        purchased: slots,
        capacity: FREE_WORLD_SLOTS + slots,
        used: worlds.length,
      },
      diamonds,
      pendingGrants: pending,
      entitlements,
    };
  }

  async function cleanup() {
    if (!db.isAvailable()) {
      return;
    }
    await db
      .execute(
        "DELETE FROM user_pending_grants WHERE applied_at IS NOT NULL AND applied_at < ?",
        [nowMs() - 30 * 24 * 60 * 60 * 1000],
      )
      .catch(() => {});
  }

  return {
    freeWorldSlots: FREE_WORLD_SLOTS,
    getSlots,
    getWallet,
    listWorlds,
    getWorld,
    createWorld,
    saveWorld,
    deleteWorld,
    addWorldSlots,
    addDiamonds,
    listEntitlements,
    addEntitlements,
    addPendingGrants,
    takePendingGrants,
    pendingGrantCount,
    applyGrantsToWorld,
    summary,
    cleanup,
    logger,
  };
}
