import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeGuestRecord,
  mergeGuestRecord,
  resolveGuestName,
  guestTravelsByPlane,
  resolveGuestPhoto,
  resolveGuestPhone,
  resolveGuestEmail,
  resolveGuestMessageAuthor,
  resolveIdentityCheckPassed,
  resolveGuestInvitationGroup,
  getGroupMembers,
  resolveLiveGuest,
} from "../src/guest-profiles/domain.js";


// ── normalizeGuestRecord ─────────────────────────────────────────────────

test("normalizeGuestRecord flattens identity + hosting onto the top level", () => {
  const record = normalizeGuestRecord({
    id: "g1",
    identity: { firstName: "Ana", phone: "555", cloudinaryId: "a1" },
    hosting: { cabin: "CABAÑA 1", room: "CABAÑA 1-1", isCabinPaid: true },
  });
  assert.equal(record.firstName, "Ana");
  assert.equal(record.phone, "555");
  assert.equal(record.cloudinaryId, "a1");
  assert.equal(record.cabin, "CABAÑA 1");
  assert.equal(record.room, "CABAÑA 1-1");
  assert.equal(record.isCabinPaid, true);
  // nested maps kept intact
  assert.deepEqual(record.identity, { firstName: "Ana", phone: "555", cloudinaryId: "a1" });
  assert.deepEqual(record.hosting, { cabin: "CABAÑA 1", room: "CABAÑA 1-1", isCabinPaid: true });
});

test("normalizeGuestRecord falls back to top-level fields when nested maps are absent", () => {
  const record = normalizeGuestRecord({ firstName: "Ana", cabin: "CABAÑA 2" });
  assert.equal(record.firstName, "Ana");
  assert.equal(record.cabin, "CABAÑA 2");
  assert.deepEqual(record.identity, {});
  assert.deepEqual(record.hosting, {});
});

test("normalizeGuestRecord defaults to empty object", () => {
  const record = normalizeGuestRecord();
  assert.deepEqual(record.identity, {});
  assert.deepEqual(record.hosting, {});
});

// ── mergeGuestRecord ─────────────────────────────────────────────────────

test("mergeGuestRecord merges nested identity + hosting maps", () => {
  const merged = mergeGuestRecord(
    { identity: { firstName: "Ana" }, hosting: { cabin: "CABAÑA 1" } },
    { identity: { phone: "555" }, hosting: { room: "CABAÑA 1-1" } },
  );
  assert.equal(merged.firstName, "Ana");
  assert.equal(merged.phone, "555");
  assert.equal(merged.cabin, "CABAÑA 1");
  assert.equal(merged.room, "CABAÑA 1-1");
});

// ── resolveGuestName ─────────────────────────────────────────────────────

test("resolveGuestName prefers the live Firestore record over the static guest", () => {
  const name = resolveGuestName(
    { nombre: "Ana", apellido: "López" },
    { identity: { firstName: "Ana María", lastName: "López García" } },
  );
  assert.equal(name.firstName, "Ana María");
  assert.equal(name.lastName, "López García");
  assert.equal(name.fullName, "Ana María López García");
});

test("resolveGuestName falls back to static Spanish fields", () => {
  const name = resolveGuestName({ nombre: "Ana", nombre2: "María", apellido: "López", apellido2: "García" });
  assert.equal(name.firstName, "Ana");
  assert.equal(name.middleName, "María");
  assert.equal(name.lastName, "López");
  assert.equal(name.maternalLastName, "García");
  assert.equal(name.fullName, "Ana María López García");
});

test("resolveGuestName returns empty shape for a null guest", () => {
  assert.deepEqual(resolveGuestName(null), {
    firstName: "",
    middleName: "",
    lastName: "",
    maternalLastName: "",
    fullName: "",
  });
});

// ── guestTravelsByPlane ──────────────────────────────────────────────────

test("guestTravelsByPlane reads the boolean flag", () => {
  assert.equal(guestTravelsByPlane({ travelsByPlane: true }), true);
  assert.equal(guestTravelsByPlane({ travelsByPlane: false }), false);
});

test("guestTravelsByPlane accepts the legacy travelStatus string", () => {
  assert.equal(guestTravelsByPlane({ travelStatus: "booked" }), true);
  assert.equal(guestTravelsByPlane({ travelStatus: "planning" }), true);
  assert.equal(guestTravelsByPlane({ travelStatus: "local" }), false);
});

