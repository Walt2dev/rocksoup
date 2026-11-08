const HEX_SEED_RE = /^[0-9a-f]+$/i;
const MAX_SEED_LENGTH = 64;
const TWO_POW_32 = 0x100000000;

export function isValidHexSeed(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 16 && HEX_SEED_RE.test(value);
}

export function xmur3(input) {
  const text = String(input);
  let h = 1779033703 ^ text.length;

  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  return function nextHash() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

export function hashSeed(seed) {
  const text = normalizeSeed(seed);
  return xmur3(text)() >>> 0;
}

export function normalizeSeed(seed) {
  if (typeof seed === "number") {
    if (!Number.isFinite(seed)) {
      throw new TypeError("La seed numérica debe ser finita");
    }
    return String(seed >>> 0);
  }

  if (typeof seed !== "string") {
    throw new TypeError("La seed debe ser un string o un número");
  }

  const text = seed.trim();
  if (text.length === 0) {
    throw new Error("La seed no puede estar vacía");
  }
  if (text.length > MAX_SEED_LENGTH) {
    throw new Error(`La seed no puede superar ${MAX_SEED_LENGTH} caracteres`);
  }

  return text;
}

export function mulberry32(seed) {
  let state = seed >>> 0;

  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / TWO_POW_32;
  };
}

export function createRng(seed) {
  const source = normalizeSeed(seed);
  const seedHash = hashSeed(source);
  const state = mulberry32(seedHash);

  function float(min = 0, max = 1) {
    if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
      throw new RangeError("Rango inválido para float");
    }
    return min + state() * (max - min);
  }

  function int(min, max) {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max <= min) {
      throw new RangeError("Rango inválido para int: se espera min < max");
    }
    return min + Math.floor(state() * (max - min));
  }

  function chance(probability) {
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
      throw new RangeError("La probabilidad debe estar entre 0 y 1");
    }
    return state() < probability;
  }

  function pick(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new RangeError("pick requiere un array no vacío");
    }
    return items[int(0, items.length)];
  }

  function shuffle(items) {
    if (!Array.isArray(items)) {
      throw new TypeError("shuffle requiere un array");
    }
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = int(0, i + 1);
      const swap = copy[i];
      copy[i] = copy[j];
      copy[j] = swap;
    }
    return copy;
  }

  function fork(label) {
    if (label === undefined || label === null || String(label).length === 0) {
      throw new Error("fork requiere una etiqueta");
    }
    return createRng(`${source}:${label}`);
  }

  return {
    seed: source,
    hash: seedHash,
    next: state,
    float,
    int,
    chance,
    pick,
    shuffle,
    fork,
  };
}

export function randomSeed() {
  const words = new Uint32Array(1);

  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(words);
  } else {
    const now = Date.now();
    const perf = typeof performance === "undefined" ? 0 : Math.floor(performance.now() * 1000);
    words[0] = (now ^ perf ^ (now >>> 32)) >>> 0;
  }

  return words[0].toString(16).padStart(8, "0");
}
