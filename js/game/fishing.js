export const FISH_SPECIES = Object.freeze([
  Object.freeze({
    id: "pezComun",
    name: "Pez común",
    minWeight: 0.3,
    maxWeight: 1.4,
    weightChance: 34,
    color: "#8fc2d8",
  }),
  Object.freeze({
    id: "trucha",
    name: "Trucha",
    minWeight: 0.5,
    maxWeight: 2.8,
    weightChance: 26,
    color: "#b9d68f",
  }),
  Object.freeze({
    id: "carpa",
    name: "Carpa",
    minWeight: 1,
    maxWeight: 4.5,
    weightChance: 20,
    color: "#d7b56d",
  }),
  Object.freeze({
    id: "pezDorado",
    name: "Pez dorado",
    minWeight: 0.8,
    maxWeight: 3.2,
    weightChance: 14,
    color: "#f0c05e",
  }),
  Object.freeze({
    id: "pezLuna",
    name: "Pez luna",
    minWeight: 1.5,
    maxWeight: 6.5,
    weightChance: 6,
    color: "#b9c8f0",
  }),
]);

export const FISHING_WAIT_MIN = 3;
export const FISHING_WAIT_MAX = 8;
export const FISHING_BITE_SECONDS = 1.35;
export const FISHING_ZONE_HALF = 0.16;
export const FISHING_PERFECT_HALF = 0.06;

const FISH_BY_ID = new Map(FISH_SPECIES.map((fish) => [fish.id, fish]));
const TOTAL_CHANCE = FISH_SPECIES.reduce((total, fish) => total + fish.weightChance, 0);

export function fishById(id) {
  return FISH_BY_ID.get(id) ?? null;
}

function pickFish(rng) {
  let roll = rng.float(0, TOTAL_CHANCE);

  for (const fish of FISH_SPECIES) {
    roll -= fish.weightChance;
    if (roll <= 0) {
      return fish;
    }
  }

  return FISH_SPECIES[FISH_SPECIES.length - 1];
}

export function createFishingAttempt(
  rng,
  { x = 0, y = 0, waitMin = FISHING_WAIT_MIN, waitMax = FISHING_WAIT_MAX } = {},
) {
  const species = pickFish(rng);

  return {
    phase: "waiting",
    speciesId: species.id,
    x,
    y,
    waitRemaining: rng.float(waitMin, waitMax),
    biteRemaining: 0,
    markerStart: rng.next(),
    markerElapsed: 0,
    markerSpeed: rng.float(0.75, 1.05),
    zoneCenter: 0.5,
    zoneHalf: FISHING_ZONE_HALF,
    perfectHalf: FISHING_PERFECT_HALF,
  };
}

export function updateFishingAttempt(attempt, deltaSeconds) {
  if (!attempt) {
    return "idle";
  }

  if (attempt.phase === "waiting") {
    attempt.waitRemaining = Math.max(0, attempt.waitRemaining - deltaSeconds);

    if (attempt.waitRemaining <= 0) {
      attempt.phase = "bite";
      attempt.biteRemaining = FISHING_BITE_SECONDS;
      attempt.markerElapsed = 0;
      return "bite";
    }

    return "waiting";
  }

  if (attempt.phase === "bite") {
    attempt.biteRemaining = Math.max(0, attempt.biteRemaining - deltaSeconds);
    attempt.markerElapsed += deltaSeconds;

    if (attempt.biteRemaining <= 0) {
      return "escape";
    }
  }

  return attempt.phase;
}

export function fishingMarkerAt(attempt, elapsed = attempt.markerElapsed) {
  const raw = (attempt.markerStart + elapsed * attempt.markerSpeed) % 2;
  return raw <= 1 ? raw : 2 - raw;
}

export function resolveFishingCatch(attempt, marker = fishingMarkerAt(attempt)) {
  const species = fishById(attempt.speciesId);

  if (!species) {
    return { caught: false, reason: "unknown" };
  }

  const distance = Math.abs(marker - attempt.zoneCenter);

  if (distance > attempt.zoneHalf) {
    return { caught: false, reason: "miss", distance, species };
  }

  const accuracy = 1 - distance / attempt.zoneHalf;
  const weight =
    Math.round(
      (species.minWeight +
        (species.maxWeight - species.minWeight) * (0.35 + accuracy * 0.65)) *
        100,
    ) / 100;

  return {
    caught: true,
    species,
    weight,
    accuracy,
    perfect: distance <= attempt.perfectHalf,
    distance,
  };
}

export function formatFishWeight(weight) {
  return `${weight.toFixed(2).replace(".", ",")} kg`;
}
