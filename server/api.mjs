import {
  clearSessionCookie,
  sessionCookie,
  sessionTokenFromRequest,
} from "./authStore.mjs";
import { grantsAreEmpty, mergeGrants } from "./grants.mjs";
import { isPrivateHostname } from "../js/net/wsUrl.js";

const MAX_LOGIN_BODY = 16 * 1024;
const MAX_WEBHOOK_BODY = 512 * 1024;

function sendJson(res, status, data, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(JSON.stringify(data));
}

function methodNotAllowed(res, allow) {
  res.writeHead(405, { Allow: allow });
  res.end();
}

function originFrom(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isAllowedOrigin(origin, req, env) {
  if (!origin) {
    return true;
  }
  const publicOrigin =
    originFrom(env.PUBLIC_BASE_URL) ??
    originFrom(`https://${env.PUBLIC_HOST ?? ""}`);
  if (publicOrigin && origin === publicOrigin) {
    return true;
  }
  try {
    const parsed = new URL(origin);
    if (parsed.host === req.headers.host) {
      return true;
    }
    if (isPrivateHostname(parsed.hostname)) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function requestIsSecure(req, env) {
  const proto = String(req.headers["x-forwarded-proto"] ?? "").toLowerCase();
  if (proto === "https") {
    return true;
  }
  if (req.socket?.encrypted) {
    return true;
  }
  return String(env.PUBLIC_BASE_URL ?? "").startsWith("https://");
}

export function createApiHandler({
  db,
  authStore,
  accountStore,
  storeStore,
  paypal,
  mailer = null,
  rankingStore = null,
  clanStore = null,
  env = process.env,
  logger = console,
  readRequestBody,
}) {
  function applyCors(req, res) {
    const origin = req.headers.origin;
    if (!isAllowedOrigin(origin, req, env)) {
      return false;
    }
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, Accept",
      );
      res.setHeader("Access-Control-Max-Age", "600");
    }
    return true;
  }

  async function readJson(req, limit = 1024 * 1024) {
    const raw = await readRequestBody(req, limit);
    if (!raw) {
      return {};
    }
    try {
      return JSON.parse(raw);
    } catch {
      const error = new Error("JSON inválido");
      error.status = 400;
      throw error;
    }
  }

  async function requireUser(req, { allowMissing = false } = {}) {
    const token = sessionTokenFromRequest(req);
    const user = token ? await authStore.resolveSession(token) : null;
    if (!user && !allowMissing) {
      const error = new Error("Inicia sesión para continuar");
      error.status = 401;
      throw error;
    }
    return { user, token };
  }

  async function authMe(req, res) {
    const { user } = await requireUser(req, { allowMissing: true });
    if (!user) {
      sendJson(res, 200, { user: null });
      return;
    }
    await storeStore.replayPendingPurchases(user.id).catch(() => {});
    sendJson(res, 200, { user });
  }

  async function accountSummary(req, res) {
    const { user } = await requireUser(req);
    const [summary, entitlements] = await Promise.all([
      accountStore.summary(user.id),
      storeStore.entitlements(user.id),
    ]);
    sendJson(res, 200, {
      user,
      ...summary,
      subscriptions: entitlements.subscriptions,
      purchases: entitlements.purchases,
      paypal: paypal.publicConfig(),
    });
  }

  async function listWorlds(req, res) {
    const { user } = await requireUser(req);
    const summary = await accountStore.summary(user.id);
    sendJson(res, 200, summary);
  }

  async function createWorld(req, res) {
    const { user } = await requireUser(req);
    const body = await readJson(req, 8 * 1024 * 1024);
    const world = await accountStore.createWorld(user.id, {
      name: body.name,
      seed: body.seed,
      mode: body.mode,
      payload: body.payload,
      lore: body.lore,
    });
    sendJson(res, 201, { world });
  }

  async function loadWorld(req, res, worldId) {
    const { user } = await requireUser(req);
    await storeStore.replayPendingPurchases(user.id).catch(() => {});

    const claim = await storeStore.claimDueSubscriptionGrants(user.id);
    const pending = await accountStore.takePendingGrants(user.id, { worldId });
    const grants = mergeGrants(claim.grants, pending);

    if (!grantsAreEmpty(grants)) {
      await storeStore.applyGrantBundle(user.id, grants, { worldId });
    }

    const world = await accountStore.getWorld(user.id, worldId);
    if (!world) {
      sendJson(res, 404, { error: "Mundo no encontrado" });
      return;
    }

    sendJson(res, 200, {
      world,
      grants,
      subscriptionPeriods: claim.periods,
    });
  }

  async function saveWorld(req, res, worldId) {
    const { user } = await requireUser(req);
    const body = await readJson(req, 8 * 1024 * 1024);
    const world = await accountStore.saveWorld(user.id, worldId, {
      payload: body.payload,
      lore: body.lore,
      name: body.name,
      expectedVersion: body.version,
    });
    sendJson(res, 200, { world });
  }

  async function deleteWorld(req, res, worldId) {
    const { user } = await requireUser(req);
    const deleted = await accountStore.deleteWorld(user.id, worldId);
    if (!deleted) {
      sendJson(res, 404, { error: "Mundo no encontrado" });
      return;
    }
    sendJson(res, 200, { ok: true });
  }

  async function createOrder(req, res) {
    const { user } = await requireUser(req);
    const body = await readJson(req);
    const worldId = body.worldId ? String(body.worldId) : null;
    if (worldId) {
      const world = await accountStore.getWorld(user.id, worldId);
      if (!world) {
        sendJson(res, 404, { error: "Mundo no encontrado" });
        return;
      }
    }
    const order = await storeStore.createOrder(user.id, body.productId, {
      worldId,
    });
    sendJson(res, 201, order);
  }

  async function captureOrder(req, res, orderId) {
    const { user } = await requireUser(req);
    const result = await storeStore.captureOrder(user.id, orderId);
    const entitlements = await storeStore.entitlements(user.id);
    sendJson(res, 200, { ...result, entitlements });
  }

  async function storeProducts(req, res) {
    sendJson(res, 200, {
      products: storeStore.listProducts(),
      config: storeStore.config(),
    });
  }

  async function subscriptionIntent(req, res) {
    const { user } = await requireUser(req);
    const body = await readJson(req);
    const result = await storeStore.createSubscriptionIntent(user.id, body.productId);
    sendJson(res, 201, result);
  }

  async function subscriptionConfirm(req, res) {
    const { user } = await requireUser(req);
    const body = await readJson(req);
    const subscription = await storeStore.confirmSubscription(
      user.id,
      String(body.subscriptionId ?? ""),
    );
    const entitlements = await storeStore.entitlements(user.id);
    sendJson(res, 200, { subscription, entitlements });
  }

  async function subscriptionCancel(req, res) {
    const { user } = await requireUser(req);
    const body = await readJson(req);
    const result = await storeStore.cancelSubscription(
      user.id,
      String(body.subscriptionId ?? ""),
    );
    sendJson(res, 200, result);
  }

  async function applyGrants(req, res) {
    const { user } = await requireUser(req);
    const body = await readJson(req);
    const worldId = body.worldId ? String(body.worldId) : null;
    if (worldId) {
      const world = await accountStore.getWorld(user.id, worldId);
      if (!world) {
        sendJson(res, 404, { error: "Mundo no encontrado" });
        return;
      }
    }
    const claim = await storeStore.claimDueSubscriptionGrants(user.id);
    const pending = await accountStore.takePendingGrants(user.id, { worldId });
    const grants = mergeGrants(claim.grants, pending);
    const applied = await storeStore.applyGrantBundle(user.id, grants, { worldId });
    const summary = await accountStore.summary(user.id);
    sendJson(res, 200, {
      ok: true,
      grants,
      subscriptionPeriods: claim.periods,
      applied,
      summary,
    });
  }

  async function storeEntitlements(req, res) {
    const { user } = await requireUser(req);
    const entitlements = await storeStore.entitlements(user.id);
    sendJson(res, 200, entitlements);
  }

  return async function handleApi(req, res, url, pathname) {
    if (!pathname.startsWith("/api/")) {
      return false;
    }

    applyCors(req, res);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return true;
    }

    try {
      if (pathname === "/api/health" && req.method === "GET") {
        const paypalConfig = paypal.publicConfig();
        sendJson(res, 200, {
          ok: true,
          db: db.isAvailable(),
          auth: authStore.isConfigured,
          paypal: {
            configured: paypalConfig.configured,
            mode: paypalConfig.mode,
            webhookConfigured: paypalConfig.webhookConfigured,
          },
          mail: { configured: mailer?.isConfigured === true },
        });
        return true;
      }

      if (pathname === "/api/auth/config" && req.method === "GET") {
        sendJson(res, 200, {
          googleClientId: authStore.googleClientId || null,
          authConfigured: authStore.isConfigured,
          passwordAuthAvailable: authStore.passwordAuthAvailable === true,
          dbConfigured: db.isAvailable(),
          paypal: paypal.publicConfig(),
          mail: mailer?.publicConfig?.() ?? null,
          publicBaseUrl: env.PUBLIC_BASE_URL ?? null,
        });
        return true;
      }

      if (pathname === "/api/auth/register" && req.method === "POST") {
        const body = await readJson(req, MAX_LOGIN_BODY);
        const { user, token } = await authStore.registerWithPassword(
          {
            email: body.email,
            password: body.password,
            name: body.name,
            ref: body.ref,
          },
          { userAgent: req.headers["user-agent"] ?? "" },
        );
        const welcome = mailer?.sendWelcome?.(user);
        welcome
          ?.then((result) => {
            if (!result?.ok) {
              logger.warn?.(
                `[MAIL] No se pudo enviar la bienvenida: ${result?.error}`,
              );
            }
          })
          .catch((error) => {
            logger.warn?.(
              `[MAIL] No se pudo enviar la bienvenida: ${error.message}`,
            );
          });
        res.setHeader(
          "Set-Cookie",
          sessionCookie(token, { secure: requestIsSecure(req, env) }),
        );
        sendJson(res, 201, { user, token });
        return true;
      }

      if (pathname === "/api/auth/login" && req.method === "POST") {
        const body = await readJson(req, MAX_LOGIN_BODY);
        const { user, token } = await authStore.loginWithPassword(
          body.email,
          body.password,
          { userAgent: req.headers["user-agent"] ?? "" },
        );
        res.setHeader(
          "Set-Cookie",
          sessionCookie(token, { secure: requestIsSecure(req, env) }),
        );
        sendJson(res, 200, { user, token });
        return true;
      }

      if (pathname === "/api/auth/google" && req.method === "POST") {
        if (!db.isAvailable()) {
          sendJson(res, 503, { error: "La base de datos no está configurada" });
          return true;
        }
        const body = await readJson(req, MAX_LOGIN_BODY);
        const { user, token } = await authStore.loginWithGoogle(body.credential, {
          userAgent: req.headers["user-agent"] ?? "",
        });
        await storeStore.replayPendingPurchases(user.id).catch(() => {});
        res.setHeader(
          "Set-Cookie",
          sessionCookie(token, { secure: requestIsSecure(req, env) }),
        );
        sendJson(res, 200, { user, token });
        return true;
      }

      if (pathname === "/api/auth/me" && req.method === "GET") {
        await authMe(req, res);
        return true;
      }

      if (pathname === "/api/auth/logout" && req.method === "POST") {
        const token = sessionTokenFromRequest(req);
        await authStore.logout(token);
        res.setHeader(
          "Set-Cookie",
          clearSessionCookie({ secure: requestIsSecure(req, env) }),
        );
        sendJson(res, 200, { ok: true });
        return true;
      }

      if (pathname === "/api/auth/link-guest" && req.method === "POST") {
        const { user } = await requireUser(req);
        const body = await readJson(req);
        await authStore.linkGuestToken(body.guestToken, user.id);
        sendJson(res, 200, { ok: true });
        return true;
      }

      if (pathname === "/api/account" && req.method === "GET") {
        await accountSummary(req, res);
        return true;
      }

      if (pathname === "/api/worlds" && req.method === "GET") {
        await listWorlds(req, res);
        return true;
      }

      if (pathname === "/api/worlds" && req.method === "POST") {
        await createWorld(req, res);
        return true;
      }

      const worldMatch = pathname.match(/^\/api\/worlds\/([^/]+)$/);
      if (worldMatch) {
        const worldId = decodeURIComponent(worldMatch[1]);
        if (req.method === "GET") {
          await loadWorld(req, res, worldId);
          return true;
        }
        if (req.method === "PUT") {
          await saveWorld(req, res, worldId);
          return true;
        }
        if (req.method === "DELETE") {
          await deleteWorld(req, res, worldId);
          return true;
        }
        methodNotAllowed(res, "GET, PUT, DELETE");
        return true;
      }

      if (pathname === "/api/store/products" && req.method === "GET") {
        await storeProducts(req, res);
        return true;
      }

      if (pathname === "/api/store/config" && req.method === "GET") {
        sendJson(res, 200, storeStore.config());
        return true;
      }

      if (pathname === "/api/store/orders" && req.method === "POST") {
        await createOrder(req, res);
        return true;
      }

      const captureMatch = pathname.match(/^\/api\/store\/orders\/([^/]+)\/capture$/);
      if (captureMatch && req.method === "POST") {
        await captureOrder(req, res, decodeURIComponent(captureMatch[1]));
        return true;
      }

      if (pathname === "/api/store/subscriptions/intent" && req.method === "POST") {
        await subscriptionIntent(req, res);
        return true;
      }

      if (pathname === "/api/store/subscriptions/confirm" && req.method === "POST") {
        await subscriptionConfirm(req, res);
        return true;
      }

      if (pathname === "/api/store/subscriptions/cancel" && req.method === "POST") {
        await subscriptionCancel(req, res);
        return true;
      }

      if (pathname === "/api/store/entitlements" && req.method === "GET") {
        await storeEntitlements(req, res);
        return true;
      }

      if (pathname === "/api/store/grants/apply" && req.method === "POST") {
        await applyGrants(req, res);
        return true;
      }

      if (pathname === "/api/paypal/webhook" && req.method === "POST") {
        const raw = await readRequestBody(req, MAX_WEBHOOK_BODY);
        const result = await storeStore.handleWebhook(raw, req.headers);
        sendJson(res, 200, result);
        return true;
      }

      if (pathname === "/api/ranking" && req.method === "GET") {
        const limit = Number(url.searchParams.get("limit")) || 50;
        sendJson(res, 200, {
          ranking: rankingStore ? await rankingStore.top(limit) : [],
        });
        return true;
      }

      if (pathname === "/api/ranking/me" && req.method === "GET") {
        const { user } = await requireUser(req);
        sendJson(
          res,
          200,
          rankingStore ? await rankingStore.rankOf(user.id) : null,
        );
        return true;
      }

      if (pathname === "/api/clans" && req.method === "GET") {
        sendJson(res, 200, { clans: clanStore ? await clanStore.listClans() : [] });
        return true;
      }

      if (pathname === "/api/clans" && req.method === "POST") {
        const { user } = await requireUser(req);
        const body = await readJson(req);
        const clan = await clanStore.createClan(user.id, {
          name: body.name,
          tag: body.tag,
          description: body.description,
        });
        sendJson(res, 201, { clan });
        return true;
      }

      if (pathname === "/api/clans/me" && req.method === "GET") {
        const { user } = await requireUser(req);
        sendJson(res, 200, { clan: clanStore ? await clanStore.myClan(user.id) : null });
        return true;
      }

      if (pathname === "/api/clans/eligibility" && req.method === "GET") {
        const { user } = await requireUser(req);
        sendJson(res, 200, await clanStore.eligibility(user.id));
        return true;
      }

      if (pathname === "/api/clans/request" && req.method === "POST") {
        const { user } = await requireUser(req);
        const body = await readJson(req);
        await clanStore.requestJoin(user.id, String(body.clanId ?? ""));
        sendJson(res, 200, { ok: true });
        return true;
      }

      if (pathname === "/api/clans/requests" && req.method === "GET") {
        const { user } = await requireUser(req);
        sendJson(res, 200, { requests: await clanStore.listRequests(user.id) });
        return true;
      }

      if (pathname === "/api/clans/requests/accept" && req.method === "POST") {
        const { user } = await requireUser(req);
        const body = await readJson(req);
        await clanStore.acceptRequest(user.id, Number(body.userId));
        sendJson(res, 200, { ok: true });
        return true;
      }

      if (pathname === "/api/clans/requests/decline" && req.method === "POST") {
        const { user } = await requireUser(req);
        const body = await readJson(req);
        await clanStore.declineRequest(user.id, Number(body.userId));
        sendJson(res, 200, { ok: true });
        return true;
      }

      if (pathname === "/api/clans/invite" && req.method === "POST") {
        const { user } = await requireUser(req);
        const body = await readJson(req);
        const clanId = body.clanId
          ? String(body.clanId)
          : await clanStore.clanIdOf(user.id);
        if (!clanId) {
          sendJson(res, 403, { error: "No perteneces a ningún clan." });
          return true;
        }
        const result = await clanStore.invite(clanId, user.id, {
          userId: body.userId,
          email: body.email,
          username: body.username,
        });
        sendJson(res, 200, { ok: true, userId: result.userId });
        return true;
      }

      if (pathname === "/api/clans/accept" && req.method === "POST") {
        const { user } = await requireUser(req);
        const body = await readJson(req);
        const clan = await clanStore.acceptInvite(user.id, String(body.clanId ?? ""));
        sendJson(res, 200, { clan });
        return true;
      }

      if (pathname === "/api/clans/decline" && req.method === "POST") {
        const { user } = await requireUser(req);
        const body = await readJson(req);
        await clanStore.declineInvite(user.id, String(body.clanId ?? ""));
        sendJson(res, 200, { ok: true });
        return true;
      }

      if (pathname === "/api/clans/leave" && req.method === "POST") {
        const { user } = await requireUser(req);
        await clanStore.leaveClan(user.id);
        sendJson(res, 200, { ok: true });
        return true;
      }

      if (pathname === "/api/clans/kick" && req.method === "POST") {
        const { user } = await requireUser(req);
        const body = await readJson(req);
        await clanStore.kick(String(body.clanId ?? ""), user.id, Number(body.userId));
        sendJson(res, 200, { ok: true });
        return true;
      }

      if (pathname === "/api/clans/relation" && req.method === "POST") {
        const { user } = await requireUser(req);
        const body = await readJson(req);
        const result = await clanStore.setRelation(
          user.id,
          String(body.clanId ?? ""),
          String(body.action ?? ""),
        );
        sendJson(res, 200, result);
        return true;
      }

      const clanMatch = pathname.match(/^\/api\/clans\/([^/]+)$/);
      if (clanMatch && req.method === "GET") {
        const clan = clanStore
          ? await clanStore.clanDetail(decodeURIComponent(clanMatch[1]))
          : null;
        if (!clan) {
          sendJson(res, 404, { error: "Clan no encontrado" });
          return true;
        }
        sendJson(res, 200, { clan });
        return true;
      }

      sendJson(res, 404, { error: "Ruta no encontrada" });
      return true;
    } catch (error) {
      const status = Number(error.status) || 500;
      if (status >= 500) {
        logger.warn?.(`[API] ${req.method} ${pathname}: ${error.message}`);
      }
      sendJson(res, status, {
        error: error.message || "Error interno",
        code: error.code ?? null,
        ...(error.currentVersion ? { currentVersion: error.currentVersion } : {}),
        ...(error.capacity ? { capacity: error.capacity } : {}),
      });
      return true;
    }
  };
}
