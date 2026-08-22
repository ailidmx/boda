// ── Thanks Manager panel (CRUD) — AG Grid Community ────────────────────
//
// This module owns the "Gracias" panel: the CRUD table of `thanks` documents
// (guest + localized es/fr/en text), the "create/edit" modal with a searchable
// guest selector (avatar list, debounced full-name search), and the delete
// handler. It is a presentation module — it never touches Firestore directly.
// All persistence flows through the injected `createThanks` / `updateThanks` /
// `deleteThanks` repository functions.
//
// The table is rendered by AG Grid Community via the shared `createAppDataGrid`
// factory (G-002). AG Grid owns sorting, filtering, pinned columns and the
// empty-state overlay; the guest + actions cells use custom renderers, and the
// create/edit/delete handlers are wired once via delegated listeners on the
// stable grid container.

import { createAppDataGrid } from "./data-grid/AppDataGrid.js";
import { dataHtmlRenderer } from "./data-grid/gridRenderers.js";

const LANGS = ["es", "fr", "en"];
const LANG_LABELS = { es: "Español", fr: "Francés", en: "Inglés" };

// Escape HTML in user-provided text so it renders safely in the modal.
// The entity strings are built via concatenation so the literal `"` /
// `&#39;` sequences survive the build (they are NOT HTML-decoded here).
function esc(value) {
  const amp = "&" + "amp;";
  const lt = "&" + "lt;";
  const gt = "&" + "gt;";
  const quot = "&" + "quot;";
  const apos = "&#" + "39;";
  return String(value ?? "")
    .replace(/&/g, amp)
    .replace(/</g, lt)
    .replace(/>/g, gt)
    .replace(/"/g, quot)
    .replace(/'/g, apos);
}

// Normalize a string for accent-insensitive, case-insensitive search.
function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Open the create/edit modal for a thanks document.
 *
 * @param {object} opts
 * @param {object|null} opts.credit — the thanks doc to edit, or null to create.
 * @param {Array} opts.guests — the live guest list (for the selector).
 * @param {Function} opts.guestFullName — (guest) => full name string.
 * @param {Function} opts.guestAvatarUrl — (guest) => avatar URL or "".
 * @param {Function} opts.guestInitials — (guest) => initials string.
 * @param {Function} opts.createThanks — repository create fn.
 * @param {Function} opts.updateThanks — repository update fn.
 * @param {Function} opts.onSaved — callback after a successful save.
 */
export function openThanksModal(opts) {
  const {
    credit,
    guests,
    guestFullName,
    guestAvatarUrl,
    guestInitials,
    createThanks,
    updateThanks,
    onSaved,
  } = opts;

  const isEdit = Boolean(credit);
  const currentGuestId = credit?.guest || "";
  const currentGuest = guests.find((g) => g.id === currentGuestId) || null;

  const overlay = document.createElement("div");
  overlay.className = "dashboard-modal-overlay";
  overlay.innerHTML = `
    <div class="dashboard-modal" style="max-width: 34rem;">
      <div class="dashboard-modal-heading">
        <h3>${isEdit ? "Editar agradecimiento" : "Nuevo agradecimiento"}</h3>
        <button class="dashboard-modal-close" data-modal-close type="button">✕</button>
      </div>
      <form class="dashboard-modal-form" data-thanks-form>
        <div class="dashboard-modal-field">
          <label>Destinatario del agradecimiento</label>
          <div class="dashboard-thanks-guest-row">
            <span class="dashboard-thanks-avatar" data-thanks-avatar-preview>
              ${currentGuest
                ? guestAvatarUrl(currentGuest)
                  ? `<img class="dashboard-avatar" src="${guestAvatarUrl(currentGuest)}" alt="" />`
                  : esc(guestInitials(currentGuest))
                : "👤"}
            </span>
            <div style="flex:1;position:relative;">
              <input type="text" data-thanks-guest-search
                placeholder="Buscar por nombre completo…"
                value="${currentGuest ? esc(guestFullName(currentGuest)) : ""}"
                autocomplete="off" />
              <input type="hidden" data-thanks-guest-id value="${esc(currentGuestId)}" />
              <div data-thanks-guest-results style="position:absolute;top:100%;left:0;right:0;z-index:20;background:#fff;border:1px solid rgba(85,69,45,0.2);border-radius:0.4rem;max-height:14rem;overflow:auto;box-shadow:0 6px 18px rgba(0,0,0,0.12);display:none;"></div>
            </div>
          </div>
          <small style="color:#8a7a5c;">Escribe para filtrar por nombre completo. Debes elegir un invitado.</small>
        </div>

        ${LANGS.map(
          (lang) => `
          <div class="dashboard-modal-field">
            <label>${LANG_LABELS[lang]} (${lang.toUpperCase()})</label>
            <textarea rows="2" data-thanks-lang="${lang}" placeholder="Texto del agradecimiento en ${LANG_LABELS[lang]}…">${esc(credit?.[lang] || "")}</textarea>
          </div>`,
        ).join("")}

        <div class="dashboard-modal-actions">
          <button class="dashboard-button" type="submit">${isEdit ? "Guardar cambios" : "Crear agradecimiento"}</button>
          <button class="dashboard-button dashboard-button-secondary" type="button" data-modal-close>Cancelar</button>
        </div>
        <small data-thanks-status></small>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelectorAll("[data-modal-close]").forEach((btn) => btn.addEventListener("click", close));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  const searchInput = overlay.querySelector("[data-thanks-guest-search]");
  const guestIdInput = overlay.querySelector("[data-thanks-guest-id]");
  const resultsEl = overlay.querySelector("[data-thanks-guest-results]");
  const avatarPreview = overlay.querySelector("[data-thanks-avatar-preview]");

  // ── Debounced guest search ──
  let debounceTimer = null;
  const renderResults = (query) => {
    const q = normalize(query);
    const matches = guests
      .filter((g) => !q || normalize(guestFullName(g)).includes(q))
      .slice(0, 50);
    if (matches.length === 0) {
      resultsEl.innerHTML = '<div style="padding:0.6rem 0.8rem;color:#8a7a5c;">Sin resultados</div>';
      resultsEl.style.display = "block";
      return;
    }
    resultsEl.innerHTML = matches
      .map((g) => {
        const avatar = guestAvatarUrl(g);
        return `
          <button type="button" data-thanks-guest-option="${esc(g.id)}"
            style="display:flex;align-items:center;gap:0.6rem;width:100%;padding:0.5rem 0.8rem;border:0;background:transparent;cursor:pointer;text-align:left;font:inherit;color:#3a2f1e;">
            <span class="dashboard-thanks-avatar" style="width:2rem;height:2rem;font-size:0.85rem;">
              ${avatar ? `<img class="dashboard-avatar" src="${avatar}" alt="" />` : esc(guestInitials(g))}
            </span>
            <span>${esc(guestFullName(g))}</span>
          </button>`;
      })
      .join("");
    resultsEl.style.display = "block";
  };

  const setSelectedGuest = (guest) => {
    guestIdInput.value = guest ? guest.id : "";
    searchInput.value = guest ? guestFullName(guest) : "";
    const avatar = guest ? guestAvatarUrl(guest) : "";
    avatarPreview.innerHTML = guest
      ? avatar
        ? `<img class="dashboard-avatar" src="${avatar}" alt="" />`
        : esc(guestInitials(guest))
      : "👤";
    resultsEl.style.display = "none";
  };

  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => renderResults(searchInput.value), 250);
  });
  searchInput.addEventListener("focus", () => {
    if (!guestIdInput.value) renderResults(searchInput.value);
  });
  resultsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-thanks-guest-option]");
    if (!btn) return;
    const guest = guests.find((g) => g.id === btn.dataset.thanksGuestOption);
    if (guest) setSelectedGuest(guest);
  });
  document.addEventListener("click", (e) => {
    if (!overlay.contains(e.target)) resultsEl.style.display = "none";
  });

  // ── Submit (create or update) ──
  const form = overlay.querySelector("[data-thanks-form]");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const guestId = guestIdInput.value.trim();
    const texts = {};
    LANGS.forEach((lang) => {
      const value = overlay.querySelector(`[data-thanks-lang="${lang}"]`).value.trim();
      if (value) texts[lang] = value;
    });

    const status = overlay.querySelector("[data-thanks-status]");
    if (!guestId) {
      status.textContent = "❌ Debes elegir un destinatario.";
      status.dataset.state = "error";
      return;
    }
    if (Object.keys(texts).length === 0) {
      status.textContent = "❌ Debes escribir el texto en al menos un idioma.";
      status.dataset.state = "error";
      return;
    }

    status.textContent = isEdit ? "Guardando…" : "Creando…";
    status.dataset.state = "working";
    try {
      if (isEdit) {
        await updateThanks(credit.id, { guest: guestId, ...texts });
      } else {
        await createThanks({ guest: guestId, ...texts });
      }
      status.textContent = "✅ Guardado";
      status.dataset.state = "success";
      if (onSaved) onSaved();
      setTimeout(close, 800);
    } catch (err) {
      console.error("Failed to save thanks", err);
      status.textContent = "❌ Error al guardar.";
      status.dataset.state = "error";
    }
  });

  setTimeout(() => searchInput.focus(), 100);
}

/**
 * Render the thanks manager into `[data-thanks-manager]`.
 *
 * @param {object} ctx Injected dependencies (see dashboard.js adapter).
 */
export function renderThanksPanel(ctx) {
  const {
    container,
    thanks, // array of { id, guest, es, fr, en }
    guests, // live guest list
    guestFullName,
    guestAvatarUrl,
    guestInitials,
    createThanks,
    updateThanks,
    deleteThanks,
  } = ctx;

  if (!container) return;

  // Pre-compute per-guest display data (name / avatar / initials) once.
  const guestById = new Map(
    guests.map((g) => [g.id, g]),
  );
  const guestName = (guestId) => {
    const g = guestById.get(guestId);
    return g ? guestFullName(g) : guestId;
  };

  // ── Cell HTML generators ──
  const guestCell = (credit) => {
    const g = guestById.get(credit.guest);
    const name = g ? guestFullName(g) : credit.guest;
    const avatar = g ? guestAvatarUrl(g) : "";
    const initials = g ? guestInitials(g) : "?";
    return `
      <div style="display:flex;align-items:center;gap:0.6rem;">
        <span class="dashboard-thanks-avatar" style="width:2.2rem;height:2.2rem;font-size:0.9rem;">
          ${avatar ? `<img class="dashboard-avatar" src="${avatar}" alt="" />` : esc(initials)}
        </span>
        <div>
          <strong>${esc(name)}</strong>
          <div style="font-size:0.75rem;color:#8a7a5c;">${esc(credit.guest)}</div>
        </div>
      </div>`;
  };

  const actionsCell = (credit) => `
    <div class="dashboard-thanks-actions">
      <button class="dashboard-link-btn" type="button" data-thanks-edit="${esc(credit.id)}" title="Editar">✏️</button>
      <button class="dashboard-link-btn" type="button" data-thanks-delete="${esc(credit.id)}" title="Eliminar">🗑️</button>
    </div>`;

  // Text columns render raw (AG Grid escapes by default); show "—" when empty.
  const langColumn = (lang, label) => ({
    headerName: label,
    colId: lang,
    valueGetter: (p) => p.data?.[lang] || "",
    valueFormatter: (p) => (p.value ? p.value : "—"),
    flex: 1,
    minWidth: 160,
    wrapText: true,
    autoHeight: true,
  });

  const columnDefs = [
    {
      headerName: "Destinatario",
      colId: "guest",
      pinned: "left",
      lockPinned: true,
      width: 260,
      minWidth: 220,
      cellRenderer: dataHtmlRenderer(guestCell),
      valueGetter: (p) => guestName(p.data.guest),
      comparator: (vA, vB) => (vA < vB ? -1 : vA > vB ? 1 : 0),
    },
    langColumn("es", "Español"),
    langColumn("fr", "Francés"),
    langColumn("en", "Inglés"),
    {
      headerName: "Acciones",
      colId: "actions",
      pinned: "right",
      width: 120,
      minWidth: 110,
      cellRenderer: dataHtmlRenderer(actionsCell),
      filter: false,
      sortable: false,
      suppressHeaderMenuButton: false,
    },
  ];

  // ── Stable DOM structure (toolbar + grid element persist across renders) ──
  if (!container.dataset.gridReady) {
    container.innerHTML = `
      <div data-thanks-toolbar></div>
      <div data-thanks-grid></div>
    `;
    container.dataset.gridReady = "1";
  }
  const toolbarEl = container.querySelector("[data-thanks-toolbar]");
  const gridEl = container.querySelector("[data-thanks-grid]");

  toolbarEl.innerHTML = `
    <div style="margin-bottom:1rem;">
      <button class="dashboard-button" type="button" data-thanks-create>+ Nuevo agradecimiento</button>
    </div>
  `;

  // ── Create / update the grid (reuse on re-render) ──
  let grid = container._thanksGrid;
  if (!grid) {
    grid = createAppDataGrid({
      container: gridEl,
      columnDefs,
      rowData: thanks,
      getRowId: (p) => p.data.id,
      overrides: {
        overlayNoRowsTemplate:
          '<span class="dashboard-grid-empty">No hay agradecimientos todavía. Crea uno para que aparezca en la sección "Gracias" de la invitación.</span>',
      },
    });
    container._thanksGrid = grid;
  } else {
    grid.setRowData(thanks);
  }

  // ── Toolbar: create ──
  toolbarEl.querySelector("[data-thanks-create]")?.addEventListener("click", () => {
    openThanksModal({
      credit: null,
      guests,
      guestFullName,
      guestAvatarUrl,
      guestInitials,
      createThanks,
      updateThanks,
      onSaved: () => renderThanksPanel(ctx),
    });
  });

  // ── Grid events (delegated, wired once) ──
  if (!container.dataset.gridWired) {
    container.dataset.gridWired = "1";
    gridEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      if (btn.dataset.thanksEdit) {
        const credit = thanks.find((t) => t.id === btn.dataset.thanksEdit);
        if (!credit) return;
        openThanksModal({
          credit,
          guests,
          guestFullName,
          guestAvatarUrl,
          guestInitials,
          createThanks,
          updateThanks,
          onSaved: () => renderThanksPanel(ctx),
        });
      } else if (btn.dataset.thanksDelete) {
        const credit = thanks.find((t) => t.id === btn.dataset.thanksDelete);
        if (!credit) return;
        const name = guestName(credit.guest);
        if (confirm(`¿Eliminar el agradecimiento de "${name}"? Se quitará de la sección "Gracias" de la invitación.`)) {
          deleteThanks(credit.id)
            .then(() => renderThanksPanel(ctx))
            .catch((err) => {
              console.error("Failed to delete thanks", err);
              alert("Error al eliminar el agradecimiento.");
            });
        }
      }
    });
  }
}