// ── Invitation Groups Panel ────────────────────────────────────────────
//
// This module owns the "Grupos de invitación" panel: it renders the group
// cards (tag colors, custom content, hidden sections), the "create group"
// modal, and the inline save/delete handlers. It is a presentation module —
// it never touches Firestore directly. All persistence flows through the
// injected `createGroup` / `updateGroupField` / `deleteGroup` repository
// functions.

/**
 * Open the "create new group" modal. On success it calls `callback(name)`.
 *
 * @param {Function} [callback] Called with the new group name after creation.
 * @param {object} ctx Injected dependencies (see dashboard.js adapter).
 */
export function openCreateGroupModal(callback, ctx) {
  const { createGroup } = ctx;

  const overlay = document.createElement("div");
  overlay.className = "dashboard-modal-overlay";
  overlay.innerHTML = `
    <div class="dashboard-modal" style="max-width: 28rem;">
      <div class="dashboard-modal-heading">
        <h3>Crear nuevo grupo</h3>
        <button class="dashboard-modal-close" data-modal-close type="button">✕</button>
      </div>
      <form class="dashboard-modal-form" data-create-group-form>
        <div class="dashboard-modal-field">
          <label for="new-group-name">Nombre del grupo</label>
          <input id="new-group-name" name="groupName" type="text" required autofocus
            placeholder="Ej: Familia de David, PetanclubGDL…" />
        </div>
        <div class="dashboard-modal-actions">
          <button class="dashboard-button" type="submit">Crear grupo</button>
          <button class="dashboard-button dashboard-button-secondary" type="button" data-modal-close>Cancelar</button>
        </div>
        <small data-create-group-status></small>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelectorAll("[data-modal-close]").forEach((btn) => {
    btn.addEventListener("click", () => overlay.remove());
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  const form = overlay.querySelector("[data-create-group-form]");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = data.get("groupName")?.trim();
    if (!name) return;

    const status = overlay.querySelector("[data-create-group-status]");
    status.textContent = "Creando…";
    status.dataset.state = "working";

    try {
      await createGroup(name);
      status.textContent = "✅ Grupo creado";

      status.dataset.state = "success";
      if (callback) callback(name);
      setTimeout(() => overlay.remove(), 1000);
    } catch (err) {
      console.error("Failed to create group", err);
      status.textContent = "❌ Error al crear el grupo";
      status.dataset.state = "error";
    }
  });

  // Focus the input
  setTimeout(() => overlay.querySelector("#new-group-name")?.focus(), 100);
}

/**
 * Render the invitation groups panel into `[data-groups-manager]`.
 *
 * @param {object} ctx Injected dependencies (see dashboard.js adapter).
 */
export function renderGroupsPanel(ctx) {
  const { state, createGroup, updateGroupField, deleteGroup } = ctx;

  const container = document.querySelector("[data-groups-manager]");
  if (!container) return;

  const groups = state.invitationGroups;

  container.innerHTML = `
    <div style="margin-bottom:1rem;">
      <button class="dashboard-button" type="button" data-create-group>+ Nuevo grupo</button>
    </div>
    ${groups.length === 0
      ? '<p class="dashboard-empty">No hay grupos personalizados. Crea uno para añadir contenido especial.</p>'
      : `<div class="dashboard-groups-grid">
          ${groups
            .map(
              (g) => {
                const tag = g.tag || {};
                const tagBg = tag.color || "#55452d";
                const tagText = tag.textColor || "#ffffff";
                const tagLabel = tag.label || g.id;
                return `
            <div class="dashboard-group-card" data-group-card="${g.id}">
              <div class="dashboard-group-card-heading" style="background:${tagBg};color:${tagText};">
                <strong>${tagLabel}</strong>
                <button class="dashboard-link-btn" data-delete-group="${g.id}" title="Eliminar grupo" style="color:${tagText};">🗑️</button>
              </div>
              <div class="dashboard-group-card-body">
                <div class="dashboard-modal-field">
                  <label>Etiqueta — Color de fondo</label>
                  <div style="display:flex;gap:0.5rem;align-items:center;">
                    <input type="color" value="${tagBg}"
                      data-group-field="tag.color" data-group-id="${g.id}" style="width:3rem;height:2.2rem;padding:0;border:1px solid rgba(85,69,45,0.2);border-radius:0.4rem;cursor:pointer;" />
                    <input type="text" value="${tagBg}"
                      data-group-field="tag.color" data-group-id="${g.id}" placeholder="#55452d" style="flex:1;" />
                  </div>
                </div>
                <div class="dashboard-modal-field">
                  <label>Etiqueta — Color de texto</label>
                  <div style="display:flex;gap:0.5rem;align-items:center;">
                    <input type="color" value="${tagText}"
                      data-group-field="tag.textColor" data-group-id="${g.id}" style="width:3rem;height:2.2rem;padding:0;border:1px solid rgba(85,69,45,0.2);border-radius:0.4rem;cursor:pointer;" />
                    <input type="text" value="${tagText}"
                      data-group-field="tag.textColor" data-group-id="${g.id}" placeholder="#ffffff" style="flex:1;" />
                  </div>
                </div>
                <div class="dashboard-modal-field">
                  <label>Etiqueta — Texto visible</label>
                  <input type="text" value="${tagLabel}"
                    data-group-field="tag.label" data-group-id="${g.id}" placeholder="${g.id}" />
                </div>
                <hr style="border:0;border-top:1px solid rgba(85,69,45,0.12);margin:0.25rem 0;" />
                <div class="dashboard-modal-field">
                  <label>Saludo personalizado (HTML)</label>
                  <input type="text" value="${(g.customContent?.greeting || "").replace(/"/g, "&#34;")}"
                    data-group-field="greeting" data-group-id="${g.id}" placeholder="Ej: ¡Bienvenidos, familia!" />
                </div>
                <div class="dashboard-modal-field">
                  <label>Mensaje personalizado (HTML)</label>
                  <textarea rows="2" data-group-field="message" data-group-id="${g.id}" placeholder="Ej: Les tenemos una sorpresa preparada…">${g.customContent?.message || ""}</textarea>
                </div>
                <div class="dashboard-modal-field">
                  <label>Sección extra (HTML)</label>
                  <textarea rows="3" data-group-field="section" data-group-id="${g.id}" placeholder="Ej: <div><h3>Nota especial</h3><p>...</p></div>">${g.customContent?.section || ""}</textarea>
                </div>
                <div class="dashboard-modal-field">
                  <label>Secciones a ocultar (IDs separados por coma)</label>
                  <input type="text" value="${(g.customContent?.hideSections || []).join(", ")}"
                    data-group-field="hideSections" data-group-id="${g.id}" placeholder="Ej: schedule, gift" />
                </div>
                <small data-group-status="${g.id}" style="color:#4caf50;font-size:0.8rem;"></small>
              </div>
            </div>`;}
            )
            .join("")}
          </div>`
    }
  `;

  // ── Create new group ──
  container.querySelector("[data-create-group]")?.addEventListener("click", () => {
    openCreateGroupModal(null, ctx);
  });

  // ── Inline save on change ──
  container.querySelectorAll("[data-group-field]").forEach((el) => {
    const save = async () => {
      const groupId = el.dataset.groupId;
      const field = el.dataset.groupField;
      const status = container.querySelector(`[data-group-status="${groupId}"]`);
      let value;
      if (field === "hideSections") {
        value = el.value.split(",").map((s) => s.trim()).filter(Boolean);
      } else {
        value = el.value;
      }
      try {
        // Tag fields are at root level (tag.color, tag.textColor, tag.label)
        // Custom content fields are under customContent.*
        const isTagField = field.startsWith("tag.");
        const docField = isTagField ? field : `customContent.${field}`;
        await updateGroupField(groupId, docField, value);

        if (status) {

          status.textContent = "✅ Guardado";
          setTimeout(() => { if (status) status.textContent = ""; }, 2000);
        }
      } catch (err) {
        console.error("Failed to save group field", err);
        if (status) {
          status.textContent = "❌ Error";
          status.style.color = "#a0352c";
          setTimeout(() => { if (status) status.style.color = "#4caf50"; }, 2000);
        }
      }
    };
    el.addEventListener("change", save);
    el.addEventListener("blur", save);
  });

  // ── Delete group ──
  container.querySelectorAll("[data-delete-group]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const groupId = btn.dataset.deleteGroup;
      if (confirm(`¿Eliminar el grupo "${groupId}"? Esto no afecta a los invitados asignados a este grupo.`)) {
        deleteGroup(groupId).catch((err) => {

          console.error("Failed to delete group", err);
          alert("Error al eliminar el grupo.");
        });
      }

    });
  });
}
