import assert from "node:assert/strict";
import test from "node:test";
import {
  getLiveRsvpAnswers,
  getMergedGuest,
  guestAuthEmail,
  guestHasAuth,
  guestSendEmail,
  guestCanEmail,
  guestCanWhatsapp,
  guestHasFlightData,
  rsvpLevelChip,
  computeDayConfirmations,
  guestStatusBadge,
  guestSortValue,
} from "../src/guestService.js";

import {
  guestFullName,
  guestAvatarUrl,
  guestInitials,
  isAdminGuest,
  getInviteUrl,
  badgeStyle,
  badgeHtml,
  RSVP_CONFIRMED_MIN_LEVEL,
} from "../src/guestDomain.js";


// ── Fixtures ───────────────────────────────────────────────────────────

const guest = {
  id: "guest-1",
  identity: {
    firstName: "Ana",
    middleName: "María",
    lastName: "García",
    maternalLastName: "López",
    cloudinaryId: "gimena_k9swal",
  },
  rsvp: {
    answers: { friday: 5, saturday: 4, sunday: 0 },
  },
};

const rawLive = {
  id: "guest-1",
  identity: {
    firstName: "Ana",
    middleName: "María",
    lastName: "García",
    maternalLastName: "López",
    cloudinaryId: "gimena_k9swal",
  },
  rsvp: {
    answers: { friday: 5, saturday: 4, sunday: 0 },
  },
  hosting: { cabin: "CABAÑA 1", room: "CABAÑA 1-1" },
};

const liveGuests = [rawLive];


// ── guestDomain.js (pure) ──────────────────────────────────────────────

test("guestFullName joins identity names", () => {
  assert.equal(guestFullName(guest), "Ana María García López");
});

test("guestFullName falls back to top-level names when identity is missing", () => {
  assert.equal(
    guestFullName({ firstName: "David", lastName: "Aïli" }),
    "David Aïli",
  );
});

test("guestAvatarUrl builds a Cloudinary URL from the photo id", () => {
  assert.equal(
    guestAvatarUrl(guest),
    "https://res.cloudinary.com/k2ajcgxv/image/upload/q_auto,f_auto,c_fill,g_auto,w_256,h_256/gimena_k9swal",
  );
});

test("guestAvatarUrl returns empty string when no photo", () => {
  assert.equal(guestAvatarUrl({ identity: {} }), "");
});

test("guestInitials derives initials from the full name", () => {
  assert.equal(guestInitials(guest), "AL");
});

test("isAdminGuest is true only when isAdmin === true", () => {
  assert.equal(isAdminGuest({ isAdmin: true }), true);
  assert.equal(isAdminGuest({ isAdmin: false }), false);
  assert.equal(isAdminGuest({}), false);
  assert.equal(isAdminGuest(undefined), false);
});

test("getInviteUrl always uses the production origin with the guest id", () => {
  const url = getInviteUrl("guest-1");
  assert.ok(url.startsWith("https://boda-david-y-ayde.web.app/"));
  assert.ok(url.includes("guest=guest-1"));
});

test("badgeStyle is deterministic per label", () => {
  assert.equal(badgeStyle("Familia"), badgeStyle("Familia"));
  assert.equal(badgeStyle("Familia"), badgeStyle("Familia"));
});

test("badgeHtml renders a muted dash for empty labels", () => {
  assert.ok(badgeHtml("").includes("dashboard-badge-muted"));
  assert.ok(badgeHtml("  ").includes("dashboard-badge-muted"));
});

test("badgeHtml renders a colored badge for a label", () => {
  const html = badgeHtml("CABAÑA 1");
  assert.ok(html.includes("CABAÑA 1"));
  assert.ok(html.includes("background:"));
});


// ── guestService.js (dependency-injected) ──────────────────────────────

test("getLiveRsvpAnswers reads the raw live record's rsvp.answers", () => {
  assert.deepEqual(getLiveRsvpAnswers(guest, liveGuests), {
    friday: 5,
    saturday: 4,
    sunday: 0,
  });
});

