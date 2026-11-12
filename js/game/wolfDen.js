import { BIOME } from "../world/biomes.js";

export const WOLF_MISSION = Object.freeze({
  id: "wolfden",
  name: "Cueva de lobos",
  wolvesRequired: 3,
  peltsRequired: 2,
  rewardPelts: 2,
  description:
    "La manada acosa el bosque. Derrota 3 lobos y entrega 2 pieles de lobo en la cueva.",
});

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

export function findWolfDenSite(world, seed, spawn, avoid = []) {
  if (!world || !spawn) {
    return null;
  }

  const blockers = [
    { x: spawn.x, y: spawn.y },
    ...avoid.filter(
      (point) => Number.isFinite(point?.x) && Number.isFinite(point?.y),
    ),
  ];
  const preferred = [BIOME.WOLF, BIOME.SNOW, BIOME.GRASS, BIOME.FOREST];
  const seedOffset = String(seed ?? "").length % 7;

  for (let biomeIndex = 0; biomeIndex < preferred.length; biomeIndex += 1) {
    const biomeId = preferred[biomeIndex];
    if (!Number.isFinite(biomeId)) {
      continue;
    }

    let found = null;
    const maxRadius = biomeIndex < 2 ? 280 : 140;

    for (let radius = 26; radius <= maxRadius && !found; radius += 5) {
      for (let step = 0; step < 24 && !found; step += 1) {
        const angle =
          (step / 24) * Math.PI * 2 + biomeIndex * 0.37 + seedOffset;
        const x = Math.round(spawn.x + Math.cos(angle) * radius);
        const y = Math.round(spawn.y + Math.sin(angle) * radius);

        if (world.biomeAt(x, y) !== biomeId) {
          continue;
        }
        if (!nearbyWalkable(world, x, y)) {
          continue;
        }
        if (!farEnough(x, y, blockers, 16)) {
          continue;
        }

        found = { x, y };
      }
    }

    if (found) {
      return {
        id: WOLF_MISSION.id,
        name: WOLF_MISSION.name,
        biome: biomeId,
        x: found.x + 0.5,
        y: found.y + 0.5,
        discovered: false,
      };
    }
  }

  return null;
}

export function wolfMissionState({
  kills = 0,
  pelts = 0,
  completed = false,
  claimed = false,
} = {}) {
  const safeKills = Math.max(0, Math.floor(Number.isFinite(kills) ? kills : 0));
  const safePelts = Math.max(0, Math.floor(Number.isFinite(pelts) ? pelts : 0));
  const done = completed === true;
  const canClaim =
    !done &&
    safeKills >= WOLF_MISSION.wolvesRequired &&
    safePelts >= WOLF_MISSION.peltsRequired;

  return {
    kills: safeKills,
    pelts: safePelts,
    wolvesRequired: WOLF_MISSION.wolvesRequired,
    peltsRequired: WOLF_MISSION.peltsRequired,
    killsReady: safeKills >= WOLF_MISSION.wolvesRequired,
    peltsReady: safePelts >= WOLF_MISSION.peltsRequired,
    canClaim,
    completed: done,
    claimed: claimed === true,
  };
}
