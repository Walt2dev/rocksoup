import { BIOME } from "../world/biomes.js";
import { CONSTELLATIONS } from "./skyCatalog.js";

const BIOME_LINES = {
  [BIOME.GRASS]: {
    label: "Pradera",
    names: [
      ["Tónico de Hierba", "Cura 20 de salud.", "heal", 20],
      ["Elixir de Vitalidad", "Cura 35 de salud.", "heal", 35],
      ["Bálsamo de la Pradera", "Regenera salud durante 10 segundos.", "regen", 10],
      ["Agua de Siembra", "Acelera el crecimiento de los cultivos cercanos.", "farm", 20],
      ["Vino de la Cosecha", "Sube la estabilidad de la aldea.", "stability", 18],
      ["Panacea Verde", "Cura y purifica el veneno.", "cure", 30],
      ["Aliento de la Manada", "Da velocidad y energía.", "speed", 20],
      ["Semilla Estelar", "Mejora el rendimiento de la próxima cosecha.", "harvest", 20],
      ["Leche de Trigo", "Restaura energía y saciedad.", "energy", 40],
      ["Corazón de la Comunidad", "Gran impulso de estabilidad aldeana.", "stability", 35],
      ["Rito de la Abundancia", "Mejora las caravanas de comida.", "trade", 20],
      ["Elixir del Equilibrio", "Cura, estabiliza y mejora el comercio.", "balance", 50],
    ],
  },
  [BIOME.FOREST]: {
    label: "Bosque",
    names: [
      ["Antídoto de Corteza", "Cura el veneno.", "cure", 20],
      ["Ungüento de Savia", "Regenera salud durante 10 segundos.", "regen", 10],
      ["Té de Liquen", "Aumenta la resistencia al daño.", "resistance", 15],
      ["Voz del Bosque", "Calma temporalmente a la fauna.", "calm", 20],
      ["Savia de Roble", "Aumenta la salud máxima temporalmente.", "maxHealth", 20],
      ["Esencia de Musgo", "Reduce la detección de criaturas.", "stealth", 20],
      ["Néctar de la Colmena", "Da velocidad y energía.", "speed", 20],
      ["Flor Lunar", "Ilumina y mejora la visión nocturna.", "nightVision", 20],
      ["Bendición del Ciervo", "Mejora el salto y reduce el daño de caída.", "jump", 20],
      ["Secreto de las Raíces", "Mejora la recolección con herramientas.", "gather", 20],
      ["Elixir del Bosque Vivo", "Cura, protege y estabiliza la aldea.", "balance", 45],
      ["Círculo de Raíces", "Regeneración maestra y protección.", "regen", 30],
    ],
  },
  [BIOME.DESERT]: {
    label: "Desierto",
    names: [
      ["Agua de Duna", "Restaura energía y algo de salud.", "energy", 30],
      ["Sombra de Arena", "Aumenta la resistencia al calor.", "heat", 20],
      ["Té de Cactus", "Cura y restaura energía.", "heal", 25],
      ["Velo del Espejismo", "Aumenta la evasión temporalmente.", "evasion", 20],
      ["Sal de la Tierra", "Conserva alimentos y mejora la comida.", "food", 20],
      ["Veneno de Escorpión", "Envenena a un enemigo.", "poison", 20],
      ["Oro Líquido", "Mejora el hallazgo de minerales y oro.", "luck", 20],
      ["Aliento del Viento", "Da velocidad y resistencia al calor.", "speed", 25],
      ["Espejismo del Mercader", "Mejora el rendimiento de las caravanas.", "trade", 25],
      ["Fiebre del Sol", "Aumenta el ataque y la velocidad.", "attack", 25],
      ["Cristal de Dunas", "Resistencia y reflejo de daño.", "resistance", 30],
      ["Corazón del Desierto", "Inmunidad al calor y gran comercio.", "balance", 50],
    ],
  },
  [BIOME.SNOW]: {
    label: "Nieve",
    names: [
      ["Té de Nieve", "Cura y templa el frío.", "heal", 20],
      ["Bálsamo Glacial", "Cura y resiste el frío.", "heal", 30],
      ["Aliento de Fuego", "Inmunidad temporal al frío.", "cold", 20],
      ["Visión Clara", "Mejora la visión nocturna.", "nightVision", 20],
      ["Escarcha Protectora", "Aumenta la resistencia.", "resistance", 20],
      ["Sueño de Copo", "Ralentiza a las criaturas cercanas.", "slow", 20],
      ["Reflejo de Hielo", "Refleja parte del daño recibido.", "reflect", 20],
      ["Estrella Polar", "Mejora la precisión de las investigaciones.", "research", 20],
      ["Corazón Helado", "Aumenta ataque y defensa.", "attack", 25],
      ["Lágrima de Aurora", "Cura y mejora la investigación.", "balance", 35],
      ["Rito del Invierno", "Estabiliza la aldea y conserva comida.", "stability", 35],
      ["Elixir de la Aurora", "Curación maestra, ciencia y comercio.", "balance", 50],
    ],
  },
};

const BIOME_RESOURCES = {
  [BIOME.GRASS]: ["agua", "bayas", "trigo"],
  [BIOME.FOREST]: ["agua", "bayas", "fibra"],
  [BIOME.DESERT]: ["agua", "cuarzo", "Cu"],
  [BIOME.SNOW]: ["agua", "piedra", "Fe"],
};

const RARE_RESOURCES = ["C", "Ca", "Mg", "Zn", "Si", "Fe", "Cu", "amatista", "cuarzo"];

