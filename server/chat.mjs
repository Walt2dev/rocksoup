export const CHAT_CONFIG = Object.freeze({
  maxLength: 180,
  minIntervalMs: 1200,
  burstWindowMs: 10000,
  maxBurst: 4,
  historyLimit: 40,
});

export function sanitizeChatText(value, maxLength = CHAT_CONFIG.maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.slice(0, Math.max(0, maxLength));
}

export class ChatLimiter {
  constructor(config = CHAT_CONFIG) {
    this.config = config;
    this.lastAt = Number.NEGATIVE_INFINITY;
    this.times = [];
  }

  allow(now = Date.now()) {
    if (now - this.lastAt < this.config.minIntervalMs) {
      return false;
    }

    const windowStart = now - this.config.burstWindowMs;
    this.times = this.times.filter((at) => at > windowStart);

    if (this.times.length >= this.config.maxBurst) {
      return false;
    }

    this.lastAt = now;
    this.times.push(now);
    return true;
  }
}

export class ChatHistory {
  constructor(limit = CHAT_CONFIG.historyLimit) {
    this.limit = Math.max(1, Math.floor(limit));
    this.items = [];
  }

  push(message) {
    if (!message || typeof message !== "object") {
      return;
    }
    this.items.push(message);
    if (this.items.length > this.limit) {
      this.items.splice(0, this.items.length - this.limit);
    }
  }

  snapshot() {
    return this.items.map((message) => ({ ...message }));
  }
}
