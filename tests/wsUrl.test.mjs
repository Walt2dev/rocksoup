import test from "node:test";
import assert from "node:assert/strict";

import { isPrivateHostname, resolveWsUrl } from "../js/net/wsUrl.js";

test("el override ?ws= tiene prioridad", () => {
  assert.equal(
    resolveWsUrl({
      protocol: "https:",
      host: "rocksoup.xyz",
      hostname: "rocksoup.xyz",
      port: "",
      override: "ws.example.com:8080",
    }),
    "wss://ws.example.com:8080/ws",
  );
  assert.equal(
    resolveWsUrl({
      protocol: "http:",
      host: "localhost",
      hostname: "localhost",
      port: "80",
      override: "localhost:3000",
    }),
    "ws://localhost:3000/ws",
  );
});

test("un override inválido se ignora", () => {
  assert.equal(
    resolveWsUrl({
      protocol: "https:",
      host: "rocksoup.xyz",
      hostname: "rocksoup.xyz",
      port: "",
      override: "https://malo/ws",
    }),
    "wss://rocksoup.xyz/ws",
  );
});

test("localhost y redes privadas en puerto 80 usan el 3000 de Node", () => {
  for (const hostname of ["localhost", "127.0.0.1", "192.168.1.10", "10.0.0.5", "172.16.4.2"]) {
    assert.equal(
      resolveWsUrl({
        protocol: "http:",
        host: hostname,
        hostname,
        port: "80",
      }),
      `ws://${hostname}:3000/ws`,
    );
  }
});

test("un dominio público en 80/443 usa el mismo origen", () => {
  assert.equal(
    resolveWsUrl({
      protocol: "https:",
      host: "rocksoup.xyz",
      hostname: "rocksoup.xyz",
      port: "",
    }),
    "wss://rocksoup.xyz/ws",
  );
  assert.equal(
    resolveWsUrl({
      protocol: "http:",
      host: "rocksoup.xyz",
      hostname: "rocksoup.xyz",
      port: "80",
    }),
    "ws://rocksoup.xyz/ws",
  );
});

test("un puerto no estándar usa el mismo origen", () => {
  assert.equal(
    resolveWsUrl({
      protocol: "http:",
      host: "localhost:3000",
      hostname: "localhost",
      port: "3000",
    }),
    "ws://localhost:3000/ws",
  );
  assert.equal(
    resolveWsUrl({
      protocol: "https:",
      host: "192.168.1.10:8443",
      hostname: "192.168.1.10",
      port: "8443",
    }),
    "wss://192.168.1.10:8443/ws",
  );
});

test("isPrivateHostname reconoce localhost y rangos privados", () => {
  assert.equal(isPrivateHostname("localhost"), true);
  assert.equal(isPrivateHostname("::1"), true);
  assert.equal(isPrivateHostname("rocksoup.local"), true);
  assert.equal(isPrivateHostname("192.168.0.2"), true);
  assert.equal(isPrivateHostname("172.31.255.1"), true);
  assert.equal(isPrivateHostname("rocksoup.xyz"), false);
  assert.equal(isPrivateHostname("8.8.8.8"), false);
});
