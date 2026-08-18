// ── Dashboard summary cards ────────────────────────────────────────────
//
// Renders the top attendance summary cards (Viernes / Sábado / Domingo) from
// the LIVE `guests` collection via `computeDayConfirmations()`. This is a pure
// presentation module — it renders DOM but never touches Firestore directly.
// The live-derived helper is injected so this module stays decoupled from the
// dashboard's mutable state and live listeners.
//
// The legacy "Alojamiento / Viajes / Petanca" cards were removed: they read
// from the dead `rsvp_submissions` / `petanque_participation` collections that
// the app no longer writes (answers now live on the `guests` doc), so they
// always showed 0.

// ── Helpers ────────────────────────────────────────────────────────────

function make(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function summaryCard(label, value, detail) {
  const article = make("article", "dashboard-summary-card");
  article.append(
    make("span", "", label),
    make("strong", "", String(value)),
    make("small", "", detail),
  );
  return article;
}

/**
 * Re-render the attendance summary cards from the live `guests` collection.
 *
 * @param {object} ctx Injected dependencies (see dashboard.js adapter).
 * @param {() => {friday: number, saturday: number, sunday: number}} ctx.computeDayConfirmations
 *   Live-derived helper that aggregates `rsvp.answers` scale levels (≥ 4 = confirmed).
 */
export function renderSummary(ctx) {
  const { computeDayConfirmations } = ctx;
  const summary = document.querySelector("[data-dashboard-summary]");
  if (!summary) return;

  const dayCounts = computeDayConfirmations();
  summary.replaceChildren(
    summaryCard("Viernes", dayCounts.friday, "Confirmados (nivel ≥ 4)"),
    summaryCard("Sábado", dayCounts.saturday, "Confirmados (nivel ≥ 4)"),
    summaryCard("Domingo", dayCounts.sunday, "Confirmados (nivel ≥ 4)"),
  );
}
