// guestDomain.js — Pure guest domain logic for the dashboard.
//
// This module holds the STATELESS, DOM-free guest derivation functions and
// domain constants. It deliberately does NOT read the dashboard's mutable
// `state` object and does NOT touch the DOM or Firestore — those concerns stay
// in `dashboard.js` (state) and the repositories (persistence).
//
// Keeping these functions here makes them unit-testable and prevents the
// dashboard god-file from growing further. When a function needs live state
// (e.g. `state.liveGuests`, `state.authUsers`), it stays in `dashboard.js` and
// reads the state there.
//
// IMPORTANT: This module must stay free of browser-only imports (Firebase SDK,
// `import.meta.env`, DOM). It is imported by the Node unit tests directly, so
// any transitive browser dependency would break them. `buildInvitationUrl` is
// inlined below precisely to keep this module pure (the former
// `invitation-profile.js` module that held it was removed as dead code).


// ── Domain constants ───────────────────────────────────────────────────

// Attendance days tracked in the RSVP scale. Each guest's `rsvp.answers` map
// holds a scale level (int 0–5) per day; a guest counts as "confirmed" when
// the level is ≥ RSVP_CONFIRMED_MIN_LEVEL.
export const RSVP_ATTENDANCE_DAYS = ["friday", "saturday", "sunday"];
export const RSVP_CONFIRMED_MIN_LEVEL = 4;

// The default auth domain the invitation app appends to bare usernames. Emails
// on this domain are NOT real inboxes, so we must never send an invitation to
// them.
export const DEFAULT_AUTH_EMAIL_DOMAIN = "boda-david-y-ayde.web.app";

// Sortable column keys for the INVITADOS table. Each maps to a value extractor
// used by `guestSortValue`. "avatar" is intentionally NOT sortable. The ID and
// phone are NOT standalone columns — they live inside the "Identidad" column.
export const GUEST_SORT_COLUMNS = [
  "name", "invitationGroup", "idCheck", "hasAuth", "group", "lang", "cabin", "room", "xtraCabin", "xtraRoom",
  "gender", "age", "message", "status",
  "accommodationConfirm", "cabinWaitingList", "paymentConfirmed",
  "petanqueParticipation", "petanqueOwnBoules", "playa", "rocaAzul", "travelsByPlane",
];



// The production invitation origin. Invitation links sent to guests (email
// body, WhatsApp, and the modal preview) MUST always point here — never to a
// local dev server — so the guest always lands on the real site.
export const INVITATION_ORIGIN = "https://boda-david-y-ayde.web.app";

// ── Guest identity derivation ──────────────────────────────────────────

export function guestIdentity(guest) {
  return guest?.identity || {};
}

export function guestHosting(guest) {
  return guest?.hosting || {};
}

export function guestFullName(guest) {
  const identity = guestIdentity(guest);
  return [
    identity.firstName || guest.firstName,
    identity.middleName || guest.middleName,
    identity.lastName || guest.lastName,
    identity.maternalLastName || guest.maternalLastName,
  ].filter(Boolean).join(" ");
}

export function guestRoom(guest) {
  return guestHosting(guest).room || guest.room || "";
}

// Build a Cloudinary avatar URL from a guest's photo id. The id is the full
// public id (e.g. `gimena_k9swal`), so we render it directly without any
// `boda/` prefix. Returns "" when the guest has no photo.
export function guestAvatarUrl(guest) {
  const id = guestIdentity(guest).cloudinaryId || guest.cloudinaryId || "";
  if (!id) return "";
  return `https://res.cloudinary.com/k2ajcgxv/image/upload/q_auto,f_auto,c_fill,g_auto,w_256,h_256/${id}`;
}

// Initials fallback for guests without a photo (e.g. "David Aïli" → "DA").
export function guestInitials(guest) {
  const name = guestFullName(guest);
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// ── Guest id generation (for the "Add Guest" flow) ─────────────────────

/**
 * Build a guest id (the doc id == login username == Firebase Auth uid) from a
 * guest's name, following the existing convention: lowercase, spaces → "_",
 * accents preserved (e.g. "Aydé Juárez Guadalupe" → "aydé_juárez_guadalupe").
 * Uses the first name + last name (or maternal last name when no last name).
 *
 * @param {object} input  { firstName, lastName, maternalLastName }
 * @returns {string}  the base slug (may collide — caller must dedupe).
 */
export function buildGuestId({ firstName, lastName, maternalLastName }) {
  const first = String(firstName || "").trim().toLowerCase();
  const last = String(lastName || maternalLastName || "").trim().toLowerCase();
  const parts = [first, last].filter(Boolean);
  if (parts.length === 0) return "";
  return parts.join("_").replace(/\s+/g, "_");
}

/**
 * Dedupe a base guest id against the set of existing guest ids by appending a
 * numeric suffix when needed (e.g. "maria_lopez" → "maria_lopez_2"). The
 * existing ids are passed in as an iterable of strings.
 *
 * @param {string} baseId  the base slug from `buildGuestId`.
 * @param {Iterable<string>} existingIds  all current guest doc ids.
 * @returns {string}  a unique guest id.
 */
export function uniqueGuestId(baseId, existingIds) {
  const taken = new Set(existingIds);
  if (!baseId) {
    // Fallback when the name produced no slug.
    let n = 1;
    let id = `invitado_${n}`;
    while (taken.has(id)) {
      n += 1;
      id = `invitado_${n}`;
    }
    return id;
  }
  if (!taken.has(baseId)) return baseId;
  let n = 2;
  let id = `${baseId}_${n}`;
  while (taken.has(id)) {
    n += 1;
    id = `${baseId}_${n}`;
  }
  return id;
}


// ── Access control ─────────────────────────────────────────────────────

// There is no dedicated admin login. The dashboard reuses the same Firebase
// Auth session as the invitation. Access is granted ONLY to guests whose
// Firestore `guests` doc has `isAdmin: true` (David and Aydé). Everyone else
// sees an access-denied screen and is redirected back to the invitation.
export function isAdminGuest(guest) {
  return Boolean(guest && guest.isAdmin === true);
}

// ── Invitation URL ─────────────────────────────────────────────────────

// Build an invitation URL for a guest. The per-guest invitation-code system was
// removed (login is now email/password), so the invitation is served at the
// base origin; the guest id is kept as a query param for analytics/tracking
// only. Inlined here to keep this module free of the Firebase SDK.
function buildInvitationUrl(origin, guestId) {
  const base = (origin || "").replace(/\/+$/, "");
  const params = new URLSearchParams();
  if (guestId) params.set("guest", guestId);
  const qs = params.toString();
  return qs ? `${base}/?${qs}` : `${base}/`;
}

export function getInviteUrl(guestId) {
  return buildInvitationUrl(INVITATION_ORIGIN, guestId);
}


// ── Badges ─────────────────────────────────────────────────────────────

// Deterministic pastel background color for a badge label (stable per label).
export function badgeStyle(text) {
  const palette = [
    "#e8dcc8", "#d9e4d2", "#d8e0ec", "#ecd9d9", "#e6d9ec",
    "#d9ecec", "#ece3d2", "#d2e6e6", "#e6d2d2", "#d2d9e6",
  ];
  let hash = 0;
  const s = String(text || "");
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

// Colored badge span for a short label (grupo/cabaña/cuarto).
export function badgeHtml(text) {
  const label = String(text || "").trim();
  if (!label) return '<span class="dashboard-badge dashboard-badge-muted">—</span>';
  return `<span class="dashboard-badge" style="background:${badgeStyle(label)};color:#3a2f1e;">${label}</span>`;
}
