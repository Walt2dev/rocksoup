import { BIOME } from "./biomes.js";
import { createRng } from "../core/rng.js";

const CELLS = 64;
const CELL_SIZE = 6;
const TILE_SIZE = CELLS * CELL_SIZE;
const DIRS = [
  { dx: 0, dy: -1, opposite: "s" },
  { dx: 1, dy: 0, opposite: "w" },
  { dx: 0, dy: 1, opposite: "n" },
  { dx: -1, dy: 0, opposite: "e" },
];

function cellIndex(cx, cy) {
  return cy * CELLS + cx;
}

function tileIndex(x, y) {
  return y * TILE_SIZE + x;
}

function carveRect(mask, x0, y0, x1, y1) {
  const minX = Math.max(0, Math.min(x0, x1));
  const maxX = Math.min(TILE_SIZE - 1, Math.max(x0, x1));
  const minY = Math.max(0, Math.min(y0, y1));
  const maxY = Math.min(TILE_SIZE - 1, Math.max(y0, y1));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      mask[tileIndex(x, y)] = 1;
    }
  }
}

function centerOf(cx, cy) {
  const offset = Math.floor(CELL_SIZE / 2);
  return {
    x: cx * CELL_SIZE + offset,
    y: cy * CELL_SIZE + offset,
  };
}

export function createCaveLayout(seed) {
  const rng = createRng(`${seed}:cave-layout`);
  const open = new Uint8Array(TILE_SIZE * TILE_SIZE);
  const room = new Uint8Array(TILE_SIZE * TILE_SIZE);
  const visited = new Uint8Array(CELLS * CELLS);
  const connections = new Map();
  const startX = Math.floor(CELLS / 2);
  const startY = Math.floor(CELLS / 2);
  const stack = [{ x: startX, y: startY }];
  visited[cellIndex(startX, startY)] = 1;
  connections.set(cellIndex(startX, startY), new Set());

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const candidates = [];
    for (const dir of DIRS) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      if (nx < 0 || ny < 0 || nx >= CELLS || ny >= CELLS) {
        continue;
      }
      if (visited[cellIndex(nx, ny)]) {
        continue;
      }
      candidates.push({ x: nx, y: ny, dir });
    }
    if (candidates.length === 0) {
      stack.pop();
      continue;
    }
    const next = candidates[rng.int(0, candidates.length)];
    visited[cellIndex(next.x, next.y)] = 1;
    const currentKey = cellIndex(current.x, current.y);
    const nextKey = cellIndex(next.x, next.y);
    if (!connections.has(currentKey)) connections.set(currentKey, new Set());
    if (!connections.has(nextKey)) connections.set(nextKey, new Set());
    connections.get(currentKey).add(next.dir);
    connections
      .get(nextKey)
      .add(DIRS.find((dir) => dir.dx === -next.dir.dx && dir.dy === -next.dir.dy));
    stack.push({ x: next.x, y: next.y });
  }

  for (let cy = 0; cy < CELLS; cy += 1) {
    for (let cx = 0; cx < CELLS; cx += 1) {
      const center = centerOf(cx, cy);
      const isStart = cx === startX && cy === startY;
      const half = isStart ? 3 : 1;
      carveRect(
        open,
        center.x - half,
        center.y - half,
        center.x + half,
        center.y + half,
      );
      carveRect(
        room,
        center.x - half,
        center.y - half,
        center.x + half,
        center.y + half,
      );
    }
  }

  for (let cy = 0; cy < CELLS; cy += 1) {
    for (let cx = 0; cx < CELLS; cx += 1) {
      const set = connections.get(cellIndex(cx, cy));
      if (!set) {
        continue;
      }
      const center = centerOf(cx, cy);
      for (const dir of set) {
        if (dir.dx === 1) {
          const next = centerOf(cx + 1, cy);
          carveRect(open, center.x, center.y - 1, next.x, center.y + 1);
        } else if (dir.dy === 1) {
          const next = centerOf(cx, cy + 1);
          carveRect(open, center.x - 1, center.y, center.x + 1, next.y);
        }
      }
    }
  }

  const extraRooms = 14;
  for (let index = 0; index < extraRooms; index += 1) {
    const cx = rng.int(1, CELLS - 1);
    const cy = rng.int(1, CELLS - 1);
    const center = centerOf(cx, cy);
    const half = rng.int(2, 4);
    carveRect(
      open,
      center.x - half,
      center.y - half,
      center.x + half,
      center.y + half,
    );
    carveRect(
      room,
      center.x - half,
      center.y - half,
      center.x + half,
      center.y + half,
    );
  }

  const entryCenter = centerOf(startX, startY);
  const entry = {
    x: entryCenter.x + 2.5,
    y: entryCenter.y + 2.5,
  };
  const exit = {
    x: entryCenter.x + 0.5,
    y: entryCenter.y + 0.5,
  };

  return {
    kind: "underground",
    tileSize: TILE_SIZE,
    cellSize: CELL_SIZE,
    cells: CELLS,
    entry,
    exit,
    isOpen(x, y) {
      const tileX = Math.floor(x);
      const tileY = Math.floor(y);
      if (tileX < 0 || tileY < 0 || tileX >= TILE_SIZE || tileY >= TILE_SIZE) {
        return false;
      }
      return open[tileIndex(tileX, tileY)] === 1;
    },
    isRoom(x, y) {
      const tileX = Math.floor(x);
      const tileY = Math.floor(y);
      if (tileX < 0 || tileY < 0 || tileX >= TILE_SIZE || tileY >= TILE_SIZE) {
        return false;
      }
      return room[tileIndex(tileX, tileY)] === 1;
    },
    sample(x, y) {
      const tileX = Math.floor(x);
      const tileY = Math.floor(y);
      const isOpenTile =
        tileX >= 0 &&
        tileY >= 0 &&
        tileX < TILE_SIZE &&
        tileY < TILE_SIZE &&
        open[tileIndex(tileX, tileY)] === 1;
      return {
        elevation: 0,
        moisture: isOpenTile ? 0.6 : 0.2,
        temperature: 0.15,
        biome: isOpenTile ? BIOME.CAVE_FLOOR : BIOME.CAVE_WALL,
      };
    },
  };
}
