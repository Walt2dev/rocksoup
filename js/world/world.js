import { createRng } from "../core/rng.js";
import {
  BIOME,
  classifyBiomeForSet,
  isWalkableBiome,
} from "./biomes.js";
import { Chunk, chunkKey } from "./chunk.js";
import { rollGoldVein, rollMineral } from "./minerals.js";
import { clamp01, createNoise, fbm01 } from "./noise.js";
import { WORLD } from "./params.js";
import { rollBush, rollGrass, rollTree } from "./vegetation.js";

export class World {
  constructor(seed, options = {}) {
    this.seed = createRng(seed).seed;
    this.config = { ...WORLD, ...options };
    this.biomeSet =
      this.config.biomeSet === "expanded" ? "expanded" : "legacy";
    this.flat = options.flat === true;
    this.chunkSize = this.config.chunkSize;
    this.chunks = new Map();
    this.generatedChunks = 0;
    this.harvestedNodes = new Map();
    this.plantedNodes = new Map();
    this.heightEdits = new Map();

    this.elevationNoise = createNoise(`${this.seed}:elevation`);
    this.moistureNoise = createNoise(`${this.seed}:moisture`);
    this.temperatureNoise = createNoise(`${this.seed}:temperature`);
    this.vegetationNoise = createNoise(`${this.seed}:vegetation`);
    this.mineralNoise = createNoise(`${this.seed}:mineral`);
  }

  elevationAt(x, y) {
    const config = this.config;
    return fbm01(
      this.elevationNoise,
      x * config.elevationScale,
      y * config.elevationScale,
      config.elevationOctaves,
    );
  }

  moistureAt(x, y, elevation = this.elevationAt(x, y)) {
    const config = this.config;
    const moisture = fbm01(
      this.moistureNoise,
      x * config.moistureScale + config.moistureOffsetX,
      y * config.moistureScale + config.moistureOffsetY,
      config.moistureOctaves,
    );

    return clamp01(moisture - Math.max(0, elevation - 0.72) * 0.9);
  }

  temperatureAt(x, y, elevation = this.elevationAt(x, y)) {
    const config = this.config;
    const base = fbm01(
      this.temperatureNoise,
      x * config.temperatureScale + config.temperatureOffsetX,
      y * config.temperatureScale + config.temperatureOffsetY,
      config.temperatureOctaves,
    );

    return clamp01(base - Math.max(0, elevation - 0.5) * 0.9);
  }

  sampleTerrain(x, y) {
    const elevation = this.elevationAt(x, y);
    const moisture = this.moistureAt(x, y, elevation);
    const temperature =
      this.biomeSet === "expanded" ? this.temperatureAt(x, y, elevation) : 0;
    return {
      elevation,
      moisture,
      temperature,
      biome: classifyBiomeForSet(
        elevation,
        moisture,
        temperature,
        this.biomeSet,
        this.config,
      ),
    };
  }

  biomeAt(x, y) {
    return this.sampleTerrain(x, y).biome;
  }

  isWalkableAt(x, y) {
    return isWalkableBiome(this.biomeAt(x, y));
  }

  vegetationDensityAt(x, y) {
    const config = this.config;
    return fbm01(
      this.vegetationNoise,
      x * config.vegetationScale + config.vegetationOffsetX,
      y * config.vegetationScale + config.vegetationOffsetY,
      config.vegetationOctaves,
    );
  }

  mineralVeinAt(x, y) {
    const config = this.config;
    return fbm01(
      this.mineralNoise,
      x * config.mineralScale + config.mineralOffsetX,
      y * config.mineralScale + config.mineralOffsetY,
      config.mineralOctaves,
    );
  }

  isBlockedAt(x, y) {
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    const size = this.chunkSize;
    const cx = Math.floor(tileX / size);
    const cy = Math.floor(tileY / size);
    const localX = ((tileX % size) + size) % size;
    const localY = ((tileY % size) + size) % size;
    const chunk = this.getChunk(cx, cy);
    const index = chunk.index(localX, localY);

    return (
      chunk.tree[index] !== 0 ||
      (!this.flat && chunk.mineral[index] !== 0) ||
      chunk.bush[index] !== 0
    );
  }

  isActorWalkableAt(x, y) {
    return this.isWalkableAt(x, y) && !this.isBlockedAt(x, y);
  }

  baseHeightFromTile(tile) {
    if (this.flat || tile.biome === BIOME.WATER) {
      return 0;
    }
    if (tile.elevation > this.config.snowLevel) {
      return 2;
    }
    if (tile.elevation > this.config.rockLevel) {
      return 1;
    }
    return 0;
  }

