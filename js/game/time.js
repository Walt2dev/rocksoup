export const DAY_LENGTH_SECONDS = 8 * 60;
export const NIGHT_LENGTH_SECONDS = 4 * 60;
export const DAY_NIGHT_CYCLE = DAY_LENGTH_SECONDS + NIGHT_LENGTH_SECONDS;

export const MOON_PHASES = Object.freeze([
  Object.freeze({ id: "new", name: "Luna nueva", icon: "●" }),
  Object.freeze({ id: "waxingCrescent", name: "Luna creciente", icon: "◔" }),
  Object.freeze({ id: "firstQuarter", name: "Cuarto creciente", icon: "◑" }),
  Object.freeze({ id: "waxingGibbous", name: "Gibosa creciente", icon: "◕" }),
  Object.freeze({ id: "full", name: "Luna llena", icon: "○" }),
  Object.freeze({ id: "waningGibbous", name: "Gibosa menguante", icon: "◕" }),
  Object.freeze({ id: "lastQuarter", name: "Cuarto menguante", icon: "◑" }),
  Object.freeze({ id: "waningCrescent", name: "Luna menguante", icon: "◔" }),
]);

export function gameDayAt(time) {
  return Math.floor(Math.max(0, time) / DAY_NIGHT_CYCLE) + 1;
}

export function isNightAt(time) {
  return Math.max(0, time) % DAY_NIGHT_CYCLE >= DAY_LENGTH_SECONDS;
}

export function moonPhaseIndexAt(time) {
  return Math.floor(Math.max(0, time) / DAY_NIGHT_CYCLE) % MOON_PHASES.length;
}

export function moonPhaseAt(time) {
  return MOON_PHASES[moonPhaseIndexAt(time)];
}
