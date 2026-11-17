import { api } from "../net/api.js";
import { getCurrentUser, renderGoogleButton } from "../net/auth.js";

const CATEGORY_LABELS = {
  resources: "Recursos",
  diamonds: "Diamantes",
  armor: "Armaduras",
  world: "Mundos",
  subscription: "Suscripciones",
};

const CATEGORY_ORDER = ["resources", "diamonds", "armor", "world", "subscription"];
const NAMESPACE = {
  capture: "paypalCapture",
  subscription: "paypalSubscription",
};

function el(id) {
  return document.getElementById(id);
}

function formatPrice(cents, currency = "MXN") {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format((Number(cents) || 0) / 100);
  } catch {
    return `$${((Number(cents) || 0) / 100).toFixed(2)} ${currency}`;
  }
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

function loadSdk(url, namespace) {
  if (!url) {
    return Promise.reject(new Error("PayPal no está configurado"));
  }
  if (window[namespace]) {
    return Promise.resolve(window[namespace]);
  }
  const existing = document.querySelector(
    `script[data-namespace="${namespace}"]`,
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window[namespace]) {
        resolve(window[namespace]);
        return;
      }
      existing.addEventListener(
        "load",
        () => resolve(window[namespace]),
        { once: true },
      );
      existing.addEventListener(
        "error",
        () => reject(new Error("No se pudo cargar PayPal")),
        { once: true },
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.setAttribute("data-namespace", namespace);
    script.setAttribute("data-sdk-integration-source", "button-factory");
    script.addEventListener(
      "load",
      () => {
        if (window[namespace]) {
          resolve(window[namespace]);
        } else {
          reject(new Error("PayPal no expuso su API"));
        }
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => reject(new Error("No se pudo cargar PayPal")),
      { once: true },
    );
    document.head.appendChild(script);
  });
}

