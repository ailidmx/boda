// guestService.js — Stateful guest derivation for the dashboard.
//
// This module holds the guest derivation functions that need LIVE data
// (the raw Firestore `guests` records and the Firebase Auth user map). Unlike
// `guestDomain.js` (pure, stateless), these functions receive their data as
// parameters via dependency injection instead of reading the dashboard's
// mutable `state` object. This keeps them unit-testable and decoupled from the
// dashboard god-file.
//
// The dashboard's `state.liveGuests` / `state.authUsers` are passed in by the
// thin adapter wrappers in `dashboard.js`. Nothing here touches the DOM or
// Firestore directly.

import {
  RSVP_ATTENDANCE_DAYS,
  RSVP_CONFIRMED_MIN_LEVEL,
  DEFAULT_AUTH_EMAIL_DOMAIN,
  guestFullName,
  guestIdentity,
  guestRoom,
  guestAvatarUrl,
  guestInitials,
} from "./guestDomain.js";



// Read the live RSVP answers for a guest from the raw Firestore record.
export function getLiveRsvpAnswers(guest, liveGuests) {
  const raw = liveGuests.find((r) => r.id === guest.id);
  return raw?.rsvp?.answers || guest?.rsvp?.answers || {};
}

// Merge a normalized guest with its raw live Firestore record. Live wins where
// both exist (identity names/photo, hosting incl. xtraCabin/xtraRoom, rsvp).
export function getMergedGuest(guest, liveGuests) {
  const raw = liveGuests.find((r) => r.id === guest.id);
  if (!raw) return guest;
  return {
    ...guest,
    ...raw,
    identity: { ...(guest.identity || {}), ...(raw.identity || {}) },
    hosting: { ...(guest.hosting || {}), ...(raw.hosting || {}) },
    rsvp: { ...(guest.rsvp || {}), ...(raw.rsvp || {}) },
  };
}

// Read the LIVE `hosting` map for a guest directly from the raw Firestore
// records (the source of truth). This is what the cabin-assignment panel uses
// to build the next `hosting` map so it preserves the other period's fields
// and the payment flags. Returns {} when the guest has no live record.
export function getLiveHosting(guestId, liveGuests) {
  const raw = liveGuests.find((r) => r.id === guestId);
  return raw?.hosting || {};
}


// A guest "has a Firebase Auth account" when their RAW live record carries an
// explicit `firebaseEmail` (a real auth account was provisioned for them). The
// normalized `guest.firebaseEmail` always falls back to `id@domain`, so we must
// read the raw record, not the normalized one. Returns the auth email or "".
export function guestAuthEmail(guest, liveGuests) {
  const raw = liveGuests.find((r) => r.id === guest.id);
  return raw?.firebaseEmail || "";
}

// A guest can receive an invitation only if they have a Firebase Auth account
// (either present in the live auth list or carrying an explicit firebaseEmail).
export function guestHasAuth(guest, liveGuests, authUsers) {
  return Boolean(authUsers[guest.id]) || Boolean(guestAuthEmail(guest, liveGuests));
}

// The email we would send an invitation to. Priority: the raw record's
// `firebaseEmail`, then the LIVE Firebase Auth user's email (the same source the
// identity column uses via `authUsers`), then the identity/record email.
export function guestSendEmail(guest, liveGuests, authUsers) {
  return (
    guestAuthEmail(guest, liveGuests) ||
    authUsers[guest.id]?.email ||
    guest.identity?.email ||
    guest.email ||
    ""
  );
}

// The email channel is available whenever the guest has a real (non-default
// domain) email address. We intentionally do NOT require a Firebase Auth
// account here: the couple may want to send an invitation to a guest who has a
// real inbox but hasn't been provisioned an auth account yet.
export function guestCanEmail(guest, liveGuests, authUsers) {
  const email = guestSendEmail(guest, liveGuests, authUsers);
  return Boolean(email) && !email.endsWith(`@${DEFAULT_AUTH_EMAIL_DOMAIN}`);
}

// The WhatsApp channel is available only when the guest is auth'd AND has a
// phone number.
export function guestCanWhatsapp(guest, liveGuests, authUsers) {
  const phone = guest.identity?.phone || guest.phone || "";
  return guestHasAuth(guest, liveGuests, authUsers) && Boolean(phone);
}

