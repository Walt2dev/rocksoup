import { isPrivateHostname } from "./wsUrl.js";

const SESSION_KEY = "rocksoup.session.v1";
const API_OVERRIDE_PATTERN = /^[a-zA-Z0-9.\-:\[\]]+$/;

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getSessionToken() {
  try {
    const token = window.localStorage.getItem(SESSION_KEY);
    return typeof token === "string" && token.length >= 8 ? token : "";
  } catch {
    return "";
  }
}

export function setSessionToken(token) {
  try {
    if (token) {
      window.localStorage.setItem(SESSION_KEY, token);
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Almacenamiento bloqueado.
  }
}

export function clearSessionToken() {
  setSessionToken("");
}

export function apiBase() {
  const override = new URLSearchParams(window.location.search).get("api");
  if (typeof override === "string" && API_OVERRIDE_PATTERN.test(override)) {
    return `${window.location.protocol}//${override}`;
  }

  const port = window.location.port;
  const defaultPort = !port || port === "80" || port === "443";
  if (!defaultPort) {
    return window.location.origin;
  }
  if (isPrivateHostname(window.location.hostname)) {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return window.location.origin;
}

export function apiUrl(path) {
  const base = apiBase().replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function api(path, { method = "GET", body = null, timeout = 20000 } = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  const headers = { Accept: "application/json" };
  const token = getSessionToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (body !== null) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetch(apiUrl(path), {
      method,
      headers,
      credentials: "include",
      body: body === null ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    throw new ApiError(
      error.name === "AbortError"
        ? "El servidor tardó demasiado en responder."
        : "No se pudo conectar con el servidor del juego.",
      0,
    );
  } finally {
    window.clearTimeout(timer);
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      data?.error || `El servidor respondió ${response.status}`,
      response.status,
      data,
    );
  }

  return data;
}

export const apiClient = {
  get: (path) => api(path),
  post: (path, body = {}) => api(path, { method: "POST", body }),
  put: (path, body = {}) => api(path, { method: "PUT", body }),
  delete: (path) => api(path, { method: "DELETE" }),
};
