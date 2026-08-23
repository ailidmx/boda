// ── Card Votes panel — grouped rating view (Música / Comida / Guisos) ──
//
// A FREE, grouped rating list (no AG Grid). AG Grid 36's built-in `rowGroup`
// is an ENTERPRISE feature (`RowGroupingModule` is listed under
// `EnterpriseModuleName`), and this dashboard is Community-only, so we render
// the grouping ourselves with native `<details>` elements. That directly
// satisfies the product requirement:
//
//   - three sub-tabs: Música / Comida / Guisos
//   - groups (cards) sorted by AVERAGE rating, highest → lowest
//   - each group header shows: card name + ★ average (1 decimal) + vote count
//   - expanding a group reveals each vote (avatar + full name + stars + the
//     numeric rating + a human "Actualizado" timestamp), best → worst
//
// Presentation only — it receives already-loaded votes + guest resolvers and
// never touches Firestore.

const TYPES = [
  { id: "music", label: "Música" },
  { id: "food", label: "Comida" },
  { id: "guiso", label: "Guisos" },
];

let activeType = "music"; // persisted across re-renders within the session
let expandedCards = new Set(); // cards the admin expanded, preserved on re-render

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
 * Render the grouped card-votes list into `container`.
 *
 * @param {object} ctx {
 *   container,
 *   votes: Array<{ id, cardType, cardKey, guestId, rating, updatedAt }>,
 *   guests: Array<normalized guest>,
 *   guestAvatarUrl, guestFullName, guestInitials,
 * }
 */
export function renderCardVotesPanel(ctx) {
  const { container, votes, guests, guestAvatarUrl, guestFullName, guestInitials } = ctx;
  if (!container) return;

  const guestById = new Map(guests.map((g) => [g.id, g]));

  const votesForType = (votes || []).filter((v) => v.cardType === activeType);

  // Aggregate per card: average + the sorted votes.
  const byCard = new Map();
  for (const v of votesForType) {
    if (!byCard.has(v.cardKey)) byCard.set(v.cardKey, []);
    byCard.get(v.cardKey).push(v);
  }

  const cards = [...byCard.entries()]
    .map(([cardKey, list]) => {
      // Sort each card's votes best → worst (then newest, then stable id).
      const sorted = list.slice().sort((a, b) => {
        const r = (Number(b.rating) || 0) - (Number(a.rating) || 0);
        if (r !== 0) return r;
        return String(a.id).localeCompare(String(b.id));
      });
      const total = sorted.reduce((sum, v) => sum + (Number(v.rating) || 0), 0);
      const avg = total / sorted.length;
      return { cardKey, avg, count: sorted.length, votes: sorted };
    })
    // Cards sorted by AVERAGE rating, highest → lowest.
    .sort((a, b) => {
      if (b.avg !== a.avg) return b.avg - a.avg;
      return a.cardKey.localeCompare(b.cardKey);
    });

  const voteRow = (v) => {
    const guest = guestById.get(v.guestId);
    const name = guest ? guestFullName(guest) : v.guestId || "—";
    const avatar = guest ? guestAvatarUrl(guest) : "";
    const initials = guest ? guestInitials(guest) : "?";
    return `
      <li class="cardvotes-vote">
        <span class="cardvotes-avatar">
          ${avatar ? `<img src="${esc(avatar)}" alt=""/>` : esc(initials)}
        </span>
        <span class="cardvotes-name" title="${esc(name)}">${esc(name)}</span>
        <span class="cardvotes-stars" aria-hidden="true" title="${esc(starString(v.rating))}">${esc(starString(v.rating))}</span>
        <span class="cardvotes-rating-num">${esc(String(Number(v.rating) || 0))}</span>
        <span class="cardvotes-updated">${esc(formatUpdated(v.updatedAt))}</span>
      </li>`;
  };

  const cardBlock = ({ cardKey, avg, count, votes }) => {
    const open = expandedCards.has(cardKey) ? "open" : "";
    return `
      <details class="cardvotes-card" data-card="${esc(cardKey)}" ${open}>
        <summary class="cardvotes-card-summary">
          <span class="cardvotes-card-name">${esc(cardKey)}</span>
          <span class="cardvotes-card-avg" title="Calificación promedio">
            <span class="cardvotes-stars" aria-hidden="true">${esc(starString(avg))}</span>
            <span class="cardvotes-avg-num">${esc((Math.round(avg * 10) / 10).toFixed(1))}</span>
          </span>
          <span class="cardvotes-card-count">(${count})</span>
        </summary>
        <ul class="cardvotes-votes">${votes.map(voteRow).join("")}</ul>
      </details>`;
  };

  // ── Stable DOM structure ──
  container.innerHTML = `
    <div class="dashboard-analytics-subnav" data-cardvotes-tabs></div>
    <div class="cardvotes-list">${cards.map(cardBlock).join("") || '<p class="dashboard-grid-empty">Aún no hay votos para esta categoría.</p>'}</div>
  `;

  const tabsEl = container.querySelector("[data-cardvotes-tabs]");
  tabsEl.innerHTML = TYPES.map(
    ({ id, label }) => `
    <button
      class="dashboard-button ${id === activeType ? "dashboard-button" : "dashboard-button-secondary"}"
      type="button"
      data-cardvotes-tab="${id}"
      aria-pressed="${id === activeType}"
    >${label}</button>`,
  ).join("");

  tabsEl.querySelectorAll("[data-cardvotes-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.cardvotesTab === activeType) return;
      activeType = btn.dataset.cardvotesTab;
      renderCardVotesPanel(ctx);
    });
  });

  // Preserve expand/collapse state across re-renders.
  container.querySelectorAll(".cardvotes-card").forEach((details) => {
    const cardKey = details.dataset.card;
    details.addEventListener("toggle", () => {
      if (details.open) expandedCards.add(cardKey);
      else expandedCards.delete(cardKey);
    });
  });
}