// Whether a guest has recorded ANY flight info (origin / destination /
// connections / arrival date-time / final flight number, or the return-trip
// `departure` map). Used by the Vuelos column group + its "Sin datos de vuelo"
// filter.
export function guestHasFlightData(guest) {
  const fi = guest?.flightInfo || {};
  return Object.keys(fi).length > 0;
}

// RSVP scale dropdown for a single attendance day. The stored value stays an
// int 0–5 (0 = no answer). The select shows the current level and lets the
// admin pick any level directly (no click-to-cycle). The select's background
// reflects the level: gray = 0 (no answer), amber = 1–3, green = 4–5.
export function rsvpLevelChip(guest, day, liveGuests) {
  const level = getLiveRsvpAnswers(guest, liveGuests)[day];
  const has = Number.isInteger(level) && level > 0;
  const cls = has
    ? level >= RSVP_CONFIRMED_MIN_LEVEL
      ? "dashboard-rsvp-chip dashboard-rsvp-chip-confirmed"
      : "dashboard-rsvp-chip dashboard-rsvp-chip-partial"
    : "dashboard-rsvp-chip dashboard-rsvp-chip-empty";
  const current = has ? level : 0;
  const options = [0, 1, 2, 3, 4, 5]
    .map(
      (n) =>
        `<option value="${n}" ${n === current ? "selected" : ""}>${n === 0 ? "—" : n}</option>`,
    )
    .join("");
  return `<select class="${cls}" data-rsvp-chip="${guest.id}" data-rsvp-day="${day}" title="Nivel de asistencia (0 = sin respuesta, 4–5 = confirmado)">${options}</select>`;
}

// Read a boolean RSVP answer for a guest (e.g. `rsvp.answers.petanqueParticipation`).
// These questions store a plain number per guest doc: 1 (yes) or 2 (no) — the
// SAME shape the invitation front-end writes via `saveRsvpAnswers` →
// `buildGuestRsvpPayload` (`rsvp.answers.<questionId> = level`). Returns 0 when
// the guest has no answer.
export function getRsvpBooleanAnswer(guest, questionId, liveGuests) {
  const answers = getLiveRsvpAnswers(guest, liveGuests);
  const level = Number(answers[questionId]);
  return level === 1 || level === 2 ? level : 0;
}


// Editable select for a boolean RSVP answer (Sí / No / —). Mirrors the scale
// chip styling but for the yes/no questions (accommodationConfirm,
// cabinWaitingList, petanqueParticipation, petanqueOwnBoules). The select lets
// the admin pick Sí (1), No (2), or — (0) directly and saves on change via the
// `data-rsvp-boolean` handler in guestTable.js.
export function rsvpBooleanChip(guest, questionId, liveGuests) {
  const level = getRsvpBooleanAnswer(guest, questionId, liveGuests);
  const cls = level === 1
    ? "dashboard-rsvp-chip dashboard-rsvp-chip-confirmed"
    : level === 2
      ? "dashboard-rsvp-chip dashboard-rsvp-chip-partial"
      : "dashboard-rsvp-chip dashboard-rsvp-chip-empty";
  const options = [
    `<option value="0" ${level === 0 ? "selected" : ""}>—</option>`,
    `<option value="1" ${level === 1 ? "selected" : ""}>Sí</option>`,
    `<option value="2" ${level === 2 ? "selected" : ""}>No</option>`,
  ].join("");
  return `<select class="${cls}" data-rsvp-boolean="${guest.id}" data-rsvp-question="${questionId}" title="Sí / No / —">${options}</select>`;
}

// Read a SCALE RSVP answer (0–5) for a guest (e.g. `rsvp.answers.playa`). These
// questions store a plain int 0–5 per guest doc, the same shape as the
// attendance days. Returns 0 when the guest has no answer.
export function getRsvpScaleAnswer(guest, questionId, liveGuests) {
  const answers = getLiveRsvpAnswers(guest, liveGuests);
  const level = Number(answers[questionId]);
  return Number.isInteger(level) && level > 0 ? level : 0;
}

