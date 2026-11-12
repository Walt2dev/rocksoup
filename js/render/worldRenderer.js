import { BIOMES, BIOME } from "../world/biomes.js";
import { mineralById } from "../world/minerals.js";

const BACKGROUND = "#081016";
const PROP_X_MARGIN = 220;
const PROP_Y_MARGIN = 280;

function terrainTilePoints(camera, worldX, worldY, z) {
  const x = worldX + 0.5;
  const y = worldY + 0.5;
  return [
    camera.project(x - 0.5, y - 0.5, z),
    camera.project(x + 0.5, y - 0.5, z),
    camera.project(x + 0.5, y + 0.5, z),
    camera.project(x - 0.5, y + 0.5, z),
  ];
}

function appendTilePath(path, points) {
  path.moveTo(points[0].x, points[0].y);
  path.lineTo(points[1].x, points[1].y);
  path.lineTo(points[2].x, points[2].y);
  path.lineTo(points[3].x, points[3].y);
  path.closePath();
}

function appendOffsetTilePath(path, center, offsets) {
  path.moveTo(center.x + offsets[0].x, center.y + offsets[0].y);
  path.lineTo(center.x + offsets[1].x, center.y + offsets[1].y);
  path.lineTo(center.x + offsets[2].x, center.y + offsets[2].y);
  path.lineTo(center.x + offsets[3].x, center.y + offsets[3].y);
  path.closePath();
}

function paintOffsetTerrainTexture(ctx, face) {
  const { center, offsets } = face;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(center.x + offsets[0].x, center.y + offsets[0].y);
  ctx.lineTo(center.x + offsets[1].x, center.y + offsets[1].y);
  ctx.lineTo(center.x + offsets[2].x, center.y + offsets[2].y);
  ctx.lineTo(center.x + offsets[3].x, center.y + offsets[3].y);
  ctx.closePath();
  ctx.clip();
  ctx.imageSmoothingEnabled = face.smooth !== false;

  let minX = center.x + offsets[0].x;
  let maxX = minX;
  let minY = center.y + offsets[0].y;
  let maxY = minY;

  for (let index = 1; index < offsets.length; index += 1) {
    const x = center.x + offsets[index].x;
    const y = center.y + offsets[index].y;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  ctx.drawImage(face.texture, minX, minY, maxX - minX, maxY - minY);
  ctx.restore();
}

function paintTerrainTexture(ctx, face) {
  const points = face.points;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  ctx.lineTo(points[1].x, points[1].y);
  ctx.lineTo(points[2].x, points[2].y);
  ctx.lineTo(points[3].x, points[3].y);
  ctx.closePath();
  ctx.clip();
  ctx.imageSmoothingEnabled = face.smooth !== false;

  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  }

  ctx.drawImage(face.texture, minX, minY, maxX - minX, maxY - minY);
  ctx.restore();
}

export class WorldRenderer {
  constructor({ tileW = 64, tileH = 32 } = {}) {
    this.tileW = tileW;
    this.tileH = tileH;
    this.pickables = [];
  }

  render(ctx, {
    world,
    camera,
    assets,
    width,
    height,
    actors = [],
    stonePaths = [],
    celestial = null,
  }) {
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, width, height);
    this.pickables = [];
    const waterPath = new Path2D();
    let waterTileCount = 0;

