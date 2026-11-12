import { Component } from "../ecs/components.js";
import { moveDirect } from "../ecs/systems.js";
import { BIOME } from "../world/biomes.js";

export const AMBIENT_SPECIES = Object.freeze({
  FOX: "fox",
  FROG: "frog",
  VULTURE: "vulture",
  GOAT: "goat",
  SPARROW: "sparrow",
  CROW: "crow",
  OWL: "owl",
  NIGHTLING: "nightling",
  SPIDER: "spider",
  DONKEY: "donkey",
  PERDIZ: "perdiz",
  WOLF: "wolf",
});

export const AMBIENT_SPECIES_LIST = Object.freeze(Object.values(AMBIENT_SPECIES));
const FOX_FLEE_RADIUS = 5.5;
const FROG_FLEE_RADIUS = 3.2;
const NIGHTLING_AGGRO_RADIUS = 14;
const NIGHTLING_STOP_RADIUS = 1.05;
const WOLF_AGGRO_RADIUS = 13;
const WOLF_STOP_RADIUS = 1;
const WOLF_TOTEM_RADIUS = 7;
const CAMPFIRE_SAFE_RADIUS = 3.6;
const PERDIZ_FLEE_RADIUS = 2.4;

export const AMBIENT_MAX_HEALTH = Object.freeze({
  fox: 35,
  frog: 20,
  vulture: 20,
  goat: 55,
  sparrow: 20,
  crow: 20,
  owl: 20,
  nightling: 60,
  spider: 45,
  donkey: 120,
  perdiz: 16,
  wolf: 70,
});

export function isHostileSpecies(species) {
  return (
    species === AMBIENT_SPECIES.NIGHTLING ||
    species === AMBIENT_SPECIES.SPIDER ||
    species === AMBIENT_SPECIES.WOLF
  );
}

export function isNearWater(world, x, y, radius = 2) {
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (world.biomeAt(x + dx, y + dy) === BIOME.WATER) {
        return true;
      }
    }
  }
  return false;
}

export function pickAmbientSpawn(rng, world, centerX, centerY, {
  minRadius = 9,
  maxRadius = 22,
  attempts = 28,
  preferredSpecies = null,
} = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const angle = rng.float(0, Math.PI * 2);
    const distance = rng.float(minRadius, maxRadius);
    const x = Math.round(centerX + Math.cos(angle) * distance);
    const y = Math.round(centerY + Math.sin(angle) * distance);
    const biome = world.biomeAt(x, y);
    const roll = rng.next();
    const species =
      preferredSpecies ??
      (roll < 0.26
        ? AMBIENT_SPECIES.FOX
        : roll < 0.42
          ? AMBIENT_SPECIES.FROG
          : roll < 0.54
            ? AMBIENT_SPECIES.VULTURE
            : roll < 0.66
              ? AMBIENT_SPECIES.GOAT
              : roll < 0.74
                ? AMBIENT_SPECIES.PERDIZ
                : roll < 0.84
                  ? AMBIENT_SPECIES.SPARROW
                  : roll < 0.93
                    ? AMBIENT_SPECIES.CROW
                    : AMBIENT_SPECIES.OWL);

    if (biome === BIOME.WATER) {
      continue;
    }

    if (species === AMBIENT_SPECIES.FOX) {
      if (
        biome !== BIOME.GRASS &&
        biome !== BIOME.FOREST &&
        biome !== BIOME.JUNGLE
      ) {
        continue;
      }
      if (!world.isWalkableAt(x, y)) {
        continue;
      }
    } else if (species === AMBIENT_SPECIES.GOAT) {
      if (
        biome !== BIOME.GRASS &&
        biome !== BIOME.FOREST &&
        biome !== BIOME.JUNGLE &&
        biome !== BIOME.DESERT
      ) {
        continue;
      }
      if (!world.isWalkableAt(x, y)) {
        continue;
      }
    } else if (species === AMBIENT_SPECIES.DONKEY) {
      if (biome !== BIOME.GRASS && biome !== BIOME.FOREST) {
        continue;
      }
      if (!world.isWalkableAt(x, y)) {
        continue;
      }
    } else if (species === AMBIENT_SPECIES.PERDIZ) {
      if (
        biome !== BIOME.GRASS &&
        biome !== BIOME.FOREST &&
        biome !== BIOME.WOLF
      ) {
        continue;
      }
      if (!world.isWalkableAt(x, y)) {
        continue;
      }
    } else if (species === AMBIENT_SPECIES.WOLF) {
      if (biome !== BIOME.WOLF && biome !== BIOME.SNOW) {
        continue;
      }
      if (!world.isWalkableAt(x, y)) {
        continue;
      }
    } else if (
      species === AMBIENT_SPECIES.SPARROW ||
      species === AMBIENT_SPECIES.CROW ||
      species === AMBIENT_SPECIES.OWL
    ) {
      if (!world.isWalkableAt(x, y)) {
        continue;
      }
    } else if (species === AMBIENT_SPECIES.FROG) {
      if (!world.isWalkableAt(x, y)) {
        continue;
      }
      if (!isNearWater(world, x, y, 2)) {
        continue;
      }
    } else if (
      species === AMBIENT_SPECIES.NIGHTLING ||
      species === AMBIENT_SPECIES.SPIDER
    ) {
      if (!world.isWalkableAt(x, y)) {
        continue;
      }
    }

    return {
      species,
      x: x + 0.5,
      y: y + 0.5,
    };
  }

  return null;
}

