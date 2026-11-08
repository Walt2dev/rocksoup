export const DEFAULT_ISO = Object.freeze({
  tileW: 64,
  tileH: 32,
  originX: 0,
  originY: 0,
});

function resolveOptions(options = {}) {
  const tileW = options.tileW ?? DEFAULT_ISO.tileW;
  const tileH = options.tileH ?? DEFAULT_ISO.tileH;
  const originX = options.originX ?? DEFAULT_ISO.originX;
  const originY = options.originY ?? DEFAULT_ISO.originY;

  if (!Number.isFinite(tileW) || tileW <= 0) {
    throw new RangeError("tileW debe ser un número positivo");
  }
  if (!Number.isFinite(tileH) || tileH <= 0) {
    throw new RangeError("tileH debe ser un número positivo");
  }

  return { tileW, tileH, originX, originY };
}

export function worldToScreen(x, y, z = 0, options = {}) {
  const { tileW, tileH, originX, originY } = resolveOptions(options);
  const halfW = tileW / 2;
  const halfH = tileH / 2;

  return {
    x: originX + (x - y) * halfW,
    y: originY + (x + y) * halfH - z * halfH,
  };
}

export function screenToWorld(screenX, screenY, options = {}) {
  const { tileW, tileH, originX, originY } = resolveOptions(options);
  const halfW = tileW / 2;
  const halfH = tileH / 2;

  const dx = (screenX - originX) / halfW;
  const dy = (screenY - originY) / halfH;

  return {
    x: (dx + dy) / 2,
    y: (dy - dx) / 2,
  };
}

export function screenToTile(screenX, screenY, options = {}) {
  const world = screenToWorld(screenX, screenY, options);
  return {
    x: Math.floor(world.x),
    y: Math.floor(world.y),
  };
}

export function depthOf(x, y, z = 0) {
  return x + y + z;
}

export function compareDepth(a, b) {
  return depthOf(a.x, a.y, a.z ?? 0) - depthOf(b.x, b.y, b.z ?? 0);
}
