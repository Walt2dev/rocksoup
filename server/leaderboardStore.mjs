import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const DEFAULT_PORT = 3306;
const DEFAULT_CONNECTION_LIMIT = 5;

function safeInt(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

function safeName(value) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 18)
    : "Jugador";
}

function safeColor(value) {
  return typeof value === "string" ? value.slice(0, 16) : "#e0a458";
}

export function hashToken(token) {
  if (typeof token !== "string" || token.length === 0) {
    return "";
  }
  return createHash("sha256").update(token).digest("hex");
}

export function isLeaderboardDbConfigured(env = process.env) {
  return Boolean(
    env &&
      typeof env.MYSQL_HOST === "string" &&
      env.MYSQL_HOST.length > 0 &&
      typeof env.MYSQL_USER === "string" &&
      env.MYSQL_USER.length > 0 &&
      typeof env.MYSQL_DATABASE === "string" &&
      env.MYSQL_DATABASE.length > 0,
  );
}

export function readDbConfig(env = process.env) {
  if (!isLeaderboardDbConfigured(env)) {
    return null;
  }

  const port = Number(env.MYSQL_PORT) > 0
    ? Math.floor(Number(env.MYSQL_PORT))
    : DEFAULT_PORT;
  const connectionLimit = Number(env.MYSQL_CONNECTION_LIMIT) > 0
    ? Math.min(20, Math.max(1, Math.floor(Number(env.MYSQL_CONNECTION_LIMIT))))
    : DEFAULT_CONNECTION_LIMIT;

  return {
    host: String(env.MYSQL_HOST),
    port,
    user: String(env.MYSQL_USER),
    password: typeof env.MYSQL_PASSWORD === "string" ? env.MYSQL_PASSWORD : "",
    database: String(env.MYSQL_DATABASE),
    sslMode: String(env.MYSQL_SSL ?? "").toLowerCase(),
    sslCaPath:
      typeof env.MYSQL_SSL_CA === "string" && env.MYSQL_SSL_CA.length > 0
        ? env.MYSQL_SSL_CA
        : "",
    connectionLimit,
  };
}

export function mapResultToRow(result, { winnerToken = null, now = Date.now() } = {}) {
  if (!result || typeof result !== "object") {
    return null;
  }

  const tokenHash = hashToken(result.token);
  if (!tokenHash) {
    return null;
  }

  const score = safeInt(result.score);

  return {
    tokenHash,
    name: safeName(result.name),
    color: safeColor(result.color),
    points: score,
    kills: safeInt(result.kills),
    deaths: safeInt(result.deaths),
    bestStreak: safeInt(result.bestStreak),
    eventsWon: result.token === winnerToken ? 1 : 0,
    bestEventScore: score,
    updatedAt: safeInt(now),
  };
}

export function rowToEntry(row) {
  return {
    tokenHash: row.token_hash,
    name: safeName(row.name),
    color: safeColor(row.color),
    points: safeInt(row.points),
    kills: safeInt(row.kills),
    deaths: safeInt(row.deaths),
    bestStreak: safeInt(row.best_streak),
    eventsWon: safeInt(row.events_won),
    bestEventScore: safeInt(row.best_event_score),
    updatedAt: safeInt(row.updated_at),
  };
}

const UPSERT_EVENT_SQL = `
INSERT INTO leaderboard
  (token_hash, name, color, points, kills, deaths, best_streak, events_won, best_event_score, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  color = VALUES(color),
  points = points + VALUES(points),
  kills = kills + VALUES(kills),
  deaths = deaths + VALUES(deaths),
  best_streak = GREATEST(best_streak, VALUES(best_streak)),
  events_won = events_won + VALUES(events_won),
  best_event_score = GREATEST(best_event_score, VALUES(best_event_score)),
  updated_at = VALUES(updated_at)
`;

const UPSERT_ABSOLUTE_SQL = `
INSERT INTO leaderboard
  (token_hash, name, color, points, kills, deaths, best_streak, events_won, best_event_score, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  color = VALUES(color),
  points = VALUES(points),
  kills = VALUES(kills),
  deaths = VALUES(deaths),
  best_streak = VALUES(best_streak),
  events_won = VALUES(events_won),
  best_event_score = VALUES(best_event_score),
  updated_at = VALUES(updated_at)
`;

