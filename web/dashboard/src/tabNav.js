/**
 * tabNav.js — the dashboard's sub-page tab navigation (routing + tab bar).
 *
 * This is a PRESENTATION module: it owns the URL-path ↔ tab-id mapping, the
 * active-tab state, the tab bar rendering, and the DOM class toggling that
 * shows/hides panels. It contains no Firestore access and no business rules.
 *
 * The module keeps its own `activeTab` state (instead of reading the dashboard's
 * `state` object) so it is self-contained and testable. `dashboard.js` reads the
 * current tab via `getActiveTab()` when it needs it.
 *
 * The tab bar is rendered as a row of BUTTONS (one per section). The active
 * button gets the `dashboard-tab-active` class so it stands out. Each button
 * shows an icon + label.
 */

/** Map URL path segments to internal tab IDs. */
const PATH_TO_TAB = {
  invitados: "guests",
  charts: "charts",
  cabins: "cabins",
  tables: "tables",
  gracias: "thanks",
  presupuesto: "budget",
  votos: "cardVotes",
  guisos: "guisoRankings",
  canciones: "songRequests",
  analitica: "analytics",
  proveedores: "providers",
};

/** Map internal tab IDs to URL path segments. */
const TAB_TO_PATH = {
  guests: "invitados",
  charts: "charts",
  cabins: "cabins",
  tables: "tables",
  thanks: "gracias",
  budget: "presupuesto",
  cardVotes: "votos",
  guisoRankings: "guisos",
  songRequests: "canciones",
  analytics: "analitica",
  providers: "proveedores",
};

/** The tab definitions: id, label, and icon. */
const TABS = [
  { id: "guests", label: "Invitados", icon: "👥" },
  { id: "charts", label: "Gráficas", icon: "📊" },
  { id: "cabins", label: "Cabañas", icon: "🏠" },
  { id: "tables", label: "Mesas", icon: "🪑" },
  { id: "thanks", label: "Gracias", icon: "🙏" },
  { id: "budget", label: "Presupuesto", icon: "💰" },
  { id: "cardVotes", label: "Votos", icon: "⭐" },
  { id: "guisoRankings", label: "Guisos", icon: "🍲" },
  { id: "songRequests", label: "Canciones", icon: "🎵" },
  { id: "analytics", label: "Analítica", icon: "📈" },
  { id: "providers", label: "Proveedores", icon: "🤝" },
];

/** The currently active tab id. */
let activeTab = "guests";

/** Get the currently active tab id. */
export function getActiveTab() {
  return activeTab;
}

/**
 * Get the active tab from the URL path.
 * Returns "guests" as default.
 */
export function getTabFromPath() {
  const path = window.location.pathname.replace(/\/+$/u, "");
  const match = path.match(/^\/dashboard\/(\w+)$/u);
  if (match) {
    const segment = match[1];
    if (PATH_TO_TAB[segment]) return PATH_TO_TAB[segment];
  }
  return "guests";
}

/**
 * Toggle the active tab + panel classes in the DOM and update the internal
 * active-tab state. After the DOM classes are toggled, a `dashboard:tabchange`
 * custom event is dispatched on `window` so the dashboard can react to the tab
 * becoming visible (e.g. re-render ECharts panels that were initialized while
 * hidden). The event carries the newly active tab id in `event.detail.tab`.
 */
export function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll("[data-dashboard-tab]").forEach((btn) => {
    btn.classList.toggle("dashboard-tab-active", btn.dataset.dashboardTab === tab);
  });
  document.querySelectorAll("[data-dashboard-panel]").forEach((panel) => {
    panel.classList.toggle("dashboard-panel-active", panel.dataset.dashboardPanel === tab);
  });

  window.dispatchEvent(new CustomEvent("dashboard:tabchange", { detail: { tab } }));
}

/**
 * Navigate to a sub-page tab without full page reload.
 */
export function navigateToTab(tabId) {
  const segment = TAB_TO_PATH[tabId] || "invitados";
  const newPath = `/dashboard/${segment}`;
  if (window.location.pathname.replace(/\/+$/u, "") !== newPath) {
    window.history.pushState({ tab: tabId }, "", newPath);
  }
  switchTab(tabId);
  updateTabSelectTrigger();
}

/**
 * Update the visible icon + label of the tab-select trigger to reflect the
 * ACTIVE tab. `renderTabNavigation()` rebuilds the whole select from scratch,
 * which would close the menu and re-add listeners; this only patches the two
 * text nodes so the collapsed trigger stays in sync after a navigation.
 */
function updateTabSelectTrigger() {
  const nav = document.querySelector("[data-dashboard-tabs]");
  if (!nav) return;
  const active = TABS.find((t) => t.id === activeTab) || TABS[0];
  const icon = nav.querySelector(".dashboard-tab-select-trigger-icon");
  const label = nav.querySelector(".dashboard-tab-select-trigger-label");
  if (icon) icon.textContent = active.icon;
  if (label) label.textContent = active.label;
}

/**
 * Render the tab navigation into `[data-dashboard-tabs]` and wire the handlers.
 *
 * The nav is rendered as a custom SELECT-style dropdown (mirroring the group
 * filter in the header) so it stays compact inside the thin sticky navbar. The
 * trigger shows the ACTIVE tab (icon + label) with a cool colored gradient
 * effect; the opened menu lists every section (icon + label) and the active one
 * is highlighted. Selecting an option navigates to that tab.
 */
export function renderTabNavigation() {
  const nav = document.querySelector("[data-dashboard-tabs]");
  if (!nav) return;

  const active = TABS.find((t) => t.id === activeTab) || TABS[0];

  nav.innerHTML = `
    <div class="dashboard-tab-select">
      <button
        class="dashboard-tab-select-trigger"
        data-tab-select-trigger
        type="button"
        aria-haspopup="listbox"
        aria-expanded="false"
      >
        <span class="dashboard-tab-select-trigger-icon">${active.icon}</span>
        <span class="dashboard-tab-select-trigger-label">${active.label}</span>
        <span class="dashboard-tab-select-caret" aria-hidden="true">▾</span>
      </button>

      <div class="dashboard-tab-select-menu" role="listbox" aria-label="Secciones del panel">
        ${TABS.map(
          (tab) => `
          <button
            class="dashboard-tab-select-option ${tab.id === activeTab ? "is-active" : ""}"
            data-tab-select-option="${tab.id}"
            role="option"
            aria-selected="${tab.id === activeTab ? "true" : "false"}"
            type="button"
          >
            <span class="dashboard-tab-select-option-icon">${tab.icon}</span>
            <span class="dashboard-tab-select-option-name">${tab.label}</span>
          </button>
        `,
        ).join("")}
      </div>
    </div>
  `;

  const select = nav.querySelector(".dashboard-tab-select");
  const trigger = nav.querySelector("[data-tab-select-trigger]");
  const menu = nav.querySelector(".dashboard-tab-select-menu");

  const closeMenu = () => {
    select.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
  };
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = !select.classList.contains("is-open");
    select.classList.toggle("is-open", willOpen);
    trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
  });

  document.addEventListener("click", (e) => {
    if (select && !select.contains(e.target)) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  menu.querySelectorAll("[data-tab-select-option]").forEach((btn) => {
    btn.addEventListener("click", () => {
      navigateToTab(btn.dataset.tabSelectOption);
      closeMenu();
    });
  });
}

