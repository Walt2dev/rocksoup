import assert from "node:assert/strict";
import test from "node:test";

import { Component } from "../js/ecs/components.js";
import { EntityWorld } from "../js/ecs/ecs.js";
import { createWorkerEntity } from "../js/game/entityFactory.js";
import {
  DEFAULT_CAPACITY,
  Inventory,
  MAX_STACK,
  RESOURCE_KEYS,
} from "../js/game/inventory.js";
import { adjacentTiles, findPath, pathToCenters } from "../js/game/pathfinding.js";
import {
  GATHER_RANGE,
  NODE_KIND,
  gatherDuration,
  harvestEnergyCost,
  harvestYields,
  isNodeKind,
  nodeKey,
  totalYield,
} from "../js/game/resources.js";

test("cada recurso ocupa un espacio y se apila hasta 32 unidades", () => {
  const inventory = new Inventory({ capacity: 3 });

  assert.equal(inventory.total(), 0);
  assert.equal(inventory.slotsUsed(), 0);
  assert.equal(inventory.freeSpace(), 3);
  assert.equal(inventory.add("madera", 40), MAX_STACK);
  assert.equal(inventory.add("piedra", 5), 5);
  assert.equal(inventory.add("agua", 2), 2);
  assert.equal(inventory.slotsUsed(), 3);
  assert.equal(inventory.freeSpace(), 0);
  assert.equal(inventory.add("bayas", 1), 0);
  assert.equal(inventory.add("madera", 1), 0);
  assert.equal(inventory.total(), MAX_STACK + 7);

  assert.equal(inventory.canAdd("bayas", 1), 0);
  assert.equal(inventory.canAddAll({ bayas: 1 }), false);
  assert.equal(inventory.canAddAll({ madera: 1 }), false);
  assert.equal(inventory.canAddAll({ piedra: 1 }), true);
});

test("los objetos también se apilan hasta 32 y respetan los espacios", () => {
  const inventory = new Inventory({ capacity: 2 });

  assert.equal(inventory.addItem("bowl", 40), MAX_STACK);
  assert.equal(inventory.itemCount("bowl"), MAX_STACK);
  assert.equal(inventory.addItem("bowl", 1), 0);
  assert.equal(inventory.addItem("coffee", 1), 1);
  assert.equal(inventory.addItem("campfire", 1), 0);
  assert.equal(inventory.slotsUsed(), 2);
  assert.equal(inventory.removeItem("bowl", MAX_STACK), MAX_STACK);
  assert.equal(inventory.addItem("campfire", 1), 1);
  assert.equal(inventory.slotsUsed(), 2);
});

test("el inventario elimina, gasta costes de forma atómica y valida recursos", () => {
  const inventory = new Inventory({ resources: { madera: 5, piedra: 2 } });

  assert.equal(inventory.remove("madera", 2), 2);
  assert.equal(inventory.count("madera"), 3);
  assert.equal(inventory.has({ madera: 3, piedra: 2 }), true);
  assert.equal(inventory.has({ madera: 4, piedra: 2 }), false);
  assert.equal(inventory.spend({ madera: 4, piedra: 1 }), false);
  assert.equal(inventory.count("madera"), 3);
  assert.equal(inventory.count("piedra"), 2);
  assert.equal(inventory.spend({ madera: 2, piedra: 1 }), true);
  assert.equal(inventory.count("madera"), 1);
  assert.equal(inventory.count("piedra"), 1);
  assert.throws(() => inventory.add("plata", 1), Error);
  assert.equal(inventory.remove("plata", 1), 0);
});

test("capacidad, herramientas y serialización del inventario", () => {
  const inventory = new Inventory({ capacity: DEFAULT_CAPACITY });
  inventory.setCapacity(60);
  assert.equal(inventory.capacity, 60);
  assert.equal(inventory.hasTool("axe"), false);
  assert.equal(inventory.addTool("axe"), true);
  assert.equal(inventory.addTool("desconocida"), false);
  assert.equal(inventory.hasTool("axe"), true);

  const parsed = Inventory.fromJSON(inventory.toJSON());
  assert.deepEqual(parsed.toJSON(), inventory.toJSON());
  assert.deepEqual(RESOURCE_KEYS.includes("madera"), true);
  assert.deepEqual(RESOURCE_KEYS.includes("Cu"), true);

  const bad = Inventory.fromJSON(null);
  assert.equal(bad.total(), 0);
  assert.equal(bad.capacity, DEFAULT_CAPACITY);
});

