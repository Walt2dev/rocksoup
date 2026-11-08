export const CROP_DATA = Object.freeze({
  trigo: Object.freeze({
    id: "trigo",
    name: "Trigo",
    seed: "semillaTrigo",
    produce: "trigo",
    color: "#d8c46a",
    stageSeconds: Object.freeze([20, 55, 110]),
    yield: 3,
    seedYield: 2,
  }),
  maiz: Object.freeze({
    id: "maiz",
    name: "Maíz",
    seed: "semillaMaiz",
    produce: "maiz",
    color: "#e0b85e",
    stageSeconds: Object.freeze([25, 65, 125]),
    yield: 3,
    seedYield: 2,
  }),
});

const MAX_PLOTS = 200;

export function cropById(id) {
  return CROP_DATA[id] ?? null;
}

export function createFarmPlot(x, y) {
  return {
    x: Math.floor(x),
    y: Math.floor(y),
    crop: null,
    stage: 0,
    growth: 0,
    watered: false,
    plantedAt: 0,
  };
}

export function sanitizeFarmPlot(value) {
  if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    return null;
  }

  const crop = cropById(value.crop);
  const growth = Number.isFinite(value.growth)
    ? Math.min(100000, Math.max(0, value.growth))
    : 0;

  return {
    x: Math.floor(value.x),
    y: Math.floor(value.y),
    crop: crop ? crop.id : null,
    stage: crop
      ? Math.min(3, Math.max(0, Math.floor(value.stage ?? 0)))
      : 0,
    growth,
    watered: value.watered === true,
    plantedAt: Number.isFinite(value.plantedAt) ? Math.max(0, value.plantedAt) : 0,
  };
}

export function sanitizeFarmPlots(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const plots = new Map();

  for (const raw of value) {
    const plot = sanitizeFarmPlot(raw);

    if (!plot) {
      continue;
    }

    const key = `${plot.x}:${plot.y}`;
    if (!plots.has(key)) {
      plots.set(key, plot);
    }
    if (plots.size >= MAX_PLOTS) {
      break;
    }
  }

  return [...plots.values()];
}

export function plantCrop(plot, cropId, now) {
  const crop = cropById(cropId);

  if (!plot || !crop || plot.crop) {
    return false;
  }

  plot.crop = crop.id;
  plot.stage = 0;
  plot.growth = 0;
  plot.watered = false;
  plot.plantedAt = now;
  return true;
}

export function waterFarmPlot(plot) {
  if (!plot || !plot.crop || plot.watered) {
    return false;
  }
  plot.watered = true;
  return true;
}

export function updateFarmPlot(plot, deltaSeconds) {
  const crop = cropById(plot?.crop);

  if (!plot || !crop || plot.stage >= 3) {
    return false;
  }

  const before = plot.stage;
  plot.growth += Math.max(0, deltaSeconds) * (plot.watered ? 1.6 : 1);
  const nextStage =
    plot.growth >= crop.stageSeconds[2]
      ? 3
      : plot.growth >= crop.stageSeconds[1]
        ? 2
        : plot.growth >= crop.stageSeconds[0]
          ? 1
          : 0;
  plot.stage = Math.max(plot.stage, nextStage);
  return plot.stage !== before;
}

export function harvestFarmPlot(plot) {
  const crop = cropById(plot?.crop);

  if (!plot || !crop || plot.stage < 3) {
    return null;
  }

  const result = {
    crop,
    produce: crop.yield,
    seeds: crop.seedYield,
  };

  plot.crop = null;
  plot.stage = 0;
  plot.growth = 0;
  plot.watered = false;
  plot.plantedAt = 0;
  return result;
}
