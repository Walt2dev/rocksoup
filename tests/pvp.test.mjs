import test from "node:test";
import assert from "node:assert/strict";

import {
  PVP_CONFIG,
  addParticipants,
  createPvpState,
  finishEvent,
  recordKill,
  snapshotPvp,
  startEvent,
  tickPvp,
} from "../server/pvp.mjs";

const CONFIG = Object.freeze({
  ...PVP_CONFIG,
  intervalMs: 1000,
  durationMs: 2000,
  killPoints: 3,
  deathPenalty: 1,
  streakThreshold: 3,
  streakBonus: 2,
  maxStandings: 5,
});

const alice = { id: 1, token: "token-a", name: "Alice", color: "#e0a458" };
const bob = { id: 2, token: "token-b", name: "Bob", color: "#7ec699" };

test("el evento alterna entre inactivo y activo con el reloj", () => {
  const state = createPvpState(0, CONFIG);

  assert.equal(state.phase, "idle");
  assert.equal(tickPvp(state, 500), null);

  const started = tickPvp(state, 1000);
  assert.equal(started.type, "active");
  assert.equal(state.phase, "active");
  assert.equal(state.startedAt, 1000);
  assert.equal(state.endsAt, 3000);

  assert.equal(tickPvp(state, 2500), null);

  const finished = tickPvp(state, 3000);
  assert.equal(finished.type, "finished");
  assert.equal(state.phase, "idle");
  assert.equal(state.nextAt, 4000);
});

test("las kills solo puntúan durante el evento", () => {
  const state = createPvpState(0, CONFIG);

  assert.equal(recordKill(state, 0, alice, bob), null);

  startEvent(state, 0);
  const result = recordKill(state, 0, alice, bob);

  assert.equal(result.killerId, alice.id);
  assert.equal(result.victimId, bob.id);
  assert.equal(result.points, 3);
  assert.equal(state.scores[alice.id].score, 3);
  assert.equal(state.scores[alice.id].kills, 1);
  assert.equal(state.scores[bob.id].deaths, 1);
  assert.equal(state.scores[bob.id].score, 0);
});

test("las rachas dan bonus y morir reinicia la racha", () => {
  const state = createPvpState(0, CONFIG);
  startEvent(state, 0);

  recordKill(state, 0, alice, bob);
  recordKill(state, 0, alice, bob);
  const third = recordKill(state, 0, alice, bob);

  assert.equal(third.bonus, 2);
  assert.equal(third.streak, 3);
  assert.equal(state.scores[alice.id].score, 3 + 3 + 3 + 2);
  assert.equal(state.scores[alice.id].bestStreak, 3);

  recordKill(state, 0, bob, alice);

  assert.equal(state.scores[alice.id].streak, 0);
  assert.equal(state.scores[bob.id].streak, 1);
  assert.ok(state.scores[alice.id].score >= 0);
});

test("al terminar se ordena el ranking y se marca el ganador", () => {
  const state = createPvpState(0, CONFIG);
  startEvent(state, 0);

  recordKill(state, 0, alice, bob);
  recordKill(state, 0, bob, alice);
  recordKill(state, 0, alice, bob);

  const finished = finishEvent(state, 2000);

  assert.equal(finished.winner.id, alice.id);
  assert.equal(finished.winner.token, "token-a");
  assert.equal(finished.results[0].score, 5);
  assert.equal(finished.results[1].score, 2);
  assert.equal(state.winnerId, alice.id);

  const snapshot = snapshotPvp(state, 2000);
  assert.equal(snapshot.phase, "idle");
  assert.equal(snapshot.winner.name, "Alice");
  assert.equal(snapshot.standings[0].name, "Alice");
});

test("addParticipants registra jugadores sin puntuación", () => {
  const state = createPvpState(0, CONFIG);
  startEvent(state, 0);
  addParticipants(state, [alice, bob, { id: "invalido" }]);

  assert.equal(Object.keys(state.scores).length, 2);
  assert.equal(snapshotPvp(state, 0).standings.length, 2);
  assert.equal(snapshotPvp(state, 0).remainingMs, 2000);
});
