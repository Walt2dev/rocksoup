const SANDBOX_API = "https://api-m.sandbox.paypal.com";
const LIVE_API = "https://api-m.paypal.com";
const SANDBOX_WEB = "https://www.sandbox.paypal.com";
const LIVE_WEB = "https://www.paypal.com";
const REQUEST_TIMEOUT_MS = 20000;

function money(cents) {
  return (Math.max(0, Math.floor(Number(cents) || 0)) / 100).toFixed(2);
}

function safeText(value, max = 120) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function realEnv(value) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed || /^REEMPLAZA/i.test(trimmed) || /^TU_/i.test(trimmed)) {
    return "";
  }
  return trimmed;
}

function serviceError(message, status = 502, details = null) {
  const error = new Error(message);
  error.status = status;
  if (details) {
    error.details = details;
  }
  return error;
}

export function createPayPal({ env = process.env, logger = console } = {}) {
  const clientId = realEnv(env.PAYPAL_CLIENT_ID);
  const clientSecret = realEnv(env.PAYPAL_CLIENT_SECRET);
  const webhookId = realEnv(env.PAYPAL_WEBHOOK_ID);
  const mode = String(env.PAYPAL_MODE ?? "sandbox").toLowerCase() === "live"
    ? "live"
    : "sandbox";
  const apiBase = mode === "live" ? LIVE_API : SANDBOX_API;
  const webBase = mode === "live" ? LIVE_WEB : SANDBOX_WEB;
  const configured = Boolean(clientId && clientSecret);

  let tokenCache = { token: "", expiresAt: 0 };
  let tokenPromise = null;

  function requireConfigured() {
    if (!configured) {
      throw serviceError(
        "PayPal no está configurado. Añade PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET.",
        503,
      );
    }
  }

  async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      if (error.name === "AbortError") {
        throw serviceError("PayPal no respondió a tiempo.", 504);
      }
      throw serviceError(`No se pudo contactar a PayPal: ${error.message}`, 502);
    } finally {
      clearTimeout(timer);
    }
  }

  async function getAccessToken() {
    requireConfigured();
    if (tokenCache.token && tokenCache.expiresAt > Date.now() + 30000) {
      return tokenCache.token;
    }
    if (tokenPromise) {
      return tokenPromise;
    }

    tokenPromise = (async () => {
      const response = await fetchWithTimeout(`${apiBase}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: "grant_type=client_credentials",
      });
      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      if (!response.ok || !data?.access_token) {
        logger.warn?.(`[PAYPAL] OAuth ${response.status}: ${text.slice(0, 300)}`);
        throw serviceError("PayPal rechazó las credenciales.", 502, data);
      }
      const expiresIn = Number(data.expires_in) > 0 ? Number(data.expires_in) : 300;
      tokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + expiresIn * 1000,
      };
      return data.access_token;
    })();

    try {
      return await tokenPromise;
    } finally {
      tokenPromise = null;
    }
  }

  async function apiFetch(path, { method = "GET", body = null, headers = {} } = {}) {
    const token = await getAccessToken();
    const response = await fetchWithTimeout(`${apiBase}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...headers,
      },
      body: body === null ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!response.ok) {
      logger.warn?.(`[PAYPAL] ${method} ${path} ${response.status}: ${text.slice(0, 400)}`);
      throw serviceError(
        data?.message || `PayPal respondió ${response.status}`,
        502,
        data,
      );
    }
    return data;
  }

  function sdkUrl(intent) {
    const params = new URLSearchParams({
      "client-id": clientId,
      currency: "MXN",
      intent,
      components: "buttons",
      locale: "es_MX",
      "disable-funding": "credit",
    });
    if (intent === "subscription") {
      params.set("vault", "true");
    }
    return `${webBase}/sdk/js?${params.toString()}`;
  }

  function publicConfig() {
    return {
      configured,
      mode,
      clientId: configured ? clientId : null,
      webhookConfigured: Boolean(webhookId),
      captureSdkUrl: configured ? sdkUrl("capture") : null,
      subscriptionSdkUrl: configured ? sdkUrl("subscription") : null,
    };
  }

  async function createOrder({ product, purchaseId, worldId = null }) {
    requireConfigured();
    const currency = product.currency ?? "MXN";
    const body = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: product.id,
          custom_id: purchaseId,
          invoice_id: purchaseId.slice(0, 127),
          description: safeText(product.name, 120),
          amount: {
            currency_code: currency,
            value: money(product.priceCents),
          },
        },
      ],
      application_context: {
        brand_name: "Sopa de Piedras",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
      },
    };
    if (worldId) {
      body.purchase_units[0].custom_id = `${purchaseId}|${worldId}`.slice(0, 127);
    }
    const order = await apiFetch("/v2/checkout/orders", {
      method: "POST",
      body,
    });
    return order;
  }

  async function captureOrder(orderId) {
    requireConfigured();
    const order = await apiFetch(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      { method: "POST", body: {} },
    );
    return order;
  }

  async function getOrder(orderId) {
    requireConfigured();
    return apiFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
  }

  async function createCatalogProduct({ name, description }) {
    requireConfigured();
    return apiFetch("/v1/catalogs/products", {
      method: "POST",
      body: {
        name: safeText(name, 127),
        description: safeText(description || name, 256),
        type: "SERVICE",
        category: "SOFTWARE",
      },
    });
  }

  async function createBillingPlan({
    productId,
    name,
    description,
    priceCents,
    currency = "MXN",
  }) {
    requireConfigured();
    return apiFetch("/v1/billing/plans", {
      method: "POST",
      body: {
        product_id: productId,
        name: safeText(name, 127),
        description: safeText(description || name, 127),
        billing_cycles: [
          {
            frequency: { interval_unit: "MONTH", interval_count: 1 },
            tenure_type: "REGULAR",
            sequence: 1,
            total_cycles: 0,
            pricing_scheme: {
              fixed_price: {
                value: money(priceCents),
                currency_code: currency,
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee_failure_action: "CONTINUE",
          payment_failure_threshold: 3,
        },
      },
    });
  }

  async function getSubscription(subscriptionId) {
    requireConfigured();
    return apiFetch(
      `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
    );
  }

  async function cancelSubscription(subscriptionId, reason = "Cancelada por el usuario") {
    requireConfigured();
    const token = await getAccessToken();
    const response = await fetchWithTimeout(
      `${apiBase}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ reason: safeText(reason, 128) }),
      },
    );
    if (!response.ok && response.status !== 204) {
      const text = await response.text();
      throw serviceError(`No se pudo cancelar la suscripción: ${text.slice(0, 200)}`);
    }
    return true;
  }

  async function verifyWebhook(rawBody, headers = {}) {
    if (!webhookId) {
      logger.warn?.("[PAYPAL] Webhook sin PAYPAL_WEBHOOK_ID; no se puede verificar.");
      return false;
    }
    let event;
    try {
      event = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    } catch {
      return false;
    }
    const verification = {
      auth_algo: headers["paypal-auth-algo"] ?? headers["PAYPAL-AUTH-ALGO"],
      cert_url: headers["paypal-cert-url"] ?? headers["PAYPAL-CERT-URL"],
      transmission_id:
        headers["paypal-transmission-id"] ?? headers["PAYPAL-TRANSMISSION-ID"],
      transmission_sig:
        headers["paypal-transmission-sig"] ?? headers["PAYPAL-TRANSMISSION-SIG"],
      transmission_time:
        headers["paypal-transmission-time"] ?? headers["PAYPAL-TRANSMISSION-TIME"],
      webhook_id: webhookId,
      webhook_event: event,
    };
    if (
      !verification.auth_algo ||
      !verification.cert_url ||
      !verification.transmission_id ||
      !verification.transmission_sig ||
      !verification.transmission_time
    ) {
      return false;
    }
    const result = await apiFetch("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: verification,
    });
    return result?.verification_status === "SUCCESS";
  }

  return {
    configured,
    mode,
    clientId,
    webhookId,
    publicConfig,
    getAccessToken,
    createOrder,
    captureOrder,
    getOrder,
    createCatalogProduct,
    createBillingPlan,
    getSubscription,
    cancelSubscription,
    verifyWebhook,
    money,
  };
}
