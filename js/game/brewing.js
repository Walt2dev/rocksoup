import { ITEM_INFO, RESOURCE_INFO } from "./inventory.js";
import { POTION_DATA } from "./potions.js";

export const STATION_TYPES = Object.freeze({
  OVEN: "oven",
  BREWING_TABLE: "brewingTable",
  CAULDRON: "cauldron",
});

export const STATION_RECIPES = Object.freeze([
  Object.freeze({
    id: "roastedBerries",
    station: STATION_TYPES.OVEN,
    name: "Bayas tostadas",
    description: "Tuesta 3 bayas con 1 carbón para preparar la base del café.",
    costs: Object.freeze({
      resources: Object.freeze({ bayas: 3, C: 1 }),
      items: Object.freeze({}),
    }),
    outputs: Object.freeze([Object.freeze({ item: "roastedBerries", amount: 1 })]),
    action: "Tostar",
  }),
  Object.freeze({
    id: "pescadoFrito",
    station: STATION_TYPES.OVEN,
    name: "Pescado frito",
    description: "Cocina un pescado con carbón. Restaura 35 de salud al comerlo con E.",
    costs: Object.freeze({
      resources: Object.freeze({ C: 1 }),
      items: Object.freeze({ pescado: 1 }),
    }),
    outputs: Object.freeze([Object.freeze({ item: "pescadoFrito", amount: 1 })]),
    action: "Cocinar",
  }),
  Object.freeze({
    id: "pan",
    station: STATION_TYPES.OVEN,
    name: "Pan de trigo",
    description: "Hornea trigo con carbón. Restaura 40 de salud al comerlo con E.",
    costs: Object.freeze({
      resources: Object.freeze({ trigo: 2, C: 1 }),
      items: Object.freeze({}),
    }),
    outputs: Object.freeze([Object.freeze({ item: "pan", amount: 1 })]),
    action: "Hornear",
  }),
  Object.freeze({
    id: "coffee",
    station: STATION_TYPES.BREWING_TABLE,
    name: "Café",
    description: "Bebida caliente: +50% de velocidad durante 30 segundos.",
    costs: Object.freeze({
      resources: Object.freeze({ agua: 1 }),
      items: Object.freeze({ roastedBerries: 1, bowl: 1 }),
    }),
    outputs: Object.freeze([Object.freeze({ item: "coffee", amount: 1 })]),
    action: "Preparar",
  }),
  Object.freeze({
    id: "swimPotion",
    station: STATION_TYPES.BREWING_TABLE,
    name: "Poción de nado",
    description: "Permite cruzar agua durante 90 segundos a velocidad reducida.",
    costs: Object.freeze({
      resources: Object.freeze({ agua: 1, Si: 1 }),
      items: Object.freeze({ pescado: 2 }),
    }),
    outputs: Object.freeze([Object.freeze({ item: "swimPotion", amount: 1 })]),
    action: "Preparar",
  }),
  Object.freeze({
    id: "lunarWater",
    station: STATION_TYPES.BREWING_TABLE,
    name: "Agua lunar",
    description: "Solo puede prepararse en luna llena. Usa agua y cuarzo.",
    costs: Object.freeze({
      resources: Object.freeze({ agua: 2, cuarzo: 1 }),
      items: Object.freeze({}),
    }),
    outputs: Object.freeze([Object.freeze({ item: "lunarWater", amount: 1 })]),
    moonPhases: Object.freeze(["full"]),
    action: "Preparar",
  }),
  Object.freeze({
    id: "starDust",
    station: STATION_TYPES.BREWING_TABLE,
    name: "Polvo estelar",
    description: "Solo puede prepararse en luna nueva. Usa amatista y carbón.",
    costs: Object.freeze({
      resources: Object.freeze({ amatista: 1, C: 1 }),
      items: Object.freeze({}),
    }),
    outputs: Object.freeze([Object.freeze({ item: "starDust", amount: 1 })]),
    moonPhases: Object.freeze(["new"]),
    action: "Preparar",
  }),
  Object.freeze({
    id: "moonBrew",
    station: STATION_TYPES.CAULDRON,
    name: "Brebaje de constelación",
    description:
      "La misma receta cambia con la luna: en luna llena cura, en luna nueva envenena. Requiere un apunte de observación.",
    costs: Object.freeze({
      resources: Object.freeze({ agua: 1, bayas: 2, cuarzo: 1 }),
      items: Object.freeze({}),
    }),
    outputs: Object.freeze([
      Object.freeze({ item: "moonHealingPotion", amount: 1 }),
    ]),
    moonVariants: Object.freeze({
      full: "moonHealingPotion",
      new: "moonPoisonPotion",
    }),
    requiresObservation: true,
    action: "Preparar",
  }),
  ...POTION_DATA.map((potion) =>
    Object.freeze({
      id: potion.id,
      station: STATION_TYPES.CAULDRON,
      name: potion.name,
      description: potion.description,
      costs: Object.freeze({
        resources: potion.costs,
        items: Object.freeze({}),
      }),
      outputs: Object.freeze([
        Object.freeze({ item: potion.id, amount: 1 }),
      ]),
      action: "Preparar",
    }),
  ),
]);