test("getLiveRsvpAnswers falls back to the normalized guest when no live record", () => {
  assert.deepEqual(getLiveRsvpAnswers(guest, []), {
    friday: 5,
    saturday: 4,
    sunday: 0,
  });
});

test("getMergedGuest lets the live record win over the normalized guest", () => {
  const merged = getMergedGuest(guest, liveGuests);
  assert.equal(merged.hosting.cabin, "CABAÑA 1");
  assert.equal(merged.hosting.room, "CABAÑA 1-1");
  assert.equal(merged.identity.firstName, "Ana");
});

test("getMergedGuest returns the normalized guest when no live record", () => {
  const merged = getMergedGuest(guest, []);
  assert.equal(merged, guest);
});

test("guestAuthEmail reads the raw live record's firebaseEmail", () => {
  const withEmail = [{ id: "guest-1", firebaseEmail: "ana@example.com" }];
  assert.equal(guestAuthEmail(guest, withEmail), "ana@example.com");
});

test("guestAuthEmail returns empty when no firebaseEmail", () => {
  assert.equal(guestAuthEmail(guest, liveGuests), "");
});

test("guestHasAuth is true when the guest is in the live auth user map", () => {
  const authUsers = { "guest-1": { email: "ana@example.com" } };
  assert.equal(guestHasAuth(guest, liveGuests, authUsers), true);
});

test("guestHasAuth is true when the raw record carries a firebaseEmail", () => {
  const withEmail = [{ id: "guest-1", firebaseEmail: "ana@example.com" }];
  assert.equal(guestHasAuth(guest, withEmail, {}), true);
});

test("guestHasAuth is false when the guest has no auth account", () => {
  assert.equal(guestHasAuth(guest, liveGuests, {}), false);
});

test("guestSendEmail prefers the raw record's firebaseEmail", () => {
  const withEmail = [{ id: "guest-1", firebaseEmail: "ana@example.com" }];
  assert.equal(guestSendEmail(guest, withEmail, {}), "ana@example.com");
});

test("guestSendEmail falls back to the live auth user email", () => {
  const authUsers = { "guest-1": { email: "ana@example.com" } };
  assert.equal(guestSendEmail(guest, liveGuests, authUsers), "ana@example.com");
});

test("guestCanEmail is true for a real (non-default-domain) email", () => {
  const withEmail = [{ id: "guest-1", firebaseEmail: "ana@example.com" }];
  assert.equal(guestCanEmail(guest, withEmail, {}), true);
});

test("guestCanEmail is false for a default-domain email", () => {
  const withEmail = [{ id: "guest-1", firebaseEmail: "ana@boda-david-y-ayde.web.app" }];
  assert.equal(guestCanEmail(guest, withEmail, {}), false);
});

test("guestCanWhatsapp requires auth AND a phone", () => {
  const authUsers = { "guest-1": { email: "ana@example.com" } };
  // Phone lives on the normalized guest (guestCanWhatsapp reads
  // guest.identity.phone / guest.phone, not the live record).
  const withPhone = {
    ...guest,
    identity: { ...guest.identity, phone: "+52 1 55 1234 5678" },
  };
  const withPhoneLive = [{ id: "guest-1", firebaseEmail: "ana@example.com" }];
  assert.equal(guestCanWhatsapp(withPhone, withPhoneLive, authUsers), true);
  // No phone → false (auth present, but no phone on the guest)
  assert.equal(guestCanWhatsapp(guest, withPhoneLive, authUsers), false);
  // No auth → false (phone present, but no firebaseEmail and no auth user)
  assert.equal(guestCanWhatsapp(withPhone, [], {}), false);
});