test("los nodos y sus rendimientos dependen de la herramienta", () => {
  assert.equal(isNodeKind(NODE_KIND.TREE), true);
  assert.equal(isNodeKind(NODE_KIND.BUSH), true);
  assert.equal(isNodeKind("otro"), false);
  assert.equal(nodeKey("tree", 3, -4), "tree:3:-4");
  assert.ok(GATHER_RANGE > 0);

  const hand = new Set();
  const axe = new Set(["axe"]);
  const pickaxe = new Set(["pickaxe"]);

  assert.equal(gatherDuration(NODE_KIND.TREE, hand), 2.6);
  assert.equal(gatherDuration(NODE_KIND.TREE, axe), 1.3);
  assert.equal(gatherDuration(NODE_KIND.MINERAL, hand), 3.4);
  assert.equal(gatherDuration(NODE_KIND.MINERAL, pickaxe), 1.7);
  assert.equal(harvestEnergyCost(NODE_KIND.TREE), 6);
  assert.equal(harvestEnergyCost(NODE_KIND.MINERAL), 8);
  assert.equal(gatherDuration(NODE_KIND.BUSH, hand), 2);
  assert.equal(harvestEnergyCost(NODE_KIND.BUSH), 4);
  assert.deepEqual(harvestYields(NODE_KIND.BUSH, {}, hand), { bayas: 3, fibra: 1 });
  assert.deepEqual(harvestYields(NODE_KIND.BUSH, { style: "dry" }, hand), {
    fibra: 3,
  });
  assert.deepEqual(harvestYields(NODE_KIND.BUSH, { style: "jungle" }, hand), {
    bayas: 4,
    fibra: 2,
  });
  assert.deepEqual(harvestYields(NODE_KIND.TREE, { species: 3 }, hand), {
    fibra: 2,
    bayas: 1,
    semillaArbol: 1,
  });
  assert.deepEqual(harvestYields(NODE_KIND.GRASS, {}, hand), {
    semillaHierba: 2,
    semillaTrigo: 1,
    fibra: 1,
  });
  assert.deepEqual(harvestYields(NODE_KIND.GRASS, { style: "lush" }, hand), {
    semillaHierba: 2,
    semillaMaiz: 1,
    fibra: 1,
  });

  assert.deepEqual(harvestYields(NODE_KIND.TREE, {}, hand), {
    madera: 2,
    semillaArbol: 1,
  });
  assert.deepEqual(harvestYields(NODE_KIND.TREE, {}, axe), {
    madera: 3,
    semillaArbol: 1,
  });
  assert.deepEqual(harvestYields(NODE_KIND.MINERAL, { type: 1 }, hand), { piedra: 1 });
  assert.deepEqual(harvestYields(NODE_KIND.MINERAL, { type: 1 }, pickaxe), {
    piedra: 1,
    Fe: 1,
  });
  assert.deepEqual(harvestYields(NODE_KIND.MINERAL, { type: 10 }, pickaxe), {
    piedra: 1,
    oro: 1,
  });
  assert.equal(totalYield({ madera: 2, piedra: 1 }), 3);
});

function assertValidPath(path, startX, startY, goalX, goalY, isWalkable) {
  assert.ok(Array.isArray(path));
  let previous = { x: startX, y: startY };

  for (const step of path) {
    const dx = Math.abs(step.x - previous.x);
    const dy = Math.abs(step.y - previous.y);
    assert.ok(dx <= 1 && dy <= 1 && dx + dy > 0, "paso no adyacente");
    assert.ok(isWalkable(step.x, step.y), "paso sobre tile bloqueado");
    if (dx === 1 && dy === 1) {
      assert.ok(isWalkable(previous.x + dx, previous.y), "corta esquina en x");
      assert.ok(isWalkable(previous.x, previous.y + dy), "corta esquina en y");
    }
    previous = step;
  }

  assert.deepEqual(previous, { x: goalX, y: goalY });
}

