export const PVP_CONFIG = Object.freeze({
  intervalMs: 5 * 60 * 1000,
  durationMs: 90 * 1000,
  killPoints: 3,
  deathPenalty: 1,
  streakThreshold: 3,
  streakBonus: 2,
  maxStandings: 5,
});

export function createPvpState(now = Date.now(), config = PVP_CONFIG) {
  return {
    config,
    phase: "idle",
    kind: null,
    startedAt: 0,
    endsAt: 0,
    nextAt: now + config.intervalMs,
    scores: Object.create(null),
    winnerId: null,
  };
}

function sanitizeParticipantName(value) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 18)
    : "Jugador";
}

function sanitizeColor(value) {
  return typeof value === "string" ? value.slice(0, 16) : "#e0a458";
}

export function ensureParticipant(state, player) {
  if (!player || !Number.isInteger(player.id)) {
    return null;
  }

  let entry = state.scores[player.id];

  if (!entry) {
    entry = {
      id: player.id,
      token: typeof player.token === "string" ? player.token : "",
      name: sanitizeParticipantName(player.name),
      color: sanitizeColor(player.color),
      score: 0,
      kills: 0,
      deaths: 0,
      streak: 0,
      bestStreak: 0,
    };
    state.scores[player.id] = entry;
    return entry;
  }

  if (typeof player.token === "string" && player.token.length > 0) {
    entry.token = player.token;
  }
  if (typeof player.name === "string" && player.name.trim().length > 0) {
    entry.name = sanitizeParticipantName(player.name);
  }
  if (typeof player.color === "string" && player.color.length > 0) {
    entry.color = sanitizeColor(player.color);
  }
  return entry;
}

export function addParticipants(state, players) {
  for (const player of players ?? []) {
    ensureParticipant(state, player);
  }
}

export function startEvent(state, now = Date.now(), kind = "deathmatch") {
  state.phase = "active";
  state.kind = kind;
  state.startedAt = now;
  state.endsAt = now + state.config.durationMs;
  state.nextAt = 0;
  state.winnerId = null;

  for (const entry of Object.values(state.scores)) {
    entry.score = 0;
    entry.kills = 0;
    entry.deaths = 0;
    entry.streak = 0;
    entry.bestStreak = 0;
  }

  return { type: "active", kind, endsAt: state.endsAt };
}

export function recordKill(state, now, killer, victim) {
  if (state.phase !== "active") {
    return null;
  }

  const killerEntry = ensureParticipant(state, killer);
  const victimEntry = ensureParticipant(state, victim);

  if (!killerEntry || !victimEntry || killerEntry.id === victimEntry.id) {
    return null;
  }

  killerEntry.kills += 1;
  killerEntry.streak += 1;
  killerEntry.bestStreak = Math.max(killerEntry.bestStreak, killerEntry.streak);
  killerEntry.score += state.config.killPoints;

  let bonus = 0;
  if (killerEntry.streak >= state.config.streakThreshold) {
    bonus = state.config.streakBonus;
    killerEntry.score += bonus;
  }

  victimEntry.deaths += 1;
  victimEntry.streak = 0;
  victimEntry.score = Math.max(0, victimEntry.score - state.config.deathPenalty);

  return {
    killerId: killerEntry.id,
    victimId: victimEntry.id,
    killerName: killerEntry.name,
    victimName: victimEntry.name,
    killerColor: killerEntry.color,
    victimColor: victimEntry.color,
    points: state.config.killPoints + bonus,
    killerScore: killerEntry.score,
    victimScore: victimEntry.score,
    streak: killerEntry.streak,
    bonus,
  };
}

export function finishEvent(state, now = Date.now()) {
  if (state.phase !== "active") {
    return null;
  }

  const results = Object.values(state.scores)
    .map((entry) => ({
      id: entry.id,
      token: entry.token,
      name: entry.name,
      color: entry.color,
      score: entry.score,
      kills: entry.kills,
      deaths: entry.deaths,
      bestStreak: entry.bestStreak,
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.kills - a.kills ||
        a.name.localeCompare(b.name),
    );

  const winner = results[0] ?? null;
  state.phase = "idle";
  state.kind = null;
  state.startedAt = 0;
  state.endsAt = 0;
  state.nextAt = now + state.config.intervalMs;
  state.winnerId = winner?.id ?? null;

  return { type: "finished", winner, results };
}

export function tickPvp(state, now = Date.now()) {
  if (state.phase === "active" && now >= state.endsAt) {
    const result = finishEvent(state, now);
    return result;
  }
  if (state.phase === "idle" && now >= state.nextAt) {
    return startEvent(state, now);
  }
  return null;
}

export function snapshotPvp(state, now = Date.now()) {
  const standings = Object.values(state.scores)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.kills - a.kills ||
        a.name.localeCompare(b.name),
    )
    .slice(0, state.config.maxStandings)
    .map((entry) => ({
      name: entry.name,
      color: entry.color,
      score: entry.score,
      kills: entry.kills,
      deaths: entry.deaths,
    }));

  const winnerEntry =
    state.winnerId !== null ? state.scores[state.winnerId] : null;

  return {
    phase: state.phase,
    kind: state.kind,
    startedAt: state.startedAt,
    endsAt: state.endsAt,
    nextAt: state.nextAt,
    remainingMs:
      state.phase === "active" ? Math.max(0, state.endsAt - now) : 0,
    startsInMs:
      state.phase === "idle" ? Math.max(0, state.nextAt - now) : 0,
    standings,
    winner: winnerEntry
      ? {
          name: winnerEntry.name,
          color: winnerEntry.color,
          score: winnerEntry.score,
        }
      : null,
  };
}
