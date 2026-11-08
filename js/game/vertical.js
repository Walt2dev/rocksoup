export const FALL_SAFE_BLOCKS = 4;
export const FALL_DAMAGE_PER_BLOCK = 8;
export const FALL_DAMAGE_MAX = 60;
export const JUMP_SPEED = 9;
export const GRAVITY = 20;

export function fallDamage(distance) {
  if (!Number.isFinite(distance) || distance <= FALL_SAFE_BLOCKS) {
    return 0;
  }

  return Math.min(
    FALL_DAMAGE_MAX,
    Math.floor(distance - FALL_SAFE_BLOCKS) * FALL_DAMAGE_PER_BLOCK,
  );
}

export function jumpApexHeight(speed = JUMP_SPEED, gravity = GRAVITY) {
  if (!Number.isFinite(speed) || !Number.isFinite(gravity) || gravity <= 0) {
    return 0;
  }
  return (speed * speed) / (2 * gravity);
}