// Editable select for a SCALE RSVP answer (0–5) — used for the coast plans
// (`playa`, `rocaAzul`), which are 0–5 likelihood questions, NOT yes/no. The
// select lets the admin pick any level directly and saves on change via the
// `data-rsvp-scale` handler in guestTable.js. The select's background reflects
// the level: gray = 0 (no answer), amber = 1–3, green = 4–5.
export function rsvpScaleChip(guest, questionId, liveGuests) {
  const level = getRsvpScaleAnswer(guest, questionId, liveGuests);
  const cls = level >= RSVP_CONFIRMED_MIN_LEVEL
    ? "dashboard-rsvp-chip dashboard-rsvp-chip-confirmed"
    : level > 0
      ? "dashboard-rsvp-chip dashboard-rsvp-chip-partial"
      : "dashboard-rsvp-chip dashboard-rsvp-chip-empty";
  const options = [0, 1, 2, 3, 4, 5]
    .map(
      (n) =>
        `<option value="${n}" ${n === level ? "selected" : ""}>${n === 0 ? "—" : n}</option>`,
    )
    .join("");
  return `<select class="${cls}" data-rsvp-scale="${guest.id}" data-rsvp-question="${questionId}" title="Nivel (0 = sin respuesta, 4–5 = confirmado)">${options}</select>`;
}

// Editable select for the top-level `paymentConfirmed` boolean on the guest doc
// (Sí / No / —). This is the "payment done" flag the invitation writes via
// `savePaymentConfirmed` → `buildGuestPaymentConfirmedPayload`. The select lets
// the admin set Sí / No / — directly and saves on change via the
// `data-payment-confirmed` handler in guestTable.js.
export function paymentConfirmedChip(guest) {
  const value = guest.paymentConfirmed === true ? "1" : guest.paymentConfirmed === false ? "2" : "0";
  const cls = value === "1"
    ? "dashboard-rsvp-chip dashboard-rsvp-chip-confirmed"
    : value === "2"
      ? "dashboard-rsvp-chip dashboard-rsvp-chip-partial"
      : "dashboard-rsvp-chip dashboard-rsvp-chip-empty";
  const options = [
    `<option value="0" ${value === "0" ? "selected" : ""}>—</option>`,
    `<option value="1" ${value === "1" ? "selected" : ""}>Sí</option>`,
    `<option value="2" ${value === "2" ? "selected" : ""}>No</option>`,
  ].join("");
  return `<select class="${cls}" data-payment-confirmed="${guest.id}" title="Pago confirmado (Sí / No / —)">${options}</select>`;
}

// Compact money-icon badge for the cabin-assignment guest rows. Unlike the
// text "Sí/No/—" chip used in the INVITADOS table, the cabins panel uses an
// explicit emoji so the admin can scan payment status at a glance:
//   - 💰 (green) when the guest confirmed payment.
//   - 🚫 (red) when the guest explicitly has NOT confirmed payment.
//   - 💸 (muted) when there is no payment answer yet.
export function paymentConfirmedIcon(guest) {
  if (guest.paymentConfirmed === true) {
    return '<span class="dashboard-badge dashboard-badge-yes" title="Pago confirmado">💰</span>';
  }
  if (guest.paymentConfirmed === false) {
    return '<span class="dashboard-badge dashboard-badge-no" title="Pago no confirmado">🚫</span>';
  }
  return '<span class="dashboard-badge dashboard-badge-muted" title="Sin respuesta de pago">💸</span>';
}


// Aggregate confirmed counts per attendance day from the live guests.

export function computeDayConfirmations(activeGuests, liveGuests) {

  const counts = { friday: 0, saturday: 0, sunday: 0 };
  activeGuests.forEach((guest) => {
    const answers = getLiveRsvpAnswers(guest, liveGuests);
    RSVP_ATTENDANCE_DAYS.forEach((day) => {
      if ((answers[day] || 0) >= RSVP_CONFIRMED_MIN_LEVEL) counts[day] += 1;
    });
  });
  return counts;
}

// Invitation-send stats for the summary card. `total` = all active guests,
// `sent` = those with `invitationSent === true`, `pct` = rounded percentage.
export function computeInvitationStats(activeGuests) {
  const total = activeGuests.length;
  const sent = activeGuests.filter((g) => g.invitationSent === true).length;
  const pct = total > 0 ? Math.round((sent / total) * 100) : 0;
  return { total, sent, pct };
}