export function buildSsl(config, logger) {
  if (config.sslMode === "true" || config.sslMode === "1" || config.sslMode === "required") {
    if (config.sslCaPath) {
      try {
        return { ca: readFileSync(config.sslCaPath), rejectUnauthorized: true };
      } catch (error) {
        logger.warn?.(`[DB] No se pudo leer MYSQL_SSL_CA: ${error.message}`);
      }
    }
    return { rejectUnauthorized: false };
  }

  if (config.sslMode === "verify" || config.sslMode === "strict") {
    if (config.sslCaPath) {
      try {
        return { ca: readFileSync(config.sslCaPath), rejectUnauthorized: true };
      } catch (error) {
        logger.warn?.(`[DB] No se pudo leer MYSQL_SSL_CA: ${error.message}`);
      }
    }
    return { rejectUnauthorized: true };
  }

  return null;
}

export function createLeaderboardStore({ env = process.env, logger = console } = {}) {
  const config = readDbConfig(env);
  let pool = null;
  let available = false;
  let initPromise = null;

  async function init() {
    if (!config) {
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
          connectionLimit: config.connectionLimit,
          queueLimit: 20,
          enableKeepAlive: true,
          connectTimeout: 8000,
          ...(ssl ? { ssl } : {}),
        });
        await pool.query("SELECT 1");
        available = true;
        logger.log?.("[DB] MySQL conectado; ranking persistente activo.");
        return true;
      } catch (error) {
        available = false;
        pool = null;
        logger.warn?.(
          `[DB] No se pudo conectar a MySQL; el ranking usará JSON: ${error.message}`,
        );
        return false;
      }
    })();

    return initPromise;
  }

  async function top(sort = "points", limit = 10) {
    if (!available || !pool) {
      return null;
    }

    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit) || 10));
    const order =
      sort === "best"
        ? "best_event_score DESC, points DESC, name ASC"
        : "points DESC, kills DESC, name ASC";

    try {
      const [rows] = await pool.query(
        `SELECT token_hash, name, color, points, kills, deaths, best_streak,
                events_won, best_event_score, updated_at
         FROM leaderboard
         ORDER BY ${order}
         LIMIT ${safeLimit}`,
      );
      return rows.map(rowToEntry);
    } catch (error) {
      logger.warn?.(`[DB] No se pudo leer el ranking: ${error.message}`);
      return null;
    }
  }

  async function merge(results, { winnerToken = null, now = Date.now() } = {}) {
    if (!available || !pool || !Array.isArray(results)) {
      return false;
    }

    const rows = results
      .map((result) => mapResultToRow(result, { winnerToken, now }))
      .filter(Boolean);

    if (rows.length === 0) {
      return true;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const row of rows) {
        await connection.execute(UPSERT_EVENT_SQL, [
          row.tokenHash,
          row.name,
          row.color,
          row.points,
          row.kills,
          row.deaths,
          row.bestStreak,
          row.eventsWon,
          row.bestEventScore,
          row.updatedAt,
        ]);
      }
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback().catch(() => {});
      logger.warn?.(`[DB] No se pudo guardar el ranking: ${error.message}`);
      return false;
    } finally {
      connection.release();
    }
  }

  async function importEntries(entries, { now = Date.now() } = {}) {
    if (!available || !pool || !entries || typeof entries !== "object") {
      return 0;
    }

    const rows = [];

    for (const [token, entry] of Object.entries(entries)) {
      const tokenHash = hashToken(token);
      if (!tokenHash || !entry) {
        continue;
      }
      rows.push([
        tokenHash,
        safeName(entry.name),
        safeColor(entry.color),
        safeInt(entry.points),
        safeInt(entry.kills),
        safeInt(entry.deaths),
        safeInt(entry.bestStreak),
        safeInt(entry.eventsWon),
        safeInt(entry.bestEventScore),
        safeInt(now),
      ]);
    }

    if (rows.length === 0) {
      return 0;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const row of rows) {
        await connection.execute(UPSERT_ABSOLUTE_SQL, row);
      }
      await connection.commit();
      return rows.length;
    } catch (error) {
      await connection.rollback().catch(() => {});
      logger.warn?.(`[DB] No se pudo importar el ranking: ${error.message}`);
      return 0;
    } finally {
      connection.release();
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
    configured: Boolean(config),
    isAvailable: () => available,
    init,
    top,
    merge,
    importEntries,
    close,
  };
}
