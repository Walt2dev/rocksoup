const CONSTELLATION_NAMES = [
  "Andromeda", "Antlia", "Apus", "Aquarius", "Aquila", "Ara", "Aries",
  "Auriga", "Bootes", "Caelum", "Camelopardalis", "Cancer", "Canes Venatici",
  "Canis Major", "Canis Minor", "Capricornus", "Carina", "Cassiopeia",
  "Centaurus", "Cepheus", "Cetus", "Chamaeleon", "Circinus", "Columba",
  "Coma Berenices", "Corona Australis", "Corona Borealis", "Corvus", "Crater",
  "Crux", "Cygnus", "Delphinus", "Dorado", "Draco", "Equuleus", "Eridanus",
  "Fornax", "Gemini", "Grus", "Hercules", "Horologium", "Hydra", "Hydrus",
  "Indus", "Lacerta", "Leo", "Leo Minor", "Lepus", "Libra", "Lupus", "Lynx",
  "Lyra", "Mensa", "Microscopium", "Monoceros", "Musca", "Norma", "Octans",
  "Ophiuchus", "Orion", "Pavo", "Pegasus", "Perseus", "Phoenix", "Pictor",
  "Pisces", "Piscis Austrinus", "Puppis", "Pyxis", "Reticulum", "Sagitta",
  "Sagittarius", "Scorpius", "Sculptor", "Scutum", "Serpens", "Sextans",
  "Taurus", "Telescopium", "Triangulum", "Triangulum Australe", "Tucana",
  "Ursa Major", "Ursa Minor", "Vela", "Virgo", "Volans", "Vulpecula",
];

function abbreviation(name) {
  return name
    .split(/\s+/)
    .map((part) => part.slice(0, 3))
    .join("")
    .slice(0, 6);
}

export const CONSTELLATIONS = Object.freeze(
  CONSTELLATION_NAMES.map((name, index) => {
    const ra = (0.8 + index * 0.2727) % 24;
    const dec = -72 + ((index * 37) % 144);
    const stars = [0, 1, 2, 3, 4].map((star) => ({
      ra: (ra + (star - 2) * 0.42 + 24) % 24,
      dec: Math.max(-85, Math.min(85, dec + (star - 2) * 4.2)),
      magnitude: 1.4 + star * 0.45 + (index % 3) * 0.12,
    }));

    return Object.freeze({
      id: `constellation:${index}`,
      kind: "constellation",
      name,
      abbr: abbreviation(name),
      ra,
      dec,
      stars,
      color: "#9fc7ff",
      description: `Constelación ${name} · coordenadas aproximadas RA ${ra.toFixed(2)}h, Dec ${dec.toFixed(1)}°.`,
    });
  }),
);

export const PLANETS = Object.freeze([
  Object.freeze({
    id: "planet:mercury",
    kind: "planet",
    name: "Mercurio",
    ra: 6.1,
    dec: 18.5,
    color: "#b8b0a2",
    size: 2.1,
    description: "El planeta más cercano al Sol. Visible al amanecer o al atardecer.",
  }),
  Object.freeze({
    id: "planet:venus",
    kind: "planet",
    name: "Venus",
    ra: 3.4,
    dec: 12.2,
    color: "#f0dfa0",
    size: 3.1,
    description: "El lucero del alba, el objeto más brillante del cielo tras la Luna.",
  }),
  Object.freeze({
    id: "planet:mars",
    kind: "planet",
    name: "Marte",
    ra: 15.8,
    dec: -18.4,
    color: "#df7956",
    size: 2.6,
    description: "El planeta rojo. Su color procede del óxido de hierro.",
  }),
  Object.freeze({
    id: "planet:jupiter",
    kind: "planet",
    name: "Júpiter",
    ra: 8.6,
    dec: 20.3,
    color: "#d8b98d",
    size: 4.2,
    description: "El gigante gaseoso más grande del sistema solar.",
  }),
  Object.freeze({
    id: "planet:saturn",
    kind: "planet",
    name: "Saturno",
    ra: 21.3,
    dec: -12.8,
    color: "#e0c781",
    size: 3.7,
    description: "El señor de los anillos. Sus anillos son hielo y roca.",
  }),
  Object.freeze({
    id: "planet:uranus",
    kind: "planet",
    name: "Urano",
    ra: 2.2,
    dec: 16.7,
    color: "#8ad5df",
    size: 2.9,
    description: "Un gigante helado que gira casi tumbado.",
  }),
  Object.freeze({
    id: "planet:neptune",
    kind: "planet",
    name: "Neptuno",
    ra: 23.6,
    dec: -4.5,
    color: "#6c9fe0",
    size: 2.8,
    description: "El planeta más lejano del sistema solar.",
  }),
]);

export const SKY_OBJECTS = Object.freeze([...CONSTELLATIONS, ...PLANETS]);

export function skyObjectById(id) {
  return SKY_OBJECTS.find((object) => object.id === id) ?? null;
}

export function searchSkyObjects(query) {
  const normalized = String(query ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (!normalized) {
    return SKY_OBJECTS;
  }

  return SKY_OBJECTS.filter((object) =>
    `${object.name} ${object.abbr ?? ""}`.toLowerCase().includes(normalized),
  );
}