test("guestTravelsByPlane returns false for null/unknown", () => {
  assert.equal(guestTravelsByPlane(null), false);
  assert.equal(guestTravelsByPlane({}), false);
});

// ── resolveGuestPhoto ────────────────────────────────────────────────────

test("resolveGuestPhoto returns null when no cloudinaryId", () => {
  assert.equal(resolveGuestPhoto({}), null);
  assert.equal(resolveGuestPhoto(null), null);
});

test("resolveGuestPhoto builds a Cloudinary URL from the record id", () => {
  const url = resolveGuestPhoto({}, { identity: { cloudinaryId: "boda/avatars/abc" } });
  assert.ok(url && url.includes("boda/avatars/abc"));
});

// ── resolveGuestPhone ────────────────────────────────────────────────────

test("resolveGuestPhone prefers the live record phone", () => {
  assert.equal(resolveGuestPhone({ phone: "111" }, { identity: { phone: "222" } }), "222");
  assert.equal(resolveGuestPhone({ phone: "111" }, { phone: "333" }), "333");
});

test("resolveGuestPhone falls back to the static guest phone", () => {
  assert.equal(resolveGuestPhone({ phone: "111" }), "111");
  assert.equal(resolveGuestPhone(null), "");
});

// ── resolveGuestEmail ────────────────────────────────────────────────────

test("resolveGuestEmail always returns an empty string (email lives in Auth)", () => {
  assert.equal(resolveGuestEmail({ email: "x@y.z" }), "");
});

// ── resolveGuestMessageAuthor ────────────────────────────────────────────

test("resolveGuestMessageAuthor reads the live record messageAuthor", () => {
  assert.equal(resolveGuestMessageAuthor({}, { messageAuthor: "Ana" }), "Ana");
  assert.equal(resolveGuestMessageAuthor({}), "");
});

// ── resolveIdentityCheckPassed ───────────────────────────────────────────

test("resolveIdentityCheckPassed is true only when idCheckUser === true", () => {
  assert.equal(resolveIdentityCheckPassed({}, { idCheckUser: true }), true);
  assert.equal(resolveIdentityCheckPassed({}, { idCheckUser: false }), false);
  assert.equal(resolveIdentityCheckPassed({}), false);
});

// ── resolveGuestInvitationGroup ──────────────────────────────────────────

test("resolveGuestInvitationGroup prefers the live record group", () => {
  assert.equal(
    resolveGuestInvitationGroup({ id: "g1", invitationGroup: "A" }, { invitationGroup: "B" }),
    "B",
  );
  assert.equal(resolveGuestInvitationGroup({ id: "g1", invitationGroup: "A" }), "A");
  assert.equal(resolveGuestInvitationGroup({}), "");
});

// ── getGroupMembers ──────────────────────────────────────────────────────

test("getGroupMembers returns the signed-in guest first, then the rest", () => {
  const all = [
    { id: "g1", invitationGroup: "A" },
    { id: "g2", invitationGroup: "A" },
    { id: "g3", invitationGroup: "B" },
  ];
  const members = getGroupMembers(all[0], all, (g) => g.invitationGroup);
  assert.deepEqual(members.map((g) => g.id), ["g1", "g2"]);
});

test("getGroupMembers excludes deleted guests and returns self when no group", () => {
  const all = [
    { id: "g1", invitationGroup: "" },
    { id: "g2", invitationGroup: "A", _deleted: true },
  ];
  assert.deepEqual(getGroupMembers(all[0], all, (g) => g.invitationGroup), [all[0]]);
});

// ── resolveLiveGuest ─────────────────────────────────────────────────────

test("resolveLiveGuest merges live record fields over the static guest", () => {
  const merged = resolveLiveGuest(
    { id: "g1", cabin: "CABAÑA 1" },
    { cabin: "CABAÑA 2", rsvp: { answers: {} } },
  );
  assert.equal(merged.cabin, "CABAÑA 2");
  assert.deepEqual(merged.rsvp, { answers: {} });
});

test("resolveLiveGuest returns the static guest when no record", () => {
  const guest = { id: "g1", cabin: "CABAÑA 1" };
  assert.equal(resolveLiveGuest(guest), guest);
  assert.equal(resolveLiveGuest(null), null);
});
