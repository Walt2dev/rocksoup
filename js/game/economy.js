export const ECONOMY_CURRENCIES = Object.freeze({
  drac: Object.freeze({
    id: "drac",
    label: "DracCoins",
    short: "DC",
    icon: "🪙",
    suffix: "DracCoins",
  }),
  prestige: Object.freeze({
    id: "prestige",
    label: "Prestigio",
    short: "PR",
    icon: "★",
    suffix: "Prestigio",
  }),
  essence: Object.freeze({
    id: "essence",
    label: "Esencias",
    short: "ES",
    icon: "✧",
    suffix: "Esencias",
  }),
});

export const STARTING_WALLET = Object.freeze({
  dracCoins: 300,
  prestige: 0,
});

export const MAX_WALLET_VALUE = 1000000000;

export const ECONOMY_REWARDS = Object.freeze({
  village_allied: Object.freeze({
    label: "Alianza de aldea",
    drac: 120,
    prestige: 25,
    dedupe: true,
  }),
  village_production: Object.freeze({
    label: "Producción de aldea",
    drac: 5,
    dailyCap: 100,
  }),
  wolf_cave: Object.freeze({
    label: "Cueva de lobos",
    drac: 250,
    prestige: 60,
    essence: 5,
    dedupe: true,
  }),
  bird_mission: Object.freeze({
    label: "Misión de aves",
    drac: 150,
    prestige: 40,
    essence: 3,
    dedupe: true,
  }),
  constellation: Object.freeze({
    label: "Constelación descubierta",
    drac: 40,
    prestige: 10,
    essence: 2,
    dedupe: true,
  }),
  bird_species: Object.freeze({
    label: "Ave descubierta",
    drac: 10,
    prestige: 3,
    essence: 1,
    dedupe: true,
  }),
  pvp_kill: Object.freeze({
    label: "Baja PvP",
    drac: 3,
    prestige: 1,
    dailyCap: 60,
  }),
  pvp_win: Object.freeze({
    label: "Victoria PvP",
    drac: 50,
    prestige: 20,
    dedupe: true,
  }),
  craft_new: Object.freeze({
    label: "Receta nueva",
    drac: 8,
    prestige: 2,
    essence: 1,
    dedupe: true,
  }),
  craft_repeat: Object.freeze({
    label: "Fabricación",
    drac: 1,
    dailyCap: 200,
  }),
  daily_objective: Object.freeze({
    label: "Objetivo diario",
    drac: 50,
    prestige: 10,
    essence: 5,
    daily: true,
  }),
});

const DAY_MS = 24 * 60 * 60 * 1000;

export function economyDayKey(now = Date.now()) {
  return Math.floor(now / DAY_MS);
}

export function rewardFor(kind) {
  return ECONOMY_REWARDS[kind] ?? null;
}

export function rewardCurrencies(rule) {
  return {
    dracCoins: Math.max(0, Math.floor(Number(rule?.drac) || 0)),
    prestige: Math.max(0, Math.floor(Number(rule?.prestige) || 0)),
    essences: Math.max(0, Math.floor(Number(rule?.essence) || 0)),
  };
}

function product(entry) {
  return Object.freeze({
    kind: "one_time",
    highlights: Object.freeze([]),
    ...entry,
    price: Object.freeze({
      currency: entry.price?.currency ?? "drac",
      amount: Math.max(0, Math.floor(Number(entry.price?.amount) || 0)),
    }),
    grants: Object.freeze(entry.grants ?? {}),
  });
}

