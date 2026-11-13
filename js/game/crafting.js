export const CRAFT_CATEGORIES = Object.freeze([
  Object.freeze({ id: "all", label: "Todas" }),
  Object.freeze({ id: "tools", label: "Herramientas" }),
  Object.freeze({ id: "build", label: "Construcci\u00F3n" }),
  Object.freeze({ id: "items", label: "Objetos" }),
  Object.freeze({ id: "upgrades", label: "Mejoras" }),
]);

export const CRAFT_RECIPES = Object.freeze([
  Object.freeze({
    id: "axe",
    category: "tools",
    name: "Hacha de piedra",
    description: "Tala el doble de r\u00E1pido y obtiene +1 madera por \u00E1rbol.",
    costs: Object.freeze({ madera: 2, piedra: 3 }),
    type: "tool",
    tool: "axe",
  }),
  Object.freeze({
    id: "pickaxe",
    category: "tools",
    name: "Pico de piedra",
    description: "Mina el doble de r\u00E1pido y extrae el elemento qu\u00EDmico del mineral.",
    costs: Object.freeze({ madera: 3, piedra: 4 }),
    type: "tool",
    tool: "pickaxe",
  }),
  Object.freeze({
    id: "spear",
    category: "tools",
    name: "Lanza de piedra",
    description: "Arma de caza. Duplica el da\u00F1o contra las criaturas nocturnas.",
    costs: Object.freeze({ madera: 2, piedra: 3 }),
    type: "tool",
    tool: "spear",
  }),
  Object.freeze({
    id: "knife",
    category: "tools",
    name: "Cuchillo de piedra",
    description: "Recolecta bayas m\u00E1s r\u00E1pido y obtiene +1 baya por arbusto.",
    costs: Object.freeze({ madera: 1, piedra: 2 }),
    type: "tool",
    tool: "knife",
  }),
  Object.freeze({
    id: "fishingRod",
    category: "tools",
    name: "Caña de pescar",
    description: "Selecciónala en la barra y haz clic en agua cercana. Tapa en el momento justo para sacar un pez más gordo.",
    costs: Object.freeze({ madera: 3, fibra: 2 }),
    type: "tool",
    tool: "fishingRod",
  }),
  Object.freeze({
    id: "hoe",
    category: "tools",
    name: "Azada",
    description: "Selecciónala y haz clic en tierra para crear una parcela de cultivo.",
    costs: Object.freeze({ madera: 2, piedra: 2 }),
    type: "tool",
    tool: "hoe",
  }),
  Object.freeze({
    id: "sword",
    category: "tools",
    name: "Espada de piedra",
    description: "Arma cuerpo a cuerpo equilibrada. Más rápida que la lanza y con buen daño.",
    costs: Object.freeze({ madera: 3, piedra: 4, Cu: 1 }),
    type: "tool",
    tool: "sword",
  }),
  Object.freeze({
    id: "bow",
    category: "tools",
    name: "Arco de madera",
    description: "Arma a distancia. Selecciónalo y pulsa Atacar para disparar la flecha más cercana.",
    costs: Object.freeze({ madera: 4, fibra: 3, telarana: 1 }),
    type: "tool",
    tool: "bow",
  }),
  Object.freeze({
    id: "binoculars",
    category: "tools",
    name: "Prismáticos",
    description: "Selecciónalos y haz clic en un ave cercana para iniciar la observación y completar el cuaderno.",
    costs: Object.freeze({ Cu: 1, cuarzo: 2, fibra: 2 }),
    type: "tool",
    tool: "binoculars",
  }),
  Object.freeze({
    id: "mortero",
    category: "tools",
    name: "Mortero de piedra",
    description: "Permite moler huesos de pollo y convertirlos en polvo de hueso.",
    costs: Object.freeze({ piedra: 6, madera: 2 }),
    type: "tool",
    tool: "mortero",
  }),
  Object.freeze({
    id: "boneDust",
    category: "items",
    name: "Polvo de hueso",
    description: "Muele 2 huesos de pollo. Úsalo en un arbusto recogido para devolverle las bayas.",
    costs: Object.freeze({ huesoPollo: 2 }),
    type: "bundle",
    item: "polvoHueso",
    amount: 1,
    requiresTool: "mortero",
  }),
  Object.freeze({
    id: "arrows",
    category: "items",
    name: "Flechas",
    description: "1 madera + 1 piedra + 1 pluma se convierten en 5 flechas para el arco.",
    costs: Object.freeze({ madera: 1, piedra: 1, pluma: 1 }),
    type: "bundle",
    item: "arrow",
    amount: 5,
  }),
  Object.freeze({
    id: "campfire",
    category: "build",
    name: "Fogata",
    description: "Colocable. Regenera energ\u00EDa mucho m\u00E1s r\u00E1pido cerca de ella.",
    costs: Object.freeze({ madera: 6, piedra: 5 }),
    type: "placeable",
    item: "campfire",
  }),
  Object.freeze({
    id: "torch",
    category: "build",
    name: "Antorcha",
    description: "Colocable. Ilumina la noche y aleja a las criaturas nocturnas.",
    costs: Object.freeze({ madera: 2, C: 1 }),
    type: "placeable",
    item: "torch",
  }),
  Object.freeze({
    id: "valla",
    category: "build",
    name: "Valla de madera",
    description: "Colocable. Bloquea el paso de criaturas y protege tu refugio.",
    costs: Object.freeze({ madera: 2 }),
    type: "placeable",
    item: "valla",
  }),
  Object.freeze({
    id: "stoneWall",
    category: "build",
    name: "Muro de piedra",
    description: "Colocable. Muro resistente que bloquea el paso de criaturas.",
    costs: Object.freeze({ piedra: 4 }),
    type: "placeable",
    item: "stoneWall",
  }),
  Object.freeze({
    id: "stonePath",
    category: "build",
    name: "Camino de piedras",
    description: "Colocable decorativo y transitable. Convierte una piedra en una losa de sendero.",
    costs: Object.freeze({ piedra: 1 }),
    type: "placeable",
    item: "stonePath",
  }),
  Object.freeze({
    id: "tipi",
    category: "build",
    name: "Tipi de piel",
    description: "Colocable. Refugio seguro: las criaturas nocturnas no te da\u00F1an dentro.",
    costs: Object.freeze({ madera: 10, piel: 2, telarana: 3 }),
    type: "placeable",
    item: "tipi",
  }),
  Object.freeze({
    id: "bed",
    category: "build",
    name: "Cama de piel",
    description: "Colocable. Establece tu punto de reaparici\u00F3n y recupera salud al usarla.",
    costs: Object.freeze({ piel: 3, madera: 4 }),
    type: "placeable",
    item: "bed",
  }),
  Object.freeze({
    id: "chest",
    category: "build",
    name: "Cofre de madera",
    description: "Colocable. Guarda recursos y objetos para liberar espacio en tu mochila.",
    costs: Object.freeze({ madera: 10 }),
    type: "placeable",
    item: "chest",
  }),
  Object.freeze({
    id: "oven",
    category: "build",
    name: "Horno",
    description: "Colocable. Tuesta bayas usando carb\u00F3n.",
    costs: Object.freeze({ piedra: 8, madera: 3 }),
    type: "placeable",
    item: "oven",
  }),
  Object.freeze({
    id: "brewingTable",
    category: "build",
    name: "Mesa de brebajes",
    description: "Colocable. Prepara bebidas como el caf\u00E9.",
    costs: Object.freeze({ madera: 6, piedra: 3 }),
    type: "placeable",
    item: "brewingTable",
  }),
  Object.freeze({
    id: "bowl",
    category: "items",
    name: "Tazones de madera",
    description: "1 madera se convierte en 3 tazones para brebajes.",
    costs: Object.freeze({ madera: 1 }),
    type: "bundle",
    item: "bowl",
    amount: 3,
  }),
  Object.freeze({
    id: "bandage",
    category: "items",
    name: "Venda de fibras",
    description: "Restaura 35 de salud al usarla con E. \u00DAtil para sobrevivir de noche.",
    costs: Object.freeze({ bayas: 2, agua: 1 }),
    type: "bundle",
    item: "bandage",
    amount: 1,
  }),
  Object.freeze({
    id: "basket",
    category: "upgrades",
    name: "Cesta de madera",
    description: "Aumenta los espacios del inventario en 20. Cada pila guarda 32 unidades.",
    costs: Object.freeze({ madera: 8 }),
    type: "upgrade",
    upgrade: "basket",
    capacityBonus: 20,
  }),
  Object.freeze({
    id: "whistle",
    category: "upgrades",
    name: "Silbato de duende",
    description: "Invoca un duende trabajador. M\u00E1ximo 4 duendes.",
    costs: Object.freeze({ madera: 2, Cu: 2 }),
    type: "worker",
    maxWorkers: 4,
  }),
  Object.freeze({
    id: "leatherPack",
    category: "upgrades",
    name: "Mochila de piel",
    description: "Aumenta la capacidad del inventario en 12 espacios.",
    costs: Object.freeze({ piel: 3, telarana: 2, madera: 2 }),
    type: "upgrade",
    upgrade: "leatherPack",
    capacityBonus: 12,
  }),
  Object.freeze({
    id: "leatherArmor",
    category: "upgrades",
    name: "Armadura de piel",
    description: "Reduce un 30% el da\u00F1o recibido de criaturas nocturnas.",
    costs: Object.freeze({ piel: 4, telarana: 3, C: 1 }),
    type: "upgrade",
    upgrade: "leatherArmor",
  }),
  Object.freeze({
    id: "veinRestorer",
    category: "upgrades",
    name: "Restaurador de vetas",
    description:
      "Permite a un duende restaurar menas minadas (oro y piedra). Tarda 4 minutos por veta.",
    costs: Object.freeze({ oro: 3, piedra: 8, Fe: 5, madera: 6 }),
    type: "upgrade",
    upgrade: "veinRestorer",
  }),
  Object.freeze({
    id: "wolfCloak",
    category: "upgrades",
    name: "Capa de piel de lobo",
    description:
      "Reduce el daño de las criaturas hostiles y aumenta la velocidad en bosques de lobo y nieve.",
    costs: Object.freeze({ pielLobo: 3, piel: 2, fibra: 4 }),
    type: "upgrade",
    upgrade: "wolfCloak",
    requiresWolfMission: true,
  }),
  Object.freeze({
    id: "wolfTotem",
    category: "build",
    name: "Tótem de lobo",
    description:
      "Colocable. Ahuyenta lobos y criaturas hostiles en un radio amplio.",
    costs: Object.freeze({ pielLobo: 2, madera: 6, telarana: 2 }),
    type: "placeable",
    item: "wolfTotem",
    requiresWolfMission: true,
  }),
]);

