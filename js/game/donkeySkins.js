export const BUILTIN_DONKEY_SKINS = Object.freeze([
  Object.freeze({
    id: "gris",
    name: "Gris",
    description: "Burro gris de montaña, resistente y tranquilo.",
    body: "#9a958c",
    bodyDark: "#746f68",
    mane: "#4e4a45",
    muzzle: "#c4b9a8",
    hoof: "#3b3631",
    accent: "#d8c46a",
  }),
  Object.freeze({
    id: "castano",
    name: "Castaño",
    description: "Pelaje castaño cálido y crin oscura.",
    body: "#9b6847",
    bodyDark: "#744a32",
    mane: "#4a2d21",
    muzzle: "#d8b995",
    hoof: "#3a281f",
    accent: "#e0a458",
  }),
  Object.freeze({
    id: "pinto",
    name: "Pinto",
    description: "Manchas claras sobre pelaje oscuro.",
    body: "#5e5148",
    bodyDark: "#3f3731",
    mane: "#2d2723",
    muzzle: "#d8c7a8",
    hoof: "#2a241f",
    accent: "#f0e4c8",
    spotted: true,
  }),
]);

export const DEFAULT_DONKEY_SKIN_ID = "gris";

export function normalizeDonkeySkinId(value, availableIds = null) {
  if (typeof value !== "string" || value.length === 0) {
    return DEFAULT_DONKEY_SKIN_ID;
  }

  if (Array.isArray(availableIds) && !availableIds.includes(value)) {
    return availableIds.includes(DEFAULT_DONKEY_SKIN_ID)
      ? DEFAULT_DONKEY_SKIN_ID
      : availableIds[0] ?? DEFAULT_DONKEY_SKIN_ID;
  }

  return value.slice(0, 64);
}

export function builtinDonkeySkin(id) {
  return (
    BUILTIN_DONKEY_SKINS.find((skin) => skin.id === id) ??
    BUILTIN_DONKEY_SKINS[0]
  );
}
