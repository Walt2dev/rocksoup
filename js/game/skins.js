export const BUILTIN_SKINS = Object.freeze([
  Object.freeze({
    id: "explorer",
    archetype: "explorer",
    name: "Explorador",
    description: "Viajero curtido en bosques y montañas.",
    color: "#c9784e",
  }),
  Object.freeze({
    id: "artist",
    archetype: "artist",
    name: "Artista",
    description: "Observa el mundo con mirada creativa.",
    color: "#8f68b5",
  }),
  Object.freeze({
    id: "mage",
    archetype: "mage",
    name: "Mago",
    description: "Estudioso de la luna, las estrellas y la materia.",
    color: "#4f83bd",
  }),
  Object.freeze({
    id: "warrior",
    archetype: "warrior",
    name: "Guerrero",
    description: "Protector de la aldea y cazador de criaturas.",
    color: "#b25a47",
  }),
]);

export function normalizeSkinId(value) {
  return typeof value === "string" && value.length > 0
    ? value.slice(0, 64)
    : "explorer";
}