const RECIPES_BY_ID = new Map(STATION_RECIPES.map((recipe) => [recipe.id, recipe]));

export function stationRecipeById(id) {
  return RECIPES_BY_ID.get(id) ?? null;
}

export function stationRecipes(station) {
  return STATION_RECIPES.filter((recipe) => recipe.station === station);
}

export function stationRecipeState(recipe, inventory, context = {}) {
  const missingResources = Object.entries(recipe.costs.resources)
    .filter(([key, amount]) => inventory.count(key) < amount)
    .map(([key]) => key);
  const missingItems = Object.entries(recipe.costs.items)
    .filter(([key, amount]) => inventory.itemCount(key) < amount)
    .map(([key]) => key);
  const moonLocked = Boolean(
    (recipe.moonPhases &&
      !recipe.moonPhases.includes(context.moonPhase)) ||
      (recipe.moonVariants && !recipe.moonVariants[context.moonPhase]),
  );
  const needsObservation = Boolean(
    recipe.requiresObservation &&
      !(Array.isArray(context.observationIds) && context.observationIds.length > 0),
  );

  return {
    canCraft:
      missingResources.length === 0 &&
      missingItems.length === 0 &&
      !moonLocked &&
      !needsObservation,
    missingResources,
    missingItems,
    moonLocked,
    needsObservation,
  };
}

export function craftStationRecipe(recipeOrId, inventory, context = {}) {
  const recipe =
    typeof recipeOrId === "string" ? stationRecipeById(recipeOrId) : recipeOrId;

  if (!recipe) {
    return { ok: false, reason: "unknown" };
  }

  const state = stationRecipeState(recipe, inventory, context);
  if (state.moonLocked) {
    return { ok: false, reason: "moon", recipe };
  }
  if (state.needsObservation) {
    return { ok: false, reason: "observation", recipe };
  }
  if (!state.canCraft) {
    return { ok: false, reason: "resources", recipe };
  }

  for (const [key, amount] of Object.entries(recipe.costs.resources)) {
    if (inventory.remove(key, amount) !== amount) {
      return { ok: false, reason: "resources", recipe };
    }
  }

  for (const [key, amount] of Object.entries(recipe.costs.items)) {
    if (inventory.removeItem(key, amount) !== amount) {
      return { ok: false, reason: "resources", recipe };
    }
  }

  const outputs = recipe.moonVariants?.[context.moonPhase]
    ? [{ item: recipe.moonVariants[context.moonPhase], amount: 1 }]
    : recipe.outputs;

  for (const output of outputs) {
    inventory.addItem(output.item, output.amount);
  }

  return { ok: true, recipe, outputs };
}

export function costLabel(key) {
  return RESOURCE_INFO[key]?.label ?? ITEM_INFO[key]?.label ?? key;
}