test("la fábrica crea duendes con sus componentes básicos", () => {
  const ecs = new EntityWorld();
  const id = createWorkerEntity(ecs, { x: 2.5, y: 3.5, name: "Tizón" });
  const transform = ecs.getComponent(id, Component.TRANSFORM);
  const worker = ecs.getComponent(id, Component.WORKER);
  const motion = ecs.getComponent(id, Component.MOTION);

  assert.deepEqual(transform, { x: 2.5, y: 3.5, z: 0 });
  assert.equal(worker.name, "Tizón");
  assert.equal(worker.state, "idle");
  assert.equal(worker.task, null);
  assert.ok(motion.speed > 0);
  assert.equal(ecs.getComponent(id, Component.RENDER).kind, "worker");
  assert.deepEqual(ecs.query(Component.WORKER), [id]);
});

test("A* encuentra rutas válidas y evita obstáculos", () => {
  const blocked = new Set();
  for (let y = -5; y <= 5; y += 1) {
    if (y !== 2) {
      blocked.add(`2,${y}`);
    }
  }
  const isWalkable = (x, y) => !blocked.has(`${x},${y}`);

  const path = findPath({
    startX: 0,
    startY: 0,
    goalX: 4,
    goalY: 0,
    isWalkable,
  });

  assert.ok(path);
  assert.ok(path.length > 4);
  assertValidPath(path, 0, 0, 4, 0, isWalkable);
  assert.deepEqual(pathToCenters(path)[0], { x: path[0].x + 0.5, y: path[0].y + 0.5 });
});

test("A* no corta esquinas y devuelve null si es inalcanzable", () => {
  const blocked = new Set(["1,0", "0,1", "2,2", "2,1", "1,2", "2,0", "0,2", "-1,0", "-1,1", "0,-1", "1,-1", "-1,-1"]);
  const isWalkable = (x, y) => !blocked.has(`${x},${y}`);

  assert.equal(
    findPath({ startX: 0, startY: 0, goalX: 1, goalY: 1, isWalkable }),
    null,
  );
});

test("A* maneja inicio igual al objetivo, límites y vecinos", () => {
  const isWalkable = () => true;

  assert.deepEqual(
    findPath({ startX: 3, startY: 3, goalX: 3, goalY: 3, isWalkable }),
    [],
  );
  assert.equal(
    findPath({ startX: 0, startY: 0, goalX: 40, goalY: 0, isWalkable, maxNodes: 5 }),
    null,
  );
  assert.equal(
    findPath({ startX: 0, startY: 0, goalX: 1, goalY: 1, isWalkable: () => false }),
    null,
  );
  assert.equal(adjacentTiles(5, 5).length, 8);

  assert.throws(
    () => findPath({ startX: 0.5, startY: 0, goalX: 1, goalY: 1, isWalkable }),
    TypeError,
  );
  assert.throws(
    () => findPath({ startX: 0, startY: 0, goalX: 1, goalY: 1 }),
    TypeError,
  );
});

test("A* respeta desniveles de un bloque y bloquea paredes", () => {
  const heights = new Map([
    ["0,0", 0],
    ["1,0", 1],
    ["2,0", 2],
    ["1,1", 2],
  ]);
  const isWalkable = () => true;
  const getHeight = (x, y) => heights.get(`${x},${y}`) ?? 0;

  const path = findPath({
    startX: 0,
    startY: 0,
    goalX: 2,
    goalY: 0,
    isWalkable,
    getHeight,
    maxStepHeight: 1,
  });

  assert.ok(path);
  assert.deepEqual(path.at(-1), { x: 2, y: 0 });

  const blocked = findPath({
    startX: 0,
    startY: 0,
    goalX: 1,
    goalY: 0,
    isWalkable,
    getHeight: (x, y) => (x === 1 && y === 0 ? 3 : 0),
    maxStepHeight: 1,
  });
  assert.equal(blocked, null);
});

test("A* permite caer pero limita la subida", () => {
  const getHeight = (x, y) => (y === 0 ? 0 : -5);
  const path = findPath({
    startX: 0,
    startY: 0,
    goalX: 0,
    goalY: 1,
    isWalkable: () => true,
    getHeight,
    maxStepHeight: 1,
    maxDropHeight: Infinity,
  });

  assert.ok(path);
  assert.deepEqual(path.at(-1), { x: 0, y: 1 });

  const blockedDrop = findPath({
    startX: 0,
    startY: 0,
    goalX: 0,
    goalY: 1,
    isWalkable: () => true,
    getHeight,
    maxStepHeight: 1,
    maxDropHeight: 2,
  });
  assert.equal(blockedDrop, null);
});
