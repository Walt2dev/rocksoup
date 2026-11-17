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

function parsePayPalDate(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function splitGrants(value) {
  const clean = sanitizeGrants(value);
  const { diamonds = 0, worldSlots = 0, entitlements = [], ...rest } = clean;
  return {
    diamonds,
    worldSlots,
    entitlements,
    consumable: sanitizeGrants(rest),
  };
}

export function createStoreStore({
  db,
  accountStore,
  paypal,
  logger = console,
} = {}) {
  const planPromises = new Map();

  async function init() {
    if (!db.isAvailable()) {
      return false;
    }
    const now = nowMs();
    for (const product of STORE_PRODUCTS) {
      await db.execute(
        `INSERT INTO store_products
           (id, name, description, category, kind, price_cents, currency, active, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           description = VALUES(description),
           category = VALUES(category),
           kind = VALUES(kind),
           price_cents = VALUES(price_cents),
           currency = VALUES(currency),
           active = 1,
           updated_at = VALUES(updated_at)`,
        [
          product.id,
          product.name,
          product.description,
          product.category,
          product.kind,
          product.priceCents,
          product.currency ?? "MXN",
          now,
        ],
      );
    }
    logger.log?.("[STORE] Catálogo sincronizado.");
    return true;
  }

  function listProducts() {
    return publicProducts();
  }

  function config() {
    return {
      ...paypal.publicConfig(),
      currency: "MXN",
      maxCatchupDays: MAX_CATCHUP_DAYS,
    };
  }

  async function applySpecialGrants(userId, grants) {
    const parts = splitGrants(grants);
    if (parts.worldSlots > 0) {
      await accountStore.addWorldSlots(userId, parts.worldSlots);
    }
    if (parts.diamonds > 0) {
      await accountStore.addDiamonds(userId, parts.diamonds);
    }
    if (parts.entitlements.length > 0) {
      await accountStore.addEntitlements(userId, parts.entitlements, {
        source: "store",
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

  async function createOrder(userId, productId, { worldId = null } = {}) {
    if (!db.isAvailable()) {
      throw httpError("La base de datos no está configurada", 503);
    }
    const product = getProduct(productId);
    if (!product || product.kind !== "one_time") {
      throw httpError("Producto no disponible", 404);
    }

    const purchaseId = randomUUID();
    const now = nowMs();
    const currency = product.currency ?? "MXN";

    await db.execute(
      `INSERT INTO purchases
         (id, user_id, product_id, provider, provider_order_id, amount_cents,
          currency, status, world_id, grant_status, created_at, captured_at, raw_json)
       VALUES (?, ?, ?, 'paypal', NULL, ?, ?, 'created', ?, 'pending', ?, NULL, NULL)`,
      [
        purchaseId,
        Number(userId),
        product.id,
        product.priceCents,
        currency,
        worldId ? String(worldId) : null,
        now,
      ],
    );

    try {
      const order = await paypal.createOrder({ product, purchaseId, worldId });
      if (!order?.id) {
        throw httpError("PayPal no devolvió una orden válida", 502);
      }
      await db.execute(
        "UPDATE purchases SET provider_order_id = ?, raw_json = ? WHERE id = ?",
        [order.id, JSON.stringify(order), purchaseId],
      );
      return {
        orderId: order.id,
        purchaseId,
        status: order.status ?? "CREATED",
        product: publicProduct(product),
      };
    } catch (error) {
      await db
        .execute(
          "UPDATE purchases SET status = 'failed', raw_json = ? WHERE id = ?",
          [JSON.stringify({ error: error.message }), purchaseId],
        )
        .catch(() => {});
      throw error;
    }
  }

  async function markPurchaseGranted(purchase, grantStatus = "granted") {
    await db.execute(
      "UPDATE purchases SET grant_status = ? WHERE id = ?",
      [grantStatus, purchase.id],
    );
  }

  async function ensurePurchaseGranted(purchase) {
    const product = getProduct(purchase.product_id);
    if (!product) {
      throw httpError("Producto de la compra ya no existe", 409);
    }

    const claimed = await db.transaction(async (connection) => {
      const [rows] = await connection.execute(
        "SELECT grant_status FROM purchases WHERE id = ? FOR UPDATE",
        [purchase.id],
      );
      if (!rows[0] || rows[0].grant_status === "granted") {
        return false;
      }
      await connection.execute(
        "UPDATE purchases SET grant_status = 'processing' WHERE id = ?",
        [purchase.id],
      );
      return true;
    });

    if (!claimed) {
      return { already: true, grants: sanitizeGrants(product.grants) };
    }

    try {
      const result = await applyGrantBundle(purchase.user_id, product.grants, {
        worldId: purchase.world_id,
      });
      await markPurchaseGranted(purchase, "granted");
      return result;
    } catch (error) {
      await markPurchaseGranted(purchase, "error").catch(() => {});
      throw error;
    }
  }

  async function captureOrder(userId, orderId) {
    if (!db.isAvailable()) {
      throw httpError("La base de datos no está configurada", 503);
    }
    const rows = await db.query(
      `SELECT * FROM purchases
       WHERE provider_order_id = ? AND user_id = ?
       LIMIT 1`,
      [String(orderId), Number(userId)],
    );
    const purchase = rows[0];
    if (!purchase) {
      throw httpError("Compra no encontrada", 404);
    }

    if (purchase.status === "completed") {
      const grant = await ensurePurchaseGranted(purchase);
      return {
        ok: true,
        alreadyCompleted: true,
        purchaseId: purchase.id,
        grant,
      };
    }

    let captured = null;
    try {
      captured = await paypal.captureOrder(orderId);
    } catch (error) {
      const order = await paypal.getOrder(orderId).catch(() => null);
      if (order?.status === "COMPLETED") {
        captured = order;
      } else {
        throw error;
      }
    }

    const unit = captured?.purchase_units?.[0];
    const capture = unit?.payments?.captures?.find(
      (entry) => entry.status === "COMPLETED",
    );
    if (captured?.status !== "COMPLETED" || !capture) {
      throw httpError("PayPal no confirmó el pago", 402, {
        paypalStatus: captured?.status ?? "UNKNOWN",
      });
    }

    const expectedValue = paypal.money(purchase.amount_cents);
    const amount = capture.amount ?? {};
    if (
      String(amount.value) !== expectedValue ||
      String(amount.currency_code).toUpperCase() !==
        String(purchase.currency).toUpperCase()
    ) {
      throw httpError("El monto o la moneda del pago no coinciden", 409, {
        expected: { value: expectedValue, currency: purchase.currency },
        received: amount,
      });
    }

    const capturedAt = parsePayPalDate(capture.create_time) ?? nowMs();
    await db.execute(
      `UPDATE purchases
       SET status = 'completed', captured_at = ?, raw_json = ?
       WHERE id = ? AND status <> 'completed'`,
      [capturedAt, JSON.stringify(captured), purchase.id],
    );

    const completedPurchase = {
      ...purchase,
      status: "completed",
      captured_at: capturedAt,
    };
    const grant = await ensurePurchaseGranted(completedPurchase);

    return {
      ok: true,
      purchaseId: purchase.id,
      productId: purchase.product_id,
      amountCents: purchase.amount_cents,
      currency: purchase.currency,
      grant,
    };
  }

  async function listPurchases(userId, limit = 20) {
    if (!db.isAvailable()) {
      return [];
    }
    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit) || 20));
    const rows = await db.query(
      `SELECT id, product_id, provider_order_id, amount_cents, currency, status,
              world_id, grant_status, created_at, captured_at
       FROM purchases
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ${safeLimit}`,
      [Number(userId)],
    );
    return rows.map((row) => {
      const product = getProduct(row.product_id);
      return {
        id: row.id,
        productId: row.product_id,
        productName: product?.name ?? row.product_id,
        orderId: row.provider_order_id,
        amountCents: Number(row.amount_cents) || 0,
        currency: row.currency,
        status: row.status,
        worldId: row.world_id,
        grantStatus: row.grant_status,
        createdAt: Number(row.created_at) || 0,
        capturedAt: Number(row.captured_at) || 0,
      };
    });
  }

  async function ensurePlan(product) {
    if (planPromises.has(product.id)) {
      return planPromises.get(product.id);
    }

    const promise = (async () => {
      const rows = await db.query(
        "SELECT provider_product_id, provider_plan_id FROM store_plans WHERE plan_key = ? LIMIT 1",
        [product.id],
      );
      if (rows.length > 0) {
        return {
          planId: rows[0].provider_plan_id,
          providerProductId: rows[0].provider_product_id,
        };
      }

      const providerProduct = await paypal.createCatalogProduct({
        name: `Sopa de Piedras · ${product.name}`,
        description: product.description,
      });
      if (!providerProduct?.id) {
        throw httpError("PayPal no creó el producto de suscripción", 502);
      }
      const plan = await paypal.createBillingPlan({
        productId: providerProduct.id,
        name: `Sopa de Piedras · ${product.name}`,
        description: product.description,
        priceCents: product.priceCents,
        currency: product.currency ?? "MXN",
      });
      if (!plan?.id) {
        throw httpError("PayPal no creó el plan de suscripción", 502);
      }
      await db.execute(
        `INSERT INTO store_plans
           (plan_key, provider_product_id, provider_plan_id, updated_at)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           provider_product_id = VALUES(provider_product_id),
           provider_plan_id = VALUES(provider_plan_id),
           updated_at = VALUES(updated_at)`,
        [product.id, providerProduct.id, plan.id, nowMs()],
      );
      return { planId: plan.id, providerProductId: providerProduct.id };
    })();

    planPromises.set(product.id, promise);
    try {
      return await promise;
    } finally {
      planPromises.delete(product.id);
    }
  }

  async function createSubscriptionIntent(userId, productId) {
    if (!db.isAvailable()) {
      throw httpError("La base de datos no está configurada", 503);
    }
    const product = getProduct(productId);
    if (!product || product.kind !== "subscription") {
      throw httpError("Plan no disponible", 404);
    }
    if (!paypal.configured) {
      throw httpError("PayPal no está configurado", 503);
    }
    const plan = await ensurePlan(product);
    const intentId = randomUUID();
    await db.execute(
      `INSERT INTO subscription_intents (id, user_id, plan_key, created_at, used_at)
       VALUES (?, ?, ?, ?, NULL)`,
      [intentId, Number(userId), product.id, nowMs()],
    );
    return {
      planId: plan.planId,
      customId: intentId,
      product: publicProduct(product),
    };
  }

  async function subscriptionStatusFromPayPal(subscription) {
    const status = String(subscription?.status ?? "APPROVAL_PENDING").toUpperCase();
    return status;
  }

  async function currentPeriodEnd(subscription) {
    return (
      parsePayPalDate(subscription?.billing_info?.next_billing_time) ??
      nowMs() + 30 * DAY_MS
    );
  }

  async function linkSubscription(userId, subscription) {
    if (!subscription?.id) {
      throw httpError("Suscripción de PayPal inválida", 400);
    }
    const planRows = await db.query(
      "SELECT plan_key FROM store_plans WHERE provider_plan_id = ? LIMIT 1",
      [subscription.plan_id],
    );
    let planKey = planRows[0]?.plan_key ?? null;

    if (!planKey && subscription.custom_id) {
      const intentRows = await db.query(
        "SELECT plan_key, user_id FROM subscription_intents WHERE id = ? LIMIT 1",
        [subscription.custom_id],
      );
      if (intentRows[0] && Number(intentRows[0].user_id) === Number(userId)) {
        planKey = intentRows[0].plan_key;
      }
    }
    if (!planKey) {
      throw httpError("No se reconoce el plan de esta suscripción", 409);
    }
    if (!getProduct(planKey)) {
      throw httpError("Plan no disponible", 404);
    }

    const existingRows = await db.query(
      "SELECT * FROM subscriptions WHERE provider_subscription_id = ? LIMIT 1",
      [subscription.id],
    );
    const existing = existingRows[0];
    if (existing && Number(existing.user_id) !== Number(userId)) {
      throw httpError("Esta suscripción pertenece a otra cuenta", 403);
    }

    const now = nowMs();
    const status = await subscriptionStatusFromPayPal(subscription);
    const periodEnd = await currentPeriodEnd(subscription);
    const lastGrantAt = existing
      ? Number(existing.last_grant_at) || now - DAY_MS
      : now - DAY_MS;

    await db.execute(
      `INSERT INTO subscriptions
         (id, user_id, plan_key, provider, provider_subscription_id, status,
          current_period_end, last_grant_at, created_at, updated_at, raw_json)
       VALUES (?, ?, ?, 'paypal', ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         user_id = VALUES(user_id),
         plan_key = VALUES(plan_key),
         status = VALUES(status),
         current_period_end = VALUES(current_period_end),
         last_grant_at = IFNULL(last_grant_at, VALUES(last_grant_at)),
         updated_at = VALUES(updated_at),
         raw_json = VALUES(raw_json)`,
      [
        existing?.id ?? randomUUID(),
        Number(userId),
        planKey,
        subscription.id,
        status,
        periodEnd,
        lastGrantAt,
        now,
        now,
        JSON.stringify(subscription),
      ],
    );

    if (subscription.custom_id) {
      await db
        .execute(
          "UPDATE subscription_intents SET used_at = ? WHERE id = ?",
          [now, subscription.custom_id],
        )
        .catch(() => {});
    }

    return await getSubscriptionByProviderId(subscription.id);
  }

  async function getSubscriptionByProviderId(providerId) {
    const rows = await db.query(
      "SELECT * FROM subscriptions WHERE provider_subscription_id = ? LIMIT 1",
      [String(providerId)],
    );
    return rows[0] ?? null;
  }

  async function confirmSubscription(userId, subscriptionId) {
    if (!db.isAvailable()) {
      throw httpError("La base de datos no está configurada", 503);
    }
    const subscription = await paypal.getSubscription(subscriptionId);
    if (!subscription?.id) {
      throw httpError("Suscripción de PayPal inválida", 400);
    }
    return await linkSubscription(userId, subscription);
  }

  async function handleSubscriptionWebhook(resource, eventType) {
    if (!resource?.id) {
      return;
    }
    const existing = await getSubscriptionByProviderId(resource.id);
    const planRows = await db.query(
      "SELECT plan_key FROM store_plans WHERE provider_plan_id = ? LIMIT 1",
      [resource.plan_id],
    );
    let planKey = planRows[0]?.plan_key ?? existing?.plan_key ?? null;
    let intentUserId = null;
    if (resource.custom_id) {
      const intentRows = await db.query(
        "SELECT plan_key, user_id FROM subscription_intents WHERE id = ? LIMIT 1",
        [resource.custom_id],
      );
      if (intentRows[0]) {
        planKey = planKey ?? intentRows[0].plan_key;
        intentUserId = Number(intentRows[0].user_id);
      }
    }

    const status =
      eventType === "BILLING.SUBSCRIPTION.CANCELLED"
        ? "CANCELLED"
        : eventType === "BILLING.SUBSCRIPTION.SUSPENDED"
          ? "SUSPENDED"
          : eventType === "BILLING.SUBSCRIPTION.EXPIRED"
            ? "EXPIRED"
            : String(resource.status ?? "ACTIVE").toUpperCase();
    const periodEnd = await currentPeriodEnd(resource);

    if (existing) {
      await db.execute(
        `UPDATE subscriptions
         SET status = ?, current_period_end = ?, updated_at = ?, raw_json = ?
         WHERE id = ?`,
        [status, periodEnd, nowMs(), JSON.stringify(resource), existing.id],
      );
      return;
    }

    if (!planKey || !intentUserId) {
      return;
    }

    const now = nowMs();
    await db.execute(
      `INSERT INTO subscriptions
         (id, user_id, plan_key, provider, provider_subscription_id, status,
          current_period_end, last_grant_at, created_at, updated_at, raw_json)
       VALUES (?, ?, ?, 'paypal', ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         current_period_end = VALUES(current_period_end),
         updated_at = VALUES(updated_at),
         raw_json = VALUES(raw_json)`,
      [
        randomUUID(),
        intentUserId,
        planKey,
        resource.id,
        status,
        periodEnd,
        now - DAY_MS,
        now,
        now,
        JSON.stringify(resource),
      ],
    );
  }

  async function claimDueSubscriptionGrants(userId) {
    if (!db.isAvailable()) {
      return { grants: {}, periods: 0, subscriptions: [] };
    }

    return db.transaction(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT * FROM subscriptions
         WHERE user_id = ? AND status = 'ACTIVE'
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
        await connection.execute(
          "UPDATE subscriptions SET last_grant_at = ?, updated_at = ? WHERE id = ?",
          [newLast, now, row.id],
        );
        periodsTotal += periods;
        claimed.push({ planKey: row.plan_key, periods });
      }

      return { grants, periods: periodsTotal, subscriptions: claimed };
    });
  }

  async function applyDueSubscriptionGrants(userId, { worldId = null } = {}) {
    const claim = await claimDueSubscriptionGrants(userId);
    if (grantsAreEmpty(claim.grants)) {
      return { ...claim, applied: false };
    }
    const applied = await applyGrantBundle(userId, claim.grants, { worldId });
    return { ...claim, ...applied };
  }

  async function handleWebhook(rawBody, headers) {
    const valid = await paypal.verifyWebhook(rawBody, headers);
    if (!valid) {
      throw httpError("Webhook de PayPal no verificado", 401);
    }

    let event;
    try {
      event = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    } catch {
      throw httpError("Webhook de PayPal inválido", 400);
    }

    const eventId = String(event.id ?? "").slice(0, 80);
    if (!eventId) {
      throw httpError("Webhook sin identificador", 400);
    }

    const insert = await db.execute(
      `INSERT IGNORE INTO paypal_events (event_id, event_type, created_at, raw_json)
       VALUES (?, ?, ?, ?)`,
      [eventId, String(event.event_type ?? "unknown").slice(0, 64), nowMs(), JSON.stringify(event)],
    );
    if (Number(insert.affectedRows) === 0) {
      return { duplicate: true, eventId };
    }

    const type = event.event_type;
    const resource = event.resource ?? {};

    if (type === "PAYMENT.CAPTURE.COMPLETED") {
      const orderId = resource.supplementary_data?.related_ids?.order_id;
      if (orderId) {
        const rows = await db.query(
          "SELECT * FROM purchases WHERE provider_order_id = ? LIMIT 1",
          [String(orderId)],
        );
        const purchase = rows[0];
        if (purchase) {
          const expectedValue = paypal.money(purchase.amount_cents);
          const amount = resource.amount ?? {};
          const matches =
            String(amount.value) === expectedValue &&
            String(amount.currency_code).toUpperCase() ===
              String(purchase.currency).toUpperCase();
          if (!matches) {
            logger.warn?.(
              `[STORE] Webhook con monto distinto para ${orderId}; se ignora.`,
            );
            return { ok: true, warning: "amount_mismatch" };
          }
          if (purchase.status !== "completed") {
            await db.execute(
              `UPDATE purchases
               SET status = 'completed', captured_at = ?, raw_json = ?
               WHERE id = ?`,
              [nowMs(), JSON.stringify(event), purchase.id],
            );
          }
          await ensurePurchaseGranted({
            ...purchase,
            status: "completed",
          }).catch((error) => {
            logger.warn?.(`[STORE] No se pudo entregar compra ${purchase.id}: ${error.message}`);
          });
        }
      }
    } else if (type === "PAYMENT.CAPTURE.REFUNDED") {
      const orderId = resource.supplementary_data?.related_ids?.order_id;
      if (orderId) {
        await db.execute(
          `UPDATE purchases
           SET status = 'refunded', grant_status = 'revoked', raw_json = ?
           WHERE provider_order_id = ?`,
          [JSON.stringify(event), String(orderId)],
        );
      }
    } else if (
      type === "BILLING.SUBSCRIPTION.ACTIVATED" ||
      type === "BILLING.SUBSCRIPTION.UPDATED" ||
      type === "BILLING.SUBSCRIPTION.RENEWED" ||
      type === "BILLING.SUBSCRIPTION.CANCELLED" ||
      type === "BILLING.SUBSCRIPTION.SUSPENDED" ||
      type === "BILLING.SUBSCRIPTION.EXPIRED"
    ) {
      await handleSubscriptionWebhook(resource, type);
    } else if (type === "PAYMENT.SALE.COMPLETED") {
      const subscriptionId = resource.billing_agreement_id;
      if (subscriptionId) {
        await db.execute(
          `UPDATE subscriptions
           SET status = 'ACTIVE', current_period_end = ?, updated_at = ?, raw_json = ?
           WHERE provider_subscription_id = ?`,
          [nowMs() + 30 * DAY_MS, nowMs(), JSON.stringify(event), String(subscriptionId)],
        );
      }
    }

    return { ok: true, eventId, type };
  }

  async function listSubscriptions(userId) {
    if (!db.isAvailable()) {
      return [];
    }
    const rows = await db.query(
      `SELECT plan_key, status, current_period_end, last_grant_at, created_at
       FROM subscriptions
       WHERE user_id = ?
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

  async function cancelSubscription(userId, subscriptionId) {
    const rows = await db.query(
      `SELECT * FROM subscriptions
       WHERE provider_subscription_id = ? AND user_id = ?
       LIMIT 1`,
      [String(subscriptionId), Number(userId)],
    );
    const subscription = rows[0];
    if (!subscription) {
      throw httpError("Suscripción no encontrada", 404);
    }
    await paypal.cancelSubscription(subscription.provider_subscription_id);
    await db.execute(
      "UPDATE subscriptions SET status = 'CANCELLED', updated_at = ? WHERE id = ?",
      [nowMs(), subscription.id],
    );
    return { ok: true };
  }

  async function entitlements(userId) {
    const [slots, diamonds, subscriptions, purchases] = await Promise.all([
      accountStore.getSlots(userId),
      accountStore.getWallet(userId),
      listSubscriptions(userId),
      listPurchases(userId),
    ]);
    return { slots, diamonds, subscriptions, purchases };
  }

  async function replayPendingPurchases(userId) {
    const rows = await db.query(
      `SELECT * FROM purchases
       WHERE user_id = ? AND status = 'completed' AND grant_status <> 'granted'
       ORDER BY created_at ASC
       LIMIT 20`,
      [Number(userId)],
    );
    for (const purchase of rows) {
      await ensurePurchaseGranted(purchase).catch(() => {});
    }
  }

  return {
    init,
    listProducts,
    config,
    createOrder,
    captureOrder,
    listPurchases,
    createSubscriptionIntent,
    confirmSubscription,
    claimDueSubscriptionGrants,
    applyDueSubscriptionGrants,
    applySpecialGrants,
    applyGrantBundle,
    handleWebhook,
    listSubscriptions,
    cancelSubscription,
    entitlements,
    replayPendingPurchases,
    getProduct,
    publicProduct,
    applyGrantsToSave,
  };
}
