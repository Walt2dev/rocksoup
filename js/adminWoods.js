import { BIOMES } from "./world/biomes.js";
import {
  WOOD_RENDER_MODES,
  WOOD_REALMS,
  normalizeWoodStyle,
} from "./world/woods.js";
import { createTreeSpriteFromStyle } from "./render/treeSprites.js";

const REALM_LABELS = {
  surface: "Superficie",
  underground: "Subsuelo",
  sky: "Cielo",
};

const DEFAULT_STYLE = {
  shape: "tree",
  trunk: "#5a3e2a",
  branch: "#6d4d33",
  leaves: ["#3d7138", "#4d8644", "#619d56"],
  highlight: "#7db56a",
  angle: 25,
  branchScale: 0.72,
  trunkLength: 7.5,
  iterations: 3,
  leafScale: 1.18,
  leafAspectX: 1,
  leafAspectY: 0.9,
  clusters: 4,
};

function el(id) {
  return document.getElementById(id);
}

function biomeLabel(biomeId) {
  const biome = BIOMES[Number(biomeId)];
  return biome ? biome.name : "Sin bioma";
}

export function initWoodsAdmin({ getToken } = {}) {
  const listNode = el("admin-woods-list");
  const editorNode = el("admin-woods-editor");
  const statusNode = el("admin-woods-status");
  if (!listNode || !editorNode) {
    return { refresh: () => {} };
  }

  let woods = [];
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

  function renderList() {
    listNode.replaceChildren();
    const newButton = document.createElement("button");
    newButton.type = "button";
    newButton.className = "menu-button primary admin-woods-new";
    newButton.textContent = "Nueva madera";
    newButton.addEventListener("click", () => openNew());
    listNode.append(newButton);

    if (woods.length === 0) {
      const empty = document.createElement("p");
      empty.className = "admin-empty";
      empty.textContent = "Todavía no hay maderas.";
      listNode.append(empty);
      return;
    }

    for (const wood of woods) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "admin-woods-item";
      button.classList.toggle("is-active", wood.id === activeId);
      const title = document.createElement("strong");
      title.textContent = wood.name;
      const meta = document.createElement("span");
      meta.textContent = `${REALM_LABELS[wood.realm] ?? wood.realm} · ${
        wood.biomeId === null ? "sin bioma" : biomeLabel(wood.biomeId)
      }${wood.active ? "" : " · oculta"}`;
      button.append(title, meta);
      button.addEventListener("click", () => openWood(wood));
      listNode.append(button);
    }
  }

  function realmBiomes(realm) {
    if (realm === "underground") {
      return BIOMES.filter((biome) => biome.key === "cave_floor");
    }
    if (realm === "sky") {
      return BIOMES.filter((biome) => biome.key === "cloud");
    }
    return BIOMES.filter(
      (biome) =>
        !["cave_floor", "cave_wall", "cloud", "void", "gold_path"].includes(
          biome.key,
        ),
    );
  }

  function buildEditor() {
    editorNode.innerHTML = `
      <div class="admin-woods-form-grid">
        <label>ID<input id="wood-id" maxlength="48" spellcheck="false" /></label>
        <label>Nombre<input id="wood-name" maxlength="80" /></label>
        <label>Reino<select id="wood-realm"></select></label>
        <label>Bioma<select id="wood-biome"></select></label>
        <label>Render<select id="wood-render"></select></label>
        <label>Densidad<input id="wood-density" type="number" min="0.1" max="2" step="0.05" /></label>
        <label class="admin-woods-check"><input id="wood-active" type="checkbox" /> Activa</label>
      </div>
      <h3>Forma y colores</h3>
      <div class="admin-woods-form-grid">
        <label>Forma<select id="wood-shape"><option value="tree">Árbol</option><option value="cactus">Cactus</option><option value="mushroom">Hongo</option></select></label>
        <label>Tronco<input id="wood-trunk" type="color" /></label>
        <label>Ramas<input id="wood-branch" type="color" /></label>
        <label>Brillo<input id="wood-highlight" type="color" /></label>
        <label>Hojas 1<input id="wood-leaf-0" type="color" /></label>
        <label>Hojas 2<input id="wood-leaf-1" type="color" /></label>
        <label>Hojas 3<input id="wood-leaf-2" type="color" /></label>
        <label>Ángulo<input id="wood-angle" type="number" min="4" max="60" step="1" /></label>
        <label>Ramas %<input id="wood-branch-scale" type="number" min="0.4" max="0.95" step="0.01" /></label>
        <label>Tronco<input id="wood-trunk-length" type="number" min="3" max="16" step="0.1" /></label>
        <label>Iteraciones<input id="wood-iterations" type="number" min="1" max="5" step="1" /></label>
        <label>Hojas tamaño<input id="wood-leaf-scale" type="number" min="0.3" max="2.5" step="0.05" /></label>
        <label>Aspecto X<input id="wood-aspect-x" type="number" min="0.3" max="2" step="0.05" /></label>
        <label>Aspecto Y<input id="wood-aspect-y" type="number" min="0.3" max="2" step="0.05" /></label>
        <label>Racimos<input id="wood-clusters" type="number" min="1" max="8" step="1" /></label>
      </div>
      <div class="admin-woods-preview">
        <canvas id="wood-preview" width="240" height="280"></canvas>
        <div id="wood-sprite-grid" class="admin-woods-sprites"></div>
      </div>
      <div class="admin-woods-actions">
        <button id="wood-save" class="menu-button primary" type="button">Guardar</button>
        <button id="wood-delete" class="menu-button danger" type="button">Ocultar</button>
      </div>
    `;

    const realmSelect = el("wood-realm");
    realmSelect.replaceChildren(
      ...WOOD_REALMS.map((realm) => {
        const option = document.createElement("option");
        option.value = realm;
        option.textContent = REALM_LABELS[realm] ?? realm;
        return option;
      }),
    );
    const renderSelect = el("wood-render");
    renderSelect.replaceChildren(
      ...WOOD_RENDER_MODES.map((mode) => {
        const option = document.createElement("option");
        option.value = mode;
        option.textContent = mode === "sprite" ? "Sprite PNG" : "Procedural";
        return option;
      }),
    );

    for (const input of editorNode.querySelectorAll("input, select")) {
      input.addEventListener("input", () => renderPreview());
      input.addEventListener("change", () => renderPreview());
    }
    realmSelect.addEventListener("change", () => {
      updateBiomes();
      renderPreview();
    });
    el("wood-save").addEventListener("click", () => void saveWood());
    el("wood-delete").addEventListener("click", () => void hideWood());
  }

  function updateBiomes() {
    const realm = el("wood-realm").value;
    const select = el("wood-biome");
    const current = select.value;
    const options = realmBiomes(realm);
    select.replaceChildren(
      ...options.map((biome) => {
        const option = document.createElement("option");
        option.value = String(biome.id);
        option.textContent = biome.name;
        return option;
      }),
    );
    const noBiome = document.createElement("option");
    noBiome.value = "";
    noBiome.textContent = "Sin bioma (solo biblioteca)";
    select.append(noBiome);
    if (options.some((biome) => String(biome.id) === current)) {
      select.value = current;
    }
  }

  function readStyle() {
    return normalizeWoodStyle({
      shape: el("wood-shape").value,
      trunk: el("wood-trunk").value,
      branch: el("wood-branch").value,
      highlight: el("wood-highlight").value,
      leaves: [
        el("wood-leaf-0").value,
        el("wood-leaf-1").value,
        el("wood-leaf-2").value,
      ],
      angle: Number(el("wood-angle").value),
      branchScale: Number(el("wood-branch-scale").value),
      trunkLength: Number(el("wood-trunk-length").value),
      iterations: Number(el("wood-iterations").value),
      leafScale: Number(el("wood-leaf-scale").value),
      leafAspectX: Number(el("wood-aspect-x").value),
      leafAspectY: Number(el("wood-aspect-y").value),
      clusters: Number(el("wood-clusters").value),
    });
  }

  function renderPreview() {
    const canvas = el("wood-preview");
    if (!canvas) {
      return;
    }
    let sprite = null;
    try {
      sprite = createTreeSpriteFromStyle(
        readStyle(),
        0,
        "admin-woods-preview",
        el("wood-id").value || "preview",
      );
    } catch {
      sprite = null;
    }
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!sprite) {
      return;
    }
    const scale = Math.min(
      (canvas.width - 20) / sprite.width,
      (canvas.height - 20) / sprite.height,
    );
    const width = sprite.width * scale;
    const height = sprite.height * scale;
    ctx.drawImage(
      sprite.canvas,
      (canvas.width - width) / 2,
      canvas.height - height - 10,
      width,
      height,
    );
  }

  function renderSpriteGrid(wood) {
    const container = el("wood-sprite-grid");
    if (!container) {
      return;
    }
    container.replaceChildren();
    for (let variant = 0; variant < 6; variant += 1) {
      const card = document.createElement("div");
      card.className = "admin-woods-sprite";
      const label = document.createElement("span");
      label.textContent = `Variante ${variant + 1}`;
      const preview = document.createElement("div");
      preview.className = "admin-woods-sprite-preview";
      const url = wood?.spriteUrls?.[variant];
      if (url) {
        const image = document.createElement("img");
        image.src = url;
        image.alt = "";
        preview.append(image);
      }
      const file = document.createElement("input");
      file.type = "file";
      file.accept = "image/png";
      file.addEventListener("change", () => {
        void uploadSprite(variant, file.files?.[0]);
        file.value = "";
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "admin-woods-sprite-remove";
      remove.textContent = "Quitar PNG";
      remove.disabled = !url;
      remove.addEventListener("click", () => void deleteSprite(variant));
      card.append(label, preview, file, remove);
      container.append(card);
    }
  }

  function fillForm(wood) {
    activeId = wood?.id ?? null;
    const style = normalizeWoodStyle(wood?.style ?? DEFAULT_STYLE);
    el("wood-id").value = wood?.id ?? "";
    el("wood-id").disabled = Boolean(wood);
    el("wood-name").value = wood?.name ?? "";
    el("wood-realm").value = wood?.realm ?? "surface";
    updateBiomes();
    el("wood-biome").value =
      wood?.biomeId === null || wood?.biomeId === undefined
        ? ""
        : String(wood.biomeId);
    el("wood-render").value = wood?.renderMode ?? "procedural";
    el("wood-density").value = String(wood?.density ?? 1);
    el("wood-active").checked = wood?.active !== false;
    el("wood-shape").value = style.shape;
    el("wood-trunk").value = style.trunk;
    el("wood-branch").value = style.branch;
    el("wood-highlight").value = style.highlight;
    el("wood-leaf-0").value = style.leaves[0] ?? DEFAULT_STYLE.leaves[0];
    el("wood-leaf-1").value = style.leaves[1] ?? DEFAULT_STYLE.leaves[1];
    el("wood-leaf-2").value = style.leaves[2] ?? DEFAULT_STYLE.leaves[2];
    el("wood-angle").value = String(style.angle);
    el("wood-branch-scale").value = String(style.branchScale);
    el("wood-trunk-length").value = String(style.trunkLength);
    el("wood-iterations").value = String(style.iterations);
    el("wood-leaf-scale").value = String(style.leafScale);
    el("wood-aspect-x").value = String(style.leafAspectX);
    el("wood-aspect-y").value = String(style.leafAspectY);
    el("wood-clusters").value = String(style.clusters);
    renderPreview();
    renderSpriteGrid(wood);
    renderList();
  }

  function openNew() {
    fillForm(null);
    setStatus("Nueva madera: asigna un bioma y guarda.");
  }

  function openWood(wood) {
    fillForm(wood);
    setStatus(`Editando ${wood.name}.`);
  }

  function collectPayload() {
    return {
      id: el("wood-id").value.trim(),
      name: el("wood-name").value.trim(),
      realm: el("wood-realm").value,
      biomeId: el("wood-biome").value === "" ? null : Number(el("wood-biome").value),
      renderMode: el("wood-render").value,
      density: Number(el("wood-density").value),
      active: el("wood-active").checked,
      style: readStyle(),
    };
  }

  async function saveWood() {
    if (busy) {
      return;
    }
    busy = true;
    setStatus("Guardando madera...");
    try {
      const payload = collectPayload();
      const data = activeId
        ? await api(`/api/admin/woods/${encodeURIComponent(activeId)}`, {
            method: "PUT",
            body: payload,
          })
        : await api("/api/admin/woods", { method: "POST", body: payload });
      await refresh(data.wood?.id);
      setStatus("Madera guardada. Recarga el juego para verla.");
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      busy = false;
    }
  }

  async function hideWood() {
    if (!activeId) {
      setStatus("Selecciona una madera para ocultarla.", true);
      return;
    }
    if (!window.confirm(`¿Ocultar "${activeId}"? Dejará de generarse pero se conservará para mundos antiguos.`)) {
      return;
    }
    busy = true;
    try {
      await api(`/api/admin/woods/${encodeURIComponent(activeId)}`, {
        method: "DELETE",
      });
      await refresh();
      setStatus("Madera oculta. Recarga el juego para aplicar el cambio.");
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      busy = false;
    }
  }

  async function uploadSprite(variant, file) {
    if (!activeId || !file) {
      setStatus("Guarda la madera antes de subir sprites.", true);
      return;
    }
    if (!file.type.includes("png")) {
      setStatus("El sprite debe ser un PNG.", true);
      return;
    }
    busy = true;
    setStatus(`Subiendo variante ${variant + 1}...`);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("No se pudo leer el PNG."));
        reader.readAsDataURL(file);
      });
      await api(
        `/api/admin/woods/${encodeURIComponent(activeId)}/sprites/${variant}`,
        { method: "PUT", body: { dataUrl } },
      );
      await refresh(activeId);
      setStatus("Sprite guardado. Recarga el juego para verlo.");
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      busy = false;
    }
  }

  async function deleteSprite(variant) {
    if (!activeId) {
      return;
    }
    busy = true;
    try {
      await api(
        `/api/admin/woods/${encodeURIComponent(activeId)}/sprites/${variant}`,
        { method: "DELETE" },
      );
      await refresh(activeId);
      setStatus("Sprite eliminado.");
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      busy = false;
    }
  }

  async function refresh(selectId = activeId) {
    if (!getToken?.()) {
      setStatus("Introduce la clave para editar maderas.");
      return;
    }
    try {
      const data = await api("/api/admin/woods");
      woods = Array.isArray(data?.woods) ? data.woods : [];
      const selected =
        woods.find((entry) => entry.id === selectId) ??
        woods.find((entry) => entry.id === activeId) ??
        woods[0] ??
        null;
      if (selected) {
        fillForm(selected);
      } else {
        openNew();
      }
      renderList();
      setStatus(`${woods.length} maderas cargadas.`);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  buildEditor();
  openNew();
  renderList();

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-admin-tab]");
    if (button?.dataset.adminTab === "maderas") {
      void refresh();
    }
  });

  return { refresh };
}
