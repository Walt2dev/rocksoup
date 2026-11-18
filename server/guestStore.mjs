import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { getProduct, publicProduct } from "./storeCatalog.mjs";
import { mergeGrants, sanitizeGrants } from "./grants.mjs";

const FILE_NAME = "guest-store.json";

function nowMs() {
  return Date.now();
}

function httpError(message, status = 400, extra = {}) {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
}

function safeGuestId(value) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  return /^[a-zA-Z0-9_-]{8,80}$/.test(trimmed) ? trimmed : "";
}

function emptyState() {
  return { orders: {}, guests: {} };
}

export function createGuestStore({ dataDir, paypal, logger = console } = {}) {
  const filePath = join(dataDir, FILE_NAME);
  let loaded = false;
  let state = emptyState();
  let writeQueue = Promise.resolve();

  async function load() {
    if (loaded) {
      return;
    }
    loaded = true;
    await mkdir(dataDir, { recursive: true }).catch(() => {});
    if (!existsSync(filePath)) {
      return;
    }
    try {
      const parsed = JSON.parse(await readFile(filePath, "utf8"));
      if (parsed && typeof parsed === "object") {
        state = {
          orders: parsed.orders && typeof parsed.orders === "object" ? parsed.orders : {},
          guests: parsed.guests && typeof parsed.guests === "object" ? parsed.guests : {},
        };
      }
    } catch (error) {
      logger.warn?.(`[GUEST] No se pudo leer ${FILE_NAME}: ${error.message}`);
      state = emptyState();
    }
  }

  function persist() {
    const snapshot = JSON.stringify(state);
    writeQueue = writeQueue
      .then(async () => {
        const temp = `${filePath}.tmp`;
        await writeFile(temp, snapshot, "utf8");
        await rename(temp, filePath);
      })
      .catch((error) => {
        logger.warn?.(`[GUEST] No se pudo guardar ${FILE_NAME}: ${error.message}`);
      });
    return writeQueue;
  }

  function guest(guestId) {
    const id = safeGuestId(guestId);
    if (!id) {
      throw httpError("Identificador de invitado inválido", 400);
    }
    state.guests[id] ??= {
      createdAt: nowMs(),
      pendingGrants: {},
      diamonds: 0,
      purchases: [],
    };
    const entry = state.guests[id];
    if (!entry.pendingGrants || typeof entry.pendingGrants !== "object") {
      entry.pendingGrants = {};
    }
    if (!Array.isArray(entry.purchases)) {
      entry.purchases = [];
    }
    if (!Number.isFinite(entry.diamonds)) {
      entry.diamonds = 0;
    }
    return { id, entry };
  }

  async function createOrder(guestId, productId) {
    await load();
    if (!paypal.configured) {
      throw httpError("PayPal no está configurado", 503);
    }
    const product = getProduct(productId);
    if (!product || product.kind !== "one_time") {
      throw httpError("Producto no disponible", 404);
    }
    const { id } = guest(guestId);
    const purchaseId = randomUUID();
    const order = await paypal.createOrder({ product, purchaseId, worldId: null });
    if (!order?.id) {
      throw httpError("PayPal no devolvió una orden válida", 502);
    }
    state.orders[order.id] = {
      id: order.id,
      purchaseId,
      guestId: id,
      productId: product.id,
      amountCents: product.priceCents,
      currency: product.currency ?? "MXN",
      status: order.status ?? "CREATED",
      grantsAdded: false,
      createdAt: nowMs(),
      capturedAt: 0,
    };
    await persist();
    return {
      orderId: order.id,
      product: publicProduct(product),
      status: order.status ?? "CREATED",
    };
  }

  async function captureOrder(guestId, orderId) {
    await load();
    const { id } = guest(guestId);
    const order = state.orders[String(orderId)];
    if (!order || order.guestId !== id) {
      throw httpError("Compra no encontrada", 404);
    }
    const product = getProduct(order.productId);
    if (!product) {
      throw httpError("Producto no disponible", 404);
    }

    if (order.status === "COMPLETED") {
      return {
        ok: true,
        alreadyCompleted: true,
        orderId: order.id,
        grants: sanitizeGrants(product.grants),
      };
    }

    let captured = null;
    try {
      captured = await paypal.captureOrder(orderId);
    } catch (error) {
      const existing = await paypal.getOrder(orderId).catch(() => null);
      if (existing?.status === "COMPLETED") {
        captured = existing;
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

    const expected = paypal.money(order.amountCents);
    const amount = capture.amount ?? {};
    if (
      String(amount.value) !== expected ||
      String(amount.currency_code).toUpperCase() !==
        String(order.currency).toUpperCase()
    ) {
      throw httpError("El monto o la moneda del pago no coinciden", 409, {
        expected,
        received: amount,
      });
    }

    order.status = "COMPLETED";
    order.capturedAt = nowMs();
    const grants = sanitizeGrants(product.grants);
    if (!order.grantsAdded) {
      const guestEntry = state.guests[id];
      guestEntry.pendingGrants = mergeGrants(guestEntry.pendingGrants, grants);
      if (grants.diamonds) {
        guestEntry.diamonds += grants.diamonds;
      }
      guestEntry.purchases.push({
        productId: product.id,
        orderId: order.id,
        amountCents: order.amountCents,
        currency: order.currency,
        at: order.capturedAt,
      });
      order.grantsAdded = true;
    }
    await persist();
    return {
      ok: true,
      orderId: order.id,
      productId: product.id,
      amountCents: order.amountCents,
      currency: order.currency,
      grants,
    };
  }

  async function pendingGrants(guestId) {
    await load();
    const { entry } = guest(guestId);
    return {
      grants: sanitizeGrants(entry.pendingGrants),
      diamonds: entry.diamonds,
      purchases: entry.purchases.slice(-20),
    };
  }

  async function acknowledgeGrants(guestId, grants = null) {
    await load();
    const { entry } = guest(guestId);
    if (grants && typeof grants === "object") {
      entry.pendingGrants = {};
    } else {
      entry.pendingGrants = {};
    }
    await persist();
    return { ok: true };
  }

  return {
    filePath,
    createOrder,
    captureOrder,
    pendingGrants,
    acknowledgeGrants,
  };
}
