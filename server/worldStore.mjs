import {
  buildSsl,
  isLeaderboardDbConfigured,
  readDbConfig,
} from "./leaderboardStore.mjs";

function normalizeWorldId(value) {
  if (typeof value !== "string") {
    return "main";
  }
  const trimmed = value.trim().slice(0, 64);
  return trimmed.length > 0 ? trimmed : "main";
}

export function createWorldStore({ env = process.env, logger = console } = {}) {
  const config = readDbConfig(env);
  const configured = isLeaderboardDbConfigured(env);
  let pool = null;
  let available = false;
  let initPromise = null;

  async function init() {
    if (!configured) {
      return false;
    }
    if (initPromise) {
      return initPromise;
    }

    initPromise = (async () => {
      try {
        const mysql = await import("mysql2/promise");
        const ssl = buildSsl(config, logger);
        pool = mysql.createPool({
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
          database: config.database,
          waitForConnections: true,
          connectionLimit: Math.min(4, config.connectionLimit),
          queueLimit: 10,
          enableKeepAlive: true,
          connectTimeout: 8000,
          ...(ssl ? { ssl } : {}),
        });
        await pool.query("SELECT 1");
        await pool.query(`
          CREATE TABLE IF NOT EXISTS world_state (
            world_id VARCHAR(64) NOT NULL PRIMARY KEY,
            payload LONGTEXT NOT NULL,
            updated_at BIGINT NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        available = true;
        logger.log?.("[DB] MySQL conectado; mundo persistente activo.");
        return true;
      } catch (error) {
        available = false;
        pool = null;
        logger.warn?.(
          `[DB] No se pudo conectar a MySQL para el mundo; se usará JSON: ${error.message}`,
        );
        return false;
      }
    })();

    return initPromise;
  }

  async function load(worldId = "main") {
    if (!available || !pool) {
      return null;
    }
    try {
      const [rows] = await pool.execute(
        "SELECT payload FROM world_state WHERE world_id = ? LIMIT 1",
        [normalizeWorldId(worldId)],
      );
      if (!rows.length) {
        return null;
      }
      return JSON.parse(rows[0].payload);
    } catch (error) {
      logger.warn?.(`[DB] No se pudo leer el mundo: ${error.message}`);
      return null;
    }
  }

  async function save(worldId, payload) {
    if (!available || !pool) {
      return false;
    }
    try {
      await pool.execute(
        `INSERT INTO world_state (world_id, payload, updated_at)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = VALUES(updated_at)`,
        [normalizeWorldId(worldId), JSON.stringify(payload), Date.now()],
      );
      return true;
    } catch (error) {
      logger.warn?.(`[DB] No se pudo guardar el mundo: ${error.message}`);
      return false;
    }
  }

  async function close() {
    if (pool) {
      await pool.end().catch(() => {});
      pool = null;
    }
    available = false;
  }

  return {
    configured,
    isAvailable: () => available,
    init,
    load,
    save,
    close,
  };
}

export { normalizeWorldId };
