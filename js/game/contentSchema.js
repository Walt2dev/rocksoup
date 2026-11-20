export const CONTENT_KINDS = Object.freeze([
  "resource",
  "item",
  "tool",
  "upgrade",
  "recipe",
  "store",
]);

export const CONTENT_META = Object.freeze({
  resource: Object.freeze({ label: "Recursos", singular: "Recurso" }),
  item: Object.freeze({ label: "Objetos", singular: "Objeto" }),
  tool: Object.freeze({ label: "Herramientas", singular: "Herramienta" }),
  upgrade: Object.freeze({ label: "Mejoras", singular: "Mejora" }),
  recipe: Object.freeze({ label: "Recetas", singular: "Receta" }),
  store: Object.freeze({ label: "Tienda", singular: "Producto" }),
});

const text = (key, label, max = 120, extra = {}) => ({
  key,
  label,
  type: "text",
  max,
  ...extra,
});
const textarea = (key, label, max = 300) => ({
  key,
  label,
  type: "textarea",
  max,
});
const color = (key, label) => ({ key, label, type: "color" });
const number = (key, label, min = 0, max = 1000000, step = 1) => ({
  key,
  label,
  type: "number",
  min,
  max,
  step,
});
const checkbox = (key, label) => ({ key, label, type: "checkbox" });
const json = (key, label, help = "") => ({ key, label, type: "json", help });

export const CONTENT_FIELDS = Object.freeze({
  resource: Object.freeze([
    text("label", "Nombre", 40),
    color("color", "Color"),
    text("symbol", "Símbolo", 4),
    textarea("description", "Descripción", 220),
    textarea("source", "Cómo se obtiene", 220),
    checkbox("active", "Activo"),
  ]),
  item: Object.freeze([
    text("label", "Nombre", 60),
    text("symbol", "Símbolo", 4),
    textarea("description", "Descripción", 220),
    checkbox("active", "Activo"),
  ]),
  tool: Object.freeze([
    text("label", "Nombre", 60),
    text("short", "Nombre corto", 24),
    text("symbol", "Símbolo", 4),
    textarea("description", "Descripción", 220),
    checkbox("active", "Activo"),
  ]),
  upgrade: Object.freeze([
    text("label", "Nombre", 60),
    textarea("description", "Descripción", 220),
    checkbox("active", "Activo"),
  ]),
  recipe: Object.freeze([
    text("name", "Nombre", 60),
    textarea("description", "Descripción", 220),
    {
      key: "category",
      label: "Categoría",
      type: "select",
      options: [
        { value: "tools", label: "Herramientas" },
        { value: "build", label: "Construcción" },
        { value: "items", label: "Objetos" },
        { value: "upgrades", label: "Mejoras" },
      ],
    },
    json("costs", "Costes", 'Ej: {"madera": 2, "piedra": 3}'),
    number("amount", "Cantidad producida", 1, 9999),
    text("requiresTool", "Herramienta requerida", 32),
    checkbox("requiresWolfMission", "Requiere Cueva de lobos"),
    checkbox("active", "Activa"),
  ]),
  store: Object.freeze([
    text("name", "Nombre", 80),
    textarea("description", "Descripción", 255),
    {
      key: "priceCurrency",
      label: "Moneda",
      type: "select",
      options: [
        { value: "drac", label: "DracCoins" },
        { value: "prestige", label: "Prestigio" },
      ],
    },
    number("priceAmount", "Precio", 0, 1000000),
    text("badge", "Etiqueta", 32),
    json("highlights", "Destacados", 'Ej: ["Recursos cada 24 h"]'),
    json("grants", "Recompensas", 'Ej: {"resources": {"C": 40}}'),
    json("dailyGrants", "Recompensas diarias", "Solo para contratos"),
    checkbox("active", "Activo"),
  ]),
});

export function normalizeTextValue(value, max = 120, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return (clean || fallback).slice(0, max);
}

export function normalizeColorValue(value, fallback = "#8b929b") {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value.toLowerCase()
    : fallback;
}

export function normalizeNumberValue(value, fallback = 0, min = 0, max = 1000000) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(numberValue)));
}

export function contentFieldKeys(kind) {
  return (CONTENT_FIELDS[kind] ?? []).map((field) => field.key);
}
