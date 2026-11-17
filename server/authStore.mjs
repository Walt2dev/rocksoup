import {
  createHash,
  createPublicKey,
  randomBytes,
  verify as verifySignature,
} from "node:crypto";

import { hashToken } from "./leaderboardStore.mjs";

const SESSION_COOKIE = "rs_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = new Set([
  "accounts.google.com",
  "https://accounts.google.com",
]);

let certsCache = { at: 0, keys: new Map() };
let certsPromise = null;

function nowMs() {
  return Date.now();
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function safeName(value, fallback = "Jugador") {
  const name = typeof value === "string" ? value.trim() : "";
  return (name || fallback).slice(0, 24);
}

function safeText(value, max = 255) {
  return typeof value === "string" ? value.slice(0, max) : null;
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

function normalizeEmailVerified(value) {
  return value === true || value === "true";
}

async function loadGoogleCerts({ force = false } = {}) {
  if (!force && certsCache.keys.size > 0 && nowMs() - certsCache.at < 60 * 60 * 1000) {
    return certsCache.keys;
  }
  if (certsPromise) {
    return certsPromise;
  }

  certsPromise = (async () => {
    const response = await fetch(GOOGLE_CERTS_URL, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Google JWKS respondió ${response.status}`);
    }
    const data = await response.json();
    const keys = new Map();
    for (const jwk of Array.isArray(data.keys) ? data.keys : []) {
      if (jwk?.kid && jwk.kty === "RSA") {
        keys.set(jwk.kid, jwk);
      }
    }
    if (keys.size === 0) {
      throw new Error("Google JWKS sin claves RSA válidas");
    }
    certsCache = { at: nowMs(), keys };
    return keys;
  })();

  try {
    return await certsPromise;
  } finally {
    certsPromise = null;
  }
}

export async function verifyGoogleIdToken(idToken, clientId) {
  if (typeof idToken !== "string" || idToken.length < 20 || !clientId) {
    throw new Error("Token de Google inválido");
  }

  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Token de Google mal formado");
  }

  let header;
  let payload;
  try {
    header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    throw new Error("Token de Google ilegible");
  }

  if (header.alg !== "RS256") {
    throw new Error("Algoritmo de Google no soportado");
  }

  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audience.includes(clientId)) {
    throw new Error("La audiencia del token no coincide");
  }
  if (!GOOGLE_ISSUERS.has(payload.iss)) {
    throw new Error("Emisor de Google inválido");
  }

  const now = Math.floor(nowMs() / 1000);
  if (!Number.isFinite(payload.exp) || payload.exp < now - 60) {
    throw new Error("Token de Google expirado");
  }
  if (!Number.isFinite(payload.iat) || payload.iat > now + 300) {
    throw new Error("Token de Google con fecha inválida");
  }
  if (!normalizeEmailVerified(payload.email_verified)) {
    throw new Error("El correo de Google no está verificado");
  }
  if (typeof payload.sub !== "string" || payload.sub.length < 4) {
    throw new Error("Token de Google sin identificador");
  }

  let keys = await loadGoogleCerts();
  let jwk = keys.get(header.kid);

  if (!jwk) {
    keys = await loadGoogleCerts({ force: true });
    jwk = keys.get(header.kid) ?? keys.values().next().value;
  }
  if (!jwk) {
    throw new Error("No se encontró la clave pública de Google");
  }

  let valid = false;
  try {
    const key = createPublicKey({ key: jwk, format: "jwk" });
    valid = verifySignature(
      "RSA-SHA256",
      Buffer.from(`${parts[0]}.${parts[1]}`),
      key,
      Buffer.from(parts[2], "base64url"),
    );
  } catch {
    valid = false;
  }
  if (!valid) {
    throw new Error("Firma de Google inválida");
  }

  return {
    sub: payload.sub,
    email: safeText(payload.email, 190),
    name: safeName(payload.name, safeName(payload.email, "Jugador")),
    picture: safeText(payload.picture, 255),
    emailVerified: normalizeEmailVerified(payload.email_verified),
  };
}

export function parseCookies(header) {
  const cookies = {};
  if (typeof header !== "string" || header.length === 0) {
    return cookies;
  }
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) {
      continue;
    }
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) {
      cookies[key] = decodeURIComponent(value);
    }
  }
  return cookies;
}

export function sessionTokenFromRequest(req) {
  const authorization = req?.headers?.authorization;
  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    const token = authorization.slice(7).trim();
    if (token.length >= 8) {
      return token;
    }
  }
  const cookies = parseCookies(req?.headers?.cookie);
  return typeof cookies[SESSION_COOKIE] === "string" ? cookies[SESSION_COOKIE] : "";
}

export function sessionCookie(token, { secure = false } = {}) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function clearSessionCookie({ secure = false } = {}) {
  const parts = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function publicUser(row) {
  if (!row) {
    return null;
  }
  return {
    id: Number(row.id),
    email: row.email ?? null,
    displayName: safeName(row.display_name),
    avatarUrl: row.avatar_url ?? null,
    createdAt: Number(row.created_at) || 0,
    updatedAt: Number(row.updated_at) || 0,
  };
}

export function createAuthStore({ db, env = process.env, logger = console } = {}) {
  const googleClientId = realEnv(env.GOOGLE_CLIENT_ID);

  async function findUserById(id) {
    const rows = await db.query("SELECT * FROM users WHERE id = ? LIMIT 1", [
      Number(id),
    ]);
    return publicUser(rows[0]);
  }

  async function upsertGoogleUser(profile) {
    const now = nowMs();
    const displayName = safeName(profile.name, safeName(profile.email, "Jugador"));
    await db.execute(
      `INSERT INTO users
         (google_sub, email, display_name, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         id = LAST_INSERT_ID(id),
         email = VALUES(email),
         display_name = VALUES(display_name),
         avatar_url = VALUES(avatar_url),
         updated_at = VALUES(updated_at)`,
      [
        profile.sub,
        profile.email,
        displayName,
        profile.picture,
        now,
        now,
      ],
    );
    const rows = await db.query("SELECT * FROM users WHERE google_sub = ? LIMIT 1", [
      profile.sub,
    ]);
    return publicUser(rows[0]);
  }

  async function createSession(userId, userAgent = "") {
    const token = randomBytes(32).toString("hex");
    const now = nowMs();
    await db.execute(
      `INSERT INTO sessions (token_hash, user_id, created_at, expires_at, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [
        hashToken(token),
        Number(userId),
        now,
        now + SESSION_TTL_MS,
        safeText(userAgent, 255),
      ],
    );
    return token;
  }

  async function loginWithGoogle(idToken, { userAgent = "" } = {}) {
    if (!db.isAvailable()) {
      const error = new Error("La base de datos no está configurada");
      error.status = 503;
      throw error;
    }
    if (!googleClientId) {
      const error = new Error("Google Sign-In no está configurado");
      error.status = 503;
      throw error;
    }

    const profile = await verifyGoogleIdToken(idToken, googleClientId);
    const user = await upsertGoogleUser(profile);
    const token = await createSession(user.id, userAgent);
    return { user, token };
  }

  async function resolveSession(token) {
    if (!db.isAvailable() || typeof token !== "string" || token.length < 8) {
      return null;
    }
    try {
      const rows = await db.query(
        `SELECT u.*, s.expires_at
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > ?
         LIMIT 1`,
        [hashToken(token), nowMs()],
      );
      return publicUser(rows[0]);
    } catch (error) {
      logger.warn?.(`[AUTH] No se pudo validar la sesión: ${error.message}`);
      return null;
    }
  }

  async function logout(token) {
    if (!db.isAvailable() || typeof token !== "string" || token.length < 8) {
      return;
    }
    await db
      .execute("DELETE FROM sessions WHERE token_hash = ?", [hashToken(token)])
      .catch(() => {});
  }

  async function cleanupExpiredSessions() {
    if (!db.isAvailable()) {
      return;
    }
    await db
      .execute("DELETE FROM sessions WHERE expires_at <= ?", [nowMs()])
      .catch(() => {});
  }

  async function linkGuestToken(token, userId) {
    if (!db.isAvailable() || typeof token !== "string" || token.length < 8) {
      return false;
    }
    await db.execute(
      `INSERT INTO guest_links (token_hash, user_id, claimed_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), claimed_at = VALUES(claimed_at)`,
      [hashToken(token), Number(userId), nowMs()],
    );
    return true;
  }

  return {
    googleClientId,
    isConfigured: Boolean(googleClientId),
    loginWithGoogle,
    resolveSession,
    logout,
    cleanupExpiredSessions,
    findUserById,
    linkGuestToken,
    parseCookies,
    sessionTokenFromRequest,
    sessionCookie,
    clearSessionCookie,
    hashToken: (value) => sha256(value),
  };
}