export function buildAmbientData(rng, species, x, y) {
  const phase = rng.float(0, Math.PI * 2);
  const angle = rng.float(0, Math.PI * 2);
  let radius = rng.float(1.2, 2.8);
  let speed = rng.float(1.8, 2.6);
  let timer = rng.float(0.5, 1.6);

  if (species === AMBIENT_SPECIES.FROG) {
    radius = rng.float(0.9, 1.8);
    speed = rng.float(1.4, 2.2);
  } else if (species === AMBIENT_SPECIES.VULTURE) {
    radius = rng.float(3, 6);
    speed = rng.float(0.25, 0.5);
    timer = 0;
  } else if (species === AMBIENT_SPECIES.GOAT) {
    radius = rng.float(1.2, 2.8);
    speed = rng.float(1.1, 1.7);
    timer = rng.float(0.8, 1.8);
  } else if (species === AMBIENT_SPECIES.DONKEY) {
    radius = rng.float(1.4, 3.2);
    speed = rng.float(0.9, 1.4);
    timer = rng.float(1.2, 2.6);
  } else if (
    species === AMBIENT_SPECIES.SPARROW ||
    species === AMBIENT_SPECIES.CROW ||
    species === AMBIENT_SPECIES.OWL
  ) {
    radius = rng.float(2.5, 5.5);
    speed = rng.float(0.35, 0.75);
    timer = 0;
  } else if (species === AMBIENT_SPECIES.NIGHTLING) {
    radius = rng.float(1.5, 3.2);
    speed = rng.float(2.15, 2.7);
    timer = rng.float(0.4, 1.2);
  } else if (species === AMBIENT_SPECIES.SPIDER) {
    radius = rng.float(1.2, 2.6);
    speed = rng.float(1.6, 2.1);
    timer = rng.float(0.5, 1.4);
  } else if (species === AMBIENT_SPECIES.PERDIZ) {
    radius = rng.float(0.8, 1.8);
    speed = rng.float(1, 1.5);
    timer = rng.float(0.9, 1.9);
  } else if (species === AMBIENT_SPECIES.WOLF) {
    radius = rng.float(2.2, 4.4);
    speed = rng.float(2.3, 2.9);
    timer = rng.float(0.4, 1.1);
  }

  return {
    species,
    anchorX: x,
    anchorY: y,
    phase,
    angle,
    radius,
    speed,
    state: "wander",
    timer,
    hopTime: 0,
    hopDuration: 0.45,
    hopCount: 0,
    fromX: x,
    fromY: y,
    toX: x,
    toY: y,
    z: 0,
  };
}

