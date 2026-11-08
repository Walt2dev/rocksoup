const MAX_CHAT_NODES = 100;
const CHAT_MAX_LENGTH = 180;

function formatMs(value) {
  const total = Math.max(0, Math.ceil((Number.isFinite(value) ? value : 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export class SocialUI {
  constructor({ lanClient = null, hud = {}, notify = () => {} } = {}) {
    this.lanClient = lanClient;
    this.hud = hud;
    this.notify = notify;
    this.enabled = false;
    this.chatOpen = false;
    this.rankingOpen = false;
    this.rankingSort = "points";
    this.leaderboard = [];
    this.event = null;
    this.unread = 0;
    this.attached = false;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleChatInputKeyDown = this.handleChatInputKeyDown.bind(this);
    this.handleRankingTabsClick = this.handleRankingTabsClick.bind(this);
    this.handleChatSubmit = this.handleChatSubmit.bind(this);
    this.toggleChat = this.toggleChat.bind(this);
    this.toggleRanking = this.toggleRanking.bind(this);
    this.closeChat = this.closeChat.bind(this);
    this.closeRanking = this.closeRanking.bind(this);
    this.sendChat = this.sendChat.bind(this);
  }

  setClient(lanClient) {
    this.lanClient = lanClient;
  }

  attach() {
    if (this.attached) {
      return;
    }
    this.attached = true;

    window.addEventListener("keydown", this.handleKeyDown);
    this.hud.btnChat?.addEventListener("click", this.toggleChat);
    this.hud.btnRanking?.addEventListener("click", this.toggleRanking);
    this.hud.btnChatClose?.addEventListener("click", this.closeChat);
    this.hud.btnRankingClose?.addEventListener("click", this.closeRanking);
    this.hud.chatSend?.addEventListener("click", this.sendChat);
    this.hud.chatForm?.addEventListener("submit", this.handleChatSubmit);
    this.hud.chatInput?.addEventListener("keydown", this.handleChatInputKeyDown);
    this.hud.rankingTabs?.addEventListener("click", this.handleRankingTabsClick);
    this.hud.chatInput?.setAttribute("maxlength", String(CHAT_MAX_LENGTH));
  }

  detach() {
    if (!this.attached) {
      return;
    }
    this.attached = false;

    window.removeEventListener("keydown", this.handleKeyDown);
    this.hud.btnChat?.removeEventListener("click", this.toggleChat);
    this.hud.btnRanking?.removeEventListener("click", this.toggleRanking);
    this.hud.btnChatClose?.removeEventListener("click", this.closeChat);
    this.hud.btnRankingClose?.removeEventListener("click", this.closeRanking);
    this.hud.chatSend?.removeEventListener("click", this.sendChat);
    this.hud.chatForm?.removeEventListener("submit", this.handleChatSubmit);
    this.hud.chatInput?.removeEventListener("keydown", this.handleChatInputKeyDown);
    this.hud.rankingTabs?.removeEventListener("click", this.handleRankingTabsClick);
    this.closeChat();
    this.closeRanking();
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);

    if (this.hud.btnChat) {
      this.hud.btnChat.hidden = !this.enabled;
    }
    if (this.hud.btnRanking) {
      this.hud.btnRanking.hidden = !this.enabled;
    }

    if (!this.enabled) {
      this.closeChat();
      this.closeRanking();
      this.unread = 0;
      this.updateChatBadge();
      this.setEvent(null);
    }
  }

  setChatHistory(messages) {
    const list = Array.isArray(messages) ? messages : [];
    this.hud.chatLog?.replaceChildren();
    this.unread = 0;
    this.updateChatBadge();

    for (const message of list) {
      this.appendChatMessage(message, { silent: true });
    }
    this.scrollChatToBottom();
  }

  pushChat(message) {
    this.appendChatMessage(message, { silent: false });
  }

  pushKill(message) {
    if (!message) {
      return;
    }

    const killer = message.killerName ?? "Alguien";
    const victim = message.victimName ?? "alguien";
    const points = Number.isFinite(message.points) ? message.points : 0;
    this.appendChatMessage(
      {
        system: true,
        text: `${killer} eliminó a ${victim}${points > 0 ? ` (+${points})` : ""}`,
        at: message.at ?? Date.now(),
      },
      { silent: false },
    );

    const selfId = this.lanClient?.selfId;
    if (selfId !== null && selfId !== undefined) {
      if (message.killerId === selfId) {
        this.notify(`Eliminaste a ${victim}${points > 0 ? ` (+${points} pts)` : ""}.`);
      } else if (message.victimId === selfId) {
        this.notify(`${killer} te eliminó.`);
      }
    }
  }

  setLeaderboard(entries) {
    this.leaderboard = Array.isArray(entries) ? entries : [];
    this.renderRanking();
  }

  setEvent(event) {
    this.event = event && typeof event === "object" ? event : null;
    this.renderEventBanner();
    this.renderRankingNext();
  }

  appendChatMessage(message, { silent }) {
    if (!message || !this.hud.chatLog) {
      return;
    }

    const line = document.createElement("div");
    line.className = message.system ? "chat-line chat-system" : "chat-line";

    if (message.system) {
      line.textContent = String(message.text ?? "");
    } else {
      const name = document.createElement("span");
      name.className = "chat-name";
      name.textContent = String(message.name ?? "Jugador");
      if (typeof message.color === "string" && message.color.length > 0) {
        name.style.color = message.color;
      }

      const text = document.createElement("span");
      text.className = "chat-text";
      text.textContent = String(message.text ?? "");

      line.append(name, text);
    }

    this.hud.chatLog.append(line);

    while (this.hud.chatLog.childElementCount > MAX_CHAT_NODES) {
      this.hud.chatLog.firstElementChild?.remove();
    }

    if (!silent && !this.chatOpen) {
      this.unread += 1;
      this.updateChatBadge();
      return;
    }

    this.scrollChatToBottom();
  }

  scrollChatToBottom() {
    if (!this.hud.chatLog) {
      return;
    }
    this.hud.chatLog.scrollTop = this.hud.chatLog.scrollHeight;
  }

  updateChatBadge() {
    if (!this.hud.chatBadge) {
      return;
    }
    this.hud.chatBadge.hidden = this.unread <= 0;
    this.hud.chatBadge.textContent = this.unread > 99 ? "99+" : String(this.unread);
  }

  toggleChat() {
    if (!this.enabled) {
      return;
    }
    if (this.chatOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  openChat() {
    this.chatOpen = true;
    this.rankingOpen = false;
    this.hud.rankingPanel?.classList.remove("is-open");
    this.hud.rankingPanel?.setAttribute("aria-hidden", "true");
    this.hud.chatPanel?.classList.add("is-open");
    this.hud.chatPanel?.setAttribute("aria-hidden", "false");
    this.hud.btnChat?.classList.add("is-active");
    this.unread = 0;
    this.updateChatBadge();
    this.scrollChatToBottom();
    window.setTimeout(() => this.hud.chatInput?.focus(), 0);
  }

  closeChat() {
    if (!this.chatOpen) {
      return;
    }
    this.chatOpen = false;
    this.hud.chatPanel?.classList.remove("is-open");
    this.hud.chatPanel?.setAttribute("aria-hidden", "true");
    this.hud.btnChat?.classList.remove("is-active");
    this.hud.chatInput?.blur();
  }

  toggleRanking() {
    if (!this.enabled) {
      return;
    }
    if (this.rankingOpen) {
      this.closeRanking();
    } else {
      this.openRanking();
    }
  }

  openRanking() {
    this.rankingOpen = true;
    this.chatOpen = false;
    this.hud.chatPanel?.classList.remove("is-open");
    this.hud.chatPanel?.setAttribute("aria-hidden", "true");
    this.hud.btnChat?.classList.remove("is-active");
    this.hud.rankingPanel?.classList.add("is-open");
    this.hud.rankingPanel?.setAttribute("aria-hidden", "false");
    this.hud.btnRanking?.classList.add("is-active");
    this.renderRanking();
    this.renderRankingNext();
    this.lanClient?.requestLeaderboard?.();
  }

  closeRanking() {
    if (!this.rankingOpen) {
      return;
    }
    this.rankingOpen = false;
    this.hud.rankingPanel?.classList.remove("is-open");
    this.hud.rankingPanel?.setAttribute("aria-hidden", "true");
    this.hud.btnRanking?.classList.remove("is-active");
  }

  renderEventBanner() {
    const banner = this.hud.pvpBanner;
    if (!banner) {
      return;
    }

    const active = this.enabled && this.event?.phase === "active";
    banner.hidden = !active;
    banner.classList.toggle("is-active", active);

    if (!active) {
      return;
    }

    if (this.hud.pvpBannerTitle) {
      this.hud.pvpBannerTitle.textContent =
        this.event.kind === "hill" ? "Evento PvP · Conquista" : "Evento PvP · Deathmatch";
    }
    if (this.hud.pvpBannerTimer) {
      this.hud.pvpBannerTimer.textContent = formatMs(this.event.remainingMs);
    }
    if (this.hud.pvpBannerLeader) {
      const leader = this.event.standings?.[0];
      this.hud.pvpBannerLeader.textContent = leader
        ? `Líder: ${leader.name} (${leader.score})`
        : "Sin puntuaciones aún";
    }
  }

  renderRankingNext() {
    if (!this.hud.rankingNext) {
      return;
    }
    if (!this.enabled || !this.event) {
      this.hud.rankingNext.textContent = "El ranking se actualiza al terminar cada evento.";
      return;
    }
    if (this.event.phase === "active") {
      this.hud.rankingNext.textContent = `Evento en curso · ${formatMs(this.event.remainingMs)} restantes`;
    } else {
      this.hud.rankingNext.textContent = `Próximo evento en ${formatMs(this.event.startsInMs)}`;
    }
  }

  renderRanking() {
    const container = this.hud.rankingList;
    if (!container) {
      return;
    }

    const entries = Array.isArray(this.leaderboard) ? [...this.leaderboard] : [];

    entries.sort((a, b) => {
      if (this.rankingSort === "best") {
        return (
          (b.bestEventScore ?? 0) - (a.bestEventScore ?? 0) ||
          (b.points ?? 0) - (a.points ?? 0) ||
          String(a.name ?? "").localeCompare(String(b.name ?? ""))
        );
      }
      return (
        (b.points ?? 0) - (a.points ?? 0) ||
        (b.kills ?? 0) - (a.kills ?? 0) ||
        String(a.name ?? "").localeCompare(String(b.name ?? ""))
      );
    });

    if (entries.length === 0) {
      const empty = document.createElement("p");
      empty.className = "ranking-empty";
      empty.textContent = "Todavía no hay puntuaciones. Participa en el próximo evento PvP.";
      container.replaceChildren(empty);
      this.renderRankingTabs();
      return;
    }

    const fragment = document.createDocumentFragment();

    entries.forEach((entry, index) => {
      const row = document.createElement("div");
      row.className = "ranking-row";
      if (entry.isSelf) {
        row.classList.add("is-self");
      }

      const rank = document.createElement("span");
      rank.className = "ranking-rank";
      rank.textContent = String(index + 1);

      const dot = document.createElement("span");
      dot.className = "ranking-dot";
      if (typeof entry.color === "string" && entry.color.length > 0) {
        dot.style.background = entry.color;
      }

      const main = document.createElement("div");
      main.className = "ranking-main";
      const name = document.createElement("strong");
      name.className = "ranking-name";
      name.textContent = String(entry.name ?? "Jugador");
      const meta = document.createElement("span");
      meta.className = "ranking-meta";
      meta.textContent = `${entry.kills ?? 0} K · ${entry.deaths ?? 0} D · ${entry.eventsWon ?? 0} victorias`;
      main.append(name, meta);

      const value = document.createElement("span");
      value.className = "ranking-value";
      value.textContent =
        this.rankingSort === "best"
          ? `${entry.bestEventScore ?? 0} pts`
          : `${entry.points ?? 0} pts`;

      row.append(rank, dot, main, value);
      fragment.append(row);
    });

    container.replaceChildren(fragment);
    this.renderRankingTabs();
  }

  renderRankingTabs() {
    const tabs = this.hud.rankingTabs;
    if (!tabs) {
      return;
    }
    for (const button of tabs.querySelectorAll("[data-ranking-sort]")) {
      button.classList.toggle(
        "is-active",
        button.dataset.rankingSort === this.rankingSort,
      );
    }
  }

  handleRankingTabsClick(event) {
    const button = event.target.closest("[data-ranking-sort]");
    if (!button) {
      return;
    }
    this.rankingSort = button.dataset.rankingSort === "best" ? "best" : "points";
    this.renderRanking();
  }

  handleKeyDown(event) {
    if (!this.enabled) {
      return;
    }

    const tag = event.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      return;
    }

    if (event.code === "KeyT") {
      event.preventDefault();
      if (!event.repeat) {
        this.toggleChat();
      }
      return;
    }

    if (event.code === "KeyB") {
      event.preventDefault();
      if (!event.repeat) {
        this.toggleRanking();
      }
    }
  }

  handleChatInputKeyDown(event) {
    if (event.code === "Escape") {
      event.preventDefault();
      this.closeChat();
      return;
    }
    if (event.code === "Enter" && !event.shiftKey) {
      event.preventDefault();
      this.sendChat();
    }
  }

  handleChatSubmit(event) {
    event.preventDefault();
    this.sendChat();
  }

  sendChat() {
    const input = this.hud.chatInput;
    if (!input) {
      return;
    }

    const text = String(input.value ?? "").trim().slice(0, CHAT_MAX_LENGTH);
    if (text.length === 0) {
      return;
    }

    this.lanClient?.sendChat?.(text);
    input.value = "";
    input.blur();
  }
}