function ingredientsFor(biome, tier) {
  const pool = BIOME_RESOURCES[biome] ?? ["agua", "bayas"];
  const ingredients = {};
  const amount = 1 + Math.floor((tier - 1) / 3);

  ingredients[pool[0]] = amount;
  ingredients[pool[1]] = amount;
  if (tier >= 2) ingredients[pool[2]] = 1;
  if (tier >= 5) ingredients[RARE_RESOURCES[(tier + biome) % RARE_RESOURCES.length]] = 1;
  if (tier >= 9) ingredients.amatista = 1;
  return ingredients;
}

function makePotion(biome, tier, data) {
  const [name, description, effectType, amount] = data;
  const constellation =
    CONSTELLATIONS[(biome * 37 + tier * 11) % CONSTELLATIONS.length];
  return Object.freeze({
    id: `potion:${biome}:${tier}`,
    villageBiome: biome,
    villageLabel: BIOME_LINES[biome]?.label ?? "Aldea",
    tier,
    name,
    description,
    effect: Object.freeze({ type: effectType, amount }),
    ingredients: Object.freeze(ingredientsFor(biome, tier)),
    constellationId: constellation.id,
    constellationName: constellation.name,
    noteRequired: tier >= 3,
    moonPhase: tier % 4 === 0 ? (tier % 8 === 0 ? "new" : "full") : null,
    scienceBook: tier >= 3 ? "brews" : null,
    scienceTier: Math.min(4, Math.floor((tier - 1) / 3)),
  });
}

export const CIVIC_POTIONS = Object.freeze(
  Object.entries(BIOME_LINES).flatMap(([biome, line]) =>
    line.names.map((data, index) =>
      makePotion(Number(biome), index + 1, data),
    ),
  ),
);

export const CIVIC_POTIONS_BY_ID = new Map(
  CIVIC_POTIONS.map((potion) => [potion.id, potion]),
);

const SECONDARY_DATA = {
  [BIOME.BEACH]: [
    ["Red de pesca", "La aldea necesita redes y fibra para pescar.", { fibra: 4, agua: 2 }],
    ["Sal y conchas", "La aldea prepara conservas para el invierno.", { agua: 3, piedra: 3 }],
    ["Madera de balsa", "La aldea repara sus balsas y muelles.", { madera: 5, fibra: 2 }],
    ["Ofrenda de marea", "Una ofrenda para unir la aldea costera.", { oro: 3, bayas: 3, madera: 3 }],
  ],
  [BIOME.ROCK]: [
    ["Refuerzo de mina", "La aldea necesita madera para apuntalar la mina.", { madera: 5, piedra: 3 }],
    ["Carbón de fragua", "La aldea necesita carbón para sus herramientas.", { C: 3, piedra: 3 }],
    ["Herramientas de piedra", "La aldea repara sus picos y martillos.", { piedra: 5, Fe: 2 }],
    ["Ofrenda de montaña", "Una ofrenda para unir la aldea de montaña.", { oro: 3, Cu: 3, piedra: 4 }],
  ],
  [BIOME.JUNGLE]: [
    ["Fibras de selva", "La aldea necesita fibra para sus cestas.", { fibra: 5, madera: 2 }],
    ["Frutas y bayas", "La aldea necesita comida para sus niños.", { bayas: 5, agua: 2 }],
    ["Madera de ceiba", "La aldea construye puentes entre los árboles.", { madera: 6, fibra: 2 }],
    ["Ofrenda de raíces", "Una ofrenda para unir la aldea de la selva.", { oro: 3, bayas: 4, madera: 3 }],
  ],
};

const SECONDARY_BY_BIOME = new Map(
  Object.entries(SECONDARY_DATA).map(([biome, entries]) => [
    Number(biome),
    Object.freeze(
      entries.map(([name, description, ingredients], index) =>
        Object.freeze({
          id: `favor:${biome}:${index + 1}`,
          villageBiome: Number(biome),
          tier: index + 1,
          name,
          description,
          effect: Object.freeze({ type: "stability", amount: index === 3 ? 20 : 15 }),
          ingredients: Object.freeze(ingredients),
          noteRequired: false,
          moonPhase: null,
          scienceBook: null,
          scienceTier: 0,
        }),
      ),
    ),
  ]),
);

const SECONDARY_FAVORS = Object.freeze([...SECONDARY_BY_BIOME.values()].flat());

export function civicLineForVillage(village) {
  if (BIOME_LINES[village.biome]) {
    return CIVIC_POTIONS.filter((potion) => potion.villageBiome === village.biome).sort(
      (a, b) => a.tier - b.tier,
    );
  }
  return SECONDARY_BY_BIOME.get(village.biome) ?? [];
}

export function civicPotionById(id) {
  return CIVIC_POTIONS_BY_ID.get(id) ?? SECONDARY_FAVORS.find((entry) => entry.id === id) ?? null;
}

export function civicRecipeState(recipe, inventory, context = {}) {
  const missing = Object.entries(recipe.ingredients)
    .filter(([key, amount]) => inventory.count(key) < amount)
    .map(([key]) => key);
  const missingNote = Boolean(
    recipe.noteRequired &&
      !(
        recipe.constellationId &&
        context.observationIds?.includes(recipe.constellationId)
      ),
  );
  const wrongMoon = Boolean(
    recipe.moonPhase && context.moonPhase !== recipe.moonPhase,
  );
  const missingScience = Boolean(
    recipe.scienceBook &&
      (context.scienceLevels?.[recipe.scienceBook] ?? 0) < recipe.scienceTier,
  );

  return {
    canCraft:
      missing.length === 0 && !missingNote && !wrongMoon && !missingScience,
    missing,
    missingNote,
    wrongMoon,
    missingScience,
  };
}

export function craftCivicPotion(recipe, inventory) {
  for (const [key, amount] of Object.entries(recipe.ingredients)) {
    if (inventory.remove(key, amount) !== amount) {
      return false;
    }
  }
  return true;
}

