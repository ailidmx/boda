// ── Legacy Records Panel (RSVP / Sugerencias / Costa / Petanca) ────────
//
// This module owns the rendering of the legacy submission collections
// (`rsvp_submissions`, `experience_suggestions`, `coast_interest`,
// `petanque_participation`) as record cards, the summary cards, and the CSV
// export. These collections are no longer written by the app (answers now live
// on the `guests` doc), but the dashboard still reads and displays them.
//
// It is a presentation module — it renders DOM and wires events, but never
// touches Firestore directly. Data arrives via the injected `state` and the
// live-derived helpers (`computeDayConfirmations`, `renderGuestManager`,
// `renderTableAssignments`) are injected so this module stays decoupled.

// ── Label maps for legacy record fields ────────────────────────────────

const fieldLabels = {
  attendance: "Asistencia",
  accommodation: "Alojamiento",
  independentArrival: "Llegada independiente",
  sundayMorning: "Domingo por la mañana",
  travelStatus: "Viaje",
  partySize: "Personas",
  adults: "Adultos",
  children: "Menores",
  guests: "Invitados del grupo",
  groupName: "Grupo",
  email: "Correo",
  whatsapp: "WhatsApp",
  arrivalFrom: "Origen",
  arrivalTo: "Llegada a",
  arrivalDate: "Fecha de llegada",
  arrivalTime: "Hora de llegada",
  arrivalAirline: "Aerolínea de llegada",
  arrivalFlight: "Vuelo de llegada",
  departureFrom: "Salida desde",
  departureTo: "Destino",
  departureDate: "Fecha de salida",
  departureTime: "Hora de salida",
  departureAirline: "Aerolínea de salida",
  departureFlight: "Vuelo de salida",
  route: "Ruta",
  notes: "Notas",
  invitationCode: "Perfil de invitación",
  dessert: "Postre",
  foodSuggestion: "Comida",
  songTitle: "Canción",
  songArtist: "Artista",
  singInterest: "Quiere cantar",
  extra: "Otra sugerencia",
  interest: "Interés",
  nights: "Noches",
  destination: "Destino preferido",
  style: "Organización",
  note: "Nota",
  // Petanque fields
  petanqueParticipation: "Participa en petanca",
  petanquePartySize: "Personas en petanca",
  petanqueNames: "Nombres de participantes",
  petanqueOwnBoules: "¿Tienen sus propias boules?",
};

const valueLabels = {
  yes: "Sí",
  no: "No",
  maybe: "Tal vez",
  solo: "Individual",
  group: "Grupo",
  onsite_two_nights: "Cabañas · 2 noches",
  independent: "Por su cuenta",
  friday: "Desde el viernes",
  saturday: "Solo el sábado",
  booked: "Viaje reservado",
  planning: "Viaje en preparación",
  local: "Local",
  barra: "Barra de Navidad",
  manzanillo: "Manzanillo",
  either: "Cualquiera",
  other: "Otra idea",
  shared: "Alojamiento en grupo",
  day: "Solo playa y cena",
};

// ── Helpers ────────────────────────────────────────────────────────────

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  return valueLabels[value] || String(value);
}

function submittedAt(record) {
  const date = record.createdAt?.toDate?.();
  return date
    ? new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
    : "Fecha pendiente";
}

function numeric(value) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : 0;
}

