export class Effects {
  constructor() {
    this.texts = [];
  }

  addText(text, x, y, { color = "#f0c07a", duration = 1.35, rise = 34 } = {}) {
    this.texts.push({
      text,
      x,
      y,
      color,
      duration,
      rise,
      age: 0,
    });
  }

  update(deltaSeconds) {
    for (const text of this.texts) {
      text.age += deltaSeconds;
    }
    this.texts = this.texts.filter((text) => text.age < text.duration);
  }

  draw(ctx, camera, getHeight = null) {
    if (this.texts.length === 0) {
      return;
    }

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "600 12px Consolas, monospace";

    for (const text of this.texts) {
      const progress = text.age / text.duration;
      const z = getHeight ? getHeight(text.x, text.y) * 0.72 : 0;
      const screen = camera.project(text.x, text.y, z);
      const y = screen.y - 28 - progress * text.rise;

      ctx.globalAlpha = Math.max(0, 1 - progress);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(8, 12, 16, 0.8)";
      ctx.strokeText(text.text, screen.x, y);
      ctx.fillStyle = text.color;
      ctx.fillText(text.text, screen.x, y);
    }

    ctx.restore();
  }

  clear() {
    this.texts = [];
  }
}
