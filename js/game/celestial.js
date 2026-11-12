import {
  DAY_LENGTH_SECONDS,
  DAY_NIGHT_CYCLE,
  MOON_PHASES,
  NIGHT_LENGTH_SECONDS,
  isNightAt,
  moonPhaseIndexAt,
} from "./time.js";

const MOON_ILLUMINATION = Object.freeze([
  0, 0.18, 0.5, 0.82, 1, 0.82, 0.5, 0.18,
]);

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function cycleTime(time) {
  const safe = Number.isFinite(time) ? Math.max(0, time) : 0;
  return safe % DAY_NIGHT_CYCLE;
}

export function dayProgressAt(time) {
  return clamp01(cycleTime(time) / DAY_LENGTH_SECONDS);
}

export function nightProgressAt(time) {
  const cycle = cycleTime(time);
  if (cycle < DAY_LENGTH_SECONDS) {
    return 0;
  }
  return clamp01((cycle - DAY_LENGTH_SECONDS) / NIGHT_LENGTH_SECONDS);
}

function lerpColor(from, to, amount) {
  const t = clamp01(amount);
  const a = from.map((value) => Math.round(value));
  const b = to.map((value) => Math.round(value));
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)}, ${Math.round(
    a[1] + (b[1] - a[1]) * t,
  )}, ${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

export function sunStateAt(time) {
  const night = isNightAt(time);
  const progress = dayProgressAt(time);
  const azimuth = Math.cos(progress * Math.PI);
  const elevation = night ? 0 : Math.sin(progress * Math.PI);
  const dawnDusk = Math.min(progress, 1 - progress) < 0.12;
  const color = dawnDusk
    ? lerpColor([255, 166, 92], [255, 220, 150], elevation)
    : lerpColor([255, 236, 186], [255, 250, 224], elevation);

  return {
    visible: !night,
    progress,
    azimuth,
    elevation,
    dawnDusk,
    color,
    glow: dawnDusk ? "rgba(255, 168, 92, 0.55)" : "rgba(255, 236, 178, 0.5)",
    intensity: night ? 0 : 0.28 + elevation * 0.72,
  };
}

export function moonStateAt(time) {
  const night = isNightAt(time);
  const progress = nightProgressAt(time);
  const phaseIndex = moonPhaseIndexAt(time);
  const phase = MOON_PHASES[phaseIndex] ?? MOON_PHASES[0];
  const azimuth = Math.cos(progress * Math.PI);
  const elevation = night ? Math.sin(progress * Math.PI) : 0;

  return {
    visible: night,
    progress,
    azimuth,
    elevation,
    phase,
    phaseIndex,
    illumination: MOON_ILLUMINATION[phaseIndex] ?? 0,
    color: "rgba(226, 234, 255, 0.92)",
    glow: "rgba(186, 208, 255, 0.42)",
    intensity: night ? 0.25 + elevation * 0.75 : 0,
  };
}

export function skyColorsAt(time) {
  const night = isNightAt(time);
  const dayProgress = dayProgressAt(time);
  const nightProgress = nightProgressAt(time);

  if (night) {
    const fade = Math.min(1, Math.min(nightProgress, 1 - nightProgress) * 6);
    return {
      top: lerpColor([6, 10, 24], [10, 16, 34], fade),
      bottom: lerpColor([11, 18, 38], [18, 26, 48], fade),
      horizon: "rgba(90, 118, 176, 0.18)",
      tint: "rgba(8, 14, 32, 0.22)",
      tintAlpha: 0.22,
    };
  }

  const warmth = Math.min(dayProgress, 1 - dayProgress) < 0.14 ? 1 : 0;
  return {
    top: lerpColor([34, 76, 122], [58, 116, 168], 1 - warmth),
    bottom: lerpColor([96, 132, 154], [148, 184, 198], 1 - warmth),
    horizon: "rgba(255, 206, 140, 0.35)",
    tint: `rgba(255, 168, 96, ${0.16 * warmth})`,
    tintAlpha: 0.16 * warmth,
  };
}

export function reflectionAnchorAt(celestial) {
  const night = celestial?.night === true;
  const active = night ? celestial?.moon : celestial?.sun;

  if (!active || !active.visible) {
    return null;
  }

  return {
    kind: night ? "moon" : "sun",
    night,
    x: 0.18 + (active.progress ?? 0) * 0.64,
    y: 0.26 - (active.elevation ?? 0) * 0.05,
    intensity: active.intensity ?? 0.6,
    phaseIndex: celestial.moon?.phaseIndex ?? 0,
    illumination: celestial.moon?.illumination ?? 0,
  };
}

export function celestialStateAt(time) {
  const sun = sunStateAt(time);
  const moon = moonStateAt(time);
  const state = {
    time: Number.isFinite(time) ? Math.max(0, time) : 0,
    night: isNightAt(time),
    sun,
    moon,
    sky: skyColorsAt(time),
  };
  state.reflection = reflectionAnchorAt(state);
  return state;
}
