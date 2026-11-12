import assert from "node:assert/strict";
import test from "node:test";

import { createRng } from "../js/core/rng.js";
import { Component } from "../js/ecs/components.js";
import { EntityWorld } from "../js/ecs/ecs.js";
import {
  AMBIENT_MAX_HEALTH,
  AMBIENT_SPECIES,
  AMBIENT_SPECIES_LIST,
  buildAmbientData,
  isHostileSpecies,
  pickAmbientSpawn,
  updateAmbientSystem,
} from "../js/game/ambient.js";
import { createAmbientEntity } from "../js/game/entityFactory.js";
import { World } from "../js/world/world.js";

test("el spawn ambiental es determinista y elige una especie válida", () => {
  const world = new World("ambient-spawn");
  const center = world.findSpawn();
  const first = pickAmbientSpawn(createRng("spawn-a"), world, center.x, center.y);
  const second = pickAmbientSpawn(createRng("spawn-a"), world, center.x, center.y);

  assert.deepEqual(first, second);
  assert.ok(first);
  assert.ok(AMBIENT_SPECIES_LIST.includes(first.species));
  assert.ok(Number.isFinite(first.x) && Number.isFinite(first.y));
  assert.equal(world.isWalkableAt(Math.floor(first.x), Math.floor(first.y)), true);
});

test("el zorro huye cuando el jugador se acerca", () => {
  const ecs = new EntityWorld();
  const ambient = buildAmbientData(createRng("fox"), AMBIENT_SPECIES.FOX, 5, 0);
  const id = createAmbientEntity(ecs, {
    species: AMBIENT_SPECIES.FOX,
    x: 5,
    y: 0,
    ambient,
  });
  const ambientComponent = ecs.getComponent(id, Component.AMBIENT);

  updateAmbientSystem(ecs, 0.5, {
    playerX: 4.5,
    playerY: 0,
    isWalkable: () => true,
    time: 0,
  });

  const transform = ecs.getComponent(id, Component.TRANSFORM);
  const motion = ecs.getComponent(id, Component.MOTION);
  assert.equal(ambientComponent.state, "flee");
  assert.ok(transform.x > 5);
  assert.equal(motion.moving, true);
});

test("el zorro deambula cuando el jugador está lejos", () => {
  const ecs = new EntityWorld();
  const ambient = buildAmbientData(createRng("fox-wander"), AMBIENT_SPECIES.FOX, 0, 0);
  const id = createAmbientEntity(ecs, {
    species: AMBIENT_SPECIES.FOX,
    x: 0,
    y: 0,
    ambient,
  });
  const ambientComponent = ecs.getComponent(id, Component.AMBIENT);

  updateAmbientSystem(ecs, 0.4, {
    playerX: 40,
    playerY: 40,
    isWalkable: () => true,
    time: 1,
  });

  const transform = ecs.getComponent(id, Component.TRANSFORM);
  assert.equal(ambientComponent.state, "wander");
  assert.ok(Math.hypot(transform.x, transform.y) < 10);
});

test("el sapo salta y alcanza altura durante el salto", () => {
  const ecs = new EntityWorld();
  const ambient = buildAmbientData(createRng("frog"), AMBIENT_SPECIES.FROG, 0, 0);
  const id = createAmbientEntity(ecs, {
    species: AMBIENT_SPECIES.FROG,
    x: 0,
    y: 0,
    ambient,
  });
  const ambientComponent = ecs.getComponent(id, Component.AMBIENT);
  ambientComponent.timer = 0;

  updateAmbientSystem(ecs, 0.1, {
    playerX: 20,
    playerY: 20,
    isWalkable: () => true,
    time: 0,
  });
  assert.ok(ambientComponent.hopTime > 0);

  updateAmbientSystem(ecs, 0.2, {
    playerX: 20,
    playerY: 20,
    isWalkable: () => true,
    time: 0,
  });

  const transform = ecs.getComponent(id, Component.TRANSFORM);
  assert.ok(transform.z > 0);
  assert.equal(ecs.getComponent(id, Component.MOTION).moving, true);
});

test("el zopilote sobrevuela en círculos con altura", () => {
  const ecs = new EntityWorld();
  const ambient = buildAmbientData(
    createRng("vulture"),
    AMBIENT_SPECIES.VULTURE,
    0,
    0,
  );
  const id = createAmbientEntity(ecs, {
    species: AMBIENT_SPECIES.VULTURE,
    x: ambient.anchorX,
    y: ambient.anchorY,
    ambient,
  });
  const ambientComponent = ecs.getComponent(id, Component.AMBIENT);

  updateAmbientSystem(ecs, 0.5, {
    playerX: 20,
    playerY: 20,
    isWalkable: () => true,
    time: 1,
  });

  const transform = ecs.getComponent(id, Component.TRANSFORM);
  const motion = ecs.getComponent(id, Component.MOTION);
  assert.ok(transform.z > 2);
  assert.ok(
    Math.hypot(
      transform.x - ambientComponent.anchorX,
      transform.y - ambientComponent.anchorY,
    ) > 1,
  );
  assert.equal(motion.moving, true);
});

test("la perdiz es f�cil de asustar y el lobo persigue", () => {
  assert.ok(AMBIENT_SPECIES_LIST.includes(AMBIENT_SPECIES.PERDIZ));
  assert.ok(AMBIENT_SPECIES_LIST.includes(AMBIENT_SPECIES.WOLF));
  assert.equal(isHostileSpecies(AMBIENT_SPECIES.WOLF), true);
  assert.equal(isHostileSpecies(AMBIENT_SPECIES.PERDIZ), false);
  assert.ok(AMBIENT_MAX_HEALTH.perdiz < AMBIENT_MAX_HEALTH.wolf);

  const ecs = new EntityWorld();
  const perdiz = buildAmbientData(createRng("perdiz"), AMBIENT_SPECIES.PERDIZ, 4, 0);
  const perdizId = createAmbientEntity(ecs, {
    species: AMBIENT_SPECIES.PERDIZ,
    x: 4,
    y: 0,
    ambient: perdiz,
  });
  updateAmbientSystem(ecs, 0.5, {
    playerX: 3.5,
    playerY: 0,
    isWalkable: () => true,
    time: 0,
  });
  const perdizComponent = ecs.getComponent(perdizId, Component.AMBIENT);
  assert.equal(perdizComponent.state, "flee");

  const wolf = buildAmbientData(createRng("wolf"), AMBIENT_SPECIES.WOLF, 8, 0);
  const wolfId = createAmbientEntity(ecs, {
    species: AMBIENT_SPECIES.WOLF,
    x: 8,
    y: 0,
    ambient: wolf,
  });
  updateAmbientSystem(ecs, 0.5, {
    playerX: 0,
    playerY: 0,
    isWalkable: () => true,
    time: 0,
  });
  const wolfTransform = ecs.getComponent(wolfId, Component.TRANSFORM);
  const wolfComponent = ecs.getComponent(wolfId, Component.AMBIENT);
  assert.equal(wolfComponent.state, "chase");
  assert.ok(wolfTransform.x < 8);
});
