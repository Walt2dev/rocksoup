import { api } from "../net/api.js";
import { getCurrentUser } from "../net/auth.js";
import {
  ECONOMY_PRODUCTS,
  createLocalEconomy,
  economyProductGrants,
  formatEconomyPrice,
} from "../game/economy.js";
import {
  ITEM_INFO,
  RESOURCE_INFO,
  TOOL_INFO,
  UPGRADE_INFO,
} from "../game/inventory.js";

const TAB_LABELS = {
  recommended: "Para mí",
  resources: "Recursos",
  essences: "Esencias",
  equipment: "Equipo",
  contracts: "Contratos",
  prestige: "Prestigio",
};

const TAB_ORDER = [
  "recommended",
  "resources",
  "essences",
  "equipment",
  "contracts",
  "prestige",
];

const PACK_IDS = new Set(["feudo_chest", "adventurer_pack"]);

function el(id) {
  return document.getElementById(id);
}

function setStatus(message, isError = false) {
  const node = el("store-status");
  if (!node) {
    return;
  }
  node.textContent = message || "";
  node.classList.toggle("is-error", Boolean(isError));
}

function setModalStatus(message, isError = false) {
  const node = el("store-modal-status");
  if (!node) {
    return;
  }
  node.textContent = message || "";
  node.classList.toggle("is-error", Boolean(isError));
}

function describeGrantsLocal(grants) {
  const labels = [];
  for (const [key, amount] of Object.entries(grants?.resources ?? {})) {
    const info = RESOURCE_INFO[key];
    labels.push(`${amount} ${info?.label ?? key}`);
  }
  for (const [key, amount] of Object.entries(grants?.items ?? {})) {
    const info = ITEM_INFO[key];
    labels.push(`${amount} ${info?.label ?? key}`);
  }
  if (Number.isFinite(grants?.energy) && grants.energy > 0) {
    labels.push(`+${grants.energy} energía`);
  }
  for (const upgrade of grants?.upgrades ?? []) {
    labels.push(UPGRADE_INFO[upgrade]?.label ?? upgrade);
  }
  for (const tool of grants?.tools ?? []) {
    labels.push(TOOL_INFO[tool]?.label ?? tool);
  }
  if (Number.isFinite(grants?.worldSlots) && grants.worldSlots > 0) {
    labels.push(`+${grants.worldSlots} slot de mundo`);
  }
  return labels;
}

function normalizeLocalProduct(entry) {
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    category: entry.category,
    kind: entry.kind,
    price: entry.price,
    currency: entry.price.currency,
    contractDays: entry.contractDays ?? null,
    needsWorld: localNeedsWorld(entry),
    icon: entry.icon,
    badge: entry.badge ?? null,
    highlights: Array.isArray(entry.highlights) ? [...entry.highlights] : [],
    preview: describeGrantsLocal(economyProductGrants(entry)),
    active: true,
  };
}

function localNeedsWorld(entry) {
  if (
    entry.kind !== "one_time" ||
    entry.category === "world" ||
    entry.category === "prestige"
  ) {
    return false;
  }
  const grants = economyProductGrants(entry);
  return Boolean(
    Object.keys(grants.resources ?? {}).length ||
      Object.keys(grants.items ?? {}).length ||
      grants.energy ||
      (grants.upgrades ?? []).length ||
      (grants.tools ?? []).length,
  );
}

function localProducts() {
  return ECONOMY_PRODUCTS.map(normalizeLocalProduct);
}

function formatNumber(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("es-MX");
}

function productNeedsWorld(product) {
  return Boolean(product?.needsWorld);
}

