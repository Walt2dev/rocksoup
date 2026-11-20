import { randomUUID } from "node:crypto";

import {
  STORE_PRODUCTS,
  getProduct,
  publicProduct,
  publicProducts,
} from "./storeCatalog.mjs";
import {
  applyGrantsToSave,
  grantsAreEmpty,
  mergeGrants,
  sanitizeGrants,
} from "./grants.mjs";
import {
  ECONOMY_REWARDS,
  STARTING_WALLET,
  economyDayKey,
  rewardFor,
  rewardCurrencies,
} from "../js/game/economy.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CATCHUP_DAYS = 7;

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

function splitGrants(value) {
  const clean = sanitizeGrants(value);
  const { worldSlots = 0, entitlements = [], diamonds = 0, ...rest } = clean;
  return {
    worldSlots,
    entitlements,
    diamonds,
    consumable: sanitizeGrants(rest),
  };
}

function walletRow(row) {
  return {
    dracCoins: Number(row?.drac_coins) || 0,
    prestige: Number(row?.prestige) || 0,
  };
}

export function createEconomyStore({
  db,
  accountStore,
  logger = console,
} = {}) {
  async function init() {
    if (!db.isAvailable()) {
      return false;
    }
    const now = nowMs();
    for (const product of STORE_PRODUCTS) {
      await db.execute(
        `INSERT INTO economy_products
           (id, name, description, category, kind, price_currency, price_amount,
            icon, badge, grants_json, daily_grants_json, contract_days,
            highlights_json, active, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           description = VALUES(description),
           category = VALUES(category),
           kind = VALUES(kind),
           price_currency = VALUES(price_currency),
           price_amount = VALUES(price_amount),
           icon = VALUES(icon),
           badge = VALUES(badge),
           grants_json = VALUES(grants_json),
           daily_grants_json = VALUES(daily_grants_json),
           contract_days = VALUES(contract_days),
           highlights_json = VALUES(highlights_json),
           active = 1,
           updated_at = VALUES(updated_at)`,
        [
          product.id,
          product.name,
          product.description,
          product.category,
          product.kind,
          product.price.currency,
          product.price.amount,
          product.icon ?? null,
          product.badge ?? null,
          JSON.stringify(product.grants ?? {}),
          JSON.stringify(product.dailyGrants ?? {}),
          product.contractDays ?? null,
          JSON.stringify(product.highlights ?? []),
          now,
        ],
      );
    }
    logger.log?.("[ECONOMY] Catálogo sincronizado.");
    return true;
  }

  function listProducts() {
    return publicProducts();
  }

  function config() {
    return {
      economyEnabled: true,
      startingWallet: { ...STARTING_WALLET },
      currencies: ["drac", "prestige", "essence"],
      maxCatchupDays: MAX_CATCHUP_DAYS,
    };
  }

  async function ensureWallet(userId) {
    await db.execute(
      `INSERT IGNORE INTO economy_wallets
         (user_id, drac_coins, prestige, updated_at)
       VALUES (?, ?, ?, ?)`,
      [
        Number(userId),
        STARTING_WALLET.dracCoins,
        STARTING_WALLET.prestige,
        nowMs(),
      ],
    );
  }

  async function getWallet(userId) {
    await ensureWallet(userId);
    const rows = await db.query(
      "SELECT drac_coins, prestige FROM economy_wallets WHERE user_id = ? LIMIT 1",
      [Number(userId)],
    );
    return walletRow(rows[0]);
  }

  async function applySpecialGrants(userId, grants) {
    const parts = splitGrants(grants);
    if (parts.worldSlots > 0) {
      await accountStore.addWorldSlots(userId, parts.worldSlots);
    }
    if (parts.entitlements.length > 0) {
      await accountStore.addEntitlements(userId, parts.entitlements, {
        source: "economy",
      });
    }
    return parts.consumable;
  }

  async function applyGrantBundle(userId, grants, { worldId = null } = {}) {
    const consumable = await applySpecialGrants(userId, grants);
    if (grantsAreEmpty(consumable)) {
      return { applied: true, pending: false, grants: sanitizeGrants(grants) };
    }

    if (worldId) {
      const world = await accountStore.getWorld(userId, worldId);
      if (world?.payload) {
        await accountStore.applyGrantsToWorld(userId, worldId, consumable);
        return {
          applied: true,
          pending: false,
          worldId,
          grants: sanitizeGrants(grants),
        };
      }
    }

    await accountStore.addPendingGrants(userId, consumable, { worldId });
    return {
      applied: false,
      pending: true,
      worldId,
      grants: sanitizeGrants(grants),
    };
  }

  async function insertTransaction(connection, entry) {
    await connection.execute(
      `INSERT INTO economy_transactions
         (user_id, currency, amount, balance_after, reason, ref_type, ref_id,
          world_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(entry.userId),
        entry.currency,
        Math.trunc(entry.amount),
        Math.max(0, Math.floor(entry.balanceAfter)),
        entry.reason,
        entry.refType ?? null,
        entry.refId ?? null,
        entry.worldId ? String(entry.worldId) : null,
        entry.now ?? nowMs(),
      ],
    );
  }

  async function adjustWallet(connection, userId, currency, amount, details) {
    const column = currency === "prestige" ? "prestige" : "drac_coins";
    const [rows] = await connection.execute(
      `SELECT drac_coins, prestige FROM economy_wallets
       WHERE user_id = ? FOR UPDATE`,
      [Number(userId)],
    );
    if (!rows[0]) {
      await connection.execute(
        `INSERT INTO economy_wallets
           (user_id, drac_coins, prestige, updated_at)
         VALUES (?, ?, ?, ?)`,
        [
          Number(userId),
          STARTING_WALLET.dracCoins,
          STARTING_WALLET.prestige,
          nowMs(),
        ],
      );
    }
    const current = rows[0]
      ? walletRow(rows[0])
      : { ...STARTING_WALLET };
    const key = currency === "prestige" ? "prestige" : "dracCoins";
    const next = current[key] + amount;
    if (next < 0) {
      throw httpError("Saldo insuficiente", 402, {
        code: "INSUFFICIENT_FUNDS",
        wallet: current,
      });
    }
    await connection.execute(
      `UPDATE economy_wallets SET ${column} = ?, updated_at = ? WHERE user_id = ?`,
      [Math.floor(next), nowMs(), Number(userId)],
    );
    if (amount !== 0) {
      await insertTransaction(connection, {
        userId,
        currency,
        amount,
        balanceAfter: next,
        reason: details.reason,
        refType: details.refType,
        refId: details.refId,
        worldId: details.worldId,
        now: details.now,
      });
    }
    return next;
  }

  async function award(
    userId,
    kind,
    { refId = "", worldId = null, now = nowMs() } = {},
  ) {
    if (!db.isAvailable()) {
      throw httpError("La economía requiere la base de datos", 503);
    }
    const rule = rewardFor(kind);
    if (!rule) {
      throw httpError("Recompensa desconocida", 404);
    }

    const id = Number(userId);
    const reward = rewardCurrencies(rule);
    const claimRef = rule.daily
      ? `${kind}:${economyDayKey(now)}`
      : String(refId ?? "").slice(0, 96);
    const claimable = rule.dedupe || rule.daily;
    await ensureWallet(id);

    const result = await db.transaction(async (connection) => {
      const [walletRows] = await connection.execute(
        "SELECT drac_coins, prestige FROM economy_wallets WHERE user_id = ? FOR UPDATE",
        [id],
      );
      let wallet = walletRow(walletRows[0]);

      if (claimable) {
        const [claim] = await connection.execute(
          `INSERT IGNORE INTO economy_claims (user_id, kind, ref_id, created_at)
           VALUES (?, ?, ?, ?)`,
          [id, kind, claimRef || "default", now],
        );
        if (Number(claim.affectedRows) === 0) {
          return { awarded: false, reason: "claimed", wallet };
        }
      }

      if (rule.dailyCap) {
        const start = economyDayKey(now) * DAY_MS;
        const [usedRows] = await connection.execute(
          `SELECT COALESCE(SUM(amount), 0) AS total
           FROM economy_transactions
           WHERE user_id = ? AND currency = 'drac' AND reason = ? AND created_at >= ?`,
          [id, kind, start],
        );
        const used = Math.max(0, Number(usedRows[0]?.total) || 0);
        const allowed = Math.min(
          reward.dracCoins,
          Math.max(0, rule.dailyCap - used),
        );
        if (allowed <= 0 && reward.dracCoins > 0) {
          return { awarded: false, reason: "daily_cap", wallet };
        }
        reward.dracCoins = allowed;
      }

      if (reward.dracCoins > 0) {
        wallet = {
          ...wallet,
          dracCoins: await adjustWallet(
            connection,
            id,
            "drac",
            reward.dracCoins,
            {
              reason: kind,
              refType: "reward",
              refId: claimRef || kind,
              worldId,
              now,
            },
          ),
        };
      }
      if (reward.prestige > 0) {
        wallet = {
          ...wallet,
          prestige: await adjustWallet(
            connection,
            id,
            "prestige",
            reward.prestige,
            {
              reason: kind,
              refType: "reward",
              refId: claimRef || kind,
              worldId,
              now,
            },
          ),
        };
      }

      return {
        awarded: reward.dracCoins > 0 || reward.prestige > 0 || reward.essences > 0,
        wallet,
        dracCoins: reward.dracCoins,
        prestige: reward.prestige,
        essences: reward.essences,
        kind,
      };
    });

    if (result.awarded && result.essences > 0) {
      try {
        await accountStore.addPendingGrants(
          id,
          { resources: { esencia: result.essences } },
          { worldId: worldId ? String(worldId) : null },
        );
      } catch (error) {
        result.essenceError = error.message;
        logger.warn?.(
          `[ECONOMY] No se pudieron guardar Esencias de ${kind}: ${error.message}`,
        );
      }
    }

    return result;
  }

  async function claimDaily(userId, { worldId = null, now = nowMs() } = {}) {
    return award(userId, "daily_objective", {
      refId: "daily",
      worldId,
      now,
    });
  }

  async function purchase(userId, productId, { worldId = null } = {}) {
    if (!db.isAvailable()) {
      throw httpError("La tienda requiere la base de datos", 503);
    }
    const product = getProduct(productId);
    if (!product) {
      throw httpError("Producto no disponible", 404);
    }
    const currency = product.price.currency;
    if (currency !== "drac" && currency !== "prestige") {
      throw httpError("Moneda de compra no válida", 400);
    }

    const id = Number(userId);
    const now = nowMs();
    await ensureWallet(id);

    const wallet = await db.transaction(async (connection) => {
      const next = await adjustWallet(
        connection,
        id,
        currency,
        -product.price.amount,
        {
          reason: "purchase",
          refType: "product",
          refId: product.id,
          worldId,
          now,
        },
      );
      if (product.kind === "contract") {
        const days = Math.max(1, Math.min(365, Number(product.contractDays) || 30));
        await connection.execute(
          `INSERT INTO subscriptions
             (id, user_id, plan_key, provider, provider_subscription_id, status,
              current_period_end, last_grant_at, created_at, updated_at, raw_json)
           VALUES (?, ?, ?, 'economy', ?, 'ACTIVE', ?, ?, ?, ?, ?)`,
          [
            randomUUID(),
            id,
            product.id,
            `economy:${randomUUID()}`,
            now + days * DAY_MS,
            now,
            now,
            now,
            JSON.stringify({ productId: product.id, days }),
          ],
        );
      }
      const [walletRows] = await connection.execute(
        "SELECT drac_coins, prestige FROM economy_wallets WHERE user_id = ? LIMIT 1",
        [id],
      );
      return walletRow(walletRows[0]);
    });

    if (product.kind === "contract") {
      return {
        ok: true,
        wallet,
        product: publicProduct(product),
        contract: {
          days: product.contractDays ?? 30,
          endsAt: now + (product.contractDays ?? 30) * DAY_MS,
        },
        grant: null,
      };
    }

    let grant = null;
    let grantError = null;
    try {
      grant = await applyGrantBundle(id, product.grants ?? {}, { worldId });
    } catch (error) {
      grantError = error.message;
      logger.warn?.(
        `[ECONOMY] Compra ${product.id} cobrada pero sin entrega: ${error.message}`,
      );
    }

    return {
      ok: true,
      wallet: await getWallet(id),
      product: publicProduct(product),
      grant,
      grantError,
      purchaseId: randomUUID(),
    };
  }

  async function claimDueContractGrants(userId) {
    if (!db.isAvailable()) {
      return { grants: {}, periods: 0, contracts: [] };
    }
    return db.transaction(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT * FROM subscriptions
         WHERE user_id = ? AND provider = 'economy' AND status = 'ACTIVE'
         FOR UPDATE`,
        [Number(userId)],
      );
      const now = nowMs();
      let grants = {};
      let periodsTotal = 0;
      const claimed = [];

      for (const row of rows) {
        const product = getProduct(row.plan_key);
        if (!product?.dailyGrants) {
          continue;
        }
        const last = Number(row.last_grant_at) || 0;
        if (last <= 0) {
          await connection.execute(
            "UPDATE subscriptions SET last_grant_at = ?, updated_at = ? WHERE id = ?",
            [now, now, row.id],
          );
          continue;
        }
        let periods = Math.floor((now - last) / DAY_MS);
        if (periods <= 0) {
          continue;
        }
        periods = Math.min(periods, MAX_CATCHUP_DAYS);
        const daily = sanitizeGrants(product.dailyGrants);
        for (let index = 0; index < periods; index += 1) {
          grants = mergeGrants(grants, daily);
        }
        const newLast = last + periods * DAY_MS;
        const expired =
          Number(row.current_period_end) > 0 &&
          newLast >= Number(row.current_period_end);
        await connection.execute(
          "UPDATE subscriptions SET last_grant_at = ?, status = ?, updated_at = ? WHERE id = ?",
          [newLast, expired ? "EXPIRED" : row.status, now, row.id],
        );
        periodsTotal += periods;
        claimed.push({ planKey: row.plan_key, periods });
      }

      return { grants, periods: periodsTotal, contracts: claimed };
    });
  }

  async function applyDueContractGrants(userId, { worldId = null } = {}) {
    const claim = await claimDueContractGrants(userId);
    if (grantsAreEmpty(claim.grants)) {
      return { ...claim, applied: false };
    }
    const applied = await applyGrantBundle(userId, claim.grants, { worldId });
    return { ...claim, ...applied };
  }

  async function listContracts(userId) {
    if (!db.isAvailable()) {
      return [];
    }
    const rows = await db.query(
      `SELECT plan_key, status, current_period_end, last_grant_at, created_at
       FROM subscriptions
       WHERE user_id = ? AND provider = 'economy'
       ORDER BY created_at DESC`,
      [Number(userId)],
    );
    return rows.map((row) => {
      const product = getProduct(row.plan_key);
      return {
        planKey: row.plan_key,
        name: product?.name ?? row.plan_key,
        status: row.status,
        currentPeriodEnd: Number(row.current_period_end) || 0,
        lastGrantAt: Number(row.last_grant_at) || 0,
        createdAt: Number(row.created_at) || 0,
      };
    });
  }

  async function listTransactions(userId, limit = 30) {
    if (!db.isAvailable()) {
      return [];
    }
    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit) || 30));
    const rows = await db.query(
      `SELECT id, currency, amount, balance_after, reason, ref_type, ref_id,
              world_id, created_at
       FROM economy_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ${safeLimit}`,
      [Number(userId)],
    );
    return rows.map((row) => ({
      id: Number(row.id),
      currency: row.currency,
      amount: Number(row.amount) || 0,
      balanceAfter: Number(row.balance_after) || 0,
      reason: row.reason,
      refType: row.ref_type,
      refId: row.ref_id,
      worldId: row.world_id,
      createdAt: Number(row.created_at) || 0,
    }));
  }

  async function summary(userId) {
    const [wallet, contracts, transactions] = await Promise.all([
      getWallet(userId),
      listContracts(userId),
      listTransactions(userId, 20),
    ]);
    return { wallet, contracts, transactions };
  }

  return {
    init,
    listProducts,
    config,
    getWallet,
    ensureWallet,
    award,
    claimDaily,
    purchase,
    claimDueContractGrants,
    applyDueContractGrants,
    applyGrantBundle,
    applySpecialGrants,
    listContracts,
    listTransactions,
    summary,
    getProduct,
    publicProduct,
    applyGrantsToSave,
    isEconomyEnabled: () => true,
    rewards: ECONOMY_REWARDS,
  };
}
