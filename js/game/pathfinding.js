const SQRT2 = Math.SQRT2;
const DIRECTIONS = Object.freeze([
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, SQRT2],
  [1, -1, SQRT2],
  [-1, 1, SQRT2],
  [-1, -1, SQRT2],
]);

class MinHeap {
  constructor() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  push(item) {
    this.items.push(item);
    let index = this.items.length - 1;

    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.items[parent].f <= this.items[index].f) {
        break;
      }
      const swap = this.items[parent];
      this.items[parent] = this.items[index];
      this.items[index] = swap;
      index = parent;
    }
  }

  pop() {
    const first = this.items[0];
    const last = this.items.pop();

    if (this.items.length > 0) {
      this.items[0] = last;
      let index = 0;

      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;

        if (left < this.items.length && this.items[left].f < this.items[smallest].f) {
          smallest = left;
        }
        if (right < this.items.length && this.items[right].f < this.items[smallest].f) {
          smallest = right;
        }
        if (smallest === index) {
          break;
        }

        const swap = this.items[index];
        this.items[index] = this.items[smallest];
        this.items[smallest] = swap;
        index = smallest;
      }
    }

    return first;
  }
}

function key(x, y) {
  return `${x},${y}`;
}

function heuristic(ax, ay, bx, by) {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return dx + dy + (SQRT2 - 2) * Math.min(dx, dy);
}

function reconstruct(nodes, startKey, goalKey) {
  const path = [];
  let currentKey = goalKey;

  while (currentKey !== startKey) {
    const node = nodes.get(currentKey);
    if (!node) {
      return null;
    }
    path.push({ x: node.x, y: node.y });
    currentKey = node.parent;
  }

  return path.reverse();
}

export function findPath({
  startX,
  startY,
  goalX,
  goalY,
  isWalkable,
  getHeight = null,
  maxStepHeight = Infinity,
  maxDropHeight = maxStepHeight,
  maxNodes = 4096,
}) {
  if (
    !Number.isInteger(startX) ||
    !Number.isInteger(startY) ||
    !Number.isInteger(goalX) ||
    !Number.isInteger(goalY)
  ) {
    throw new TypeError("findPath requiere coordenadas enteras");
  }
  if (typeof isWalkable !== "function") {
    throw new TypeError("findPath requiere isWalkable");
  }
  if (!isWalkable(goalX, goalY)) {
    return null;
  }
  if (startX === goalX && startY === goalY) {
    return [];
  }

  const startKey = key(startX, startY);
  const goalKey = key(goalX, goalY);
  const nodes = new Map();
  const closed = new Set();
  const open = new MinHeap();

  nodes.set(startKey, {
    x: startX,
    y: startY,
    g: 0,
    f: heuristic(startX, startY, goalX, goalY),
    parent: null,
  });
  open.push({ key: startKey, x: startX, y: startY, f: nodes.get(startKey).f });

  let expanded = 0;

  while (open.size > 0) {
    const current = open.pop();

    if (closed.has(current.key)) {
      continue;
    }

    closed.add(current.key);
    expanded += 1;

    if (current.key === goalKey) {
      return reconstruct(nodes, startKey, goalKey);
    }

    if (expanded >= maxNodes) {
      return null;
    }

    const currentNode = nodes.get(current.key);

    for (const [dx, dy, cost] of DIRECTIONS) {
      const nextX = currentNode.x + dx;
      const nextY = currentNode.y + dy;

      if (!isWalkable(nextX, nextY)) {
        continue;
      }

      if (getHeight) {
        const difference =
          getHeight(nextX, nextY) - getHeight(currentNode.x, currentNode.y);
        if (difference > maxStepHeight || -difference > maxDropHeight) {
          continue;
        }
      }

      if (dx !== 0 && dy !== 0) {
        if (!isWalkable(currentNode.x + dx, currentNode.y) || !isWalkable(currentNode.x, currentNode.y + dy)) {
          continue;
        }
      }

      const nextKey = key(nextX, nextY);
      if (closed.has(nextKey)) {
        continue;
      }

      const nextG = currentNode.g + cost;
      const existing = nodes.get(nextKey);

      if (existing && nextG >= existing.g) {
        continue;
      }

      const nextF = nextG + heuristic(nextX, nextY, goalX, goalY);

      if (existing) {
        existing.g = nextG;
        existing.f = nextF;
        existing.parent = current.key;
      } else {
        nodes.set(nextKey, {
          x: nextX,
          y: nextY,
          g: nextG,
          f: nextF,
          parent: current.key,
        });
      }

      open.push({ key: nextKey, x: nextX, y: nextY, f: nextF });
    }
  }

  return null;
}

export function pathToCenters(path) {
  return path.map((tile) => ({ x: tile.x + 0.5, y: tile.y + 0.5 }));
}

export function adjacentTiles(x, y) {
  return DIRECTIONS.map(([dx, dy]) => ({ x: x + dx, y: y + dy }));
}
