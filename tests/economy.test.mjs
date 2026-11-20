import assert from "node:assert/strict";
import test from "node:test";

import {
  ECONOMY_PRODUCTS,
  ECONOMY_REWARDS,
  STARTING_WALLET,
  createLocalEconomy,
  economyProductGrants,
  getEconomyProduct,
  rewardFor,
} from "../js/game/economy.js";

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

test("el catálogo de economía usa DracCoins o Prestigio", () => {
  assert.ok(ECONOMY_PRODUCTS.length >= 20);
  for (const product of ECONOMY_PRODUCTS) {
    assert.ok(product.price.amount > 0);
    assert.ok(["drac", "prestige"].includes(product.price.currency));
    assert.ok(product.name && product.description);
  }
  assert.equal(getEconomyProduct("world_slot").price.amount, 2500);
  assert.equal(getEconomyProduct("title_dragon").price.currency, "prestige");
});

test("las recompensas definen monedas y topes", () => {
  assert.equal(rewardFor("village_allied").drac, 120);
  assert.equal(rewardFor("wolf_cave").essence, 5);
  assert.equal(rewardFor("pvp_kill").dailyCap, 60);
  assert.ok(ECONOMY_REWARDS.daily_objective.daily);
});

test("la cartera local empieza con el saldo inicial y deduplica misiones", () => {
  const economy = createLocalEconomy(memoryStorage());
  assert.deepEqual(economy.readWallet(), STARTING_WALLET);

  const first = economy.award("wolf_cave", { refId: "cave" });
  assert.equal(first.awarded, true);
  assert.equal(first.wallet.dracCoins, STARTING_WALLET.dracCoins + 250);
  assert.equal(first.wallet.prestige, 60);
  assert.equal(first.essences, 5);

  const duplicate = economy.award("wolf_cave", { refId: "cave" });
  assert.equal(duplicate.awarded, false);
  assert.equal(duplicate.reason, "claimed");
});

test("la cartera local respeta topes diarios", () => {
  const economy = createLocalEconomy(memoryStorage());
  let total = 0;
  for (let index = 0; index < 300; index += 1) {
    const result = economy.award("craft_repeat", {
      refId: `craft:${index}`,
    });
    if (result.awarded) {
      total += result.dracCoins;
    }
  }
  assert.equal(total, 200);
});

test("comprar resta saldo y bloquea lo que requiere cuenta", () => {
  const economy = createLocalEconomy(memoryStorage());
  economy.writeWallet({ dracCoins: 1000, prestige: 0 });

  const stone = economy.purchase("coal_small");
  assert.equal(stone.ok, true);
  assert.equal(stone.wallet.dracCoins, 850);
  assert.deepEqual(economyProductGrants(getEconomyProduct("coal_small")), {
    resources: { C: 20 },
  });

  const slot = economy.purchase("world_slot");
  assert.equal(slot.ok, false);
  assert.equal(slot.reason, "account_required");

  const contract = economy.purchase("contract_noble");
  assert.equal(contract.ok, false);
  assert.equal(contract.reason, "account_required");
});

test("comprar sin saldo no modifica la cartera", () => {
  const economy = createLocalEconomy(memoryStorage());
  economy.writeWallet({ dracCoins: 50, prestige: 0 });
  const result = economy.purchase("energy_full");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "insufficient_funds");
  assert.equal(economy.readWallet().dracCoins, 50);
});

test("el objetivo diario se reclama una vez al día", () => {
  const economy = createLocalEconomy(memoryStorage());
  const first = economy.claimDaily();
  assert.equal(first.awarded, true);
  assert.equal(first.wallet.prestige, 10);
  const second = economy.claimDaily();
  assert.equal(second.awarded, false);
});
