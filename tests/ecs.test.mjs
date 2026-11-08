import assert from "node:assert/strict";
import test from "node:test";

import { Component } from "../js/ecs/components.js";
import { EntityWorld } from "../js/ecs/ecs.js";
import {
  moveDirect,
  updateEnergy,
  updateGathering,
  updatePaths,
} from "../js/ecs/systems.js";

test("EntityWorld crea, consulta, actualiza y destruye entidades", () => {
  const ecs = new EntityWorld();
  const first = ecs.createEntity({
    [Component.TRANSFORM]: { x: 1, y: 2 },
    [Component.PLAYER]: { name: "Viajero" },
  });
  const second = ecs.createEntity({
    [Component.TRANSFORM]: { x: 3, y: 4 },
  });

  assert.equal(ecs.size, 2);
  assert.ok(ecs.hasEntity(first));
  assert.ok(ecs.hasComponent(first, Component.PLAYER));
  assert.equal(ecs.getComponent(first, Component.TRANSFORM).x, 1);
  assert.deepEqual(ecs.query(Component.TRANSFORM), [first, second]);
  assert.deepEqual(ecs.query(Component.TRANSFORM, Component.PLAYER), [first]);

  ecs.addComponent(second, Component.MOTION, { speed: 2 });
  assert.equal(ecs.getComponent(second, Component.MOTION).speed, 2);

  assert.equal(ecs.removeComponent(second, Component.MOTION), true);
  assert.equal(ecs.hasComponent(second, Component.MOTION), false);
  assert.equal(ecs.destroyEntity(first), true);
  assert.equal(ecs.size, 1);
  assert.equal(ecs.hasEntity(first), false);
  assert.throws(() => ecs.addComponent(first, Component.MOTION, {}), Error);

  ecs.clear();
  assert.equal(ecs.size, 0);
  assert.equal(ecs.createEntity(), 1);
});

test("moveDirect respeta colisiones y desliza por los ejes", () => {
  const blocked = new Set(["2,1"]);
  const isWalkable = (x, y) => !blocked.has(`${x},${y}`);
  const transform = { x: 1.9, y: 1.5 };

  const moved = moveDirect(transform, 0.2, 0, isWalkable);
  assert.equal(moved.movedX, 0);
  assert.equal(transform.x, 1.9);
  assert.equal(transform.y, 1.5);

  const slide = moveDirect(transform, 0.2, 0.2, isWalkable);
  assert.equal(slide.movedX, 0);
  assert.equal(slide.movedY, 0.2);
  assert.equal(transform.x, 1.9);
  assert.equal(transform.y, 1.7);

  const free = moveDirect({ x: 0.5, y: 0.5 }, 0.2, 0.2, isWalkable);
  assert.equal(free.movedX, 0.2);
  assert.equal(free.movedY, 0.2);
});

test("updatePaths avanza waypoints, orienta y notifica el final", () => {
  const ecs = new EntityWorld();
  const id = ecs.createEntity({
    [Component.TRANSFORM]: { x: 0.5, y: 0.5 },
    [Component.MOTION]: { speed: 2, moving: false, facing: 1, walkTime: 0 },
    [Component.PATH]: {
      waypoints: [
        { x: 1.5, y: 0.5 },
        { x: 2.5, y: 0.5 },
      ],
      index: 0,
      intent: { type: "gather" },
    },
  });

  const first = updatePaths(ecs, 0.5);
  assert.equal(first.length, 0);
  assert.equal(ecs.getComponent(id, Component.TRANSFORM).x, 1.5);
  assert.equal(ecs.getComponent(id, Component.MOTION).facing, 1);
  assert.ok(ecs.getComponent(id, Component.MOTION).walkTime > 0);

  const finished = updatePaths(ecs, 1);
  assert.equal(finished.length, 1);
  assert.equal(finished[0].id, id);
  assert.equal(ecs.getComponent(id, Component.TRANSFORM).x, 2.5);
  assert.equal(ecs.hasComponent(id, Component.PATH), false);
  assert.equal(ecs.getComponent(id, Component.MOTION).moving, false);
});

test("una ruta vacía se completa inmediatamente", () => {
  const ecs = new EntityWorld();
  const id = ecs.createEntity({
    [Component.TRANSFORM]: { x: 0.5, y: 0.5 },
    [Component.MOTION]: { speed: 2, moving: true, facing: 1, walkTime: 0 },
    [Component.PATH]: { waypoints: [], index: 0, intent: null },
  });

  const completed = updatePaths(ecs, 0.1);
  assert.equal(completed.length, 1);
  assert.equal(completed[0].id, id);
  assert.equal(ecs.hasComponent(id, Component.PATH), false);
});

test("updateEnergy respeta pausa y retardo de regeneración", () => {
  const ecs = new EntityWorld();
  const id = ecs.createEntity({
    [Component.ENERGY]: { current: 10, max: 20, paused: false, regenDelay: 1 },
  });

  updateEnergy(ecs, 0.5, { regenPerSecond: 4 });
  assert.equal(ecs.getComponent(id, Component.ENERGY).current, 10);
  assert.equal(ecs.getComponent(id, Component.ENERGY).regenDelay, 0.5);

  updateEnergy(ecs, 0.5, { regenPerSecond: 4 });
  assert.equal(ecs.getComponent(id, Component.ENERGY).current, 10);

  updateEnergy(ecs, 1, { regenPerSecond: 4 });
  assert.equal(ecs.getComponent(id, Component.ENERGY).current, 14);

  ecs.getComponent(id, Component.ENERGY).paused = true;
  updateEnergy(ecs, 5, { regenPerSecond: 4 });
  assert.equal(ecs.getComponent(id, Component.ENERGY).current, 14);

  ecs.getComponent(id, Component.ENERGY).paused = false;
  updateEnergy(ecs, 10, { regenPerSecond: 4 });
  assert.equal(ecs.getComponent(id, Component.ENERGY).current, 20);
});

test("updateGathering progresa y notifica al completar", () => {
  const ecs = new EntityWorld();
  const id = ecs.createEntity({
    [Component.GATHER]: {
      kind: "tree",
      x: 1,
      y: 2,
      duration: 2,
      elapsed: 0,
      active: true,
    },
  });

  assert.equal(updateGathering(ecs, 1).length, 0);
  assert.equal(ecs.getComponent(id, Component.GATHER).elapsed, 1);

  const completed = updateGathering(ecs, 2);
  assert.equal(completed.length, 1);
  assert.equal(completed[0].id, id);
  assert.equal(completed[0].gather.elapsed, 2);
});
