import { describeGrants, sanitizeGrants } from "./grants.mjs";
import {
  ECONOMY_PRODUCTS,
  economyProductGrants,
  getEconomyProduct,
} from "../js/game/economy.js";

export const CURRENCY = "drac";
export { ECONOMY_PRODUCTS as STORE_PRODUCTS };

function previewFor(product) {
  return describeGrants(economyProductGrants(product));
}

function needsWorldFor(product) {
  if (
    product.kind !== "one_time" ||
    product.category === "world" ||
    product.category === "prestige"
  ) {
    return false;
  }
  const grants = economyProductGrants(product);
  return Boolean(
    Object.keys(grants.resources ?? {}).length ||
      Object.keys(grants.items ?? {}).length ||
      grants.energy ||
      (grants.upgrades ?? []).length ||
      (grants.tools ?? []).length,
  );
}

export function getProduct(productId) {
  return getEconomyProduct(productId);
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
    price: {
      currency: product.price.currency,
      amount: product.price.amount,
    },
    currency: product.price.currency,
    contractDays: product.contractDays ?? null,
    needsWorld: needsWorldFor(product),
    icon: product.icon,
    badge: product.badge ?? null,
    highlights: Array.isArray(product.highlights) ? [...product.highlights] : [],
    preview: previewFor(product),
    active: true,
  };
}

export function publicProducts() {
  return ECONOMY_PRODUCTS.map(publicProduct);
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
  const grants = sanitizeGrants(economyProductGrants(product));
  return Object.keys(grants).length > 0;
}
