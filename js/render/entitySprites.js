import { builtinDonkeySkin } from "../game/donkeySkins.js";

const RESOLUTION = 2;
const WIDTH = 46;
const HEIGHT = 66;

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const PLAYER_ARCHETYPE_STYLES = Object.freeze({
  explorer: Object.freeze({
    cloak: "#b0603a",
    cloakLight: "#c9784e",
    cloakDark: "#814429",
    hood: "#7a4528",
    scarf: "#e0a458",
    pants: "#34424f",
    boots: "#2a211b",
    accent: "#d9a15b",
  }),
  artist: Object.freeze({
    cloak: "#6d4a8f",
    cloakLight: "#8f68b5",
    cloakDark: "#4e3569",
    hood: "#704f7c",
    scarf: "#e0a458",
    pants: "#344052",
    boots: "#2a211b",
    accent: "#f0c07a",
  }),
  mage: Object.freeze({
    cloak: "#315b8a",
    cloakLight: "#4f83bd",
    cloakDark: "#213f62",
    hood: "#2d4f7a",
    scarf: "#8fd1e8",
    pants: "#28384f",
    boots: "#1e2733",
    accent: "#8fd1e8",
  }),
  warrior: Object.freeze({
    cloak: "#8a3e34",
    cloakLight: "#b25a47",
    cloakDark: "#623029",
    hood: "#7d7f84",
    scarf: "#e0a458",
    pants: "#4a4f57",
    boots: "#262a30",
    accent: "#c7cdd5",
  }),
});

function drawPlayerArchetypeAccessory(ctx, archetype, centerX, baseY, bob) {
  if (archetype === "mage") {
    ctx.beginPath();
    ctx.moveTo(centerX - 13, baseY - 48 + bob);
    ctx.lineTo(centerX + 2, baseY - 63 + bob);
    ctx.lineTo(centerX + 15, baseY - 48 + bob);
    ctx.closePath();
    ctx.fillStyle = "#24476f";
    ctx.fill();
    ctx.strokeStyle = "#182d47";
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(centerX + 1, baseY - 48 + bob, 15, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#315b8a";
    ctx.fill();
    ctx.stroke();
  } else if (archetype === "warrior") {
    ctx.beginPath();
    ctx.arc(centerX + 1, baseY - 41 + bob, 11, Math.PI, 0);
    ctx.fillStyle = "#7d7f84";
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX - 10, baseY - 41 + bob);
    ctx.lineTo(centerX + 1, baseY - 53 + bob);
    ctx.lineTo(centerX + 12, baseY - 41 + bob);
    ctx.strokeStyle = "#c7cdd5";
    ctx.lineWidth = 1.4;
    ctx.stroke();
  } else if (archetype === "artist") {
    ctx.beginPath();
    ctx.ellipse(centerX + 1, baseY - 47 + bob, 11, 4, -0.12, 0, Math.PI * 2);
    ctx.fillStyle = "#6d4a8f";
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX + 12, baseY - 43 + bob);
    ctx.lineTo(centerX + 18, baseY - 58 + bob);
    ctx.strokeStyle = "#d9b46a";
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(centerX + 1, baseY - 49 + bob, 13, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#5a3e2a";
    ctx.fill();
    ctx.stroke();
  }
}

function createPlayerSprite(frame, archetype = "explorer") {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * RESOLUTION;
  canvas.height = HEIGHT * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const centerX = WIDTH / 2;
  const baseY = HEIGHT - 5;
  const bob = frame === 0 ? 0 : frame === 1 ? -1 : 0;
  const swing = frame === 1 ? 2.8 : frame === 2 ? -2.8 : 0;

  const style =
    PLAYER_ARCHETYPE_STYLES[archetype] ?? PLAYER_ARCHETYPE_STYLES.explorer;
  const outline = "#261a12";
  const cloak = style.cloak;
  const cloakLight = style.cloakLight;
  const cloakDark = style.cloakDark;
  const hood = style.hood;
  const skin = "#e4b189";
  const skinShadow = "#c98e69";
  const pants = style.pants;
  const boots = style.boots;
  const scarf = style.scarf;

  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;

  roundedRectPath(ctx, centerX - 8 + swing, baseY - 16, 6, 14, 2.5);
  ctx.fillStyle = pants;
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, centerX + 2 - swing, baseY - 16, 6, 14, 2.5);
  ctx.fillStyle = pants;
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, centerX - 9 + swing, baseY - 5, 8, 5, 2);
  ctx.fillStyle = boots;
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, centerX + 1 - swing, baseY - 5, 8, 5, 2);
  ctx.fillStyle = boots;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX - 11, baseY - 29 + bob);
  ctx.quadraticCurveTo(centerX - 14, baseY - 18 + bob, centerX - 10, baseY - 10 + bob);
  ctx.lineTo(centerX + 10, baseY - 10 + bob);
  ctx.quadraticCurveTo(centerX + 14, baseY - 18 + bob, centerX + 11, baseY - 29 + bob);
  ctx.closePath();
  ctx.fillStyle = cloak;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX - 9, baseY - 27 + bob);
  ctx.quadraticCurveTo(centerX - 11, baseY - 18 + bob, centerX - 8, baseY - 11 + bob);
  ctx.lineTo(centerX - 3, baseY - 11 + bob);
  ctx.lineTo(centerX - 3, baseY - 27 + bob);
  ctx.closePath();
  ctx.fillStyle = cloakLight;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(centerX + 8, baseY - 26 + bob);
  ctx.quadraticCurveTo(centerX + 11, baseY - 18 + bob, centerX + 8, baseY - 11 + bob);
  ctx.lineTo(centerX + 4, baseY - 11 + bob);
  ctx.lineTo(centerX + 4, baseY - 26 + bob);
  ctx.closePath();
  ctx.fillStyle = cloakDark;
  ctx.fill();

  roundedRectPath(ctx, centerX - 11, baseY - 23 + bob, 22, 3.5, 1.5);
  ctx.fillStyle = scarf;
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, centerX - 13, baseY - 27 + bob, 5, 12, 2.5);
  ctx.fillStyle = cloakDark;
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, centerX + 8, baseY - 27 + bob, 5, 12, 2.5);
  ctx.fillStyle = cloak;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX + 1, baseY - 40 + bob, 10.5, 0, Math.PI * 2);
  ctx.fillStyle = hood;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX + 2.5, baseY - 39 + bob, 7, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX + 1, baseY - 40 + bob, 7, Math.PI * 0.68, Math.PI * 1.55);
  ctx.strokeStyle = skinShadow;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.arc(centerX + 5.2, baseY - 40.5 + bob, 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(centerX - 9, baseY - 45 + bob);
  ctx.quadraticCurveTo(centerX, baseY - 54 + bob, centerX + 9, baseY - 44 + bob);
  ctx.quadraticCurveTo(centerX + 2, baseY - 47 + bob, centerX - 9, baseY - 45 + bob);
  ctx.closePath();
  ctx.fillStyle = cloakDark;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(centerX - 9.5, baseY - 19 + bob, 4, 5, -0.25, 0, Math.PI * 2);
  ctx.fillStyle = "#6d4a2e";
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#4e331f";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(centerX - 3, baseY - 28 + bob);
  ctx.lineTo(centerX - 10, baseY - 19 + bob);
  ctx.stroke();

  drawPlayerArchetypeAccessory(ctx, archetype, centerX, baseY, bob);

  return {
    canvas,
    width: WIDTH,
    height: HEIGHT,
    anchorX: centerX,
    anchorY: baseY,
  };
}

export function createPlayerSprites(archetype = "explorer") {
  return [0, 1, 2].map((frame) => createPlayerSprite(frame, archetype));
}

function createRiderSprite(frame, archetype = "explorer") {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * RESOLUTION;
  canvas.height = HEIGHT * RESOLUTION;
  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const centerX = WIDTH / 2;
  const baseY = HEIGHT - 5;
  const bob = frame === 0 ? 0 : frame === 1 ? -0.8 : 0.4;
  const sway = frame === 1 ? -1.2 : frame === 2 ? 1.2 : 0;
  const style =
    PLAYER_ARCHETYPE_STYLES[archetype] ?? PLAYER_ARCHETYPE_STYLES.explorer;
  const outline = "#261a12";
  const skin = "#e4b189";
  const skinShadow = "#c98e69";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;

  roundedRectPath(ctx, centerX - 8, baseY - 13 + bob, 6, 12, 2.5);
  ctx.fillStyle = style.pants;
  ctx.fill();
  ctx.stroke();
  roundedRectPath(ctx, centerX + 2, baseY - 13 + bob, 6, 12, 2.5);
  ctx.fillStyle = style.pants;
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, centerX - 10, baseY - 4 + bob, 8, 5, 2);
  ctx.fillStyle = style.boots;
  ctx.fill();
  ctx.stroke();
  roundedRectPath(ctx, centerX + 2, baseY - 4 + bob, 8, 5, 2);
  ctx.fillStyle = style.boots;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX - 11 + sway, baseY - 29 + bob);
  ctx.quadraticCurveTo(
    centerX - 14 + sway,
    baseY - 18 + bob,
    centerX - 9 + sway,
    baseY - 10 + bob,
  );
  ctx.lineTo(centerX + 9 + sway, baseY - 10 + bob);
  ctx.quadraticCurveTo(
    centerX + 14 + sway,
    baseY - 18 + bob,
    centerX + 11 + sway,
    baseY - 29 + bob,
  );
  ctx.closePath();
  ctx.fillStyle = style.cloak;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX - 9 + sway, baseY - 27 + bob);
  ctx.quadraticCurveTo(
    centerX - 11 + sway,
    baseY - 18 + bob,
    centerX - 7 + sway,
    baseY - 11 + bob,
  );
  ctx.lineTo(centerX - 3 + sway, baseY - 11 + bob);
  ctx.lineTo(centerX - 3 + sway, baseY - 27 + bob);
  ctx.closePath();
  ctx.fillStyle = style.cloakLight;
  ctx.fill();

  roundedRectPath(ctx, centerX - 12 + sway, baseY - 23 + bob, 23, 3.5, 1.5);
  ctx.fillStyle = style.scarf;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX + 1 + sway, baseY - 40 + bob, 10.5, 0, Math.PI * 2);
  ctx.fillStyle = style.hood;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX + 2.5 + sway, baseY - 39 + bob, 7, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(
    centerX + 1 + sway,
    baseY - 40 + bob,
    7,
    Math.PI * 0.68,
    Math.PI * 1.55,
  );
  ctx.strokeStyle = skinShadow;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.arc(centerX + 5.2 + sway, baseY - 40.5 + bob, 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(centerX - 6 + sway, baseY - 25 + bob);
  ctx.lineTo(centerX + 2 + sway, baseY - 19 + bob);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(centerX + 7 + sway, baseY - 25 + bob);
  ctx.lineTo(centerX + 2 + sway, baseY - 19 + bob);
  ctx.stroke();

  drawPlayerArchetypeAccessory(ctx, archetype, centerX + sway, baseY, bob);

  return {
    canvas,
    width: WIDTH,
    height: HEIGHT,
    anchorX: centerX,
    anchorY: baseY,
  };
}

