import { EntityWorld } from "../js/ecs/ecs.js";
import { Component } from "../js/ecs/components.js";
import { createAmbientEntity } from "../js/game/entityFactory.js";
import {
  AMBIENT_MAX_HEALTH,
  AMBIENT_SPECIES,
  buildAmbientData,
  pickAmbientSpawn,
  updateAmbientSystem,
} from "../js/game/ambient.js";
import { createRng } from "../js/core/rng.js";
import { BIOME } from "../js/world/biomes.js";
import {
  DAY_LENGTH_SECONDS,
  DAY_NIGHT_CYCLE,
} from "../js/game/time.js";

const PASSIVE_SPECIES = Object.freeze([
  AMBIENT_SPECIES.FOX,
  AMBIENT_SPECIES.FROG,
  AMBIENT_SPECIES.VULTURE,
  AMBIENT_SPECIES.GOAT,
  AMBIENT_SPECIES.SPARROW,
  AMBIENT_SPECIES.CROW,
  AMBIENT_SPECIES.OWL,
  AMBIENT_SPECIES.PERDIZ,
  AMBIENT_SPECIES.CHICKEN,
]);

const PASSIVE_TARGET = 6;
const NIGHT_TARGET = 3;
const SPAWN_INTERVAL = 2.5;
const DESPAWN_RADIUS = 48;