// Per-day distribution of the RSVP scale levels (0–5). Returns an object keyed
// by attendance day, each holding an array of 6 counts indexed by level
// (index 0 = no answer, 5 = fully confirmed). Used to render the small
// segmented distribution bar inside each day summary card.
export function computeDayDistributions(activeGuests, liveGuests) {
  const dist = { friday: [0, 0, 0, 0, 0, 0], saturday: [0, 0, 0, 0, 0, 0], sunday: [0, 0, 0, 0, 0, 0] };
  activeGuests.forEach((guest) => {
    const answers = getLiveRsvpAnswers(guest, liveGuests);
    RSVP_ATTENDANCE_DAYS.forEach((day) => {
      const level = Number(answers[day]) || 0;
      const idx = Math.min(Math.max(level, 0), 5);
      dist[day][idx] += 1;
    });
  });
  return dist;
}

// Per-day list of CONFIRMED guests (RSVP level ≥ RSVP_CONFIRMED_MIN_LEVEL).
// Returns an object keyed by attendance day, each holding an array of guest
// summaries `{ id, name, group, avatar, initials, level }` used to render the
// clickable stacked-avatar strip on each day card and the full-screen modal
// that lists the confirmed guests grouped by group tag. `level` is the guest's
// RSVP scale answer (0–5) for that specific day, so the modal can show exactly
// how strongly each guest confirmed.
export function computeDayConfirmedGuests(activeGuests, liveGuests) {
  const byDay = { friday: [], saturday: [], sunday: [] };
  activeGuests.forEach((guest) => {
    const answers = getLiveRsvpAnswers(guest, liveGuests);
    RSVP_ATTENDANCE_DAYS.forEach((day) => {
      const level = Number(answers[day]) || 0;
      if (level >= RSVP_CONFIRMED_MIN_LEVEL) {
        byDay[day].push({
          id: guest.id,
          name: guestFullName(guest),
          group: guest.group || "Sin grupo",
          avatar: guestAvatarUrl(guest),
          initials: guestInitials(guest),
          level,
        });
      }
    });
  });
  return byDay;
}

// Per-day, per-level list of guests for EVERY RSVP level (0–5), not just the
// confirmed ones. Returns an object keyed by attendance day, each holding an
// array of 6 arrays indexed by level (0 = no answer, 5 = fully confirmed).
// Each guest summary is `{ id, name, group, avatar, initials, level }`. Used to
// make each segment of the distribution bar clickable so the admin can open a
// modal listing exactly who answered 0, 1, 2, 3, 4 or 5 for that day.
export function computeDayLevelGuests(activeGuests, liveGuests) {
  const byDay = {
    friday: [[], [], [], [], [], []],
    saturday: [[], [], [], [], [], []],
    sunday: [[], [], [], [], [], []],
  };
  activeGuests.forEach((guest) => {
    const answers = getLiveRsvpAnswers(guest, liveGuests);
    RSVP_ATTENDANCE_DAYS.forEach((day) => {
      const level = Number(answers[day]) || 0;
      const idx = Math.min(Math.max(level, 0), 5);
      byDay[day][idx].push({
        id: guest.id,
        name: guestFullName(guest),
        group: guest.group || "Sin grupo",
        avatar: guestAvatarUrl(guest),
        initials: guestInitials(guest),
        level: idx,
      });
    });
  });
  return byDay;
}





// Status badge derived from the LIVE `rsvp.answers` (confirmed = any day ≥ 4,
// partial = answered but not confirmed, pending = no answers). Returns a plain
// `{ className, text }` descriptor so the caller can wrap it in a DOM element
// (keeps this module DOM-free).
export function guestStatusBadge(guest, liveGuests) {
  const answers = getLiveRsvpAnswers(guest, liveGuests);
  const hasAny = RSVP_ATTENDANCE_DAYS.some((day) => (answers[day] || 0) > 0);
  const confirmed = RSVP_ATTENDANCE_DAYS.some(
    (day) => (answers[day] || 0) >= RSVP_CONFIRMED_MIN_LEVEL,
  );
  if (confirmed) return { className: "dashboard-badge dashboard-badge-yes", text: "✅ Confirmado" };
  if (hasAny) return { className: "dashboard-badge dashboard-badge-maybe", text: "🟡 Parcial" };
  return { className: "dashboard-badge dashboard-badge-pending", text: "Pendiente" };
}

