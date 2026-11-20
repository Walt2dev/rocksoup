import { apiUrl } from "../net/api.js";
import { applyInventoryContentOverrides } from "./inventory.js";
import { applyCraftingContentOverrides } from "./crafting.js";
import { applyStoreContentOverrides } from "./economy.js";

export function applyContentManifest(manifest) {
  if (!manifest || typeof manifest !== "object") {
    return null;
  }
  applyInventoryContentOverrides({
    resources: manifest.resources,
    items: manifest.items,
    tools: manifest.tools,
    upgrades: manifest.upgrades,
  });
  applyCraftingContentOverrides(manifest.recipes);
  applyStoreContentOverrides(manifest.store);
  return manifest;
}

export async function loadContentManifest() {
  if (typeof fetch !== "function") {
    return null;
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 2200);
  try {
    const response = await fetch(apiUrl("/api/content/manifest"), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    const manifest = await response.json();
    return applyContentManifest(manifest);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}
