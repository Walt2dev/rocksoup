const DAY_MS = 24 * 60 * 60 * 1000;
const ALLOWED_DAYS = new Set([7, 30, 90]);

function safeName(value) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 24)
    : "Jugador";
}

function dateKey(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function median(values) {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function emptyStats(days, since, now) {
  return {
    days,
    since,
    until: now,
    sessions: 0,
    uniquePlayers: 0,
    totalMs: 0,
    avgMs: 0,
    medianMs: 0,
    byDay: [],
    topPlayers: [],
  };
}

export function aggregatePlaySessions(rows, { days = 7, since, now = Date.now() } = {}) {
  const safeDays = ALLOWED_DAYS.has(Number(days)) ? Number(days) : 7;
  const rangeStart = since ?? now - safeDays * DAY_MS;
  const list = Array.isArray(rows) ? rows : [];
  const unique = new Set();
  const dayMap = new Map();
  const playerMap = new Map();
  const durations = [];

  for (const row of list) {
    const connectedAt = Number(row.connected_at) || 0;
    const disconnectedAt = Number(row.disconnected_at) || 0;
    const duration = disconnectedAt > 0
      ? Math.max(0, Number(row.duration_ms) || disconnectedAt - connectedAt)
      : Math.max(0, now - connectedAt);
    const userId = row.user_id ? Number(row.user_id) : null;
    const name = safeName(row.player_name);
    const uniqueKey = userId ? `u:${userId}` : `n:${name}`;
    unique.add(uniqueKey);
    durations.push(duration);

    const day = dateKey(connectedAt);
    const dayEntry = dayMap.get(day) ?? {
      date: day,
      sessions: 0,
      unique: new Set(),
      totalMs: 0,
    };
    dayEntry.sessions += 1;
    dayEntry.unique.add(uniqueKey);
    dayEntry.totalMs += duration;
    dayMap.set(day, dayEntry);

    const playerEntry = playerMap.get(uniqueKey) ?? {
      userId,
      name,
      sessions: 0,
      totalMs: 0,
    };
    playerEntry.sessions += 1;
    playerEntry.totalMs += duration;
    playerMap.set(uniqueKey, playerEntry);
  }

  const totalMs = durations.reduce((sum, value) => sum + value, 0);

  return {
    days: safeDays,
    since: rangeStart,
    until: now,
    sessions: list.length,
    uniquePlayers: unique.size,
    totalMs,
    avgMs: list.length > 0 ? Math.round(totalMs / list.length) : 0,
    medianMs: median(durations),
    byDay: [...dayMap.values()]
      .map((entry) => ({
        date: entry.date,
        sessions: entry.sessions,
        uniquePlayers: entry.unique.size,
        totalMs: entry.totalMs,
        avgMs: entry.sessions > 0 ? Math.round(entry.totalMs / entry.sessions) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    topPlayers: [...playerMap.values()]
      .sort((a, b) => b.totalMs - a.totalMs)
      .slice(0, 10),
  };
}

export function createPlaySessionStore({ db, logger = console } = {}) {
  async function start({ userId = null, playerName, now = Date.now() } = {}) {
    if (!db?.isAvailable()) {
      return null;
    }
    try {
      const result = await db.execute(
        `INSERT INTO play_sessions
           (user_id, player_name, connected_at, last_seen_at)
         VALUES (?, ?, ?, ?)`,
        [userId ? Number(userId) : null, safeName(playerName), now, now],
      );
      return Number(result.insertId) || null;
    } catch (error) {
      logger.warn?.(`[PLAY] No se pudo iniciar la sesión: ${error.message}`);
      return null;
    }
  }

  async function touch(sessionId, now = Date.now()) {
    if (!sessionId || !db?.isAvailable()) {
      return false;
    }
    try {
      await db.execute(
        `UPDATE play_sessions SET last_seen_at = ?
         WHERE id = ? AND disconnected_at IS NULL`,
        [now, Number(sessionId)],
      );
      return true;
    } catch (error) {
      logger.warn?.(`[PLAY] No se pudo actualizar la sesión: ${error.message}`);
      return false;
    }
  }

  async function finish(sessionId, now = Date.now()) {
    if (!sessionId || !db?.isAvailable()) {
      return false;
    }
    try {
      await db.execute(
        `UPDATE play_sessions
         SET disconnected_at = ?, duration_ms = GREATEST(0, ? - connected_at)
         WHERE id = ? AND disconnected_at IS NULL`,
        [now, now, Number(sessionId)],
      );
      return true;
    } catch (error) {
      logger.warn?.(`[PLAY] No se pudo cerrar la sesión: ${error.message}`);
      return false;
    }
  }

  async function closeStale({ now = Date.now(), staleAfterMs = 2 * 60 * 1000 } = {}) {
    if (!db?.isAvailable()) {
      return 0;
    }
    try {
      const result = await db.execute(
        `UPDATE play_sessions
         SET disconnected_at = last_seen_at,
             duration_ms = GREATEST(0, last_seen_at - connected_at)
         WHERE disconnected_at IS NULL AND last_seen_at < ?`,
        [now - staleAfterMs],
      );
      return Number(result.affectedRows) || 0;
    } catch (error) {
      logger.warn?.(`[PLAY] No se pudieron cerrar sesiones viejas: ${error.message}`);
      return 0;
    }
  }

  async function rangeStats({ days = 7, now = Date.now() } = {}) {
    const safeDays = ALLOWED_DAYS.has(Number(days)) ? Number(days) : 7;
    const since = now - safeDays * DAY_MS;
    if (!db?.isAvailable()) {
      return emptyStats(safeDays, since, now);
    }
    try {
      const rows = await db.query(
        `SELECT id, user_id, player_name, connected_at, last_seen_at,
                disconnected_at, duration_ms
         FROM play_sessions
         WHERE connected_at >= ?
         ORDER BY connected_at ASC`,
        [since],
      );
      return aggregatePlaySessions(rows, { days: safeDays, since, now });
    } catch (error) {
      logger.warn?.(`[PLAY] No se pudieron leer las sesiones: ${error.message}`);
      return emptyStats(safeDays, since, now);
    }
  }

  return {
    start,
    touch,
    finish,
    closeStale,
    rangeStats,
  };
}
