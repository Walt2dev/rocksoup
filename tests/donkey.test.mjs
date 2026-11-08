import test from "node:test";
import assert from "node:assert/strict";

import { DONKEY_TRUST_REQUIRED, feedDonkey } from "../js/game/donkey.js";

test("el burro se domestica tras tres alimentos", () => {
  const donkey = { trust: 0, tamed: false };

  assert.deepEqual(feedDonkey(donkey), {
    trust: 1,
    tamed: false,
    tamedNow: false,
  });
  assert.equal(feedDonkey(donkey).trust, 2);
  const final = feedDonkey(donkey);
  assert.equal(final.trust, DONKEY_TRUST_REQUIRED);
  assert.equal(final.tamed, true);
  assert.equal(final.tamedNow, true);
  assert.equal(feedDonkey(donkey).tamedNow, false);
});
