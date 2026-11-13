export const FOOD_ITEMS = Object.freeze([
  Object.freeze({ key: "bayas", kind: "resource", label: "Bayas" }),
  Object.freeze({ key: "trigo", kind: "resource", label: "Trigo" }),
  Object.freeze({ key: "maiz", kind: "resource", label: "Maíz" }),
  Object.freeze({ key: "pescado", kind: "item", label: "Pescado" }),
  Object.freeze({ key: "pescadoFrito", kind: "item", label: "Pescado frito" }),
  Object.freeze({ key: "pan", kind: "item", label: "Pan" }),
  Object.freeze({ key: "roastedBerries", kind: "item", label: "Bayas tostadas" }),
  Object.freeze({ key: "carnePollo", kind: "item", label: "Carne de pollo" }),
]);

export function foodAmount(inventory, food) {
  return food.kind === "item"
    ? inventory.itemCount(food.key)
    : inventory.count(food.key);
}

export function foodTotal(inventory) {
  return FOOD_ITEMS.reduce(
    (total, food) => total + foodAmount(inventory, food),
    0,
  );
}

export function spendFood(inventory, amount) {
  const requested = Math.max(0, Math.floor(amount));
  if (requested === 0) {
    return { ok: true, spent: 0 };
  }
  if (foodTotal(inventory) < requested) {
    return { ok: false, spent: 0, missing: requested - foodTotal(inventory) };
  }

  let remaining = requested;
  for (const food of FOOD_ITEMS) {
    if (remaining <= 0) {
      break;
    }
    const available = foodAmount(inventory, food);
    const take = Math.min(available, remaining);
    if (take <= 0) {
      continue;
    }
    if (food.kind === "item") {
      inventory.removeItem(food.key, take);
    } else {
      inventory.remove(food.key, take);
    }
    remaining -= take;
  }

  return { ok: remaining === 0, spent: requested - remaining };
}
