import { BIOMES, BIOME } from "../world/biomes.js";
import { CONSTELLATIONS } from "./skyCatalog.js";

export const VILLAGE_BIOMES = Object.freeze([
  Object.freeze({ biome: BIOME.BEACH, name: "Aldea de la Costa", shaman: ["Nerida", "Coral", "Tavi"] }),
  Object.freeze({ biome: BIOME.GRASS, name: "Aldea de la Pradera", shaman: ["Yara", "Tilo", "Mara"] }),
  Object.freeze({ biome: BIOME.FOREST, name: "Aldea del Bosque", shaman: ["Oru", "Savia", "Bruma"] }),
  Object.freeze({ biome: BIOME.ROCK, name: "Aldea de la Montaña", shaman: ["Kael", "Roca", "Uro"] }),
  Object.freeze({ biome: BIOME.SNOW, name: "Aldea del Hielo", shaman: ["Niev", "Frost", "Ilga"] }),
  Object.freeze({ biome: BIOME.DESERT, name: "Aldea del Desierto", shaman: ["Sahar", "Duna", "Ami"] }),
  Object.freeze({ biome: BIOME.JUNGLE, name: "Aldea de la Selva", shaman: ["Ixchel", "Mono", "Zama"] }),
]);

export const VILLAGE_REQUEST_ITEMS = Object.freeze({
  full: "moonHealingPotion",
  new: "moonPoisonPotion",
});

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nearbyWalkable(world, x, y) {
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (!world.isWalkableAt(x + dx, y + dy)) {
        return false;
      }
    }
  }
  return true;
}

function farEnough(x, y, points, minDistance) {
  return points.every(
    (point) => Math.hypot(point.x - x, point.y - y) >= minDistance,
  );
}

export function makeVillageRequest(seed, village) {
  const hash = hashString(`${seed}:${village.id}:shaman`);
  const constellation = CONSTELLATIONS[hash % CONSTELLATIONS.length];
  const phase = hash % 2 === 0 ? "full" : "new";
  const item = VILLAGE_REQUEST_ITEMS[phase];
  const reason =
    phase === "full"
      ? "curar la fiebre que apaga la voz de los ancianos"
      : "purificar la plaga que marchita los cultivos";

  return {
    constellationId: constellation.id,
    constellationName: constellation.name,
    phase,
    item,
    reason,
    reward: {
      bayas: 4,
      agua: 2,
      madera: 3,
      ...(phase === "full" ? { Ca: 1 } : { Zn: 1 }),
    },
  };
}

export function findVillageSites(world, seed, spawn, avoid = []) {
  const sites = [];
  const blockers = [
    { x: spawn.x, y: spawn.y },
    ...avoid.filter(
      (point) => Number.isFinite(point?.x) && Number.isFinite(point?.y),
    ),
  ];

  for (let index = 0; index < VILLAGE_BIOMES.length; index += 1) {
    const config = VILLAGE_BIOMES[index];
    const biome = BIOMES[config.biome];
    let found = null;

    for (let radius = 22; radius <= 150 && !found; radius += 4) {
      for (let step = 0; step < 20 && !found; step += 1) {
        const angle = (step / 20) * Math.PI * 2 + index * 0.41;
        const x = Math.round(spawn.x + Math.cos(angle) * radius);
        const y = Math.round(spawn.y + Math.sin(angle) * radius);

        if (world.biomeAt(x, y) !== config.biome) continue;
        if (!nearbyWalkable(world, x, y)) continue;
        if (!farEnough(x, y, blockers, 13)) continue;
        if (!farEnough(x, y, sites, 11)) continue;

        found = { x, y };
      }
    }

    if (!found) {
      continue;
    }

    const id = `village:${biome.key}`;
    const hash = hashString(`${seed}:${id}`);
    const shamanName = config.shaman[hash % config.shaman.length];
    const village = {
      id,
      biome: config.biome,
      biomeName: biome.name,
      name: config.name,
      x: found.x + 0.5,
      y: found.y + 0.5,
      shamanName,
      huts: [
        { x: found.x - 2.2, y: found.y + 0.4 },
        { x: found.x + 2.1, y: found.y - 0.8 },
        { x: found.x + 0.3, y: found.y + 2.1 },
      ],
      request: null,
    };
    village.request = makeVillageRequest(seed, village);
    sites.push(village);
  }

  return sites;
}
