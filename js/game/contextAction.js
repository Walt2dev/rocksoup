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
  "wolfTotem",
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

const SEED_ITEMS = new Set([
  "semillaHierba",
  "semillaArbol",
  "semillaTrigo",
  "semillaMaiz",
]);

export function isPlaceableItem(key) {
  return PLACEABLE_ITEMS.has(key);
}

export function isConsumableItem(key) {
  return CONSUMABLE_ITEMS.has(key);
}

export function isSeedItem(key) {
  return SEED_ITEMS.has(key);
}

export function resolveContextAction({
  entry = null,
  placing = false,
  mounted = false,
  nearDonkey = false,
  fishing = null,
  birdWatch = null,
} = {}) {
  if (birdWatch) {
    return birdWatch.phase === "aiming"
      ? { id: "bird", label: "Enfocar", icon: "use" }
      : { id: "bird", label: "Cerrar", icon: "use" };
  }

  if (fishing) {
    return fishing.phase === "bite"
      ? { id: "fish", label: "\u00A1Pescar!", icon: "fish" }
      : { id: "fish", label: "Recoger", icon: "fish" };
  }

  if (mounted) {
    return { id: "dismount", label: "Bajar", icon: "jump" };
  }

  if (nearDonkey) {
    return { id: "mount", label: "Burro", icon: "jump" };
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

  if (entry?.kind === "resource" && SEED_ITEMS.has(entry.key)) {
    return { id: "plant", label: "Sembrar", icon: "place" };
  }

  if (entry?.kind === "tool") {
    if (entry.key === "hoe") {
      return { id: "till", label: "Labrar", icon: "place" };
    }
    if (WEAPON_TOOLS.has(entry.key)) {
      return { id: "attack", label: "Atacar", icon: "sword" };
    }
    if (entry.key === "fishingRod") {
      return { id: "use", label: "Pescar", icon: "fish" };
    }
    if (entry.key === "binoculars") {
      return { id: "observe", label: "Observar", icon: "use" };
    }
  }

  return { id: "attack", label: "Atacar", icon: "sword" };
}