// ── Group / cabin / filter derivations ──────────────────────────────────────
// These were previously inline in `dashboard.js` reading the mutable `state`
// object. They are now dependency-injected pure functions so they can be unit
// tested and stay decoupled from the dashboard god-file.

// Unique invitation groups across the active guests, sorted A→Z.
export function getUniqueGuestGroups(activeGuests) {
  const groups = new Set(activeGuests.map((g) => g.group || "Sin grupo"));
  return [...groups].sort();
}

// Per-group attendance summary for the group nav chips. For each group returns
// `{ confirmedSaturday, size }`:
//   - `confirmedSaturday` = guests in the group whose SATURDAY RSVP level is
//     ≥ RSVP_CONFIRMED_MIN_LEVEL (4) — i.e. confirmed for Saturday.
//   - `size` = total guests in the group.
// Rendered as "X/Y" on each chip (X = confirmed Saturday, Y = group size).
export function getGroupAttendanceCounts(activeGuests, liveGuests) {
  const counts = {};
  activeGuests.forEach((guest) => {
    const group = guest.group || "Sin grupo";
    if (!counts[group]) counts[group] = { confirmedSaturday: 0, size: 0 };
    counts[group].size += 1;
    const saturday = getLiveRsvpAnswers(guest, liveGuests).saturday || 0;
    if (saturday >= RSVP_CONFIRMED_MIN_LEVEL) counts[group].confirmedSaturday += 1;
  });
  return counts;
}

// Per-group invitation + RSVP breakdown for the charts panel. For each group
// returns:
//   - `total`        = number of guests in the group
//   - `notSent`      = guests whose invitation has NOT been sent yet
//   - `sentByLevel`  = array of 6 counts (indexed by RSVP level 0–5) of guests
//                      whose invitation HAS been sent, bucketed by their RSVP
//                      answer for the given `day` (default "saturday").
// This powers the stacked "Confirmados por grupo" bar: the full bar is the
// group size, split into "not sent" (one color) vs "sent" (subdivided into the
// 6 RSVP levels).
export function getGroupInvitationBreakdown(activeGuests, liveGuests, day = "saturday") {
  const breakdown = {};
  activeGuests.forEach((guest) => {
    const group = guest.group || "Sin grupo";
    if (!breakdown[group]) {
      breakdown[group] = { total: 0, notSent: 0, sentByLevel: [0, 0, 0, 0, 0, 0] };
    }
    const entry = breakdown[group];
    entry.total += 1;
    if (guest.invitationSent === true) {
      const level = Number(getLiveRsvpAnswers(guest, liveGuests)[day]) || 0;
      const idx = Math.min(Math.max(level, 0), 5);
      entry.sentByLevel[idx] += 1;
    } else {
      entry.notSent += 1;
    }
  });
  return breakdown;
}

// Unique cabin units among active guests that have a cabin assigned, sorted.
export function getUniqueCabins(activeGuests) {

  const cabins = [
    ...new Set(
      activeGuests
        .filter((g) => g.hasCabin && g.unit)
        .map((g) => g.unit),
    ),
  ];
  return cabins.sort();
}

// Age-group bucket used by the NINO/ADULTO filter. The `age` field is now a
// STRING ("Adulto" / "Niño" / ""), matching the guest editor modal — NOT a raw
// number. A guest is a "NINO" when their `identity.age` (or top-level `age`)
// equals "Niño"; everything else (including unknown/empty) is "adulto".
export function guestAgeGroup(guest) {
  const age = String(guestIdentity(guest).age ?? guest.age ?? "").trim();
  return age === "Niño" ? "nino" : "adulto";
}

// A guest "has a cell phone" when they carry a non-empty phone number on their
// identity (or top-level `phone`). Used by the "Con/Sin teléfono" filter.
export function guestHasPhone(guest) {
  return Boolean(String(guest.identity?.phone || guest.phone || "").trim());
}

// A guest "has a photo" when they carry a Cloudinary avatar id on their
// identity (or top-level `cloudinaryId`). Used by the "Sin foto" filter and the
// readiness card.
export function guestHasPhoto(guest) {
  return Boolean(guestIdentity(guest).cloudinaryId || guest.cloudinaryId || "");
}

