const MAX_EVENTS = 500;
const MAX_TEXT = 300;
const MAX_NAME = 64;
const MAX_TYPE = 40;
const MAX_ACTOR = 32;

function safeText(value, max = MAX_TEXT) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeInt(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

function sanitizeMeta(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const meta = {};
  for (const [key, raw] of Object.entries(value).slice(0, 12)) {
    if (typeof key !== "string" || key.length === 0 || key.length > 32) {
      continue;
    }
    if (typeof raw === "string") {
      meta[key] = raw.slice(0, 120);
    } else if (typeof raw === "number" && Number.isFinite(raw)) {
      meta[key] = raw;
    } else if (typeof raw === "boolean") {
      meta[key] = raw;
    }
  }
  return Object.keys(meta).length > 0 ? meta : null;
}

export function sanitizeLoreEvent(value, index = 0) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const type = safeText(value.type, MAX_TYPE);
  const text = safeText(value.text);
  if (!type || !text) {
    return null;
  }
  const event = {
    id: safeText(value.id, 80) || `evt-${safeInt(value.at, Date.now())}-${index}`,
    type,
    text,
    actor: safeText(value.actor, MAX_ACTOR) || null,
    at: safeInt(value.at, Date.now()),
    day: safeInt(value.day, 0),
  };
  const meta = sanitizeMeta(value.meta);
  if (meta) {
    event.meta = meta;
  }
  return event;
}

export function sanitizeLore(value, fallbackName = "Mundo sin nombre") {
  const lore = value && typeof value === "object" ? value : {};
  const chronicle = Array.isArray(lore.chronicle)
    ? lore.chronicle
        .map((event, index) => sanitizeLoreEvent(event, index))
        .filter(Boolean)
        .slice(-MAX_EVENTS)
    : [];

  return {
    version: 1,
    name:
      safeText(lore.name, MAX_NAME) ||
      safeText(fallbackName, MAX_NAME) ||
      "Mundo sin nombre",
    createdAt: safeInt(lore.createdAt, Date.now()),
    updatedAt: safeInt(lore.updatedAt, Date.now()),
    chronicle,
  };
}

export function createLore(name, { now = Date.now(), seed = null } = {}) {
  const lore = sanitizeLore(
    {
      name,
      createdAt: now,
      updatedAt: now,
      chronicle: [
        {
          id: `world-${now}`,
          type: "world.created",
          text: `Se fundó ${safeText(name, MAX_NAME) || "el mundo"}.`,
          at: now,
          meta: seed ? { seed: String(seed).slice(0, 64) } : null,
        },
      ],
    },
    name,
  );
  return lore;
}

export function appendLoreEvent(value, event, { now = Date.now() } = {}) {
  const lore = sanitizeLore(value);
  const entry = sanitizeLoreEvent(
    {
      ...event,
      at: safeInt(event?.at, now),
      id: event?.id || `evt-${now}-${lore.chronicle.length}`,
    },
    lore.chronicle.length,
  );
  if (!entry) {
    return lore;
  }
  lore.chronicle.push(entry);
  if (lore.chronicle.length > MAX_EVENTS) {
    lore.chronicle.splice(0, lore.chronicle.length - MAX_EVENTS);
  }
  lore.updatedAt = now;
  return lore;
}

export function loreSummary(value) {
  const lore = sanitizeLore(value);
  return {
    name: lore.name,
    createdAt: lore.createdAt,
    updatedAt: lore.updatedAt,
    events: lore.chronicle.length,
    latest: lore.chronicle.slice(-8),
  };
}
