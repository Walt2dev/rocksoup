import test from "node:test";
import assert from "node:assert/strict";

import {
  createLeaderboard,
  leaderboardTop,
  mergeEventResults,
  sanitizeLeaderboard,
} from "../server/leaderboard.mjs";

test("el ranking sanea entradas inválidas", () => {
  const leaderboard = sanitizeLeaderboard({
    entries: {
      tokenA: {
        name: "  Alice  ",
        color: "#fff",
        points: 10.9,
        kills: 3,
        deaths: 1,
        bestStreak: 2,
        eventsWon: 1,
        bestEventScore: 6,
        updatedAt: 100,
      },
      "": { name: "vacío" },
      tokenB: null,
    },
  });

  assert.deepEqual(Object.keys(leaderboard.entries), ["tokenA"]);
  assert.equal(leaderboard.entries.tokenA.name, "Alice");
  assert.equal(leaderboard.entries.tokenA.points, 10);
});

test("los resultados de evento se acumulan por token", () => {
  const leaderboard = createLeaderboard();

  mergeEventResults(
    leaderboard,
    [
      { token: "a", name: "Alice", color: "#fff", score: 9, kills: 3, deaths: 1, bestStreak: 3 },
      { token: "b", name: "Bob", color: "#000", score: 4, kills: 1, deaths: 2, bestStreak: 1 },
    ],
    { now: 100, winnerToken: "a" },
  );

  mergeEventResults(
    leaderboard,
    [
      { token: "a", name: "Alice", color: "#fff", score: 6, kills: 2, deaths: 0, bestStreak: 2 },
      { token: "b", name: "Bob", color: "#000", score: 12, kills: 4, deaths: 0, bestStreak: 4 },
    ],
    { now: 200, winnerToken: "b" },
  );

  assert.equal(leaderboard.entries.a.points, 15);
  assert.equal(leaderboard.entries.a.kills, 5);
  assert.equal(leaderboard.entries.a.bestEventScore, 9);
  assert.equal(leaderboard.entries.a.eventsWon, 1);

  assert.equal(leaderboard.entries.b.points, 16);
  assert.equal(leaderboard.entries.b.bestEventScore, 12);
  assert.equal(leaderboard.entries.b.eventsWon, 1);

  const top = leaderboardTop(leaderboard, { limit: 10 });
  assert.deepEqual(top.map((entry) => entry.token), ["b", "a"]);
});

test("se puede ordenar por mejor evento", () => {
  const leaderboard = createLeaderboard();

  mergeEventResults(leaderboard, [
    { token: "a", name: "Alice", score: 5, kills: 1, deaths: 0, bestStreak: 1 },
  ]);
  mergeEventResults(leaderboard, [
    { token: "b", name: "Bob", score: 2, kills: 1, deaths: 0, bestStreak: 1 },
  ]);

  const byPoints = leaderboardTop(leaderboard, { sort: "points" });
  assert.equal(byPoints[0].token, "a");

  leaderboard.entries.b.bestEventScore = 20;
  const byBest = leaderboardTop(leaderboard, { sort: "best" });
  assert.equal(byBest[0].token, "b");
});
