import { BIOME } from "./biomes.js";

export const PORTAL_REALMS = Object.freeze(["underground", "sky"]);
const MAX_COORDINATE = 10000000;

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

function findPortalSite(world, seed, spawn, avoid = [], offset = 0) {
  if (!world || !spawn) {
    return null;
  }
  const blockers = [
    { x: spawn.x, y: spawn.y },
    ...avoid.filter(
      (point) => Number.isFinite(point?.x) && Number.isFinite(point?.y),
    ),
  ];
  const preferred = [BIOME.GRASS, BIOME.FOREST, BIOME.WOLF, BIOME.SNOW, BIOME.ROCK];
  const seedOffset = (String(seed ?? "").length % 11) + offset;

  for (const biomeId of preferred) {
    for (let radius = 18; radius <= 120; radius += 4) {
      for (let step = 0; step < 28; step += 1) {
        const angle = (step / 28) * Math.PI * 2 + seedOffset * 0.31;
        const x = Math.round(spawn.x + Math.cos(angle) * radius);
        const y = Math.round(spawn.y + Math.sin(angle) * radius);
        if (world.biomeAt(x, y) !== biomeId) {
          continue;
        }
        if (!nearbyWalkable(world, x, y)) {
          continue;
        }
        if (!farEnough(x, y, blockers, 14)) {
          continue;
        }
        return { x: x + 0.5, y: y + 0.5 };
      }
    }
  }
  return null;
}

export function findSurfacePortals(world, seed, spawn, avoid = []) {
  const portalAvoid = [...avoid];
  const undergroundSite =
    findPortalSite(world, seed, spawn, portalAvoid, 0) ?? {
      x: spawn.x + 3.5,
      y: spawn.y + 0.5,
    };
  portalAvoid.push(undergroundSite);
  const skySite = findPortalSite(world, seed, spawn, portalAvoid, 7) ?? {
    x: spawn.x - 3.5,
    y: spawn.y + 0.5,
  };
  return [
    {
      id: "portal_underground",
      realm: "underground",
      kind: "cave",
      source: "generated",
      x: undergroundSite.x,
      y: undergroundSite.y,
    },
    {
      id: "portal_sky",
      realm: "sky",
      kind: "stairs",
      source: "generated",
      x: skySite.x,
      y: skySite.y,
    },
  ];
}

export function createRealmExitPortal(realm, layout) {
  if (!PORTAL_REALMS.includes(realm) || !layout?.exit) {
    return null;
  }
  return {
    id: `exit_${realm}`,
    realm: "surface",
    kind: realm === "underground" ? "cave" : "stairs",
    source: "realm_exit",
    x: layout.exit.x,
    y: layout.exit.y,
  };
}

export function sanitizePortals(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const portals = [];
  const seen = new Set();
  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const id =
      typeof entry.id === "string" && entry.id.trim()
        ? entry.id.trim().slice(0, 48)
        : "";
    const realm =
      entry.realm === "surface" || PORTAL_REALMS.includes(entry.realm)
        ? entry.realm
        : null;
    const kind = entry.kind === "cave" || entry.kind === "stairs" ? entry.kind : "cave";
    if (
      !id ||
      !realm ||
      !Number.isFinite(entry.x) ||
      !Number.isFinite(entry.y) ||
      seen.has(id)
    ) {
      continue;
    }
    seen.add(id);
    portals.push({
      id,
      realm,
      kind,
      source: typeof entry.source === "string" ? entry.source.slice(0, 24) : "crafted",
      x: Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, entry.x)),
      y: Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, entry.y)),
    });
    if (portals.length >= 50) {
      break;
    }
  }
  return portals;
}
