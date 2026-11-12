import assert from "node:assert/strict";
import test from "node:test";

import {
  celestialStateAt,
  dayProgressAt,
  moonStateAt,
  nightProgressAt,
  reflectionWorldPoint,
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

test("el reflejo del sol se mueve de este a oeste", () => {
  const dawn = celestialStateAt(1).reflection;
  const noon = celestialStateAt(DAY_LENGTH_SECONDS / 2).reflection;
  const dusk = celestialStateAt(DAY_LENGTH_SECONDS - 1).reflection;

  assert.equal(dawn.kind, "sun");
  assert.ok(dawn.x < noon.x);
  assert.ok(noon.x < dusk.x);
  assert.ok(dawn.x >= 0.1 && dusk.x <= 0.9);
});

test("el reflejo lunar conserva la fase y tambi�n avanza", () => {
  const early = celestialStateAt(DAY_LENGTH_SECONDS + 1).reflection;
  const late = celestialStateAt(DAY_NIGHT_CYCLE - 1).reflection;

  assert.equal(early.kind, "moon");
  assert.equal(early.night, true);
  assert.ok(early.x < late.x);
  assert.ok(early.illumination >= 0 && early.illumination <= 1);
});

test("el ancla del reflejo se desplaza de forma continua con el jugador", () => {
  const celestial = celestialStateAt(DAY_LENGTH_SECONDS / 2);
  const first = reflectionWorldPoint({ x: 0, y: 0 }, celestial);
  const second = reflectionWorldPoint({ x: 1.5, y: -2 }, celestial);

  assert.ok(first && second);
  assert.equal(second.x - first.x, 1.5);
  assert.equal(second.y - first.y, -2);
});
