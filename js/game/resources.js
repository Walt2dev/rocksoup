import { mineralById } from "../world/minerals.js";

export const NODE_KIND = Object.freeze({
  TREE: "tree",
  MINERAL: "mineral",
  BUSH: "bush",
  GRASS: "grass",
});

export const GATHER_RANGE = 1.5;

const HAND_DURATION = Object.freeze({
  tree: 2.6,
  mineral: 3.4,
  bush: 2,
  grass: 1.2,
});

const ENERGY_COST = Object.freeze({
  tree: 6,
  mineral: 8,
  bush: 4,
  grass: 2,
});

export function nodeKey(kind, x, y) {
  return `${kind}:${x}:${y}`;
}

export function isNodeKind(kind) {
  return (
    kind === NODE_KIND.TREE ||
    kind === NODE_KIND.MINERAL ||
    kind === NODE_KIND.BUSH ||
    kind === NODE_KIND.GRASS
  );
}

export function gatherDuration(kind, tools = new Set()) {
  const base = HAND_DURATION[kind] ?? 3;
  if (kind === NODE_KIND.TREE && tools.has("axe")) {
    return base / 2;
  }
  if (kind === NODE_KIND.MINERAL && tools.has("pickaxe")) {
    return base / 2;
  }
  if (kind === NODE_KIND.BUSH && tools.has("knife")) {
    return base / 1.6;
  }
  return base;
}

export function harvestEnergyCost(kind) {
  return ENERGY_COST[kind] ?? 5;
}

export function harvestYields(kind, node, tools = new Set()) {
  if (kind === NODE_KIND.TREE) {
    if (node?.species === 3) {
      return {
        fibra: 2 + (tools.has("axe") ? 1 : 0),
        bayas: 1,
        semillaArbol: 1,
      };
    }

    return {
      madera: 2 + (tools.has("axe") ? 1 : 0),
      semillaArbol: 1,
    };
  }

  if (kind === NODE_KIND.MINERAL) {
    const yields = { piedra: 1 };
    const mineral = mineralById(node?.type);

    if (mineral && tools.has("pickaxe")) {
      yields[mineral.key] = 1;
    }

    return yields;
  }

  if (kind === NODE_KIND.BUSH) {
    if (node?.style === "dry") {
      return { fibra: 3 + (tools.has("knife") ? 1 : 0) };
    }

    if (node?.style === "jungle") {
      return {
        bayas: 4 + (tools.has("knife") ? 1 : 0),
        fibra: 2,
      };
    }

    return {
      bayas: 3 + (tools.has("knife") ? 1 : 0),
      fibra: 1 + (tools.has("knife") ? 1 : 0),
    };
  }

  if (kind === NODE_KIND.GRASS) {
    if (node?.style === "lush") {
      return { semillaHierba: 2, semillaMaiz: 1, fibra: 1 };
    }

    if (node?.style === "dry") {
      return { semillaHierba: 2, fibra: 1 };
    }

    return { semillaHierba: 2, semillaTrigo: 1, fibra: 1 };
  }

  return {};
}

export function totalYield(yields) {
  let total = 0;
  for (const amount of Object.values(yields)) {
    total += amount;
  }
  return total;
}
