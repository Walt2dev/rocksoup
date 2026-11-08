import { Component } from "../ecs/components.js";

export const PLAYER_SPEED = 4.2;
export const PLAYER_MAX_ENERGY = 100;
export const WORKER_SPEED = 3.3;
export const WORKER_NAMES = Object.freeze(["Tizón", "Musgo", "Brasa", "Junco"]);
export const MAX_WORKERS = 4;
export const WORKER_AUTO_RADIUS = 5;

export function createPlayerEntity(ecs, { x, y, energy = PLAYER_MAX_ENERGY }) {
  const id = ecs.createEntity();

  ecs.addComponent(id, Component.TRANSFORM, { x, y, z: 0 });
  ecs.addComponent(id, Component.MOTION, {
    speed: PLAYER_SPEED,
    moving: false,
    facing: 1,
    walkTime: 0,
  });
  ecs.addComponent(id, Component.PLAYER, { name: "Viajero" });
  ecs.addComponent(id, Component.ENERGY, {
    current: Math.min(PLAYER_MAX_ENERGY, Math.max(0, energy)),
    max: PLAYER_MAX_ENERGY,
    paused: false,
    regenDelay: 0,
  });
  ecs.addComponent(id, Component.RENDER, { kind: "player", frame: 0 });

  return id;
}

export function createAmbientEntity(ecs, { species, x, y, ambient }) {
  const id = ecs.createEntity();

  ecs.addComponent(id, Component.TRANSFORM, { x, y, z: ambient?.z ?? 0 });
  ecs.addComponent(id, Component.MOTION, {
    speed: ambient?.speed ?? 2,
    moving: false,
    facing: 1,
    walkTime: 0,
  });
  ecs.addComponent(id, Component.AMBIENT, { ...ambient, species });
  ecs.addComponent(id, Component.RENDER, { kind: "ambient", species });

  return id;
}

export function createWorkerEntity(
  ecs,
  {
    x,
    y,
    name = "Duende",
    autoRepeat = false,
    autoRadius = WORKER_AUTO_RADIUS,
  },
) {
  const id = ecs.createEntity();

  ecs.addComponent(id, Component.TRANSFORM, { x, y, z: 0 });
  ecs.addComponent(id, Component.MOTION, {
    speed: WORKER_SPEED,
    moving: false,
    facing: 1,
    walkTime: 0,
  });
  ecs.addComponent(id, Component.WORKER, {
    name,
    state: "idle",
    task: null,
    autoRepeat,
    autoRadius,
  });
  ecs.addComponent(id, Component.RENDER, { kind: "worker", frame: 0 });

  return id;
}
