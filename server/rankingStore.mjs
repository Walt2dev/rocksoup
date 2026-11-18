const DAY_MS = 24 * 60 * 60 * 1000;

export const RANK_RULES = Object.freeze({
  village_conquered: Object.freeze({ points: 100, dedup: true, dailyCap: 0 }),
  unit_trained: Object.freeze({ points: 10, dedup: false, dailyCap: 200 }),
  wave_survived: Object.freeze({ points: 25, dedup: false, dailyCap: 250 }),
});

export function dayKey(now = Date.now()) {
  return Math.floor(now / DAY_MS);
}

export function createRankingStore({ db, logger = console } = {}) {
  async function ensureEntry(connection, userId, now) {
    await connection.execute(
      `INSERT IGNORE INTO rank_entries (user_id, points, villages, units, waves, updated_at)
       VALUES (?, 0, 0, 0, 0, ?)`,
      [Number(userId), now],
    );
  }

  async function record(userId, kind, refId = "") {
    const rule = RANK_RULES[kind];
    if (!rule || !db?.isAvailable()) {
      return { added: 0, points: 0 };
    }
    const id = Number(userId);
    const now = Date.now();
    const ref = String(refId ?? "").slice(0, 64);

    if (rule.dedup) {
      return db.transaction(async (connection) => {
        await ensureEntry(connection, id, now);
        const [insert] = await connection.execute(
          `INSERT IGNORE INTO rank_events (user_id, kind, ref_id, points, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [id, kind, ref, rule.points, now],
        );
        if (Number(insert.affectedRows) === 0) {
          const [rows] = await connection.execute(
            "SELECT points FROM rank_entries WHERE user_id = ? LIMIT 1",
            [id],
          );
          return { added: 0, points: Number(rows[0]?.points) || 0 };
        }
        await connection.execute(
          `UPDATE rank_entries
           SET points = points + ?, villages = villages + 1, updated_at = ?
           WHERE user_id = ?`,
          [rule.points, now, id],
        );
        const [rows] = await connection.execute(
          "SELECT points FROM rank_entries WHERE user_id = ? LIMIT 1",
          [id],
        );
        return { added: rule.points, points: Number(rows[0]?.points) || 0 };
      });
    }

    return db.transaction(async (connection) => {
      await ensureEntry(connection, id, now);
      const day = dayKey(now);
      const [dailyRows] = await connection.execute(
        "SELECT points FROM rank_daily WHERE user_id = ? AND kind = ? AND day = ? LIMIT 1 FOR UPDATE",
        [id, kind, day],
      );
      const used = Number(dailyRows[0]?.points) || 0;
      const added = rule.dailyCap > 0
        ? Math.max(0, Math.min(rule.points, rule.dailyCap - used))
        : rule.points;
      if (added <= 0) {
        const [rows] = await connection.execute(
          "SELECT points FROM rank_entries WHERE user_id = ? LIMIT 1",
          [id],
        );
        return { added: 0, points: Number(rows[0]?.points) || 0 };
      }
      await connection.execute(
        `INSERT INTO rank_daily (user_id, kind, day, points)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE points = points + VALUES(points)`,
        [id, kind, day, added],
      );
      const counterColumn = kind === "unit_trained" ? "units" : "waves";
      await connection.execute(
        `UPDATE rank_entries
         SET points = points + ?, ${counterColumn} = ${counterColumn} + 1, updated_at = ?
         WHERE user_id = ?`,
        [added, now, id],
      );
      const [rows] = await connection.execute(
        "SELECT points FROM rank_entries WHERE user_id = ? LIMIT 1",
        [id],
      );
      return { added, points: Number(rows[0]?.points) || 0 };
    });
  }

  async function addPoints(userId, points) {
    const amount = Math.max(0, Math.floor(Number(points) || 0));
    if (!db?.isAvailable() || amount <= 0) {
      return { added: 0, points: 0 };
    }
    const id = Number(userId);
    const now = Date.now();
    return db.transaction(async (connection) => {
      await ensureEntry(connection, id, now);
      await connection.execute(
        "UPDATE rank_entries SET points = points + ?, updated_at = ? WHERE user_id = ?",
        [amount, now, id],
      );
      const [rows] = await connection.execute(
        "SELECT points FROM rank_entries WHERE user_id = ? LIMIT 1",
        [id],
      );
      return { added: amount, points: Number(rows[0]?.points) || 0 };
    });
  }

  async function top(limit = 50) {
    if (!db?.isAvailable()) {
      return [];
    }
    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit) || 50));
    const rows = await db.query(
      `SELECT r.user_id, r.points, r.villages, r.units, r.waves, r.updated_at,
              u.display_name, u.avatar_url
       FROM rank_entries r
       LEFT JOIN users u ON u.id = r.user_id
       ORDER BY r.points DESC, r.updated_at ASC, r.user_id ASC
       LIMIT ${safeLimit}`,
    );
    return rows.map((row, index) => ({
      rank: index + 1,
      userId: Number(row.user_id),
      name: row.display_name ?? "Jugador",
      avatarUrl: row.avatar_url ?? null,
      points: Number(row.points) || 0,
      villages: Number(row.villages) || 0,
      units: Number(row.units) || 0,
      waves: Number(row.waves) || 0,
      updatedAt: Number(row.updated_at) || 0,
    }));
  }

  async function entry(userId) {
    if (!db?.isAvailable()) {
      return null;
    }
    const rows = await db.query(
      `SELECT r.user_id, r.points, r.villages, r.units, r.waves, r.updated_at,
              u.display_name, u.avatar_url
       FROM rank_entries r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.user_id = ? LIMIT 1`,
      [Number(userId)],
    );
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      userId: Number(row.user_id),
      name: row.display_name ?? "Jugador",
      avatarUrl: row.avatar_url ?? null,
      points: Number(row.points) || 0,
      villages: Number(row.villages) || 0,
      units: Number(row.units) || 0,
      waves: Number(row.waves) || 0,
      updatedAt: Number(row.updated_at) || 0,
    };
  }

  async function rankOf(userId) {
    if (!db?.isAvailable()) {
      return null;
    }
    const mine = await entry(userId);
    if (!mine) {
      return null;
    }
    const rows = await db.query(
      `SELECT COUNT(*) AS better
       FROM rank_entries
       WHERE points > ? OR (points = ? AND updated_at < ?)`,
      [mine.points, mine.points, mine.updatedAt],
    );
    const rank = Number(rows[0]?.better) + 1;
    return { rank, entry: mine };
  }

  async function close() {}

  return {
    record,
    addPoints,
    top,
    entry,
    rankOf,
    close,
  };
}
