import test from "node:test";
import assert from "node:assert/strict";

import {
  adminAuthorized,
  bearerToken,
  buildAdminSnapshot,
  getAdminToken,
  isAdminConfigured,
} from "../server/admin.mjs";
import { PVP_CONFIG, createPvpState, startEvent } from "../server/pvp.mjs";

test("ADMIN_TOKEN se lee y valida", () => {
  assert.equal(getAdminToken({ ADMIN_TOKEN: "  secreto  " }), "secreto");
  assert.equal(getAdminToken({}), "");
  assert.equal(isAdminConfigured({ ADMIN_TOKEN: "x" }), true);
  assert.equal(isAdminConfigured({}), false);

  assert.equal(adminAuthorized("secreto", "secreto"), true);
  assert.equal(adminAuthorized("secreto", "otro"), false);
  assert.equal(adminAuthorized("", "secreto"), false);
  assert.equal(adminAuthorized("secreto", ""), false);
});

test("bearerToken extrae el token del header", () => {
  assert.equal(bearerToken("Bearer abc123"), "abc123");
  assert.equal(bearerToken("bearer   abc123  "), "abc123");
  assert.equal(bearerToken("Basic abc"), "");
  assert.equal(bearerToken(null), "");
});

test("el snapshot admin no expone tokens ni datos internos", () => {
  const now = 1000;
  const pvp = createPvpState(0, {
    ...PVP_CONFIG,
    intervalMs: 1000,
    durationMs: 2000,
  });
  startEvent(pvp, 0);

  const clients = [
    {
      id: 1,
      token: "token-secreto",
      name: "Alice",
      color: "#fff",
      skinId: "explorer",
      x: 10,
      y: 20,
      health: 80,
      connectedAt: 400,
      lastStateAt: 900,
      workers: [{}, {}],
      chatLimiter: { allow: () => true },
    },
  ];

  pvp.scores[1] = {
    id: 1,
    token: "token-secreto",
    name: "Alice",
    color: "#fff",
    score: 6,
    kills: 2,
    deaths: 1,
    streak: 1,
    bestStreak: 2,
  };

  const snapshot = buildAdminSnapshot({
    clients,
    pvp,
    started: true,
    hostId: 1,
    now,
    leaderboard: { points: [{ name: "Alice", points: 9 }], best: [] },
    rankingSource: "mysql",
  });

  assert.equal(snapshot.started, true);
  assert.equal(snapshot.rankingSource, "mysql");
  assert.equal(snapshot.players.length, 1);
  assert.equal(snapshot.players[0].eventScore, 6);
  assert.equal(snapshot.players[0].eventKills, 2);
  assert.equal(snapshot.players[0].connectedForMs, 600);
  assert.equal(snapshot.players[0].lastStateAgeMs, 100);
  assert.equal(snapshot.players[0].workers, 2);
  assert.equal(snapshot.event.phase, "active");

  const serialized = JSON.stringify(snapshot);
  assert.equal(serialized.includes("token-secreto"), false);
  assert.equal(serialized.includes("chatLimiter"), false);
});
