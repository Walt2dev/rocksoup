import { DEFAULT_ISO } from "../core/iso.js";
import { CAMERA } from "../world/params.js";

export class Camera {
  constructor({
    x = 0,
    y = 0,
    zoom = CAMERA.initialZoom,
    width = 1,
    height = 1,
    tileW = DEFAULT_ISO.tileW,
    tileH = DEFAULT_ISO.tileH,
    minZoom = CAMERA.minZoom,
    maxZoom = CAMERA.maxZoom,
    rotation = 0,
    z = 0,
  } = {}) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.rotation = ((rotation % 4) + 4) % 4;
    this.viewRotation = this.rotation;
    this.viewCos = 1;
    this.viewSin = 0;
    this.syncViewRotation();
    this.width = width;
    this.height = height;
    this.tileW = tileW;
    this.tileH = tileH;
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.zoom = this.clampZoom(zoom);
  }

  syncViewRotation() {
    const angle = (this.viewRotation * Math.PI) / 2;
    this.viewCos = Math.cos(angle);
    this.viewSin = Math.sin(angle);
  }

  rotate(delta) {
    this.rotation = ((this.rotation + delta) % 4 + 4) % 4;
    this.viewRotation = this.rotation;
    this.syncViewRotation();
    return this.rotation;
  }

  rotateSmooth(delta) {
    this.rotation = ((this.rotation + delta) % 4 + 4) % 4;
    return this.rotation;
  }

  rotateLeft() {
    return this.rotate(-1);
  }

  rotateRight() {
    return this.rotate(1);
  }

  update(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return this.viewRotation;
    }

    let difference = (this.rotation - this.viewRotation) % 4;
    if (difference > 2) difference -= 4;
    if (difference < -2) difference += 4;

    if (Math.abs(difference) < 0.001) {
      this.viewRotation = this.rotation;
      this.syncViewRotation();
      return this.viewRotation;
    }

    const easing = 1 - Math.exp(-14 * Math.min(0.05, deltaSeconds));
    this.viewRotation += difference * easing;
    this.syncViewRotation();
    return this.viewRotation;
  }

  rotateWorld(dx, dy) {
    return {
      x: dx * this.viewCos + dy * this.viewSin,
      y: -dx * this.viewSin + dy * this.viewCos,
    };
  }

  unrotateWorld(dx, dy) {
    return {
      x: dx * this.viewCos - dy * this.viewSin,
      y: dx * this.viewSin + dy * this.viewCos,
    };
  }

  depthAt(x, y) {
    const view = this.rotateWorld(x, y);
    return view.x + view.y;
  }

  clampZoom(zoom) {
    return Math.min(this.maxZoom, Math.max(this.minZoom, zoom));
  }

  resize(width, height) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
  }

  centerOn(x, y) {
    this.x = x;
    this.y = y;
  }

  project(x, y, z = 0) {
    const halfW = (this.tileW / 2) * this.zoom;
    const halfH = (this.tileH / 2) * this.zoom;
    const view = this.rotateWorld(x - this.x, y - this.y);

    return {
      x: this.width / 2 + (view.x - view.y) * halfW,
      y:
        this.height / 2 +
        (view.x + view.y) * halfH -
        (z - this.z) * halfH,
    };
  }

  unproject(screenX, screenY) {
    const halfW = (this.tileW / 2) * this.zoom;
    const halfH = (this.tileH / 2) * this.zoom;
    const viewX = (screenX - this.width / 2) / halfW;
    const viewY = (screenY - this.height / 2) / halfH;
    const rotatedX = (viewX + viewY) / 2;
    const rotatedY = (viewY - viewX) / 2;
    const world = this.unrotateWorld(rotatedX, rotatedY);

    return {
      x: this.x + world.x,
      y: this.y + world.y,
    };
  }

  movementToWorld(screenX, screenY) {
    const halfW = (this.tileW / 2) * this.zoom;
    const halfH = (this.tileH / 2) * this.zoom;
    const viewX = (screenX / halfW + screenY / halfH) / 2;
    const viewY = (screenY / halfH - screenX / halfW) / 2;
    return this.unrotateWorld(viewX, viewY);
  }

  panScreen(deltaX, deltaY) {
    const halfW = (this.tileW / 2) * this.zoom;
    const halfH = (this.tileH / 2) * this.zoom;
    const viewX = (deltaX / halfW + deltaY / halfH) / 2;
    const viewY = (deltaY / halfH - deltaX / halfW) / 2;
    const world = this.unrotateWorld(viewX, viewY);

    this.x -= world.x;
    this.y -= world.y;
  }

  zoomAt(screenX, screenY, factor) {
    if (!Number.isFinite(factor) || factor <= 0) {
      return false;
    }

    const before = this.unproject(screenX, screenY);
    const nextZoom = this.clampZoom(this.zoom * factor);

    if (nextZoom === this.zoom) {
      return false;
    }

    this.zoom = nextZoom;
    const after = this.unproject(screenX, screenY);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
    return true;
  }

  visibleBounds(padding = 0) {
    const corners = [
      this.unproject(0, 0),
      this.unproject(this.width, 0),
      this.unproject(0, this.height),
      this.unproject(this.width, this.height),
    ];

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const corner of corners) {
      minX = Math.min(minX, corner.x);
      minY = Math.min(minY, corner.y);
      maxX = Math.max(maxX, corner.x);
      maxY = Math.max(maxY, corner.y);
    }

    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
    };
  }
}
