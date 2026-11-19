import {
  createHash,
  createPublicKey,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  verify as verifySignature,
} from "node:crypto";
import { promisify } from "node:util";

import { hashToken } from "./leaderboardStore.mjs";

const SESSION_COOKIE = "rs_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const STARTING_DIAMONDS = 5;
const REFERRAL_DIAMONDS = 5;
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

const scrypt = promisify(scryptCallback);
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 200;

function normalizeEmail(value) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (email.length < 3 || email.length > 190) {
    return "";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "";
  }
  return email;
}

function validatePassword(value) {
  if (typeof value !== "string") {
    return "La contraseña es obligatoria";
  }
  if (value.length < PASSWORD_MIN) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`;
  }
  if (value.length > PASSWORD_MAX) {
    return "La contraseña es demasiado larga";
  }
  return "";
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derived.toString("hex")}`;
}

async function verifyPassword(password, stored) {
  if (typeof stored !== "string") {
    return false;
  }
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) {
    return false;
  }
  try {
    const derived = await scrypt(password, salt, Buffer.from(hash, "hex").length, {
      N: Number(n) || SCRYPT_N,
      r: Number(r) || SCRYPT_R,
      p: Number(p) || SCRYPT_P,
    });
    const expected = Buffer.from(hash, "hex");
    return (
      derived.length === expected.length && timingSafeEqual(derived, expected)
    );
  } catch {
    return false;
  }
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
  const loginAttempts = new Map();

  async function findUserById(id) {
    const rows = await db.query("SELECT * FROM users WHERE id = ? LIMIT 1", [
      Number(id),
    ]);
    return publicUser(rows[0]);
  }

  function authError(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
  }

  function checkLoginRate(email) {
    const now = nowMs();
    const entry = loginAttempts.get(email);
    if (!entry) {
      return;
    }
    if (entry.resetAt <= now) {
      loginAttempts.delete(email);
      return;
    }
    if (entry.count >= 10) {
      throw authError(
        "Demasiados intentos. Espera 15 minutos antes de volver a intentar.",
        429,
      );
    }
  }

  function recordLoginFailure(email) {
    const now = nowMs();
    const entry = loginAttempts.get(email);
    if (!entry || entry.resetAt <= now) {
      loginAttempts.set(email, { count: 1, resetAt: now + 15 * 60 * 1000 });
      return;
    }
    entry.count += 1;
  }

  function clearLoginFailures(email) {
    loginAttempts.delete(email);
  }

  async function createUserWithEmail({ email, password, name, ref } = {}) {
    if (!db.isAvailable()) {
      throw authError("La base de datos no está configurada", 503);
    }
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) {
      throw authError("Ingresa un correo válido");
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      throw authError(passwordError);
    }
    const displayName = safeName(
      name,
      safeName(cleanEmail.split("@")[0], "Jugador"),
    );
    const passwordHash = await hashPassword(password);
    const now = nowMs();

    return db.transaction(async (connection) => {
      const [credentialRows] = await connection.execute(
        "SELECT user_id FROM user_credentials WHERE email = ? FOR UPDATE",
        [cleanEmail],
      );
      if (credentialRows.length > 0) {
        throw authError("Ese correo ya está registrado", 409);
      }

      const [userRows] = await connection.execute(
        "SELECT id FROM users WHERE email = ? LIMIT 1 FOR UPDATE",
        [cleanEmail],
      );

      let userId;
      if (userRows.length > 0) {
        userId = Number(userRows[0].id);
        await connection.execute(
          "UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?",
          [displayName, now, userId],
        );
      } else {
        const [result] = await connection.execute(
          `INSERT INTO users
             (google_sub, email, display_name, avatar_url, created_at, updated_at)
           VALUES (NULL, ?, ?, NULL, ?, ?)`,
          [cleanEmail, displayName, now, now],
        );
        userId = Number(result.insertId);
      }

      await connection.execute(
        `INSERT INTO user_credentials
           (user_id, email, password_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, cleanEmail, passwordHash, now, now],
      );

      await connection.execute(
        `INSERT IGNORE INTO user_wallets (user_id, diamonds, updated_at)
         VALUES (?, ?, ?)`,
        [userId, STARTING_DIAMONDS, now],
      );

      const referrerId = Number(ref);
      if (
        Number.isInteger(referrerId) &&
        referrerId > 0 &&
        referrerId !== userId
      ) {
        const [referrerRows] = await connection.execute(
          "SELECT id FROM users WHERE id = ? LIMIT 1",
          [referrerId],
        );
        if (referrerRows.length > 0) {
          const [updated] = await connection.execute(
            "UPDATE users SET referred_by = ? WHERE id = ? AND referred_by IS NULL",
            [referrerId, userId],
          );
          if (Number(updated.affectedRows) > 0) {
            await connection.execute(
              `INSERT INTO user_wallets (user_id, diamonds, updated_at)
               VALUES (?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 diamonds = diamonds + VALUES(diamonds),
                 updated_at = VALUES(updated_at)`,
              [referrerId, REFERRAL_DIAMONDS, now],
            );
          }
        }
      }

      return userId;
    });
  }

  async function registerWithPassword(
    { email, password, name, ref },
    { userAgent = "" } = {},
  ) {
    const userId = await createUserWithEmail({ email, password, name, ref });
    const user = await findUserById(userId);
    const token = await createSession(userId, userAgent);
    return { user, token };
  }

  async function loginWithPassword(email, password, { userAgent = "" } = {}) {
    if (!db.isAvailable()) {
      throw authError("La base de datos no está configurada", 503);
    }
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || typeof password !== "string" || password.length === 0) {
      throw authError("Correo o contraseña incorrectos", 401);
    }
    checkLoginRate(cleanEmail);

    const rows = await db.query(
      `SELECT u.*, c.password_hash
       FROM user_credentials c
       JOIN users u ON u.id = c.user_id
       WHERE c.email = ?
       LIMIT 1`,
      [cleanEmail],
    );
    if (rows.length === 0) {
      recordLoginFailure(cleanEmail);
      throw authError("Correo o contraseña incorrectos", 401);
    }
    const valid = await verifyPassword(password, rows[0].password_hash);
    if (!valid) {
      recordLoginFailure(cleanEmail);
      throw authError("Correo o contraseña incorrectos", 401);
    }
    clearLoginFailures(cleanEmail);
    const user = publicUser(rows[0]);
    const token = await createSession(user.id, userAgent);
    return { user, token };
  }

  async function upsertGoogleUser(profile) {
    const now = nowMs();
    const displayName = safeName(profile.name, safeName(profile.email, "Jugador"));

    const bySub = await db.query(
      "SELECT * FROM users WHERE google_sub = ? LIMIT 1",
      [profile.sub],
    );
    if (bySub.length > 0) {
      await db.execute(
        `UPDATE users
         SET email = ?, display_name = ?, avatar_url = ?, updated_at = ?
         WHERE id = ?`,
        [profile.email, displayName, profile.picture, now, bySub[0].id],
      );
      return findUserById(bySub[0].id);
    }

    if (profile.email) {
      const byEmail = await db.query(
        "SELECT * FROM users WHERE email = ? LIMIT 1",
        [profile.email],
      );
      if (byEmail.length > 0) {
        await db.execute(
          `UPDATE users
           SET google_sub = ?, display_name = ?, avatar_url = ?, updated_at = ?
           WHERE id = ?`,
          [profile.sub, displayName, profile.picture, now, byEmail[0].id],
        );
        return findUserById(byEmail[0].id);
      }
    }

    const result = await db.execute(
      `INSERT INTO users
         (google_sub, email, display_name, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [profile.sub, profile.email, displayName, profile.picture, now, now],
    );
    await db
      .execute(
        `INSERT IGNORE INTO user_wallets (user_id, diamonds, updated_at)
         VALUES (?, ?, ?)`,
        [Number(result.insertId), STARTING_DIAMONDS, now],
      )
      .catch(() => {});
    return findUserById(result.insertId);
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
    get isConfigured() {
      return Boolean(googleClientId) || db.isAvailable();
    },
    get passwordAuthAvailable() {
      return db.isAvailable();
    },
    registerWithPassword,
    loginWithPassword,
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
