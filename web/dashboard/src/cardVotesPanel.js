// ── Card Votes panel — grouped rating view (Música / Comida / Guisos) ──
//
// Replaces the flat generic data table for the `card_votes` collection. Instead
// of one big flat grid with a "tipo" column and a raw id, this renders a
// BUTTON-GROUP sub-nav switching between MÚSICA / COMIDA / GUISOS, and each view
// is an AG Grid Community table GROUPED by card:
//
//   - Group row     → "CARD" + average rating (★) + vote count, expand/collapse.
//   - Leaf row      → avatar + full guest name, their rating, and a human
//                     "Actualizado" timestamp.
//
// Groups are ordered by AVERAGE rating (high → low) and leaves within a group
// are ordered best → worst. Persistence/logic stay out of this module: it is a
// pure presentation module that receives already-loaded votes + guest resolvers
// and delegates nothing to Firestore.

import { createAppDataGrid } from "./data-grid/AppDataGrid.js";
import { dataHtmlRenderer } from "./data-grid/gridRenderers.js";

// Card type ↔ human label + the cardType value stored on each vote doc.
const TYPES = [
  { id: "music", label: "Música" },
  { id: "food", label: "Comida" },
  { id: "guiso", label: "Guisos" },
];

let activeType = "music"; // persisted across re-renders within the session

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

