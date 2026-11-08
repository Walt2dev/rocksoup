import { Component } from "./components.js";

export function moveDirect(transform, deltaX, deltaY, isWalkable) {
  let movedX = 0;
  let movedY = 0;

  if (deltaX !== 0) {
    const nextX = transform.x + deltaX;
    if (isWalkable(Math.floor(nextX), Math.floor(transform.y))) {
      transform.x = nextX;
      movedX = deltaX;
    }
  }

  if (deltaY !== 0) {
    const nextY = transform.y + deltaY;
    if (isWalkable(Math.floor(transform.x), Math.floor(nextY))) {
      transform.y = nextY;
      movedY = deltaY;
    }
  }

  return { movedX, movedY };
}

export function updatePaths(ecs, deltaSeconds) {
  const completed = [];

  for (const id of ecs.query(Component.TRANSFORM, Component.PATH, Component.MOTION)) {
    const transform = ecs.getComponent(id, Component.TRANSFORM);
    const path = ecs.getComponent(id, Component.PATH);
    const motion = ecs.getComponent(id, Component.MOTION);

    if (!Array.isArray(path.waypoints) || path.waypoints.length === 0) {
      ecs.removeComponent(id, Component.PATH);
      motion.moving = false;
      completed.push({ id, path });
      continue;
    }

    let budget = Math.max(1e-9, motion.speed * deltaSeconds);
    let moved = false;

    while (budget > 0 && path.index < path.waypoints.length) {
      const target = path.waypoints[path.index];
      const dx = target.x - transform.x;
      const dy = target.y - transform.y;
      const distance = Math.hypot(dx, dy);
      const screenDelta = dx - dy;

      if (Math.abs(screenDelta) > 1e-6) {
        motion.facing = screenDelta > 0 ? 1 : -1;
      }

      if (distance <= 1e-6) {
        path.index += 1;
        continue;
      }

      if (distance <= budget) {
        transform.x = target.x;
        transform.y = target.y;
        budget -= distance;
        path.index += 1;
        moved = true;
      } else {
        transform.x += (dx / distance) * budget;
        transform.y += (dy / distance) * budget;
        budget = 0;
        moved = true;
      }
    }

    if (moved) {
      motion.walkTime += deltaSeconds;
    }

    if (path.index >= path.waypoints.length) {
      ecs.removeComponent(id, Component.PATH);
      motion.moving = false;
      completed.push({ id, path });
    } else {
      motion.moving = true;
    }
  }

  return completed;
}

export function updateEnergy(ecs, deltaSeconds, { regenPerSecond = 6 } = {}) {
  for (const id of ecs.query(Component.ENERGY)) {
    const energy = ecs.getComponent(id, Component.ENERGY);

    if (energy.regenDelay > 0) {
      energy.regenDelay = Math.max(0, energy.regenDelay - deltaSeconds);
    } else if (!energy.paused) {
      energy.current = Math.min(energy.max, energy.current + regenPerSecond * deltaSeconds);
    }
  }
}

export function updateGathering(ecs, deltaSeconds) {
  const completed = [];

  for (const id of ecs.query(Component.GATHER)) {
    const gather = ecs.getComponent(id, Component.GATHER);

    if (!gather.active) {
      continue;
    }

    gather.elapsed = Math.min(gather.duration, gather.elapsed + deltaSeconds);

    if (gather.elapsed >= gather.duration) {
      completed.push({ id, gather });
    }
  }

  return completed;
}
