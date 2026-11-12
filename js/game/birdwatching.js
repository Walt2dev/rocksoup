export const BIRD_SPECIES = Object.freeze([
  Object.freeze({
    id: "sparrow",
    ambient: "sparrow",
    name: "Gorrión",
    rarity: "común",
    difficulty: 0.55,
    description: "Pequeño y nervioso; abunda en praderas y bosques.",
  }),
  Object.freeze({
    id: "crow",
    ambient: "crow",
    name: "Cuervo",
    rarity: "común",
    difficulty: 0.7,
    description: "Ave oscura y desconfiada que sobrevuela los claros.",
  }),
  Object.freeze({
    id: "perdiz",
    ambient: "perdiz",
    name: "Perdiz",
    rarity: "común",
    difficulty: 0.45,
    description: "Ave de suelo lenta y fácil de capturar con semillas.",
  }),
  Object.freeze({
    id: "owl",
    ambient: "owl",
    name: "Búho",
    rarity: "poco común",
    difficulty: 0.85,
    description: "Cazador nocturno de mirada fija. Aparece de noche.",
  }),
  Object.freeze({
    id: "vulture",
    ambient: "vulture",
    name: "Zopilote",
    rarity: "raro",
    difficulty: 1,
    description: "Planeador de gran envergadura; difícil de enfocar.",
  }),
]);

export const BIRD_MISSION = Object.freeze({
  requiredSpecies: 3,
  rewardFeathers: 5,
  title: "Observa 3 especies distintas con los prismáticos",
});

const BIRD_BY_ID = new Map(BIRD_SPECIES.map((bird) => [bird.id, bird]));
const BIRD_BY_AMBIENT = new Map(
  BIRD_SPECIES.map((bird) => [bird.ambient, bird]),
);

export function birdById(id) {
  return BIRD_BY_ID.get(id) ?? null;
}

export function birdForAmbientSpecies(species) {
  return BIRD_BY_AMBIENT.get(species) ?? null;
}

export function createBirdWatchAttempt(rng, species, { skill = 0 } = {}) {
  const bird = typeof species === "string" ? birdById(species) : species;
  const difficulty = bird?.difficulty ?? 0.7;
  const sweepDuration = Math.max(0.9, 1.55 - difficulty * 0.45 - skill * 0.05);
  const duration = Math.max(5, 9 - difficulty * 2);
  const zoneHalf = Math.max(0.07, 0.19 - difficulty * 0.09 - skill * 0.01);
  const perfectHalf = Math.max(0.025, zoneHalf * 0.38);
  const zoneCenter = rng.float(0.24, 0.76);

  return {
    speciesId: bird?.id ?? "sparrow",
    phase: "aiming",
    elapsed: 0,
    duration,
    sweepDuration,
    markerElapsed: 0,
    zoneCenter,
    zoneHalf,
    perfectHalf,
    result: null,
  };
}

export function updateBirdWatchAttempt(attempt, deltaSeconds) {
  if (!attempt || attempt.phase !== "aiming") {
    return { expired: false };
  }

  const delta = Math.max(0, deltaSeconds);
  attempt.elapsed += delta;
  attempt.markerElapsed += delta;

  if (attempt.elapsed >= attempt.duration) {
    attempt.phase = "escaped";
    return { expired: true };
  }

  return { expired: false };
}

export function birdWatchMarkerAt(attempt) {
  if (!attempt || attempt.sweepDuration <= 0) {
    return 0.5;
  }
  const t = (attempt.markerElapsed % attempt.sweepDuration) / attempt.sweepDuration;
  return t < 0.5 ? t * 2 : 2 - t * 2;
}

export function resolveBirdWatch(attempt, marker = birdWatchMarkerAt(attempt)) {
  if (!attempt || attempt.phase !== "aiming") {
    return { ok: false, perfect: false };
  }

  const distance = Math.abs(marker - attempt.zoneCenter);
  const perfect = distance <= attempt.perfectHalf;
  const ok = perfect || distance <= attempt.zoneHalf;
  attempt.phase = ok ? "observed" : "failed";
  attempt.result = { ok, perfect };

  return attempt.result;
}

export function birdMissionState({ observations = [], completed = false } = {}) {
  const unique = new Set(
    (Array.isArray(observations) ? observations : []).filter((id) =>
      BIRD_BY_ID.has(id),
    ),
  );
  const count = unique.size;
  return {
    count,
    required: BIRD_MISSION.requiredSpecies,
    complete: completed === true || count >= BIRD_MISSION.requiredSpecies,
    rewarded: completed === true,
  };
}
