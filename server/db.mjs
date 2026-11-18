import {
  buildSsl,
  isLeaderboardDbConfigured,
  readDbConfig,
} from "./leaderboardStore.mjs";
import { DB_FALLBACK_HOSTS } from "./dbFallbackHosts.mjs";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    google_sub VARCHAR(64) NULL UNIQUE,
    email VARCHAR(190) NULL,
    display_name VARCHAR(24) NOT NULL,
    avatar_url VARCHAR(255) NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS user_credentials (
    user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    KEY idx_credentials_email (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash CHAR(64) NOT NULL PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    user_agent VARCHAR(255) NULL,
    KEY idx_sessions_user (user_id),
    KEY idx_sessions_expiry (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS guest_links (
    token_hash CHAR(64) NOT NULL PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    claimed_at BIGINT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS player_worlds (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(64) NOT NULL,
    seed VARCHAR(64) NOT NULL,
    mode VARCHAR(16) NOT NULL DEFAULT 'solo',
    slot_index INT UNSIGNED NOT NULL DEFAULT 0,
    payload LONGTEXT NULL,
    lore LONGTEXT NULL,
    version INT UNSIGNED NOT NULL DEFAULT 0,
    saved_at BIGINT NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    KEY idx_worlds_user (user_id, updated_at DESC)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS user_world_slots (
    user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    purchased_slots INT UNSIGNED NOT NULL DEFAULT 0,
    updated_at BIGINT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS user_wallets (
    user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    diamonds INT UNSIGNED NOT NULL DEFAULT 0,
    updated_at BIGINT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS user_entitlements (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    entitlement_key VARCHAR(64) NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    source VARCHAR(64) NULL,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NULL,
    KEY idx_entitlements_user (user_id, entitlement_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS user_pending_grants (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    world_id CHAR(36) NULL,
    grants_json LONGTEXT NOT NULL,
    created_at BIGINT NOT NULL,
    applied_at BIGINT NULL,
    KEY idx_grants_user (user_id, applied_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS play_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    player_name VARCHAR(24) NOT NULL,
    connected_at BIGINT NOT NULL,
    last_seen_at BIGINT NOT NULL,
    disconnected_at BIGINT NULL,
    duration_ms BIGINT UNSIGNED NULL,
    KEY idx_play_user (user_id, connected_at),
    KEY idx_play_connected (connected_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS store_products (
    id VARCHAR(48) NOT NULL PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    description VARCHAR(255) NOT NULL,
    category VARCHAR(24) NOT NULL,
    kind VARCHAR(16) NOT NULL,
    price_cents INT UNSIGNED NOT NULL,
    currency CHAR(3) NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    updated_at BIGINT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS store_plans (
    plan_key VARCHAR(48) NOT NULL PRIMARY KEY,
    provider_product_id VARCHAR(64) NOT NULL,
    provider_plan_id VARCHAR(64) NOT NULL,
    updated_at BIGINT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS purchases (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    product_id VARCHAR(48) NOT NULL,
    provider VARCHAR(16) NOT NULL DEFAULT 'paypal',
    provider_order_id VARCHAR(64) NULL UNIQUE,
    amount_cents INT UNSIGNED NOT NULL,
    currency CHAR(3) NOT NULL,
    status VARCHAR(24) NOT NULL,
    world_id CHAR(36) NULL,
    grant_status VARCHAR(24) NOT NULL DEFAULT 'pending',
    created_at BIGINT NOT NULL,
    captured_at BIGINT NULL,
    raw_json LONGTEXT NULL,
    KEY idx_purchases_user (user_id, created_at DESC)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    plan_key VARCHAR(48) NOT NULL,
    provider VARCHAR(16) NOT NULL DEFAULT 'paypal',
    provider_subscription_id VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(24) NOT NULL,
    current_period_end BIGINT NULL,
    last_grant_at BIGINT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    raw_json LONGTEXT NULL,
    KEY idx_subscriptions_user (user_id, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS subscription_intents (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    plan_key VARCHAR(48) NOT NULL,
    created_at BIGINT NOT NULL,
    used_at BIGINT NULL,
    KEY idx_intents_user (user_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS paypal_events (
    event_id VARCHAR(80) NOT NULL PRIMARY KEY,
    event_type VARCHAR(64) NOT NULL,
    created_at BIGINT NOT NULL,
    raw_json LONGTEXT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS rank_entries (
    user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    points INT UNSIGNED NOT NULL DEFAULT 0,
    villages INT UNSIGNED NOT NULL DEFAULT 0,
    units INT UNSIGNED NOT NULL DEFAULT 0,
    waves INT UNSIGNED NOT NULL DEFAULT 0,
    updated_at BIGINT NOT NULL,
    KEY idx_rank_points (points DESC, updated_at ASC)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS rank_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    kind VARCHAR(24) NOT NULL,
    ref_id VARCHAR(64) NOT NULL,
    points INT UNSIGNED NOT NULL,
    created_at BIGINT NOT NULL,
    UNIQUE KEY uq_rank_event (user_id, kind, ref_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS rank_daily (
    user_id BIGINT UNSIGNED NOT NULL,
    kind VARCHAR(24) NOT NULL,
    day BIGINT NOT NULL,
    points INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, kind, day)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS clans (
    id VARCHAR(12) NOT NULL PRIMARY KEY,
    name VARCHAR(32) NOT NULL UNIQUE,
    tag VARCHAR(4) NOT NULL UNIQUE,
    leader_user_id BIGINT UNSIGNED NOT NULL,
    description VARCHAR(140) NOT NULL DEFAULT '',
    created_at BIGINT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS clan_members (
    clan_id VARCHAR(12) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    role VARCHAR(12) NOT NULL DEFAULT 'member',
    joined_at BIGINT NOT NULL,
    PRIMARY KEY (user_id),
    KEY idx_clan_members_clan (clan_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS clan_invites (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    clan_id VARCHAR(12) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    invited_by BIGINT UNSIGNED NOT NULL,
    created_at BIGINT NOT NULL,
    UNIQUE KEY uq_clan_invite (clan_id, user_id),
    KEY idx_clan_invites_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS clan_relations (
    clan_a VARCHAR(12) NOT NULL,
    clan_b VARCHAR(12) NOT NULL,
    relation VARCHAR(12) NOT NULL DEFAULT 'neutral',
    requested_by VARCHAR(12) NULL,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (clan_a, clan_b)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

const NETWORK_ERRORS = new Set([
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EAI_AGAIN",
]);

function sanitizeDbError(error, config) {
  const code = String(error?.code ?? "DB_INIT_FAILED").slice(0, 64);
  let message = String(error?.message ?? "Error desconocido").slice(0, 300);
  const password = config?.password;
  if (password) {
    message = message.split(password).join("***");
  }
  return { code, message };
}

function connectionHosts(config) {
  const hosts = [
    config.host,
    ...(config.alternateHosts ?? []),
    ...(config.fallbackHosts ?? []),
    ...DB_FALLBACK_HOSTS,
    "127.0.0.1",
    "localhost",
  ];
  return [...new Set(hosts.filter(Boolean))];
}

export function createDatabase({ env = process.env, logger = console } = {}) {
  const config = readDbConfig(env);
  const configured = isLeaderboardDbConfigured(env);
  let pool = null;
  let available = false;
  let initPromise = null;
  let activeHost = null;
  let activeCredentials = null;
  let attempts = [];
  let lastError = configured
    ? null
    : {
        code: "DB_NOT_CONFIGURED",
        message: "Faltan MYSQL_HOST, MYSQL_USER o MYSQL_DATABASE",
      };

  async function init() {
    if (!configured) {
      return false;
    }
    if (initPromise) {
      return initPromise;
    }

    initPromise = (async () => {
      let mysql;
      try {
        mysql = await import("mysql2/promise");
      } catch (error) {
        lastError = sanitizeDbError(error, config);
        logger.warn?.(`[DB] No se pudo cargar mysql2: ${error.message}`);
        initPromise = null;
        return false;
      }

      const ssl = buildSsl(config, logger);
      const credentialSets =
        config.credentialSets?.length > 0
          ? config.credentialSets
          : [
              {
                source: "MYSQL",
                user: config.user,
                password: config.password,
                database: config.database,
              },
            ];
      attempts = [];
      activeCredentials = null;

      for (const host of connectionHosts(config)) {
        for (const credentials of credentialSets) {
          if (!credentials.user || !credentials.database) {
            continue;
          }
          let candidate = null;
          try {
            candidate = mysql.createPool({
              host,
              port: config.port,
              user: credentials.user,
              password: credentials.password,
              database: credentials.database,
              waitForConnections: true,
              connectionLimit: config.connectionLimit,
              queueLimit: 40,
              enableKeepAlive: true,
              connectTimeout: 5000,
              ...(ssl ? { ssl } : {}),
            });
            await candidate.query("SELECT 1");
            for (const statement of SCHEMA) {
              await candidate.query(statement);
            }
            pool = candidate;
            available = true;
            activeHost = host;
            activeCredentials = credentials;
            lastError = null;
            logger.log?.(
              `[DB] MySQL listo: cuentas, mundos y tienda activos (${host}, credenciales ${credentials.source}).`,
            );
            return true;
          } catch (error) {
            await candidate?.end().catch(() => {});
            const failure = sanitizeDbError(error, {
              password: credentials.password,
            });
            attempts.push({
              host,
              source: credentials.source,
              user: credentials.user,
              database: credentials.database,
              ...failure,
            });
            logger.warn?.(
              `[DB] MySQL no disponible en ${host} con credenciales ${credentials.source}: ${error.message}`,
            );
            if (NETWORK_ERRORS.has(failure.code)) {
              break;
            }
          }
        }
      }

      available = false;
      pool = null;
      activeHost = null;
      activeCredentials = null;
      lastError = attempts[0] ?? {
        code: "DB_INIT_FAILED",
        message: "No se pudo conectar a MySQL",
      };
      initPromise = null;
      return false;
    })();

    return initPromise;
  }

  async function query(sql, params = []) {
    if (!available || !pool) {
      throw new Error("base de datos no configurada");
    }
    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  async function execute(sql, params = []) {
    if (!available || !pool) {
      throw new Error("base de datos no configurada");
    }
    const [result] = await pool.execute(sql, params);
    return result;
  }

  async function transaction(fn) {
    if (!available || !pool) {
      throw new Error("base de datos no configurada");
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await fn(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
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
    configured,
    isAvailable: () => available,
    error: () => lastError,
    activeHost: () => activeHost,
    attempts: () =>
      attempts.map(({ host, code, message }) => ({ host, code, message })),
    info: () => ({
      configured,
      host: config?.host ?? null,
      port: config?.port ?? null,
      database: config?.database ?? null,
      hosts: config ? connectionHosts(config) : [],
      activeHost,
      activeSource: activeCredentials?.source ?? null,
      activeUser: activeCredentials?.user ?? null,
      credentials: (config?.credentialSets ?? []).map(
        ({ source, user, database, hasPassword }) => ({
          source,
          user,
          database,
          hasPassword,
        }),
      ),
      attempts: attempts.map(({ host, source, code }) => ({
        host,
        source,
        code,
      })),
    }),
    init,
    query,
    execute,
    transaction,
    close,
  };
}
