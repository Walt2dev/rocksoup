import { BIOME } from "./biomes.js";
import { createRng } from "../core/rng.js";

const CELLS = 24;
const CELL_SIZE = 12;
const TILE_SIZE = CELLS * CELL_SIZE;

function tileIndex(x, y) {
  return y * TILE_SIZE + x;
}

function cellIndex(cx, cy) {
  return cy * CELLS + cx;
}

function markCircle(mask, x, y, radius) {
  const minX = Math.max(0, Math.floor(x - radius));
  const maxX = Math.min(TILE_SIZE - 1, Math.ceil(x + radius));
  const minY = Math.max(0, Math.floor(y - radius));
  const maxY = Math.min(TILE_SIZE - 1, Math.ceil(y + radius));
  for (let ty = minY; ty <= maxY; ty += 1) {
    for (let tx = minX; tx <= maxX; tx += 1) {
      if (Math.hypot(tx - x, ty - y) <= radius) {
        mask[tileIndex(tx, ty)] = 1;
      }
    }
  }
}

function setPathTile(mask, x, y) {
  if (x < 0 || y < 0 || x >= TILE_SIZE || y >= TILE_SIZE) {
    return;
  }
  mask[tileIndex(x, y)] = 1;
}

function markPath(mask, x0, y0, x1, y1) {
  const stepX = x0 <= x1 ? 1 : -1;
  for (let x = x0; x !== x1 + stepX; x += stepX) {
    setPathTile(mask, x, y0);
    setPathTile(mask, x, y0 + 1);
  }
  const stepY = y0 <= y1 ? 1 : -1;
  for (let y = y0; y !== y1 + stepY; y += stepY) {
    setPathTile(mask, x1, y);
    setPathTile(mask, x1 + 1, y);
  }
}

export function createSkyLayout(seed) {
  const rng = createRng(`${seed}:sky-layout`);
  const cloud = new Uint8Array(TILE_SIZE * TILE_SIZE);
  const path = new Uint8Array(TILE_SIZE * TILE_SIZE);
  const visited = new Uint8Array(CELLS * CELLS);
  const centers = [];
  const stack = [];

  const centerFor = (cx, cy) => ({
    x: Math.floor((cx + 0.5) * CELL_SIZE + rng.float(-2.5, 2.5)),
    y: Math.floor((cy + 0.5) * CELL_SIZE + rng.float(-2.5, 2.5)),
  });

  for (let cy = 0; cy < CELLS; cy += 1) {
    for (let cx = 0; cx < CELLS; cx += 1) {
      const center = centerFor(cx, cy);
      const index = cellIndex(cx, cy);
      centers[index] = center;
      const radius = rng.int(3, 6);
      markCircle(cloud, center.x, center.y, radius);
    }
  }

  const startX = Math.floor(CELLS / 2);
  const startY = Math.floor(CELLS / 2);
  const startIndex = cellIndex(startX, startY);
  visited[startIndex] = 1;
  stack.push({ x: startX, y: startY });

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const candidates = [];
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];
    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      if (nx < 0 || ny < 0 || nx >= CELLS || ny >= CELLS) {
        continue;
      }
      if (visited[cellIndex(nx, ny)]) {
        continue;
      }
      candidates.push({ x: nx, y: ny });
    }
    if (candidates.length === 0) {
      stack.pop();
      continue;
    }
    const next = candidates[rng.int(0, candidates.length)];
    const a = centers[cellIndex(current.x, current.y)];
    const b = centers[cellIndex(next.x, next.y)];
    markPath(path, a.x, a.y, b.x, b.y);
    visited[cellIndex(next.x, next.y)] = 1;
    stack.push({ x: next.x, y: next.y });
  }

  const start = centers[startIndex];
  const entry = { x: start.x + 2.5, y: start.y + 2.5 };
  const exit = { x: start.x + 0.5, y: start.y + 0.5 };

  return {
    kind: "sky",
    tileSize: TILE_SIZE,
    cellSize: CELL_SIZE,
    cells: CELLS,
    entry,
    exit,
    isCloud(x, y) {
      const tileX = Math.floor(x);
      const tileY = Math.floor(y);
      if (tileX < 0 || tileY < 0 || tileX >= TILE_SIZE || tileY >= TILE_SIZE) {
        return false;
      }
      return cloud[tileIndex(tileX, tileY)] === 1;
    },
    isPath(x, y) {
      const tileX = Math.floor(x);
      const tileY = Math.floor(y);
      if (tileX < 0 || tileY < 0 || tileX >= TILE_SIZE || tileY >= TILE_SIZE) {
        return false;
      }
      return path[tileIndex(tileX, tileY)] === 1;
    },
    sample(x, y) {
      const tileX = Math.floor(x);
      const tileY = Math.floor(y);
      const index =
        tileX >= 0 &&
        tileY >= 0 &&
        tileX < TILE_SIZE &&
        tileY < TILE_SIZE
          ? tileIndex(tileX, tileY)
          : -1;
      const onPath = index >= 0 && path[index] === 1;
      const onCloud = index >= 0 && cloud[index] === 1;
      return {
        elevation: 0,
        moisture: onCloud ? 0.5 : 0.1,
        temperature: 0.85,
        biome: onPath ? BIOME.GOLD_PATH : onCloud ? BIOME.CLOUD : BIOME.VOID,
      };
    },
  };
}