  baseHeightAt(x, y) {
    return this.baseHeightFromTile(this.getTile(x, y));
  }

  heightForTile(x, y, elevation, biome) {
    if (this.flat) {
      return 0;
    }

    let base = 0;

    if (biome === BIOME.WATER) {
      base = 0;
    } else if (elevation > this.config.snowLevel) {
      base = 2;
    } else if (elevation > this.config.rockLevel) {
      base = 1;
    }

    const delta = this.heightEdits.get(`${Math.floor(x)}:${Math.floor(y)}`) ?? 0;
    return Math.min(8, Math.max(-70, base + delta));
  }

  heightAt(x, y) {
    const tile = this.getTile(x, y);
    return this.heightForTile(tile.x, tile.y, tile.elevation, tile.biome);
  }

  changeHeightAt(x, y, delta = 1) {
    if (this.flat) {
      return 0;
    }
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    const base = this.baseHeightAt(tileX, tileY);
    const current = this.heightAt(tileX, tileY);
    const next = Math.min(8, Math.max(-70, current + delta));

    if (next === current) {
      return current;
    }

    const key = `${tileX}:${tileY}`;
    const nextDelta = next - base;

    if (nextDelta === 0) {
      this.heightEdits.delete(key);
    } else {
      this.heightEdits.set(key, nextDelta);
    }

    return next;
  }

  setHeightAt(x, y, height) {
    if (this.flat) {
      return 0;
    }
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    const base = this.baseHeightAt(tileX, tileY);
    const next = Math.min(8, Math.max(-70, Math.floor(height)));
    const key = `${tileX}:${tileY}`;
    const delta = next - base;

    if (delta === 0) {
      this.heightEdits.delete(key);
    } else {
      this.heightEdits.set(key, delta);
    }

    return next;
  }

  loadHeightEdits(edits) {
    if (this.flat || !Array.isArray(edits)) {
      return;
    }

    for (const edit of edits) {
      if (
        !edit ||
        !Number.isFinite(edit.x) ||
        !Number.isFinite(edit.y) ||
        !Number.isFinite(edit.delta)
      ) {
        continue;
      }
      this.heightEdits.set(
        `${Math.floor(edit.x)}:${Math.floor(edit.y)}`,
        Math.max(-80, Math.min(12, Math.floor(edit.delta))),
      );
    }
  }

  exportHeightEdits() {
    if (this.flat) {
      return [];
    }
    return [...this.heightEdits.entries()]
      .map(([key, delta]) => {
        const [x, y] = key.split(":").map(Number);
        return { x, y, delta };
      })
      .sort((a, b) => a.x - b.x || a.y - b.y);
  }

  getChunk(cx, cy) {
    const key = chunkKey(cx, cy);
    const cached = this.chunks.get(key);

    if (cached) {
      this.chunks.delete(key);
      this.chunks.set(key, cached);
      return cached;
    }

    return this.generateChunk(cx, cy);
  }

  generateChunk(cx, cy) {
    const size = this.chunkSize;
    const chunk = new Chunk(cx, cy, size);

    for (let localY = 0; localY < size; localY += 1) {
      for (let localX = 0; localX < size; localX += 1) {
        const x = cx * size + localX;
        const y = cy * size + localY;
        const index = chunk.index(localX, localY);
        const terrain = this.sampleTerrain(x, y);
        const rng = createRng(`${this.seed}:tile:${x}:${y}`);

        chunk.elevation[index] = terrain.elevation;
        chunk.moisture[index] = terrain.moisture;
        chunk.biome[index] = terrain.biome;
        chunk.shade[index] = rng.int(0, 3);

        if (terrain.biome === BIOME.WATER) {
          continue;
        }

        const planted =
          this.plantedNodes.get(`tree:${x}:${y}`) ??
          this.plantedNodes.get(`grass:${x}:${y}`);

        if (planted?.kind === "tree") {
          chunk.tree[index] = 1;
          chunk.trees.push({ localX, localY, ...planted.data });
          continue;
        }

        if (planted?.kind === "grass") {
          chunk.grass[index] = 1;
          chunk.grassTufts.push({ localX, localY, ...planted.data });
          continue;
        }

        const vein = this.mineralVeinAt(x, y);
        const gold = rollGoldVein(
          createRng(`${this.seed}:gold:${x}:${y}`),
          terrain,
          vein,
          this.config,
        );
        const mineral = gold ?? rollMineral(rng, terrain.biome, vein);

        if (mineral) {
          if (this.isHarvested("mineral", x, y)) {
            chunk.rubble.push({ localX, localY, ...mineral });
          } else {
            chunk.mineral[index] = mineral.type;
            chunk.minerals.push({ localX, localY, ...mineral });
          }
          continue;
        }

        if (terrain.biome === BIOME.BEACH) {
          continue;
        }

        const density = this.vegetationDensityAt(x, y);
        const tree = rollTree(rng, terrain.biome, terrain.moisture, density);

        if (tree) {
          if (this.isHarvested("tree", x, y)) {
            chunk.stumps.push({ localX, localY, ...tree });
          } else {
            chunk.tree[index] = 1;
            chunk.trees.push({ localX, localY, ...tree });
          }
          continue;
        }

        const bush = rollBush(rng, terrain.biome, density);

        if (bush) {
          if (this.isHarvested("bush", x, y)) {
            chunk.pickedBushes.push({ localX, localY, ...bush });
          } else {
            chunk.bush[index] = 1;
            chunk.bushes.push({ localX, localY, ...bush });
          }
          continue;
        }

        const grass = rollGrass(rng, terrain.biome, density);

        if (grass) {
          if (this.isHarvested("grass", x, y)) {
            chunk.cutGrass.push({ localX, localY, ...grass });
          } else {
            chunk.grass[index] = 1;
            chunk.grassTufts.push({ localX, localY, ...grass });
          }
        }
      }
    }

    this.chunks.set(chunkKey(cx, cy), chunk);
    this.generatedChunks += 1;
    this.evictChunks();

    return chunk;
  }