function updateFox(ambient, transform, motion, deltaSeconds, playerX, playerY, isWalkable, time) {
  const dx = transform.x - playerX;
  const dy = transform.y - playerY;
  const distance = Math.hypot(dx, dy);
  let directionX = 0;
  let directionY = 0;
  let speed = 0;

  if (distance < FOX_FLEE_RADIUS && distance > 1e-6) {
    ambient.state = "flee";
    const sway = Math.sin(time * 4 + ambient.phase) * 0.3;
    const baseX = dx / distance;
    const baseY = dy / distance;
    const cos = Math.cos(sway);
    const sin = Math.sin(sway);
    directionX = baseX * cos - baseY * sin;
    directionY = baseX * sin + baseY * cos;
    speed = ambient.speed;
  } else {
    ambient.state = "wander";
    const orbit = ambient.phase + Math.sin(time * 0.45 + ambient.phase) * 1.35;
    const targetX = ambient.anchorX + Math.cos(orbit) * ambient.radius;
    const targetY = ambient.anchorY + Math.sin(orbit) * ambient.radius;
    const targetDx = targetX - transform.x;
    const targetDy = targetY - transform.y;
    const targetDistance = Math.hypot(targetDx, targetDy);

    if (targetDistance > 0.08) {
      directionX = targetDx / targetDistance;
      directionY = targetDy / targetDistance;
      speed = ambient.speed * 0.35;
    }
  }

  transform.z = 0;

  if (speed <= 0) {
    motion.moving = false;
    return;
  }

  if (Math.abs(directionX - directionY) > 0.01) {
    motion.facing = directionX - directionY > 0 ? 1 : -1;
  }

  const step = speed * deltaSeconds;
  let moved = moveDirect(transform, directionX * step, directionY * step, isWalkable);

  if (ambient.state === "flee" && moved.movedX === 0 && moved.movedY === 0) {
    moved = moveDirect(transform, -directionY * step, directionX * step, isWalkable);
    if (moved.movedX === 0 && moved.movedY === 0) {
      moved = moveDirect(transform, directionY * step, -directionX * step, isWalkable);
    }
  }

  const didMove = moved.movedX !== 0 || moved.movedY !== 0;
  motion.moving = didMove;
  if (didMove) {
    motion.walkTime += deltaSeconds;
  }
}

function updateFrog(ambient, transform, motion, deltaSeconds, playerX, playerY, isWalkable, time) {
  if (ambient.hopTime > 0) {
    ambient.state = "hop";
    ambient.hopTime = Math.max(0, ambient.hopTime - deltaSeconds);
    const progress = 1 - ambient.hopTime / ambient.hopDuration;
    transform.x = ambient.fromX + (ambient.toX - ambient.fromX) * progress;
    transform.y = ambient.fromY + (ambient.toY - ambient.fromY) * progress;
    transform.z = Math.sin(Math.PI * Math.min(1, progress)) * 0.38;
    motion.moving = true;
    motion.walkTime += deltaSeconds;

    if (ambient.hopTime <= 0) {
      transform.z = 0;
      motion.moving = false;
      ambient.timer = 1.1 + Math.abs(Math.sin(ambient.phase + ambient.hopCount)) * 0.9;
    }
    return;
  }

  transform.z = 0;
  motion.moving = false;
  ambient.state = "idle";
  ambient.timer -= deltaSeconds;

  if (ambient.timer > 0) {
    return;
  }

  ambient.hopCount += 1;
  let angle = ambient.phase + ambient.hopCount * 2.399;
  const playerDistance = Math.hypot(transform.x - playerX, transform.y - playerY);

  if (playerDistance < FROG_FLEE_RADIUS) {
    angle = Math.atan2(transform.y - playerY, transform.x - playerX);
  }

  const targetX = ambient.anchorX + Math.cos(angle) * ambient.radius;
  const targetY = ambient.anchorY + Math.sin(angle) * ambient.radius;

  if (!isWalkable(Math.floor(targetX), Math.floor(targetY))) {
    ambient.timer = 0.8;
    return;
  }

  ambient.fromX = transform.x;
  ambient.fromY = transform.y;
  ambient.toX = targetX;
  ambient.toY = targetY;
  ambient.hopDuration = 0.42;
  ambient.hopTime = ambient.hopDuration;
  motion.moving = true;

  if (Math.abs(targetX - targetY - (transform.x - transform.y)) > 0.01) {
    motion.facing = targetX - targetY - (transform.x - transform.y) > 0 ? 1 : -1;
  }
}

function updateVulture(ambient, transform, motion, deltaSeconds, time) {
  ambient.state = "circle";
  ambient.angle += ambient.speed * deltaSeconds;
  const nextX = ambient.anchorX + Math.cos(ambient.angle) * ambient.radius;
  const nextY = ambient.anchorY + Math.sin(ambient.angle) * ambient.radius;
  const velocityX = nextX - transform.x;
  const velocityY = nextY - transform.y;

  transform.x = nextX;
  transform.y = nextY;
  transform.z = 2.35 + Math.sin(time * 2.2 + ambient.phase) * 0.15;

  if (Math.abs(velocityX - velocityY) > 0.0001) {
    motion.facing = velocityX - velocityY > 0 ? 1 : -1;
  }

  motion.moving = true;
  motion.walkTime += deltaSeconds;
}

