import assert from "node:assert/strict";
import test from "node:test";

import {
  celestialStateAt,
  dayProgressAt,
  moonStateAt,
  nightProgressAt,
  skyColorsAt,
  sunStateAt,
} from "../js/game/celestial.js";
import {
  DAY_LENGTH_SECONDS,
  DAY_NIGHT_CYCLE,
  NIGHT_LENGTH_SECONDS,
  MOON_PHASES,
} from "../js/game/time.js";

test("el sol solo es visible de día y avanza por el cielo", () => {
  const dawn = sunStateAt(0);
  const noon = sunStateAt(DAY_LENGTH_SECONDS / 2);
  const night = sunStateAt(DAY_LENGTH_SECONDS + 1);

  assert.equal(dawn.visible, true);
  assert.equal(noon.visible, true);
  assert.equal(night.visible, false);
  assert.ok(noon.elevation > dawn.elevation);
  assert.ok(noon.azimuth < dawn.azimuth);
});

test("la luna solo es visible de noche y cambia de fase por día", () => {
  const firstNight = moonStateAt(DAY_LENGTH_SECONDS + 10);
  const nextNight = moonStateAt(DAY_NIGHT_CYCLE + DAY_LENGTH_SECONDS + 10);
  const day = moonStateAt(10);

  assert.equal(firstNight.visible, true);
  assert.equal(day.visible, false);
  assert.equal(firstNight.phase.id, MOON_PHASES[0].id);
  assert.equal(nextNight.phase.id, MOON_PHASES[1].id);
  assert.ok(firstNight.phaseIndex >= 0);
  assert.ok(firstNight.illumination >= 0 && firstNight.illumination <= 1);
});

test("el progreso diurno y nocturno queda acotado", () => {
  assert.equal(dayProgressAt(0), 0);
  assert.equal(dayProgressAt(DAY_LENGTH_SECONDS / 2), 0.5);
  assert.equal(dayProgressAt(DAY_LENGTH_SECONDS + 1), 1);
  assert.equal(nightProgressAt(0), 0);
  assert.equal(nightProgressAt(DAY_LENGTH_SECONDS + NIGHT_LENGTH_SECONDS / 2), 0.5);
  assert.equal(nightProgressAt(DAY_NIGHT_CYCLE), 0);
});

test("el estado celeste combina sol, luna y colores de cielo", () => {
  const day = celestialStateAt(DAY_LENGTH_SECONDS / 2);
  const night = celestialStateAt(DAY_LENGTH_SECONDS + 30);

  assert.equal(day.night, false);
  assert.equal(night.night, true);
  assert.equal(day.sun.visible, true);
  assert.equal(night.moon.visible, true);
  assert.match(day.sky.top, /^rgb\(/);
  assert.match(night.sky.tint, /^rgba\(/);
  assert.ok(day.sky.tintAlpha >= 0);
});

test("los colores del cielo son estables para el mismo instante", () => {
  assert.deepEqual(skyColorsAt(1234), skyColorsAt(1234));
  assert.notDeepEqual(skyColorsAt(10), skyColorsAt(DAY_LENGTH_SECONDS + 10));
});
