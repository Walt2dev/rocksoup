function el(id) {
  return document.getElementById(id);
}

function iconForEntity(entity) {
  return entity.iconUrl || null;
}

function displayName(entity) {
  return entity.data?.label || entity.data?.name || entity.id;
}

export function initContentAdmin({ getToken } = {}) {
  const container = el("admin-content");
  const statusNode = el("admin-content-status");
  if (!container) {
    return { refresh: () => {} };
  }

  let sections = [];
  let activeKind = "resource";
  let activeId = null;
  let busy = false;

  function setStatus(message, isError = false) {
    if (!statusNode) {
      return;
    }
    statusNode.textContent = message || "";
    statusNode.classList.toggle("is-error", Boolean(isError));
  }

  async function api(path, { method = "GET", body = null } = {}) {
    const token = getToken?.() ?? "";
    if (!token) {
      throw new Error("Introduce la clave de administración.");
    }
    const response = await fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    if (!response.ok) {
      throw new Error(data?.error || `Error del servidor (${response.status}).`);
    }
    return data;
  }

  function sectionFor(kind) {
    return sections.find((section) => section.kind === kind) ?? sections[0] ?? null;
  }

  function currentEntity() {
    const section = sectionFor(activeKind);
    return section?.items?.find((entry) => entry.id === activeId) ?? null;
  }

  function render() {
    const section = sectionFor(activeKind);
    container.replaceChildren();

    const shell = document.createElement("div");
    shell.className = "admin-content-shell";

    const nav = document.createElement("nav");
    nav.className = "admin-content-sections";
    for (const entry of sections) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "admin-content-section";
      button.classList.toggle("is-active", entry.kind === activeKind);
      button.textContent = entry.label;
      button.addEventListener("click", () => {
        activeKind = entry.kind;
        activeId = entry.items?.[0]?.id ?? null;
        render();
      });
      nav.append(button);
    }

    const list = document.createElement("div");
    list.className = "admin-content-list";
    for (const entity of section?.items ?? []) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "admin-content-item";
      button.classList.toggle("is-active", entity.id === activeId);
      const icon = document.createElement("span");
      icon.className = "admin-content-item-icon";
      if (iconForEntity(entity)) {
        const image = document.createElement("img");
        image.src = iconForEntity(entity);
        image.alt = "";
        icon.append(image);
      } else {
        icon.textContent = entity.data?.icon || entity.data?.symbol || "•";
      }
      const copy = document.createElement("span");
      copy.className = "admin-content-item-copy";
      const title = document.createElement("strong");
      title.textContent = displayName(entity);
      const meta = document.createElement("small");
      meta.textContent = entity.id;
      copy.append(title, meta);
      button.append(icon, copy);
      button.addEventListener("click", () => {
        activeId = entity.id;
        render();
      });
      list.append(button);
    }

    const editor = document.createElement("div");
    editor.className = "admin-content-editor";
    const entity = currentEntity();
    if (entity) {
      editor.append(renderEditor(entity, section));
    } else {
      const empty = document.createElement("p");
      empty.className = "admin-empty";
      empty.textContent = "Selecciona un contenido.";
      editor.append(empty);
    }

    shell.append(nav, list, editor);
    container.append(shell);
  }

  function fieldValue(entity, field) {
    if (field.key === "priceCurrency") {
      return entity.data?.price?.currency ?? "drac";
    }
    if (field.key === "priceAmount") {
      return entity.data?.price?.amount ?? 0;
    }
    return entity.data?.[field.key];
  }

  function renderEditor(entity, section) {
    const form = document.createElement("form");
    form.className = "admin-content-form";
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void saveEntity(entity);
    });

    const header = document.createElement("div");
    header.className = "admin-content-editor-head";
    const preview = document.createElement("div");
    preview.className = "admin-content-icon-preview";
    if (iconForEntity(entity)) {
      const img = document.createElement("img");
      img.src = iconForEntity(entity);
      img.alt = "";
      preview.append(img);
    } else {
      preview.textContent = entity.data?.icon || entity.data?.symbol || "•";
    }
    const title = document.createElement("div");
    const name = document.createElement("h3");
    name.textContent = displayName(entity);
    const id = document.createElement("p");
    id.className = "admin-muted";
    id.textContent = `${section.singular} · ${entity.id}`;
    title.append(name, id);
    header.append(preview, title);

    const grid = document.createElement("div");
    grid.className = "admin-content-grid";
    for (const field of section.fields ?? []) {
      const label = document.createElement("label");
      label.textContent = field.label;
      let input;
      if (field.type === "textarea") {
        input = document.createElement("textarea");
        input.rows = 3;
      } else if (field.type === "select") {
        input = document.createElement("select");
        for (const option of field.options ?? []) {
          const node = document.createElement("option");
          node.value = option.value;
          node.textContent = option.label;
          input.append(node);
        }
      } else if (field.type === "checkbox") {
        input = document.createElement("input");
        input.type = "checkbox";
        label.classList.add("admin-content-check");
      } else if (field.type === "color") {
        input = document.createElement("input");
        input.type = "color";
      } else if (field.type === "number") {
        input = document.createElement("input");
        input.type = "number";
        input.min = String(field.min ?? 0);
        input.max = String(field.max ?? 1000000);
        input.step = String(field.step ?? 1);
      } else if (field.type === "json") {
        input = document.createElement("textarea");
        input.rows = 3;
        input.classList.add("admin-content-json");
        input.value = JSON.stringify(fieldValue(entity, field) ?? null, null, 2);
        input.dataset.json = "1";
      } else {
        input = document.createElement("input");
        input.type = "text";
      }
      input.name = field.key;
      if (field.type !== "json") {
        if (field.type === "checkbox") {
          input.checked = fieldValue(entity, field) !== false;
        } else {
          input.value = String(fieldValue(entity, field) ?? "");
        }
      }
      if (field.help) {
        const help = document.createElement("small");
        help.textContent = field.help;
        label.append(input, help);
      } else {
        label.append(input);
      }
      grid.append(label);
    }

    const actions = document.createElement("div");
    actions.className = "admin-content-actions";
    const save = document.createElement("button");
    save.type = "submit";
    save.className = "menu-button primary";
    save.textContent = "Guardar cambios";
    save.disabled = busy;
    const restore = document.createElement("button");
    restore.type = "button";
    restore.className = "menu-button";
    restore.textContent = "Restaurar original";
    restore.disabled = busy || !entity.hasOverride;
    restore.addEventListener("click", () => void restoreEntity(entity));
    actions.append(save, restore);

    const spriteBox = document.createElement("div");
    spriteBox.className = "admin-content-sprite";
    const spriteTitle = document.createElement("h4");
    spriteTitle.textContent = "Icono PNG opcional";
    const spriteHelp = document.createElement("p");
    spriteHelp.className = "admin-muted";
    spriteHelp.textContent =
      "Se usa en inventario, HUD y tienda. Si no hay PNG se mantiene el símbolo.";
    const file = document.createElement("input");
    file.type = "file";
    file.accept = "image/png";
    file.addEventListener("change", () => {
      void uploadSprite(entity, file.files?.[0]);
      file.value = "";
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "menu-button";
    remove.textContent = "Quitar icono";
    remove.disabled = !entity.iconUrl;
    remove.addEventListener("click", () => void deleteSprite(entity));
    spriteBox.append(spriteTitle, spriteHelp, file, remove);

    form.append(header, grid, actions);
    if (["resource", "item", "tool", "upgrade"].includes(entity.kind)) {
      form.append(spriteBox);
    }
    return form;
  }

  function collectForm(form) {
    const data = {};
    for (const input of form.querySelectorAll("[name]")) {
      const key = input.name;
      if (input.dataset.json === "1") {
        let value = null;
        try {
          value = input.value.trim() ? JSON.parse(input.value) : null;
        } catch {
          throw new Error(`JSON inválido en ${key}`);
        }
        data[key] = value;
      } else if (input.type === "checkbox") {
        data[key] = input.checked;
      } else if (input.type === "number") {
        data[key] = Number(input.value);
      } else {
        data[key] = input.value;
      }
    }
    return data;
  }

  async function saveEntity(entity) {
    if (busy) {
      return;
    }
    const form = container.querySelector(".admin-content-form");
    if (!form) {
      return;
    }
    busy = true;
    setStatus("Guardando contenido...");
    try {
      const body = collectForm(form);
      await api(
        `/api/admin/content/${encodeURIComponent(entity.kind)}/${encodeURIComponent(entity.id)}`,
        { method: "PUT", body },
      );
      await refresh(entity.kind, entity.id);
      setStatus("Contenido guardado. Recarga el juego para verlo.");
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      busy = false;
      render();
    }
  }

  async function restoreEntity(entity) {
    if (!entity.hasOverride || busy) {
      return;
    }
    busy = true;
    setStatus("Restaurando contenido original...");
    try {
      await api(
        `/api/admin/content/${encodeURIComponent(entity.kind)}/${encodeURIComponent(entity.id)}`,
        { method: "DELETE" },
      );
      await refresh(entity.kind, entity.id);
      setStatus("Contenido restaurado.");
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      busy = false;
      render();
    }
  }

  async function uploadSprite(entity, file) {
    if (!file || busy) {
      return;
    }
    if (!file.type.includes("png")) {
      setStatus("El icono debe ser un PNG.", true);
      return;
    }
    busy = true;
    setStatus("Subiendo icono...");
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("No se pudo leer el PNG."));
        reader.readAsDataURL(file);
      });
      await api(
        `/api/admin/content/${encodeURIComponent(entity.kind)}/${encodeURIComponent(entity.id)}/sprites/0`,
        { method: "PUT", body: { dataUrl } },
      );
      await refresh(entity.kind, entity.id);
      setStatus("Icono guardado. Recarga el juego para verlo.");
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      busy = false;
      render();
    }
  }

  async function deleteSprite(entity) {
    if (!entity.iconUrl || busy) {
      return;
    }
    busy = true;
    setStatus("Quitando icono...");
    try {
      await api(
        `/api/admin/content/${encodeURIComponent(entity.kind)}/${encodeURIComponent(entity.id)}/sprites/0`,
        { method: "DELETE" },
      );
      await refresh(entity.kind, entity.id);
      setStatus("Icono eliminado.");
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      busy = false;
      render();
    }
  }

  async function refresh(kind = activeKind, id = activeId) {
    if (!getToken?.()) {
      setStatus("Introduce la clave para editar contenido.");
      return;
    }
    try {
      const data = await api("/api/admin/content");
      sections = Array.isArray(data?.sections) ? data.sections : [];
      const section = sections.find((entry) => entry.kind === kind) ?? sections[0];
      activeKind = section?.kind ?? "resource";
      const entity =
        section?.items?.find((entry) => entry.id === id) ??
        section?.items?.[0] ??
        null;
      activeId = entity?.id ?? null;
      render();
      const total = sections.reduce(
        (sum, entry) => sum + (entry.items?.length ?? 0),
        0,
      );
      setStatus(`${total} elementos de contenido cargados.`);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-admin-tab]");
    if (button?.dataset.adminTab === "contenido") {
      void refresh();
    }
  });

  const empty = document.createElement("p");
  empty.className = "admin-empty";
  empty.textContent = "Cargando contenido...";
  container.append(empty);

  return {
    refresh,
    open() {
      void refresh();
    },
  };
}