export function createRiderSprites(archetype = "explorer") {
  return [0, 1, 2].map((frame) => createRiderSprite(frame, archetype));
}

export const PLAYER_ARCHETYPES = Object.freeze(
  Object.keys(PLAYER_ARCHETYPE_STYLES),
);

const WORKER_WIDTH = 36;
const WORKER_HEIGHT = 50;

function createWorkerSprite(frame) {
  const canvas = document.createElement("canvas");
  canvas.width = WORKER_WIDTH * RESOLUTION;
  canvas.height = WORKER_HEIGHT * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const centerX = WORKER_WIDTH / 2;
  const baseY = WORKER_HEIGHT - 4;
  const bob = frame === 0 ? 0 : frame === 1 ? -0.8 : 0;
  const swing = frame === 1 ? 2.2 : frame === 2 ? -2.2 : 0;

  const outline = "#222016";
  const tunic = "#5f7a47";
  const tunicLight = "#728d57";
  const tunicDark = "#455c34";
  const hood = "#3d5734";
  const skin = "#d8a87c";
  const pants = "#4a4332";
  const boots = "#302a20";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.9;

  roundedRectPath(ctx, centerX - 6 + swing, baseY - 12, 4.5, 11, 2);
  ctx.fillStyle = pants;
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, centerX + 1.5 - swing, baseY - 12, 4.5, 11, 2);
  ctx.fillStyle = pants;
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, centerX - 7 + swing, baseY - 4, 6, 4, 1.5);
  ctx.fillStyle = boots;
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, centerX + 1 - swing, baseY - 4, 6, 4, 1.5);
  ctx.fillStyle = boots;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX - 8, baseY - 23 + bob);
  ctx.quadraticCurveTo(centerX - 10, baseY - 14 + bob, centerX - 7.5, baseY - 8 + bob);
  ctx.lineTo(centerX + 7.5, baseY - 8 + bob);
  ctx.quadraticCurveTo(centerX + 10, baseY - 14 + bob, centerX + 8, baseY - 23 + bob);
  ctx.closePath();
  ctx.fillStyle = tunic;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX - 6, baseY - 21 + bob);
  ctx.quadraticCurveTo(centerX - 7, baseY - 14 + bob, centerX - 5, baseY - 9 + bob);
  ctx.lineTo(centerX - 1, baseY - 9 + bob);
  ctx.lineTo(centerX - 1, baseY - 21 + bob);
  ctx.closePath();
  ctx.fillStyle = tunicLight;
  ctx.fill();

  roundedRectPath(ctx, centerX - 8, baseY - 18 + bob, 16, 2.5, 1.2);
  ctx.fillStyle = "#7a5a35";
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, centerX - 9.5, baseY - 21 + bob, 4, 9, 2);
  ctx.fillStyle = tunicDark;
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, centerX + 5.5, baseY - 21 + bob, 4, 9, 2);
  ctx.fillStyle = tunic;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, baseY - 29 + bob, 7.5, 0, Math.PI * 2);
  ctx.fillStyle = hood;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX + 1.5, baseY - 28 + bob, 5.2, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX - 7, baseY - 33 + bob);
  ctx.quadraticCurveTo(centerX + 1, baseY - 44 + bob, centerX + 9, baseY - 34 + bob);
  ctx.quadraticCurveTo(centerX + 2, baseY - 37 + bob, centerX - 7, baseY - 33 + bob);
  ctx.closePath();
  ctx.fillStyle = hood;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.arc(centerX + 3.6, baseY - 28.5 + bob, 0.75, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(centerX - 0.4, baseY - 28.5 + bob, 0.75, 0, Math.PI * 2);
  ctx.fill();

  return {
    canvas,
    width: WORKER_WIDTH,
    height: WORKER_HEIGHT,
    anchorX: centerX,
    anchorY: baseY,
  };
}

export function createWorkerSprites() {
  return [0, 1, 2].map((frame) => createWorkerSprite(frame));
}

const FOX_WIDTH = 42;
const FOX_HEIGHT = 34;