test("rsvpLevelChip renders a select with the current level selected", () => {
  const html = rsvpLevelChip(guest, "friday", liveGuests);
  assert.ok(html.includes('value="5" selected'));
  assert.ok(html.includes("dashboard-rsvp-chip-confirmed"));
  const empty = rsvpLevelChip(guest, "sunday", liveGuests);
  assert.ok(empty.includes('value="0" selected'));
  assert.ok(empty.includes("dashboard-rsvp-chip-empty"));
});


test("computeDayConfirmations counts guests with level >= threshold per day", () => {
  const guests = [
    { id: "a", rsvp: { answers: { friday: 5, saturday: 4, sunday: 3 } } },
    { id: "b", rsvp: { answers: { friday: 2, saturday: 5, sunday: 0 } } },
    { id: "c", rsvp: { answers: { friday: 4, saturday: 1, sunday: 5 } } },
  ];
  const live = guests.map((g) => ({ id: g.id, rsvp: g.rsvp }));
  const counts = computeDayConfirmations(guests, live);
  assert.equal(counts.friday, 2); // a(5), c(4)
  assert.equal(counts.saturday, 2); // a(4), b(5)
  assert.equal(counts.sunday, 1); // c(5)
});

test("computeDayConfirmations uses RSVP_CONFIRMED_MIN_LEVEL as the threshold", () => {
  assert.equal(RSVP_CONFIRMED_MIN_LEVEL, 4);
});

test("guestStatusBadge returns confirmed when any day is >= threshold", () => {
  const badge = guestStatusBadge(guest, liveGuests);
  assert.equal(badge.className, "dashboard-badge dashboard-badge-yes");
  assert.equal(badge.text, "✅ Confirmado");
});

test("guestStatusBadge returns partial when answered but not confirmed", () => {
  const partial = { id: "x", rsvp: { answers: { friday: 2 } } };
  const badge = guestStatusBadge(partial, [{ id: "x", rsvp: { answers: { friday: 2 } } }]);
  assert.equal(badge.className, "dashboard-badge dashboard-badge-maybe");
  assert.equal(badge.text, "🟡 Parcial");
});


test("guestStatusBadge returns pending when there are no answers", () => {
  const noAnswers = { id: "x", rsvp: { answers: {} } };
  const badge = guestStatusBadge(noAnswers, [{ id: "x", rsvp: { answers: {} } }]);
  assert.equal(badge.className, "dashboard-badge dashboard-badge-pending");
});


// ── guestSortValue (pure, dependency-injected) ─────────────────────────

test("guestSortValue sorts by name (lowercased full name)", () => {
  const g = { id: "g1", identity: { firstName: "Ana", lastName: "García" } };
  assert.equal(guestSortValue(g, "name"), "ana garcía");
});

test("guestSortValue sorts by invitationGroup (lowercased)", () => {
  const g = { id: "g1", invitationGroup: "Familia" };
  assert.equal(guestSortValue(g, "invitationGroup"), "familia");
});

test("guestSortValue idCheck returns 1 when verified, 0 otherwise", () => {
  assert.equal(guestSortValue({ id: "g1", idCheckUser: true }, "idCheck"), 1);
  assert.equal(guestSortValue({ id: "g1" }, "idCheck"), 0);
});

test("guestSortValue hasAuth reads the injected authUsers map", () => {
  const authUsers = { g1: { email: "a@example.com" } };
  assert.equal(guestSortValue({ id: "g1" }, "hasAuth", authUsers), 1);
  assert.equal(guestSortValue({ id: "g2" }, "hasAuth", authUsers), 0);
  // Defaults to an empty map when not injected.
  assert.equal(guestSortValue({ id: "g1" }, "hasAuth"), 0);
});

test("guestSortValue sorts by group (lowercased)", () => {
  const g = { id: "g1", group: "Amigos" };
  assert.equal(guestSortValue(g, "group"), "amigos");
});

test("guestSortValue sorts by lang from identity or top-level", () => {
  assert.equal(guestSortValue({ id: "g1", identity: { lang: "FR" } }, "lang"), "fr");
  assert.equal(guestSortValue({ id: "g1", lang: "ES" }, "lang"), "es");
});

