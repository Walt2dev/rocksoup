export const POTION_DATA = Object.freeze([
  Object.freeze({
    id: "healingPotion",
    name: "Poci\u00F3n de curaci\u00F3n",
    description: "Bebida mineral que restaura 45 de salud.",
    costs: Object.freeze({ Ca: 2, agua: 1, bayas: 1 }),
    researchCosts: Object.freeze({ Ca: 2, agua: 1, bayas: 1 }),
    effect: Object.freeze({ type: "heal", amount: 45 }),
    color: "#7ec699",
  }),
  Object.freeze({
    id: "poisonPotion",
    name: "Poci\u00F3n de veneno",
    description: "Selecciona la poci\u00F3n y haz clic en un enemigo para envenenarlo.",
    costs: Object.freeze({ Zn: 1, C: 1, agua: 1 }),
    researchCosts: Object.freeze({ Zn: 1, C: 1, agua: 1 }),
    effect: Object.freeze({ type: "poisonEnemy", damage: 5, duration: 8 }),
    color: "#b06bff",
    offensive: true,
  }),
  Object.freeze({
    id: "furyPotion",
    name: "Poci\u00F3n de furia",
    description: "Aumenta un 50% tu ataque durante 30 segundos.",
    costs: Object.freeze({ Fe: 2, C: 1, agua: 1 }),
    researchCosts: Object.freeze({ Fe: 2, C: 1, agua: 1 }),
    effect: Object.freeze({ type: "attackBuff", multiplier: 1.5, duration: 30 }),
    color: "#e06c75",
  }),
  Object.freeze({
    id: "resistancePotion",
    name: "Poci\u00F3n de resistencia",
    description: "Reduce un 35% el da\u00F1o recibido durante 30 segundos.",
    costs: Object.freeze({ Mg: 2, Ca: 1, agua: 1 }),
    researchCosts: Object.freeze({ Mg: 2, Ca: 1, agua: 1 }),
    effect: Object.freeze({ type: "resistanceBuff", reduction: 0.35, duration: 30 }),
    color: "#6ca9e0",
  }),
  Object.freeze({
    id: "unstablePotion",
    name: "Poci\u00F3n inestable",
    description: "Resultado aleatorio: puede darte una ventaja, una mezcla o un efecto adverso.",
    costs: Object.freeze({ Si: 2, Cu: 1, Zn: 1, agua: 1 }),
    researchCosts: Object.freeze({ Si: 2, Cu: 1, Zn: 1, agua: 1 }),
    effect: Object.freeze({ type: "unstable" }),
    color: "#d8c46a",
    unstable: true,
  }),
]);

const POTIONS_BY_ID = new Map(POTION_DATA.map((potion) => [potion.id, potion]));

export function potionById(id) {
  return POTIONS_BY_ID.get(id) ?? null;
}
