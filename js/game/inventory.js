export const RESOURCE_INFO = Object.freeze({
  madera: Object.freeze({ label: "Madera", color: "#b98a4e", symbol: "M" }),
  tierra: Object.freeze({ label: "Tierra", color: "#8a6541", symbol: "T" }),
  piedra: Object.freeze({ label: "Piedra", color: "#8b929b", symbol: "P" }),
  bayas: Object.freeze({ label: "Bayas", color: "#9b5f92", symbol: "B" }),
  agua: Object.freeze({ label: "Agua", color: "#5aa6c9", symbol: "A" }),
  fibra: Object.freeze({ label: "Fibra", color: "#c9b37a", symbol: "F" }),
  semillaHierba: Object.freeze({ label: "Semilla de hierba", color: "#8fbd69", symbol: "SH" }),
  semillaArbol: Object.freeze({ label: "Semilla de árbol", color: "#7c9f55", symbol: "SA" }),
  semillaTrigo: Object.freeze({ label: "Semilla de trigo", color: "#d8c46a", symbol: "ST" }),
  semillaMaiz: Object.freeze({ label: "Semilla de maíz", color: "#e0b85e", symbol: "SM" }),
  trigo: Object.freeze({ label: "Trigo", color: "#d8c46a", symbol: "Tr" }),
  maiz: Object.freeze({ label: "Maíz", color: "#e0b85e", symbol: "Mz" }),
  pluma: Object.freeze({ label: "Pluma", color: "#d8e0ea", symbol: "Pl" }),
  amatista: Object.freeze({ label: "Amatista", color: "#a06bd8", symbol: "Am" }),
  cuarzo: Object.freeze({ label: "Cuarzo", color: "#d8e8f0", symbol: "Cz" }),
  C: Object.freeze({ label: "Carbón", color: "#555158", symbol: "C" }),
  Fe: Object.freeze({ label: "Hierro", color: "#c9865f", symbol: "Fe" }),
  Ca: Object.freeze({ label: "Calcio", color: "#e0d9c2", symbol: "Ca" }),
  Mg: Object.freeze({ label: "Magnesio", color: "#9bb88c", symbol: "Mg" }),
  Zn: Object.freeze({ label: "Zinc", color: "#9cb0c9", symbol: "Zn" }),
  Si: Object.freeze({ label: "Silicio", color: "#a8adb5", symbol: "Si" }),
  Cu: Object.freeze({ label: "Cobre", color: "#7fb9ab", symbol: "Cu" }),
  oro: Object.freeze({ label: "Oro", color: "#e0b84f", symbol: "O" }),
  piel: Object.freeze({ label: "Piel de zorro", color: "#c97d45", symbol: "Pz" }),
  pielLobo: Object.freeze({ label: "Piel de lobo", color: "#8b97a8", symbol: "PL" }),
  huesoPollo: Object.freeze({ label: "Hueso de pollo", color: "#e8dfc8", symbol: "Hp" }),
  telarana: Object.freeze({ label: "Tela de ara\u00F1a", color: "#cfd6e6", symbol: "Ta" }),
});

export const RESOURCE_KEYS = Object.freeze(Object.keys(RESOURCE_INFO));
export const TOOL_INFO = Object.freeze({
  axe: Object.freeze({ label: "Hacha de piedra", short: "Hacha", symbol: "A" }),
  pickaxe: Object.freeze({ label: "Pico de piedra", short: "Pico", symbol: "P" }),
  spear: Object.freeze({ label: "Lanza de piedra", short: "Lanza", symbol: "L" }),
  knife: Object.freeze({ label: "Cuchillo de piedra", short: "Cuchillo", symbol: "C" }),
  fishingRod: Object.freeze({ label: "Caña de pescar", short: "Caña", symbol: "Ca" }),
  hoe: Object.freeze({ label: "Azada", short: "Azada", symbol: "Z" }),
  sword: Object.freeze({ label: "Espada de piedra", short: "Espada", symbol: "E" }),
  bow: Object.freeze({ label: "Arco de madera", short: "Arco", symbol: "Ar" }),
  binoculars: Object.freeze({
    label: "Prismáticos",
    short: "Prismáticos",
    symbol: "Pr",
  }),
});
export const TOOL_KEYS = Object.freeze(Object.keys(TOOL_INFO));

