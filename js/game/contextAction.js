const PLACEABLE_ITEMS = new Set([
  "campfire",
  "torch",
  "valla",
  "stoneWall",
  "stonePath",
  "chest",
  "tipi",
  "bed",
  "cauldron",
  "oven",
  "brewingTable",
]);

const CONSUMABLE_ITEMS = new Set([
  "coffee",
  "bandage",
  "roastedBerries",
  "pescadoFrito",
  "pan",
  "lunarWater",
  "starDust",
  "swimPotion",
  "healingPotion",
  "poisonPotion",
  "furyPotion",
  "resistancePotion",
  "unstablePotion",
  "moonHealingPotion",
  "moonPoisonPotion",
]);

const WEAPON_TOOLS = new Set(["spear", "sword", "bow"]);

export function isPlaceableItem(key) {
  return PLACEABLE_ITEMS.has(key);
}

export function isConsumableItem(key) {
  return CONSUMABLE_ITEMS.has(key);
}

export function resolveContextAction({
  entry = null,
  placing = false,
  mounted = false,
  fishing = null,
} = {}) {
  if (fishing) {
    return fishing.phase === "bite"
      ? { id: "fish", label: "\u00A1Pescar!", icon: "fish" }
      : { id: "fish", label: "Recoger", icon: "fish" };
  }

  if (mounted) {
    return { id: "dismount", label: "Bajar", icon: "jump" };
  }

  if (placing) {
    return { id: "place", label: "Colocar", icon: "place" };
  }

  if (entry?.kind === "item") {
    if (PLACEABLE_ITEMS.has(entry.key)) {
      return { id: "place", label: "Colocar", icon: "place" };
    }
    if (CONSUMABLE_ITEMS.has(entry.key)) {
      return { id: "use", label: "Usar", icon: "use" };
    }
  }

  if (entry?.kind === "tool") {
    if (WEAPON_TOOLS.has(entry.key)) {
      return { id: "attack", label: "Atacar", icon: "sword" };
    }
    if (entry.key === "fishingRod") {
      return { id: "use", label: "Pescar", icon: "fish" };
    }
  }

  return { id: "attack", label: "Atacar", icon: "sword" };
}