    if (celestial?.sky) {
      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, celestial.sky.top);
      sky.addColorStop(1, celestial.sky.bottom);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    }

    const flat = world.flat === true;
    const size = world.chunkSize;
    const halfW = (this.tileW / 2) * camera.zoom;
    const halfH = (this.tileH / 2) * camera.zoom;
    const originX = width / 2;
    const originY = height / 2;
    const camX = camera.x;
    const camY = camera.y;
    const bounds = camera.visibleBounds(4);
    const chunkMinX = Math.floor(bounds.minX / size) - 1;
    const chunkMaxX = Math.floor(bounds.maxX / size) + 1;
    const chunkMinY = Math.floor(bounds.minY / size) - 1;
    const chunkMaxY = Math.floor(bounds.maxY / size) + 1;
    const cullX = this.tileW * camera.zoom * 1.6;
    const cullY = this.tileH * camera.zoom * 2.6;
    let flatOffsets = null;

    if (flat) {
      const center = camera.project(0.5, 0.5, 0);
      flatOffsets = [
        camera.project(0, 0, 0),
        camera.project(1, 0, 0),
        camera.project(1, 1, 0),
        camera.project(0, 1, 0),
      ].map((point) => ({
        x: point.x - center.x,
        y: point.y - center.y,
      }));
    }
    const basePaths = new Map();
    const heightPaths = new Map();
    const heightFaces = [];
    const baseTextures = [];
    const topTextures = [];
    const chunks = [];
    const chunkHalfW = size * halfW;
    const chunkHalfH = size * halfH;
    const chunkMarginX = 160;
    const chunkMarginY = 260;

    for (let cy = chunkMinY; cy <= chunkMaxY; cy += 1) {
      for (let cx = chunkMinX; cx <= chunkMaxX; cx += 1) {
        const chunkCenterX = (cx + 0.5) * size;
        const chunkCenterY = (cy + 0.5) * size;
        const chunkScreen = camera.project(
          chunkCenterX,
          chunkCenterY,
          camera.z,
        );
        const chunkScreenX = chunkScreen.x;
        const chunkScreenY = chunkScreen.y;

        if (
          chunkScreenX + chunkHalfW < -chunkMarginX ||
          chunkScreenX - chunkHalfW > width + chunkMarginX ||
          chunkScreenY + chunkHalfH < -chunkMarginY ||
          chunkScreenY - chunkHalfH > height + chunkMarginY
        ) {
          continue;
        }

        const chunk = world.getChunk(cx, cy);
        chunks.push(chunk);
        const baseWorldX = cx * size;
        const baseWorldY = cy * size;

        for (let localY = 0; localY < size; localY += 1) {
          const worldY = baseWorldY + localY;

          for (let localX = 0; localX < size; localX += 1) {
            const worldX = baseWorldX + localX;
            const index = localY * size + localX;
            const biomeId = chunk.biome[index];
            const shade = chunk.shade[index];
            const baseKey = biomeId * 3 + shade;

            if (flat) {
              const center = camera.project(worldX + 0.5, worldY + 0.5, 0);

              if (
                center.x < -cullX ||
                center.x > width + cullX ||
                center.y < -cullY ||
                center.y > height + cullY
              ) {
                continue;
              }

              let basePath = basePaths.get(baseKey);

              if (!basePath) {
                basePath = new Path2D();
                basePaths.set(baseKey, basePath);
              }

              appendOffsetTilePath(basePath, center, flatOffsets);

              if (biomeId === BIOME.WATER) {
                appendOffsetTilePath(waterPath, center, flatOffsets);
                waterTileCount += 1;
              }

              const terrainTexture = assets.terrainTextures?.[biomeId];

              if (terrainTexture) {
                baseTextures.push({
                  texture: terrainTexture,
                  center,
                  offsets: flatOffsets,
                  smooth: !assets.packInfo?.pixelArt,
                });
              }
              continue;
            }

            const tileHeight = world.heightForTile(
              worldX,
              worldY,
              chunk.elevation[index],
              biomeId,
            );
            const liftedCenter = camera.project(
              worldX + 0.5,
              worldY + 0.5,
              tileHeight * 0.72,
            );

            if (
              liftedCenter.x < -cullX ||
              liftedCenter.x > width + cullX ||
              liftedCenter.y < -cullY ||
              liftedCenter.y > height + cullY
            ) {
              continue;
            }

            const basePoints = terrainTilePoints(camera, worldX, worldY, 0);
            const topPoints = terrainTilePoints(
              camera,
              worldX,
              worldY,
              tileHeight * 0.72,
            );

            if (tileHeight >= 0) {
              let basePath = basePaths.get(baseKey);

              if (!basePath) {
                basePath = new Path2D();
                basePaths.set(baseKey, basePath);
              }

              appendTilePath(basePath, basePoints);
            }

            const terrainTexture = assets.terrainTextures?.[biomeId];

            if (tileHeight === 0) {
              if (biomeId === BIOME.WATER) {
                appendTilePath(waterPath, topPoints);
                waterTileCount += 1;
              }
              if (terrainTexture) {
                baseTextures.push({
                  texture: terrainTexture,
                  points: topPoints,
                  smooth: !assets.packInfo?.pixelArt,
                  depth: camera.depthAt(worldX, worldY),
                });
              }
              continue;
            }

            if (terrainTexture) {
              topTextures.push({
                texture: terrainTexture,
                points: topPoints,
                smooth: !assets.packInfo?.pixelArt,
                depth: camera.depthAt(worldX, worldY),
              });
            }

            const key = (tileHeight + 80) * 100 + biomeId * 3 + shade;
            let path = heightPaths.get(key);

            if (!path) {
              path = new Path2D();
              heightPaths.set(key, path);
            }

            appendTilePath(path, topPoints);

            heightFaces.push({
              depth: camera.depthAt(worldX, worldY),
              biomeId,
              shade,
              topPoints,
              basePoints,
              negative: tileHeight < 0,
            });
          }
        }
      }
    }

    const sortedBasePaths = [...basePaths.entries()];
    const sortedPaths = [...heightPaths.entries()].sort(
      (a, b) => Math.floor(a[0] / 100) - Math.floor(b[0] / 100),
    );

    for (const [key, path] of sortedBasePaths) {
      const shade = key % 3;
      const biomeId = Math.floor(key / 3);
      ctx.fillStyle = BIOMES[biomeId]?.shades[shade] ?? BACKGROUND;
      ctx.fill(path);
    }

    for (const face of baseTextures) {
      if (face.offsets) {
        paintOffsetTerrainTexture(ctx, face);
      } else {
        paintTerrainTexture(ctx, face);
      }
    }

    heightFaces.sort((a, b) => a.depth - b.depth);

    for (const face of heightFaces) {
      const color = face.negative
        ? "rgba(8, 12, 16, 0.82)"
        : BIOMES[face.biomeId]?.shades[face.shade] ?? BACKGROUND;
      ctx.save();
      ctx.globalAlpha = face.negative ? 1 : 0.72;
      ctx.fillStyle = color;

      const top = face.topPoints;
      const base = face.basePoints;

      ctx.beginPath();
      ctx.moveTo(top[3].x, top[3].y);
      ctx.lineTo(top[2].x, top[2].y);
      ctx.lineTo(base[2].x, base[2].y);
      ctx.lineTo(base[3].x, base[3].y);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(top[2].x, top[2].y);
      ctx.lineTo(top[1].x, top[1].y);
      ctx.lineTo(base[1].x, base[1].y);
      ctx.lineTo(base[2].x, base[2].y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    for (const [key, path] of sortedPaths) {
      const shade = key % 3;
      const biomeId = Math.floor((key % 100) / 3);
      ctx.fillStyle = BIOMES[biomeId]?.shades[shade] ?? BACKGROUND;
      ctx.fill(path);
    }

    topTextures.sort((a, b) => a.depth - b.depth);
    for (const face of topTextures) {
      paintTerrainTexture(ctx, face);
    }

    if (camera.zoom >= 0.95) {
      ctx.strokeStyle = "rgba(4, 8, 12, 0.18)";
      ctx.lineWidth = Math.max(0.35, 0.65 * camera.zoom);
      for (const path of sortedPaths.map((entry) => entry[1])) {
        ctx.stroke(path);
      }
    }

    if (waterTileCount > 0 && celestial) {
      this.drawWaterReflections(ctx, {
        waterPath,
        waterTileCount,
        camera,
        width,
        height,
        celestial,
      });
    }

    for (const path of stonePaths) {
      this.drawStonePathTile(ctx, {
        camera,
        worldX: path.x,
        worldY: path.y,
        height: world.heightAt(path.x, path.y),
      });
    }

    const props = [];
    const projectProp = (worldX, worldY) => {
      const screen = camera.project(
        worldX,
        worldY,
        world.heightAt(worldX, worldY) * 0.72,
      );
      return { screenX: screen.x, screenY: screen.y };
    };

    const pushProp = (prop) => {
      if (
        prop.screenX < -PROP_X_MARGIN ||
        prop.screenX > width + PROP_X_MARGIN ||
        prop.screenY < -80 ||
        prop.screenY > height + PROP_Y_MARGIN
      ) {
        return;
      }
      props.push(prop);
    };

    for (const chunk of chunks) {
      const baseWorldX = chunk.cx * size;
      const baseWorldY = chunk.cy * size;

      for (const tree of chunk.trees) {
        const nodeX = baseWorldX + tree.localX;
        const nodeY = baseWorldY + tree.localY;
        const worldX = nodeX + 0.5;
        const worldY = nodeY + 0.5;

        pushProp({
          depth: camera.depthAt(worldX, worldY),
          kind: "tree",
          nodeX,
          nodeY,
          ...projectProp(worldX, worldY),
          data: tree,
        });
      }

      for (const mineral of chunk.minerals) {
        const nodeX = baseWorldX + mineral.localX;
        const nodeY = baseWorldY + mineral.localY;
        const worldX = nodeX + 0.5 + mineral.offsetX;
        const worldY = nodeY + 0.5 + mineral.offsetY;

        pushProp({
          depth: camera.depthAt(worldX, worldY),
          kind: "mineral",
          nodeX,
          nodeY,
          ...projectProp(worldX, worldY),
          data: mineral,
        });
      }

      for (const bush of chunk.bushes) {
        const nodeX = baseWorldX + bush.localX;
        const nodeY = baseWorldY + bush.localY;
        const worldX = nodeX + 0.5;
        const worldY = nodeY + 0.5;

        pushProp({
          depth: camera.depthAt(worldX, worldY),
          kind: "bush",
          nodeX,
          nodeY,
          ...projectProp(worldX, worldY),
          data: bush,
        });
      }

      for (const grass of chunk.grassTufts) {
        const nodeX = baseWorldX + grass.localX;
        const nodeY = baseWorldY + grass.localY;
        const worldX = nodeX + 0.5;
        const worldY = nodeY + 0.5;

        pushProp({
          depth: camera.depthAt(worldX, worldY),
          kind: "grass",
          nodeX,
          nodeY,
          ...projectProp(worldX, worldY),
          data: grass,
        });
      }

      for (const grass of chunk.cutGrass) {
        const worldX = baseWorldX + grass.localX + 0.5;
        const worldY = baseWorldY + grass.localY + 0.5;

        pushProp({
          depth: camera.depthAt(worldX, worldY),
          kind: "cutGrass",
          nodeX: baseWorldX + grass.localX,
          nodeY: baseWorldY + grass.localY,
          ...projectProp(worldX, worldY),
          data: grass,
        });
      }

      for (const bush of chunk.pickedBushes) {
        const worldX = baseWorldX + bush.localX + 0.5;
        const worldY = baseWorldY + bush.localY + 0.5;

        pushProp({
          depth: camera.depthAt(worldX, worldY),
          kind: "pickedBush",
          nodeX: baseWorldX + bush.localX,
          nodeY: baseWorldY + bush.localY,
          ...projectProp(worldX, worldY),
          data: bush,
        });
      }

      for (const stump of chunk.stumps) {
        const nodeX = baseWorldX + stump.localX;
        const nodeY = baseWorldY + stump.localY;
        const worldX = nodeX + 0.5;
        const worldY = nodeY + 0.5;

        pushProp({
          depth: camera.depthAt(worldX, worldY),
          kind: "stump",
          ...projectProp(worldX, worldY),
          data: stump,
        });
      }

      for (const rubble of chunk.rubble) {
        const worldX = baseWorldX + rubble.localX + 0.5 + rubble.offsetX;
        const worldY = baseWorldY + rubble.localY + 0.5 + rubble.offsetY;

        pushProp({
          depth: camera.depthAt(worldX, worldY),
          kind: "rubble",
          nodeX: baseWorldX + rubble.localX,
          nodeY: baseWorldY + rubble.localY,
          ...projectProp(worldX, worldY),
          data: rubble,
        });
      }
    }

    for (const actor of actors) {
      const worldX = actor.x;
      const worldY = actor.y;
      const terrainHeight = world.heightAt(worldX, worldY);
      const z = (actor.z ?? 0) + terrainHeight * 0.72;
      const screen = camera.project(worldX, worldY, z);
      const groundScreen = camera.project(
        worldX,
        worldY,
        terrainHeight * 0.72,
      );

      pushProp({
        depth: camera.depthAt(worldX, worldY) + z * 0.1,
        kind: "actor",
        screenX: screen.x,
        screenY: screen.y,
        groundScreenY: groundScreen.y,
        actor,
      });
    }

    props.sort(
      (a, b) =>
        a.depth - b.depth ||
        (a.kind === "actor" ? 1 : 0) - (b.kind === "actor" ? 1 : 0),
    );

    for (const prop of props) {
      if (prop.kind === "tree") {
        this.drawTree(ctx, prop, assets, camera.zoom);
      } else if (prop.kind === "mineral") {
        this.drawMineral(ctx, prop, assets, camera.zoom);
      } else if (prop.kind === "bush") {
        this.drawBush(ctx, prop, assets, camera.zoom);
      } else if (prop.kind === "grass") {
        this.drawGrass(ctx, prop, assets, camera.zoom);
      } else if (prop.kind === "cutGrass") {
        this.drawCutGrass(ctx, prop, assets, camera.zoom);
      } else if (prop.kind === "pickedBush") {
        this.drawPickedBush(ctx, prop, assets, camera.zoom);
      } else if (prop.kind === "stump") {
        this.drawStump(ctx, prop, camera.zoom);
      } else if (prop.kind === "rubble") {
        this.drawRubble(ctx, prop, camera.zoom);
      } else if (prop.kind === "actor") {
        this.drawActor(ctx, prop, camera.zoom);
      }
    }
  }

  pickNode(screenX, screenY) {
    for (let index = this.pickables.length - 1; index >= 0; index -= 1) {
      const pickable = this.pickables[index];
      const scale = pickable.scale;
      const width = pickable.sprite.width * scale;
      const height = pickable.sprite.height * scale;
      const left = pickable.screenX - pickable.sprite.anchorX * scale;
      const top = pickable.screenY - pickable.sprite.anchorY * scale;

      if (
        screenX >= left &&
        screenX <= left + width &&
        screenY >= top &&
        screenY <= top + height
      ) {
        return pickable;
      }
    }

    return null;
  }

  drawStonePathTile(
    ctx,
    {
      camera,
      worldX,
      worldY,
      height,
      alpha = 1,
      outline = null,
    },
  ) {
    const z = height * 0.72;
    const points = [
      camera.project(worldX - 0.5, worldY - 0.5, z),
      camera.project(worldX + 0.5, worldY - 0.5, z),
      camera.project(worldX + 0.5, worldY + 0.5, z),
      camera.project(worldX - 0.5, worldY + 0.5, z),
    ];
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const center = {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    };
    const halfW = ((maxX - minX) / 2) * 0.86;
    const halfH = ((maxY - minY) / 2) * 0.86;

    if (
      maxX < -60 ||
      minX > camera.width + 60 ||
      maxY < -60 ||
      minY > camera.height + 60
    ) {
      return;
    }

    const traceTile = () => {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.lineTo(points[2].x, points[2].y);
      ctx.lineTo(points[3].x, points[3].y);
      ctx.closePath();
    };

    let seed =
      (Math.floor(worldX) * 374761393 + Math.floor(worldY) * 668265263) >>>
      0;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    ctx.save();
    ctx.globalAlpha = alpha;
    traceTile();

    ctx.fillStyle = "#7b7467";
    ctx.fill();

    ctx.save();
    ctx.clip();

    const stones = [
      { x: -0.34, y: -0.08, r: 0.34, color: "#948b7b" },
      { x: 0.18, y: -0.2, r: 0.3, color: "#68635b" },
      { x: 0.36, y: 0.18, r: 0.27, color: "#a49a88" },
      { x: -0.12, y: 0.3, r: 0.32, color: "#716b60" },
    ];

    for (const stone of stones) {
      const jitterX = (random() - 0.5) * 0.1;
      const jitterY = (random() - 0.5) * 0.1;
      ctx.beginPath();
      ctx.ellipse(
        center.x + (stone.x + jitterX) * halfW,
        center.y + (stone.y + jitterY) * halfH,
        stone.r * halfW * (0.72 + random() * 0.22),
        stone.r * halfH * (0.68 + random() * 0.2),
        (random() - 0.5) * 0.8,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = stone.color;
      ctx.fill();
    }

    ctx.restore();

    traceTile();
    ctx.strokeStyle = outline ?? "rgba(45, 38, 30, 0.58)";
    ctx.lineWidth = outline ? 2.2 : Math.max(0.7, camera.zoom * 0.8);
    ctx.stroke();
    ctx.restore();
  }

  drawTree(ctx, prop, assets, zoom) {
    const spriteSet = assets.treeSprites?.[prop.data.species];
    if (!spriteSet || spriteSet.length === 0) {
      return;
    }

    const sprite = spriteSet[prop.data.variant % spriteSet.length];
    const scale = prop.data.scale * zoom;
    const width = sprite.width * scale;
    const height = sprite.height * scale;
    const x = prop.screenX - sprite.anchorX * scale;
    const y = prop.screenY - sprite.anchorY * scale;

    ctx.beginPath();
    ctx.ellipse(prop.screenX, prop.screenY, 11 * scale, 4 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.26)";
    ctx.fill();

    ctx.drawImage(sprite.canvas, x, y, width, height);

    this.pickables.push({
      kind: "tree",
      x: prop.nodeX,
      y: prop.nodeY,
      screenX: prop.screenX,
      screenY: prop.screenY,
      sprite,
      scale,
    });
  }

  drawMineral(ctx, prop, assets, zoom) {
    const spriteSet = assets.mineralSprites?.[prop.data.type - 1];
    if (!spriteSet || spriteSet.length === 0) {
      return;
    }

    const sprite = spriteSet[prop.data.variant % spriteSet.length];
    const scale = prop.data.scale * zoom;
    const width = sprite.width * scale;
    const height = sprite.height * scale;
    const x = prop.screenX - sprite.anchorX * scale;
    const y = prop.screenY - sprite.anchorY * scale;

    ctx.beginPath();
    ctx.ellipse(prop.screenX, prop.screenY, 7 * scale, 2.8 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fill();

    ctx.drawImage(sprite.canvas, x, y, width, height);

    this.pickables.push({
      kind: "mineral",
      x: prop.nodeX,
      y: prop.nodeY,
      screenX: prop.screenX,
      screenY: prop.screenY,
      sprite,
      scale,
    });
  }

  drawGrass(ctx, prop, assets, zoom) {
    const spriteSet =
      prop.data.style === "lush"
        ? assets.lushGrassSprites
        : prop.data.style === "dry"
          ? assets.dryGrassSprites
          : assets.grassSprites;

    if (!spriteSet || spriteSet.length === 0) {
      return;
    }

    const sprite = spriteSet[prop.data.variant % spriteSet.length];
    const scale = prop.data.scale * zoom;
    const width = sprite.width * scale;
    const height = sprite.height * scale;
    const x = prop.screenX - sprite.anchorX * scale;
    const y = prop.screenY - sprite.anchorY * scale;

    ctx.drawImage(sprite.canvas, x, y, width, height);

    this.pickables.push({
      kind: "grass",
      x: prop.nodeX,
      y: prop.nodeY,
      screenX: prop.screenX,
      screenY: prop.screenY,
      sprite,
      scale: Math.max(scale, 0.8),
    });
  }

  drawCutGrass(ctx, prop, assets, zoom) {
    const sprite =
      assets.cutGrassSprites?.[prop.data.variant % (assets.cutGrassSprites?.length ?? 1)];

    if (!sprite) {
      return;
    }

    const scale = (prop.data.scale ?? 1) * zoom;
    ctx.globalAlpha = 0.75;
    ctx.drawImage(
      sprite.canvas,
      prop.screenX - sprite.anchorX * scale,
      prop.screenY - sprite.anchorY * scale,
      sprite.width * scale,
      sprite.height * scale,
    );
    ctx.globalAlpha = 1;
  }

  drawBush(ctx, prop, assets, zoom) {
    const spriteSet =
      prop.data.style === "dry"
        ? assets.dryBushSprites
        : prop.data.style === "jungle"
          ? assets.jungleBushSprites
          : assets.bushSprites;

    if (!spriteSet || spriteSet.length === 0) {
      return;
    }

    const sprite = spriteSet[prop.data.variant % spriteSet.length];
    const scale = prop.data.scale * zoom;
    const width = sprite.width * scale;
    const height = sprite.height * scale;
    const x = prop.screenX - sprite.anchorX * scale;
    const y = prop.screenY - sprite.anchorY * scale;

    ctx.beginPath();
    ctx.ellipse(prop.screenX, prop.screenY, 10 * scale, 3.8 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fill();

    ctx.drawImage(sprite.canvas, x, y, width, height);

    this.pickables.push({
      kind: "bush",
      x: prop.nodeX,
      y: prop.nodeY,
      screenX: prop.screenX,
      screenY: prop.screenY,
      sprite,
      scale,
    });
  }

  drawPickedBush(ctx, prop, assets, zoom) {
    const spriteSet =
      prop.data.style === "dry"
        ? assets.pickedDryBushSprites
        : prop.data.style === "jungle"
          ? assets.pickedJungleBushSprites
          : assets.pickedBushSprites;

    if (!spriteSet || spriteSet.length === 0) {
      return;
    }

    const sprite = spriteSet[prop.data.variant % spriteSet.length];
    const scale = prop.data.scale * zoom * 0.9;
    const width = sprite.width * scale;
    const height = sprite.height * scale;
    const x = prop.screenX - sprite.anchorX * scale;
    const y = prop.screenY - sprite.anchorY * scale;

    ctx.beginPath();
    ctx.ellipse(prop.screenX, prop.screenY, 8 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.fill();

    ctx.drawImage(sprite.canvas, x, y, width, height);
  }

  drawStump(ctx, prop, zoom) {
    const scale = (prop.data.scale ?? 1) * zoom;

    if (prop.data.species === 3) {
      ctx.beginPath();
      ctx.ellipse(prop.screenX, prop.screenY, 8 * scale, 3 * scale, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(prop.screenX, prop.screenY - 2 * scale, 4.5 * scale, 6 * scale, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#4b8350";
      ctx.fill();
      ctx.strokeStyle = "#2c5432";
      ctx.lineWidth = 1;
      ctx.stroke();
      return;
    }

    ctx.beginPath();
    ctx.ellipse(prop.screenX, prop.screenY, 10 * scale, 4 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(prop.screenX, prop.screenY - 3 * scale, 8 * scale, 4 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#5a3e2a";
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.32)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(prop.screenX, prop.screenY - 6 * scale, 6 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#8a623c";
    ctx.fill();
    ctx.strokeStyle = "rgba(52, 33, 20, 0.7)";
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(prop.screenX, prop.screenY - 6 * scale, 3.4 * scale, 1.6 * scale, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(52, 33, 20, 0.55)";
    ctx.stroke();
  }

  drawRubble(ctx, prop, zoom) {
    const scale = (prop.data.scale ?? 1) * zoom;
    const tint = mineralById(prop.data.type)?.color ?? "#8a8f97";

    ctx.beginPath();
    ctx.ellipse(prop.screenX, prop.screenY, 8 * scale, 3.2 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fill();

    const stones = [
      { x: -4, y: -2, rx: 3.6, ry: 2.6, color: "#777c84" },
      { x: 3.5, y: -1, rx: 2.8, ry: 2.1, color: tint },
      { x: 0, y: -4, rx: 3, ry: 2.2, color: "#676c74" },
    ];

    for (const stone of stones) {
      ctx.beginPath();
      ctx.ellipse(
        prop.screenX + stone.x * scale,
        prop.screenY + stone.y * scale,
        stone.rx * scale,
        stone.ry * scale,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = stone.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(20, 24, 28, 0.45)";
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
  }

  drawWaterReflections(ctx, { waterPath, waterTileCount, camera, width, height, celestial }) {
    const night = celestial.night === true;
    const active = night ? celestial.moon : celestial.sun;

    if (!active || !active.visible) {
      return;
    }

    const anchorX = width * (0.5 + (active.azimuth ?? 0) * 0.34);
    const anchorY = height * (0.56 - (active.elevation ?? 0) * 0.12);
    const intensity = Math.max(0, Math.min(1, active.intensity ?? 0.6));
    const glowRadius = Math.max(width, height) * 0.32;

    ctx.save();
    ctx.clip(waterPath);

    const glow = ctx.createRadialGradient(
      anchorX,
      anchorY,
      2,
      anchorX,
      anchorY,
      glowRadius,
    );

    if (night) {
      glow.addColorStop(0, `rgba(214, 228, 255, ${0.3 * intensity})`);
      glow.addColorStop(0.45, `rgba(150, 180, 235, ${0.13 * intensity})`);
      glow.addColorStop(1, "rgba(120, 150, 210, 0)");
    } else {
      glow.addColorStop(0, `rgba(255, 232, 160, ${0.34 * intensity})`);
      glow.addColorStop(0.45, `rgba(255, 206, 120, ${0.15 * intensity})`);
      glow.addColorStop(1, "rgba(255, 190, 90, 0)");
    }

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    const column = ctx.createLinearGradient(
      anchorX,
      anchorY,
      anchorX,
      Math.min(height, anchorY + height * 0.5),
    );
    column.addColorStop(
      0,
      night
        ? `rgba(220, 236, 255, ${0.34 * intensity})`
        : `rgba(255, 244, 206, ${0.4 * intensity})`,
    );
    column.addColorStop(
      0.55,
      night
        ? `rgba(160, 190, 240, ${0.12 * intensity})`
        : `rgba(255, 204, 122, ${0.14 * intensity})`,
    );
    column.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = column;
    ctx.fillRect(anchorX - width * 0.055, anchorY, width * 0.11, height * 0.55);

    if (night) {
      const radius = Math.max(9, 17 * camera.zoom);
      const illumination = Math.max(0, Math.min(1, celestial.moon.illumination ?? 0));

      if (illumination > 0.02) {
        ctx.beginPath();
        ctx.arc(anchorX, anchorY, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232, 240, 255, ${0.4 + illumination * 0.45})`;
        ctx.fill();

        if (illumination < 0.96) {
          const offset =
            (1 - illumination) *
            radius *
            1.95 *
            ((celestial.moon.phaseIndex ?? 0) <= 4 ? -1 : 1);
          ctx.beginPath();
          ctx.arc(anchorX + offset, anchorY, radius * 1.02, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(9, 14, 26, 0.62)";
          ctx.fill();
        }
      }
    } else {
      const radius = Math.max(10, 20 * camera.zoom);
      const sun = ctx.createRadialGradient(
        anchorX,
        anchorY,
        1,
        anchorX,
        anchorY,
        radius,
      );
      sun.addColorStop(0, "rgba(255, 252, 226, 0.95)");
      sun.addColorStop(0.5, "rgba(255, 224, 150, 0.6)");
      sun.addColorStop(1, "rgba(255, 196, 104, 0)");
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(anchorX, anchorY, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const sparkleCount = Math.min(
      28,
      Math.max(8, Math.floor(waterTileCount / 12)),
    );
    const clock = celestial.time ?? 0;
    ctx.beginPath();

    for (let index = 0; index < sparkleCount; index += 1) {
      const phase = clock * 0.55 + index * 1.73;
      const x =
        anchorX +
        Math.sin(phase + index * 2.17) * width * 0.22 +
        ((index * 73) % 19) -
        9;
      const y =
        anchorY +
        ((index * 53) % Math.max(20, height * 0.42)) +
        Math.sin(phase * 1.3 + index) * 5;
      const length = 4 + ((index * 7) % 10);
      ctx.moveTo(x, y);
      ctx.lineTo(x + length, y);
    }

    ctx.lineWidth = 1;
    ctx.strokeStyle = night
      ? "rgba(220, 232, 255, 0.34)"
      : "rgba(255, 236, 178, 0.42)";
    ctx.stroke();
    ctx.restore();
  }

  drawActor(ctx, prop, zoom) {
    const actor = prop.actor;
    const sprite = actor.sprite;

    if (!sprite) {
      return;
    }

    const scale = (actor.scale ?? 1) * zoom;
    const flip = actor.flip ?? 1;
    const groundY = prop.groundScreenY ?? prop.screenY;
    const walkBob = actor.moving
      ? Math.sin((actor.walkPhase ?? 0) * Math.PI * 2) * 1.3 * zoom
      : 0;

    if (actor.selected || actor.ringColor) {
      ctx.beginPath();
      ctx.ellipse(prop.screenX, groundY, 13 * scale, 5 * scale, 0, 0, Math.PI * 2);
      ctx.fillStyle = actor.ringColor
        ? "rgba(255, 255, 255, 0.06)"
        : "rgba(224, 164, 88, 0.14)";
      ctx.fill();
      ctx.strokeStyle = actor.ringColor ?? "rgba(240, 192, 122, 0.95)";
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    if (actor.glow) {
      const glowX = prop.screenX;
      const glowY = groundY - 6 * scale;
      const radius = 56 * scale;
      const gradient = ctx.createRadialGradient(glowX, glowY, 2, glowX, glowY, radius);
      gradient.addColorStop(0, "rgba(255, 178, 84, 0.2)");
      gradient.addColorStop(0.55, "rgba(240, 138, 62, 0.08)");
      gradient.addColorStop(1, "rgba(240, 138, 62, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(glowX, glowY, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.ellipse(prop.screenX, groundY, 9 * scale, 3.6 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = actor.flying ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.3)";
    ctx.fill();

    ctx.save();
    ctx.translate(prop.screenX, prop.screenY - walkBob);
    ctx.scale(flip, 1);
    ctx.drawImage(
      sprite.canvas,
      -sprite.anchorX * scale,
      -sprite.anchorY * scale,
      sprite.width * scale,
      sprite.height * scale,
    );
    ctx.restore();
  }
}

