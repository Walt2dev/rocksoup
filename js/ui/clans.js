import { api } from "../net/api.js";
import { getCurrentUser } from "../net/auth.js";

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
    this.user = null;
    this.eligibility = null;

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
      const [me, list, eligibility, user] = await Promise.all([
        api("/api/clans/me"),
        api("/api/clans"),
        api("/api/clans/eligibility"),
        getCurrentUser().catch(() => null),
      ]);
      this.user = user;
      this.eligibility = eligibility;
      this.render(me?.clan ?? null, list?.clans ?? [], eligibility);
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

  button(label, action, data = {}, extraClass = "menu-button") {
    const button = this.el("button", extraClass, label);
    button.type = "button";
    button.dataset.action = action;
    for (const [key, value] of Object.entries(data)) {
      button.dataset[key] = String(value);
    }
    return button;
  }

  render(myClan, clans, eligibility) {
    const body = this.hud.clansBody;
    if (!body) {
      return;
    }
    body.replaceChildren();

    if (myClan) {
      this.renderMyClan(body, myClan);
    } else {
      this.renderJoin(body, clans, eligibility);
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

    if (Array.isArray(clan.requests) && clan.requests.length > 0) {
      const requests = this.el("section", "clans-section", null);
      requests.append(this.el("h3", "clans-heading", `Solicitudes (${clan.requests.length})`));
      const list = this.el("div", "clans-relations", null);
      for (const request of clan.requests) {
        const row = this.el("div", "clans-relation", null);
        row.append(this.el("span", "clans-relation-name", request.name));
        const actions = this.el("div", "clans-relation-actions", null);
        actions.append(
          this.button("Aceptar", "request-accept", { userId: request.userId }, "menu-button primary"),
          this.button("Rechazar", "request-decline", { userId: request.userId }),
        );
        row.append(actions);
        list.append(row);
      }
      requests.append(list);
      body.append(requests);
    }

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

    const invite = this.el("form", "clans-form", null);
    invite.dataset.action = "invite";
    const input = this.el("input", null, null);
    input.name = "target";
    input.placeholder = "Correo o nombre de usuario";
    input.maxLength = 190;
    const inviteButton = this.el("button", "menu-button", "Invitar amigo");
    inviteButton.type = "submit";
    invite.append(input, inviteButton);
    body.append(invite);

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
          this.el(
            "span",
            `clans-relation-state is-${rel.relation}`,
            RELATION_LABELS[rel.relation] ?? rel.relation,
          ),
        );
        const actions = this.el("div", "clans-relation-actions", null);
        actions.append(
          rel.relation === "ally"
            ? this.button("Romper alianza", "relation-neutral", { clanId: rel.otherClanId })
            : rel.relation === "ally_request"
              ? this.button("Aceptar alianza", "relation-accept", { clanId: rel.otherClanId })
              : this.button("Pedir alianza", "relation-ally_request", { clanId: rel.otherClanId }),
          rel.relation === "enemy"
            ? this.button("Hacer las paces", "relation-neutral", { clanId: rel.otherClanId })
            : this.button("Declarar enemigo", "relation-enemy", { clanId: rel.otherClanId }),
        );
        row.append(actions);
        relList.append(row);
      }
      relations.append(relList);
    }
    body.append(relations);

    const footer = this.el("div", "clans-form", null);
    footer.append(
      this.button("Recomendar el juego", "recommend", {}, "menu-button primary"),
      this.button("Abandonar clan", "leave"),
    );
    body.append(footer);
  }

  renderJoin(body, clans, eligibility) {
    const villages = eligibility?.villages ?? 0;
    const required = eligibility?.required ?? 3;
    const canCreate = eligibility?.canCreate === true;
    const pending = Array.isArray(eligibility?.pendingRequests)
      ? eligibility.pendingRequests
      : [];

    const status = this.el(
      "p",
      "clans-note",
      canCreate
        ? `Puedes crear tu clan (${villages}/${required} aldeas conquistadas).`
        : `Necesitas ${required} aldeas conquistadas para crear un clan (tienes ${villages}).`,
    );
    body.append(status);

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
    submit.disabled = !canCreate;
    form.append(name, tag, desc, submit);
    body.append(form);

    body.append(this.el("h3", "clans-heading", "Clanes"));
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
      const requested = pending.includes(clan.id);
      const requestButton = this.button(
        requested ? "Solicitud enviada" : "Solicitar unirse",
        "request",
        { clanId: clan.id },
      );
      requestButton.disabled = requested;
      row.append(requestButton);
      body.append(row);
    }
  }

  async handleSubmit(event) {
    const form = event.target.closest("form[data-action]");
    if (!form) {
      return;
    }
    event.preventDefault();
    const data = new FormData(form);
    try {
      if (form.dataset.action === "create") {
        await api("/api/clans", {
          method: "POST",
          body: {
            name: String(data.get("name") ?? ""),
            tag: String(data.get("tag") ?? ""),
            description: String(data.get("description") ?? ""),
          },
        });
        this.notify("Clan creado.");
      } else if (form.dataset.action === "invite") {
        const target = String(data.get("target") ?? "").trim();
        if (!target) {
          return;
        }
        const body = target.includes("@")
          ? { email: target }
          : { username: target };
        await api("/api/clans/invite", { method: "POST", body });
        this.notify("Invitación enviada.");
        form.reset();
      }
      this.refresh();
    } catch (error) {
      this.notify(error.message);
    }
  }

  async recommend() {
    const base = window.location.origin;
    const url = this.user?.id ? `${base}/?ref=${this.user.id}` : base;
    const text = "¡Juega Sopa de Piedras conmigo!";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Sopa de Piedras", text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      this.notify("Enlace de recomendación copiado.");
    } catch {
      this.notify(url);
    }
  }

  async handleClick(event) {
    if (event.target.closest("form")) {
      return;
    }
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
      } else if (action === "request") {
        await api("/api/clans/request", { method: "POST", body: { clanId } });
        this.notify("Solicitud enviada al líder del clan.");
      } else if (action === "request-accept") {
        await api("/api/clans/requests/accept", {
          method: "POST",
          body: { userId: Number(button.dataset.userId) },
        });
        this.notify("Solicitud aceptada.");
      } else if (action === "request-decline") {
        await api("/api/clans/requests/decline", {
          method: "POST",
          body: { userId: Number(button.dataset.userId) },
        });
        this.notify("Solicitud rechazada.");
      } else if (action === "relation-ally_request") {
        await api("/api/clans/relation", { method: "POST", body: { clanId, action: "ally_request" } });
        this.notify("Solicitud de alianza enviada.");
      } else if (action === "relation-accept") {
        await api("/api/clans/relation", { method: "POST", body: { clanId, action: "ally_accept" } });
        this.notify("Alianza aceptada.");
      } else if (action === "relation-enemy") {
        await api("/api/clans/relation", { method: "POST", body: { clanId, action: "enemy" } });
        this.notify("Clan marcado como enemigo.");
      } else if (action === "relation-neutral") {
        await api("/api/clans/relation", { method: "POST", body: { clanId, action: "neutral" } });
        this.notify("Relación neutral.");
      } else if (action === "recommend") {
        await this.recommend();
        return;
      }
      this.refresh();
    } catch (error) {
      this.notify(error.message);
    }
  }
}