const RECIPES_BY_ID = new Map(CRAFT_RECIPES.map((recipe) => [recipe.id, recipe]));

export const CRAFT_XP_STEP = 50;
export const CRAFT_XP_BASE = 10;

export function craftXpReward(recipe) {
  const tier = Number.isFinite(recipe?.tier) ? recipe.tier : 0;
  const bonus = recipe?.type === "upgrade" || recipe?.type === "worker" ? 6 : 0;
  return CRAFT_XP_BASE + bonus + Math.max(0, tier) * 2;
}

export function craftLevelForXp(xp) {
  const safe = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  return Math.floor(safe / CRAFT_XP_STEP) + 1;
}

export function craftLevelProgress(xp) {
  const safe = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  const level = craftLevelForXp(safe);
  const current = safe % CRAFT_XP_STEP;
  return {
    level,
    current,
    needed: CRAFT_XP_STEP,
    percent: (current / CRAFT_XP_STEP) * 100,
  };
}

export function recipeById(id) {
  return RECIPES_BY_ID.get(id) ?? null;
}

export function isRecipeOwned(recipe, inventory) {
  if (recipe.type === "tool") {
    return inventory.hasTool(recipe.tool);
  }
  if (recipe.type === "upgrade") {
    return inventory.hasUpgrade(recipe.upgrade);
  }
  return false;
}

