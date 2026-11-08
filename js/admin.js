const TOKEN_KEY = "rocksoup-admin-token";
const POLL_MS = 2000;

const el = {
  login: document.getElementById("admin-login"),
  loginForm: document.getElementById("admin-login-form"),
  token: document.getElementById("admin-token"),
  loginStatus: document.getElementById("admin-login-status"),
  dashboard: document.getElementById("admin-dashboard"),
  status: document.getElementById("admin-status"),
  updated: document.getElementById("admin-updated"),
  logout: document.getElementById("admin-logout"),
  playerCount: document.getElementById("admin-player-count"),
  started: document.getElementById("admin-started"),
  event: document.getElementById("admin-event"),
  host: document.getElementById("admin-host"),
  players: document.getElementById("admin-players"),
  rankingPoints: document.getElementById("admin-ranking-points"),
  rankingBest: document.getElementById("admin-ranking-best"),
};

let token = sessionStorage.getItem(TOKEN_KEY) ?? "";
let timer = null;
let fetching = false;

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

function formatEvent(event) {
  if (!event) {
    return "Sin datos";
  }
  if (event.phase === "active") {
    return `Activo · ${formatDuration(event.remainingMs)}`;
  }
  if (Number.isFinite(event.startsInMs)) {
    return `Próximo en ${formatDuration(event.startsInMs)}`;
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
  el.started.textContent = data.started ? "En curso" : "Lobby";
  el.event.textContent = formatEvent(data.event);
  el.host.textContent = hostName;

  renderTable(
    el.players,
    [
      { label: "Jugador", value: (row) => row.name },
      { label: "Salud", value: (row) => `${Math.round(row.health)}` },
      {
        label: "Posición",
        value: (row) =>
          `${Number(row.x).toFixed(1)}, ${Number(row.y).toFixed(1)}`,
      },
      { label: "Conectado", value: (row) => formatDuration(row.connectedForMs) },
      { label: "Último estado", value: (row) => formatAge(row.lastStateAgeMs) },
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
    "Todavía no hay puntuaciones.",
  );
}

function render(data) {
  renderPlayers(data);

  const leaderboard = data.leaderboard ?? {};
  renderRanking(el.rankingPoints, leaderboard.points ?? [], "points");
  renderRanking(el.rankingBest, leaderboard.best ?? [], "best");

  setStatus(
    `Actualizado · ranking en ${data.rankingSource === "mysql" ? "MySQL" : "JSON"}`,
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
      showLogin("Token incorrecto.");
      return;
    }

    if (response.status === 404) {
      showLogin("El servidor no tiene ADMIN_TOKEN configurado.");
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
    setStatus("Sin conexión con el servidor.", true);
  } finally {
    fetching = false;
  }
}

function startPolling() {
  stopPolling();
  timer = window.setInterval(() => {
    if (!document.hidden) {
      void fetchAdmin();
    }
  }, POLL_MS);
}

function stopPolling() {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
}

el.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = el.token.value.trim();

  if (value.length === 0) {
    showLogin("Escribe el token de administración.");
    return;
  }

  token = value;
  sessionStorage.setItem(TOKEN_KEY, token);
  showDashboard();
  void fetchAdmin();
});

el.logout.addEventListener("click", () => {
  token = "";
  sessionStorage.removeItem(TOKEN_KEY);
  el.token.value = "";
  showLogin("Token eliminado. Introduce otro para continuar.");
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && token && !el.dashboard.hidden) {
    void fetchAdmin();
  }
});

if (token) {
  showDashboard();
  void fetchAdmin();
} else {
  showLogin();
}