// Human "Actualizado" timestamp: "19 ago 2026, 21:07" (Mexico City, es-MX).
function formatUpdated(value) {
  if (!value) return "—";
  let date;
  try {
    if (value && typeof value === "object" && typeof value.toDate === "function") {
      date = value.toDate();
    } else if (value && typeof value === "object" && value.seconds != null) {
      date = new Date(value.seconds * 1000);
    } else {
      date = new Date(value);
    }
  } catch {
    date = null;
  }
  if (!date || Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function starString(rating) {
  const n = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return "★".repeat(n);
}

/**
 * Render the card-votes panel into `container`.
 *
 * @param {object} ctx {
 *   container, votes (array of { id, cardType, cardKey, guestId, rating, updatedAt }),
 *   guests (array of normalized guests from getActiveGuests()),
 *   guestAvatarUrl, guestFullName, guestInitials,
 * }
 */
export function renderCardVotesPanel(ctx) {
  const { container, votes, guests, guestAvatarUrl, guestFullName, guestInitials } = ctx;
  if (!container) return;

  // Guest id → guest record, for the avatar/name cells.
  const guestById = new Map(guests.map((g) => [g.id, g]));

  const votesForType = (votes || []).filter((v) => v.cardType === activeType);

  // Average rating per card (for the group header).
  const avgByCard = new Map();
  for (const v of votesForType) {
    const cur = avgByCard.get(v.cardKey) || { total: 0, count: 0 };
    cur.total += Number(v.rating) || 0;
    cur.count += 1;
    avgByCard.set(v.cardKey, cur);
  }

  const avgOf = (cardKey) => {
    const a = avgByCard.get(cardKey);
    if (!a || !a.count) return 0;
    return a.total / a.count;
  };

  // ── Build + order rows: groups by avg desc, then leaves by rating desc ──
  const rows = votesForType
    .slice()
    .sort((a, b) => {
      const avgA = avgOf(a.cardKey);
      const avgB = avgOf(b.cardKey);
      if (avgB !== avgA) return avgB - avgA; // group: best avg first
      if (a.cardKey !== b.cardKey) return a.cardKey.localeCompare(b.cardKey);
      // within the same card: best rating first, then newest, then stable id
      const r = (Number(b.rating) || 0) - (Number(a.rating) || 0);
      if (r !== 0) return r;
      return String(a.id).localeCompare(String(b.id));
    })
    .map((v) => ({
      id: v.id,
      cardKey: v.cardKey,
      guestId: v.guestId,
      rating: Number(v.rating) || 0,
      updatedAt: v.updatedAt,
    }));

  // ── Cell generators ──
  const invitadoCell = (data) => {
    const guest = guestById.get(data.guestId);
    const name = guest ? guestFullName(guest) : data.guestId || "—";
    const avatar = guest ? guestAvatarUrl(guest) : "";
    const initials = guest ? guestInitials(guest) : "?";
    return `
      <div class="cardvotes-invitado">
        <span class="cardvotes-avatar">
          ${avatar ? `<img src="${esc(avatar)}" alt=""/>` : esc(initials)}
        </span>
        <span class="cardvotes-name">${esc(name)}</span>
      </div>`;
  };

  const ratingCell = (data) => `
    <span class="cardvotes-rating" title="${esc(starString(data.rating))}">
      <span class="cardvotes-stars" aria-hidden="true">${esc(starString(data.rating))}</span>
      <span class="cardvotes-rating-num">${esc(String(data.rating))}</span>
    </span>`;

  const updatedCell = (data) => `
    <span class="cardvotes-updated">${esc(formatUpdated(data.updatedAt))}</span>`;

  // Group header content: "Card  ★ 4.5  (12)". `value` is the cardKey.
  const groupInnerRenderer = (params) => {
    const cardKey = params.value;
    const avg = avgOf(cardKey);
    const count = params.node?.allLeafChildren?.length ?? avgByCard.get(cardKey)?.count ?? 0;
    return `
      <span class="cardvotes-card-head">
        <span class="cardvotes-card-name">${esc(cardKey)}</span>
        <span class="cardvotes-card-avg" title="Calificación promedio">
          <span class="cardvotes-stars" aria-hidden="true">${esc(starString(avg))}</span>
          <span class="cardvotes-avg-num">${esc((Math.round(avg * 10) / 10).toFixed(1))}</span>
        </span>
        <span class="cardvotes-card-count">(${count})</span>
      </span>`;
  };

  const columnDefs = [
    // CARD — grouped (hidden as a value column; shown as the group column).
    { headerName: "Card", field: "cardKey", rowGroup: true, hide: true },
    {
      headerName: "Invitado",
      field: "guestId",
      pinned: "left",
      width: 240,
      minWidth: 180,
      sortable: false,
      cellRenderer: dataHtmlRenderer(invitadoCell),
      valueGetter: (p) => {
        const g = guestById.get(p.data?.guestId);
        return g ? guestFullName(g) : p.data?.guestId || "";
      },
    },
    {
      headerName: "Rating",
      field: "rating",
      width: 140,
      minWidth: 120,
      sortable: false,
      cellRenderer: dataHtmlRenderer(ratingCell),
    },
    {
      headerName: "Actualizado",
      field: "updatedAt",
      width: 180,
      minWidth: 150,
      sortable: false,
      cellRenderer: dataHtmlRenderer(updatedCell),
      valueGetter: (p) => formatUpdated(p.data?.updatedAt),
    },
  ];

  // ── Stable DOM structure (tab bar + grid element persist across renders) ──
  if (!container.dataset.gridReady) {
    container.innerHTML = `
      <div class="dashboard-analytics-subnav" data-cardvotes-tabs></div>
      <div data-cardvotes-grid></div>
    `;
    container.dataset.gridReady = "1";
  }
  const tabsEl = container.querySelector("[data-cardvotes-tabs]");
  const gridEl = container.querySelector("[data-cardvotes-grid]");

  // ── Tab bar ──
  tabsEl.innerHTML = TYPES.map(
    ({ id, label }) => `
    <button
      class="dashboard-button ${id === activeType ? "dashboard-button" : "dashboard-button-secondary"}"
      type="button"
      data-cardvotes-tab="${id}"
      aria-pressed="${id === activeType}"
    >${label}</button>`,
  ).join("");

  // ── Grid (recreate on tab change because grouping shape changes) ──
  container._grid?.destroy();
  container._grid = null;

  const grid = createAppDataGrid({
    container: gridEl,
    columnDefs,
    rowData: rows,
    getRowId: (p) => p.data.id,
    overrides: {
      rowHeight: 48,
      groupDefaultExpanded: -1, // all groups expanded by default
      groupDisplayType: "groupRows",
      suppressAggFuncInHeader: true,
      autoGroupColumnDef: {
        headerName: "Card",
        pinned: "left",
        minWidth: 240,
        width: 280,
        cellRenderer: "agGroupCellRenderer",
        cellRendererParams: {
          innerRenderer: groupInnerRenderer,
          suppressCount: true,
        },
      },
      overlayNoRowsTemplate:
        '<span class="dashboard-grid-empty">Aún no hay votos para esta categoría.</span>',
    },
  });
  container._grid = grid;

  // ── Tab switching (wired fresh each render) ──
  tabsEl.querySelectorAll("[data-cardvotes-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.cardvotesTab === activeType) return;
      activeType = btn.dataset.cardvotesTab;
      renderCardVotesPanel(ctx);
    });
  });
}