// A guest's name is "complete" when they have at least 2 of the 4 name fields
// filled AND at least one first name AND at least one last name (last or
// maternal). Used by the "ID incompleto" filter and the readiness card.
export function guestNameComplete(guest) {
  const id = guestIdentity(guest);
  const first = String(id.firstName || guest.firstName || "").trim();
  const middle = String(id.middleName || guest.middleName || "").trim();
  const last = String(id.lastName || guest.lastName || "").trim();
  const maternal = String(id.maternalLastName || guest.maternalLastName || "").trim();
  const filled = [first, middle, last, maternal].filter(Boolean).length;
  return filled >= 2 && Boolean(first) && Boolean(last || maternal);
}

// A guest's identity is "ready" when they have a complete name, a photo, and —
// IF they have a Firebase Auth account — a way to contact them (a real email or
// a phone). A guest with NO auth account is fine without contact info: the
// couple may not have a phone/email for them yet. An auth user, however, needs
// at least one reachable channel (email or phone) so they can log in / be
// reached. Used by the readiness card.
export function guestReady(guest, liveGuests, authUsers) {
  if (!guestNameComplete(guest)) return false;
  if (!guestHasPhoto(guest)) return false;
  const hasAuth = guestHasAuth(guest, liveGuests, authUsers);
  if (hasAuth) {
    const hasEmail = guestCanEmail(guest, liveGuests, authUsers);
    const hasPhone = guestHasPhone(guest);
    if (!hasEmail && !hasPhone) return false;
  }
  return true;
}

// Readiness breakdown for the summary card. Returns per-group counts of how
// many guests are missing each identity piece, plus how many are fully ready.
// Each count is keyed by group tag (including "Sin grupo") so the card can
// filter each row by group. Shape:
//   { total, ready, missingName, missingPhoto, missingContact }
// where each of the latter four is `{ [group]: count }` plus a `_all` total.
export function computeReadiness(activeGuests, liveGuests, authUsers) {
  const result = { total: 0, ready: {}, missingName: {}, missingPhoto: {}, missingContact: {} };
  const bump = (bucket, group) => {
    bucket[group] = (bucket[group] || 0) + 1;
    bucket._all = (bucket._all || 0) + 1;
  };

  activeGuests.forEach((guest) => {
    const group = guest.group || "Sin grupo";
    result.total += 1;
    if (guestReady(guest, liveGuests, authUsers)) {
      bump(result.ready, group);
    } else {
      if (!guestNameComplete(guest)) bump(result.missingName, group);
      if (!guestHasPhoto(guest)) bump(result.missingPhoto, group);
      const hasAuth = guestHasAuth(guest, liveGuests, authUsers);
      if (hasAuth && !guestCanEmail(guest, liveGuests, authUsers) && !guestHasPhone(guest)) {
        bump(result.missingContact, group);
      }
    }
  });

  return result;
}

