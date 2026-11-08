import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeFeathers, sanitizeSave } from "../js/game/save.js";
import { World } from "../js/world/world.js";

function findNode(world, kind = "tree") {
  for (let cy = -1; cy <= 1; cy += 1) {
    for (let cx = -1; cx <= 1; cx += 1) {
      const chunk = world.getChunk(cx, cy);
      const list =
        kind === "tree"
          ? chunk.trees
          : kind === "mineral"
            ? chunk.minerals
            : chunk.bushes;

      if (list.length > 0) {
        const node = list[0];
        return {
          kind,
          chunk,
          node,
          x: cx * chunk.size + node.localX,
          y: cy * chunk.size + node.localY,
        };
      }
    }
  }

  throw new Error("No se encontró ningún nodo para la prueba");
}

test("talar un árbol lo sustituye por un tocón y elimina el nodo", () => {
  const world = new World("harvest-tree");
  const found = findNode(world);
  const node = world.getNodeAt(found.kind, found.x, found.y);

  assert.ok(node);
  assert.equal(node.kind, found.kind);

  const harvested = world.harvestNode(found.kind, found.x, found.y);
  assert.ok(harvested);
  assert.equal(world.getNodeAt(found.kind, found.x, found.y), null);
  assert.equal(world.isHarvested(found.kind, found.x, found.y), true);

  const list = found.kind === "tree" ? found.chunk.trees : found.chunk.minerals;
  assert.equal(
    list.some(
      (entry) =>
        entry.localX === found.node.localX && entry.localY === found.node.localY,
    ),
    false,
  );

  const leftovers = found.kind === "tree" ? found.chunk.stumps : found.chunk.rubble;
  assert.equal(leftovers.length, 1);
  assert.equal(leftovers[0].localX, found.node.localX);
  assert.equal(leftovers[0].localY, found.node.localY);

  if (found.kind === "mineral") {
    const index = found.chunk.index(found.node.localX, found.node.localY);
    assert.equal(found.chunk.mineral[index], 0);
  }

  assert.deepEqual(world.exportHarvested(), [
    { kind: found.kind, x: found.x, y: found.y },
  ]);
  assert.equal(world.harvestNode(found.kind, found.x, found.y), null);
  assert.equal(world.isBlockedAt(found.x, found.y), false);
  assert.equal(world.isActorWalkableAt(found.x, found.y), world.isWalkableAt(found.x, found.y));
});

test("los nodos activos bloquean el paso del jugador", () => {
  const world = new World("node-block");
  const found = findNode(world, "tree");

  assert.equal(world.isBlockedAt(found.x, found.y), true);
  assert.equal(world.isActorWalkableAt(found.x, found.y), false);

  world.harvestNode(found.kind, found.x, found.y);

  assert.equal(world.isBlockedAt(found.x, found.y), false);
  assert.equal(world.isActorWalkableAt(found.x, found.y), true);

  const twin = new World("node-block");
  twin.loadHarvested([{ kind: "tree", x: found.x, y: found.y }]);
  assert.equal(twin.isBlockedAt(found.x, found.y), false);
});

test("minar un mineral lo sustituye por escombros", () => {
  const world = new World("harvest-mineral");
  const found = findNode(world, "mineral");
  const node = world.getNodeAt(found.kind, found.x, found.y);

  assert.ok(node);
  assert.equal(node.kind, "mineral");
  assert.ok(node.type >= 1);
  assert.equal(world.isBlockedAt(found.x, found.y), true);

  const harvested = world.harvestNode(found.kind, found.x, found.y);
  assert.ok(harvested);
  assert.equal(world.getNodeAt(found.kind, found.x, found.y), null);
  assert.equal(world.isHarvested(found.kind, found.x, found.y), true);
  assert.equal(world.isBlockedAt(found.x, found.y), false);

  const index = found.chunk.index(found.node.localX, found.node.localY);
  assert.equal(found.chunk.mineral[index], 0);
  assert.equal(found.chunk.rubble.length, 1);
  assert.equal(found.chunk.rubble[0].type, node.type);
  assert.deepEqual(world.exportHarvested(), [
    { kind: "mineral", x: found.x, y: found.y },
  ]);
});

