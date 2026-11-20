import {
  ITEM_KEYS,
  MAX_STACK,
  RESOURCE_KEYS,
  TOOL_KEYS,
  UPGRADE_KEYS,
} from "../js/game/inventory.js";

const MAX_AMOUNT = MAX_STACK * 9999;
const MAX_DIAMONDS = 1000000;
const MAX_SLOTS = 50;

function safeAmount(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(MAX_AMOUNT, Math.max(0, Math.floor(number)))
    : 0;
}

function safeSmallInt(value, max = MAX_DIAMONDS) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(max, Math.max(0, Math.floor(number)))
    : 0;
}

export function sanitizeGrants(value) {
  const source = value && typeof value === "object" ? value : {};
  const grants = {};

  if (source.resources && typeof source.resources === "object") {
    const resources = {};
    for (const key of RESOURCE_KEYS) {
      const amount = safeAmount(source.resources[key]);
      if (amount > 0) {
        resources[key] = amount;
      }
    }
    if (Object.keys(resources).length > 0) {
      grants.resources = resources;
    }
  }

  if (source.items && typeof source.items === "object") {
    const items = {};
    for (const key of ITEM_KEYS) {
      const amount = safeAmount(source.items[key]);
      if (amount > 0) {
        items[key] = amount;
      }
    }
    if (Object.keys(items).length > 0) {
      grants.items = items;
    }
  }

  const upgrades = Array.isArray(source.upgrades)
    ? [...new Set(source.upgrades.filter((key) => UPGRADE_KEYS.includes(key)))]
    : [];
  if (upgrades.length > 0) {
    grants.upgrades = upgrades;
  }

  const tools = Array.isArray(source.tools)
    ? [...new Set(source.tools.filter((key) => TOOL_KEYS.includes(key)))]
    : [];
  if (tools.length > 0) {
    grants.tools = tools;
  }

  const entitlements = Array.isArray(source.entitlements)
    ? [
        ...new Set(
          source.entitlements
            .filter((key) => typeof key === "string")
            .map((key) => key.slice(0, 64)),
        ),
      ].slice(0, 20)
    : [];
  if (entitlements.length > 0) {
    grants.entitlements = entitlements;
  }

  const energy = safeSmallInt(source.energy, 100);
  if (energy > 0) {
    grants.energy = energy;
  }

  const diamonds = safeSmallInt(source.diamonds);
  if (diamonds > 0) {
    grants.diamonds = diamonds;
  }

  const worldSlots = safeSmallInt(source.worldSlots, MAX_SLOTS);
  if (worldSlots > 0) {
    grants.worldSlots = worldSlots;
  }

  return grants;
}

export function grantsAreEmpty(grants) {
  return !grants || Object.keys(grants).length === 0;
}

export function mergeGrants(first, second) {
  const a = sanitizeGrants(first);
  const b = sanitizeGrants(second);
  const merged = {
    resources: { ...(a.resources ?? {}) },
    items: { ...(a.items ?? {}) },
    upgrades: [...new Set([...(a.upgrades ?? []), ...(b.upgrades ?? [])])],
    tools: [...new Set([...(a.tools ?? []), ...(b.tools ?? [])])],
    entitlements: [
      ...new Set([...(a.entitlements ?? []), ...(b.entitlements ?? [])]),
    ],
    energy: (a.energy ?? 0) + (b.energy ?? 0),
    diamonds: (a.diamonds ?? 0) + (b.diamonds ?? 0),
    worldSlots: (a.worldSlots ?? 0) + (b.worldSlots ?? 0),
  };

  for (const [key, amount] of Object.entries(b.resources ?? {})) {
    merged.resources[key] = (merged.resources[key] ?? 0) + amount;
  }
  for (const [key, amount] of Object.entries(b.items ?? {})) {
    merged.items[key] = (merged.items[key] ?? 0) + amount;
  }

  return sanitizeGrants(merged);
}

export function applyGrantsToInventory(inventory, grants) {
  const clean = sanitizeGrants(grants);
  const result =
    inventory && typeof inventory === "object" ? { ...inventory } : {};
  const resources =
    result.resources && typeof result.resources === "object"
      ? { ...result.resources }
      : {};
  const items =
    result.items && typeof result.items === "object" ? { ...result.items } : {};
  const upgrades = Array.isArray(result.upgrades) ? [...result.upgrades] : [];
  const tools = Array.isArray(result.tools) ? [...result.tools] : [];

  for (const [key, amount] of Object.entries(clean.resources ?? {})) {
    resources[key] = Math.min(MAX_AMOUNT, safeAmount(resources[key]) + amount);
  }
  for (const [key, amount] of Object.entries(clean.items ?? {})) {
    items[key] = Math.min(MAX_AMOUNT, safeAmount(items[key]) + amount);
  }
  for (const upgrade of clean.upgrades ?? []) {
    if (!upgrades.includes(upgrade)) {
      upgrades.push(upgrade);
    }
  }
  for (const tool of clean.tools ?? []) {
    if (!tools.includes(tool)) {
      tools.push(tool);
    }
  }

  return {
    ...result,
    resources,
    items,
    upgrades,
    tools,
  };
}

export function applyGrantsToSave(payload, grants) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }
  const clean = sanitizeGrants(grants);
  const next = {
    ...payload,
    inventory: applyGrantsToInventory(payload.inventory, clean),
  };

  if (clean.energy > 0) {
    const player =
      next.player && typeof next.player === "object" ? { ...next.player } : {};
    const current = Number.isFinite(player.energy) ? player.energy : 100;
    player.energy = Math.min(100, Math.max(0, current + clean.energy));
    next.player = player;
  }

  const abilities = clean.entitlements ?? [];
  if (abilities.length > 0) {
    const current = Array.isArray(next.entitlements) ? next.entitlements : [];
    next.entitlements = [...new Set([...current, ...abilities])];
  }

  return next;
}

export function describeGrants(grants) {
  const clean = sanitizeGrants(grants);
  const labels = [];
  const icons = { C: "carbón", Fe: "hierro", oro: "oro", esencia: "Esencias" };

  for (const [key, amount] of Object.entries(clean.resources ?? {})) {
    labels.push(`${amount} ${icons[key] ?? key}`);
  }
  for (const [key, amount] of Object.entries(clean.items ?? {})) {
    labels.push(`${amount} ${key}`);
  }
  if (clean.energy > 0) {
    labels.push(`+${clean.energy} energía`);
  }
  if (clean.diamonds > 0) {
    labels.push(`+${clean.diamonds} diamantes`);
  }
  if (clean.worldSlots > 0) {
    labels.push(
      `+${clean.worldSlots} slot${clean.worldSlots === 1 ? "" : "s"} de mundo`,
    );
  }
  for (const upgrade of clean.upgrades ?? []) {
    labels.push(upgrade);
  }
  for (const tool of clean.tools ?? []) {
    labels.push(`herramienta ${tool}`);
  }
  return labels;
}
