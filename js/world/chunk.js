export function chunkKey(cx, cy) {
  return `${cx},${cy}`;
}

export class Chunk {
  constructor(cx, cy, size) {
    this.cx = cx;
    this.cy = cy;
    this.size = size;
    this.elevation = new Float32Array(size * size);
    this.moisture = new Float32Array(size * size);
    this.biome = new Uint8Array(size * size);
    this.shade = new Uint8Array(size * size);
    this.mineral = new Uint8Array(size * size);
    this.tree = new Uint8Array(size * size);
    this.bush = new Uint8Array(size * size);
    this.grass = new Uint8Array(size * size);
    this.trees = [];
    this.minerals = [];
    this.bushes = [];
    this.grassTufts = [];
    this.stumps = [];
    this.rubble = [];
    this.pickedBushes = [];
    this.cutGrass = [];
  }

  index(localX, localY) {
    return localY * this.size + localX;
  }

  contains(localX, localY) {
    return localX >= 0 && localY >= 0 && localX < this.size && localY < this.size;
  }

  tileData(localX, localY) {
    const index = this.index(localX, localY);
    return {
      localX,
      localY,
      elevation: this.elevation[index],
      moisture: this.moisture[index],
      biome: this.biome[index],
      shade: this.shade[index],
      mineral: this.mineral[index],
    };
  }
}
