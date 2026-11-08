export const DONKEY_TRUST_REQUIRED = 3;

export function feedDonkey(ambient, amount = 1) {
  if (!ambient || typeof ambient !== "object") {
    return { trust: 0, tamed: false, tamedNow: false };
  }

  const wasTamed = ambient.tamed === true;
  const trust = Math.min(
    DONKEY_TRUST_REQUIRED,
    Math.max(0, Math.floor(Number.isFinite(ambient.trust) ? ambient.trust : 0)) +
      Math.max(0, Math.floor(amount)),
  );
  ambient.trust = trust;
  if (trust >= DONKEY_TRUST_REQUIRED) {
    ambient.tamed = true;
  }

  return {
    trust,
    tamed: ambient.tamed === true,
    tamedNow: !wasTamed && ambient.tamed === true,
  };
}