export function createStoreUI({
  onOpenAccount,
  onPurchased,
  onBack,
} = {}) {
  let user = null;
  let products = [];
  let config = null;
  let summary = null;
  let category = "resources";
  let activeProduct = null;
  let buyButton = null;
  let preparing = false;

  function openAccountPrompt() {
    const container = el("store-account");
    if (!container) {
      return;
    }
    container.hidden = false;
    container.replaceChildren();
    const text = document.createElement("p");
    text.className = "account-note";
    text.textContent =
      "Inicia sesión con Google para comprar y conservar tus artículos en la nube.";
    const actions = document.createElement("div");
    actions.className = "store-login-actions";
    const login = document.createElement("button");
    login.type = "button";
    login.className = "menu-button primary";
    login.textContent = "Ir a Mi cuenta";
    login.addEventListener("click", () => onOpenAccount?.());
    const google = document.createElement("div");
    google.className = "store-google";
    actions.append(login, google);
    container.append(text, actions);
    void renderGoogleButton(google, {
      onUser: () => {
        void refresh();
      },
      onError: (error) => setStatus(error.message, true),
    });
  }

  function renderTabs() {
    const tabs = el("store-tabs");
    if (!tabs) {
      return;
    }
    const categories = CATEGORY_ORDER.filter((key) =>
      products.some((product) => product.category === key),
    );
    tabs.replaceChildren(
      ...categories.map((key) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "store-tab";
        button.classList.toggle("is-active", key === category);
        button.textContent = CATEGORY_LABELS[key] ?? key;
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
    const visible = products.filter((product) => product.category === category);
    if (visible.length === 0) {
      grid.innerHTML = '<p class="account-note">No hay productos en esta categoría.</p>';
      return;
    }

    grid.replaceChildren(
      ...visible.map((product) => {
        const card = document.createElement("article");
        card.className = `store-product store-cat-${product.category}`;

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
        badge.textContent = product.badge || (product.kind === "subscription" ? "Mensual" : "Pago único");
        titleWrap.append(title, badge);
        head.append(icon, titleWrap);

        const desc = document.createElement("p");
        desc.className = "store-product-desc";
        desc.textContent = product.description;

        const preview = document.createElement("div");
        preview.className = "store-preview";
        for (const item of product.preview ?? []) {
          const chip = document.createElement("span");
          chip.textContent = item;
          preview.append(chip);
        }
        if (product.kind === "subscription") {
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
        price.textContent = formatPrice(product.priceCents, product.currency);
        const buy = document.createElement("button");
        buy.type = "button";
        buy.className = "store-buy";
        buy.textContent =
          product.kind === "subscription" ? "Suscribirme" : "Comprar";
        buy.addEventListener("click", () => {
          void openProduct(product);
        });
        footer.append(price, buy);

        card.append(head, desc, preview, footer);
        return card;
      }),
    );
  }

  function renderAccountBar() {
    const container = el("store-account");
    if (!container) {
      return;
    }
    if (!user) {
      openAccountPrompt();
      return;
    }
    container.hidden = false;
    container.replaceChildren();
    const text = document.createElement("p");
    text.className = "account-note";
    text.textContent = `${user.displayName} · ${summary?.diamonds ?? 0} diamantes · ${summary?.slots?.used ?? 0}/${summary?.slots?.capacity ?? 1} mundos`;
    const account = document.createElement("button");
    account.type = "button";
    account.className = "menu-button";
    account.textContent = "Mi cuenta";
    account.addEventListener("click", () => onOpenAccount?.());
    container.append(text, account);
  }

  function selectedWorldId(product) {
    if (!product || product.category === "diamonds" || product.category === "world" || product.kind === "subscription") {
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
    const needsWorld =
      product.kind === "one_time" &&
      product.category !== "diamonds" &&
      product.category !== "world";
    field.hidden = !needsWorld;
    if (!needsWorld) {
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

  async function openProduct(product) {
    if (!user) {
      setStatus("Inicia sesión para comprar.", true);
      openAccountPrompt();
      return;
    }
    activeProduct = product;
    const modal = el("store-modal");
    if (!modal) {
      return;
    }
    el("store-modal-icon").textContent = product.icon;
    el("store-modal-title").textContent = product.name;
    el("store-modal-price").textContent = `${formatPrice(product.priceCents, product.currency)}${product.kind === "subscription" ? " / mes" : ""}`;
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
    const buttonContainer = el("paypal-button-container");
    buttonContainer.replaceChildren();
    modal.hidden = false;

    try {
      if (!config?.configured) {
        setModalStatus(
          "PayPal aún no está configurado en el servidor. Añade las credenciales de PayPal Business.",
          true,
        );
        return;
      }
      if (product.kind === "subscription") {
        await mountSubscriptionButton(product, buttonContainer);
      } else {
        await mountCaptureButton(product, buttonContainer);
      }
    } catch (error) {
      setModalStatus(error.message, true);
    }
  }

  function closeModal() {
    const modal = el("store-modal");
    if (modal) {
      modal.hidden = true;
    }
    activeProduct = null;
  }

  async function refreshAfterPurchase(message) {
    setModalStatus(message);
    await refresh();
    onPurchased?.(message);
  }

  async function mountCaptureButton(product, container) {
    const paypal = await loadSdk(config.captureSdkUrl, NAMESPACE.capture);
    container.replaceChildren();
    buyButton = paypal.Buttons({
      style: { shape: "pill", color: "gold", layout: "vertical", label: "paypal" },
      createOrder: async () => {
        setModalStatus("Creando orden segura...");
        const order = await api("/api/store/orders", {
          method: "POST",
          body: {
            productId: product.id,
            worldId: selectedWorldId(product),
          },
        });
        setModalStatus("Completa el pago en PayPal...");
        return order.orderId;
      },
      onApprove: async (data) => {
        setModalStatus("Confirmando pago con PayPal...");
        try {
          const result = await api(
            `/api/store/orders/${encodeURIComponent(data.orderID)}/capture`,
            { method: "POST", body: {} },
          );
          const pending = result?.grant?.pending;
          await refreshAfterPurchase(
            pending
              ? "Compra completada. Los recursos te esperan al cargar un mundo."
              : "Compra completada y entregada.",
          );
        } catch (error) {
          setModalStatus(error.message, true);
        }
      },
      onError: (error) => {
        setModalStatus(`PayPal: ${error?.message ?? "error desconocido"}`, true);
      },
      onCancel: () => setModalStatus("Pago cancelado."),
    });
    if (!buyButton.isEligible?.() && buyButton.isEligible) {
      setModalStatus("PayPal no está disponible en este navegador.", true);
      return;
    }
    await buyButton.render(container);
  }

  async function mountSubscriptionButton(product, container) {
    if (preparing) {
      return;
    }
    preparing = true;
    try {
      setModalStatus("Preparando suscripción...");
      const intent = await api("/api/store/subscriptions/intent", {
        method: "POST",
        body: { productId: product.id },
      });
      const paypal = await loadSdk(
        config.subscriptionSdkUrl,
        NAMESPACE.subscription,
      );
      container.replaceChildren();
      buyButton = paypal.Buttons({
        style: { shape: "pill", color: "gold", layout: "vertical", label: "subscribe" },
        createSubscription: (_data, actions) =>
          actions.subscription.create({
            plan_id: intent.planId,
            custom_id: intent.customId,
          }),
        onApprove: async (data) => {
          setModalStatus("Activando suscripción...");
          try {
            await api("/api/store/subscriptions/confirm", {
              method: "POST",
              body: { subscriptionId: data.subscriptionID },
            });
            await refreshAfterPurchase(
              "Suscripción activa. Recibirás recursos cada 24 horas.",
            );
          } catch (error) {
            setModalStatus(error.message, true);
          }
        },
        onError: (error) => {
          setModalStatus(
            `PayPal: ${error?.message ?? "error desconocido"}`,
            true,
          );
        },
        onCancel: () => setModalStatus("Suscripción cancelada."),
      });
      await buyButton.render(container);
      setModalStatus("");
    } finally {
      preparing = false;
    }
  }

  async function refresh() {
    setStatus("Cargando tienda...");
    try {
      user = await getCurrentUser();
      if (!user) {
        renderAccountBar();
        setStatus("Inicia sesión para comprar.");
        return;
      }
      const [storeData, accountData] = await Promise.all([
        api("/api/store/products"),
        api("/api/account"),
      ]);
      products = storeData.products ?? [];
      config = storeData.config ?? null;
      summary = accountData;
      renderAccountBar();
      renderTabs();
      renderGrid();
      setStatus(
        config?.configured
          ? ""
          : "PayPal no está configurado todavía. Puedes explorar el catálogo.",
      );
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
            category = product.category;
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
  };
}