function createFoxSprite(frame) {
  const canvas = document.createElement("canvas");
  canvas.width = FOX_WIDTH * RESOLUTION;
  canvas.height = FOX_HEIGHT * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = 23;
  const baseY = FOX_HEIGHT - 6;
  const swing = frame === 1 ? 2 : frame === 2 ? -2 : 0;
  const bob = frame === 0 ? 0 : -0.6;

  const outline = "#38251d";
  const fur = "#c96a3a";
  const furLight = "#e28a52";
  const furDark = "#9b4c2b";
  const cream = "#f2e2cf";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.9;

  ctx.beginPath();
  ctx.moveTo(cx - 8, baseY - 10 + bob);
  ctx.quadraticCurveTo(cx - 20, baseY - 18 + bob, cx - 17, baseY - 7 + bob);
  ctx.quadraticCurveTo(cx - 16, baseY - 1 + bob, cx - 8, baseY - 5 + bob);
  ctx.closePath();
  ctx.fillStyle = furDark;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx - 16.5, baseY - 7 + bob, 3.2, 4.2, -0.35, 0, Math.PI * 2);
  ctx.fillStyle = cream;
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, cx - 8 + swing, baseY - 8, 3, 8, 1.4);
  ctx.fillStyle = furDark;
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, cx + 4 - swing, baseY - 8, 3, 8, 1.4);
  ctx.fillStyle = furDark;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx + 1, baseY - 13 + bob, 12, 6.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx - 2, baseY - 11 + bob, 8.5, 3.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = cream;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx + 11, baseY - 17 + bob, 5.8, 0, Math.PI * 2);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 7, baseY - 21 + bob);
  ctx.lineTo(cx + 8.5, baseY - 28 + bob);
  ctx.lineTo(cx + 12.5, baseY - 23 + bob);
  ctx.closePath();
  ctx.fillStyle = furDark;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 14, baseY - 22 + bob);
  ctx.lineTo(cx + 18, baseY - 27 + bob);
  ctx.lineTo(cx + 18, baseY - 20 + bob);
  ctx.closePath();
  ctx.fillStyle = furDark;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 14, baseY - 16 + bob);
  ctx.lineTo(cx + 21, baseY - 13.5 + bob);
  ctx.lineTo(cx + 14, baseY - 11 + bob);
  ctx.closePath();
  ctx.fillStyle = cream;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.arc(cx + 13, baseY - 18 + bob, 0.85, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = furLight;
  ctx.beginPath();
  ctx.ellipse(cx + 2, baseY - 15 + bob, 5, 2.2, 0.1, 0, Math.PI * 2);
  ctx.fill();

  return {
    canvas,
    width: FOX_WIDTH,
    height: FOX_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createFoxSprites() {
  return [0, 1, 2].map((frame) => createFoxSprite(frame));
}

const FROG_WIDTH = 32;
const FROG_HEIGHT = 26;

function createFrogSprite(frame) {
  const canvas = document.createElement("canvas");
  canvas.width = FROG_WIDTH * RESOLUTION;
  canvas.height = FROG_HEIGHT * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = 16;
  const baseY = FROG_HEIGHT - 4;
  const hopping = frame === 1;
  const outline = "#293820";
  const body = "#5f8f3f";
  const bodyLight = "#7ab04f";
  const belly = "#b7cf78";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.9;

  ctx.beginPath();
  ctx.ellipse(cx, baseY - (hopping ? 7 : 5.5), hopping ? 10 : 8.5, hopping ? 4.6 : 5.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, baseY - (hopping ? 5.5 : 4.5), 6.5, 2.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = belly;
  ctx.fill();

  if (hopping) {
    ctx.beginPath();
    ctx.moveTo(cx - 8, baseY - 6);
    ctx.lineTo(cx - 15, baseY - 1);
    ctx.lineTo(cx - 12, baseY + 1);
    ctx.lineTo(cx - 5, baseY - 2);
    ctx.closePath();
    ctx.fillStyle = bodyLight;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 8, baseY - 6);
    ctx.lineTo(cx + 15, baseY - 1);
    ctx.lineTo(cx + 12, baseY + 1);
    ctx.lineTo(cx + 5, baseY - 2);
    ctx.closePath();
    ctx.fillStyle = bodyLight;
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(cx - 7, baseY - 3, 4, 2.5, -0.25, 0, Math.PI * 2);
    ctx.fillStyle = bodyLight;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx + 7, baseY - 3, 4, 2.5, 0.25, 0, Math.PI * 2);
    ctx.fillStyle = bodyLight;
    ctx.fill();
    ctx.stroke();
  }

  for (const offset of [-4, 4]) {
    ctx.beginPath();
    ctx.arc(cx + offset, baseY - (hopping ? 12 : 10), 3.1, 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx + offset, baseY - (hopping ? 12.5 : 10.5), 1.9, 0, Math.PI * 2);
    ctx.fillStyle = "#f0f2d8";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx + offset + 0.4, baseY - (hopping ? 12.5 : 10.5), 0.85, 0, Math.PI * 2);
    ctx.fillStyle = outline;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.moveTo(cx - 3, baseY - (hopping ? 7 : 5.5));
  ctx.quadraticCurveTo(cx, baseY - (hopping ? 6 : 4.5), cx + 3, baseY - (hopping ? 7 : 5.5));
  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  return {
    canvas,
    width: FROG_WIDTH,
    height: FROG_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createFrogSprites() {
  return [0, 1].map((frame) => createFrogSprite(frame));
}

const VULTURE_WIDTH = 52;
const VULTURE_HEIGHT = 36;

function createVultureSprite(frame) {
  const canvas = document.createElement("canvas");
  canvas.width = VULTURE_WIDTH * RESOLUTION;
  canvas.height = VULTURE_HEIGHT * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = 26;
  const baseY = VULTURE_HEIGHT - 7;
  const outline = "#242019";
  const featherDark = "#3a332b";
  const feather = "#554a3c";
  const featherLight = "#6c5e4d";
  const head = "#b8a58a";
  const beak = "#d1a35e";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.9;

  const wingLift = frame === 0 ? -8 : 5;

  ctx.beginPath();
  ctx.moveTo(cx - 5, baseY - 10);
  ctx.quadraticCurveTo(cx - 22, baseY - 17 + wingLift, cx - 26, baseY - 7 + wingLift);
  ctx.quadraticCurveTo(cx - 16, baseY - 8 + wingLift, cx - 9, baseY - 4);
  ctx.closePath();
  ctx.fillStyle = featherDark;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 5, baseY - 10);
  ctx.quadraticCurveTo(cx + 22, baseY - 17 + wingLift, cx + 26, baseY - 7 + wingLift);
  ctx.quadraticCurveTo(cx + 16, baseY - 8 + wingLift, cx + 9, baseY - 4);
  ctx.closePath();
  ctx.fillStyle = feather;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, baseY - 8, 9, 5.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = featherDark;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 6, baseY - 5);
  ctx.lineTo(cx - 10, baseY + 1);
  ctx.lineTo(cx - 4, baseY - 1);
  ctx.closePath();
  ctx.fillStyle = featherLight;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx + 9, baseY - 13, 3.8, 0, Math.PI * 2);
  ctx.fillStyle = head;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 12, baseY - 14);
  ctx.lineTo(cx + 17, baseY - 12);
  ctx.lineTo(cx + 12, baseY - 10.5);
  ctx.closePath();
  ctx.fillStyle = beak;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.arc(cx + 10, baseY - 14, 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = featherLight;
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 11, 6.5, 2, 0.12, 0, Math.PI * 2);
  ctx.fill();

  return {
    canvas,
    width: VULTURE_WIDTH,
    height: VULTURE_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createVultureSprites() {
  return [0, 1].map((frame) => createVultureSprite(frame));
}

const NIGHTLING_WIDTH = 38;
const NIGHTLING_HEIGHT = 32;

function createNightlingSprite(frame) {
  const canvas = document.createElement("canvas");
  canvas.width = NIGHTLING_WIDTH * RESOLUTION;
  canvas.height = NIGHTLING_HEIGHT * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = 19;
  const baseY = NIGHTLING_HEIGHT - 5;
  const bob = frame === 0 ? 0 : -1.4;
  const legSwing = frame === 0 ? 1.2 : -1.2;
  const outline = "#0b0812";
  const body = "#2b2340";
  const bodyDark = "#1a1428";
  const glow = "#b06bff";
  const eye = "#ff5d73";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.9;

  ctx.beginPath();
  ctx.moveTo(cx - 7, baseY - 10 + bob);
  ctx.quadraticCurveTo(cx - 18, baseY - 15 + bob, cx - 15, baseY - 6 + bob);
  ctx.quadraticCurveTo(cx - 14, baseY - 1 + bob, cx - 7, baseY - 5 + bob);
  ctx.closePath();
  ctx.fillStyle = bodyDark;
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, cx - 6 + legSwing, baseY - 7, 3, 7, 1.3);
  ctx.fillStyle = bodyDark;
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, cx + 4 - legSwing, baseY - 7, 3, 7, 1.3);
  ctx.fillStyle = bodyDark;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx + 1, baseY - 13 + bob, 10.5, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx + 1, baseY - 11 + bob, 6.5, 3.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = bodyDark;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - 4, baseY - 18 + bob);
  ctx.lineTo(cx - 7, baseY - 25 + bob);
  ctx.lineTo(cx - 1, baseY - 20 + bob);
  ctx.closePath();
  ctx.fillStyle = bodyDark;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 6, baseY - 18 + bob);
  ctx.lineTo(cx + 10, baseY - 24 + bob);
  ctx.lineTo(cx + 11, baseY - 17 + bob);
  ctx.closePath();
  ctx.fillStyle = bodyDark;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx - 3, baseY - 15 + bob, 1.9, 0, Math.PI * 2);
  ctx.fillStyle = eye;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx + 6, baseY - 15 + bob, 1.9, 0, Math.PI * 2);
  ctx.fillStyle = eye;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - 8, baseY - 11 + bob);
  ctx.quadraticCurveTo(cx - 13, baseY - 16 + bob, cx - 15, baseY - 9 + bob);
  ctx.strokeStyle = glow;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  return {
    canvas,
    width: NIGHTLING_WIDTH,
    height: NIGHTLING_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createNightlingSprites() {
  return [0, 1].map((frame) => createNightlingSprite(frame));
}

const SPIDER_WIDTH = 42;
const SPIDER_HEIGHT = 30;

function createSpiderSprite(frame) {
  const canvas = document.createElement("canvas");
  canvas.width = SPIDER_WIDTH * RESOLUTION;
  canvas.height = SPIDER_HEIGHT * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = SPIDER_WIDTH / 2;
  const baseY = SPIDER_HEIGHT - 4;
  const outline = "#120f12";
  const body = "#2f2a33";
  const bodyDark = "#1b171f";
  const eye = "#d84a5a";
  const legLift = frame === 0 ? 1.4 : -1.4;

  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;

  for (const side of [-1, 1]) {
    for (let index = 0; index < 4; index += 1) {
      const offset = (index - 1.5) * 3.6;
      const lift = index % 2 === 0 ? legLift : -legLift;
      ctx.beginPath();
      ctx.moveTo(cx + side * 5, baseY - 8);
      ctx.quadraticCurveTo(
        cx + side * (12 + index * 2),
        baseY - 12 - lift,
        cx + side * (18 + index * 1.5),
        baseY - 2 + lift,
      );
      ctx.strokeStyle = bodyDark;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.strokeStyle = outline;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
  }

  ctx.beginPath();
  ctx.ellipse(cx + 2, baseY - 8, 9, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx - 7, baseY - 9, 5.5, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = bodyDark;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx - 9, baseY - 10, 1.2, 0, Math.PI * 2);
  ctx.fillStyle = eye;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx - 6, baseY - 10.5, 1.2, 0, Math.PI * 2);
  ctx.fillStyle = eye;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + 4, baseY - 14);
  ctx.lineTo(cx + 7, baseY - 19);
  ctx.lineTo(cx + 9, baseY - 13);
  ctx.closePath();
  ctx.fillStyle = bodyDark;
  ctx.fill();
  ctx.stroke();

  return {
    canvas,
    width: SPIDER_WIDTH,
    height: SPIDER_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createSpiderSprites() {
  return [0, 1].map((frame) => createSpiderSprite(frame));
}

const GOAT_WIDTH = 46;
const GOAT_HEIGHT = 38;

function createGoatSprite(frame) {
  const canvas = document.createElement("canvas");
  canvas.width = GOAT_WIDTH * RESOLUTION;
  canvas.height = GOAT_HEIGHT * RESOLUTION;
  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = GOAT_WIDTH / 2;
  const baseY = GOAT_HEIGHT - 5;
  const swing = frame === 1 ? 1.8 : frame === 2 ? -1.8 : 0;
  const outline = "#3a2d22";
  const fur = "#d8c7a8";
  const furDark = "#b9a47f";
  const horn = "#8e7a5d";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.9;

  for (const [x, s] of [[-9, swing], [-3, -swing], [6, swing], [12, -swing]]) {
    ctx.beginPath();
    ctx.moveTo(cx + x, baseY - 10);
    ctx.lineTo(cx + x - 1 + s, baseY);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.ellipse(cx, baseY - 16, 15, 9, -0.05, 0, Math.PI * 2);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx + 14, baseY - 23, 6.5, 0, Math.PI * 2);
  ctx.fillStyle = furDark;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 10, baseY - 28);
  ctx.quadraticCurveTo(cx + 8, baseY - 36, cx + 14, baseY - 35);
  ctx.quadraticCurveTo(cx + 12, baseY - 30, cx + 14, baseY - 28);
  ctx.closePath();
  ctx.fillStyle = horn;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 18, baseY - 28);
  ctx.quadraticCurveTo(cx + 20, baseY - 36, cx + 25, baseY - 34);
  ctx.quadraticCurveTo(cx + 21, baseY - 30, cx + 22, baseY - 27);
  ctx.closePath();
  ctx.fillStyle = horn;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.arc(cx + 17, baseY - 24, 0.9, 0, Math.PI * 2);
  ctx.fill();

  return {
    canvas,
    width: GOAT_WIDTH,
    height: GOAT_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

const DONKEY_WIDTH = 58;
const DONKEY_HEIGHT = 50;

export function createDonkeySprites(skin) {
  return [0, 1, 2].map((frame) => createDonkeySprite(frame, skin));
}

function createDonkeySprite(frame, skin) {
  const canvas = document.createElement("canvas");
  canvas.width = DONKEY_WIDTH * RESOLUTION;
  canvas.height = DONKEY_HEIGHT * RESOLUTION;
  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = DONKEY_WIDTH / 2;
  const baseY = DONKEY_HEIGHT - 4;
  const swing = frame === 1 ? 1.9 : frame === 2 ? -1.9 : 0;
  const bob = frame === 0 ? 0 : -0.6;
  const outline = "#2c241d";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = skin.hoof;
  ctx.lineWidth = 1.6;
  for (const [offset, legSwing] of [
    [-13, swing],
    [-5, -swing],
    [8, swing],
    [15, -swing],
  ]) {
    ctx.beginPath();
    ctx.moveTo(cx + offset, baseY - 13 + bob);
    ctx.lineTo(cx + offset + legSwing, baseY);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.ellipse(cx - 2, baseY - 20 + bob, 19, 10, -0.03, 0, Math.PI * 2);
  ctx.fillStyle = skin.body;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.9;
  ctx.stroke();

  if (skin.spotted) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx - 2, baseY - 20 + bob, 19, 10, -0.03, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = skin.muzzle;
    for (const [x, y, rx, ry] of [
      [-10, -24, 5, 3.4],
      [2, -17, 4, 2.6],
      [9, -23, 3.2, 2.2],
    ]) {
      ctx.beginPath();
      ctx.ellipse(cx + x, baseY + y + bob, rx, ry, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.beginPath();
  ctx.moveTo(cx - 19, baseY - 23 + bob);
  ctx.quadraticCurveTo(cx - 26, baseY - 32 + bob, cx - 23, baseY - 16 + bob);
  ctx.strokeStyle = skin.mane;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 12, baseY - 26 + bob);
  ctx.lineTo(cx + 19, baseY - 35 + bob);
  ctx.lineTo(cx + 22, baseY - 25 + bob);
  ctx.closePath();
  ctx.fillStyle = skin.bodyDark;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.9;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx + 20, baseY - 24 + bob, 9, 6.5, 0.12, 0, Math.PI * 2);
  ctx.fillStyle = skin.body;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx + 27, baseY - 21 + bob, 6.5, 4.2, 0.12, 0, Math.PI * 2);
  ctx.fillStyle = skin.muzzle;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 14, baseY - 29 + bob);
  ctx.quadraticCurveTo(cx + 14, baseY - 36 + bob, cx + 18, baseY - 37 + bob);
  ctx.quadraticCurveTo(cx + 17, baseY - 31 + bob, cx + 19, baseY - 28 + bob);
  ctx.closePath();
  ctx.fillStyle = skin.bodyDark;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.arc(cx + 22, baseY - 25 + bob, 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - 19, baseY - 22 + bob);
  ctx.lineTo(cx - 24, baseY - 16 + bob);
  ctx.strokeStyle = skin.mane;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx - 2, baseY - 25 + bob, 10, 2.4, -0.03, 0, Math.PI * 2);
  ctx.strokeStyle = skin.accent;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  return {
    canvas,
    width: DONKEY_WIDTH,
    height: DONKEY_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

function createBirdSprite(frame, palette) {
  const width = 34;
  const height = 24;
  const canvas = document.createElement("canvas");
  canvas.width = width * RESOLUTION;
  canvas.height = height * RESOLUTION;
  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = width / 2;
  const baseY = height - 6;
  const lift = frame === 0 ? -6 : 4;

  ctx.strokeStyle = palette.outline;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 5, 6, 4.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = palette.body;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 4, baseY - 7);
  ctx.quadraticCurveTo(cx - 17, baseY - 12 + lift, cx - 19, baseY - 4 + lift);
  ctx.quadraticCurveTo(cx - 10, baseY - 4, cx - 5, baseY - 3);
  ctx.closePath();
  ctx.fillStyle = palette.wing;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 4, baseY - 7);
  ctx.quadraticCurveTo(cx + 16, baseY - 12 - lift, cx + 19, baseY - 4 - lift);
  ctx.quadraticCurveTo(cx + 10, baseY - 4, cx + 5, baseY - 3);
  ctx.closePath();
  ctx.fillStyle = palette.wing;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx + 6, baseY - 9, 3, 0, Math.PI * 2);
  ctx.fillStyle = palette.body;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 8, baseY - 9);
  ctx.lineTo(cx + 12, baseY - 8);
  ctx.lineTo(cx + 8, baseY - 7);
  ctx.closePath();
  ctx.fillStyle = palette.beak;
  ctx.fill();
  ctx.stroke();

  return {
    canvas,
    width,
    height,
    anchorX: cx,
    anchorY: baseY,
  };
}

