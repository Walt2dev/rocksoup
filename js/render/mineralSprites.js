import { createRng } from "../core/rng.js";
import { MINERAL_TYPES, MINERAL_VARIANTS } from "../world/minerals.js";

const RESOLUTION = 2;
const WIDTH = 40;
const HEIGHT = 34;

function polygonPath(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
}

export function createMineralSprite(typeIndex, variantIndex, bootSeed) {
  const type = MINERAL_TYPES[typeIndex];
  const rng = createRng(`${bootSeed}:mineral:${type.key}:${variantIndex}`);
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * RESOLUTION;
  canvas.height = HEIGHT * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);

  const baseX = WIDTH / 2;
  const baseY = HEIGHT - 6;

  ctx.beginPath();
  ctx.ellipse(baseX, baseY + 2, 13, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.fill();

  for (let shard = 0; shard < 4; shard += 1) {
    const centerX = baseX + rng.float(-11, 11);
    const centerY = baseY + rng.float(-7, 0);
    const width = rng.float(4.5, 8.5);
    const height = rng.float(4.5, 8);
    const lean = rng.float(-0.5, 0.5);

    const points = [
      { x: centerX + lean * width, y: centerY - height },
      { x: centerX + width * 0.55, y: centerY - height * 0.2 },
      { x: centerX + width * 0.35, y: centerY + height * 0.45 },
      { x: centerX - width * 0.45, y: centerY + height * 0.4 },
      { x: centerX - width * 0.55, y: centerY - height * 0.15 },
    ];

    polygonPath(ctx, points);
    ctx.fillStyle = type.color;
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = 0.6;
    ctx.stroke();

    polygonPath(ctx, [points[0], points[1], { x: centerX, y: centerY }, points[4]]);
    ctx.fillStyle = type.light;
    ctx.fill();
  }

  if (rng.chance(0.7)) {
    ctx.beginPath();
    ctx.arc(baseX + rng.float(-6, 6), baseY + rng.float(-10, -3), 0.9, 0, Math.PI * 2);
    ctx.fillStyle = "#f3eee2";
    ctx.fill();
  }

  return {
    canvas,
    width: WIDTH,
    height: HEIGHT,
    anchorX: WIDTH / 2,
    anchorY: baseY + 4,
  };
}

export function mineralVariantCount() {
  return MINERAL_VARIANTS;
}
