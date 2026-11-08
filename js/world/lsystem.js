import { createRng } from "../core/rng.js";

export const TREE_RULES = Object.freeze({
  X: "F[+X][-X]FX",
  F: "FF",
});

export function expandLSystem(axiom, rules, iterations) {
  let sentence = axiom;

  for (let step = 0; step < iterations; step += 1) {
    let next = "";
    for (const symbol of sentence) {
      next += rules[symbol] ?? symbol;
    }
    sentence = next;
  }

  return sentence;
}

export function generateTree({
  seed,
  iterations = 3,
  angleDeg = 25,
  branchScale = 0.72,
  trunkLength = 7.5,
  rules = TREE_RULES,
} = {}) {
  const rng = createRng(seed);
  const angle = ((angleDeg + rng.float(-2.5, 2.5)) * Math.PI) / 180;
  const shrink = branchScale + rng.float(-0.035, 0.035);
  const startingLength = trunkLength * rng.float(0.9, 1.12);
  const sentence = expandLSystem("X", rules, iterations);

  let x = 0;
  let y = 0;
  let direction = -Math.PI / 2;
  let length = startingLength;
  let depth = 0;
  const stack = [];
  const segments = [];
  const leaves = [];

  for (const symbol of sentence) {
    if (symbol === "F") {
      const nextX = x + Math.cos(direction) * length;
      const nextY = y + Math.sin(direction) * length;
      segments.push({
        x1: x,
        y1: y,
        x2: nextX,
        y2: nextY,
        width: Math.max(0.7, length * 0.26),
        depth,
      });
      x = nextX;
      y = nextY;
    } else if (symbol === "+") {
      direction += angle;
    } else if (symbol === "-") {
      direction -= angle;
    } else if (symbol === "[") {
      stack.push({ x, y, direction, length, depth });
      length *= shrink;
      depth += 1;
    } else if (symbol === "]") {
      const state = stack.pop();
      if (state) {
        x = state.x;
        y = state.y;
        direction = state.direction;
        length = state.length;
        depth = state.depth;
      }
    } else if (symbol === "X") {
      leaves.push({
        x,
        y,
        size: Math.max(1.4, length * 0.62),
      });
    }
  }

  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;

  for (const segment of segments) {
    minX = Math.min(minX, segment.x1, segment.x2);
    maxX = Math.max(maxX, segment.x1, segment.x2);
    minY = Math.min(minY, segment.y1, segment.y2);
    maxY = Math.max(maxY, segment.y1, segment.y2);
  }

  for (const leaf of leaves) {
    minX = Math.min(minX, leaf.x - leaf.size);
    maxX = Math.max(maxX, leaf.x + leaf.size);
    minY = Math.min(minY, leaf.y - leaf.size);
    maxY = Math.max(maxY, leaf.y + leaf.size);
  }

  return {
    segments,
    leaves,
    bounds: { minX, maxX, minY, maxY },
    angle,
    baseLength: startingLength,
    symbolCount: sentence.length,
  };
}
