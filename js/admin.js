import { initWoodsAdmin } from "./adminWoods.js";

const TOKEN_KEY = "rocksoup-admin-token";
const RANGE_KEY = "rocksoup-admin-range";
const TAB_KEY = "rocksoup-admin-tab";
const POLL_MS = 2000;
const STATS_POLL_MS = 15000;

const el = {
  login: document.getElementById("admin-login"),
  loginForm: document.getElementById("admin-login-form"),
  token: document.getElementById("admin-token"),
  loginStatus: document.getElementById("admin-login-status"),
  dashboard: document.getElementById("admin-dashboard"),
  status: document.getElementById("admin-status"),
  updated: document.getElementById("admin-updated"),
  logout: document.getElementById("admin-logout"),
  tabs: document.getElementById("admin-tabs"),
  range: document.getElementById("admin-range"),
  online: document.getElementById("admin-online"),
  uniqueToday: document.getElementById("admin-unique-today"),
  avgToday: document.getElementById("admin-avg-today"),
  purchasesToday: document.getElementById("admin-purchases-today"),
  revenueToday: document.getElementById("admin-revenue-today"),
  playerCount: document.getElementById("admin-player-count"),
  started: document.getElementById("admin-started"),
  event: document.getElementById("admin-event"),
  host: document.getElementById("admin-host"),
  players: document.getElementById("admin-players"),
  activity: document.getElementById("admin-activity"),
  topPlayers: document.getElementById("admin-top-players"),
  purchases: document.getElementById("admin-purchases"),
  purchaseTotals: document.getElementById("admin-purchase-totals"),
  subscriptions: document.getElementById("admin-subscriptions"),
  ranking: document.getElementById("admin-ranking"),
  clans: document.getElementById("admin-clans"),
  rankingPoints: document.getElementById("admin-ranking-points"),
  rankingBest: document.getElementById("admin-ranking-best"),
  worldDownload: document.getElementById("admin-world-download"),
  worldFile: document.getElementById("admin-world-file"),
  worldStatus: document.getElementById("admin-world-status"),
};

let token = sessionStorage.getItem(TOKEN_KEY) ?? "";
let activeTab = sessionStorage.getItem(TAB_KEY) || "resumen";
let rangeDays = Number(sessionStorage.getItem(RANGE_KEY)) || 7;
if (![7, 30, 90].includes(rangeDays)) {
  rangeDays = 7;
}
if (el.range) {
  el.range.value = String(rangeDays);
}
let timer = null;
let statsTimer = null;
let fetching = false;
let fetchingStats = false;
const woodsAdmin = initWoodsAdmin({ getToken: () => token });