function updateBird(ambient, transform, motion, deltaSeconds, time) {
  ambient.state = "fly";
  ambient.angle += ambient.speed * deltaSeconds;
  const nextX = ambient.anchorX + Math.cos(ambient.angle) * ambient.radius;
  const nextY = ambient.anchorY + Math.sin(ambient.angle) * ambient.radius;
  const velocityX = nextX - transform.x;
  const velocityY = nextY - transform.y;

  transform.x = nextX;
  transform.y = nextY;
  transform.z = 1.15 + Math.sin(time * 2.6 + ambient.phase) * 0.18;

  if (Math.abs(velocityX - velocityY) > 0.0001) {
    motion.facing = velocityX - velocityY > 0 ? 1 : -1;
  }

  motion.moving = true;
  motion.walkTime += deltaSeconds;
}

function updateNightling(
  ambient,
  transform,
  motion,
  deltaSeconds,
  playerX,
  playerY,
  isWalkable,
  time,
  campfires,
) {
  const dx = playerX - transform.x;
  const dy = playerY - transform.y;
  const distance = Math.hypot(dx, dy);
  const nearFire = campfires.some(
    (fire) => Math.hypot(fire.x - transform.x, fire.y - transform.y) < CAMPFIRE_SAFE_RADIUS,
  );

  let targetX = null;
  let targetY = null;
  let speed = ambient.speed;

  if (nearFire) {
    ambient.state = "repelled";
    let nearestFire = campfires[0];
    let nearestDistance = Infinity;

    for (const fire of campfires) {
      const fireDistance = Math.hypot(fire.x - transform.x, fire.y - transform.y);
      if (fireDistance < nearestDistance) {
        nearestDistance = fireDistance;
        nearestFire = fire;
      }
    }

    if (nearestFire) {
      const awayX = transform.x - nearestFire.x;
      const awayY = transform.y - nearestFire.y;
      const awayLength = Math.hypot(awayX, awayY) || 1;
      targetX = transform.x + (awayX / awayLength) * 2;
      targetY = transform.y + (awayY / awayLength) * 2;
    }
  } else if (distance < NIGHTLING_AGGRO_RADIUS && distance > NIGHTLING_STOP_RADIUS) {
    ambient.state = "chase";
    targetX = playerX;
    targetY = playerY;
  } else if (distance <= NIGHTLING_STOP_RADIUS) {
    ambient.state = "attack";
    motion.moving = false;
    return;
  } else {
    ambient.state = "wander";
    const orbit = ambient.phase + Math.sin(time * 0.6 + ambient.phase) * 1.4;
    targetX = ambient.anchorX + Math.cos(orbit) * ambient.radius;
    targetY = ambient.anchorY + Math.sin(orbit) * ambient.radius;
    speed = ambient.speed * 0.45;
  }

  if (targetX === null || targetY === null) {
    motion.moving = false;
    return;
  }

  const targetDx = targetX - transform.x;
  const targetDy = targetY - transform.y;
  const targetDistance = Math.hypot(targetDx, targetDy);

  if (targetDistance <= 0.06) {
    motion.moving = false;
    return;
  }

  const directionX = targetDx / targetDistance;
  const directionY = targetDy / targetDistance;

  if (Math.abs(directionX - directionY) > 0.01) {
    motion.facing = directionX - directionY > 0 ? 1 : -1;
  }

  const step = speed * deltaSeconds;
  const moved = moveDirect(transform, directionX * step, directionY * step, isWalkable);
  motion.moving = moved.movedX !== 0 || moved.movedY !== 0;

  if (motion.moving) {
    motion.walkTime += deltaSeconds;
  }
}

function updateDonkey(
  ambient,
  transform,
  motion,
  deltaSeconds,
  isWalkable,
  time,
) {
  if (ambient.mounted) {
    motion.moving = false;
    return;
  }

  transform.z = 0;
  const orbit = ambient.phase + Math.sin(time * 0.35 + ambient.phase) * 1.2;
  const targetX = ambient.anchorX + Math.cos(orbit) * ambient.radius;
  const targetY = ambient.anchorY + Math.sin(orbit) * ambient.radius;
  const dx = targetX - transform.x;
  const dy = targetY - transform.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= 0.08) {
    motion.moving = false;
    return;
  }

  const directionX = dx / distance;
  const directionY = dy / distance;
  if (Math.abs(directionX - directionY) > 0.01) {
    motion.facing = directionX - directionY > 0 ? 1 : -1;
  }

  const step = ambient.speed * 0.42 * deltaSeconds;
  const moved = moveDirect(transform, directionX * step, directionY * step, isWalkable);
  motion.moving = moved.movedX !== 0 || moved.movedY !== 0;
  if (motion.moving) {
    motion.walkTime += deltaSeconds;
  }
}

