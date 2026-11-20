import { createRng } from "../core/rng.js";
import { generateTree } from "../world/lsystem.js";
import { TREE_VARIANTS } from "../world/vegetation.js";
import {
  BUILTIN_WOODS,
  legacyWoodIdForSpecies,
  normalizeWoodStyle,
} from "../world/woods.js";

const RESOLUTION = 2;
const PADDING = 9;

export const TREE_STYLES = Object.freeze(
  BUILTIN_WOODS.map((entry) => Object.freeze({ key: entry.id, ...entry.style })),
);

function createCactusSprite(variantIndex) {
  const width = 38;
  const height = 64;
  const canvas = document.createElement("canvas");
  canvas.width = width * RESOLUTION;
  canvas.height = height * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = width / 2;
  const baseY = height - 5;
  const outline = "#244028";
  const green = "#4f8a52";
  const greenDark = "#356b3d";
  const greenLight = "#7bb56f";

  ctx.beginPath();
  ctx.ellipse(cx, baseY, 13, 4.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(47, 37, 22, 0.42)";
  ctx.fill();

  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.1;

  roundedRectPath(ctx, cx - 6, baseY - 46, 12, 46, 6);
  ctx.fillStyle = green;
  ctx.fill();
  ctx.stroke();

  const leftArm = variantIndex % 2 === 0 ? 1 : 0.78;
  const rightArm = variantIndex % 2 === 0 ? 0.82 : 1.08;

  roundedRectPath(ctx, cx - 17, baseY - 33, 12, 7 * leftArm, 3.5);
  ctx.fillStyle = greenDark;
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, cx - 17, baseY - 39, 6.5, 16 * leftArm, 3.2);
  ctx.fillStyle = green;
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, cx + 5, baseY - 41, 12, 7 * rightArm, 3.5);
  ctx.fillStyle = greenDark;
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, cx + 10.5, baseY - 49, 6.5, 18 * rightArm, 3.2);
  ctx.fillStyle = green;
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = greenLight;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 2.6, baseY - 42);
  ctx.lineTo(cx - 2.6, baseY - 7);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 2.6, baseY - 42);
  ctx.lineTo(cx + 2.6, baseY - 7);
  ctx.stroke();

  ctx.strokeStyle = "rgba(230, 238, 204, 0.7)";
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 10; i += 1) {
    const y = baseY - 9 - i * 3.7;
    const side = i % 2 === 0 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + side * 5.8, y);
    ctx.lineTo(cx + side * 8.2, y - 0.8);
    ctx.stroke();
  }

  return {
    canvas,
    width,
    height,
    anchorX: cx,
    anchorY: baseY,
  };
}