export function createAmbientSync({ world, seed }) {
  const ecs = new EntityWorld();
  const rng = createRng(`${seed}:ambient:network`);
  const entities = new Map();
  let spawnTimer = 0;
  let spawnSlot = 0;
  let clock = 0;

  function isNight(time) {
    return time % DAY_NIGHT_CYCLE >= DAY_LENGTH_SECONDS;
  }

  function remove(id) {
    if (!entities.has(id)) {
      return false;
    }
    entities.delete(id);
    ecs.destroyEntity(id);
    return true;
  }

  function spawn(client, species, night) {
    const preferredSpecies =
      species ?? (night ? null : PASSIVE_SPECIES[spawnSlot % PASSIVE_SPECIES.length]);
    spawnSlot += 1;

    let spawnPoint = pickAmbientSpawn(rng, world, client.x, client.y, {
      preferredSpecies,
      minRadius: 8,
      maxRadius: 30,
      attempts: preferredSpecies === AMBIENT_SPECIES.FROG ? 80 : 40,
    });

    if (!spawnPoint && species) {
      return false;
    }

    if (!spawnPoint && !night) {
      spawnPoint = pickAmbientSpawn(rng, world, client.x, client.y, {
        minRadius: 4,
        maxRadius: 18,
        attempts: 32,
      });
    }

    if (!spawnPoint) {
      return false;
    }

    const ambient = buildAmbientData(
      rng,
      spawnPoint.species,
      spawnPoint.x,
      spawnPoint.y,
    );
    ambient.health =
      AMBIENT_MAX_HEALTH[spawnPoint.species] ?? AMBIENT_MAX_HEALTH.fox;
    ambient.ownerId = client.id;

    const id = createAmbientEntity(ecs, {
      species: spawnPoint.species,
      x: spawnPoint.x,
      y: spawnPoint.y,
      ambient,
    });
    entities.set(id, { ownerId: client.id, species: spawnPoint.species });
    return true;
  }

  function clear() {
    for (const id of [...entities.keys()]) {
      remove(id);
    }
    spawnTimer = 0;
    spawnSlot = 0;
    clock = 0;
  }

  function tick(deltaSeconds, players, worldTime, campfires = []) {
    const dt = Math.max(0, Math.min(0.5, deltaSeconds));
    clock += dt;

    if (players.length === 0) {
      clear();
      return;
    }

    const playerIds = new Set(players.map((player) => player.id));
    const nowNight = isNight(worldTime);

    for (const [id, entry] of [...entities]) {
      const transform = ecs.getComponent(id, Component.TRANSFORM);
      if (!playerIds.has(entry.ownerId) || !transform) {
        remove(id);
        continue;
      }
      const owner = players.find((player) => player.id === entry.ownerId);
      const distance = owner
        ? Math.hypot(transform.x - owner.x, transform.y - owner.y)
        : Infinity;
      const nightMob =
        entry.species === AMBIENT_SPECIES.NIGHTLING ||
        entry.species === AMBIENT_SPECIES.SPIDER;

      if (distance > DESPAWN_RADIUS || (nightMob && !nowNight)) {
        remove(id);
      }
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = SPAWN_INTERVAL;

      for (const player of players) {
        let passiveCount = 0;
        let nightCount = 0;

        for (const entry of entities.values()) {
          if (entry.ownerId !== player.id) {
            continue;
          }
          if (
            entry.species === AMBIENT_SPECIES.NIGHTLING ||
            entry.species === AMBIENT_SPECIES.SPIDER
          ) {
            nightCount += 1;
          } else {
            passiveCount += 1;
          }
        }

        const passiveTarget = nowNight
          ? Math.max(2, Math.floor(PASSIVE_TARGET / 2))
          : PASSIVE_TARGET;

        while (passiveCount < passiveTarget) {
          if (!spawn(player, null, false)) {
            break;
          }
          passiveCount += 1;
        }

        if (world.biomeAt(player.x, player.y) === BIOME.WOLF) {
          let wolfCount = 0;
          for (const entry of entities.values()) {
            if (
              entry.ownerId === player.id &&
              entry.species === AMBIENT_SPECIES.WOLF
            ) {
              wolfCount += 1;
            }
          }
          while (wolfCount < 2) {
            if (!spawn(player, AMBIENT_SPECIES.WOLF, false)) {
              break;
            }
            wolfCount += 1;
          }
        }

        if (nowNight) {
          while (nightCount < NIGHT_TARGET) {
            const species =
              nightCount % 2 === 0
                ? AMBIENT_SPECIES.NIGHTLING
                : AMBIENT_SPECIES.SPIDER;
            if (!spawn(player, species, true)) {
              break;
            }
            nightCount += 1;
          }
        }
      }
    }

    updateAmbientSystem(ecs, dt, {
      players,
      isWalkable: (x, y) => world.isActorWalkableAt(x, y),
      time: clock,
      campfires,
    });
  }

  function snapshot() {
    const list = [];

    for (const [id, entry] of entities) {
      const transform = ecs.getComponent(id, Component.TRANSFORM);
      const motion = ecs.getComponent(id, Component.MOTION);
      const ambient = ecs.getComponent(id, Component.AMBIENT);

      if (!transform || !motion || !ambient) {
        continue;
      }

      list.push({
        id,
        species: entry.species,
        x: transform.x,
        y: transform.y,
        z: transform.z ?? 0,
        facing: motion.facing,
        moving: motion.moving === true,
        walkTime: motion.walkTime ?? 0,
        phase: ambient.phase ?? 0,
        state: ambient.state ?? "wander",
        health: ambient.health ?? AMBIENT_MAX_HEALTH[entry.species] ?? 1,
      });
    }

    return list;
  }

  function damage(id, amount) {
    const entry = entities.get(id);
    const ambient = ecs.getComponent(id, Component.AMBIENT);
    const transform = ecs.getComponent(id, Component.TRANSFORM);

    if (!entry || !ambient || !transform) {
      return null;
    }

    const maxHealth = AMBIENT_MAX_HEALTH[entry.species] ?? 1;
    ambient.health = Math.max(
      0,
      (Number.isFinite(ambient.health) ? ambient.health : maxHealth) - amount,
    );

    const result = {
      id,
      species: entry.species,
      x: transform.x,
      y: transform.y,
      health: ambient.health,
      killed: ambient.health <= 0,
    };

    if (result.killed) {
      remove(id);
    }

    return result;
  }

  function position(id) {
    const transform = ecs.getComponent(id, Component.TRANSFORM);
    return transform ? { x: transform.x, y: transform.y } : null;
  }

  function removeOwner(ownerId) {
    for (const [id, entry] of [...entities]) {
      if (entry.ownerId === ownerId) {
        remove(id);
      }
    }
  }

  return {
    tick,
    snapshot,
    damage,
    position,
    removeOwner,
    clear,
    get time() {
      return clock;
    },
    get size() {
      return entities.size;
    },
  };
}