function updatePerdiz(
  ambient,
  transform,
  motion,
  deltaSeconds,
  playerX,
  playerY,
  isWalkable,
  time,
) {
  transform.z = 0;
  const dx = transform.x - playerX;
  const dy = transform.y - playerY;
  const distance = Math.hypot(dx, dy);
  let directionX = 0;
  let directionY = 0;
  let speed = 0;

  if (distance < PERDIZ_FLEE_RADIUS && distance > 1e-6) {
    ambient.state = "flee";
    directionX = dx / distance;
    directionY = dy / distance;
    speed = ambient.speed * 1.45;
  } else {
    ambient.state = "wander";
    const orbit = ambient.phase + Math.sin(time * 0.5 + ambient.phase) * 1.2;
    const targetX = ambient.anchorX + Math.cos(orbit) * ambient.radius;
    const targetY = ambient.anchorY + Math.sin(orbit) * ambient.radius;
    const targetDx = targetX - transform.x;
    const targetDy = targetY - transform.y;
    const targetDistance = Math.hypot(targetDx, targetDy);

    if (targetDistance > 0.08) {
      directionX = targetDx / targetDistance;
      directionY = targetDy / targetDistance;
      speed = ambient.speed * 0.4;
    }
  }

  if (speed <= 0) {
    motion.moving = false;
    return;
  }

  if (Math.abs(directionX - directionY) > 0.01) {
    motion.facing = directionX - directionY > 0 ? 1 : -1;
  }

  const step = speed * deltaSeconds;
  const moved = moveDirect(
    transform,
    directionX * step,
    directionY * step,
    isWalkable,
  );
  motion.moving = moved.movedX !== 0 || moved.movedY !== 0;
  if (motion.moving) {
    motion.walkTime += deltaSeconds;
  }
}

function updateCompanion(
  ambient,
  transform,
  motion,
  deltaSeconds,
  playerX,
  playerY,
  isWalkable,
) {
  transform.z = 0;
  const dx = playerX - transform.x;
  const dy = playerY - transform.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= 2.6) {
    ambient.state = "idle";
    motion.moving = false;
    return;
  }

  const directionX = dx / distance;
  const directionY = dy / distance;
  if (Math.abs(directionX - directionY) > 0.01) {
    motion.facing = directionX - directionY > 0 ? 1 : -1;
  }

  ambient.state = "follow";
  const speed = ambient.speed * 1.15;
  const step = speed * deltaSeconds;
  const moved = moveDirect(
    transform,
    directionX * step,
    directionY * step,
    isWalkable,
  );
  motion.moving = moved.movedX !== 0 || moved.movedY !== 0;
  if (motion.moving) {
    motion.walkTime += deltaSeconds;
  }
}

function updateWolf(
  ambient,
  transform,
  motion,
  deltaSeconds,
  playerX,
  playerY,
  isWalkable,
  time,
  totems,
) {
  transform.z = 0;
  const dx = playerX - transform.x;
  const dy = playerY - transform.y;
  const distance = Math.hypot(dx, dy);
  let nearestTotem = null;
  let nearestTotemDistance = Infinity;

  for (const totem of totems) {
    const totemDistance = Math.hypot(totem.x - transform.x, totem.y - transform.y);
    if (totemDistance < nearestTotemDistance) {
      nearestTotemDistance = totemDistance;
      nearestTotem = totem;
    }
  }

  let targetX = null;
  let targetY = null;
  let speed = ambient.speed;

  if (nearestTotem && nearestTotemDistance < WOLF_TOTEM_RADIUS) {
    ambient.state = "repelled";
    const awayX = transform.x - nearestTotem.x;
    const awayY = transform.y - nearestTotem.y;
    const awayLength = Math.hypot(awayX, awayY) || 1;
    targetX = transform.x + (awayX / awayLength) * 2.4;
    targetY = transform.y + (awayY / awayLength) * 2.4;
  } else if (distance < WOLF_AGGRO_RADIUS && distance > WOLF_STOP_RADIUS) {
    ambient.state = "chase";
    targetX = playerX;
    targetY = playerY;
  } else if (distance <= WOLF_STOP_RADIUS) {
    ambient.state = "attack";
    motion.moving = false;
    return;
  } else {
    ambient.state = "wander";
    const orbit = ambient.phase + Math.sin(time * 0.55 + ambient.phase) * 1.3;
    targetX = ambient.anchorX + Math.cos(orbit) * ambient.radius;
    targetY = ambient.anchorY + Math.sin(orbit) * ambient.radius;
    speed = ambient.speed * 0.45;
  }

  if (targetX === null || targetY === null) {
    motion.moving = false;
    return;
  }

  const targetDx = targetX - transform.x;
  const targetDy = targetY - transform.y;
  const targetDistance = Math.hypot(targetDx, targetDy);

  if (targetDistance <= 0.06) {
    motion.moving = false;
    return;
  }

  const directionX = targetDx / targetDistance;
  const directionY = targetDy / targetDistance;

  if (Math.abs(directionX - directionY) > 0.01) {
    motion.facing = directionX - directionY > 0 ? 1 : -1;
  }

  const step = speed * deltaSeconds;
  const moved = moveDirect(
    transform,
    directionX * step,
    directionY * step,
    isWalkable,
  );
  motion.moving = moved.movedX !== 0 || moved.movedY !== 0;
  if (motion.moving) {
    motion.walkTime += deltaSeconds;
  }
}

