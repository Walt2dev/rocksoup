import {
  buildSsl,
  isLeaderboardDbConfigured,
  readDbConfig,
} from "./leaderboardStore.mjs";

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
];

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
    ...(config.fallbackHosts ?? []),
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
        return false;
      }

      const ssl = buildSsl(config, logger);
      attempts = [];

      for (const host of connectionHosts(config)) {
        let candidate = null;
        try {
          candidate = mysql.createPool({
            host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database,
            waitForConnections: true,
            connectionLimit: config.connectionLimit,
            queueLimit: 40,
            enableKeepAlive: true,
            connectTimeout: 8000,
            ...(ssl ? { ssl } : {}),
          });
          await candidate.query("SELECT 1");
          for (const statement of SCHEMA) {
            await candidate.query(statement);
          }
          pool = candidate;
          available = true;
          activeHost = host;
          lastError = null;
          logger.log?.(
            `[DB] MySQL listo: cuentas, mundos y tienda activos (${host}).`,
          );
          return true;
        } catch (error) {
          await candidate?.end().catch(() => {});
          const failure = sanitizeDbError(error, config);
          attempts.push({ host, ...failure });
          logger.warn?.(
            `[DB] MySQL no disponible en ${host}:${config.port}/${config.database}: ${error.message}`,
          );
        }
      }

      available = false;
      pool = null;
      activeHost = null;
      lastError = attempts[0] ?? {
        code: "DB_INIT_FAILED",
        message: "No se pudo conectar a MySQL",
      };
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
      activeHost,
      attempts: attempts.map(({ host, code }) => ({ host, code })),
    }),
    init,
    query,
    execute,
    transaction,
    close,
  };
}