const BIRD_PALETTES = Object.freeze({
  sparrow: { body: "#9a7a54", wing: "#7b5c3d", beak: "#d8b35e", outline: "#33261c" },
  crow: { body: "#34363f", wing: "#20222b", beak: "#a9a9b4", outline: "#12131a" },
  owl: { body: "#8b7a63", wing: "#665543", beak: "#d1a35e", outline: "#2c241b" },
});

export function createGoatSprites() {
  return [0, 1, 2].map((frame) => createGoatSprite(frame));
}

const WOLF_WIDTH = 58;
const WOLF_HEIGHT = 42;

function createWolfSprite(frame) {
  const canvas = document.createElement("canvas");
  canvas.width = WOLF_WIDTH * RESOLUTION;
  canvas.height = WOLF_HEIGHT * RESOLUTION;
  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = WOLF_WIDTH / 2;
  const baseY = WOLF_HEIGHT - 6;
  const swing = frame === 1 ? 2.6 : frame === 2 ? -2.6 : 0;
  const bob = frame === 0 ? 0 : -0.7;
  const outline = "#20242a";
  const fur = "#6d747d";
  const furLight = "#9aa1a8";
  const furDark = "#4b5159";
  const eye = "#d8c46a";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.9;

  ctx.beginPath();
  ctx.moveTo(cx - 9, baseY - 19 + bob);
  ctx.quadraticCurveTo(cx - 25, baseY - 25 + bob, cx - 24, baseY - 12 + bob);
  ctx.quadraticCurveTo(cx - 22, baseY - 5 + bob, cx - 10, baseY - 13 + bob);
  ctx.closePath();
  ctx.fillStyle = furDark;
  ctx.fill();
  ctx.stroke();

  for (const [offset, legSwing] of [
    [-10, swing],
    [-2, -swing],
    [8, swing],
    [15, -swing],
  ]) {
    roundedRectPath(ctx, cx + offset, baseY - 12, 3.4, 12, 1.5);
    ctx.fillStyle = furDark;
    ctx.fill();
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.ellipse(cx + 1, baseY - 17 + bob, 16, 9, 0, 0, Math.PI * 2);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx + 3, baseY - 14 + bob, 10, 4.6, 0.08, 0, Math.PI * 2);
  ctx.fillStyle = furLight;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx + 15, baseY - 24 + bob, 7, 0, Math.PI * 2);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 10, baseY - 29 + bob);
  ctx.lineTo(cx + 11, baseY - 37 + bob);
  ctx.lineTo(cx + 16, baseY - 31 + bob);
  ctx.closePath();
  ctx.fillStyle = furDark;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 18, baseY - 30 + bob);
  ctx.lineTo(cx + 21, baseY - 37 + bob);
  ctx.lineTo(cx + 23, baseY - 29 + bob);
  ctx.closePath();
  ctx.fillStyle = furDark;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 21, baseY - 23 + bob);
  ctx.lineTo(cx + 29, baseY - 20 + bob);
  ctx.lineTo(cx + 22, baseY - 17 + bob);
  ctx.closePath();
  ctx.fillStyle = furLight;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = eye;
  ctx.beginPath();
  ctx.arc(cx + 18, baseY - 25 + bob, 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.arc(cx + 22.5, baseY - 21 + bob, 0.8, 0, Math.PI * 2);
  ctx.fill();

  return {
    canvas,
    width: WOLF_WIDTH,
    height: WOLF_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createWolfSprites() {
  return [0, 1, 2].map((frame) => createWolfSprite(frame));
}

const PERDIZ_WIDTH = 34;
const PERDIZ_HEIGHT = 28;

function createPerdizSprite(frame) {
  const canvas = document.createElement("canvas");
  canvas.width = PERDIZ_WIDTH * RESOLUTION;
  canvas.height = PERDIZ_HEIGHT * RESOLUTION;
  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = PERDIZ_WIDTH / 2;
  const baseY = PERDIZ_HEIGHT - 5;
  const step = frame === 0 ? 0 : frame === 1 ? 1.2 : -1.2;
  const outline = "#33281e";
  const body = "#8a7447";
  const bodyLight = "#b09963";
  const wing = "#6d5a36";
  const beak = "#d8b35e";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.8;

  ctx.beginPath();
  ctx.moveTo(cx - 2 + step, baseY - 8);
  ctx.lineTo(cx - 4 + step, baseY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 4 - step, baseY - 8);
  ctx.lineTo(cx + 6 - step, baseY);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, baseY - 12, 10, 7, -0.05, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx - 1, baseY - 11, 7, 4.2, 0.05, 0, Math.PI * 2);
  ctx.fillStyle = bodyLight;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(cx - 2, baseY - 13, 6, 3.6, frame === 1 ? -0.25 : 0.2, 0, Math.PI * 2);
  ctx.fillStyle = wing;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx + 8, baseY - 18, 4.2, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 11, baseY - 18);
  ctx.lineTo(cx + 16, baseY - 17);
  ctx.lineTo(cx + 11, baseY - 15.5);
  ctx.closePath();
  ctx.fillStyle = beak;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 7, baseY - 21);
  ctx.lineTo(cx + 8, baseY - 25);
  ctx.lineTo(cx + 10, baseY - 21);
  ctx.closePath();
  ctx.fillStyle = "#5c4a2d";
  ctx.fill();

  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.arc(cx + 9.5, baseY - 19, 0.7, 0, Math.PI * 2);
  ctx.fill();

  return {
    canvas,
    width: PERDIZ_WIDTH,
    height: PERDIZ_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createPerdizSprites() {
  return [0, 1, 2].map((frame) => createPerdizSprite(frame));
}

const CHICKEN_WIDTH = 34;
const CHICKEN_HEIGHT = 30;

function createChickenSprite(frame) {
  const canvas = document.createElement("canvas");
  canvas.width = CHICKEN_WIDTH * RESOLUTION;
  canvas.height = CHICKEN_HEIGHT * RESOLUTION;
  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = CHICKEN_WIDTH / 2;
  const baseY = CHICKEN_HEIGHT - 5;
  const step = frame === 0 ? 0 : frame === 1 ? 1.1 : -1.1;
  const outline = "#3a3027";
  const body = "#f2efe6";
  const bodyShade = "#d8d2c4";
  const comb = "#d45b4f";
  const beak = "#e0a458";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.8;

  ctx.beginPath();
  ctx.moveTo(cx - 2 + step, baseY - 8);
  ctx.lineTo(cx - 4 + step, baseY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 4 - step, baseY - 8);
  ctx.lineTo(cx + 6 - step, baseY);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, baseY - 13, 10, 7.5, -0.05, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx - 1, baseY - 12, 7, 4.4, 0.05, 0, Math.PI * 2);
  ctx.fillStyle = bodyShade;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx + 8, baseY - 20, 4.6, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 7, baseY - 24);
  ctx.quadraticCurveTo(cx + 7, baseY - 28, cx + 9, baseY - 26);
  ctx.quadraticCurveTo(cx + 10, baseY - 28, cx + 11, baseY - 25);
  ctx.quadraticCurveTo(cx + 12, baseY - 27, cx + 12, baseY - 23);
  ctx.closePath();
  ctx.fillStyle = comb;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 12, baseY - 20);
  ctx.lineTo(cx + 17, baseY - 19);
  ctx.lineTo(cx + 12, baseY - 17.5);
  ctx.closePath();
  ctx.fillStyle = beak;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 8, baseY - 24);
  ctx.lineTo(cx + 9, baseY - 27);
  ctx.lineTo(cx + 10.5, baseY - 24);
  ctx.closePath();
  ctx.fillStyle = comb;
  ctx.fill();

  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.arc(cx + 9.5, baseY - 21, 0.75, 0, Math.PI * 2);
  ctx.fill();

  return {
    canvas,
    width: CHICKEN_WIDTH,
    height: CHICKEN_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createChickenSprites() {
  return [0, 1, 2].map((frame) => createChickenSprite(frame));
}

const WOLF_DEN_WIDTH = 108;
const WOLF_DEN_HEIGHT = 88;

export function createWolfDenSprites() {
  const canvas = document.createElement("canvas");
  canvas.width = WOLF_DEN_WIDTH * RESOLUTION;
  canvas.height = WOLF_DEN_HEIGHT * RESOLUTION;
  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = WOLF_DEN_WIDTH / 2;
  const baseY = WOLF_DEN_HEIGHT - 6;

  ctx.fillStyle = "#59636a";
  ctx.strokeStyle = "#232a2f";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - 42, baseY);
  ctx.quadraticCurveTo(cx - 36, baseY - 44, cx - 18, baseY - 50);
  ctx.quadraticCurveTo(cx, baseY - 58, cx + 18, baseY - 50);
  ctx.quadraticCurveTo(cx + 36, baseY - 44, cx + 42, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#c7d3dc";
  ctx.beginPath();
  ctx.moveTo(cx - 34, baseY - 34);
  ctx.quadraticCurveTo(cx - 20, baseY - 52, cx - 6, baseY - 48);
  ctx.quadraticCurveTo(cx + 14, baseY - 56, cx + 30, baseY - 36);
  ctx.quadraticCurveTo(cx + 10, baseY - 44, cx - 10, baseY - 40);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#0c1014";
  ctx.beginPath();
  ctx.moveTo(cx - 22, baseY);
  ctx.quadraticCurveTo(cx - 18, baseY - 30, cx, baseY - 34);
  ctx.quadraticCurveTo(cx + 18, baseY - 30, cx + 22, baseY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#3d464d";
  for (const [x, y, r] of [
    [cx - 30, baseY - 8, 4],
    [cx + 30, baseY - 9, 5],
    [cx - 14, baseY - 42, 3.4],
    [cx + 20, baseY - 44, 3],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return [{
    canvas,
    width: WOLF_DEN_WIDTH,
    height: WOLF_DEN_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  }];
}

const WOLF_TOTEM_WIDTH = 40;
const WOLF_TOTEM_HEIGHT = 76;

export function createWolfTotemSprites() {
  const canvas = document.createElement("canvas");
  canvas.width = WOLF_TOTEM_WIDTH * RESOLUTION;
  canvas.height = WOLF_TOTEM_HEIGHT * RESOLUTION;
  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = WOLF_TOTEM_WIDTH / 2;
  const baseY = WOLF_TOTEM_HEIGHT - 5;

  ctx.strokeStyle = "#2c2118";
  ctx.lineWidth = 1;
  roundedRectPath(ctx, cx - 4, baseY - 46, 8, 46, 3);
  ctx.fillStyle = "#6d4a2e";
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 15, baseY - 46);
  ctx.lineTo(cx, baseY - 62);
  ctx.lineTo(cx + 15, baseY - 46);
  ctx.closePath();
  ctx.fillStyle = "#c97d45";
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, baseY - 50, 9, 0, Math.PI * 2);
  ctx.fillStyle = "#e6dfcf";
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 7, baseY - 56);
  ctx.lineTo(cx - 4, baseY - 64);
  ctx.lineTo(cx - 1, baseY - 56);
  ctx.closePath();
  ctx.fillStyle = "#e6dfcf";
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 7, baseY - 56);
  ctx.lineTo(cx + 4, baseY - 64);
  ctx.lineTo(cx + 1, baseY - 56);
  ctx.closePath();
  ctx.fillStyle = "#e6dfcf";
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#2b2118";
  for (const x of [cx - 3.4, cx + 3.4]) {
    ctx.beginPath();
    ctx.arc(x, baseY - 51, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "#8a5a32";
  ctx.lineWidth = 1.4;
  for (const [y, offset] of [
    [baseY - 30, -1],
    [baseY - 22, 1],
    [baseY - 14, -1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(cx - 10, y);
    ctx.lineTo(cx + 10, y + offset * 2);
    ctx.stroke();
  }

  return [{
    canvas,
    width: WOLF_TOTEM_WIDTH,
    height: WOLF_TOTEM_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  }];
}

export function createSparrowSprites() {
  return [0, 1].map((frame) => createBirdSprite(frame, BIRD_PALETTES.sparrow));
}

export function createCrowSprites() {
  return [0, 1].map((frame) => createBirdSprite(frame, BIRD_PALETTES.crow));
}

export function createOwlSprites() {
  return [0, 1].map((frame) => createBirdSprite(frame, BIRD_PALETTES.owl));
}

export function createAmbientSprites() {
  return {
    fox: createFoxSprites(),
    frog: createFrogSprites(),
    vulture: createVultureSprites(),
    goat: createGoatSprites(),
    sparrow: createSparrowSprites(),
    crow: createCrowSprites(),
    owl: createOwlSprites(),
    nightling: createNightlingSprites(),
    spider: createSpiderSprites(),
    donkey: createDonkeySprites(builtinDonkeySkin("gris")),
    perdiz: createPerdizSprites(),
    wolf: createWolfSprites(),
    chicken: createChickenSprites(),
  };
}

const GRASS_WIDTH = 28;
const GRASS_HEIGHT = 22;

function createGrassSprite(variant, style = "normal", cut = false) {
  const canvas = document.createElement("canvas");
  canvas.width = GRASS_WIDTH * RESOLUTION;
  canvas.height = GRASS_HEIGHT * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineCap = "round";

  const palette =
    style === "lush"
      ? { blade: "#4e9a52", light: "#7bc46e", seed: "#d8c46a" }
      : style === "dry"
        ? { blade: "#a38b52", light: "#c4ab68", seed: "#e0c06a" }
        : { blade: "#5d8f47", light: "#8cb86c", seed: "#d8c46a" };
  const cx = GRASS_WIDTH / 2;
  const baseY = GRASS_HEIGHT - 3;
  const height = cut ? 3.5 : 12 + (variant % 3) * 1.8;

  ctx.strokeStyle = palette.blade;
  ctx.lineWidth = 1.6;
  for (let i = -2; i <= 2; i += 1) {
    const offset = i * 3.2;
    ctx.beginPath();
    ctx.moveTo(cx + offset, baseY);
    ctx.quadraticCurveTo(
      cx + offset + i * 1.8,
      baseY - height * 0.55,
      cx + offset + i * 2.8,
      baseY - height,
    );
    ctx.stroke();
  }

  if (!cut) {
    ctx.strokeStyle = palette.light;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 4, baseY - 2);
    ctx.lineTo(cx - 6, baseY - height - 1);
    ctx.stroke();

    ctx.fillStyle = palette.seed;
    for (const offset of [-6, 1, 7]) {
      ctx.beginPath();
      ctx.arc(cx + offset, baseY - height - 1, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return {
    canvas,
    width: GRASS_WIDTH,
    height: GRASS_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createGrassSprites() {
  return [0, 1, 2, 3].map((variant) => createGrassSprite(variant, "normal"));
}

export function createLushGrassSprites() {
  return [0, 1, 2, 3].map((variant) => createGrassSprite(variant, "lush"));
}

export function createDryGrassSprites() {
  return [0, 1, 2, 3].map((variant) => createGrassSprite(variant, "dry"));
}

export function createCutGrassSprites() {
  return [0, 1].map((variant) => createGrassSprite(variant, "normal", true));
}

const BUSH_WIDTH = 34;
const BUSH_HEIGHT = 30;

function createBushSprite(variant, withBerries, style = "normal") {
  const canvas = document.createElement("canvas");
  canvas.width = BUSH_WIDTH * RESOLUTION;
  canvas.height = BUSH_HEIGHT * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = BUSH_WIDTH / 2;
  const baseY = BUSH_HEIGHT - 4;
  let outline = "#28351f";
  let greens = ["#3f6a37", "#4c7d42", "#5a8d4d"];
  let light = "#73a35e";
  let berryColors = ["#8f4a7b", "#b25c91", "#7a3868"];

  if (style === "dry") {
    outline = "#3f3522";
    greens = ["#7c6a3c", "#8f7b47", "#a38b52"];
    light = "#c4ab68";
    berryColors = ["#b9833f", "#d0a052", "#8f6938"];
  } else if (style === "jungle") {
    outline = "#17351f";
    greens = ["#235c32", "#2d7240", "#3b8a4d"];
    light = "#6fbf78";
    berryColors = ["#d4556f", "#e0a458", "#8f4a7b"];
  }

  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.8;

  ctx.beginPath();
  ctx.ellipse(cx, baseY, 12, 4.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(35, 46, 28, 0.55)";
  ctx.fill();

  const mounds = [
    [-7, -8, 7, 6],
    [1, -11, 8, 7],
    [8, -7, 6, 5.5],
    [-1, -6, 9, 6],
  ];

  for (let i = 0; i < mounds.length; i += 1) {
    const [x, y, rx, ry] = mounds[i];
    ctx.beginPath();
    ctx.ellipse(cx + x, baseY + y, rx, ry, 0.1 * (i - 1), 0, Math.PI * 2);
    ctx.fillStyle = greens[(i + variant) % greens.length];
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.ellipse(cx - 4, baseY - 13, 4.5, 3, -0.4, 0, Math.PI * 2);
  ctx.fill();

  if (withBerries) {
    const berries = [
      [-8, -11],
      [-2, -15],
      [4, -13],
      [8, -9],
      [-4, -7],
      [2, -8],
    ];

    for (let i = 0; i < berries.length; i += 1) {
      const [x, y] = berries[i];
      ctx.beginPath();
      ctx.arc(cx + x, baseY + y, 1.7, 0, Math.PI * 2);
      ctx.fillStyle = berryColors[(variant + i) % berryColors.length];
      ctx.fill();
      ctx.strokeStyle = "rgba(53, 24, 45, 0.65)";
      ctx.stroke();
    }
  }

  return {
    canvas,
    width: BUSH_WIDTH,
    height: BUSH_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createBushSprites() {
  return [0, 1, 2].map((variant) => createBushSprite(variant, true));
}

export function createPickedBushSprites() {
  return [0, 1].map((variant) => createBushSprite(variant, false));
}

export function createDryBushSprites() {
  return [0, 1].map((variant) => createBushSprite(variant, true, "dry"));
}

export function createPickedDryBushSprites() {
  return [0, 1].map((variant) => createBushSprite(variant, false, "dry"));
}

export function createJungleBushSprites() {
  return [0, 1, 2].map((variant) => createBushSprite(variant, true, "jungle"));
}

export function createPickedJungleBushSprites() {
  return [0, 1].map((variant) => createBushSprite(variant, false, "jungle"));
}

const OVEN_WIDTH = 46;
const OVEN_HEIGHT = 50;

function createOvenSprite(frame) {
  const canvas = document.createElement("canvas");
  canvas.width = OVEN_WIDTH * RESOLUTION;
  canvas.height = OVEN_HEIGHT * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = OVEN_WIDTH / 2;
  const baseY = OVEN_HEIGHT - 5;
  const outline = "#2b2925";
  const stone = "#66635f";
  const stoneLight = "#807b74";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.9;

  ctx.beginPath();
  ctx.ellipse(cx, baseY, 18, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - 18, baseY);
  ctx.quadraticCurveTo(cx - 20, baseY - 24, cx, baseY - 31);
  ctx.quadraticCurveTo(cx + 20, baseY - 24, cx + 18, baseY);
  ctx.closePath();
  ctx.fillStyle = stone;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 15, baseY - 6);
  ctx.quadraticCurveTo(cx - 16, baseY - 22, cx, baseY - 28);
  ctx.quadraticCurveTo(cx + 16, baseY - 22, cx + 15, baseY - 6);
  ctx.closePath();
  ctx.fillStyle = stoneLight;
  ctx.fill();
  ctx.strokeStyle = "rgba(43, 41, 37, 0.35)";
  ctx.stroke();

  const glow = ctx.createRadialGradient(cx, baseY - 10, 2, cx, baseY - 10, 14);
  glow.addColorStop(0, "rgba(255, 174, 78, 0.4)");
  glow.addColorStop(1, "rgba(255, 150, 60, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, baseY - 10, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - 8, baseY - 2);
  ctx.quadraticCurveTo(cx - 9, baseY - 14, cx, baseY - 17);
  ctx.quadraticCurveTo(cx + 9, baseY - 14, cx + 8, baseY - 2);
  ctx.closePath();
  ctx.fillStyle = "#1f1a17";
  ctx.fill();
  ctx.stroke();

  const flameHeight = frame === 0 ? 10 : 13;
  ctx.beginPath();
  ctx.moveTo(cx - 4, baseY - 3);
  ctx.quadraticCurveTo(cx - 5, baseY - 9, cx + (frame === 0 ? -1 : 1), baseY - flameHeight);
  ctx.quadraticCurveTo(cx + 5, baseY - 8, cx + 4, baseY - 3);
  ctx.closePath();
  ctx.fillStyle = "#e8893c";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - 2, baseY - 3);
  ctx.quadraticCurveTo(cx - 1, baseY - 7, cx + 1, baseY - flameHeight * 0.65);
  ctx.quadraticCurveTo(cx + 3, baseY - 6, cx + 2, baseY - 3);
  ctx.closePath();
  ctx.fillStyle = "#f6ca6f";
  ctx.fill();

  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.rect(cx + 8, baseY - 32, 6, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#55514c";
  ctx.fillRect(cx + 7, baseY - 34, 8, 3);

  return {
    canvas,
    width: OVEN_WIDTH,
    height: OVEN_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createOvenSprites() {
  return [0, 1].map((frame) => createOvenSprite(frame));
}

const BREWING_WIDTH = 46;
const BREWING_HEIGHT = 44;

function createBrewingTableSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = BREWING_WIDTH * RESOLUTION;
  canvas.height = BREWING_HEIGHT * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = BREWING_WIDTH / 2;
  const baseY = BREWING_HEIGHT - 5;
  const outline = "#30251b";
  const wood = "#7a5535";
  const woodLight = "#946a44";
  const woodDark = "#573b25";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.9;

  ctx.beginPath();
  ctx.ellipse(cx, baseY, 17, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.fill();

  ctx.fillStyle = woodDark;
  ctx.fillRect(cx - 15, baseY - 17, 4, 17);
  ctx.strokeRect(cx - 15, baseY - 17, 4, 17);
  ctx.fillRect(cx + 11, baseY - 17, 4, 17);
  ctx.strokeRect(cx + 11, baseY - 17, 4, 17);

  ctx.beginPath();
  ctx.moveTo(cx - 18, baseY - 19);
  ctx.lineTo(cx + 18, baseY - 19);
  ctx.lineTo(cx + 15, baseY - 24);
  ctx.lineTo(cx - 15, baseY - 24);
  ctx.closePath();
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = woodLight;
  ctx.fillRect(cx - 14, baseY - 23, 28, 2.5);

  ctx.beginPath();
  ctx.ellipse(cx, baseY - 26, 8, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#3d3a35";
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, baseY - 27.5, 6, 2.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#5b8c64";
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx + 12, baseY - 28, 2.8, 0, Math.PI * 2);
  ctx.fillStyle = "#9b5f92";
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx - 12, baseY - 27, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = "#d5b06c";
  ctx.fill();
  ctx.stroke();

  return {
    canvas,
    width: BREWING_WIDTH,
    height: BREWING_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createBrewingTableSprites() {
  return [createBrewingTableSprite()];
}

const CHEST_WIDTH = 44;
const CHEST_HEIGHT = 34;

function createChestSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = CHEST_WIDTH * RESOLUTION;
  canvas.height = CHEST_HEIGHT * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = CHEST_WIDTH / 2;
  const baseY = CHEST_HEIGHT - 4;
  const outline = "#2f2116";
  const wood = "#8a6039";
  const woodLight = "#a97a4a";
  const woodDark = "#61401f";
  const metal = "#c9a35f";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.9;

  roundedRectPath(ctx, cx - 15, baseY - 16, 30, 16, 2.5);
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 15, baseY - 16);
  ctx.quadraticCurveTo(cx, baseY - 26, cx + 15, baseY - 16);
  ctx.closePath();
  ctx.fillStyle = woodLight;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = woodDark;
  ctx.fillRect(cx - 15, baseY - 9, 30, 2);
  ctx.strokeRect(cx - 15, baseY - 9, 30, 2);

  ctx.fillStyle = metal;
  ctx.fillRect(cx - 11, baseY - 22, 3, 22);
  ctx.strokeRect(cx - 11, baseY - 22, 3, 22);
  ctx.fillRect(cx + 8, baseY - 22, 3, 22);
  ctx.strokeRect(cx + 8, baseY - 22, 3, 22);

  roundedRectPath(ctx, cx - 3, baseY - 13, 6, 7, 1.5);
  ctx.fillStyle = metal;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, baseY - 10, 1.1, 0, Math.PI * 2);
  ctx.fillStyle = outline;
  ctx.fill();

  return {
    canvas,
    width: CHEST_WIDTH,
    height: CHEST_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createChestSprites() {
  return [createChestSprite()];
}

const TIPI_WIDTH = 60;
const TIPI_HEIGHT = 64;

function createTipiSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = TIPI_WIDTH * RESOLUTION;
  canvas.height = TIPI_HEIGHT * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = TIPI_WIDTH / 2;
  const baseY = TIPI_HEIGHT - 4;
  const outline = "#3a2517";
  const hide = "#c79a63";
  const hideLight = "#e0bd86";
  const hideDark = "#9c7141";
  const pole = "#6b4a2c";
  const poleLight = "#8d6540";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(cx, baseY - 48);
  ctx.lineTo(cx - 25, baseY);
  ctx.lineTo(cx + 25, baseY);
  ctx.closePath();
  ctx.fillStyle = hide;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, baseY - 47);
  ctx.lineTo(cx - 12, baseY - 4);
  ctx.lineTo(cx + 3, baseY - 4);
  ctx.closePath();
  ctx.fillStyle = hideLight;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, baseY - 47);
  ctx.lineTo(cx + 12, baseY - 4);
  ctx.lineTo(cx + 24, baseY);
  ctx.lineTo(cx + 8, baseY);
  ctx.closePath();
  ctx.fillStyle = hideDark;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 7, baseY - 10);
  ctx.lineTo(cx - 4, baseY);
  ctx.lineTo(cx + 6, baseY);
  ctx.lineTo(cx + 8, baseY - 10);
  ctx.closePath();
  ctx.fillStyle = "#2a1d13";
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = pole;
  ctx.lineWidth = 2;
  for (const offset of [-3, 0, 3]) {
    ctx.beginPath();
    ctx.moveTo(cx + offset, baseY - 50);
    ctx.lineTo(cx + offset * 2.2, baseY + 2);
    ctx.stroke();
  }

  ctx.strokeStyle = poleLight;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - 4, baseY - 52);
  ctx.lineTo(cx + 5, baseY + 1);
  ctx.stroke();

  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx - 18, baseY - 7);
  ctx.lineTo(cx - 6, baseY - 9);
  ctx.moveTo(cx - 16, baseY - 15);
  ctx.lineTo(cx - 4, baseY - 17);
  ctx.moveTo(cx + 7, baseY - 12);
  ctx.lineTo(cx + 19, baseY - 8);
  ctx.stroke();

  return {
    canvas,
    width: TIPI_WIDTH,
    height: TIPI_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createTipiSprites() {
  return [createTipiSprite()];
}

const FENCE_WIDTH = 44;
const FENCE_HEIGHT = 32;

function createFenceSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = FENCE_WIDTH * RESOLUTION;
  canvas.height = FENCE_HEIGHT * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = FENCE_WIDTH / 2;
  const baseY = FENCE_HEIGHT - 4;
  const outline = "#332317";
  const wood = "#8a6039";
  const woodLight = "#a97a4a";
  const woodDark = "#5f3f23";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.9;

  for (const offset of [-14, 14]) {
    roundedRectPath(ctx, cx + offset - 2.5, baseY - 24, 5, 24, 1.5);
    ctx.fillStyle = wood;
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = woodLight;
  ctx.fillRect(cx - 16, baseY - 19, 32, 4);
  ctx.strokeRect(cx - 16, baseY - 19, 32, 4);
  ctx.fillRect(cx - 16, baseY - 10, 32, 4);
  ctx.strokeRect(cx - 16, baseY - 10, 32, 4);

  ctx.strokeStyle = woodDark;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx - 12, baseY - 20);
  ctx.lineTo(cx - 12, baseY - 15);
  ctx.moveTo(cx + 11, baseY - 11);
  ctx.lineTo(cx + 11, baseY - 6);
  ctx.stroke();

  return {
    canvas,
    width: FENCE_WIDTH,
    height: FENCE_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createFenceSprites() {
  return [createFenceSprite()];
}

const TORCH_WIDTH = 22;
const TORCH_HEIGHT = 44;

function createTorchSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = TORCH_WIDTH * RESOLUTION;
  canvas.height = TORCH_HEIGHT * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = TORCH_WIDTH / 2;
  const baseY = TORCH_HEIGHT - 3;
  const outline = "#332317";
  const wood = "#7b5330";
  const flameOuter = "#e08a3c";
  const flameInner = "#ffd27a";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.9;

  ctx.beginPath();
  ctx.moveTo(cx, baseY);
  ctx.lineTo(cx + 1.5, baseY - 24);
  ctx.lineTo(cx - 1.5, baseY - 24);
  ctx.closePath();
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, baseY - 23);
  ctx.quadraticCurveTo(cx + 8, baseY - 30, cx + 2, baseY - 38);
  ctx.quadraticCurveTo(cx - 1, baseY - 33, cx - 6, baseY - 34);
  ctx.quadraticCurveTo(cx - 5, baseY - 27, cx, baseY - 23);
  ctx.closePath();
  ctx.fillStyle = flameOuter;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, baseY - 26);
  ctx.quadraticCurveTo(cx + 4, baseY - 31, cx + 1, baseY - 35);
  ctx.quadraticCurveTo(cx - 2, baseY - 31, cx - 3, baseY - 31);
  ctx.quadraticCurveTo(cx - 2, baseY - 28, cx, baseY - 26);
  ctx.closePath();
  ctx.fillStyle = flameInner;
  ctx.fill();

  return {
    canvas,
    width: TORCH_WIDTH,
    height: TORCH_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createTorchSprites() {
  return [createTorchSprite()];
}

const WALL_WIDTH = 48;
const WALL_HEIGHT = 40;

function createWallSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = WALL_WIDTH * RESOLUTION;
  canvas.height = WALL_HEIGHT * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = WALL_WIDTH / 2;
  const baseY = WALL_HEIGHT - 4;
  const outline = "#2b2d31";
  const stone = "#6f747c";
  const stoneLight = "#8a9099";
  const stoneDark = "#50545b";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.9;

  const rows = [
    [-15, -24, 10, 8],
    [-5, -24, 10, 8],
    [5, -24, 10, 8],
    [-10, -15, 10, 8],
    [0, -15, 10, 8],
    [-15, -6, 10, 8],
    [-5, -6, 10, 8],
    [5, -6, 10, 8],
  ];

  for (let i = 0; i < rows.length; i += 1) {
    const [ox, oy, w, h] = rows[i];
    roundedRectPath(ctx, cx + ox, baseY + oy, w, h, 1.2);
    ctx.fillStyle = i % 2 === 0 ? stone : stoneLight;
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = stoneDark;
  ctx.fillRect(cx - 16, baseY - 1, 32, 3);
  ctx.strokeRect(cx - 16, baseY - 1, 32, 3);

  return {
    canvas,
    width: WALL_WIDTH,
    height: WALL_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createWallSprites() {
  return [createWallSprite()];
}

const BED_WIDTH = 52;
const BED_HEIGHT = 32;

function createBedSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = BED_WIDTH * RESOLUTION;
  canvas.height = BED_HEIGHT * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = BED_WIDTH / 2;
  const baseY = BED_HEIGHT - 4;
  const outline = "#332317";
  const hide = "#c79a63";
  const hideLight = "#e0bd86";
  const hideDark = "#9c7141";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.9;

  ctx.beginPath();
  ctx.ellipse(cx, baseY - 7, 23, 9, 0, 0, Math.PI * 2);
  ctx.fillStyle = hide;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx - 8, baseY - 8, 9, 6, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = hideLight;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx + 9, baseY - 7, 12, 6, 0.15, 0, Math.PI * 2);
  ctx.fillStyle = hideDark;
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(cx - 18, baseY - 4);
  ctx.lineTo(cx + 18, baseY - 4);
  ctx.stroke();

  return {
    canvas,
    width: BED_WIDTH,
    height: BED_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createBedSprites() {
  return [createBedSprite()];
}

const CAULDRON_WIDTH = 46;
const CAULDRON_HEIGHT = 42;

function createCauldronSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = CAULDRON_WIDTH * RESOLUTION;
  canvas.height = CAULDRON_HEIGHT * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = CAULDRON_WIDTH / 2;
  const baseY = CAULDRON_HEIGHT - 4;
  const outline = "#16181c";
  const iron = "#3b4048";
  const ironLight = "#555d67";
  const brew = "#63b36f";
  const brewLight = "#9be0a3";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;

  for (const offset of [-10, 10]) {
    ctx.beginPath();
    ctx.moveTo(cx + offset, baseY - 8);
    ctx.lineTo(cx + offset * 1.35, baseY);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.ellipse(cx, baseY - 13, 17, 9, 0, 0, Math.PI);
  ctx.fillStyle = iron;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, baseY - 20, 18, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = ironLight;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, baseY - 20, 14, 4.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = brew;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(cx - 3, baseY - 21, 6, 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = brewLight;
  ctx.fill();

  ctx.strokeStyle = brewLight;
  ctx.lineWidth = 1.2;
  for (const offset of [-6, 2, 8]) {
    ctx.beginPath();
    ctx.moveTo(cx + offset, baseY - 24);
    ctx.quadraticCurveTo(cx + offset + 3, baseY - 30, cx + offset, baseY - 34);
    ctx.stroke();
  }

  return {
    canvas,
    width: CAULDRON_WIDTH,
    height: CAULDRON_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createCauldronSprites() {
  return [createCauldronSprite()];
}

const UNIVERSITY_WIDTH = 112;
const UNIVERSITY_HEIGHT = 104;

function createUniversitySprite() {
  const canvas = document.createElement("canvas");
  canvas.width = UNIVERSITY_WIDTH * RESOLUTION;
  canvas.height = UNIVERSITY_HEIGHT * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = UNIVERSITY_WIDTH / 2;
  const baseY = UNIVERSITY_HEIGHT - 4;
  const outline = "#2b2118";
  const stone = "#b9a985";
  const stoneLight = "#d8c9a4";
  const stoneDark = "#8c7a5b";
  const roof = "#5c3d63";
  const roofLight = "#7c5686";
  const gold = "#e0b45f";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.1;

  roundedRectPath(ctx, cx - 44, baseY - 52, 88, 52, 3);
  ctx.fillStyle = stone;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 52, baseY - 52);
  ctx.lineTo(cx, baseY - 88);
  ctx.lineTo(cx + 52, baseY - 52);
  ctx.closePath();
  ctx.fillStyle = roof;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 52, baseY - 52);
  ctx.lineTo(cx + 52, baseY - 52);
  ctx.lineTo(cx + 44, baseY - 47);
  ctx.lineTo(cx - 44, baseY - 47);
  ctx.closePath();
  ctx.fillStyle = roofLight;
  ctx.fill();
  ctx.stroke();

  for (const offset of [-28, -9, 10, 29]) {
    ctx.fillStyle = stoneLight;
    ctx.fillRect(cx + offset - 4, baseY - 44, 8, 40);
    ctx.strokeRect(cx + offset - 4, baseY - 44, 8, 40);
  }

  roundedRectPath(ctx, cx - 9, baseY - 30, 18, 30, 2);
  ctx.fillStyle = stoneDark;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, baseY - 66, 9, 0, Math.PI * 2);
  ctx.fillStyle = stoneLight;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 6, baseY - 66);
  ctx.lineTo(cx - 2, baseY - 72);
  ctx.lineTo(cx + 2, baseY - 66);
  ctx.lineTo(cx + 6, baseY - 72);
  ctx.strokeStyle = gold;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = gold;
  ctx.fillRect(cx - 15, baseY - 57, 30, 3);
  ctx.strokeRect(cx - 15, baseY - 57, 30, 3);

  return {
    canvas,
    width: UNIVERSITY_WIDTH,
    height: UNIVERSITY_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

const OBSERVATORY_WIDTH = 72;
const OBSERVATORY_HEIGHT = 92;

function createObservatorySprite() {
  const canvas = document.createElement("canvas");
  canvas.width = OBSERVATORY_WIDTH * RESOLUTION;
  canvas.height = OBSERVATORY_HEIGHT * RESOLUTION;
  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = OBSERVATORY_WIDTH / 2;
  const baseY = OBSERVATORY_HEIGHT - 4;
  const outline = "#241c17";
  const stone = "#7c8794";
  const stoneLight = "#a3adb8";
  const stoneDark = "#56606b";
  const dome = "#39435a";
  const domeLight = "#5b6886";
  const gold = "#e0b45f";

  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.1;

  roundedRectPath(ctx, cx - 25, baseY - 50, 50, 50, 4);
  ctx.fillStyle = stone;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = stoneLight;
  for (const x of [-16, 0, 16]) {
    ctx.fillRect(cx + x - 3, baseY - 42, 6, 34);
    ctx.strokeRect(cx + x - 3, baseY - 42, 6, 34);
  }

  ctx.beginPath();
  ctx.arc(cx, baseY - 52, 27, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = dome;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, baseY - 52, 20, Math.PI * 1.08, Math.PI * 1.92);
  ctx.strokeStyle = domeLight;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(cx, baseY - 79, 2.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = stoneDark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(cx + 7, baseY - 42, 14, 12);
  ctx.stroke();
  ctx.fillStyle = "#1b2433";
  ctx.fillRect(cx + 9, baseY - 40, 10, 8);

  return {
    canvas,
    width: OBSERVATORY_WIDTH,
    height: OBSERVATORY_HEIGHT,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createUniversitySprites() {
  return [createUniversitySprite()];
}

export function createObservatorySprites() {
  return [createObservatorySprite()];
}

const CAMPFIRE_WIDTH = 64;
const CAMPFIRE_HEIGHT = 64;

function createCampfireSprite(frame) {
  const canvas = document.createElement("canvas");
  canvas.width = CAMPFIRE_WIDTH * RESOLUTION;
  canvas.height = CAMPFIRE_HEIGHT * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const centerX = CAMPFIRE_WIDTH / 2;
  const baseY = CAMPFIRE_HEIGHT - 8;

  const glow = ctx.createRadialGradient(centerX, baseY - 12, 2, centerX, baseY - 12, 31);
  glow.addColorStop(0, "rgba(255, 176, 82, 0.34)");
  glow.addColorStop(0.5, "rgba(232, 125, 58, 0.14)");
  glow.addColorStop(1, "rgba(232, 125, 58, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CAMPFIRE_WIDTH, CAMPFIRE_HEIGHT);

  const stones = [
    [-11, 0, 4.2, 2.6],
    [-5, 3, 3.6, 2.2],
    [6, 3, 4, 2.3],
    [12, 0, 3.4, 2.4],
    [1, 4, 3.2, 2],
  ];

  for (const [x, y, rx, ry] of stones) {
    ctx.beginPath();
    ctx.ellipse(centerX + x, baseY + y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#7c8087";
    ctx.fill();
    ctx.strokeStyle = "rgba(36, 31, 27, 0.65)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(centerX, baseY - 2);
  ctx.rotate(0.28);
  roundedRectPath(ctx, -13, -3, 26, 6, 3);
  ctx.fillStyle = "#6b4a2f";
  ctx.fill();
  ctx.strokeStyle = "rgba(36, 24, 15, 0.8)";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(centerX, baseY - 2);
  ctx.rotate(-0.5);
  roundedRectPath(ctx, -11, -3, 22, 5.5, 2.8);
  ctx.fillStyle = "#7c5738";
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const sway = frame === 0 ? -1.2 : 1.1;
  const height = frame === 0 ? 24 : 27;

  ctx.beginPath();
  ctx.moveTo(centerX - 8, baseY - 2);
  ctx.quadraticCurveTo(centerX - 10 + sway, baseY - 12, centerX + sway, baseY - height);
  ctx.quadraticCurveTo(centerX + 10 + sway, baseY - 12, centerX + 8, baseY - 2);
  ctx.quadraticCurveTo(centerX, baseY + 2, centerX - 8, baseY - 2);
  ctx.closePath();
  ctx.fillStyle = "#e87d3a";
  ctx.fill();
  ctx.strokeStyle = "rgba(120, 48, 18, 0.7)";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX - 4.5, baseY - 3);
  ctx.quadraticCurveTo(centerX - 4, baseY - 11, centerX + 1, baseY - height * 0.68);
  ctx.quadraticCurveTo(centerX + 5, baseY - 10, centerX + 4.5, baseY - 3);
  ctx.quadraticCurveTo(centerX, baseY, centerX - 4.5, baseY - 3);
  ctx.closePath();
  ctx.fillStyle = "#f6c460";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(centerX - 2, baseY - 4);
  ctx.quadraticCurveTo(centerX - 1, baseY - 9, centerX, baseY - height * 0.46);
  ctx.quadraticCurveTo(centerX + 2, baseY - 9, centerX + 2, baseY - 4);
  ctx.quadraticCurveTo(centerX, baseY - 2, centerX - 2, baseY - 4);
  ctx.closePath();
  ctx.fillStyle = "#fff0c8";
  ctx.fill();

  ctx.fillStyle = "#f0a24c";
  const sparks = frame === 0
    ? [[-7, -20, 0.9], [5, -25, 0.7], [10, -16, 0.6]]
    : [[-9, -24, 0.8], [3, -19, 0.9], [8, -28, 0.6]];

  for (const [x, y, r] of sparks) {
    ctx.beginPath();
    ctx.arc(centerX + x, baseY + y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return {
    canvas,
    width: CAMPFIRE_WIDTH,
    height: CAMPFIRE_HEIGHT,
    anchorX: centerX,
    anchorY: baseY,
  };
}

export function createCampfireSprites() {
  return [createCampfireSprite(0), createCampfireSprite(1)];
}
function createHutSprite() {
  const width = 64;
  const height = 56;
  const canvas = document.createElement("canvas");
  canvas.width = width * RESOLUTION;
  canvas.height = height * RESOLUTION;
  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const cx = width / 2;
  const baseY = height - 4;
  const outline = "#3a2b20";

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(cx, baseY, 26, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8d6843";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(cx - 18, baseY - 20, 36, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#d8b45f";
  ctx.beginPath();
  ctx.moveTo(cx - 27, baseY - 18);
  ctx.lineTo(cx, baseY - 42);
  ctx.lineTo(cx + 27, baseY - 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(92, 60, 30, 0.55)";
  ctx.lineWidth = 1;
  for (let i = -20; i <= 20; i += 8) {
    ctx.beginPath();
    ctx.moveTo(cx + i, baseY - 21);
    ctx.lineTo(cx + i * 0.45, baseY - 38);
    ctx.stroke();
  }

  ctx.fillStyle = "#4b3222";
  ctx.beginPath();
  ctx.rect(cx - 6, baseY - 15, 12, 15);
  ctx.fill();

  return {
    canvas,
    width,
    height,
    anchorX: cx,
    anchorY: baseY,
  };
}

function createShamanSprite() {
  const width = 30;
  const height = 46;
  const canvas = document.createElement("canvas");
  canvas.width = width * RESOLUTION;
  canvas.height = height * RESOLUTION;
  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const cx = width / 2;
  const baseY = height - 3;
  const outline = "#2b2119";

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(cx, baseY, 10, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#6b4a2e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + 8, baseY);
  ctx.lineTo(cx + 5, baseY - 36);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 8, baseY);
  ctx.quadraticCurveTo(cx - 13, baseY - 24, cx - 6, baseY - 34);
  ctx.lineTo(cx + 7, baseY - 34);
  ctx.quadraticCurveTo(cx + 13, baseY - 22, cx + 8, baseY);
  ctx.closePath();
  ctx.fillStyle = "#76604a";
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#c08b5a";
  ctx.beginPath();
  ctx.arc(cx, baseY - 38, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#d8c46a";
  ctx.beginPath();
  ctx.moveTo(cx - 7, baseY - 41);
  ctx.lineTo(cx, baseY - 50);
  ctx.lineTo(cx + 7, baseY - 41);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#b06bff";
  ctx.beginPath();
  ctx.arc(cx, baseY - 38, 1.8, 0, Math.PI * 2);
  ctx.fill();

  return {
    canvas,
    width,
    height,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createVillageSprites() {
  return {
    hut: createHutSprite(),
    shaman: createShamanSprite(),
  };
}

const FIEF_COLORS = {
  armada: "#d8c46a",
  museo: "#9fc7ff",
  templo: "#7ec699",
  taberna: "#e0a458",
  caballeria: "#c9a36a",
  arqueria: "#b7c7e0",
  germanderia: "#a8b5a0",
  vivienda: "#c9b37a",
};

function createFiefBuildingSprite(type) {
  const width = 50;
  const height = 48;
  const canvas = document.createElement("canvas");
  canvas.width = width * RESOLUTION;
  canvas.height = height * RESOLUTION;
  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const cx = width / 2;
  const baseY = height - 4;
  const color = FIEF_COLORS[type] ?? "#d8c46a";

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(cx, baseY, 20, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7a654e";
  ctx.strokeStyle = "#30251d";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(cx - 15, baseY - 18, 30, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - 22, baseY - 17);
  ctx.lineTo(cx, baseY - 36);
  ctx.lineTo(cx + 22, baseY - 17);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#2b2119";
  ctx.beginPath();
  ctx.rect(cx - 4, baseY - 13, 8, 13);
  ctx.fill();

  ctx.strokeStyle = "#f0e4c8";
  ctx.lineWidth = 1.5;
  if (type === "armada") {
    ctx.beginPath();
    ctx.moveTo(cx, baseY - 30);
    ctx.lineTo(cx, baseY - 21);
    ctx.moveTo(cx - 4, baseY - 27);
    ctx.lineTo(cx + 4, baseY - 27);
    ctx.stroke();
  } else if (type === "museo") {
    ctx.strokeRect(cx - 4, baseY - 30, 8, 7);
  } else if (type === "templo") {
    ctx.beginPath();
    ctx.moveTo(cx, baseY - 32);
    ctx.lineTo(cx, baseY - 22);
    ctx.moveTo(cx - 5, baseY - 27);
    ctx.lineTo(cx + 5, baseY - 27);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx + 3, baseY - 27, 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  return { canvas, width, height, anchorX: cx, anchorY: baseY };
}

function createFiefUnitSprite(type) {
  const width = 24;
  const height = 34;
  const canvas = document.createElement("canvas");
  canvas.width = width * RESOLUTION;
  canvas.height = height * RESOLUTION;
  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  const cx = width / 2;
  const baseY = height - 3;
  const color = {
    soldier: "#d8c46a",
    archer: "#b7c7e0",
    guardian: "#9fc7ff",
    scholar: "#cfd6e6",
    healer: "#7ec699",
    exorcist: "#b06bff",
    mercenary: "#e0a458",
    scout: "#c9b9a3",
    rider: "#d6b47a",
    lancer: "#c9a36a",
    pikeman: "#a8b5a0",
  }[type] ?? "#ccc";

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(cx, baseY, 7, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.strokeStyle = "#2b2119";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 7, baseY);
  ctx.lineTo(cx - 5, baseY - 19);
  ctx.lineTo(cx + 5, baseY - 19);
  ctx.lineTo(cx + 7, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#e4b189";
  ctx.beginPath();
  ctx.arc(cx, baseY - 23, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  return { canvas, width, height, anchorX: cx, anchorY: baseY };
}

export function createFiefSprites() {
  const buildings = {};
  for (const type of [
    "armada", "museo", "templo", "taberna",
    "caballeria", "arqueria", "germanderia", "vivienda",
  ]) {
    buildings[type] = createFiefBuildingSprite(type);
  }
  const units = {};
  for (const type of [
    "soldier", "archer", "guardian", "scholar",
    "healer", "exorcist", "mercenary", "scout",
    "rider", "lancer", "pikeman",
  ]) {
    units[type] = createFiefUnitSprite(type);
  }
  return { buildings, units };
}
