import { describeGrants, sanitizeGrants } from "./grants.mjs";

const CURRENCY = "MXN";

export const STORE_PRODUCTS = Object.freeze([
  {
    id: "energy_full",
    name: "Energía llena",
    description: "Recupera al instante 100 puntos de energía para seguir explorando.",
    category: "resources",
    kind: "one_time",
    priceCents: 1500,
    icon: "⚡",
    badge: "Instantáneo",
    grants: { energy: 100 },
  },
  {
    id: "coal_pack",
    name: "Cofre de carbón",
    description: "120 de carbón para fundir, cocinar y alimentar tus talleres.",
    category: "resources",
    kind: "one_time",
    priceCents: 2000,
    icon: "🪨",
    grants: { resources: { C: 120 } },
  },
  {
    id: "iron_pack",
    name: "Cofre de hierro",
    description: "80 de hierro para herramientas, armaduras y construcciones.",
    category: "resources",
    kind: "one_time",
    priceCents: 2500,
    icon: "⛏️",
    grants: { resources: { Fe: 80 } },
  },
  {
    id: "gold_pack",
    name: "Cofre de oro",
    description: "60 de oro para comerciar con las aldeas y acelerar tu feudo.",
    category: "resources",
    kind: "one_time",
    priceCents: 3000,
    icon: "🪙",
    grants: { resources: { oro: 60 } },
  },
  {
    id: "food_pack",
    name: "Despensa del feudo",
    description: "150 alimentos variados y 10 pescados para tus trabajadores.",
    category: "resources",
    kind: "one_time",
    priceCents: 2000,
    icon: "🍞",
    grants: {
      resources: { bayas: 50, trigo: 50, maiz: 50 },
      items: { pescado: 10 },
    },
  },
  {
    id: "feudo_chest",
    name: "Cofre del Feudo",
    description: "Un botín equilibrado: carbón, hierro, oro y comida para toda la colonia.",
    category: "resources",
    kind: "one_time",
    priceCents: 4500,
    icon: "🎁",
    badge: "Mejor valor",
    grants: {
      resources: { C: 80, Fe: 50, oro: 30, bayas: 30, trigo: 30 },
    },
  },
  {
    id: "rare_seeds",
    name: "Semillas raras",
    description: "10 semillas de árbol, 10 de trigo y 10 de maíz para tu granja.",
    category: "resources",
    kind: "one_time",
    priceCents: 2000,
    icon: "🌱",
    grants: {
      resources: { semillaArbol: 10, semillaTrigo: 10, semillaMaiz: 10 },
    },
  },
  {
    id: "diamonds_20",
    name: "Bolsa de diamantes",
    description: "20 diamantes para comprar armaduras y objetos especiales.",
    category: "diamonds",
    kind: "one_time",
    priceCents: 2500,
    icon: "💎",
    grants: { diamonds: 20 },
  },
  {
    id: "diamonds_60",
    name: "Cofre de diamantes",
    description: "60 diamantes con un 20% extra sobre la bolsa pequeña.",
    category: "diamonds",
    kind: "one_time",
    priceCents: 6000,
    icon: "💎",
    badge: "+20% extra",
    grants: { diamonds: 60 },
  },
  {
    id: "diamonds_150",
    name: "Cámara del tesoro",
    description: "150 diamantes para equipar a todo tu séquito.",
    category: "diamonds",
    kind: "one_time",
    priceCents: 13000,
    icon: "💎",
    badge: "Popular",
    grants: { diamonds: 150 },
  },
  {
    id: "armor_leather",
    name: "Armadura de piel",
    description: "Mejora permanente que reduce el daño recibido en un 30%.",
    category: "armor",
    kind: "one_time",
    priceCents: 3500,
    icon: "🦺",
    grants: { upgrades: ["leatherArmor"] },
  },
  {
    id: "armor_wolfcloak",
    name: "Capa de piel de lobo",
    description: "Mejora permanente de abrigo y defensa para las noches duras.",
    category: "armor",
    kind: "one_time",
    priceCents: 4500,
    icon: "🐺",
    grants: { upgrades: ["wolfCloak"] },
  },
  {
    id: "vein_restorer",
    name: "Restaurador de vetas",
    description: "Mejora permanente para recuperar vetas de mineral agotadas.",
    category: "armor",
    kind: "one_time",
    priceCents: 2000,
    icon: "🔧",
    grants: { upgrades: ["veinRestorer"] },
  },
  {
    id: "wolf_totem",
    name: "Tótem de lobo",
    description: "Un tótem para invocar y honrar a los lobos de la tundra.",
    category: "armor",
    kind: "one_time",
    priceCents: 1500,
    icon: "🗿",
    grants: { items: { wolfTotem: 1 } },
  },
  {
    id: "world_slot",
    name: "Slot de mundo adicional",
    description: "Un espacio permanente más para tus partidas individuales en la nube.",
    category: "world",
    kind: "one_time",
    priceCents: 1500,
    icon: "🌍",
    badge: "15 MXN",
    grants: { worldSlots: 1 },
  },
  {
    id: "sub_noble",
    name: "Noble",
    description: "Suministros diarios para un explorador constante.",
    category: "subscription",
    kind: "subscription",
    priceCents: 4900,
    currency: CURRENCY,
    icon: "🏅",
    badge: "Mensual",
    dailyGrants: {
      resources: { C: 40, Fe: 30, oro: 20, bayas: 30, trigo: 30 },
      items: { pescado: 5 },
    },
    highlights: ["Recursos cada 24 h", "5 pescados diarios", "Cancela cuando quieras"],
  },
  {
    id: "sub_lord",
    name: "Lord",
    description: "El equilibrio perfecto entre recursos, comida y piedras preciosas.",
    category: "subscription",
    kind: "subscription",
    priceCents: 9900,
    currency: CURRENCY,
    icon: "👑",
    badge: "Más popular",
    dailyGrants: {
      resources: { C: 100, Fe: 70, oro: 50, bayas: 60, trigo: 60, maiz: 40 },
      items: { pescado: 10 },
      diamonds: 2,
    },
    highlights: ["Recursos cada 24 h", "10 pescados y 2 diamantes", "Cancela cuando quieras"],
  },
  {
    id: "sub_feudo",
    name: "Feudo",
    description: "El paquete más generoso para dominar el mundo y tu colonia.",
    category: "subscription",
    kind: "subscription",
    priceCents: 19900,
    currency: CURRENCY,
    icon: "🏰",
    badge: "Máximo",
    dailyGrants: {
      resources: {
        C: 250,
        Fe: 180,
        oro: 120,
        bayas: 120,
        trigo: 100,
        maiz: 80,
      },
      items: { pescado: 20 },
      diamonds: 5,
    },
    highlights: [
      "Recursos cada 24 h",
      "20 pescados y 5 diamantes",
      "Ideal para varios mundos",
    ],
  },
]);

const BY_ID = new Map(STORE_PRODUCTS.map((product) => [product.id, product]));

function previewFor(product) {
  const grants = product.kind === "subscription"
    ? product.dailyGrants
    : product.grants;
  return describeGrants(grants);
}

export function getProduct(productId) {
  return BY_ID.get(String(productId ?? "")) ?? null;
}

export function publicProduct(product) {
  if (!product) {
    return null;
  }
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    kind: product.kind,
    priceCents: product.priceCents,
    currency: product.currency ?? CURRENCY,
    icon: product.icon,
    badge: product.badge ?? null,
    highlights: Array.isArray(product.highlights) ? [...product.highlights] : [],
    preview: previewFor(product),
    active: true,
  };
}

export function publicProducts() {
  return STORE_PRODUCTS.map(publicProduct);
}

export function productsByCategory() {
  const groups = {};
  for (const product of publicProducts()) {
    groups[product.category] ??= [];
    groups[product.category].push(product);
  }
  return groups;
}

export function validateProductGrants(product) {
  if (!product) {
    return false;
  }
  const grants = sanitizeGrants(
    product.kind === "subscription" ? product.dailyGrants : product.grants,
  );
  return Object.keys(grants).length > 0;
}

export { CURRENCY };