function formatDuration(ms) {
  const total = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatAge(ms) {
  if (!Number.isFinite(ms)) {
    return "-";
  }
  if (ms < 1500) {
    return "ahora";
  }
  return `hace ${formatDuration(ms)}`;
}

function formatMoney(cents, currency = "MXN") {
  const value = (Number(cents) || 0) / 100;
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)} ${currency}`;
  }
}

function formatEconomyAmount(amount, currency = "drac") {
  const labels = { drac: "DracCoins", prestige: "Prestigio", essence: "Esencias" };
  const value = Number(amount) || 0;
  return `${value.toLocaleString("es-MX")} ${labels[currency] ?? currency}`;
}

function formatDateTime(timestamp) {
  if (!timestamp) {
    return "-";
  }
  return new Date(timestamp).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function todayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatEvent(event) {
  if (!event) {
    return "Sin datos";
  }
  if (event.phase === "active") {
    return `Activo Â· ${formatDuration(event.remainingMs)}`;
  }
  if (Number.isFinite(event.startsInMs)) {
    return `PrÃ³ximo en ${formatDuration(event.startsInMs)}`;
  }
  return "Inactivo";
}

function setStatus(message, isError = false) {
  if (!el.status) {
    return;
  }
  el.status.textContent = message;
  el.status.classList.toggle("is-error", isError);
}

function showLogin(message = "") {
  stopPolling();
  el.dashboard.hidden = true;
  el.login.hidden = false;
  el.loginStatus.textContent = message;
  el.loginStatus.classList.toggle("is-error", message.length > 0);
  el.token.focus();
}

function showDashboard() {
  el.login.hidden = true;
  el.dashboard.hidden = false;
  startPolling();
}

function renderTable(container, columns, rows, emptyText) {
  container.replaceChildren();

  if (!Array.isArray(rows) || rows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "admin-empty";
    empty.textContent = emptyText;
    container.append(empty);
    return;
  }

  const table = document.createElement("table");
  table.className = "admin-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const column of columns) {
    const th = document.createElement("th");
    th.textContent = column.label;
    headRow.append(th);
  }
  thead.append(headRow);

  const tbody = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    if (row.isSelf) {
      tr.className = "is-self";
    }
    for (const column of columns) {
      const td = document.createElement("td");
      td.textContent = String(column.value(row) ?? "");
      tr.append(td);
    }
    tbody.append(tr);
  }

  table.append(thead, tbody);
  container.append(table);
}

function renderPlayers(data) {
  const players = Array.isArray(data.players) ? data.players : [];
  const hostName =
    players.find((player) => player.id === data.hostId)?.name ?? "-";

  el.playerCount.textContent = String(players.length);
  el.online.textContent = String(players.length);
  el.started.textContent = data.started ? "En curso" : "Lobby";
  el.event.textContent = formatEvent(data.event);
  el.host.textContent = hostName;

  renderTable(
    el.players,
    [
      { label: "Jugador", value: (row) => row.name },
      { label: "Salud", value: (row) => `${Math.round(row.health)}` },
      {
        label: "PosiciÃ³n",
        value: (row) =>
          `${Number(row.x).toFixed(1)}, ${Number(row.y).toFixed(1)}`,
      },
      { label: "Conectado", value: (row) => formatDuration(row.connectedForMs) },
      { label: "Ãšltimo estado", value: (row) => formatAge(row.lastStateAgeMs) },
      { label: "Duendes", value: (row) => row.workers },
      { label: "Puntos evento", value: (row) => row.eventScore },
      { label: "Kills evento", value: (row) => row.eventKills },
    ],
    players,
    "No hay jugadores conectados.",
  );
}

function renderRanking(container, rows, sort) {
  renderTable(
    container,
    [
      { label: "#", value: (row) => row.__rank },
      { label: "Jugador", value: (row) => row.name },
      {
        label: sort === "best" ? "Mejor evento" : "Puntos",
        value: (row) => (sort === "best" ? row.bestEventScore : row.points),
      },
      { label: "Kills", value: (row) => row.kills },
      { label: "Muertes", value: (row) => row.deaths },
      { label: "Mejor racha", value: (row) => row.bestStreak },
      { label: "Victorias", value: (row) => row.eventsWon },
    ],
    rows.map((row, index) => ({ ...row, __rank: index + 1 })),
    "TodavÃ­a no hay puntuaciones.",
  );
}

function renderStats(data) {
  const play = data?.play ?? {};
  const byDay = Array.isArray(play.byDay) ? play.byDay : [];
  const today = byDay.find((entry) => entry.date === todayKey());
  const purchasesToday = data?.purchases?.today ?? {};

  el.online.textContent = String(Array.isArray(data?.online) ? data.online.length : 0);
  el.uniqueToday.textContent = today ? String(today.uniquePlayers) : "0";
  el.avgToday.textContent = today ? formatDuration(today.avgMs) : "-";
  el.purchasesToday.textContent = String(purchasesToday.count ?? 0);
  el.revenueToday.textContent = formatEconomyAmount(purchasesToday.totalCents ?? 0);

  renderTable(
    el.activity,
    [
      { label: "Fecha", value: (row) => row.date },
      { label: "Sesiones", value: (row) => row.sessions },
      { label: "Ãšnicos", value: (row) => row.uniquePlayers },
      { label: "Tiempo total", value: (row) => formatDuration(row.totalMs) },
      { label: "Tiempo medio", value: (row) => formatDuration(row.avgMs) },
    ],
    byDay,
    "Sin actividad en el rango.",
  );

  renderTable(
    el.topPlayers,
    [
      { label: "Jugador", value: (row) => row.name },
      { label: "Sesiones", value: (row) => row.sessions },
      { label: "Tiempo total", value: (row) => formatDuration(row.totalMs) },
    ],
    Array.isArray(play.topPlayers) ? play.topPlayers : [],
    "Sin sesiones registradas.",
  );

  renderTable(
    el.purchases,
    [
      { label: "Fecha", value: (row) => formatDateTime(row.createdAt) },
      {
        label: "Jugador",
        value: (row) => row.email || row.displayName || "â€”",
      },
      { label: "Producto", value: (row) => row.productName },
      { label: "Monto", value: (row) => formatEconomyAmount(row.amountCents, row.currency) },
      { label: "Estado", value: (row) => row.status },
      { label: "Entrega", value: (row) => row.grantStatus },
    ],
    Array.isArray(data?.purchases?.recent) ? data.purchases.recent : [],
    "Sin compras con DracCoins en el rango.",
  );

  const totals = Array.isArray(data?.purchases?.totals)
    ? data.purchases.totals
    : [];
  renderTable(
    el.purchaseTotals,
    [
      { label: "Moneda", value: (row) => row.currency },
      { label: "Estado", value: (row) => row.status },
      { label: "Compras", value: (row) => row.count },
      { label: "Total", value: (row) => formatEconomyAmount(row.totalCents, row.currency) },
    ],
    totals,
    "Sin totales en el rango.",
  );

  renderTable(
    el.subscriptions,
    [
      { label: "Plan", value: (row) => row.name },
      { label: "Estado", value: (row) => row.status },
      { label: "Cantidad", value: (row) => row.count },
    ],
    Array.isArray(data?.subscriptions) ? data.subscriptions : [],
    "Sin contratos.",
  );

  renderTable(
    el.ranking,
    [
      { label: "#", value: (row) => row.rank },
      { label: "Jugador", value: (row) => row.name },
      { label: "Puntos", value: (row) => row.points },
      { label: "Aldeas", value: (row) => row.villages },
      { label: "Unidades", value: (row) => row.units },
      { label: "Oleadas", value: (row) => row.waves },
    ],
    Array.isArray(data?.ranking) ? data.ranking : [],
    "Sin jugadores en el ranking de conquista.",
  );

  renderTable(
    el.clans,
    [
      { label: "Etiqueta", value: (row) => `[${row.tag}]` },
      { label: "Clan", value: (row) => row.name },
      { label: "Miembros", value: (row) => row.memberCount },
      { label: "Creado", value: (row) => formatDateTime(row.createdAt) },
    ],
    Array.isArray(data?.clans) ? data.clans : [],
    "Sin clanes todavía.",
  );
}

function render(data) {
  renderPlayers(data);

  const leaderboard = data.leaderboard ?? {};
  renderRanking(el.rankingPoints, leaderboard.points ?? [], "points");
  renderRanking(el.rankingBest, leaderboard.best ?? [], "best");

  setStatus(
    `Actualizado Â· ranking en ${data.rankingSource === "mysql" ? "MySQL" : "JSON"}`,
  );
  el.updated.textContent = new Date(data.now).toLocaleTimeString();
}

async function fetchAdmin() {
  if (fetching || !token) {
    return;
  }

  fetching = true;
  try {
    const response = await fetch("/api/admin/players", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (response.status === 401) {
      showLogin("Clave incorrecta.");
      return;
    }

    if (response.status === 404) {
      showLogin("El servidor no tiene clave de administraciÃ³n configurada.");
      return;
    }

    if (!response.ok) {
      setStatus(`Error del servidor (${response.status}).`, true);
      return;
    }

    const data = await response.json();
    showDashboard();
    render(data);
  } catch {
    setStatus("Sin conexiÃ³n con el servidor.", true);
  } finally {
    fetching = false;
  }
}

async function fetchStats() {
  if (fetchingStats || !token) {
    return;
  }

  fetchingStats = true;
  try {
    const response = await fetch(`/api/admin/stats?days=${rangeDays}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (response.status === 401) {
      showLogin("Clave incorrecta.");
      return;
    }

    if (response.status === 404) {
      showLogin("El servidor no tiene clave de administraciÃ³n configurada.");
      return;
    }

    if (!response.ok) {
      setStatus(`Error de estadÃ­sticas (${response.status}).`, true);
      return;
    }

    const data = await response.json();
    renderStats(data);
  } catch {
    setStatus("Sin conexiÃ³n con el servidor.", true);
  } finally {
    fetchingStats = false;
  }
}

