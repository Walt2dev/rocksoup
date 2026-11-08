import test from "node:test";
import assert from "node:assert/strict";

import {
  createLeaderboardStore,
  hashToken,
  isLeaderboardDbConfigured,
  mapResultToRow,
  readDbConfig,
  rowToEntry,
} from "../server/leaderboardStore.mjs";

test("hashToken es determinista y no expone el token", () => {
  const hash = hashToken("token-secreto");
  assert.equal(hash, hashToken("token-secreto"));
  assert.equal(hash.length, 64);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.notEqual(hash, "token-secreto");
  assert.equal(hashToken(""), "");
  assert.equal(hashToken(null), "");
});

test("la configuración MySQL se valida por variables", () => {
  assert.equal(isLeaderboardDbConfigured({}), false);
  assert.equal(
    isLeaderboardDbConfigured({ MYSQL_HOST: "host", MYSQL_USER: "u" }),
    false,
  );
  assert.equal(
    isLeaderboardDbConfigured({
      MYSQL_HOST: "host",
      MYSQL_USER: "user",
      MYSQL_DATABASE: "db",
    }),
    true,
  );

  const config = readDbConfig({
    MYSQL_HOST: "host",
    MYSQL_USER: "user",
    MYSQL_DATABASE: "db",
    MYSQL_PORT: "3307",
    MYSQL_SSL: "true",
    MYSQL_CONNECTION_LIMIT: "99",
  });

  assert.equal(config.port, 3307);
  assert.equal(config.sslMode, "true");
  assert.equal(config.connectionLimit, 20);
});

test("los resultados se convierten en filas con token hasheado", () => {
  const row = mapResultToRow(
    {
      token: "token-a",
      name: "  Alice  ",
      color: "#fff",
      score: 9.8,
      kills: 3,
      deaths: 1,
      bestStreak: 4,
    },
    { winnerToken: "token-a", now: 123 },
  );

  assert.equal(row.tokenHash, hashToken("token-a"));
  assert.equal(row.name, "Alice");
  assert.equal(row.points, 9);
  assert.equal(row.eventsWon, 1);
  assert.equal(row.bestEventScore, 9);
  assert.equal(row.updatedAt, 123);
});

test("rowToEntry normaliza la fila de MySQL", () => {
  const entry = rowToEntry({
    token_hash: "abc",
    name: " Bob ",
    color: "#000",
    points: "12",
    kills: "2",
    deaths: "1",
    best_streak: "3",
    events_won: "1",
    best_event_score: "8",
    updated_at: "99",
  });

  assert.equal(entry.tokenHash, "abc");
  assert.equal(entry.name, "Bob");
  assert.equal(entry.points, 12);
  assert.equal(entry.kills, 2);
  assert.equal(entry.bestEventScore, 8);
});

test("sin configuración el store usa el modo inactivo", async () => {
  const store = createLeaderboardStore({ env: {}, logger: { warn() {} } });

  assert.equal(store.configured, false);
  assert.equal(await store.init(), false);
  assert.equal(store.isAvailable(), false);
  assert.equal(await store.top(), null);
  assert.equal(await store.merge([]), false);
  assert.equal(await store.importEntries({}), 0);
  await store.close();
});