function createMushroomSprite(style, variantIndex) {
  const width = 54;
  const height = 66;
  const canvas = document.createElement("canvas");
  canvas.width = width * RESOLUTION;
  canvas.height = height * RESOLUTION;
  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = width / 2;
  const baseY = height - 5;
  const capColor = style.leaves[variantIndex % style.leaves.length];
  const capDark = style.branch;
  const stem = style.trunk;

  ctx.beginPath();
  ctx.ellipse(cx, baseY, 13, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(18, 12, 24, 0.4)";
  ctx.fill();

  roundedRectPath(ctx, cx - 4.5, baseY - 28, 9, 28, 4);
  ctx.fillStyle = stem;
  ctx.fill();
  ctx.strokeStyle = "rgba(40, 28, 46, 0.6)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, baseY - 30, 19 + (variantIndex % 3) * 2, 11, 0, Math.PI, 0);
  ctx.lineTo(cx + 19, baseY - 29);
  ctx.quadraticCurveTo(cx, baseY - 22, cx - 19, baseY - 29);
  ctx.closePath();
  ctx.fillStyle = capColor;
  ctx.fill();
  ctx.strokeStyle = capDark;
  ctx.stroke();

  for (let index = 0; index < 4; index += 1) {
    const x = cx - 12 + index * 7;
    const y = baseY - 33 - (index % 2) * 3;
    ctx.beginPath();
    ctx.arc(x, y, 1.6 + (index % 2) * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = style.highlight;
    ctx.fill();
  }

  return {
    canvas,
    width,
    height,
    anchorX: cx,
    anchorY: baseY,
  };
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function polygonPath(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
}

function rasterizeTree(tree, style, seed) {
  const logicalWidth = Math.max(18, Math.ceil(tree.bounds.maxX - tree.bounds.minX + PADDING * 2));
  const logicalHeight = Math.max(18, Math.ceil(tree.bounds.maxY - tree.bounds.minY + PADDING * 2));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(logicalWidth * RESOLUTION));
  canvas.height = Math.max(1, Math.ceil(logicalHeight * RESOLUTION));

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.translate(-tree.bounds.minX + PADDING, -tree.bounds.minY + PADDING);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const segment of tree.segments) {
    ctx.beginPath();
    ctx.moveTo(segment.x1, segment.y1);
    ctx.lineTo(segment.x2, segment.y2);
    ctx.strokeStyle = segment.depth < 1 ? style.trunk : style.branch;
    ctx.lineWidth = segment.width;
    ctx.stroke();
  }

  const rng = createRng(`${seed}:leaves`);

  for (const leaf of tree.leaves) {
    for (let cluster = 0; cluster < style.clusters; cluster += 1) {
      const angle = rng.float(0, Math.PI * 2);
      const distance = leaf.size * rng.float(0.05, 0.85);
      const x = leaf.x + Math.cos(angle) * distance;
      const y = leaf.y + Math.sin(angle) * distance;
      const radius = Math.max(1, leaf.size * style.leafScale * rng.float(0.65, 1.15));
      const color = style.leaves[rng.int(0, style.leaves.length)];

      ctx.beginPath();
      ctx.ellipse(
        x,
        y,
        radius * style.leafAspectX,
        radius * style.leafAspectY,
        rng.float(-0.6, 0.6),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = color;
      ctx.fill();
    }

    if (rng.chance(0.45)) {
      ctx.beginPath();
      ctx.arc(leaf.x + rng.float(-1.5, 1.5), leaf.y + rng.float(-1.5, 1.5), Math.max(0.7, leaf.size * 0.28), 0, Math.PI * 2);
      ctx.fillStyle = style.highlight;
      ctx.fill();
    }
  }

  return {
    canvas,
    width: logicalWidth,
    height: logicalHeight,
    anchorX: -tree.bounds.minX + PADDING,
    anchorY: -tree.bounds.minY + PADDING,
    segments: tree.segments.length,
  };
}

export function createTreeSpriteFromStyle(
  styleValue,
  variantIndex,
  bootSeed,
  key = "custom",
) {
  const style = normalizeWoodStyle(styleValue);

  if (style.shape === "cactus") {
    return createCactusSprite(variantIndex);
  }
  if (style.shape === "mushroom") {
    return createMushroomSprite(style, variantIndex);
  }

  const seed = `${bootSeed}:tree:${key}:${variantIndex}`;
  const tree = generateTree({
    seed,
    iterations: style.iterations,
    angleDeg: style.angle,
    branchScale: style.branchScale,
    trunkLength: style.trunkLength,
  });

  return rasterizeTree(tree, style, seed);
}

export function createTreeSprite(woodOrIndex, variantIndex, bootSeed) {
  const wood =
    woodOrIndex && typeof woodOrIndex === "object"
      ? woodOrIndex
      : BUILTIN_WOODS[
          Math.abs(Math.floor(Number(woodOrIndex) || 0)) % BUILTIN_WOODS.length
        ];
  const id = wood?.id ?? legacyWoodIdForSpecies(woodOrIndex);
  return createTreeSpriteFromStyle(wood?.style, variantIndex, bootSeed, id);
}

export function treeVariantCount() {
  return TREE_VARIANTS;
}