// Filter the active guests by the current group + free-text query + age group +
// phone presence + email presence + photo presence + name completeness. The
// filter state is passed in as a plain
// `{ filterGroup, filterQuery, filterAgeGroup, filterPhone, filterEmail,
//    filterPhoto, filterName }` object. The email filter needs the LIVE guest
// records + auth user map to decide whether a guest has a REAL
// (non-default-domain) email, so those are passed as extra args (mirroring
// `guestCanEmail`).
export function getFilteredGuests(
  activeGuests,
  { filterGroup, filterQuery, filterAgeGroup, filterPhone, filterEmail, filterPhoto, filterName, filterContact, filterSent, filterAccommodation, filterWaitingList, filterNoCabin, filterPayment, filterPetanque, filterBoules, filterPlaya, filterTravelsByPlane, filterHasFlight },
  liveGuests = [],
  authUsers = {},
) {
  let filtered = activeGuests;

  if (filterGroup) {
    filtered = filtered.filter((g) => g.group === filterGroup);
  }
  if (filterAgeGroup) {
    filtered = filtered.filter((g) => guestAgeGroup(g) === filterAgeGroup);
  }
  if (filterPhone === "with") {
    filtered = filtered.filter((g) => guestHasPhone(g));
  } else if (filterPhone === "without") {
    filtered = filtered.filter((g) => !guestHasPhone(g));
  }
  if (filterEmail === "with") {
    filtered = filtered.filter((g) => guestCanEmail(g, liveGuests, authUsers));
  } else if (filterEmail === "without") {
    filtered = filtered.filter((g) => !guestCanEmail(g, liveGuests, authUsers));
  }
  if (filterPhoto === "with") {
    filtered = filtered.filter((g) => guestHasPhoto(g));
  } else if (filterPhoto === "without") {
    filtered = filtered.filter((g) => !guestHasPhoto(g));
  }
  if (filterName === "complete") {
    filtered = filtered.filter((g) => guestNameComplete(g));
  } else if (filterName === "incomplete") {
    filtered = filtered.filter((g) => !guestNameComplete(g));
  }
  if (filterContact === "without") {
    // Auth users who have NO reachable channel (no real email AND no phone).
    // Guests without an auth account are NOT flagged here — they may simply
    // not have contact info yet, which is acceptable.
    filtered = filtered.filter(
      (g) =>
        guestHasAuth(g, liveGuests, authUsers) &&
        !guestCanEmail(g, liveGuests, authUsers) &&
        !guestHasPhone(g),
    );
  }
  if (filterSent === "sent") {
    filtered = filtered.filter((g) => g.invitationSent === true);
  } else if (filterSent === "notSent") {
    filtered = filtered.filter((g) => g.invitationSent !== true);
  }
  if (filterAccommodation === "yes") {
    filtered = filtered.filter((g) => getRsvpBooleanAnswer(g, "accommodationConfirm", liveGuests) === 1);
  }
  if (filterWaitingList === "yes") {
    filtered = filtered.filter((g) => getRsvpBooleanAnswer(g, "cabinWaitingList", liveGuests) === 1);
  }
  if (filterNoCabin === "without") {
    filtered = filtered.filter((g) => !g.hosting?.cabin);
  }
  if (filterPayment === "yes") {
    filtered = filtered.filter((g) => g.paymentConfirmed === true);
  }
  if (filterPetanque === "yes") {
    filtered = filtered.filter((g) => getRsvpBooleanAnswer(g, "petanqueParticipation", liveGuests) === 1);
  }
  if (filterBoules === "yes") {
    filtered = filtered.filter((g) => getRsvpBooleanAnswer(g, "petanqueOwnBoules", liveGuests) === 1);
  }
  if (filterPlaya === "yes") {
    filtered = filtered.filter((g) => getRsvpScaleAnswer(g, "playa", liveGuests) >= 4);
  }
  if (filterTravelsByPlane === "yes") {
    filtered = filtered.filter((g) => g.travelsByPlane === true);
  }
  if (filterHasFlight === "with") {
    filtered = filtered.filter((g) => guestHasFlightData(g));
  } else if (filterHasFlight === "without") {
    filtered = filtered.filter((g) => !guestHasFlightData(g));
  }
  if (filterQuery) {



    const q = filterQuery.toLowerCase();
    filtered = filtered.filter(
      (g) =>
        g.id.toLowerCase().includes(q) ||
        guestFullName(g).toLowerCase().includes(q) ||
        String(guestIdentity(g).firstName || g.firstName || "").toLowerCase().includes(q) ||
        String(guestIdentity(g).middleName || g.middleName || "").toLowerCase().includes(q) ||
        String(guestIdentity(g).lastName || g.lastName || "").toLowerCase().includes(q) ||
        String(guestIdentity(g).maternalLastName || g.maternalLastName || "").toLowerCase().includes(q) ||
        String(guestIdentity(g).gender || g.gender || "").toLowerCase().includes(q) ||
        String(guestIdentity(g).age || g.age || "").toLowerCase().includes(q) ||
        String(g.message || guestIdentity(g).message || g.messageAuthor || "").toLowerCase().includes(q) ||
        g.group.toLowerCase().includes(q),
    );
  }

  return filtered;
}


// Airport sort label for the Vuelos columns: IATA code first (e.g. "mad"),
// falling back to the airport name. Lowercased for a stable comparison.
function airportSortValue(airport) {
  return (airport?.iata || airport?.name || "").toLowerCase();
}