  evictChunks() {
    const max = Math.max(1, this.config.maxCachedChunks);

    while (this.chunks.size > max) {
      const oldest = this.chunks.keys().next().value;
      this.chunks.delete(oldest);
    }
  }

  getTile(x, y) {
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    const size = this.chunkSize;
    const cx = Math.floor(tileX / size);
    const cy = Math.floor(tileY / size);
    const localX = ((tileX % size) + size) % size;
    const localY = ((tileY % size) + size) % size;
    const chunk = this.getChunk(cx, cy);
    const index = chunk.index(localX, localY);

    return {
      x: tileX,
      y: tileY,
      cx,
      cy,
      localX,
      localY,
      elevation: chunk.elevation[index],
      moisture: chunk.moisture[index],
      biome: chunk.biome[index],
      mineral: chunk.mineral[index],
      chunk,
    };
  }

  isHarvested(kind, x, y) {
    return this.harvestedNodes.has(`${kind}:${x}:${y}`);
  }

  markHarvested(kind, x, y) {
    if (
      kind !== "tree" &&
      kind !== "mineral" &&
      kind !== "bush" &&
      kind !== "grass"
    ) {
      return false;
    }
    this.harvestedNodes.set(`${kind}:${x}:${y}`, { kind, x, y });
    return true;
  }

