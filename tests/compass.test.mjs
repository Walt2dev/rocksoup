import assert from "node:assert/strict";
import test from "node:test";

import {
  bearingLabel,
  compassState,
  distanceBetween,
  normalizeWaypoint,
  screenAngleBetween,
  worldBearing,
} from "../js/game/compass.js";

const camera = {
  project(x, y) {
    return { x: x - y, y: x + y };
  },
};

test("el waypoint se normaliza y limita sus valores", () => {
  assert.equal(normalizeWaypoint(null), null);
  assert.equal(normalizeWaypoint({ x: Number.NaN, y: 2 }), null);

  const waypoint = normalizeWaypoint({ x: 5.5, y: -3.2, label: "  Casa  " });
  assert.equal(waypoint.x, 5.5);
  assert.equal(waypoint.y, -3.2);
  assert.equal(waypoint.label, "  Casa  ");

  const clamped = normalizeWaypoint({ x: 1e12, y: -1e12 });
  assert.ok(clamped.x <= 10000000);
  assert.ok(clamped.y >= -10000000);
  assert.equal(clamped.label, "Destino");
});

test("la brújula calcula distancia y ángulo en pantalla", () => {
  const state = compassState({
    player: { x: 0, y: 0 },
    target: { x: 10, y: 0, label: "Universidad" },
    camera,
  });

  assert.equal(state.hasTarget, true);
  assert.equal(state.distance, 10);
  assert.equal(state.label, "Universidad");
  assert.ok(Number.isFinite(state.angle));

  const from = camera.project(0, 0);
  const to = camera.project(10, 0);
  assert.equal(state.angle, screenAngleBetween(from, to));
});

test("sin destino no hay flecha activa", () => {
  const state = compassState({ player: { x: 1, y: 1 }, target: null });
  assert.equal(state.hasTarget, false);
  assert.equal(state.distance, 0);
});

test("las utilidades de rumbo son deterministas", () => {
  assert.equal(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  assert.ok(Math.abs(worldBearing({ x: 0, y: 0 }, { x: 1, y: 0 })) < 1e-9);
  assert.equal(bearingLabel(0), "E");
  assert.equal(bearingLabel(Math.PI / 2), "S");
  assert.equal(bearingLabel(Math.PI), "O");
});
