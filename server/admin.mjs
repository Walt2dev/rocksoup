import { createHash, timingSafeEqual } from "node:crypto";
import { snapshotPvp } from "./pvp.mjs";

function realSecret(value) {
  if (typeof value !== "string") {
    return "";
  }
  let text = value
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
  if (text.length >= 2) {
    const first = text[0];
    const last = text[text.length - 1];
    if (
      (first === '"' && last === '"') ||
      (first === "'" && last === "'")
    ) {
      text = text.slice(1, -1).trim();
    }
  }
  if (!text || /^REEMPLAZA/i.test(text) || /^TU_/i.test(text)) {
    return "";
  }
  return text;
}

export function getAdminSecrets(env = process.env) {
  const values = [env.ADMIN_P2P, env.ADMIN_PASSWORD, env.ADMIN_TOKEN]
    .map(realSecret)
    .filter(Boolean);
  return [...new Set(values)];
}

export function describeAdminSecrets(env = process.env) {
  const p2p = realSecret(env.ADMIN_P2P);
  const password = realSecret(env.ADMIN_PASSWORD);
  const token = realSecret(env.ADMIN_TOKEN);
  return {
    p2pConfigured: Boolean(p2p),
    passwordConfigured: Boolean(password),
    tokenConfigured: Boolean(token),
    p2pLength: p2p.length,
    passwordLength: password.length,
    tokenLength: token.length,
    acceptedCount: new Set([p2p, password, token].filter(Boolean)).size,
  };
}

export function getAdminToken(env = process.env) {
  return getAdminSecrets(env)[0] ?? "";
}

export function isAdminConfigured(env = process.env) {
  return getAdminSecrets(env).length > 0;
}

function digest(value) {
  return createHash("sha256").update(String(value)).digest();
}

export function adminAuthorized(expectedToken, providedToken) {
  if (!expectedToken || !providedToken) {
    return false;
  }
  return timingSafeEqual(digest(expectedToken), digest(providedToken));
}

export function adminAuthorizedAny(expectedTokens, providedToken) {
  if (!providedToken) {
    return false;
  }
  return expectedTokens.some((token) => adminAuthorized(token, providedToken));
}

export function bearerToken(headerValue) {
  if (typeof headerValue !== "string") {
    return "";
  }
  const match = /^Bearer\s+(.+)$/i.exec(headerValue.trim());
  return match ? match[1].trim() : "";
}

export function buildAdminSnapshot({
  clients = [],
  pvp = null,
  started = false,
  hostId = null,
  now = Date.now(),
  leaderboard = null,
  rankingSource = "json",
} = {}) {
  const scoreById = new Map();

  if (pvp?.scores) {
    for (const [id, entry] of Object.entries(pvp.scores)) {
      scoreById.set(Number(id), entry);
    }
  }

  return {
    started: started === true,
    hostId,
    now,
    event: pvp ? snapshotPvp(pvp, now) : null,
    players: clients.map((client) => {
      const event = scoreById.get(client.id);
      return {
        id: client.id,
        name: client.name,
        color: client.color,
        skinId: client.skinId,
        x: client.x,
        y: client.y,
        health: client.health,
        connectedAt: Number.isFinite(client.connectedAt)
          ? client.connectedAt
          : null,
        connectedForMs: Number.isFinite(client.connectedAt)
          ? Math.max(0, now - client.connectedAt)
          : null,
        lastStateAt: Number.isFinite(client.lastStateAt)
          ? client.lastStateAt
          : null,
        lastStateAgeMs: Number.isFinite(client.lastStateAt)
          ? Math.max(0, now - client.lastStateAt)
          : null,
        workers: Array.isArray(client.workers) ? client.workers.length : 0,
        eventScore: event?.score ?? 0,
        eventKills: event?.kills ?? 0,
      };
    }),
    leaderboard: leaderboard ?? { points: [], best: [] },
    rankingSource,
  };
}