export function recipeState(recipe, inventory, context = {}) {
  const owned = isRecipeOwned(recipe, inventory);
  const affordable = inventory.has(recipe.costs);
  const missing = Object.entries(recipe.costs)
    .filter(([key, amount]) => inventory.count(key) < amount)
    .map(([key]) => key);
  const workerCount = Number.isFinite(context.workerCount) ? context.workerCount : 0;
  const limit =
    recipe.type === "worker" && workerCount >= (recipe.maxWorkers ?? 4);
  const locked =
    recipe.requiresWolfMission === true &&
    context.wolfMissionComplete !== true;
  const toolMissing =
    Boolean(recipe.requiresTool) && !inventory.hasTool(recipe.requiresTool);

  return {
    owned,
    affordable,
    missing,
    limit,
    locked,
    toolMissing,
    workerCount,
    canCraft: !locked && !toolMissing && !owned && affordable && !limit,
    count: recipe.type === "placeable" ? inventory.itemCount(recipe.item) : 0,
  };
}

export function craftRecipe(recipeOrId, inventory, context = {}) {
  const recipe =
    typeof recipeOrId === "string" ? recipeById(recipeOrId) : recipeOrId;

  if (!recipe) {
    return { ok: false, reason: "unknown" };
  }

  if (
    recipe.requiresWolfMission === true &&
    context.wolfMissionComplete !== true
  ) {
    return { ok: false, reason: "locked", recipe };
  }

  if (recipe.requiresTool && !inventory.hasTool(recipe.requiresTool)) {
    return { ok: false, reason: "tool", recipe };
  }

  if (isRecipeOwned(recipe, inventory)) {
    return { ok: false, reason: "owned", recipe };
  }

  const workerCount = Number.isFinite(context.workerCount) ? context.workerCount : 0;
  if (recipe.type === "worker" && workerCount >= (recipe.maxWorkers ?? 4)) {
    return { ok: false, reason: "limit", recipe };
  }

  if (!inventory.has(recipe.costs)) {
    return { ok: false, reason: "resources", recipe };
  }

  if (!inventory.spend(recipe.costs)) {
    return { ok: false, reason: "resources", recipe };
  }

  if (recipe.type === "tool") {
    inventory.addTool(recipe.tool);
  } else if (recipe.type === "upgrade") {
    inventory.addUpgrade(recipe.upgrade);
    if (recipe.capacityBonus) {
      inventory.setCapacity(inventory.capacity + recipe.capacityBonus);
    }
  } else if (recipe.type === "placeable") {
    inventory.addItem(recipe.item, 1);
  } else if (recipe.type === "bundle") {
    inventory.addItem(recipe.item, recipe.amount ?? 1);
  }

  return { ok: true, recipe };
}
