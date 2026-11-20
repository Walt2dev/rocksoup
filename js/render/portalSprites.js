const RESOLUTION = 2;

function createPortalSprite(kind) {
  const width = 92;
  const height = 118;
  const canvas = document.createElement("canvas");
  canvas.width = width * RESOLUTION;
  canvas.height = height * RESOLUTION;
  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = width / 2;
  const baseY = height - 6;

  ctx.beginPath();
  ctx.ellipse(cx, baseY, 24, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fill();

  if (kind === "stairs") {
    for (let step = 0; step < 5; step += 1) {
      const w = 44 - step * 5;
      const y = baseY - 8 - step * 13;
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, y);
      ctx.lineTo(cx + w / 2, y);
      ctx.lineTo(cx + w / 2 - 4, y - 12);
      ctx.lineTo(cx - w / 2 + 4, y - 12);
      ctx.closePath();
      ctx.fillStyle = step % 2 === 0 ? "#d8c46a" : "#f0d264";
      ctx.fill();
      ctx.strokeStyle = "rgba(70, 52, 12, 0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, baseY - 76, 18, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(240, 210, 100, 0.18)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 244, 180, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * 12, baseY - 76 + Math.sin(angle) * 12);
      ctx.lineTo(cx + Math.cos(angle) * 22, baseY - 76 + Math.sin(angle) * 22);
      ctx.strokeStyle = "rgba(255, 244, 180, 0.6)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    return {
      canvas,
      width,
      height,
      anchorX: cx,
      anchorY: baseY,
    };
  }

  ctx.beginPath();
  ctx.moveTo(cx - 26, baseY);
  ctx.lineTo(cx - 26, baseY - 56);
  ctx.quadraticCurveTo(cx, baseY - 96, cx + 26, baseY - 56);
  ctx.lineTo(cx + 26, baseY);
  ctx.closePath();
  ctx.fillStyle = "#2b2830";
  ctx.fill();
  ctx.strokeStyle = "#6d5a8a";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 18, baseY - 2);
  ctx.lineTo(cx - 18, baseY - 52);
  ctx.quadraticCurveTo(cx, baseY - 82, cx + 18, baseY - 52);
  ctx.lineTo(cx + 18, baseY - 2);
  ctx.closePath();
  ctx.fillStyle = "#563a78";
  ctx.fill();

  for (let index = 0; index < 6; index += 1) {
    const y = baseY - 12 - index * 10;
    ctx.beginPath();
    ctx.ellipse(cx, y, 13 - index, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = index % 2 === 0 ? "rgba(177, 132, 224, 0.42)" : "rgba(110, 80, 150, 0.35)";
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(cx, baseY - 42, 6, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(226, 198, 255, 0.8)";
  ctx.fill();

  return {
    canvas,
    width,
    height,
    anchorX: cx,
    anchorY: baseY,
  };
}

export function createPortalSprites() {
  return {
    cave: createPortalSprite("cave"),
    stairs: createPortalSprite("stairs"),
  };
}
