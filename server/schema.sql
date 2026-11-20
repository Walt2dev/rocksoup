CREATE TABLE IF NOT EXISTS leaderboard (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(24) NOT NULL,
  color VARCHAR(16) NOT NULL,
  points INT UNSIGNED NOT NULL DEFAULT 0,
  kills INT UNSIGNED NOT NULL DEFAULT 0,
  deaths INT UNSIGNED NOT NULL DEFAULT 0,
  best_streak INT UNSIGNED NOT NULL DEFAULT 0,
  events_won INT UNSIGNED NOT NULL DEFAULT 0,
  best_event_score INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL,
  KEY idx_points (points DESC, kills DESC),
  KEY idx_best (best_event_score DESC, points DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS world_state (
  world_id VARCHAR(64) NOT NULL PRIMARY KEY,
  payload LONGTEXT NOT NULL,
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  google_sub VARCHAR(64) NULL UNIQUE,
  email VARCHAR(190) NULL,
  display_name VARCHAR(24) NOT NULL,
  avatar_url VARCHAR(255) NULL,
  referred_by BIGINT UNSIGNED NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_credentials (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  KEY idx_credentials_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  user_agent VARCHAR(255) NULL,
  KEY idx_sessions_user (user_id),
  KEY idx_sessions_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS guest_links (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  claimed_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS player_worlds (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_world_slots (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  purchased_slots INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_wallets (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  diamonds INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wood_types (
  id VARCHAR(48) NOT NULL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  biome_id TINYINT UNSIGNED NULL,
  realm VARCHAR(16) NOT NULL DEFAULT 'surface',
  active TINYINT(1) NOT NULL DEFAULT 1,
  render_mode VARCHAR(16) NOT NULL DEFAULT 'procedural',
  density DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  style_json LONGTEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE KEY uq_wood_biome (realm, biome_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wood_sprites (
  wood_id VARCHAR(48) NOT NULL,
  variant TINYINT UNSIGNED NOT NULL,
  mime VARCHAR(32) NOT NULL,
  width INT UNSIGNED NOT NULL,
  height INT UNSIGNED NOT NULL,
  data LONGBLOB NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (wood_id, variant)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS economy_wallets (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  drac_coins BIGINT UNSIGNED NOT NULL DEFAULT 0,
  prestige BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS economy_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  currency VARCHAR(16) NOT NULL,
  amount BIGINT NOT NULL,
  balance_after BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(48) NOT NULL,
  ref_type VARCHAR(32) NULL,
  ref_id VARCHAR(96) NULL,
  world_id CHAR(36) NULL,
  created_at BIGINT NOT NULL,
  KEY idx_economy_user (user_id, created_at DESC),
  KEY idx_economy_reason (user_id, reason, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS economy_claims (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  kind VARCHAR(48) NOT NULL,
  ref_id VARCHAR(96) NOT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE KEY uq_economy_claim (user_id, kind, ref_id),
  KEY idx_economy_claims_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS economy_products (
  id VARCHAR(48) NOT NULL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(255) NOT NULL,
  category VARCHAR(24) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  price_currency VARCHAR(16) NOT NULL,
  price_amount INT UNSIGNED NOT NULL,
  icon VARCHAR(16) NULL,
  badge VARCHAR(32) NULL,
  grants_json LONGTEXT NULL,
  daily_grants_json LONGTEXT NULL,
  contract_days INT UNSIGNED NULL,
  highlights_json LONGTEXT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS economy_migrations (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  applied_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_entitlements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  entitlement_key VARCHAR(64) NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  source VARCHAR(64) NULL,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NULL,
  KEY idx_entitlements_user (user_id, entitlement_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_pending_grants (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  world_id CHAR(36) NULL,
  grants_json LONGTEXT NOT NULL,
  created_at BIGINT NOT NULL,
  applied_at BIGINT NULL,
  KEY idx_grants_user (user_id, applied_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscriptions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  plan_key VARCHAR(48) NOT NULL,
  provider VARCHAR(16) NOT NULL DEFAULT 'economy',
  provider_subscription_id VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(24) NOT NULL,
  current_period_end BIGINT NULL,
  last_grant_at BIGINT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  raw_json LONGTEXT NULL,
  KEY idx_subscriptions_user (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS play_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  player_name VARCHAR(24) NOT NULL,
  connected_at BIGINT NOT NULL,
  last_seen_at BIGINT NOT NULL,
  disconnected_at BIGINT NULL,
  duration_ms BIGINT UNSIGNED NULL,
  KEY idx_play_user (user_id, connected_at),
  KEY idx_play_connected (connected_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS rank_entries (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  points INT UNSIGNED NOT NULL DEFAULT 0,
  villages INT UNSIGNED NOT NULL DEFAULT 0,
  units INT UNSIGNED NOT NULL DEFAULT 0,
  waves INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL,
  KEY idx_rank_points (points DESC, updated_at ASC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rank_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  kind VARCHAR(24) NOT NULL,
  ref_id VARCHAR(64) NOT NULL,
  points INT UNSIGNED NOT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE KEY uq_rank_event (user_id, kind, ref_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rank_daily (
  user_id BIGINT UNSIGNED NOT NULL,
  kind VARCHAR(24) NOT NULL,
  day BIGINT NOT NULL,
  points INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, kind, day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clans (
  id VARCHAR(12) NOT NULL PRIMARY KEY,
  name VARCHAR(32) NOT NULL UNIQUE,
  tag VARCHAR(4) NOT NULL UNIQUE,
  leader_user_id BIGINT UNSIGNED NOT NULL,
  description VARCHAR(140) NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clan_members (
  clan_id VARCHAR(12) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role VARCHAR(12) NOT NULL DEFAULT 'member',
  joined_at BIGINT NOT NULL,
  PRIMARY KEY (user_id),
  KEY idx_clan_members_clan (clan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clan_invites (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  clan_id VARCHAR(12) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  invited_by BIGINT UNSIGNED NOT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE KEY uq_clan_invite (clan_id, user_id),
  KEY idx_clan_invites_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clan_relations (
  clan_a VARCHAR(12) NOT NULL,
  clan_b VARCHAR(12) NOT NULL,
  relation VARCHAR(12) NOT NULL DEFAULT 'neutral',
  requested_by VARCHAR(12) NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (clan_a, clan_b)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clan_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  clan_id VARCHAR(12) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE KEY uq_clan_request (clan_id, user_id),
  KEY idx_clan_requests_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

