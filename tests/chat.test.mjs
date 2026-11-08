import test from "node:test";
import assert from "node:assert/strict";

import {
  CHAT_CONFIG,
  ChatHistory,
  ChatLimiter,
  sanitizeChatText,
} from "../server/chat.mjs";

test("el chat limpia caracteres de control y limita la longitud", () => {
  assert.equal(sanitizeChatText(null), "");
  assert.equal(sanitizeChatText(42), "");
  assert.equal(sanitizeChatText("  hola   mundo  "), "hola mundo");
  assert.equal(sanitizeChatText("hola\u0000\nmundo\t!"), "hola mundo !");
  assert.equal(sanitizeChatText("a".repeat(500)).length, CHAT_CONFIG.maxLength);
  assert.equal(sanitizeChatText("abcdef", 3), "abc");
});

test("el limitador respeta el intervalo mínimo", () => {
  const limiter = new ChatLimiter({
    ...CHAT_CONFIG,
    minIntervalMs: 1200,
    burstWindowMs: 10000,
    maxBurst: 99,
  });

  assert.equal(limiter.allow(0), true);
  assert.equal(limiter.allow(500), false);
  assert.equal(limiter.allow(1200), true);
});

test("el limitador corta las ráfagas", () => {
  const limiter = new ChatLimiter({
    ...CHAT_CONFIG,
    minIntervalMs: 0,
    burstWindowMs: 10000,
    maxBurst: 3,
  });

  assert.equal(limiter.allow(0), true);
  assert.equal(limiter.allow(1), true);
  assert.equal(limiter.allow(2), true);
  assert.equal(limiter.allow(3), false);
  assert.equal(limiter.allow(12000), true);
});

test("el historial conserva solo los últimos mensajes", () => {
  const history = new ChatHistory(3);

  history.push({ text: "uno" });
  history.push({ text: "dos" });
  history.push({ text: "tres" });
  history.push({ text: "cuatro" });

  assert.deepEqual(
    history.snapshot().map((entry) => entry.text),
    ["dos", "tres", "cuatro"],
  );

  const snapshot = history.snapshot();
  snapshot[0].text = "mutado";
  assert.equal(history.snapshot()[0].text, "dos");
});