test("restaurar una veta devuelve el mineral y limpia el registro", () => {
  const world = new World("harvest-mineral");
  const found = findNode(world, "mineral");
  const node = world.getNodeAt(found.kind, found.x, found.y);

  world.harvestNode(found.kind, found.x, found.y);
  assert.equal(world.isHarvested("mineral", found.x, found.y), true);
  assert.deepEqual(world.findHarvestedMineralsNear(found.x, found.y, 2), [
    { x: found.x, y: found.y },
  ]);

  assert.equal(world.restoreMineral(found.x, found.y), true);
  assert.equal(world.isHarvested("mineral", found.x, found.y), false);

  const restored = world.getNodeAt("mineral", found.x, found.y);
  assert.ok(restored);
  assert.equal(restored.type, node.type);
  assert.equal(world.restoreMineral(found.x, found.y), false);
});

test("recolectar un arbusto lo deja sin bayas y elimina el nodo", () => {
  const world = new World("harvest-bush");
  const found = findNode(world, "bush");
  const node = world.getNodeAt(found.kind, found.x, found.y);

  assert.ok(node);
  assert.equal(node.kind, "bush");
  assert.equal(world.isBlockedAt(found.x, found.y), true);

  const harvested = world.harvestNode(found.kind, found.x, found.y);
  assert.ok(harvested);
  assert.equal(world.getNodeAt(found.kind, found.x, found.y), null);
  assert.equal(world.isBlockedAt(found.x, found.y), false);

  const index = found.chunk.index(found.node.localX, found.node.localY);
  assert.equal(found.chunk.bush[index], 0);
  assert.equal(found.chunk.pickedBushes.length, 1);
  assert.deepEqual(world.exportHarvested(), [
    { kind: "bush", x: found.x, y: found.y },
  ]);

  const twin = new World("harvest-bush");
  twin.loadHarvested([{ kind: "bush", x: found.x, y: found.y }]);
  const twinChunk = twin.getChunk(found.chunk.cx, found.chunk.cy);
  assert.equal(twinChunk.pickedBushes.length, 1);
  assert.equal(twin.getNodeAt("bush", found.x, found.y), null);
});

test("el overlay de nodos agotados se aplica al regenerar chunks", () => {
  const world = new World("harvest-reload");
  const found = findNode(world);
  world.harvestNode(found.kind, found.x, found.y);
  const exported = world.exportHarvested();

  const twin = new World("harvest-reload");
  twin.loadHarvested(exported);

  assert.equal(twin.getNodeAt(found.kind, found.x, found.y), null);
  const chunk = twin.getChunk(found.chunk.cx, found.chunk.cy);
  const list = found.kind === "tree" ? chunk.trees : chunk.minerals;
  const leftovers = found.kind === "tree" ? chunk.stumps : chunk.rubble;

  assert.equal(
    list.some(
      (entry) =>
        entry.localX === found.node.localX && entry.localY === found.node.localY,
    ),
    false,
  );
  assert.equal(leftovers.length, 1);

  if (found.kind === "mineral") {
    const index = chunk.index(found.node.localX, found.node.localY);
    assert.equal(chunk.mineral[index], 0);
  }
});

test("loadHarvested ignora entradas inválidas", () => {
  const world = new World("harvest-invalid");

  world.loadHarvested([
    null,
    { kind: "tree", x: 1, y: 2 },
    { kind: "roca", x: 3, y: 4 },
    { kind: "mineral", x: Number.NaN, y: 5 },
    { kind: "mineral", x: 7.9, y: 8.2 },
    "basura",
  ]);

  assert.equal(world.exportHarvested().length, 2);
  assert.ok(world.isHarvested("tree", 1, 2));
  assert.ok(world.isHarvested("mineral", 7, 8));
});

