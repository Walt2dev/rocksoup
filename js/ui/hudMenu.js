export class HudMenu {
  constructor({ game, hud = {} } = {}) {
    this.game = game;
    this.hud = hud;
    this.openState = false;
    this.attached = false;
    this.lastActionKey = "";
    this.lastSyncAt = 0;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleMenuClick = this.handleMenuClick.bind(this);
    this.handleBackdropClick = this.handleBackdropClick.bind(this);
    this.handleContextAction = this.handleContextAction.bind(this);
    this.handleCrossAttack = () => this.game?.attack?.();
    this.handleCrossAttackDelegated = this.handleCrossAttackDelegated.bind(this);
    this.handleCrossCenter = () => this.game?.recenterCamera?.();
    this.handleCrossWorkers = () => this.game?.handleIdleWorkerRequest?.();
    this.handleCrossJump = () => this.game?.jump?.();
    this.handleCrossChat = () => this.click("btn-chat");
    this.handleCrossQuest = () => this.click("btn-quest");
    this.handleHotbarToggle = this.handleHotbarToggle.bind(this);
    this.handleStatsClose = this.handleStatsClose.bind(this);
    this.toggle = this.toggle.bind(this);
    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
  }

  attach() {
    if (this.attached) {
      return;
    }
    this.attached = true;

    this.hud.btnHudMenu?.addEventListener("click", this.toggle);
    this.hud.btnHudMenuClose?.addEventListener("click", this.close);
    this.hud.hudMenu?.addEventListener("click", this.handleBackdropClick);
    this.hud.hudMenu?.addEventListener("click", this.handleMenuClick);
    this.hud.btnContextAction?.addEventListener("click", this.handleContextAction);
    this.hud.btnCrossAttack
      ?.closest(".hud-context-actions")
      ?.addEventListener("click", this.handleCrossAttackDelegated);
    this.hud.btnCrossCenter?.addEventListener("click", this.handleCrossCenter);
    this.hud.btnCrossWorkers?.addEventListener("click", this.handleCrossWorkers);
    this.hud.btnCrossJump?.addEventListener("click", this.handleCrossJump);
    this.hud.btnCrossChat?.addEventListener("click", this.handleCrossChat);
    this.hud.btnCrossQuest?.addEventListener("click", this.handleCrossQuest);
    this.hud.btnHotbarToggle?.addEventListener("click", this.handleHotbarToggle);
    this.hud.btnStatsClose?.addEventListener("click", this.handleStatsClose);
    window.addEventListener("keydown", this.handleKeyDown, true);

    this.refresh();
  }

  destroy() {
    if (!this.attached) {
      return;
    }
    this.attached = false;

    this.hud.btnHudMenu?.removeEventListener("click", this.toggle);
    this.hud.btnHudMenuClose?.removeEventListener("click", this.close);
    this.hud.hudMenu?.removeEventListener("click", this.handleBackdropClick);
    this.hud.hudMenu?.removeEventListener("click", this.handleMenuClick);
    this.hud.btnContextAction?.removeEventListener("click", this.handleContextAction);
    this.hud.btnCrossAttack
      ?.closest(".hud-context-actions")
      ?.removeEventListener("click", this.handleCrossAttackDelegated);
    this.hud.btnCrossCenter?.removeEventListener("click", this.handleCrossCenter);
    this.hud.btnCrossWorkers?.removeEventListener("click", this.handleCrossWorkers);
    this.hud.btnCrossJump?.removeEventListener("click", this.handleCrossJump);
    this.hud.btnCrossChat?.removeEventListener("click", this.handleCrossChat);
    this.hud.btnCrossQuest?.removeEventListener("click", this.handleCrossQuest);
    this.hud.btnHotbarToggle?.removeEventListener("click", this.handleHotbarToggle);
    this.hud.btnStatsClose?.removeEventListener("click", this.handleStatsClose);
    window.removeEventListener("keydown", this.handleKeyDown, true);
    this.close();
  }

  handleKeyDown(event) {
    const tag = event.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      return;
    }

    if (event.code === "Escape" && this.openState) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.close();
      return;
    }

    if (event.code === "KeyH" && !event.repeat) {
      event.preventDefault();
      this.toggle();
    }
  }

  handleBackdropClick(event) {
    if (event.target === this.hud.hudMenu) {
      this.close();
    }
  }

  toggle() {
    if (this.openState) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    if (this.openState || !this.hud.hudMenu) {
      return;
    }
    this.openState = true;
    this.game?.input?.keys?.clear();
    this.syncMenuItems();
    this.refreshContextActions();
    this.hud.hudMenu.classList.add("is-open");
    this.hud.hudMenu.setAttribute("aria-hidden", "false");
    this.hud.btnHudMenu?.classList.add("is-active");
    this.hud.btnHudMenu?.setAttribute("aria-expanded", "true");
    window.setTimeout(() => this.hud.btnHudMenuClose?.focus(), 0);
  }

  close() {
    if (!this.openState || !this.hud.hudMenu) {
      return;
    }
    this.openState = false;
    this.hud.hudMenu.classList.remove("is-open");
    this.hud.hudMenu.setAttribute("aria-hidden", "true");
    this.hud.btnHudMenu?.classList.remove("is-active");
    this.hud.btnHudMenu?.setAttribute("aria-expanded", "false");
    this.hud.btnHudMenu?.focus?.();
  }

  handleMenuClick(event) {
    const item = event.target.closest("[data-hud-action]");
    if (!item || item.hidden) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.handleAction(item.dataset.hudAction);
  }

  handleAction(action) {
    switch (action) {
      case "craft":
        this.click("btn-craft");
        this.close();
        break;
      case "recipes":
        this.click("btn-recipes");
        this.close();
        break;
      case "quest":
        this.click("btn-quest");
        this.close();
        break;
      case "birds":
        this.game?.toggleBirdPanel?.();
        this.close();
        break;
      case "map":
        this.game?.toggleMap?.();
        this.close();
        break;
      case "fief":
        this.click("btn-fief");
        this.close();
        break;
      case "market":
        this.game?.openTrade?.();
        this.close();
        break;
      case "chat":
        this.click("btn-chat");
        this.close();
        break;
      case "ranking":
        this.click("btn-ranking");
        this.close();
        break;
      case "players":
        this.click("btn-players");
        this.close();
        break;
      case "workers":
        this.click("btn-idle-worker");
        this.close();
        break;
      case "attack":
        this.game?.attack?.();
        this.close();
        break;
      case "inventory":
        this.game?.openInventory?.();
        this.close();
        break;
      case "center":
        this.game?.recenterCamera?.();
        this.close();
        break;
      case "rotate-left":
        this.game?.rotateCamera?.(-1);
        this.close();
        break;
      case "rotate-right":
        this.game?.rotateCamera?.(1);
        this.close();
        break;
      case "zoom-in":
        this.zoom(1.2);
        this.close();
        break;
      case "zoom-out":
        this.zoom(0.84);
        this.close();
        break;
      case "game-mode":
        this.click("btn-game-mode");
        this.close();
        break;
      case "save-exit":
        this.game?.save?.();
        this.close();
        window.setTimeout(() => this.click("btn-menu"), 30);
        break;
      case "stats":
        this.hud.statsPanel?.classList.toggle("is-open");
        this.close();
        break;
      case "controls":
        if (this.hud.hudMenuHelp) {
          this.hud.hudMenuHelp.hidden = !this.hud.hudMenuHelp.hidden;
        }
        break;
      case "menu":
        this.click("btn-menu");
        this.close();
        break;
      default:
        break;
    }
  }

  click(id) {
    const element = document.getElementById(id);
    if (!element || element.hidden) {
      return;
    }
    element.click();
  }

  zoom(factor) {
    const camera = this.game?.camera;
    if (!camera) {
      return;
    }
    camera.zoomAt(camera.width / 2, camera.height / 2, factor);
  }

  handleContextAction() {
    this.game?.useOrPlaceSelected?.();
    this.refreshContextActions();
  }

  handleCrossAttackDelegated(event) {
    const button = event.target?.closest?.('[data-cross-action="attack"]');
    if (!button || button.disabled) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.handleCrossAttack();
  }

  handleHotbarToggle() {
    this.game?.toggleInventory?.();
    this.hud.btnHotbarToggle?.setAttribute(
      "aria-expanded",
      String(this.game?.inventoryOpen === true),
    );
  }

  handleStatsClose() {
    this.hud.statsPanel?.classList.remove("is-open");
  }

  syncMenuItems() {
    if (!this.hud.hudMenu) {
      return;
    }

    for (const item of this.hud.hudMenu.querySelectorAll("[data-requires]")) {
      const requirement = item.dataset.requires;
      let visible = true;

      if (requirement === "chat") {
        visible = !this.hud.btnChat?.hidden;
      } else if (requirement === "ranking") {
        visible = !this.hud.btnRanking?.hidden;
      } else if (requirement === "players") {
        visible = !this.hud.btnPlayers?.hidden;
      } else if (requirement === "quest") {
        visible = !this.hud.btnQuest?.hidden;
      } else if (requirement === "market") {
        visible = (this.game?.alliedVillages?.().length ?? 0) > 0;
      } else if (requirement === "coffee") {
        visible = !this.hud.btnCoffee?.hidden;
      } else if (requirement === "compass") {
        visible = this.game?.compassOwned === true;
      }

      item.hidden = !visible;
    }

    for (const grid of this.hud.hudMenu.querySelectorAll(".hud-menu-grid")) {
      const items = [...grid.querySelectorAll("[data-hud-action]")];
      const allHidden = items.length > 0 && items.every((item) => item.hidden);
      grid.hidden = allHidden;
      const heading = grid.previousElementSibling;
      if (heading?.tagName === "H3") {
        heading.hidden = allHidden;
      }
    }

    if (this.hud.btnCrossQuest) {
      this.hud.btnCrossQuest.hidden = this.hud.btnQuest?.hidden ?? true;
    }
    if (this.hud.btnCrossChat) {
      this.hud.btnCrossChat.hidden = this.hud.btnChat?.hidden ?? true;
    }
  }

  refresh() {
    this.syncMenuItems();
    this.refreshContextActions();
  }

  refreshContextActions() {
    if (!this.hud.btnContextAction || !this.game) {
      return;
    }

    if (this.hud.btnCrossQuest) {
      this.hud.btnCrossQuest.hidden = this.hud.btnQuest?.hidden ?? true;
    }
    if (this.hud.btnCrossChat) {
      this.hud.btnCrossChat.hidden = this.hud.btnChat?.hidden ?? true;
    }
    if (this.hud.btnHotbarToggle) {
      const open = this.game.inventoryOpen === true;
      this.hud.btnHotbarToggle.classList.toggle("is-active", open);
      this.hud.btnHotbarToggle.setAttribute("aria-expanded", String(open));
    }

    const action = this.game.getContextAction?.();
    if (!action) {
      return;
    }

    const hasContext = action.id !== "attack";
    const key = `${action.id}:${action.label}:${action.icon}:${hasContext}`;
    if (key === this.lastActionKey) {
      return;
    }
    this.lastActionKey = key;

    const label = hasContext ? action.label : "Usar/Colocar";
    const icon = hasContext ? action.icon : "use";

    if (this.hud.contextActionLabel) {
      this.hud.contextActionLabel.textContent = label;
    }
    if (this.hud.contextActionIcon) {
      this.hud.contextActionIcon.setAttribute("href", `#icon-${icon}`);
    }
    this.hud.btnContextAction.dataset.action = action.id;
    this.hud.btnContextAction.disabled = !hasContext;
    this.hud.btnContextAction.classList.toggle("is-disabled", !hasContext);
    this.hud.btnContextAction.title = hasContext
      ? `${action.label} (acción contextual)`
      : "Selecciona un objeto para usar o colocar";
    this.hud.btnContextAction.setAttribute(
      "aria-label",
      hasContext ? `${action.label} (acción contextual)` : "Usar o colocar",
    );
  }
}
