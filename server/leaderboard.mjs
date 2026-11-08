const MAX_ENTRIES = 500;

function safeInt(value, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

function safeName(value) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 18)
    : "Jugador";
}

function safeColor(value) {
  return typeof value === "string" ? value.slice(0, 16) : "#e0a458";
}

function sanitizeEntry(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  return {
    name: safeName(value.name),
    color: safeColor(value.color),
    points: safeInt(value.points),
    kills: safeInt(value.kills),
    deaths: safeInt(value.deaths),
    bestStreak: safeInt(value.bestStreak),
    eventsWon: safeInt(value.eventsWon),
    bestEventScore: safeInt(value.bestEventScore),
    updatedAt: safeInt(value.updatedAt),
  };
}

export function createLeaderboard() {
  return { version: 1, entries: {} };
}

export function sanitizeLeaderboard(value) {
  const leaderboard = createLeaderboard();

  if (!value || typeof value !== "object" || !value.entries) {
    return leaderboard;
  }

  for (const [token, entry] of Object.entries(value.entries)) {
    if (typeof token !== "string" || token.length === 0) {
      continue;
    }
    const clean = sanitizeEntry(entry);
    if (clean) {
      leaderboard.entries[token.slice(0, 80)] = clean;
    }
  }

  return leaderboard;
}

export function mergeEventResults(
  leaderboard,
  results,
  { now = Date.now(), winnerToken = null, maxEntries = MAX_ENTRIES } = {},
) {
  if (!leaderboard?.entries || !Array.isArray(results)) {
    return;
  }

  for (const result of results) {
    if (!result || typeof result.token !== "string" || result.token.length === 0) {
      continue;
    }

    const token = result.token.slice(0, 80);
    const current =
      leaderboard.entries[token] ??
      ({
        name: safeName(result.name),
        color: safeColor(result.color),
        points: 0,
        kills: 0,
        deaths: 0,
        bestStreak: 0,
        eventsWon: 0,
        bestEventScore: 0,
        updatedAt: 0,
      });

    current.name = safeName(result.name ?? current.name);
    current.color = safeColor(result.color ?? current.color);
    current.points += safeInt(result.score);
    current.kills += safeInt(result.kills);
    current.deaths += safeInt(result.deaths);
    current.bestStreak = Math.max(current.bestStreak, safeInt(result.bestStreak));
    current.bestEventScore = Math.max(
      current.bestEventScore,
      safeInt(result.score),
    );
    current.eventsWon += token === winnerToken ? 1 : 0;
    current.updatedAt = now;
    leaderboard.entries[token] = current;
  }

  const tokens = Object.keys(leaderboard.entries);
  if (tokens.length > maxEntries) {
    const keep = tokens
      .sort(
        (a, b) =>
          leaderboard.entries[b].points - leaderboard.entries[a].points ||
          leaderboard.entries[b].updatedAt - leaderboard.entries[a].updatedAt,
      )
      .slice(0, maxEntries);
    const entries = {};
    for (const token of keep) {
      entries[token] = leaderboard.entries[token];
    }
    leaderboard.entries = entries;
  }
}

export function leaderboardTop(
  leaderboard,
  { limit = 10, sort = "points" } = {},
) {
  if (!leaderboard?.entries) {
    return [];
  }

  const rows = Object.entries(leaderboard.entries).map(([token, entry]) => ({
    token,
    ...entry,
  }));

  if (sort === "best") {
    rows.sort(
      (a, b) =>
        b.bestEventScore - a.bestEventScore ||
        b.points - a.points ||
        a.name.localeCompare(b.name),
    );
  } else {
    rows.sort(
      (a, b) =>
        b.points - a.points ||
        b.kills - a.kills ||
        a.name.localeCompare(b.name),
    );
  }

  return rows.slice(0, Math.max(1, Math.floor(limit)));
}