test("guestSortValue sorts by cabin (cabinLabel or unit)", () => {
  assert.equal(guestSortValue({ id: "g1", cabinLabel: "CABAÑA 1" }, "cabin"), "cabaña 1");
  assert.equal(guestSortValue({ id: "g1", unit: "madera_31" }, "cabin"), "madera_31");
});

test("guestSortValue sorts by room via guestRoom", () => {
  const g = { id: "g1", hosting: { room: "CABAÑA 1-1" } };
  assert.equal(guestSortValue(g, "room"), "cabaña 1-1");
});

test("guestSortValue sorts by xtraCabin and xtraRoom", () => {
  assert.equal(
    guestSortValue({ id: "g1", xtraCabinLabel: "Casona" }, "xtraCabin"),
    "casona",
  );
  assert.equal(
    guestSortValue({ id: "g1", xtraRoom: "Casona-1" }, "xtraRoom"),
    "casona-1",
  );
});

test("guestSortValue status is neutral (0) and unknown keys return empty", () => {
  assert.equal(guestSortValue({ id: "g1" }, "status"), 0);
  assert.equal(guestSortValue({ id: "g1" }, "unknown"), "");
});

// ── Vuelos (flight info) sort + filter helpers ──────────────────────────

test("guestSortValue sorts by flight origin/destination IATA, then name", () => {
  const g = {
    id: "g1",
    flightInfo: {
      origin: { iata: "MAD", name: "Madrid-Barajas", city: "Madrid", country: "España" },
      destination: { iata: "GDL", name: "Guadalajara" },
      arrivalDate: "2027-02-19",
      arrivalTime: "18:40",
      finalFlightNumber: "AM39",
      departure: {
        origin: { iata: "GDL" },
        destination: { iata: "MAD" },
        departureDate: "2027-02-23",
        departureTime: "09:15",
        finalFlightNumber: "AM38",
      },
    },
  };
  assert.equal(guestSortValue(g, "flOrigin"), "mad");
  assert.equal(guestSortValue(g, "flDestination"), "gdl");
  assert.equal(guestSortValue(g, "flArrivalDate"), "2027-02-19");
  assert.equal(guestSortValue(g, "flArrivalTime"), "18:40");
  assert.equal(guestSortValue(g, "flFinalFlightNumber"), "am39");
  assert.equal(guestSortValue(g, "flDepOrigin"), "gdl");
  assert.equal(guestSortValue(g, "flDepDestination"), "mad");
  assert.equal(guestSortValue(g, "flDepDate"), "2027-02-23");
  assert.equal(guestSortValue(g, "flDepTime"), "09:15");
  assert.equal(guestSortValue(g, "flDepFlightNumber"), "am38");
});

test("guestSortValue flight keys are empty when a guest has no flightInfo", () => {
  assert.equal(guestSortValue({ id: "g1" }, "flOrigin"), "");
  assert.equal(guestSortValue({ id: "g1" }, "flArrivalDate"), "");
  assert.equal(guestSortValue({ id: "g1" }, "flDepFlightNumber"), "");
});

test("guestSortValue sorts connections by joined IATA codes", () => {
  const g = {
    id: "g1",
    flightInfo: {
      connections: [{ iata: "CDG" }, { iata: "MEX" }],
      departure: { connections: [{ iata: "MEX" }, { iata: "CDG" }] },
    },
  };
  assert.equal(guestSortValue(g, "flConnections"), "cdg,mex");
  assert.equal(guestSortValue(g, "flDepConnections"), "mex,cdg");
});

test("guestHasFlightData is true when flightInfo has keys, false otherwise", () => {
  assert.equal(guestHasFlightData({ id: "g1", flightInfo: { arrivalDate: "2027-02-19" } }), true);
  assert.equal(guestHasFlightData({ id: "g2", flightInfo: {} }), false);
  assert.equal(guestHasFlightData({ id: "g3" }), false);
});