export function updateAmbientSystem(ecs, deltaSeconds, {
  playerX,
  playerY,
  players = null,
  isWalkable,
  time = 0,
  campfires = [],
  totems = [],
}) {
  for (const id of ecs.query(Component.AMBIENT, Component.TRANSFORM, Component.MOTION)) {
    const ambient = ecs.getComponent(id, Component.AMBIENT);
    const transform = ecs.getComponent(id, Component.TRANSFORM);
    const motion = ecs.getComponent(id, Component.MOTION);

    if (ambient.wave || ambient.network) {
      continue;
    }

    let targetX = playerX;
    let targetY = playerY;

    if (ambient.companion) {
      updateCompanion(
        ambient,
        transform,
        motion,
        deltaSeconds,
        playerX,
        playerY,
        isWalkable,
      );
      continue;
    }

    if (Array.isArray(players) && players.length > 0) {
      let nearest = null;
      let nearestDistance = Infinity;

      for (const player of players) {
        if (!Number.isFinite(player?.x) || !Number.isFinite(player?.y)) {
          continue;
        }
        const distance = Math.hypot(player.x - transform.x, player.y - transform.y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = player;
        }
      }

      if (nearest) {
        targetX = nearest.x;
        targetY = nearest.y;
      }
    }

    if (
      ambient.species === AMBIENT_SPECIES.FOX ||
      ambient.species === AMBIENT_SPECIES.GOAT
    ) {
      updateFox(ambient, transform, motion, deltaSeconds, targetX, targetY, isWalkable, time);
    } else if (ambient.species === AMBIENT_SPECIES.FROG) {
      updateFrog(ambient, transform, motion, deltaSeconds, targetX, targetY, isWalkable, time);
    } else if (
      ambient.species === AMBIENT_SPECIES.VULTURE ||
      ambient.species === AMBIENT_SPECIES.SPARROW ||
      ambient.species === AMBIENT_SPECIES.CROW ||
      ambient.species === AMBIENT_SPECIES.OWL
    ) {
      if (ambient.species === AMBIENT_SPECIES.VULTURE) {
        updateVulture(ambient, transform, motion, deltaSeconds, time);
      } else {
        updateBird(ambient, transform, motion, deltaSeconds, time);
      }
    } else if (ambient.species === AMBIENT_SPECIES.DONKEY) {
      updateDonkey(
        ambient,
        transform,
        motion,
        deltaSeconds,
        isWalkable,
        time,
      );
    } else if (ambient.species === AMBIENT_SPECIES.PERDIZ) {
      updatePerdiz(
        ambient,
        transform,
        motion,
        deltaSeconds,
        targetX,
        targetY,
        isWalkable,
        time,
      );
    } else if (ambient.species === AMBIENT_SPECIES.WOLF) {
      updateWolf(
        ambient,
        transform,
        motion,
        deltaSeconds,
        targetX,
        targetY,
        isWalkable,
        time,
        totems,
      );
    } else if (
      ambient.species === AMBIENT_SPECIES.NIGHTLING ||
      ambient.species === AMBIENT_SPECIES.SPIDER
    ) {
      updateNightling(
        ambient,
        transform,
        motion,
        deltaSeconds,
        targetX,
        targetY,
        isWalkable,
        time,
        campfires,
      );
    }
  }
}
