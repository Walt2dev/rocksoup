import test from "node:test";
import assert from "node:assert/strict";

import { RANK_RULES, dayKey } from "../server/rankingStore.mjs";
import {
  cleanName,
  cleanTag,
  cleanDescription,
  canonicalPair,
  ClanError,
} from "../server/clanStore.mjs";

test("las reglas de ranking definen puntos, dedup y topes", () => {
  assert.equal(RANK_RULES.village_conquered.points, 100);
  assert.equal(RANK_RULES.village_conquered.dedup, true);
  assert.equal(RANK_RULES.village_conquered.dailyCap, 0);
  assert.equal(RANK_RULES.unit_trained.points, 10);
  assert.equal(RANK_RULES.unit_trained.dailyCap, 200);
  assert.equal(RANK_RULES.wave_survived.points, 25);
  assert.equal(RANK_RULES.wave_survived.dailyCap, 250);
});

test("dayKey agrupa por día UTC", () => {
  const day = dayKey(Date.UTC(2026, 0, 5, 3, 0, 0));
  const next = dayKey(Date.UTC(2026, 0, 6, 0, 0, 0));
  assert.equal(next - day, 1);
});

test("limpia y valida el nombre del clan", () => {
  assert.equal(cleanName("  Los Lobos  "), "Los Lobos");
  assert.throws(() => cleanName("a"), ClanError);
});

test("limpia y valida la etiqueta del clan", () => {
  assert.equal(cleanTag(" ab "), "AB");
  assert.throws(() => cleanTag("a"), ClanError);
  assert.throws(() => cleanTag("!!"), ClanError);
});

test("la descripción se recorta a 140 caracteres", () => {
  assert.equal(cleanDescription("x".repeat(200)).length, 140);
});

test("canonicalPair ordena el par de clanes", () => {
  assert.deepEqual(canonicalPair("b", "a"), ["a", "b"]);
  assert.deepEqual(canonicalPair("a", "b"), ["a", "b"]);
  assert.deepEqual(canonicalPair("a", "a"), ["a", "a"]);
});
