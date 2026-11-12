export function distanceBetween(from, to) {
  if (!from || !to) {
    return 0;
  }
  return Math.hypot(to.x - from.x, to.y - from.y);
}

export function worldBearing(from, to) {
  if (!from || !to) {
    return 0;
  }
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function screenAngleBetween(fromPoint, toPoint) {
  if (!fromPoint || !toPoint) {
    return 0;
  }
  return Math.atan2(toPoint.y - fromPoint.y, toPoint.x - fromPoint.x);
}

export function bearingLabel(angle) {
  const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const index = Math.round(normalized / (Math.PI / 4)) % 8;
  return ["E", "SE", "S", "SO", "O", "NO", "N", "NE"][index];
}

export function normalizeWaypoint(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    return null;
  }
  return {
    x: Math.max(-10000000, Math.min(10000000, value.x)),
    y: Math.max(-10000000, Math.min(10000000, value.y)),
    label:
      typeof value.label === "string" && value.label.length > 0
        ? value.label.slice(0, 60)
        : "Destino",
  };
}

export function compassState({ player, target, camera } = {}) {
  if (!player || !target) {
    return { hasTarget: false, angle: 0, distance: 0, label: "" };
  }

  const distance = distanceBetween(player, target);
  let angle = worldBearing(player, target);

  if (camera?.project) {
    const from = camera.project(player.x, player.y, 0);
    const to = camera.project(target.x, target.y, 0);
    angle = screenAngleBetween(from, to);
  }

  return {
    hasTarget: true,
    angle,
    distance,
    label: target.label ?? "Destino",
  };
}
