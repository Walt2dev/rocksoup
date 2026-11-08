import test from "node:test";
import assert from "node:assert/strict";

import { BIOME } from "../js/world/biomes.js";
import {
  TRADE_GOODS,
  productionYield,
  routeShare,
  tradeYield,
} from "../js/game/trade.js";

test("las aldeas producen según su bioma y equilibrio", () => {
  const forest = { biome: BIOME.FOREST };
  const rich = productionYield(forest, 100, 60);
  const crisis = productionYield(forest, 10, 60);
  assert.ok(rich.madera > 0);
  assert.ok((crisis.madera ?? 0) <= rich.madera);
  assert.equal(productionYield({ biome: BIOME.WATER }, 100, 60).madera, undefined);
});

test("las caravanas reparten beneficios y las buenas aldeas pagan más", () => {
  assert.equal(TRADE_GOODS.length, 5);
  const low = tradeYield("comida", 20, routeShare(20));
  const high = tradeYield("comida", 100, routeShare(100));
  assert.ok(high.resources.bayas >= low.resources.bayas);
  assert.ok(high.resources.oro >= low.resources.oro);
  assert.ok(routeShare(100) > routeShare(20));
});

