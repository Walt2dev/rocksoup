import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createGuestStore } from "../server/guestStore.mjs";

function fakePayPal() {
  let captured = false;
  return {
    configured: true,
    money: (cents) => (cents / 100).toFixed(2),
    async createOrder() {
      return { id: "ORDER-TEST-1", status: "CREATED" };
    },
    async captureOrder() {
      captured = true;
      return {
        id: "ORDER-TEST-1",
        status: "COMPLETED",
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  status: "COMPLETED",
                  amount: { value: "5.00", currency_code: "MXN" },
                },
              ],
            },
          },
        ],
      };
    },
    async getOrder() {
      return captured ? { status: "COMPLETED" } : { status: "CREATED" };
    },
  };
}

test("el invitado puede crear, pagar y reclamar una compra de 5 MXN", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rocksoup-guest-"));
  try {
    const store = createGuestStore({
      dataDir: dir,
      paypal: fakePayPal(),
      logger: { warn() {} },
    });
    const guestId = "guest-test-1234";

    const order = await store.createOrder(guestId, "energy_small");
    assert.equal(order.orderId, "ORDER-TEST-1");
    assert.equal(order.product.priceCents, 500);

    const captured = await store.captureOrder(guestId, order.orderId);
    assert.equal(captured.ok, true);
    assert.equal(captured.grants.energy, 25);
    assert.equal(captured.amountCents, 500);

    const pending = await store.pendingGrants(guestId);
    assert.equal(pending.grants.energy, 25);

    await store.acknowledgeGrants(guestId, pending.grants);
    const after = await store.pendingGrants(guestId);
    assert.deepEqual(after.grants, {});
    assert.equal(after.purchases.length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
