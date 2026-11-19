import { api } from "../net/api.js";
import {
  getCurrentUser,
  loginWithPassword,
  registerWithPassword,
  signOut,
} from "../net/auth.js";
import { createRng, randomSeed } from "../core/rng.js";

function el(id) {
  return document.getElementById(id);
}

function formatDate(timestamp) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "sin guardar";
  }
  try {
    return new Intl.DateTimeFormat("es", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(timestamp));
  } catch {
    return "sin guardar";
  }
}

function setStatus(message, isError = false) {
  const node = el("account-status");
  if (!node) {
    return;
  }
  node.textContent = message || "";
  node.classList.toggle("is-error", Boolean(isError));
}

export function createAccountUI({
  onPlayWorld,
  onOpenStore,
  onUploadLocal,
  onUserChanged,
  onSessionReady,
} = {}) {
  let user = null;
  let summary = null;
  let busy = false;

  function renderGuest() {
    el("account-guest").hidden = false;
    el("account-user").hidden = true;
    setStatus("");
    const container = el("account-google");
    if (container) {
      container.replaceChildren();
      container.hidden = true;
    }
    const googleNote = el("account-google-note");
    if (googleNote) {
      googleNote.hidden = true;
    }
  }

  function renderUser() {
    el("account-guest").hidden = true;
    el("account-user").hidden = false;

    const avatar = el("account-avatar");
    if (avatar) {
      if (user?.avatarUrl) {
        avatar.src = user.avatarUrl;
        avatar.hidden = false;
      } else {
        avatar.removeAttribute("src");
        avatar.hidden = true;
      }
    }
    el("account-name").textContent = user?.displayName ?? "Jugador";
    el("account-email").textContent = user?.email ?? "";

    const slots = summary?.slots ?? {
      free: 1,
      purchased: 0,
      capacity: 1,
      used: 0,
    };
    const diamondsNode = el("account-diamonds");
    if (diamondsNode) {
      const nextValue = String(summary?.diamonds ?? 0);
      if (diamondsNode.textContent !== nextValue) {
        diamondsNode.textContent = nextValue;
      }
      diamondsNode.classList.remove("is-bump");
      void diamondsNode.offsetWidth;
      diamondsNode.classList.add("is-bump");
    }
    el("account-worlds-count").textContent = `${slots.used}/${slots.capacity}`;

    const activeSub = (summary?.subscriptions ?? []).find(
      (entry) => entry.status === "ACTIVE",
    );
    el("account-sub").textContent = activeSub?.name ?? "Ninguna";
    el("account-pending").hidden = !(summary?.pendingGrants > 0);
    el("account-pending").textContent =
      summary?.pendingGrants > 0
        ? `${summary.pendingGrants} recompensa(s) esperando al cargar un mundo.`
        : "";

    renderWorlds();
    renderPurchases();
  }

  function renderPurchases() {
    const container = el("account-purchases");
    if (!container) {
      return;
    }
    const purchases = Array.isArray(summary?.purchases) ? summary.purchases : [];
    if (purchases.length === 0) {
      const empty = document.createElement("p");
      empty.className = "account-note";
      empty.textContent = "Todavía no tienes compras.";
      container.replaceChildren(empty);
      return;
    }
    container.replaceChildren(
      ...purchases.map((purchase) => {
        const row = document.createElement("div");
        row.className = "account-world";
        const info = document.createElement("div");
        info.className = "account-world-info";
        const name = document.createElement("strong");
        name.textContent = purchase.productName || purchase.productId;
        const meta = document.createElement("span");
        meta.textContent = `${formatPrice(purchase.amountCents, purchase.currency)} · ${formatDate(purchase.createdAt)}`;
        const status = document.createElement("small");
        status.textContent = `Estado: ${purchase.status} · Entrega: ${purchase.grantStatus}`;
        info.append(name, meta, status);
        row.append(info);
        return row;
      }),
    );
  }

  function formatPrice(cents, currency = "MXN") {
    try {
      return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency,
      }).format((Number(cents) || 0) / 100);
    } catch {
      return `$${((Number(cents) || 0) / 100).toFixed(2)} ${currency}`;
    }
  }

  function renderWorlds() {
    const container = el("account-worlds");
    if (!container) {
      return;
    }
    const worlds = summary?.worlds ?? [];
    if (worlds.length === 0) {
      const empty = document.createElement("p");
      empty.className = "account-note";
      empty.textContent =
        "Aún no tienes mundos en la nube. Crea uno o sube tu partida local.";
      container.replaceChildren(empty);
      return;
    }

    container.replaceChildren(
      ...worlds.map((world) => {
        const card = document.createElement("article");
        card.className = "account-world";

        const info = document.createElement("div");
        info.className = "account-world-info";
        const name = document.createElement("strong");
        name.textContent = world.name;
        const meta = document.createElement("span");
        meta.textContent = `Seed ${world.seed} · ${formatDate(world.updatedAt)} · ${world.lore?.events ?? 0} eventos`;
        const latest = document.createElement("small");
        latest.textContent = world.lore?.latest?.at(-1)?.text ?? "Sin crónica todavía.";
        info.append(name, meta, latest);

        const actions = document.createElement("div");
        actions.className = "account-world-actions";

        const play = document.createElement("button");
        play.type = "button";
        play.className = "menu-button primary";
        play.textContent = "Jugar";
        play.addEventListener("click", () => {
          void playWorld(world);
        });

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "menu-button danger";
        remove.textContent = "Borrar";
        remove.addEventListener("click", () => {
          void deleteWorld(world);
        });

        actions.append(play, remove);
        card.append(info, actions);
        return card;
      }),
    );
  }

  async function playWorld(world) {
    if (busy) {
      return;
    }
    busy = true;
    setStatus("Cargando mundo desde la nube...");
    try {
      const data = await api(`/api/worlds/${encodeURIComponent(world.id)}`);
      setStatus("");
      onPlayWorld?.(data.world, {
        grants: data.grants,
        subscriptionPeriods: data.subscriptionPeriods,
      });
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      busy = false;
    }
  }

  async function deleteWorld(world) {
    if (!window.confirm(`¿Borrar "${world.name}" de la nube? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await api(`/api/worlds/${encodeURIComponent(world.id)}`, {
        method: "DELETE",
      });
      await refresh();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function createWorld({ name, seed, payload }) {
    if (busy) {
      return;
    }
    busy = true;
    setStatus("Creando mundo en la nube...");
    try {
      const cleanSeed = (() => {
        try {
          return seed ? createRng(seed).seed : randomSeed();
        } catch {
          return randomSeed();
        }
      })();
      const data = await api("/api/worlds", {
        method: "POST",
        body: {
          name: name || "Mi mundo",
          seed: cleanSeed,
          mode: "solo",
          payload: payload ?? null,
        },
      });
      setStatus("");
      await refresh();
      onPlayWorld?.(
        { ...data.world, payload: payload ?? null },
        { newWorld: !payload },
      );
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      busy = false;
    }
  }

  async function refresh() {
    setStatus("Consultando tu cuenta...");
    try {
      user = await getCurrentUser();
      onSessionReady?.(user);
      if (!user) {
        summary = null;
        renderGuest();
        return;
      }
      const data = await api("/api/account");
      user = data.user ?? user;
      summary = data;
      renderUser();
      setStatus("");
    } catch (error) {
      if (error.status === 401) {
        user = null;
        summary = null;
        renderGuest();
        return;
      }
      setStatus(error.message, true);
    }
  }

  function bind() {
    el("btn-account-back")?.addEventListener("click", () => {
      onBack?.();
    });
    el("account-guest-continue")?.addEventListener("click", () => {
      onBack?.();
    });
    el("account-login-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (busy) {
        return;
      }
      busy = true;
      setStatus("Iniciando sesión...");
      try {
        const nextUser = await loginWithPassword({
          email: el("account-login-email")?.value ?? "",
          password: el("account-login-password")?.value ?? "",
        });
        user = nextUser;
        onUserChanged?.(nextUser);
        await refresh();
        setStatus("Sesión iniciada.");
      } catch (error) {
        setStatus(error.message, true);
      } finally {
        busy = false;
      }
    });
    el("account-register-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (busy) {
        return;
      }
      busy = true;
      setStatus("Creando cuenta...");
      try {
        const nextUser = await registerWithPassword({
          name: el("account-register-name")?.value ?? "",
          email: el("account-register-email")?.value ?? "",
          password: el("account-register-password")?.value ?? "",
        });
        user = nextUser;
        onUserChanged?.(nextUser);
        await refresh();
        setStatus("Cuenta creada. Sesión iniciada.");
      } catch (error) {
        setStatus(error.message, true);
      } finally {
        busy = false;
      }
    });
    el("account-store")?.addEventListener("click", () => onOpenStore?.());
    el("account-buy-slot")?.addEventListener("click", () => {
      onOpenStore?.("world_slot");
    });
    el("account-upload-local")?.addEventListener("click", () => {
      const name = window.prompt("Nombre del mundo en la nube:", "Mi mundo");
      if (name === null) {
        return;
      }
      const payload = onUploadLocal?.();
      if (!payload) {
        setStatus("No hay una partida individual guardada para subir.", true);
        return;
      }
      void createWorld({ name, seed: payload.seed, payload });
    });
    el("account-new-world")?.addEventListener("click", () => {
      const name = window.prompt("Nombre del mundo nuevo:", "Mi mundo");
      if (name === null) {
        return;
      }
      const seed = window.prompt("Semilla (vacío = aleatoria):", "");
      if (seed === null) {
        return;
      }
      void createWorld({ name, seed: seed.trim() });
    });
    el("account-logout")?.addEventListener("click", async () => {
      setStatus("Cerrando sesión...");
      await signOut();
      user = null;
      summary = null;
      onUserChanged?.(null);
      renderGuest();
      setStatus("Sesión cerrada.");
    });
  }

  let onBack = null;

  bind();

  return {
    setOnBack(fn) {
      onBack = fn;
    },
    open() {
      void refresh();
    },
    refresh,
    createWorld,
    get user() {
      return user;
    },
    get summary() {
      return summary;
    },
  };
}