test("sanitizeSave migra v1 y valida el guardado v2", () => {
  const migrated = sanitizeSave({
    version: 1,
    seed: "deadbeef",
    camera: { x: 2.5, y: 3.5, zoom: 1 },
    savedAt: 123,
  });

  assert.equal(migrated.version, 2);
  assert.equal(migrated.worldBiomes, "legacy");
  assert.equal(migrated.characterSkin, "explorer");
  assert.equal(migrated.donkey, null);
  assert.deepEqual(migrated.observationNotes, []);
  assert.deepEqual(migrated.completedVillages, []);
  assert.deepEqual(migrated.player, {
    x: 2.5,
    y: 3.5,
    energy: 100,
    buffSeconds: 0,
    swimSeconds: 0,
  });
  assert.equal(migrated.inventory.capacity, 40);
  assert.deepEqual(migrated.inventory.tools, []);
  assert.deepEqual(migrated.inventory.items, {
    campfire: 0,
    bowl: 0,
    roastedBerries: 0,
    coffee: 0,
    oven: 0,
    brewingTable: 0,
    bandage: 0,
    chest: 0,
    tipi: 0,
    valla: 0,
    torch: 0,
    stoneWall: 0,
    stonePath: 0,
    bed: 0,
    cauldron: 0,
    healingPotion: 0,
    poisonPotion: 0,
    furyPotion: 0,
    resistancePotion: 0,
    unstablePotion: 0,
    pescado: 0,
    pescadoFrito: 0,
    swimPotion: 0,
    pan: 0,
    lunarWater: 0,
    starDust: 0,
    moonHealingPotion: 0,
    moonPoisonPotion: 0,
    arrow: 0,
  });
  assert.deepEqual(migrated.inventory.upgrades, []);
  assert.deepEqual(migrated.harvestedNodes, []);
  assert.deepEqual(migrated.campfires, []);
  assert.deepEqual(migrated.ovens, []);
  assert.deepEqual(migrated.brewingTables, []);
  assert.deepEqual(migrated.stones, []);
  assert.deepEqual(migrated.groundItems, []);
  assert.deepEqual(migrated.workers, []);
  assert.equal(migrated.savedAt, 123);

  const save = sanitizeSave({
    version: 2,
    seed: "cafebabe",
    worldBiomes: "expanded",
    characterSkin: "mage",
    donkey: { x: 1.5, y: 2.5, trust: 2, tamed: true, skinId: "pinto" },
    observationNotes: ["constellation:1", "constellation:1", "constellation:2"],
    completedVillages: ["village:forest"],
    sciencePoints: { tools: 120, weapons: 0, potions: 300, brews: 600 },
    investigations: [
      {
        objectId: "constellation:1",
        name: "Andromeda",
        category: "tools",
        day: 3,
        phase: "full",
        precision: 88,
      },
    ],
    lensXp: 200,
    lensLevel: 1,
    tradeRoutes: [
      {
        id: "route:1",
        originId: "village:forest",
        destinationId: "village:grass",
        goods: "madera",
        startedAt: 10,
        duration: 180,
        share: 0.22,
      },
    ],
    villageProgress: {
      "village:forest": {
        stability: 80,
        delivered: 4,
        allied: true,
        crafted: "potion:3:4",
        lastProduction: 12,
      },
    },
    camera: { x: 1, y: 2, zoom: 99 },
    player: { x: 4.5, y: 5.5, energy: 55, buffSeconds: 12 },
    inventory: {
      resources: { madera: 7, piedra: 2, oro: 9 },
      capacity: 60,
      tools: ["axe", "desconocida"],
      items: { campfire: 2, bowl: 4, coffee: 1, oro: 1 },
      upgrades: ["basket", "desconocida"],
    },
    harvestedNodes: [
      { kind: "tree", x: 1, y: 2 },
      { kind: "tree", x: 1, y: 2 },
      { kind: "mineral", x: -3, y: 4 },
      { kind: "bush", x: 2, y: 3 },
      { kind: "roca", x: 0, y: 0 },
      { kind: "mineral", x: 1.9, y: 2.9 },
    ],
    campfires: [
      { x: 1.5, y: 2.5 },
      { x: 1.5, y: 2.5 },
      { x: Number.NaN, y: 3 },
    ],
    ovens: [
      { x: 3.5, y: 4.5 },
      { x: 3.5, y: 4.5 },
    ],
    brewingTables: [{ x: 5.5, y: 6.5 }],
    stonePaths: [
      { x: 2.5, y: 3.5 },
      { x: 2.5, y: 3.5 },
      { x: 1.5, y: 2.5 },
      { x: Number.NaN, y: 3 },
    ],
    stones: [1, 7, 7, 99, "x"],
    groundItems: [
      { kind: "resource", key: "madera", amount: 5, x: 1.5, y: 2.5 },
      { kind: "item", key: "coffee", amount: 40, x: 3, y: 4 },
      { kind: "resource", key: "oro", amount: 1, x: 0, y: 0 },
      { kind: "tool", key: "axe", amount: 1, x: 0, y: 0 },
      { kind: "item", key: "coffee", amount: 1, x: Number.NaN, y: 0 },
    ],
    workers: [
      { name: "Tizón", x: 4.5, y: 6.5, task: { kind: "tree", x: 7, y: 8 } },
      { name: "", x: 5.5, y: 7.5, task: { kind: "roca", x: 1, y: 2 } },
      { x: Number.NaN, y: 0 },
      { name: "Musgo", x: 6.5, y: 8.5, task: null },
      { name: "Brasa", x: 7.5, y: 9.5, task: null },
      { name: "Junco", x: 8.5, y: 10.5, task: null },
    ],
    savedAt: 456,
  });

  assert.equal(save.camera.zoom, 2.4);
  assert.equal(save.worldBiomes, "expanded");
  assert.equal(save.characterSkin, "mage");
  assert.deepEqual(save.donkey, {
    x: 1.5,
    y: 2.5,
    trust: 2,
    tamed: true,
    skinId: "pinto",
  });
  assert.deepEqual(save.observationNotes, ["constellation:1", "constellation:2"]);
  assert.deepEqual(save.completedVillages, ["village:forest"]);
  assert.deepEqual(save.sciencePoints, {
    tools: 120,
    weapons: 0,
    potions: 300,
    brews: 600,
  });
  assert.equal(save.investigations[0].objectId, "constellation:1");
  assert.equal(save.investigations[0].precision, 88);
  assert.equal(save.lensXp, 200);
  assert.equal(save.tradeRoutes.length, 1);
  assert.equal(save.tradeRoutes[0].goods, "madera");
  assert.equal(save.villageProgress["village:forest"].allied, true);
  assert.equal(save.villageProgress["village:forest"].delivered, 4);
  assert.deepEqual(save.player, {
    x: 4.5,
    y: 5.5,
    energy: 55,
    buffSeconds: 12,
    swimSeconds: 0,
  });
  assert.equal(save.inventory.resources.madera, 7);
  assert.equal(save.inventory.resources.piedra, 2);
  assert.equal(save.inventory.resources.oro, 9);
  assert.equal(save.inventory.capacity, 60);
  assert.deepEqual(save.inventory.tools, ["axe"]);
  assert.deepEqual(save.inventory.items, {
    campfire: 2,
    bowl: 4,
    roastedBerries: 0,
    coffee: 1,
    oven: 0,
    brewingTable: 0,
    bandage: 0,
    chest: 0,
    tipi: 0,
    valla: 0,
    torch: 0,
    stoneWall: 0,
    stonePath: 0,
    bed: 0,
    cauldron: 0,
    healingPotion: 0,
    poisonPotion: 0,
    furyPotion: 0,
    resistancePotion: 0,
    unstablePotion: 0,
    pescado: 0,
    pescadoFrito: 0,
    swimPotion: 0,
    pan: 0,
    lunarWater: 0,
    starDust: 0,
    moonHealingPotion: 0,
    moonPoisonPotion: 0,
    arrow: 0,
  });
  assert.deepEqual(save.inventory.upgrades, ["basket"]);
  assert.deepEqual(save.harvestedNodes, [
    { kind: "tree", x: 1, y: 2 },
    { kind: "mineral", x: -3, y: 4 },
    { kind: "bush", x: 2, y: 3 },
    { kind: "mineral", x: 1, y: 2 },
  ]);
  assert.deepEqual(save.campfires, [{ x: 1.5, y: 2.5 }]);
  assert.deepEqual(save.ovens, [{ x: 3.5, y: 4.5 }]);
  assert.deepEqual(save.brewingTables, [{ x: 5.5, y: 6.5 }]);
  assert.deepEqual(save.stonePaths, [
    { x: 2.5, y: 3.5 },
    { x: 1.5, y: 2.5 },
  ]);
  assert.deepEqual(save.stones, [1, 7, 7]);
  assert.deepEqual(save.groundItems, [
    { kind: "resource", key: "madera", amount: 5, x: 1.5, y: 2.5 },
    { kind: "item", key: "coffee", amount: 32, x: 3, y: 4 },
    { kind: "resource", key: "oro", amount: 1, x: 0, y: 0 },
  ]);
  assert.equal(save.workers.length, 4);
  assert.deepEqual(save.workers[0], {
    name: "Tizón",
    x: 4.5,
    y: 6.5,
    task: { kind: "tree", x: 7, y: 8 },
    autoRepeat: false,
    autoRadius: 5,
  });
  assert.equal(save.workers[1].name, "Duende 2");
  assert.equal(save.workers[1].task, null);

  assert.equal(sanitizeSave(null), null);
  assert.equal(sanitizeSave({ seed: "", camera: { x: 0, y: 0 } }), null);
});

