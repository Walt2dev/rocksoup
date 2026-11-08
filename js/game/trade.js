import { BIOME } from "../world/biomes.js";

export const TRADE_GOODS = Object.freeze([
  Object.freeze({ id: "comida", label: "Comida", resource: "bayas", amount: 10, gold: 2 }),
  Object.freeze({ id: "madera", label: "Madera", resource: "madera", amount: 8, gold: 2 }),
  Object.freeze({ id: "piedra", label: "Piedra", resource: "piedra", amount: 8, gold: 2 }),
  Object.freeze({ id: "mineral", label: "Minerales", resource: "Fe", amount: 4, gold: 3 }),
  Object.freeze({ id: "oro", label: "Oro", resource: "oro", amount: 4, gold: 0 }),
]);

const BIOME_PRODUCTION = Object.freeze({
  [BIOME.BEACH]: Object.freeze({ bayas: 0.8, agua: 1.2, oro: 0.12 }),
  [BIOME.GRASS]: Object.freeze({ bayas: 1.2, trigo: 0.8, oro: 0.1 }),
  [BIOME.FOREST]: Object.freeze({ madera: 1.4, fibra: 0.8, bayas: 0.5 }),
  [BIOME.ROCK]: Object.freeze({ piedra: 1.5, Fe: 0.45, oro: 0.15 }),
  [BIOME.SNOW]: Object.freeze({ piedra: 1.0, Fe: 0.55, cuarzo: 0.16 }),
  [BIOME.DESERT]: Object.freeze({ oro: 0.65, Cu: 0.5, cuarzo: 0.3 }),
  [BIOME.JUNGLE]: Object.freeze({ madera: 1.1, bayas: 0.9, fibra: 0.9 }),
});

export function productionRates(village) {
  return BIOME_PRODUCTION[village?.biome] ?? {};
}

export function productionYield(village, stability, seconds) {
  const rates = productionRates(village);
  const factor = Math.max(0.35, Math.min(1.25, stability / 100)) * (seconds / 60);
  const result = {};
  for (const [key, rate] of Object.entries(rates)) {
    const amount = Math.floor(rate * factor);
    if (amount > 0) {
      result[key] = amount;
    }
  }
  return result;
}

export function tradeYield(goodsId, stability, share) {
  const goods = TRADE_GOODS.find((entry) => entry.id === goodsId) ?? TRADE_GOODS[0];
  const factor = Math.max(0.5, Math.min(1.5, stability / 100));
  return {
    goods,
    resources: {
      [goods.resource]: Math.max(1, Math.floor(goods.amount * factor * share)),
      oro: Math.floor(goods.gold * factor * share),
    },
  };
}

export function routeShare(stability) {
  return Math.min(0.45, 0.18 + Math.max(0, stability) * 0.002);
}
