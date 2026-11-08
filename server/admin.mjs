import { createHash, timingSafeEqual } from "node:crypto";
import { snapshotPvp } from "./pvp.mjs";

export function getAdminToken(env = process.env) {
  return typeof env.ADMIN_TOKEN === "string" ? env.ADMIN_TOKEN.trim() : "";
}

export function isAdminConfigured(env = process.env) {
  return getAdminToken(env).length > 0;
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
