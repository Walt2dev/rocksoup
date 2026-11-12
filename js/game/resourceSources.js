export const RESOURCE_SOURCES = Object.freeze({
  madera: "Se obtiene talando árboles.",
  tierra: "Se obtiene excavando terreno con el pico.",
  piedra: "Se obtiene minando nodos de piedra o excavando roca.",
  bayas: "Se recogen de arbustos de pradera, bosque y selva.",
  agua: "Se recoge haciendo clic en agua cercana.",
  fibra: "Se obtiene de arbustos, arbustos secos y cactus. El cuchillo da +1.",
  semillaHierba: "Se recoge de la hierba alta y de los cultivos de trigo.",
  semillaArbol: "La sueltan los árboles al talarlos.",
  semillaTrigo: "Se recoge de la hierba alta y de la cosecha de trigo.",
  semillaMaiz: "Se recoge de la hierba de selva y de la cosecha de maíz.",
  trigo: "Se cosecha de las parcelas de trigo maduras.",
  maiz: "Se cosecha de las parcelas de maíz maduras.",
  pluma: "La sueltan los pájaros al derrotarlos.",
  amatista: "Mineral raro de las vetas profundas; requiere pico.",
  cuarzo: "Mineral raro de las vetas profundas; requiere pico.",
  C: "Vetas de carbón, sobre todo en zonas rocosas.",
  Fe: "Vetas minerales de hierro; requiere pico.",
  Ca: "Vetas minerales de calcio; requiere pico.",
  Mg: "Vetas minerales de magnesio; requiere pico.",
  Zn: "Vetas minerales de zinc; requiere pico.",
  Si: "Vetas minerales de silicio; requiere pico.",
  Cu: "Vetas minerales de cobre; requiere pico.",
  oro: "Vetas raras de oro junto a ríos y costas (requiere pico); también del comercio entre aldeas y caravanas.",
  piel: "Se obtiene al cazar zorros.",
  pielLobo: "Se obtiene al derrotar lobos del bosque de lobos.",
  telarana: "Se obtiene al derrotar arañas nocturnas.",
});

export const TOOL_SOURCES = Object.freeze({
  axe: "Se fabrica en Crafteo > Herramientas.",
  pickaxe: "Se fabrica en Crafteo > Herramientas.",
  spear: "Se fabrica en Crafteo > Herramientas.",
  knife: "Se fabrica en Crafteo > Herramientas.",
  fishingRod: "Se fabrica en Crafteo > Herramientas. Úsala en agua cercana.",
  hoe: "Se fabrica en Crafteo > Herramientas. Úsala en tierra para crear parcelas.",
  sword: "Se fabrica en Crafteo > Herramientas.",
  bow: "Se fabrica en Crafteo > Herramientas. Consume flechas.",
  binoculars: "Se fabrica en Crafteo > Herramientas. Úsalos para observar aves.",
});

export const ITEM_SOURCES = Object.freeze({
  campfire: "Se fabrica en Crafteo > Construcción.",
  bowl: "Se fabrica en Crafteo > Objetos.",
  roastedBerries: "Se tuesta en el horno con bayas y carbón.",
  coffee: "Se prepara en la mesa de brebajes.",
  oven: "Se fabrica en Crafteo > Construcción.",
  brewingTable: "Se fabrica en Crafteo > Construcción.",
  bandage: "Se fabrica en Crafteo > Objetos y restaura salud.",
  chest: "Se fabrica en Crafteo > Construcción.",
  tipi: "Se fabrica en Crafteo > Construcción.",
  valla: "Se fabrica en Crafteo > Construcción.",
  torch: "Se fabrica en Crafteo > Construcción.",
  stoneWall: "Se fabrica en Crafteo > Construcción.",
  stonePath: "Se fabrica en Crafteo > Construcción con una piedra.",
  bed: "Se fabrica en Crafteo > Construcción.",
  cauldron: "Se compra o desbloquea en la Universidad.",
  healingPotion: "Se investiga en la Universidad y se prepara en el caldero.",
  poisonPotion: "Se investiga en la Universidad y se prepara en el caldero.",
  furyPotion: "Se investiga en la Universidad y se prepara en el caldero.",
  resistancePotion: "Se investiga en la Universidad y se prepara en el caldero.",
  unstablePotion: "Se investiga en la Universidad y se prepara en el caldero.",
  pescado: "Se pesca con la caña en agua cercana.",
  pescadoFrito: "Se cocina en el horno con pescado y carbón.",
  swimPotion: "Se prepara en la mesa de brebajes con pescado, agua y silicio.",
  pan: "Se hornea con trigo y carbón.",
  lunarWater: "Se prepara en la mesa de brebajes durante la luna llena.",
  starDust: "Se prepara en la mesa de brebajes durante la luna nueva.",
  moonHealingPotion: "Se prepara en el caldero en luna llena con un apunte de constelación.",
  moonPoisonPotion: "Se prepara en el caldero en luna nueva con un apunte de constelación.",
  arrow: "Se fabrican en Crafteo > Objetos con madera, piedra y plumas.",
  wolfTotem: "Se fabrica tras completar la Cueva de lobos, en Crafteo > Construcción.",
});

export function sourceFor(kind, key) {
  if (kind === "resource") {
    return RESOURCE_SOURCES[key] ?? "Se obtiene explorando el mundo.";
  }
  if (kind === "tool") {
    return TOOL_SOURCES[key] ?? "Se fabrica en Crafteo.";
  }
  if (kind === "item") {
    return ITEM_SOURCES[key] ?? "Se consigue explorando o fabricando.";
  }
  return "Se consigue explorando el mundo.";
}