export const ITEM_INFO = Object.freeze({
  campfire: Object.freeze({ label: "Fogata", symbol: "Fg" }),
  bowl: Object.freeze({ label: "Tazón de madera", symbol: "Tz" }),
  roastedBerries: Object.freeze({ label: "Bayas tostadas", symbol: "BT" }),
  coffee: Object.freeze({ label: "Café", symbol: "Cf" }),
  oven: Object.freeze({ label: "Horno", symbol: "H" }),
  brewingTable: Object.freeze({ label: "Mesa de brebajes", symbol: "MB" }),
  bandage: Object.freeze({ label: "Venda de fibras", symbol: "Vd" }),
  chest: Object.freeze({ label: "Cofre de madera", symbol: "Co" }),
  tipi: Object.freeze({ label: "Tipi de piel", symbol: "Tp" }),
  valla: Object.freeze({ label: "Valla de madera", symbol: "Vl" }),
  torch: Object.freeze({ label: "Antorcha", symbol: "An" }),
  stoneWall: Object.freeze({ label: "Muro de piedra", symbol: "Mp" }),
  stonePath: Object.freeze({ label: "Camino de piedras", symbol: "Cp" }),
  bed: Object.freeze({ label: "Cama de piel", symbol: "Cm" }),
  cauldron: Object.freeze({ label: "Caldero", symbol: "Cl" }),
  healingPotion: Object.freeze({ label: "Poción de curación", symbol: "PC" }),
  poisonPotion: Object.freeze({ label: "Poción de veneno", symbol: "PV" }),
  furyPotion: Object.freeze({ label: "Poción de furia", symbol: "PF" }),
  resistancePotion: Object.freeze({ label: "Poción de resistencia", symbol: "PR" }),
  unstablePotion: Object.freeze({ label: "Poción inestable", symbol: "PI" }),
  pescado: Object.freeze({ label: "Pescado", symbol: "Pe" }),
  pescadoFrito: Object.freeze({ label: "Pescado frito", symbol: "PFr" }),
  swimPotion: Object.freeze({ label: "Poción de nado", symbol: "PN" }),
  pan: Object.freeze({ label: "Pan de trigo", symbol: "Pa" }),
  lunarWater: Object.freeze({ label: "Agua lunar", symbol: "AL" }),
  starDust: Object.freeze({ label: "Polvo estelar", symbol: "PE" }),
  moonHealingPotion: Object.freeze({ label: "Brebaje lunar de curación", symbol: "LC" }),
  moonPoisonPotion: Object.freeze({ label: "Brebaje lunar de sombra", symbol: "LS" }),
  arrow: Object.freeze({ label: "Flecha", symbol: "Fl" }),
  wolfTotem: Object.freeze({ label: "Tótem de lobo", symbol: "Tl" }),
});
export const ITEM_KEYS = Object.freeze(Object.keys(ITEM_INFO));

export const UPGRADE_INFO = Object.freeze({
  basket: Object.freeze({ label: "Cesta de madera" }),
  leatherPack: Object.freeze({ label: "Mochila de piel" }),
  leatherArmor: Object.freeze({ label: "Armadura de piel" }),
  wolfCloak: Object.freeze({ label: "Capa de piel de lobo" }),
  veinRestorer: Object.freeze({ label: "Restaurador de vetas" }),
});
export const UPGRADE_KEYS = Object.freeze(Object.keys(UPGRADE_INFO));

export const DEFAULT_CAPACITY = 40;
export const MAX_STACK = 32;

const MAX_CAPACITY = 9999;

function clampInt(value, min, max, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(value)));
}

export class Inventory {
  constructor({
    resources = {},
    capacity = DEFAULT_CAPACITY,
    tools = [],
    items = {},
    upgrades = [],
  } = {}) {
    this.resources = {};

    for (const key of RESOURCE_KEYS) {
      this.resources[key] = clampInt(resources[key], 0, MAX_STACK, 0);
    }

    this.items = {};
    for (const key of ITEM_KEYS) {
      this.items[key] = clampInt(items[key], 0, MAX_STACK, 0);
    }

    this.capacity = clampInt(capacity, 1, MAX_CAPACITY, DEFAULT_CAPACITY);
    this.tools = new Set(TOOL_KEYS.filter((key) => tools.includes(key)));
    this.upgrades = new Set(UPGRADE_KEYS.filter((key) => upgrades.includes(key)));
  }

  count(key) {
    return this.resources[key] ?? 0;
  }

