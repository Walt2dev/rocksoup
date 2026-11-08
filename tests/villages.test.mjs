import test from "node:test";
import assert from "node:assert/strict";

import { BIOME } from "../js/world/biomes.js";
import {
  VILLAGE_REQUEST_ITEMS,
  findVillageSites,
  makeVillageRequest,
} from "../js/game/villages.js";

test("las peticiones del chamán son deterministas y usan la luna", () => {
  const village = { id: "village:test", name: "Aldea" };
  const first = makeVillageRequest("seed", village);
  const second = makeVillageRequest("seed", village);

  assert.deepEqual(first, second);
  assert.ok(first.constellationId.startsWith("constellation:"));
  assert.equal(first.item, VILLAGE_REQUEST_ITEMS[first.phase]);
  assert.ok(first.reason);
  assert.ok(Object.keys(first.reward).length > 0);
});

test("se puede generar una aldea en un bioma disponible", () => {
  const world = {
    biomeAt: () => BIOME.GRASS,
    isWalkableAt: () => true,
  };
  const sites = findVillageSites(world, "seed", { x: 0, y: 0 });
  assert.ok(sites.length >= 1);
  const site = sites.find((entry) => entry.biome === BIOME.GRASS);
  assert.ok(site);
  assert.ok(site.request);
  assert.ok(site.huts.length >= 3);
});
