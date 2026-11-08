import { LAN_TOKEN_KEY } from "../game/settings.js";
import { resolveWsUrl } from "./wsUrl.js";

function createToken() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().replaceAll("-", "");
  }
  return `lan${Date.now().toString(16)}${Math.floor(performance.now() * 1000).toString(16)}`;
}

function loadToken() {
  try {
    const stored = window.localStorage.getItem(LAN_TOKEN_KEY);
    if (stored && /^[a-zA-Z0-9_-]{8,80}$/.test(stored)) {
      return stored;
    }
  } catch {
    // Almacenamiento bloqueado.
  }

  const token = createToken();
  try {
    window.localStorage.setItem(LAN_TOKEN_KEY, token);
  } catch {
    // Almacenamiento bloqueado.
  }
  return token;
}

function serverUrl() {
  const override = new URLSearchParams(window.location.search).get("ws");

  return resolveWsUrl({
    protocol: window.location.protocol,
    host: window.location.host,
    hostname: window.location.hostname,
    port: window.location.port,
    override,
  });
}

export class LanClient {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.ws = null;
    this.selfId = null;
    this.hostId = null;
    this.token = loadToken();
    this.connected = false;
    this.closing = false;
    this.name = "";
  }

  get url() {
    return serverUrl();
  }

  connect(name, skinId = "explorer") {
    if (this.ws) {
      return;
    }

    this.name = name;
    this.skinId = skinId;
    this.closing = false;
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.addEventListener("open", () => {
      this.connected = true;
      this.send({
        type: "join",
        token: this.token,
        name,
        skinId: this.skinId,
      });
    });

    ws.addEventListener("message", (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      this.handleMessage(message);
    });

    ws.addEventListener("close", (event) => {
      const url = this.url;
      this.connected = false;
      this.ws = null;
      if (!this.closing) {
        this.callbacks.onClose?.({
          url,
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
      }
    });

    ws.addEventListener("error", () => {
      this.callbacks.onError?.(
        `No se pudo conectar al servidor LAN (${this.url}).`,
      );
    });
  }

  handleMessage(message) {
    if (!message || typeof message.type !== "string") {
      return;
    }

    if (message.type === "welcome") {
      this.selfId = message.selfId;
      this.hostId = message.hostId;
      this.callbacks.onWelcome?.(message);
      return;
    }

    if (message.type === "lobby") {
      this.hostId = message.hostId;
      this.callbacks.onLobby?.(message);
      return;
    }

    if (message.type === "start") {
      this.selfId = message.selfId;
      this.hostId = message.hostId;
      this.callbacks.onStart?.(message);
      return;
    }

    if (message.type === "players") {
      this.hostId = message.hostId;
      this.callbacks.onPlayers?.(message);
      return;
    }

    if (message.type === "time") {
      this.callbacks.onTime?.(message);
      return;
    }

    if (message.type === "harvest") {
      this.callbacks.onHarvest?.(message);
      return;
    }

    if (message.type === "restore") {
      this.callbacks.onRestore?.(message);
      return;
    }

    if (message.type === "chat") {
      this.callbacks.onChat?.(message);
      return;
    }

    if (message.type === "leaderboard") {
      this.callbacks.onLeaderboard?.(message);
      return;
    }

    if (message.type === "event") {
      this.callbacks.onEvent?.(message.event);
      return;
    }

    if (message.type === "kill") {
      this.callbacks.onKill?.(message);
      return;
    }

    if (message.type === "plant") {
      this.callbacks.onPlant?.(message);
      return;
    }

    if (message.type === "farm") {
      this.callbacks.onFarm?.(message);
      return;
    }

    if (message.type === "height") {
      this.callbacks.onHeight?.(message);
      return;
    }

    if (message.type === "structure") {
      this.callbacks.onStructure?.(message);
      return;
    }

    if (message.type === "hit") {
      this.callbacks.onHit?.(message);
      return;
    }

    if (message.type === "respawn") {
      this.callbacks.onRespawn?.(message);
      return;
    }

    if (message.type === "ambient") {
      this.callbacks.onAmbient?.(message);
      return;
    }

    if (message.type === "ambientHit") {
      this.callbacks.onAmbientHit?.(message);
      return;
    }

    if (message.type === "ambientKilled") {
      this.callbacks.onAmbientKilled?.(message);
      return;
    }

    if (message.type === "error") {
      this.callbacks.onError?.(message.message || "Error del servidor LAN.");
    }
  }

  send(payload) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  startGame() {
    this.send({ type: "start" });
  }

  sendState(
    x,
    y,
    facing,
    workers = [],
    swimSeconds = 0,
    verticalOffset = 0,
    donkey = null,
  ) {
    this.send({
      type: "state",
      x,
      y,
      facing,
      workers,
      swimSeconds,
      verticalOffset,
      donkey,
    });
  }

  sendInventory(
    inventory,
    stones = [],
    fishingRecords = {},
    feathers = {},
    observatoryDiscoveries = [],
  ) {
    this.send({
      type: "inventory",
      inventory,
      stones,
      fishingRecords,
      feathers,
      observatoryDiscoveries,
    });
  }

  sendHarvest(kind, x, y) {
    this.send({ type: "harvest", kind, x, y });
  }

  sendRestore(x, y) {
    this.send({ type: "restore", x, y });
  }

  sendChat(text) {
    this.send({ type: "chat", text });
  }

  requestLeaderboard() {
    this.send({ type: "leaderboard" });
  }

  sendStructure(itemId, x, y, z = null) {
    this.send({ type: "structure", itemId, x, y, z });
  }

  sendPlant(kind, x, y, data) {
    this.send({ type: "plant", kind, x, y, data });
  }

  sendFarm(plot) {
    this.send({ type: "farm", plot });
  }

  sendHeight(x, y, height) {
    this.send({ type: "height", x, y, height });
  }

  sendAttack(weapon = "fist") {
    this.send({ type: "attack", weapon });
  }

  sendAmbientHit(id, damage) {
    this.send({ type: "ambientHit", id, damage });
  }

  close() {
    this.closing = true;
    this.connected = false;
    if (this.ws) {
      this.send({ type: "leave" });
      this.ws.close();
      this.ws = null;
    }
  }
}
