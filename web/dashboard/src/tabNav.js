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
 */

/** Map URL path segments to internal tab IDs. */
const PATH_TO_TAB = {
  invitados: "guests",
  cabins: "cabins",
  tables: "tables",
  gracias: "thanks",
};

/** Map internal tab IDs to URL path segments. */
const TAB_TO_PATH = {
  guests: "invitados",
  cabins: "cabins",
  tables: "tables",
  thanks: "gracias",
};

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
 * active-tab state.
 */
export function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll("[data-dashboard-tab]").forEach((btn) => {
    btn.classList.toggle("dashboard-tab-active", btn.dataset.dashboardTab === tab);
  });
  document.querySelectorAll("[data-dashboard-panel]").forEach((panel) => {
    panel.classList.toggle("dashboard-panel-active", panel.dataset.dashboardPanel === tab);
  });
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
}

/**
 * Render the tab bar into `[data-dashboard-tabs]` and wire the click handlers.
 */
export function renderTabNavigation() {
  const tabs = [
    { id: "guests", label: "Invitados", icon: "👥" },
    { id: "cabins", label: "Cabañas", icon: "🏠" },
    { id: "tables", label: "Mesas", icon: "🪑" },
    { id: "thanks", label: "Gracias", icon: "🙏" },
  ];

  const nav = document.querySelector("[data-dashboard-tabs]");
  if (!nav) return;

  nav.innerHTML = tabs
    .map(
      (tab) => `
      <button
        class="dashboard-tab ${tab.id === activeTab ? "dashboard-tab-active" : ""}"
        data-dashboard-tab="${tab.id}"
        type="button"
      >
        <span class="dashboard-tab-icon">${tab.icon}</span>
        <span class="dashboard-tab-label">${tab.id === activeTab ? tab.label : ""}</span>
      </button>
    `,
    )
    .join("");

  nav.querySelectorAll("[data-dashboard-tab]").forEach((btn) => {
    btn.addEventListener("click", () => navigateToTab(btn.dataset.dashboardTab));
  });
}