function startPolling() {
  stopPolling();
  timer = window.setInterval(() => {
    if (!document.hidden) {
      void fetchAdmin();
    }
  }, POLL_MS);
  statsTimer = window.setInterval(() => {
    if (!document.hidden) {
      void fetchStats();
    }
  }, STATS_POLL_MS);
}

function stopPolling() {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
  if (statsTimer !== null) {
    window.clearInterval(statsTimer);
    statsTimer = null;
  }
}

el.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = el.token.value.trim();

  if (value.length === 0) {
    showLogin("Escribe el token de administraciÃ³n.");
    return;
  }

  token = value;
  sessionStorage.setItem(TOKEN_KEY, token);
  showDashboard();
  void fetchAdmin();
  void fetchStats();
  void woodsAdmin.refresh();
});

el.range?.addEventListener("change", () => {
  const value = Number(el.range.value);
  rangeDays = [7, 30, 90].includes(value) ? value : 7;
  sessionStorage.setItem(RANGE_KEY, String(rangeDays));
  void fetchStats();
});

el.logout.addEventListener("click", () => {
  token = "";
  sessionStorage.removeItem(TOKEN_KEY);
  el.token.value = "";
  showLogin("Clave eliminada. Introduce otra para continuar.");
});

async function downloadWorld() {
  if (!token) {
    showLogin("Introduce la clave para descargar el mundo.");
    return;
  }

  el.worldStatus.textContent = "Descargando mundo...";

  try {
    const response = await fetch("/api/admin/world", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 404) {
      el.worldStatus.textContent = "No autorizado.";
      return;
    }
    if (!response.ok) {
      el.worldStatus.textContent = `Error al descargar (${response.status}).`;
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `rocksoup-world-${stamp}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    el.worldStatus.textContent = "Mundo descargado.";
  } catch {
    el.worldStatus.textContent = "Error de conexiÃ³n al descargar.";
  }
}

async function importWorld(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  if (!token) {
    showLogin("Introduce la clave para importar el mundo.");
    event.target.value = "";
    return;
  }

  el.worldStatus.textContent = "Importando mundo...";

  try {
    const text = await file.text();
    const response = await fetch("/api/admin/world", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: text,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      el.worldStatus.textContent = data.error ?? "No se pudo importar.";
      return;
    }

    el.worldStatus.textContent = `Mundo importado (${data.worldId ?? "main"}). Reinicia la app para aplicarlo.`;
  } catch {
    el.worldStatus.textContent = "Error de conexiÃ³n al importar.";
  } finally {
    event.target.value = "";
  }
}

el.worldDownload?.addEventListener("click", downloadWorld);
el.worldFile?.addEventListener("change", importWorld);

function setAdminTab(tab) {
  const buttons = el.tabs?.querySelectorAll("[data-admin-tab]") ?? [];
  let valid = false;
  for (const button of buttons) {
    if (button.dataset.adminTab === tab) {
      valid = true;
    }
  }
  if (!valid) {
    tab = "resumen";
  }
  activeTab = tab;
  sessionStorage.setItem(TAB_KEY, tab);
  for (const button of buttons) {
    button.classList.toggle("is-active", button.dataset.adminTab === tab);
  }
  for (const panel of document.querySelectorAll("[data-tab-panel]")) {
    panel.hidden = panel.dataset.tabPanel !== tab;
  }
}

el.tabs?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-admin-tab]");
  if (!button) {
    return;
  }
  setAdminTab(button.dataset.adminTab);
});

setAdminTab(activeTab);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && token && !el.dashboard.hidden) {
    void fetchAdmin();
    void fetchStats();
  }
});

if (token) {
  showDashboard();
  void fetchAdmin();
  void fetchStats();
  void woodsAdmin.refresh();
} else {
  showLogin();
}
