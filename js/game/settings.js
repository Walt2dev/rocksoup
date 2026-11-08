export const TOUCH_SETTING_KEY = "rocksoup.touchControls.v1";
export const LAN_NAME_KEY = "rocksoup.lan.name.v1";
export const LAN_TOKEN_KEY = "rocksoup.lan.token.v1";
export const STATS_COLLAPSED_KEY = "rocksoup.statsCollapsed.v1";

function storageAvailable() {
  try {
    return Boolean(window.localStorage);
  } catch {
    return false;
  }
}

export function defaultTouchControls() {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    navigator.maxTouchPoints > 0 ||
    window.matchMedia?.("(pointer: coarse)")?.matches === true
  );
}

export function loadTouchControls() {
  if (!storageAvailable()) {
    return defaultTouchControls();
  }

  const stored = window.localStorage.getItem(TOUCH_SETTING_KEY);
  if (stored === "1") return true;
  if (stored === "0") return false;
  return defaultTouchControls();
}

export function saveTouchControls(enabled) {
  if (!storageAvailable()) {
    return;
  }
  try {
    window.localStorage.setItem(TOUCH_SETTING_KEY, enabled ? "1" : "0");
  } catch {
    // Almacenamiento bloqueado.
  }
}

export function loadStatsCollapsed() {
  if (!storageAvailable()) {
    return false;
  }
  try {
    return window.localStorage.getItem(STATS_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveStatsCollapsed(collapsed) {
  if (!storageAvailable()) {
    return;
  }
  try {
    window.localStorage.setItem(STATS_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // Almacenamiento bloqueado.
  }
}

export function loadLanName() {
  if (!storageAvailable()) {
    return "";
  }
  try {
    return window.localStorage.getItem(LAN_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveLanName(name) {
  if (!storageAvailable()) {
    return;
  }
  try {
    window.localStorage.setItem(LAN_NAME_KEY, name);
  } catch {
    // Almacenamiento bloqueado.
  }
}

export const SKIN_SETTING_KEY = "rocksoup.skin.v1";

export function loadSkinId() {
  if (!storageAvailable()) return "explorer";
  try {
    return window.localStorage.getItem(SKIN_SETTING_KEY) ?? "explorer";
  } catch {
    return "explorer";
  }
}

export function saveSkinId(id) {
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem(SKIN_SETTING_KEY, id);
  } catch {
    // Almacenamiento bloqueado.
  }
}

export const DONKEY_SKIN_SETTING_KEY = "rocksoup.donkeySkin.v1";

export function loadDonkeySkinId() {
  if (!storageAvailable()) return "gris";
  try {
    return window.localStorage.getItem(DONKEY_SKIN_SETTING_KEY) ?? "gris";
  } catch {
    return "gris";
  }
}

export function saveDonkeySkinId(id) {
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem(DONKEY_SKIN_SETTING_KEY, id);
  } catch {
    // Almacenamiento bloqueado.
  }
}


