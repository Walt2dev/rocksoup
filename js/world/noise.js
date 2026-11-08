import { createRng } from "../core/rng.js";

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const GRAD2 = new Float32Array([
  1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 1, 0, -1, 0, 0, 1, 0, -1, 0, 1, 0, -1,
]);

export function clamp01(value) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function buildPermutation(seed) {
  const rng = createRng(`noise:${seed}`);
  const base = new Uint8Array(256);

  for (let i = 0; i < 256; i += 1) {
    base[i] = i;
  }

  for (let i = 255; i > 0; i -= 1) {
    const j = rng.int(0, i + 1);
    const swap = base[i];
    base[i] = base[j];
    base[j] = swap;
  }

  const perm = new Uint8Array(512);
  const permMod12 = new Uint8Array(512);

  for (let i = 0; i < 512; i += 1) {
    perm[i] = base[i & 255];
    permMod12[i] = perm[i] % 12;
  }

  return { perm, permMod12 };
}

export function createNoise(seed) {
  const { perm, permMod12 } = buildPermutation(seed);

  return function simplex2D(xin, yin) {
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);

    let i1 = 0;
    let j1 = 1;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;

    let n0 = 0;
    let n1 = 0;
    let n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      t0 *= t0;
      const gi0 = permMod12[ii + perm[jj]] * 2;
      n0 = t0 * t0 * (GRAD2[gi0] * x0 + GRAD2[gi0 + 1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      t1 *= t1;
      const gi1 = permMod12[ii + i1 + perm[jj + j1]] * 2;
      n1 = t1 * t1 * (GRAD2[gi1] * x1 + GRAD2[gi1 + 1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      t2 *= t2;
      const gi2 = permMod12[ii + 1 + perm[jj + 1]] * 2;
      n2 = t2 * t2 * (GRAD2[gi2] * x2 + GRAD2[gi2 + 1] * y2);
    }

    return 70 * (n0 + n1 + n2);
  };
}

export function fbm(noise, x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
  let sum = 0;
  let amplitude = 1;
  let frequency = 1;
  let norm = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    sum += amplitude * noise(x * frequency, y * frequency);
    norm += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return norm > 0 ? sum / norm : 0;
}

export function fbm01(noise, x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
  return clamp01(fbm(noise, x, y, octaves, lacunarity, gain) * 0.5 + 0.5);
}