  loadHarvested(nodes) {
    if (!Array.isArray(nodes)) {
      return;
    }

    for (const node of nodes) {
      if (
        !node ||
        (node.kind !== "tree" &&
          node.kind !== "mineral" &&
          node.kind !== "bush" &&
          node.kind !== "grass")
      ) {
        continue;
      }
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
        continue;
      }
      this.markHarvested(node.kind, Math.floor(node.x), Math.floor(node.y));
    }
  }

  exportHarvested() {
    return [...this.harvestedNodes.values()]
      .map(({ kind, x, y }) => ({ kind, x, y }))
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.x - b.x || a.y - b.y);
  }

  plantNode(kind, x, y, data) {
    if (kind !== "tree" && kind !== "grass") {
      return false;
    }
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    this.harvestedNodes.delete(`${kind}:${tileX}:${tileY}`);
    this.plantedNodes.set(`${kind}:${tileX}:${tileY}`, {
      kind,
      x: tileX,
      y: tileY,
      data: { ...data },
    });
    const size = this.chunkSize;
    const cx = Math.floor(tileX / size);
    const cy = Math.floor(tileY / size);
    this.chunks.delete(chunkKey(cx, cy));
    return true;
  }

  loadPlanted(nodes) {
    if (!Array.isArray(nodes)) {
      return;
    }

    for (const node of nodes) {
      if (
        !node ||
        (node.kind !== "tree" && node.kind !== "grass") ||
        !Number.isFinite(node.x) ||
        !Number.isFinite(node.y) ||
        !node.data ||
        typeof node.data !== "object"
      ) {
        continue;
      }
      this.plantedNodes.set(`${node.kind}:${Math.floor(node.x)}:${Math.floor(node.y)}`, {
        kind: node.kind,
        x: Math.floor(node.x),
        y: Math.floor(node.y),
        data: { ...node.data },
      });
    }
  }

  exportPlanted() {
    return [...this.plantedNodes.values()]
      .map(({ kind, x, y, data }) => ({ kind, x, y, data: { ...data } }))
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.x - b.x || a.y - b.y);
  }

  getNodeAt(kind, x, y) {
    if (
      kind !== "tree" &&
      kind !== "mineral" &&
      kind !== "bush" &&
      kind !== "grass"
    ) {
      return null;
    }

    const tile = this.getTile(x, y);
    const list =
      kind === "tree"
        ? tile.chunk.trees
        : kind === "mineral"
          ? tile.chunk.minerals
          : kind === "bush"
            ? tile.chunk.bushes
            : tile.chunk.grassTufts;
    const node = list.find(
      (entry) => entry.localX === tile.localX && entry.localY === tile.localY,
    );

    if (!node) {
      return null;
    }

    return {
      ...node,
      kind,
      x: tile.x,
      y: tile.y,
      worldX: tile.x + 0.5,
      worldY: tile.y + 0.5,
    };
  }

  harvestNode(kind, x, y) {
    if (
      kind !== "tree" &&
      kind !== "mineral" &&
      kind !== "bush" &&
      kind !== "grass"
    ) {
      return null;
    }

    const tile = this.getTile(x, y);
    const list =
      kind === "tree"
        ? tile.chunk.trees
        : kind === "mineral"
          ? tile.chunk.minerals
          : kind === "bush"
            ? tile.chunk.bushes
            : tile.chunk.grassTufts;
    const index = list.findIndex(
      (entry) => entry.localX === tile.localX && entry.localY === tile.localY,
    );

    if (index === -1) {
      return null;
    }

    const node = list[index];
    list.splice(index, 1);
    const tileIndex = tile.chunk.index(tile.localX, tile.localY);

    if (kind === "mineral") {
      tile.chunk.mineral[tileIndex] = 0;
      tile.chunk.rubble.push({ ...node });
    } else if (kind === "tree") {
      tile.chunk.tree[tileIndex] = 0;
      tile.chunk.stumps.push({ ...node });
    } else if (kind === "bush") {
      tile.chunk.bush[tileIndex] = 0;
      tile.chunk.pickedBushes.push({ ...node });
    } else {
      tile.chunk.grass[tileIndex] = 0;
      tile.chunk.cutGrass.push({ ...node });
    }

    this.markHarvested(kind, tile.x, tile.y);

    return {
      ...node,
      kind,
      x: tile.x,
      y: tile.y,
      worldX: tile.x + 0.5,
      worldY: tile.y + 0.5,
    };
  }

  restoreMineral(x, y) {
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    const key = `mineral:${tileX}:${tileY}`;

    if (!this.harvestedNodes.has(key)) {
      return false;
    }

    this.harvestedNodes.delete(key);
    const size = this.chunkSize;
    const cx = Math.floor(tileX / size);
    const cy = Math.floor(tileY / size);
    this.chunks.delete(chunkKey(cx, cy));
    return true;
  }

  findHarvestedMineralsNear(x, y, radius = 6) {
    const centerX = Math.floor(x);
    const centerY = Math.floor(y);
    const range = Math.max(1, Math.floor(radius));
    const found = [];

    for (const node of this.harvestedNodes.values()) {
      if (node.kind !== "mineral") {
        continue;
      }
      if (
        Math.abs(node.x - centerX) > range ||
        Math.abs(node.y - centerY) > range
      ) {
        continue;
      }
      found.push({ x: node.x, y: node.y });
    }

    found.sort(
      (a, b) =>
        Math.hypot(a.x - centerX, a.y - centerY) -
        Math.hypot(b.x - centerX, b.y - centerY),
    );
    return found;
  }

  findSpawn({ attempts = 240, radius = 160 } = {}) {
    const rng = createRng(`${this.seed}:spawn`);
    let fallback = null;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const angle = rng.float(0, Math.PI * 2);
      const distance = Math.sqrt(rng.next()) * radius;
      const x = Math.round(Math.cos(angle) * distance);
      const y = Math.round(Math.sin(angle) * distance);
      const biome = this.biomeAt(x, y);

      if (!isWalkableBiome(biome)) {
        continue;
      }

      if (biome === BIOME.GRASS || biome === BIOME.FOREST) {
        return { x: x + 0.5, y: y + 0.5 };
      }

      if (!fallback) {
        fallback = { x: x + 0.5, y: y + 0.5 };
      }
    }

    return fallback ?? { x: 0.5, y: 0.5 };
  }
}