export const ECONOMY_PRODUCTS = Object.freeze([
  product({
    id: "energy_small",
    name: "Poción de energía",
    description: "Recupera 25 de energía al instante en tu mundo.",
    category: "resources",
    price: { currency: "drac", amount: 120 },
    icon: "⚡",
    badge: "Instantáneo",
    grants: { energy: 25 },
  }),
  product({
    id: "coal_small",
    name: "Puñado de carbón",
    description: "20 de carbón para la fogata o el horno.",
    category: "resources",
    price: { currency: "drac", amount: 150 },
    icon: "🪨",
    grants: { resources: { C: 20 } },
  }),
  product({
    id: "tool_axe",
    name: "Hacha de piedra",
    description: "Herramienta básica para talar árboles y conseguir madera.",
    category: "equipment",
    price: { currency: "drac", amount: 300 },
    icon: "🪓",
    grants: { tools: ["axe"] },
  }),
  product({
    id: "tool_pickaxe",
    name: "Pico de piedra",
    description: "Herramienta para minar vetas y conseguir minerales.",
    category: "equipment",
    price: { currency: "drac", amount: 300 },
    icon: "⛏️",
    grants: { tools: ["pickaxe"] },
  }),
  product({
    id: "tool_fishing_rod",
    name: "Caña de pescar",
    description: "Pesca en ríos y lagos para conseguir comida.",
    category: "equipment",
    price: { currency: "drac", amount: 300 },
    icon: "🎣",
    grants: { tools: ["fishingRod"] },
  }),
  product({
    id: "tool_bow",
    name: "Arco de madera",
    description: "Arma a distancia para cazar y defenderte.",
    category: "equipment",
    price: { currency: "drac", amount: 500 },
    icon: "🏹",
    grants: { tools: ["bow"] },
  }),
  product({
    id: "adventurer_pack",
    name: "Pack Aventurero",
    description: "Recursos, energía y un hacha para empezar con ventaja.",
    category: "resources",
    price: { currency: "drac", amount: 900 },
    icon: "🎒",
    badge: "Pack",
    grants: {
      resources: { C: 40, Fe: 20, oro: 10, bayas: 30, trigo: 30 },
      energy: 50,
      tools: ["axe"],
    },
  }),
  product({
    id: "energy_full",
    name: "Energía llena",
    description: "Recupera al instante 100 puntos de energía para seguir explorando.",
    category: "resources",
    price: { currency: "drac", amount: 400 },
    icon: "⚡",
    badge: "Instantáneo",
    grants: { energy: 100 },
  }),
  product({
    id: "coal_pack",
    name: "Cofre de carbón",
    description: "120 de carbón para fundir, cocinar y alimentar tus talleres.",
    category: "resources",
    price: { currency: "drac", amount: 600 },
    icon: "🪨",
    grants: { resources: { C: 120 } },
  }),
  product({
    id: "iron_pack",
    name: "Cofre de hierro",
    description: "80 de hierro para herramientas, armaduras y construcciones.",
    category: "resources",
    price: { currency: "drac", amount: 800 },
    icon: "⛏️",
    grants: { resources: { Fe: 80 } },
  }),
  product({
    id: "gold_pack",
    name: "Cofre de oro",
    description: "60 de oro para comerciar con las aldeas y acelerar tu feudo.",
    category: "resources",
    price: { currency: "drac", amount: 900 },
    icon: "🪙",
    grants: { resources: { oro: 60 } },
  }),
  product({
    id: "food_pack",
    name: "Despensa del feudo",
    description: "150 alimentos variados y 10 pescados para tus trabajadores.",
    category: "resources",
    price: { currency: "drac", amount: 600 },
    icon: "🍞",
    grants: {
      resources: { bayas: 50, trigo: 50, maiz: 50 },
      items: { pescado: 10 },
    },
  }),
  product({
    id: "feudo_chest",
    name: "Cofre del Feudo",
    description: "Un botín equilibrado: carbón, hierro, oro y comida para toda la colonia.",
    category: "resources",
    price: { currency: "drac", amount: 1500 },
    icon: "🎁",
    badge: "Mejor valor",
    grants: {
      resources: { C: 80, Fe: 50, oro: 30, bayas: 30, trigo: 30 },
    },
  }),
  product({
    id: "rare_seeds",
    name: "Semillas raras",
    description: "10 semillas de árbol, 10 de trigo y 10 de maíz para tu granja.",
    category: "resources",
    price: { currency: "drac", amount: 700 },
    icon: "🌱",
    grants: {
      resources: { semillaArbol: 10, semillaTrigo: 10, semillaMaiz: 10 },
    },
  }),
  product({
    id: "essence_small",
    name: "Frasco de Esencias",
    description: "10 Esencias para recetas avanzadas y objetos especiales del mundo.",
    category: "essences",
    price: { currency: "drac", amount: 500 },
    icon: "✧",
    grants: { resources: { esencia: 10 } },
  }),
  product({
    id: "essence_large",
    name: "Cofre de Esencias",
    description: "50 Esencias con un 20% extra sobre el frasco pequeño.",
    category: "essences",
    price: { currency: "drac", amount: 1800 },
    icon: "✧",
    badge: "+20% extra",
    grants: { resources: { esencia: 50 } },
  }),
  product({
    id: "essence_bundle",
    name: "Cámara de Esencias",
    description: "120 Esencias para abastecer tu taller durante toda la temporada.",
    category: "essences",
    price: { currency: "drac", amount: 3500 },
    icon: "✧",
    badge: "Popular",
    grants: { resources: { esencia: 120 } },
  }),
  product({
    id: "armor_leather",
    name: "Armadura de piel",
    description: "Mejora permanente que reduce el daño recibido en un 30%.",
    category: "equipment",
    price: { currency: "drac", amount: 1200 },
    icon: "🦺",
    grants: { upgrades: ["leatherArmor"] },
  }),
  product({
    id: "armor_wolfcloak",
    name: "Capa de piel de lobo",
    description: "Mejora permanente de abrigo y defensa para las noches duras.",
    category: "equipment",
    price: { currency: "drac", amount: 1600 },
    icon: "🐺",
    grants: { upgrades: ["wolfCloak"] },
  }),
  product({
    id: "vein_restorer",
    name: "Restaurador de vetas",
    description: "Mejora permanente para recuperar vetas de mineral agotadas.",
    category: "equipment",
    price: { currency: "drac", amount: 800 },
    icon: "🔧",
    grants: { upgrades: ["veinRestorer"] },
  }),
  product({
    id: "wolf_totem",
    name: "Tótem de lobo",
    description: "Un tótem para invocar y honrar a los lobos de la tundra.",
    category: "equipment",
    price: { currency: "drac", amount: 500 },
    icon: "🗿",
    grants: { items: { wolfTotem: 1 } },
  }),
  product({
    id: "world_slot",
    name: "Slot de mundo adicional",
    description: "Un espacio permanente más para tus partidas individuales en la nube.",
    category: "world",
    price: { currency: "drac", amount: 2500 },
    icon: "🌍",
    badge: "Permanente",
    grants: { worldSlots: 1 },
  }),
  product({
    id: "contract_noble",
    name: "Contrato Noble",
    description: "Suministros diarios para un explorador constante durante 30 días.",
    category: "contracts",
    kind: "contract",
    contractDays: 30,
    price: { currency: "drac", amount: 1200 },
    icon: "🏅",
    badge: "30 días",
    dailyGrants: {
      resources: { C: 40, Fe: 30, oro: 20, bayas: 30, trigo: 30 },
      items: { pescado: 5 },
      energy: 20,
    },
    highlights: Object.freeze([
      "Recursos cada 24 h",
      "5 pescados diarios",
      "30 días de duración",
    ]),
  }),
  product({
    id: "contract_lord",
    name: "Contrato Lord",
    description: "El equilibrio perfecto entre recursos, comida y Esencias.",
    category: "contracts",
    kind: "contract",
    contractDays: 30,
    price: { currency: "drac", amount: 2500 },
    icon: "👑",
    badge: "Más popular",
    dailyGrants: {
      resources: {
        C: 100,
        Fe: 70,
        oro: 50,
        bayas: 60,
        trigo: 60,
        maiz: 40,
        esencia: 2,
      },
      items: { pescado: 10 },
      energy: 40,
    },
    highlights: Object.freeze([
      "Recursos cada 24 h",
      "10 pescados y 2 Esencias",
      "30 días de duración",
    ]),
  }),
  product({
    id: "contract_feudo",
    name: "Contrato Feudo",
    description: "El paquete más generoso para dominar el mundo y tu colonia.",
    category: "contracts",
    kind: "contract",
    contractDays: 30,
    price: { currency: "drac", amount: 5000 },
    icon: "🏰",
    badge: "Máximo",
    dailyGrants: {
      resources: {
        C: 250,
        Fe: 180,
        oro: 120,
        bayas: 120,
        trigo: 100,
        maiz: 80,
        esencia: 5,
      },
      items: { pescado: 20 },
      energy: 100,
    },
    highlights: Object.freeze([
      "Recursos cada 24 h",
      "20 pescados y 5 Esencias",
      "Ideal para varios mundos",
    ]),
  }),
  product({
    id: "title_explorer",
    name: "Título: Explorador de Dracxcore",
    description: "Un título permanente para tu cuenta. El prestigio se gana jugando.",
    category: "prestige",
    kind: "prestige",
    price: { currency: "prestige", amount: 50 },
    icon: "✦",
    badge: "Prestigio",
    grants: { entitlements: ["title_explorer"] },
  }),
  product({
    id: "title_guardian",
    name: "Título: Guardián del Feudo",
    description: "Demuestra tu constancia con este título de cuenta.",
    category: "prestige",
    kind: "prestige",
    price: { currency: "prestige", amount: 120 },
    icon: "✧",
    badge: "Prestigio",
    grants: { entitlements: ["title_guardian"] },
  }),
  product({
    id: "title_dragon",
    name: "Título: Sangre de Dragón",
    description: "El título más codiciado de Dracxcore. Solo para veteranos.",
    category: "prestige",
    kind: "prestige",
    price: { currency: "prestige", amount: 300 },
    icon: "★",
    badge: "Legendario",
    grants: { entitlements: ["title_dragon"] },
  }),
]);

