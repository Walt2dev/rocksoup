import assert from "node:assert/strict";
import test from "node:test";

import { Inventory } from "../js/game/inventory.js";
import { foodTotal, spendFood } from "../js/game/food.js";

test("la comida suma recursos y objetos comestibles", () => {
  const inventory = new Inventory({
    resources: { bayas: 3, trigo: 2, maiz: 1 },
    items: { pescado: 2, pan: 1, carnePollo: 4 },
  });

  assert.equal(foodTotal(inventory), 13);
});

test("crear un duende consume exactamente 10 unidades de comida", () => {
  const inventory = new Inventory({
    resources: { bayas: 4, trigo: 3 },
    items: { pescado: 2, carnePollo: 3 },
  });

  const result = spendFood(inventory, 10);
  assert.equal(result.ok, true);
  assert.equal(result.spent, 10);
  assert.equal(foodTotal(inventory), 2);
  assert.equal(inventory.count("bayas"), 0);
  assert.equal(inventory.itemCount("pescado"), 0);
});

test("no se gasta comida si no hay suficiente", () => {
  const inventory = new Inventory({ resources: { bayas: 3 } });
  const result = spendFood(inventory, 10);

  assert.equal(result.ok, false);
  assert.equal(inventory.count("bayas"), 3);
});
