import { api, clearSessionToken, setSessionToken } from "./api.js";

const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";
const REF_KEY = "rocksoup.ref";
let scriptPromise = null;
let configPromise = null;
let initializedFor = "";

try {
  const ref = new URLSearchParams(window.location.search).get("ref");
  if (ref && /^\d{1,18}$/.test(ref)) {
    window.localStorage.setItem(REF_KEY, ref);
  }
} catch {
  // Sin almacenamiento o URL inválida.
}

function getReferral() {
  try {
    return window.localStorage.getItem(REF_KEY) ?? "";
  } catch {
    return "";
  }
}

function loadScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  if (scriptPromise) {
    return scriptPromise;
  }
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google no cargó")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("No se pudo cargar Google Sign-In")),
      { once: true },
    );
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function loadAuthConfig({ refresh = false } = {}) {
  if (!configPromise || refresh) {
    configPromise = api("/api/auth/config").catch((error) => ({
      googleClientId: null,
      authConfigured: false,
      dbConfigured: false,
      error: error.message,
    }));
  }
  return configPromise;
}

export async function getCurrentUser() {
  const data = await api("/api/auth/me");
  return data?.user ?? null;
}

export async function registerWithPassword({ name, email, password }) {
  const ref = getReferral();
  const data = await api("/api/auth/register", {
    method: "POST",
    body: { name, email, password, ...(ref ? { ref } : {}) },
  });
  if (data?.token) {
    setSessionToken(data.token);
  }
  try {
    window.localStorage.removeItem(REF_KEY);
  } catch {
    // Almacenamiento bloqueado.
  }
  return data?.user ?? null;
}

export async function loginWithPassword({ email, password }) {
  const data = await api("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (data?.token) {
    setSessionToken(data.token);
  }
  return data?.user ?? null;
}

export async function renderGoogleButton(container, { onUser, onError } = {}) {
  if (!container) {
    return null;
  }
  const config = await loadAuthConfig();
  container.replaceChildren();

  if (!config.googleClientId) {
    const note = document.createElement("p");
    note.className = "account-note";
    note.textContent = config.dbConfigured
      ? "Google Sign-In aún no está configurado. Define GOOGLE_CLIENT_ID en el servidor."
      : "El servidor no tiene MySQL configurado. Puedes jugar como invitado en LAN.";
    container.append(note);
    return config;
  }

  try {
    await loadScript();
    const clientId = config.googleClientId;
    if (initializedFor !== clientId) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: async (response) => {
          try {
            const data = await api("/api/auth/google", {
              method: "POST",
              body: { credential: response.credential },
            });
            if (data?.token) {
              setSessionToken(data.token);
            }
            onUser?.(data?.user ?? null);
          } catch (error) {
            onError?.(error);
          }
        },
      });
      initializedFor = clientId;
    }
    window.google.accounts.id.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "pill",
      logo_alignment: "left",
      locale: "es",
      width: 260,
    });
    return config;
  } catch (error) {
    const note = document.createElement("p");
    note.className = "account-note";
    note.textContent = error.message;
    container.append(note);
    onError?.(error);
    return config;
  }
}

export async function signOut() {
  try {
    await api("/api/auth/logout", { method: "POST", body: {} });
  } catch {
    // La sesión local se borra igualmente.
  }
  clearSessionToken();
  try {
    window.google?.accounts?.id?.disableAutoSelect?.();
  } catch {
    // Google puede no estar cargado.
  }
}