export function createStoreUI({
  onOpenAccount,
  onPurchased,
  onLocalPurchase,
  getPlayerState,
  onBack,
} = {}) {
  let localEconomy;
  try {
    localEconomy = createLocalEconomy(window.localStorage);
  } catch {
    localEconomy = createLocalEconomy(null);
  }
  let user = null;
  let products = [];
  let config = null;
  let summary = null;
  let category = "recommended";
  let activeProduct = null;
  let preparing = false;

  function currentWallet() {
    if (user) {
      return summary?.wallet ?? { dracCoins: 0, prestige: 0 };
    }
    return localEconomy.readWallet();
  }

  function canAfford(product) {
    const wallet = currentWallet();
    if (product.price.currency === "prestige") {
      return wallet.prestige >= product.price.amount;
    }
    return wallet.dracCoins >= product.price.amount;
  }

  function renderGuestBar() {
    const container = el("store-account");
    if (!container) {
      return;
    }
    container.hidden = false;
    container.replaceChildren();
    const wallet = currentWallet();
    const text = document.createElement("p");
    text.className = "account-note";
    text.textContent =
      "Modo local: gana DracCoins y Prestigio jugando. Inicia sesión para guardarlos en la nube.";
    const balance = document.createElement("span");
    balance.className = "store-guest-balance";
    balance.textContent = `🪙 ${formatNumber(wallet.dracCoins)} · ★ ${formatNumber(wallet.prestige)}`;
    const actions = document.createElement("div");
    actions.className = "store-login-actions";
    const daily = document.createElement("button");
    daily.type = "button";
    daily.className = "menu-button";
    daily.textContent = localEconomy.dailyStatus().available
      ? "Reclamar diario"
      : "Diario reclamado";
    daily.disabled = !localEconomy.dailyStatus().available;
    daily.addEventListener("click", () => {
      const result = localEconomy.claimDaily();
      if (!result.awarded) {
        setStatus("El objetivo diario ya fue reclamado hoy.", true);
        return;
      }
      onLocalPurchase?.({ grants: { resources: { esencia: result.essences } } });
      setStatus(
        `Objetivo diario: +${result.dracCoins} DracCoins, +${result.prestige} Prestigio, +${result.essences} Esencias.`,
      );
      renderAccountBar();
      renderGrid();
      onPurchased?.();
    });
    const account = document.createElement("button");
    account.type = "button";
    account.className = "menu-button primary";
    account.textContent = "Iniciar sesión / Crear cuenta";
    account.addEventListener("click", () => onOpenAccount?.());
    actions.append(daily, account);
    container.append(text, balance, actions);
  }

  function renderAccountBar() {
    if (!user) {
      renderGuestBar();
      return;
    }
    const container = el("store-account");
    if (!container) {
      return;
    }
    container.hidden = false;
    container.replaceChildren();
    const wallet = currentWallet();
    const text = document.createElement("p");
    text.className = "account-note";
    text.textContent = `${user.displayName} · ${summary?.slots?.used ?? 0}/${summary?.slots?.capacity ?? 1} mundos`;
    const balance = document.createElement("span");
    balance.className = "store-guest-balance";
    balance.textContent = `🪙 ${formatNumber(wallet.dracCoins)} · ★ ${formatNumber(wallet.prestige)}`;
    const actions = document.createElement("div");
    actions.className = "store-login-actions";
    const daily = document.createElement("button");
    daily.type = "button";
    daily.className = "menu-button";
    daily.textContent = "Reclamar diario";
    daily.addEventListener("click", () => {
      void claimDaily();
    });
    const account = document.createElement("button");
    account.type = "button";
    account.className = "menu-button";
    account.textContent = "Mi cuenta";
    account.addEventListener("click", () => onOpenAccount?.());
    actions.append(daily, account);
    container.append(text, balance, actions);
  }

  async function claimDaily() {
    if (preparing) {
      return;
    }
    preparing = true;
    try {
      const result = await api("/api/economy/daily", {
        method: "POST",
        body: {},
      });
      if (!result?.awarded) {
        setStatus("El objetivo diario ya fue reclamado hoy.", true);
        return;
      }
      await refreshAfterPurchase(
        `Objetivo diario: +${result.dracCoins} DracCoins, +${result.prestige} Prestigio, +${result.essences} Esencias.`,
      );
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      preparing = false;
    }
  }

  function productTab(product) {
    if (product.category === "world") {
      return "equipment";
    }
    if (
      product.category === "resources" ||
      product.category === "essences" ||
      product.category === "equipment" ||
      product.category === "contracts" ||
      product.category === "prestige"
    ) {
      return product.category;
    }
    if (product.kind === "contract") {
      return "contracts";
    }
    if (product.kind === "prestige" || product.category === "armor") {
      return "prestige";
    }
    return "resources";
  }

  function getRecommendations() {
    const save = getPlayerState?.() ?? null;
    const recommendations = [];
    const add = (id, reason) => {
      const product = products.find((entry) => entry.id === id);
      if (product && !recommendations.some((entry) => entry.product.id === id)) {
        recommendations.push({ product, reason });
      }
    };

    if (!save) {
      add("energy_small", "Prueba desde 120 DracCoins");
      add("adventurer_pack", "Ideal para empezar");
      add("essence_small", "Recetas especiales");
      return recommendations.slice(0, 6);
    }

    const inventory = save.inventory ?? {};
    const resources = inventory.resources ?? {};
    const upgrades = Array.isArray(inventory.upgrades) ? inventory.upgrades : [];
    const tools = Array.isArray(inventory.tools) ? inventory.tools : [];
    const energy = Number(save.player?.energy ?? 100);

    if (energy < 50) {
      add("energy_small", `Tienes ${Math.round(energy)} de energía`);
    }
    if ((resources.C ?? 0) < 40) {
      add("coal_small", "Te falta carbón");
    }
    if ((resources.Fe ?? 0) < 20) {
      add("iron_pack", "Te falta hierro");
    }
    if ((resources.oro ?? 0) < 20) {
      add("gold_pack", "Te falta oro");
    }
    if (!upgrades.includes("leatherArmor")) {
      add("armor_leather", "Mejora tu defensa");
    }
    if (!tools.includes("axe")) {
      add("tool_axe", "No tienes hacha");
    }
    if (!tools.includes("pickaxe")) {
      add("tool_pickaxe", "No tienes pico");
    }
    if (recommendations.length < 3) {
      add("adventurer_pack", "Pack de inicio");
    }
    if (recommendations.length === 0) {
      add("feudo_chest", "Recursos para tu feudo");
    }
    return recommendations.slice(0, 6);
  }

  function renderTabs() {
    const tabs = el("store-tabs");
    if (!tabs) {
      return;
    }
    tabs.replaceChildren(
      ...TAB_ORDER.map((key) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "store-tab";
        button.classList.toggle("is-active", key === category);
        button.textContent = TAB_LABELS[key] ?? key;
        button.addEventListener("click", () => {
          category = key;
          renderTabs();
          renderGrid();
        });
        return button;
      }),
    );
  }

  function renderGrid() {
    const grid = el("store-grid");
    if (!grid) {
      return;
    }

    let visible;
    let reasons = new Map();
    if (category === "recommended") {
      const recommendations = getRecommendations();
      visible = recommendations.map((entry) => entry.product);
      reasons = new Map(
        recommendations.map((entry) => [entry.product.id, entry.reason]),
      );
    } else {
      visible = products.filter((product) => productTab(product) === category);
    }

    if (visible.length === 0) {
      grid.innerHTML = '<p class="account-note">No hay productos en esta categoría.</p>';
      return;
    }

    grid.replaceChildren(
      ...visible.map((product, index) => {
        const card = document.createElement("article");
        card.className = `store-product store-cat-${product.category}`;
        card.style.setProperty("--i", String(index));

        const head = document.createElement("div");
        head.className = "store-product-head";
        const icon = document.createElement("span");
        icon.className = "store-product-icon";
        icon.textContent = product.icon;
        const titleWrap = document.createElement("div");
        const title = document.createElement("h3");
        title.textContent = product.name;
        const badge = document.createElement("span");
        badge.className = "store-badge";
        badge.textContent =
          product.badge ||
          (product.kind === "contract"
            ? "Contrato"
            : product.kind === "prestige"
              ? "Prestigio"
              : "Pago único");
        titleWrap.append(title, badge);
        head.append(icon, titleWrap);

        const desc = document.createElement("p");
        desc.className = "store-product-desc";
        desc.textContent = product.description;

        const reasonChip = document.createElement("span");
        reasonChip.className = "store-reason";
        const reason = reasons.get(product.id);
        if (reason) {
          reasonChip.textContent = `Para ti: ${reason}`;
        }

        const preview = document.createElement("div");
        preview.className = "store-preview";
        for (const item of product.preview ?? []) {
          const chip = document.createElement("span");
          chip.textContent = item;
          preview.append(chip);
        }
        if (product.kind === "contract") {
          for (const item of product.highlights ?? []) {
            const chip = document.createElement("span");
            chip.className = "store-chip-alt";
            chip.textContent = item;
            preview.append(chip);
          }
        }

        const footer = document.createElement("div");
        footer.className = "store-product-footer";
        const price = document.createElement("strong");
        price.className = "store-price";
        price.textContent = formatEconomyPrice(product.price);
        const buy = document.createElement("button");
        buy.type = "button";
        buy.className = "store-buy";
        buy.textContent =
          product.kind === "contract"
            ? "Contratar"
            : product.kind === "prestige"
              ? "Desbloquear"
              : "Comprar";
        buy.addEventListener("click", () => {
          void openProduct(product);
        });
        footer.append(price, buy);

        if (reason) {
          card.append(head, desc, reasonChip, preview, footer);
        } else {
          card.append(head, desc, preview, footer);
        }
        return card;
      }),
    );
  }

  function selectedWorldId(product) {
    if (!user || !productNeedsWorld(product)) {
      return null;
    }
    const select = el("store-world-select");
    return select?.value || null;
  }

  function renderWorldSelect(product) {
    const field = el("store-world-field");
    const select = el("store-world-select");
    if (!field || !select) {
      return;
    }
    const needsWorld = productNeedsWorld(product);
    field.hidden = !needsWorld || !user;
    if (!needsWorld || !user) {
      return;
    }
    const worlds = summary?.worlds ?? [];
    select.replaceChildren(
      ...worlds.map((world) => {
        const option = document.createElement("option");
        option.value = world.id;
        option.textContent = `${world.name} · ${world.seed}`;
        return option;
      }),
    );
    if (worlds.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Sin mundos: se guardará como recompensa pendiente";
      select.append(option);
    }
  }

  function renderPurchaseButton(product, container) {
    container.replaceChildren();
    const button = document.createElement("button");
    button.type = "button";
    button.className = "store-buy store-buy-wide";
    button.textContent = canAfford(product)
      ? product.kind === "contract"
        ? "Contratar ahora"
        : "Comprar ahora"
      : "Saldo insuficiente";
    button.disabled = preparing;
    button.addEventListener("click", () => {
      void purchaseActive(product);
    });
    container.append(button);
  }

  async function openProduct(product) {
    activeProduct = product;
    const modal = el("store-modal");
    if (!modal) {
      return;
    }
    el("store-modal-icon").textContent = product.icon;
    el("store-modal-title").textContent = product.name;
    el("store-modal-price").textContent = `${formatEconomyPrice(product.price)}${
      product.kind === "contract" ? ` / ${product.contractDays ?? 30} días` : ""
    }`;
    el("store-modal-desc").textContent = product.description;
    const preview = el("store-modal-preview");
    preview.replaceChildren(
      ...(product.preview ?? []).map((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        return li;
      }),
    );
    renderWorldSelect(product);
    setModalStatus("");
    const buttonContainer = el("store-purchase-container");
    buttonContainer.replaceChildren();
    modal.hidden = false;
    renderPurchaseButton(product, buttonContainer);
  }

  function closeModal() {
    const modal = el("store-modal");
    if (modal) {
      modal.hidden = true;
    }
    activeProduct = null;
  }

  function celebratePurchase() {
    const modal = el("store-modal");
    const card = modal?.querySelector(".store-modal-card");
    if (card) {
      card.classList.remove("is-celebrating");
      void card.offsetWidth;
      card.classList.add("is-celebrating");
      window.setTimeout(() => card.classList.remove("is-celebrating"), 700);
    }

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduced) {
      return;
    }
    const splash = el("store-splash");
    if (!splash) {
      return;
    }
    splash.hidden = false;
    splash.replaceChildren();
    const colors = ["#e0a458", "#7ec699", "#6ca9e0", "#d97b6c", "#b58ce0", "#f6d36b", "#9fc7ff"];
    for (let index = 0; index < 48; index += 1) {
      const piece = document.createElement("span");
      piece.className = "store-confetti";
      piece.style.left = `${(index * 37) % 100}%`;
      piece.style.background = colors[index % colors.length];
      piece.style.setProperty("--dur", `${1.2 + ((index * 7) % 9) / 10}s`);
      piece.style.setProperty("--drift", `${((index * 53) % 220) - 110}px`);
      piece.style.animationDelay = `${((index * 13) % 25) / 100}s`;
      splash.append(piece);
    }
    window.setTimeout(() => {
      splash.replaceChildren();
      splash.hidden = true;
    }, 2200);
  }

  async function refreshAfterPurchase(message) {
    setModalStatus(message);
    celebratePurchase();
    await refresh();
    onPurchased?.(message);
  }

  async function purchaseActive(product) {
    if (preparing) {
      return;
    }
    if (!canAfford(product)) {
      setModalStatus("No tienes saldo suficiente para esta compra.", true);
      return;
    }
    preparing = true;
    const buttonContainer = el("store-purchase-container");
    if (buttonContainer) {
      renderPurchaseButton(product, buttonContainer);
    }
    try {
      if (user) {
        setModalStatus("Procesando compra...");
        const result = await api("/api/store/purchase", {
          method: "POST",
          body: {
            productId: product.id,
            worldId: selectedWorldId(product),
          },
        });
        const pending = result?.grant?.pending || result?.grantError;
        await refreshAfterPurchase(
          result?.grantError
            ? "Compra registrada. La entrega quedó pendiente; revisa tu inventario al cargar el mundo."
            : pending
              ? "Compra completada. Los recursos te esperan al cargar un mundo."
              : product.kind === "contract"
                ? "Contrato activo. Recibirás recursos cada 24 horas."
                : "Compra completada y entregada.",
        );
      } else {
        const result = localEconomy.purchase(product.id);
        if (!result.ok) {
          setModalStatus(
            result.message ??
              (result.reason === "insufficient_funds"
                ? "No tienes saldo suficiente."
                : "No se pudo completar la compra local."),
            true,
          );
          return;
        }
        onLocalPurchase?.({
          grants: result.grants,
          worldId: selectedWorldId(product),
          product,
        });
        await refreshAfterPurchase("Compra local completada. Se entregará al cargar tu mundo.");
      }
    } catch (error) {
      setModalStatus(error.message, true);
    } finally {
      preparing = false;
      if (activeProduct) {
        const container = el("store-purchase-container");
        if (container) {
          renderPurchaseButton(activeProduct, container);
        }
      }
    }
  }

  async function loadProducts() {
    try {
      const storeData = await api("/api/store/products");
      products = storeData.products ?? localProducts();
      config = storeData.config ?? null;
    } catch {
      products = localProducts();
      config = { economyEnabled: true, local: true };
    }
  }

  async function refresh() {
    setStatus("Cargando tienda...");
    try {
      await loadProducts();

      try {
        user = await getCurrentUser();
      } catch {
        user = null;
      }

      if (user) {
        try {
          summary = await api("/api/account");
        } catch {
          summary = null;
        }
      } else {
        summary = null;
      }

      renderAccountBar();
      renderTabs();
      renderGrid();

      if (!user) {
        setStatus(
          "Modo local: gana DracCoins jugando y canjéalos aquí. Inicia sesión para la nube y los contratos.",
        );
      } else {
        setStatus("");
      }
      if (activeProduct) {
        const container = el("store-purchase-container");
        if (container) {
          renderPurchaseButton(activeProduct, container);
        }
      }
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function bind() {
    el("btn-store-back")?.addEventListener("click", () => onBack?.());
    el("store-modal-close")?.addEventListener("click", closeModal);
    el("store-modal")?.addEventListener("click", (event) => {
      if (event.target === el("store-modal")) {
        closeModal();
      }
    });
  }

  bind();

  return {
    open(productId = null) {
      void refresh().then(() => {
        if (productId) {
          const product = products.find((entry) => entry.id === productId);
          if (product) {
            category = productTab(product);
            renderTabs();
            renderGrid();
            void openProduct(product);
          }
        }
      });
    },
    refresh,
    closeModal,
    get user() {
      return user;
    },
    localEconomy,
  };
}