test("plantar árboles y hierba se guarda en el overlay del mundo", () => {
  const world = new World("plant-overlay", { biomeSet: "expanded" });
  world.plantNode("tree", 3, 4, { species: 0, variant: 2, scale: 1.1 });
  world.plantNode("grass", 4, 4, { variant: 1, scale: 1, style: "lush" });

  assert.ok(world.getNodeAt("tree", 3, 4));
  assert.ok(world.getNodeAt("grass", 4, 4));
  assert.equal(world.exportPlanted().length, 2);

  const twin = new World("plant-overlay", { biomeSet: "expanded" });
  twin.loadPlanted(world.exportPlanted());
  assert.equal(twin.getNodeAt("tree", 3, 4).species, 0);
  assert.equal(twin.getNodeAt("grass", 4, 4).style, "lush");
});

test("la colección de plumas saneada solo acepta aves conocidas", () => {
  const feathers = sanitizeFeathers({
    sparrow: 2,
    crow: 1,
    owl: 3,
    vulture: 4,
    fox: 99,
    sparrow2: 1,
  });

  assert.deepEqual(feathers, {
    vulture: 4,
    sparrow: 2,
    crow: 1,
    owl: 3,
  });
});

test("las capas de altura se pueden excavar, rellenar y guardar", () => {
  const world = new World("height-edit");
  const spawn = world.findSpawn();
  const x = Math.floor(spawn.x);
  const y = Math.floor(spawn.y);
  const before = world.heightAt(x, y);
  const dug = world.changeHeightAt(x, y, -1);
  assert.equal(dug, before - 1);
  const filled = world.changeHeightAt(x, y, 1);
  assert.equal(filled, before);
  world.changeHeightAt(x, y, 2);
  const exported = world.exportHeightEdits();
  assert.ok(exported.some((edit) => edit.x === x && edit.y === y));

  const twin = new World("height-edit");
  twin.loadHeightEdits(exported);
  assert.equal(twin.heightAt(x, y), before + 2);
  twin.setHeightAt(x, y, before);
  assert.equal(twin.heightAt(x, y), before);
});

test("la profundidad no baja del límite -70", () => {
  const world = new World("deep-limit");
  const spawn = world.findSpawn();
  const x = Math.floor(spawn.x);
  const y = Math.floor(spawn.y);
  world.setHeightAt(x, y, -200);
  assert.equal(world.heightAt(x, y), -70);
  world.changeHeightAt(x, y, -1);
  assert.equal(world.heightAt(x, y), -70);
});
