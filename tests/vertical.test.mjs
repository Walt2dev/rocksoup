import test from "node:test";
import assert from "node:assert/strict";

import {
  FALL_DAMAGE_MAX,
  FALL_SAFE_BLOCKS,
  JUMP_SPEED,
  GRAVITY,
  fallDamage,
  jumpApexHeight,
} from "../js/game/vertical.js";

test("el daño de caída empieza después de cuatro bloques", () => {
  assert.equal(FALL_SAFE_BLOCKS, 4);
  assert.equal(fallDamage(0), 0);
  assert.equal(fallDamage(4), 0);
  assert.equal(fallDamage(5), 8);
  assert.equal(fallDamage(8), 32);
  assert.equal(fallDamage(100), FALL_DAMAGE_MAX);
  assert.equal(fallDamage(Number.NaN), 0);
});

test("el salto alcanza unos dos bloques", () => {
  const apex = jumpApexHeight(JUMP_SPEED, GRAVITY);
  assert.ok(apex > 1.9 && apex < 2.2);
});
