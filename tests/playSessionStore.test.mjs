import test from "node:test";
import assert from "node:assert/strict";

import { aggregatePlaySessions } from "../server/playSessionStore.mjs";

const NOW = Date.UTC(2026, 0, 10, 12, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

test("agrega sesiones por jugador, día y duración", () => {
  const rows = [
    {
      user_id: 1,
      player_name: "Adra",
      connected_at: NOW - 2 * DAY,
      disconnected_at: NOW - 2 * DAY + 10 * 60 * 1000,
      duration_ms: 10 * 60 * 1000,
    },
    {
      user_id: 1,
      player_name: "Adra",
      connected_at: NOW - 1 * DAY,
      disconnected_at: NOW - 1 * DAY + 30 * 60 * 1000,
      duration_ms: 30 * 60 * 1000,
    },
    {
      user_id: 2,
      player_name: "Beto",
      connected_at: NOW - 5 * 60 * 1000,
      disconnected_at: null,
      duration_ms: null,
    },
  ];

  const stats = aggregatePlaySessions(rows, { days: 7, now: NOW });

  assert.equal(stats.sessions, 3);
  assert.equal(stats.uniquePlayers, 2);
  assert.equal(stats.byDay.length, 3);
  assert.equal(stats.topPlayers[0].name, "Adra");
  assert.equal(stats.topPlayers[0].sessions, 2);
  assert.ok(stats.totalMs >= 40 * 60 * 1000);
});

test("las sesiones abiertas usan el tiempo transcurrido", () => {
  const rows = [
    {
      user_id: 3,
      player_name: "Caro",
      connected_at: NOW - 5 * 60 * 1000,
      disconnected_at: null,
      duration_ms: null,
    },
  ];

  const stats = aggregatePlaySessions(rows, { days: 7, now: NOW });
  assert.equal(stats.sessions, 1);
  assert.equal(stats.uniquePlayers, 1);
  assert.ok(stats.totalMs >= 5 * 60 * 1000);
  assert.equal(stats.medianMs, stats.totalMs);
});

test("sin sesiones devuelve ceros y rango válido", () => {
  const stats = aggregatePlaySessions([], { days: 999, now: NOW });
  assert.equal(stats.days, 7);
  assert.equal(stats.sessions, 0);
  assert.equal(stats.uniquePlayers, 0);
  assert.equal(stats.totalMs, 0);
  assert.deepEqual(stats.byDay, []);
  assert.deepEqual(stats.topPlayers, []);
});
