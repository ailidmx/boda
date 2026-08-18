/**
 * cabinsPanel.js — the "Asignación de cabañas" panel renderer for the dashboard.
 *
 * This is a PRESENTATION module: it renders the cabin-assignment cards into the
 * `[data-cabin-assignments]` container and wires the copy-link buttons. It
 * contains no Firestore access and no business rules — the data it renders is
 * passed in as dependencies (the same pattern as `guestTable.js` / `groupsPanel.js`).
 *
 * NOTE: This renderer is the LEGACY, simplified cabin view. It groups guests by
 * the normalized `unit` field (via `getUniqueCabins` + `getGuestsByUnit`) and
 * renders a simple card per cabin with a copy-link button. It does NOT implement
 * the richer `hosting`-based drag-and-drop / remove / add-guest panel described
 * in AGENTS.md — that richer panel is not present in the current codebase. This
 * module preserves the existing behavior exactly (structural refactor only).
 */

/**
 * Render the cabin-assignment cards into the `[data-cabin-assignments]` container.
 * @param {Object} deps
 * @param {HTMLElement} deps.container — the `[data-cabin-assignments]` element.
 * @param {() => string[]} deps.getUniqueCabins — returns the list of cabin units.
 * @param {(unit: string) => Object[]} deps.getGuestsByUnit — returns the guests in a unit.
 * @param {(guestId: string) => string} deps.getInviteUrl — builds the invite URL for a guest.
 */
export function renderCabinAssignments({ container, getUniqueCabins, getGuestsByUnit, getInviteUrl }) {
  if (!container) return;

  const cabins = getUniqueCabins();

  container.innerHTML = `
    <div class="dashboard-cabin-grid">
      ${cabins
        .map((unit) => {
          const guests = getGuestsByUnit(unit);
          const cabinGuest = guests[0];
          const label = cabinGuest?.cabinLabel || unit;
          const occupancy = cabinGuest?.occupancy || "";
          const payment = cabinGuest?.payment || "";
          return `
            <div class="dashboard-cabin-card">
              <div class="dashboard-cabin-heading">
                <strong>${label}</strong>
                <span class="dashboard-cabin-meta">${occupancy === "privada" ? "Privada" : "Compartida"} · ${payment === "pagada" ? "Pagada" : "Por pagar"}</span>
              </div>
              <ul class="dashboard-cabin-guests">
                ${guests
                  .map(
                    (g) => `
                  <li>
                    <span>${[g.firstName, g.middleName, g.lastName, g.maternalLastName].filter(Boolean).join(" ")}</span>
                    <code class="dashboard-cabin-code">${g.id}</code>
                    <button class="dashboard-link-btn" data-copy-guest="${g.id}" title="Copiar enlace">🔗</button>
                  </li>

                `,
                  )
                  .join("")}
              </ul>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  container.querySelectorAll("[data-copy-guest]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.copyGuest;
      const url = getInviteUrl(guestId);
      navigator.clipboard.writeText(url).then(() => {
        btn.textContent = "✅";
        setTimeout(() => (btn.textContent = "🔗"), 1500);
      });
    });
  });
}
