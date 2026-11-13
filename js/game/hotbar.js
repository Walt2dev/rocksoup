export const HOTBAR_SLOT_COUNT = 9;

export function normalizeHotbarSlots(value, count = HOTBAR_SLOT_COUNT) {
  const slots = new Array(count).fill(null);

  if (!Array.isArray(value)) {
    return slots;
  }

  for (let index = 0; index < count; index += 1) {
    const slot = value[index];
    if (
      slot &&
      typeof slot.kind === "string" &&
      typeof slot.key === "string"
    ) {
      slots[index] = { kind: slot.kind, key: slot.key };
    }
  }

  return slots;
}

export function defaultHotbarSlots(entries, count = HOTBAR_SLOT_COUNT) {
  const slots = new Array(count).fill(null);
  const source = Array.isArray(entries) ? entries : [];
  const seen = new Set();
  let slotIndex = 0;

  for (const entry of source) {
    if (slotIndex >= count) {
      break;
    }
    if (!entry || seen.has(`${entry.kind}:${entry.key}`)) {
      continue;
    }
    seen.add(`${entry.kind}:${entry.key}`);
    slots[slotIndex] = { kind: entry.kind, key: entry.key };
    slotIndex += 1;
  }

  return slots;
}

export function assignHotbarSlot(
  slots,
  targetIndex,
  entry,
  { sourceIndex = null, count = HOTBAR_SLOT_COUNT } = {},
) {
  const next = normalizeHotbarSlots(slots, count);

  if (
    targetIndex < 0 ||
    targetIndex >= next.length
  ) {
    return next;
  }

  if (sourceIndex === null) {
    if (
      !entry ||
      typeof entry.kind !== "string" ||
      typeof entry.key !== "string"
    ) {
      return next;
    }
    for (let index = 0; index < next.length; index += 1) {
      if (
        index !== targetIndex &&
        next[index]?.kind === entry.kind &&
        next[index]?.key === entry.key
      ) {
        next[index] = null;
      }
    }
    next[targetIndex] = { kind: entry.kind, key: entry.key };
    return next;
  }

  if (
    sourceIndex < 0 ||
    sourceIndex >= next.length ||
    sourceIndex === targetIndex
  ) {
    return next;
  }

  const source = next[sourceIndex];
  next[sourceIndex] = next[targetIndex] ?? null;
  next[targetIndex] = source ?? null;
  return next;
}

export function clearHotbarSlot(slots, index, count = HOTBAR_SLOT_COUNT) {
  const next = normalizeHotbarSlots(slots, count);
  if (index >= 0 && index < next.length) {
    next[index] = null;
  }
  return next;
}

export function firstEmptyHotbarSlot(slots) {
  return slots.findIndex((slot) => slot === null);
}

export function hotbarEntryAt(slots, index, entries) {
  const slot = slots[index];
  if (!slot) {
    return null;
  }
  const source = Array.isArray(entries) ? entries : [];
  return (
    source.find(
      (entry) => entry.kind === slot.kind && entry.key === slot.key,
    ) ?? null
  );
}