const PRODUCT_BY_ID = new Map(
  ECONOMY_PRODUCTS.map((entry) => [entry.id, entry]),
);

export function getEconomyProduct(productId) {
  return PRODUCT_BY_ID.get(String(productId ?? "")) ?? null;
}

export function economyProductGrants(product) {
  return product?.kind === "contract"
    ? product.dailyGrants ?? {}
    : product?.grants ?? {};
}

export function formatEconomyPrice(price) {
  const currency = ECONOMY_CURRENCIES[price?.currency] ?? ECONOMY_CURRENCIES.drac;
  const amount = Math.max(0, Math.floor(Number(price?.amount) || 0));
  return `${currency.icon} ${amount.toLocaleString("es-MX")}`;
}

export function clampWalletValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.min(MAX_WALLET_VALUE, Math.max(0, Math.floor(number)));
}

export function sanitizeWallet(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    dracCoins: clampWalletValue(source.dracCoins),
    prestige: clampWalletValue(source.prestige),
  };
}

const WALLET_KEY = "rocksoup.economy.wallet.v1";
const CLAIMS_KEY = "rocksoup.economy.claims.v1";
const ENTITLEMENTS_KEY = "rocksoup.economy.entitlements.v1";

function readJson(storage, key, fallback) {
  try {
    const raw = storage?.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(storage, key, value) {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // Almacenamiento bloqueado.
  }
}

export function createLocalEconomy(storage) {
  function readWallet() {
    const stored = readJson(storage, WALLET_KEY, null);
    if (!stored || typeof stored !== "object") {
      return sanitizeWallet(STARTING_WALLET);
    }
    return sanitizeWallet(stored);
  }

  function writeWallet(wallet) {
    const clean = sanitizeWallet(wallet);
    writeJson(storage, WALLET_KEY, clean);
    return clean;
  }

  function readClaims() {
    const stored = readJson(storage, CLAIMS_KEY, null);
    return stored && typeof stored === "object" ? stored : {};
  }

  function writeClaims(claims) {
    writeJson(storage, CLAIMS_KEY, claims);
  }

  function readEntitlements() {
    const stored = readJson(storage, ENTITLEMENTS_KEY, null);
    return Array.isArray(stored)
      ? [...new Set(stored.filter((entry) => typeof entry === "string"))]
      : [];
  }

  function addEntitlements(keys) {
    const current = readEntitlements();
    const next = [...new Set([...current, ...keys])];
    writeJson(storage, ENTITLEMENTS_KEY, next);
    return next;
  }

  function applyRule(rule, claims, now) {
    const day = economyDayKey(now);
    const capKey = `cap:${rule.label ?? "reward"}:${day}`;

    if (rule.dedupe) {
      return { allowed: true };
    }

    if (rule.dailyCap) {
      const used = clampWalletValue(claims[capKey]?.drac);
      const drac = Math.max(0, Math.floor(Number(rule.drac) || 0));
      const allowed = Math.min(drac, Math.max(0, rule.dailyCap - used));
      if (allowed <= 0) {
        return { allowed: false, reason: "daily_cap" };
      }
      claims[capKey] = { drac: used + allowed, day };
      return { allowed: true, drac: allowed };
    }

    return { allowed: true };
  }

  function award(kind, { refId = "", now = Date.now() } = {}) {
    const rule = rewardFor(kind);
    if (!rule) {
      return { awarded: false, reason: "unknown_kind" };
    }
    const wallet = readWallet();
    const claims = readClaims();
    const claimKey = `${kind}:${String(refId ?? "")}`;

    if (rule.dedupe || rule.daily) {
      const key = rule.daily ? `${claimKey}:${economyDayKey(now)}` : claimKey;
      if (claims[key]) {
        return { awarded: false, reason: "claimed", wallet };
      }
      claims[key] = now;
    }

    const applied = applyRule(rule, claims, now);
    if (!applied.allowed) {
      return { awarded: false, reason: applied.reason, wallet };
    }

    const currencies = rewardCurrencies(rule);
    if (Number.isFinite(applied.drac)) {
      currencies.dracCoins = applied.drac;
    }

    wallet.dracCoins = clampWalletValue(wallet.dracCoins + currencies.dracCoins);
    wallet.prestige = clampWalletValue(wallet.prestige + currencies.prestige);
    writeWallet(wallet);
    writeClaims(claims);

    return {
      awarded: true,
      wallet,
      dracCoins: currencies.dracCoins,
      prestige: currencies.prestige,
      essences: currencies.essences,
      kind,
    };
  }

  function purchase(productId, { now = Date.now() } = {}) {
    const entry = getEconomyProduct(productId);
    if (!entry) {
      return { ok: false, reason: "unknown_product" };
    }
    if (entry.kind === "contract") {
      return {
        ok: false,
        reason: "account_required",
        message: "Los contratos requieren una cuenta en la nube.",
      };
    }
    if (entry.grants?.worldSlots > 0) {
      return {
        ok: false,
        reason: "account_required",
        message: "Los slots de mundo requieren una cuenta en la nube.",
      };
    }
    const wallet = readWallet();
    const currency = entry.price.currency;
    if (currency === "drac" && wallet.dracCoins < entry.price.amount) {
      return { ok: false, reason: "insufficient_funds", wallet };
    }
    if (currency === "prestige" && wallet.prestige < entry.price.amount) {
      return { ok: false, reason: "insufficient_funds", wallet };
    }
    if (currency === "drac") {
      wallet.dracCoins = clampWalletValue(wallet.dracCoins - entry.price.amount);
    } else if (currency === "prestige") {
      wallet.prestige = clampWalletValue(wallet.prestige - entry.price.amount);
    } else {
      return { ok: false, reason: "invalid_currency" };
    }
    writeWallet(wallet);
    if (entry.grants?.entitlements?.length) {
      addEntitlements(entry.grants.entitlements);
    }
    return {
      ok: true,
      wallet,
      product: entry,
      grants: entry.grants ?? {},
      entitlements: readEntitlements(),
      purchasedAt: now,
    };
  }

  function claimDaily(now = Date.now()) {
    return award("daily_objective", { refId: "daily", now });
  }

  function dailyStatus(now = Date.now()) {
    const claims = readClaims();
    const key = `daily_objective:daily:${economyDayKey(now)}`;
    return { available: !claims[key] };
  }

  return {
    readWallet,
    writeWallet,
    readEntitlements,
    addEntitlements,
    award,
    purchase,
    claimDaily,
    dailyStatus,
  };
}