  total() {
    let total = 0;
    for (const key of RESOURCE_KEYS) {
      total += this.resources[key];
    }
    for (const key of ITEM_KEYS) {
      total += this.items[key];
    }
    return total;
  }

  slotsUsed() {
    let used = this.tools.size;

    for (const key of RESOURCE_KEYS) {
      if (this.resources[key] > 0) {
        used += 1;
      }
    }
    for (const key of ITEM_KEYS) {
      if (this.items[key] > 0) {
        used += 1;
      }
    }

    return used;
  }

  freeSpace() {
    return Math.max(0, this.capacity - this.slotsUsed());
  }

  canAdd(key, amount) {
    if (!(key in RESOURCE_INFO)) {
      return 0;
    }

    const current = this.resources[key];
    const requested = clampInt(amount, 0, MAX_STACK, 0);

    if (current === 0 && this.slotsUsed() >= this.capacity) {
      return 0;
    }

    return Math.min(requested, MAX_STACK - current);
  }

  add(key, amount) {
    if (!(key in RESOURCE_INFO)) {
      throw new Error(`Recurso desconocido: ${key}`);
    }

    const requested = clampInt(amount, 0, MAX_STACK, 0);
    const added = this.canAdd(key, requested);
    this.resources[key] += added;
    return added;
  }

  canAddAll(resources) {
    const nextUsed = this.slotsUsed();
    const newTypes = new Set();

    for (const [key, amount] of Object.entries(resources)) {
      if (!(key in RESOURCE_INFO)) {
        return false;
      }
      const current = this.resources[key];
      if (current === 0 && !newTypes.has(key)) {
        newTypes.add(key);
        if (nextUsed + newTypes.size > this.capacity) {
          return false;
        }
      }
      if (current + amount > MAX_STACK) {
        return false;
      }
    }

    return true;
  }

  remove(key, amount) {
    if (!(key in RESOURCE_INFO)) {
      return 0;
    }

    const requested = clampInt(amount, 0, MAX_STACK, 0);
    const removed = Math.min(requested, this.resources[key]);
    this.resources[key] -= removed;
    return removed;
  }

  has(costs) {
    for (const [key, amount] of Object.entries(costs)) {
      if (this.count(key) < amount) {
        return false;
      }
    }
    return true;
  }

  spend(costs) {
    if (!this.has(costs)) {
      return false;
    }

    for (const [key, amount] of Object.entries(costs)) {
      this.resources[key] -= amount;
    }

    return true;
  }

  setCapacity(capacity) {
    this.capacity = clampInt(capacity, 1, MAX_CAPACITY, this.capacity);
  }

  hasTool(key) {
    return this.tools.has(key);
  }

  addTool(key) {
    if (!(key in TOOL_INFO)) {
      return false;
    }
    this.tools.add(key);
    return true;
  }

  itemCount(key) {
    return this.items[key] ?? 0;
  }

  addItem(key, amount = 1) {
    if (!(key in ITEM_INFO)) {
      return 0;
    }

    const current = this.items[key];
    if (current === 0 && this.slotsUsed() >= this.capacity) {
      return 0;
    }

    const requested = clampInt(amount, 0, MAX_STACK, 0);
    const added = Math.min(requested, MAX_STACK - current);
    this.items[key] += added;
    return added;
  }

  removeItem(key, amount = 1) {
    if (!(key in ITEM_INFO)) {
      return 0;
    }
    const removed = Math.min(clampInt(amount, 0, MAX_STACK, 0), this.items[key]);
    this.items[key] -= removed;
    return removed;
  }

  hasUpgrade(key) {
    return this.upgrades.has(key);
  }

  addUpgrade(key) {
    if (!(key in UPGRADE_INFO)) {
      return false;
    }
    this.upgrades.add(key);
    return true;
  }

  toJSON() {
    return {
      resources: { ...this.resources },
      capacity: this.capacity,
      tools: [...this.tools],
      items: { ...this.items },
      upgrades: [...this.upgrades],
    };
  }

  static fromJSON(value) {
    if (!value || typeof value !== "object") {
      return new Inventory();
    }

    return new Inventory({
      resources: value.resources ?? {},
      capacity: value.capacity,
      tools: Array.isArray(value.tools) ? value.tools : [],
      items: value.items ?? {},
      upgrades: Array.isArray(value.upgrades) ? value.upgrades : [],
    });
  }
}