function make(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

// ── Summary cards ──────────────────────────────────────────────────────

function summaryCard(label, value, detail) {
  const article = make("article", "dashboard-summary-card");
  article.append(
    make("span", "", label),
    make("strong", "", String(value)),
    make("small", "", detail),
  );
  return article;
}

// ── RSVP detail rows ───────────────────────────────────────────────────

function detailRow(label, value) {
  const row = make("div", "dashboard-detail-row");
  row.append(make("dt", "", label), make("dd", "", formatValue(value)));
  return row;
}

function recordCard(record, type) {
  const article = make("article", "dashboard-record");
  const heading = make("header", "dashboard-record-heading");
  const title =
    type === "rsvps"
      ? `${record.firstName || ""} ${record.lastName || ""}`.trim()
      : record.name;
  heading.append(
    make("h3", "", title || "Sin nombre"),
    make("time", "", submittedAt(record)),
  );

  const fields =
    type === "rsvps"
      ? [
          "invitationCode", "attendance", "partySize", "adults", "children",
          "groupName", "guests", "email", "whatsapp", "accommodation",
          "independentArrival", "sundayMorning", "travelStatus",
          "arrivalFrom", "arrivalTo", "arrivalDate", "arrivalTime",
          "arrivalAirline", "arrivalFlight", "departureFrom", "departureTo",
          "departureDate", "departureTime", "departureAirline",
          "departureFlight", "route", "notes",
        ]
      : type === "suggestions"
        ? [
            "invitationCode", "dessert", "foodSuggestion", "songTitle",
            "songArtist", "singInterest", "extra",
          ]
        : type === "petanque"
          ? [
              "invitationCode", "petanqueParticipation", "petanquePartySize",
              "petanqueNames", "petanqueOwnBoules",
            ]
          : [
              "invitationCode", "interest", "partySize", "nights", "destination",
              "style", "note",
            ];

  const details = make("dl", "dashboard-record-details");
  fields
    .filter(
      (field) =>
        record[field] !== undefined && record[field] !== "",
    )
    .forEach((field) => {
      details.append(detailRow(fieldLabels[field] || field, record[field]));
    });
  article.append(heading, details);
  return article;
}

function renderCollection(target, records, type, emptyMessage) {
  target.replaceChildren();
  if (!records.length) {
    target.append(make("p", "dashboard-empty", emptyMessage));
    return;
  }
  records.forEach((record) => target.append(recordCard(record, type)));
}

// ── CSV export ─────────────────────────────────────────────────────────

function csvCell(value) {
  const normalized = value?.toDate?.()?.toISOString?.() || value || "";
  return `"${String(normalized).replaceAll('"', '""')}"`;
}

function downloadCsv(type, state) {
  const records = state[type];
  if (!records.length) return;
  const keys = [...new Set(records.flatMap((record) => Object.keys(record)))];
  const csv = [
    keys.map(csvCell).join(","),
    ...records.map((record) =>
      keys.map((key) => csvCell(record[key])).join(","),
    ),
  ].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `boda-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Data loading / summary update ──────────────────────────────────────

/**
 * Re-render the summary cards and the legacy record collections from the
 * current `state`. The live-derived helpers (`computeDayConfirmations`,
 * `renderGuestManager`, `renderTableAssignments`) are injected so this module
 * stays decoupled from the dashboard's mutable state and live listeners.
 *
 * @param {object} ctx Injected dependencies (see dashboard.js adapter).
 */
export function updateDashboardData(ctx) {
  const { state, computeDayConfirmations, renderGuestManager, renderTableAssignments } = ctx;

  const attending = state.rsvps.filter((record) => record.attendance === "yes");
  const attendees = attending.reduce(
    (total, record) => total + numeric(record.partySize),
    0,
  );
  const lodging = state.rsvps.filter(
    (record) =>
      record.attendance === "yes" &&
      record.accommodation === "onsite_two_nights",
  );
  const travelers = state.rsvps.filter((record) =>
    ["booked", "planning"].includes(record.travelStatus),
  );
  const petanque = state.petanque.filter(
    (record) => record.petanqueParticipation === "yes",
  );
  const petanquePeople = petanque.reduce(
    (total, record) => total + numeric(record.petanquePartySize),
    0,
  );

  const summary = document.querySelector("[data-dashboard-summary]");
  if (summary) {
    // FRIDAY / SATURDAY / SUNDAY attendance comes from the LIVE `guests`
    // collection (`rsvp.answers` scale ≥ RSVP_CONFIRMED_MIN_LEVEL), not the
    // legacy `rsvp_submissions` collection.
    const dayCounts = computeDayConfirmations();
    summary.replaceChildren(
      summaryCard("Viernes", dayCounts.friday, "Confirmados (nivel ≥ 4)"),
      summaryCard("Sábado", dayCounts.saturday, "Confirmados (nivel ≥ 4)"),
      summaryCard("Domingo", dayCounts.sunday, "Confirmados (nivel ≥ 4)"),
      summaryCard("Alojamiento", lodging.length, "Grupos interesados en cabañas"),
      summaryCard("Viajes", travelers.length, "Reservados o en preparación"),
      summaryCard("Petanca 🎱", petanque.length, `${petanquePeople} personas`),
    );
  }

  renderCollection(
    document.querySelector('[data-records="rsvps"]'),
    state.rsvps,
    "rsvps",
    "Todavía no hay respuestas RSVP.",
  );
  renderCollection(
    document.querySelector('[data-records="suggestions"]'),
    state.suggestions,
    "suggestions",
    "Todavía no hay sugerencias.",
  );
  renderCollection(
    document.querySelector('[data-records="coast"]'),
    state.coast,
    "coast",
    "Todavía no hay respuestas sobre la playa.",
  );
  renderCollection(
    document.querySelector('[data-records="petanque"]'),
    state.petanque,
    "petanque",
    "Todavía no hay respuestas de petanca.",
  );

  // Re-render guest manager if visible
  renderGuestManager();
  renderTableAssignments();
}

/**
 * Download a legacy collection as CSV. `type` is a key of `state`
 * ("rsvps" | "suggestions" | "coast" | "petanque").
 *
 * @param {string} type The state key to export.
 * @param {object} state The dashboard's mutable state.
 */
export function downloadCsvForType(type, state) {
  downloadCsv(type, state);
}