// Extract the sortable value for a guest given a column key. The Firebase Auth
// user map is injected (dependency injection) so this stays a pure function
// decoupled from the dashboard's mutable `state`. Returns a lowercase string
// (or a number for boolean-ish columns) so the caller can sort directly.
export function guestSortValue(guest, key, authUsers = {}, liveGuests = []) {
  switch (key) {

    case "name":
      return guestFullName(guest).toLowerCase();
    case "invitationGroup":
      return (guest.invitationGroup || "").toLowerCase();
    case "idCheck":
      return guest.idCheckUser ? 1 : 0;
    case "hasAuth":
      return authUsers[guest.id] ? 1 : 0;
    case "group":
      return (guest.group || "").toLowerCase();
    case "lang":
      return (guest.identity?.lang || guest.lang || "").toLowerCase();
    case "cabin":
      return (guest.cabinLabel || guest.unit || "").toLowerCase();
    case "room":
      return guestRoom(guest).toLowerCase();
    case "xtraCabin":
      return (guest.xtraCabinLabel || guest.xtraCabin || "").toLowerCase();
    case "xtraRoom":
      return (guest.xtraRoom || "").toLowerCase();
    case "gender":
      return (guestIdentity(guest).gender || guest.gender || "").toLowerCase();
    case "age":
      return Number.parseInt(String(guestIdentity(guest).age || guest.age || ""), 10) || 0;
    case "message":
      return (guest.message || guestIdentity(guest).message || guest.messageAuthor || "").toLowerCase();
    case "invitationSent":
      return guest?.invitationSent === true ? 1 : 0;
    case "send":
      // Number of available send channels (0–2): WhatsApp + email. Lets the
      // admin sort by "who can I reach right now".
      return (guestCanWhatsapp(guest, liveGuests, authUsers) ? 1 : 0) +
             (guestCanEmail(guest, liveGuests, authUsers) ? 1 : 0);
    case "actions":
      // The "Acciones" column renders identical buttons (✏️ 🔗 👁️ 🗑️) for
      // every row, so there is no data to sort by — this is a no-op that keeps
      // the header clickable for consistency.
      return 0;
    case "friday":
    case "saturday":
    case "sunday":
      return getLiveRsvpAnswers(guest, liveGuests)[key] || 0;
    case "accommodationConfirm":


    case "cabinWaitingList":
    case "petanqueParticipation":
    case "petanqueOwnBoules":
      return getRsvpBooleanAnswer(guest, key, liveGuests);
    case "playa":
    case "rocaAzul":
      return getRsvpScaleAnswer(guest, key, liveGuests);
    case "paymentConfirmed":
      return guest?.paymentConfirmed === true ? 1 : 0;
    case "travelsByPlane":
      return guest?.travelsByPlane === true ? 1 : 0;
    case "flOrigin":
      return airportSortValue(guest?.flightInfo?.origin);
    case "flConnections":
      return (guest?.flightInfo?.connections || []).map((a) => a?.iata || "").join(",").toLowerCase();
    case "flDestination":
      return airportSortValue(guest?.flightInfo?.destination);
    case "flArrivalDate":
      return guest?.flightInfo?.arrivalDate || "";
    case "flArrivalTime":
      return guest?.flightInfo?.arrivalTime || "";
    case "flFinalFlightNumber":
      return (guest?.flightInfo?.finalFlightNumber || "").toLowerCase();
    case "flDepOrigin":
      return airportSortValue(guest?.flightInfo?.departure?.origin);
    case "flDepConnections":
      return (guest?.flightInfo?.departure?.connections || []).map((a) => a?.iata || "").join(",").toLowerCase();
    case "flDepDestination":
      return airportSortValue(guest?.flightInfo?.departure?.destination);
    case "flDepDate":
      return guest?.flightInfo?.departure?.departureDate || "";
    case "flDepTime":
      return guest?.flightInfo?.departure?.departureTime || "";
    case "flDepFlightNumber":
      return (guest?.flightInfo?.departure?.finalFlightNumber || "").toLowerCase();
    case "status":
      // Sort by the derived RSVP status (mirrors `guestStatusBadge`):
      // 2 = Confirmado (any day ≥ 4), 1 = Parcial (answered but not confirmed),
      // 0 = Pendiente (no answers). Lets the admin sort the "Estado" column.
      {
        const answers = getLiveRsvpAnswers(guest, liveGuests);
        const confirmed = RSVP_ATTENDANCE_DAYS.some(
          (day) => (answers[day] || 0) >= RSVP_CONFIRMED_MIN_LEVEL,
        );
        if (confirmed) return 2;
        const hasAny = RSVP_ATTENDANCE_DAYS.some((day) => (answers[day] || 0) > 0);
        return hasAny ? 1 : 0;
      }

    default:
      return "";
  }
}
