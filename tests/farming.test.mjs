import assert from "node:assert/strict";
import test from "node:test";

import {
  CROP_DATA,
  createFarmPlot,
  cropById,
  harvestFarmPlot,
  plantCrop,
  sanitizeFarmPlots,
  updateFarmPlot,
  waterFarmPlot,
} from "../js/game/farming.js";

test("las parcelas se plantan, crecen y se cosechan", () => {
  const plot = createFarmPlot(4.2, 7.8);
  assert.deepEqual({ x: plot.x, y: plot.y, crop: plot.crop }, {
    x: 4,
    y: 7,
    crop: null,
  });
  assert.equal(plantCrop(plot, "trigo", 10), true);
  assert.equal(plot.crop, "trigo");
  assert.equal(plantCrop(plot, "maiz", 11), false);

  const crop = cropById("trigo");
  updateFarmPlot(plot, crop.stageSeconds[0]);
  assert.equal(plot.stage, 1);
  updateFarmPlot(plot, crop.stageSeconds[1]);
  assert.ok(plot.stage >= 2);

  while (plot.stage < 3) {
    updateFarmPlot(plot, 30);
  }

  const result = harvestFarmPlot(plot);
  assert.equal(result.crop.id, "trigo");
  assert.equal(result.produce, crop.yield);
  assert.equal(result.seeds, crop.seedYield);
  assert.equal(plot.crop, null);
  assert.equal(plot.stage, 0);
});

test("regar acelera el crecimiento y solo se aplica una vez", () => {
  const plot = createFarmPlot(0, 0);
  plantCrop(plot, "maiz", 0);
  assert.equal(waterFarmPlot(plot), true);
  assert.equal(waterFarmPlot(plot), false);

  updateFarmPlot(plot, 20);
  const dry = createFarmPlot(1, 1);
  plantCrop(dry, "maiz", 0);
  updateFarmPlot(dry, 20);
  assert.ok(plot.growth > dry.growth);
});

test("las parcelas se sanean y se deduplican por coordenada", () => {
  const plots = sanitizeFarmPlots([
    { x: 1, y: 2, crop: "trigo", growth: 999, watered: true },
    { x: 1, y: 2, crop: "maiz", growth: 1 },
    { x: 3.8, y: 4.2, crop: "otro" },
    { x: Number.NaN, y: 1 },
  ]);

  assert.equal(plots.length, 2);
  assert.equal(plots[0].crop, "trigo");
  assert.equal(plots[0].x, 1);
  assert.equal(plots[1].x, 3);
  assert.equal(plots[1].crop, null);
  assert.ok(CROP_DATA.trigo.stageSeconds.length === 3);
});
