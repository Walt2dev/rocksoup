import { api } from "../net/api.js";

const RELATION_LABELS = {
  neutral: "Neutro",
  ally: "Aliado",
  ally_request: "Solicitud de alianza",
  enemy: "Enemigo",
};

export class ClansUI {
  constructor({ hud = {}, notify = () => {} } = {}) {
    this.hud = hud;
    this.notify = notify;
    this.open = false;
    this.busy = false;
    this.attached = false;

    this.toggle = this.toggle.bind(this);
    this.close = this.close.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  attach() {
    if (this.attached) {
      return;
    }
    this.attached = true;
    this.hud.btnClans?.addEventListener("click", this.toggle);
    this.hud.btnClansClose?.addEventListener("click", this.close);
    this.hud.clansBody?.addEventListener("click", this.handleClick);
    this.hud.clansBody?.addEventListener("submit", this.handleSubmit);
  }

  detach() {
    if (!this.attached) {
      return;
    }
    this.attached = false;
    this.hud.btnClans?.removeEventListener("click", this.toggle);
    this.hud.btnClansClose?.removeEventListener("click", this.close);
    this.hud.clansBody?.removeEventListener("click", this.handleClick);
    this.hud.clansBody?.removeEventListener("submit", this.handleSubmit);
    this.close();
  }

  setEnabled(enabled) {
    if (this.hud.btnClans) {
      this.hud.btnClans.hidden = !enabled;
    }
    if (!enabled) {
      this.close();
    }
  }

  toggle() {
    if (this.open) {
      this.close();
    } else {
      this.openPanel();
    }
  }

  openPanel() {
    this.open = true;
    this.hud.clansPanel?.classList.add("is-open");
    this.hud.clansPanel?.setAttribute("aria-hidden", "false");
    this.hud.btnClans?.classList.add("is-active");
    this.refresh();
  }

  close() {
    this.open = false;
    this.hud.clansPanel?.classList.remove("is-open");
    this.hud.clansPanel?.setAttribute("aria-hidden", "true");
    this.hud.btnClans?.classList.remove("is-active");
  }

  async refresh() {
    if (!this.open || this.busy) {
      return;
    }
    this.busy = true;
    try {
      const [me, list] = await Promise.all([
        api("/api/clans/me"),
        api("/api/clans"),
      ]);
      this.render(me?.clan ?? null, list?.clans ?? []);
    } catch (error) {
      this.renderError(error.message);
    } finally {
      this.busy = false;
    }
  }

  renderError(message) {
    this.hud.clansBody?.replaceChildren(this.el("p", "clans-note", message));
  }

  el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

  render(myClan, clans) {
    const body = this.hud.clansBody;
    if (!body) {
      return;
    }
    body.replaceChildren();

    if (myClan) {
      this.renderMyClan(body, myClan);
    } else {
      this.renderJoin(body, clans);
    }
  }

  renderMyClan(body, clan) {
    const header = this.el("div", "clans-clan", null);
    header.append(
      this.el("span", "clans-tag", `[${clan.tag}]`),
      this.el("strong", "clans-name", clan.name),
    );
    if (clan.description) {
      header.append(this.el("p", "clans-note", clan.description));
    }
    body.append(header);

    const members = this.el("section", "clans-section", null);
    members.append(this.el("h3", "clans-heading", `Miembros (${clan.members.length})`));
    const list = this.el("div", "clans-members", null);
    for (const member of clan.members) {
      const row = this.el("div", "clans-member", null);
      row.append(
        this.el("span", "clans-member-name", member.name),
        this.el("span", "clans-role", member.role),
      );
      list.append(row);
    }
    members.append(list);
    body.append(members);

    const relations = this.el("section", "clans-section", null);
    relations.append(this.el("h3", "clans-heading", "Diplomacia"));
    if (clan.relations.length === 0) {
      relations.append(this.el("p", "clans-note", "Sin relaciones todavía."));
    } else {
      const relList = this.el("div", "clans-relations", null);
      for (const rel of clan.relations) {
        const row = this.el("div", "clans-relation", null);
        row.append(
          this.el("span", "clans-relation-name", `${rel.otherName} [${rel.otherTag}]`),
          this.el("span", `clans-relation-state is-${rel.relation}`, RELATION_LABELS[rel.relation] ?? rel.relation),
        );
        const actions = this.el("div", "clans-relation-actions", null);
        const ally = this.el("button", "menu-button", rel.relation === "ally" ? "Romper alianza" : "Pedir alianza");
        ally.type = "button";
        ally.dataset.action = rel.relation === "ally" ? "relation-neutral" : "relation-ally_request";
        ally.dataset.clanId = rel.otherClanId;
        const enemy = this.el("button", "menu-button", rel.relation === "enemy" ? "Hacer las paces" : "Declarar enemigo");
        enemy.type = "button";
        enemy.dataset.action = rel.relation === "enemy" ? "relation-neutral" : "relation-enemy";
        enemy.dataset.clanId = rel.otherClanId;
        actions.append(ally, enemy);
        row.append(actions);
        relList.append(row);
      }
      relations.append(relList);
    }
    body.append(relations);

    const leave = this.el("button", "menu-button", "Abandonar clan");
    leave.type = "button";
    leave.dataset.action = "leave";
    body.append(leave);
  }

  renderJoin(body, clans) {
    const form = this.el("form", "clans-form", null);
    form.dataset.action = "create";
    const name = this.el("input", null, null);
    name.name = "name";
    name.placeholder = "Nombre del clan";
    name.maxLength = 32;
    const tag = this.el("input", null, null);
    tag.name = "tag";
    tag.placeholder = "Etiqueta (2-4)";
    tag.maxLength = 4;
    const desc = this.el("input", null, null);
    desc.name = "description";
    desc.placeholder = "Descripción (opcional)";
    desc.maxLength = 140;
    const submit = this.el("button", "menu-button primary", "Crear clan");
    submit.type = "submit";
    form.append(name, tag, desc, submit);
    body.append(form);

    const heading = this.el("h3", "clans-heading", "Clanes");
    body.append(heading);
    if (clans.length === 0) {
      body.append(this.el("p", "clans-note", "No hay clanes todavía. ¡Crea el primero!"));
      return;
    }
    for (const clan of clans) {
      const row = this.el("div", "clans-row", null);
      row.append(
        this.el("span", "clans-tag", `[${clan.tag}]`),
        this.el("strong", "clans-name", clan.name),
        this.el("span", "clans-meta", `${clan.memberCount} miembros`),
      );
      body.append(row);
    }
  }

  async handleSubmit(event) {
    const form = event.target.closest("[data-action='create']");
    if (!form) {
      return;
    }
    event.preventDefault();
    const data = new FormData(form);
    try {
      await api("/api/clans", {
        method: "POST",
        body: {
          name: String(data.get("name") ?? ""),
          tag: String(data.get("tag") ?? ""),
          description: String(data.get("description") ?? ""),
        },
      });
      this.notify("Clan creado.");
      this.refresh();
    } catch (error) {
      this.notify(error.message);
    }
  }

  async handleClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }
    const action = button.dataset.action;
    const clanId = button.dataset.clanId ?? "";
    try {
      if (action === "leave") {
        await api("/api/clans/leave", { method: "POST", body: {} });
        this.notify("Saliste del clan.");
      } else if (action === "relation-ally_request") {
        await api("/api/clans/relation", { method: "POST", body: { clanId, action: "ally_request" } });
        this.notify("Solicitud de alianza enviada.");
      } else if (action === "relation-enemy") {
        await api("/api/clans/relation", { method: "POST", body: { clanId, action: "enemy" } });
        this.notify("Clan marcado como enemigo.");
      } else if (action === "relation-neutral") {
        await api("/api/clans/relation", { method: "POST", body: { clanId, action: "neutral" } });
        this.notify("Relación neutral.");
      }
      this.refresh();
    } catch (error) {
      this.notify(error.message);
    }
  }
}
