import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

const projectId = "boda-rules-test";
const guestUid = "yfu7MMCmFaPCK7UW4czr5c3x7Aa2";
let environment;

const rsvp = {
  firstName: "Camille",
  lastName: "Martin",
  email: "camille@example.com",
  whatsapp: "+33 6 00 00 00 00",
  attendance: "yes",
  groupMode: "solo",
  groupName: "",
  partySize: "1",
  adults: "1",
  children: "0",
  guests: "",
  accommodation: "independent",
  independentArrival: "friday",
  sundayMorning: "yes",
  travelStatus: "booked",
  arrivalFrom: "Madrid",
  arrivalTo: "GDL",
  arrivalDate: "2027-02-19",
  arrivalTime: "18:30",
  arrivalAirline: "Aeroméxico",
  arrivalFlight: "AM39",
  departureFrom: "GDL",
  departureTo: "Madrid",
  departureDate: "2027-02-22",
  departureTime: "12:00",
  departureAirline: "Aeroméxico",
  departureFlight: "AM36",
  route: "Málaga — Madrid — Guadalajara",
  notes: "",
  invitationCode: "azalea_compartida_porpagar",
  language: "fr",
  schemaVersion: 3,
  createdAt: serverTimestamp(),
};

const suggestion = {
  name: "Camille Martin",
  dessert: "jericalla",
  foodSuggestion: "",
  songTitle: "La vie en rose",
  songArtist: "Édith Piaf",
  singInterest: "maybe",
  extra: "",
  invitationCode: "azalea_compartida_porpagar",
  language: "fr",
  schemaVersion: 1,
  createdAt: serverTimestamp(),
};

const coast = {
  name: "Camille Martin",
  interest: "yes",
  partySize: "1",
  nights: "2",
  destination: "barra",
  style: "hotel",
  note: "",
  invitationCode: "azalea_compartida_porpagar",
  language: "fr",
  schemaVersion: 1,
  createdAt: serverTimestamp(),
};

before(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: await readFile(
        new URL("../../../firebase/firestore.rules", import.meta.url),
        "utf8",
      ),
    },
  });

  // The current rules resolve an invited guest by checking that a document
  // exists at `guests/{auth.uid}` (auth UIDs are set to the guest ID from the
  // Google Sheet). Seed the invited guest so `isInvitedGuest()` succeeds.
  // `withSecurityRulesDisabled()` bypasses rules (equivalent to the Admin SDK).
  await environment.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(admin.firestore(), "guests", guestUid), {
      guestId: guestUid,
      invitationGroup: "Familia de David",
      updatedBy: "seed",
      updatedAt: serverTimestamp(),
    });
  });
});

after(async () => {
  await environment.cleanup();
});

test("the invited guest can submit the current RSVP schema", async () => {
  const db = environment.authenticatedContext(guestUid).firestore();
  await assertSucceeds(setDoc(doc(db, "rsvp_submissions", "valid"), rsvp));
});

test("the invited guest can submit suggestions and coast interest", async () => {
  const db = environment.authenticatedContext(guestUid).firestore();
  await assertSucceeds(
    setDoc(doc(db, "experience_suggestions", "valid"), suggestion),
  );
  await assertSucceeds(setDoc(doc(db, "coast_interest", "valid"), coast));
});

test("outdated or unexpected RSVP fields are rejected", async () => {
  const db = environment.authenticatedContext(guestUid).firestore();
  await assertFails(
    setDoc(doc(db, "rsvp_submissions", "old"), {
      ...rsvp,
      schemaVersion: 1,
      contact: "not part of schema 3",
    }),
  );
});

test("unknown invitation profiles are rejected", async () => {
  const db = environment.authenticatedContext(guestUid).firestore();
  await assertFails(
    setDoc(doc(db, "rsvp_submissions", "unknown-profile"), {
      ...rsvp,
      invitationCode: "palacio_admin_pagado",
    }),
  );
});

test("an unauthenticated visitor cannot submit", async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(db, "rsvp_submissions", "anonymous"), rsvp));
});

// ── Submission reads: admin-only ────────────────────────────────────────
// The current rules restrict reads of submission collections to `isAdmin()`
// (guests/{auth.uid}.isAdmin == true). Regular invited guests can WRITE
// submissions but cannot READ them back. This prevents a guest from seeing
// other guests' personal data (names, emails, phones, travel itineraries).

const adminUid = "admin-uid-1";

async function seedAdmin() {
  await environment.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(admin.firestore(), "guests", adminUid), {
      guestId: adminUid,
      invitationGroup: "Novios",
      isAdmin: true,
      updatedBy: "seed",
      updatedAt: serverTimestamp(),
    });
  });
}

test("an invited guest can read all submission collections (read-all policy)", async () => {
  const db = environment.authenticatedContext(guestUid).firestore();
  await assertSucceeds(getDoc(doc(db, "rsvp_submissions", "valid")));
  await assertSucceeds(getDoc(doc(db, "experience_suggestions", "valid")));
  await assertSucceeds(getDoc(doc(db, "coast_interest", "valid")));
  await assertSucceeds(getDoc(doc(db, "petanque_participation", "valid")));
});


test("an admin can read all submission collections", async () => {
  await seedAdmin();
  const db = environment.authenticatedContext(adminUid).firestore();
  await assertSucceeds(getDoc(doc(db, "rsvp_submissions", "valid")));
  await assertSucceeds(getDoc(doc(db, "experience_suggestions", "valid")));
  await assertSucceeds(getDoc(doc(db, "coast_interest", "valid")));
  await assertSucceeds(getDoc(doc(db, "petanque_participation", "valid")));
});

test("a non-admin authenticated user can read submissions (read-all policy)", async () => {
  const db = environment
    .authenticatedContext("non-admin", {
      email: "someone@example.com",
      email_verified: true,
    })
    .firestore();
  await assertSucceeds(getDoc(doc(db, "rsvp_submissions", "valid")));
});


test("an unauthenticated visitor cannot read submissions", async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, "rsvp_submissions", "valid")));
});


// ── Guests collection: group members may edit each other's contact ──────
// The `guests` collection is the source of truth for guest records. Any
// authenticated guest may update the phone of a member of their own
// invitation group (resolved from `guests/{auth.uid}.invitationGroup`), but
// nothing else, and never members of another group. Email is NOT stored here
// — it is the Firebase Auth login credential and is changed via `updateEmail`.


const editorUid = "editor-uid-1";
const editorGroup = "Familia de David";

async function seedGuestAuth() {
  // `withSecurityRulesDisabled()` bypasses rules (equivalent to the Admin SDK).
  await environment.withSecurityRulesDisabled(async (admin) => {
    // The current rules resolve the editor's group from their own guest
    // document at `guests/{auth.uid}` (auth UIDs are set to the guest ID).
    await setDoc(doc(admin.firestore(), "guests", editorUid), {
      guestId: editorUid,
      invitationGroup: editorGroup,
      updatedBy: "seed",
      updatedAt: serverTimestamp(),
    });
  });
}

test("a group member can update the phone of another member in their group", async () => {
  await seedGuestAuth();
  // The target guest document already exists (synced from the Google Sheet).
  // Seed it via the admin context so the update below is a real UPDATE, not a
  // CREATE (the rules' `hasValidGuestContactFields()` dereferences
  // `resource.data`, which is null on create).
  await environment.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(admin.firestore(), "guests", "catherine"), {
      guestId: "catherine",
      identity: {
        firstName: "Catherine",
        lastName: "Martin",
        phone: "+33 6 00 00 00 00",
      },
      invitationGroup: editorGroup,
      updatedBy: "seed",
      updatedAt: serverTimestamp(),
    });
  });

  const db = environment.authenticatedContext(editorUid).firestore();
  await assertSucceeds(
    setDoc(doc(db, "guests", "catherine"), {
      guestId: "catherine",
      identity: { phone: "+33 6 12 34 56 78" },
      invitationGroup: editorGroup,
      updatedBy: "david_aili",
      updatedAt: serverTimestamp(),
    }),
  );
});

test("a group member can update a guest identity without sending invitationGroup", async () => {
  await seedGuestAuth();
  await environment.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(admin.firestore(), "guests", "catherine"), {
      guestId: "catherine",
      identity: {
        firstName: "Catherine",
        lastName: "Martin",
        phone: "+33 6 00 00 00 00",
      },
      invitationGroup: editorGroup,
      updatedBy: "seed",
      updatedAt: serverTimestamp(),
    });
  });

  const db = environment.authenticatedContext(editorUid).firestore();
  // Use `updateDoc` (partial update) so `invitationGroup` is preserved and NOT
  // included in `affectedKeys()`. With `setDoc` (full replace), omitting
  // `invitationGroup` would remove it, which the rules forbid for non-admins.
  await assertSucceeds(
    updateDoc(doc(db, "guests", "catherine"), {
      identity: {
        firstName: "Catherine",
        middleName: "",
        lastName: "Martin",
        maternalLastName: "",
      },
      updatedBy: "david_aili",
      updatedAt: serverTimestamp(),
    }),
  );
});

test("a group member cannot store an email on the guests collection (email lives in Firebase Auth)", async () => {
  await seedGuestAuth();
  const db = environment.authenticatedContext(editorUid).firestore();
  await assertFails(
    setDoc(doc(db, "guests", "catherine"), {
      guestId: "catherine",
      identity: { phone: "+33 6 12 34 56 78" },
      email: "catherine@example.com",
      invitationGroup: editorGroup,
      updatedBy: "david_aili",
      updatedAt: serverTimestamp(),
    }),
  );
});


// The rules allow group members to edit contact fields AND name corrections
// (firstName/lastName). Sheet-synced fields (cabin, room, table, rsvp,
// isAdmin, etc.) are read-only from the client. This test verifies that a
// group member cannot modify a sheet-synced administrative field.
test("a group member cannot edit sheet-synced administrative fields", async () => {
  await seedGuestAuth();
  // Seed the target guest so the write below is an UPDATE (the rules'
  // `hasValidGuestContactFields()` dereferences `resource.data`).
  await environment.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(admin.firestore(), "guests", "catherine"), {
      guestId: "catherine",
      identity: {
        firstName: "Catherine",
        lastName: "Martin",
        phone: "+33 6 00 00 00 00",
      },
      invitationGroup: editorGroup,
      updatedBy: "seed",
      updatedAt: serverTimestamp(),
    });
  });

  const db = environment.authenticatedContext(editorUid).firestore();
  await assertFails(
    setDoc(doc(db, "guests", "catherine"), {
      guestId: "catherine",
      isAdmin: true,
      invitationGroup: editorGroup,
      updatedBy: "david_aili",
      updatedAt: serverTimestamp(),
    }),
  );
});

test("a group member cannot edit a member of a different group", async () => {
  await seedGuestAuth();
  const db = environment.authenticatedContext(editorUid).firestore();
  await assertFails(
    setDoc(doc(db, "guests", "sebastien"), {
      guestId: "sebastien",
      identity: { phone: "+33 6 00 00 00 00" },
      invitationGroup: "PetanclubGDL",
      updatedBy: "david_aili",
      updatedAt: serverTimestamp(),
    }),
  );
});

test("an unauthenticated visitor cannot edit a guest record", async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(
    setDoc(doc(db, "guests", "catherine"), {
      guestId: "catherine",
      identity: { phone: "+33 6 00 00 00 00" },
      invitationGroup: editorGroup,
      updatedBy: "david_aili",
      updatedAt: serverTimestamp(),
    }),
  );
});

// ── RSVP scale answers & identity check (self-write) ────────────────────
// The RSVP scale save writes `rsvp.answers` to each group member's own
// document (saveRsvpAnswers → setDoc with merge), and the identity check
// writes `idCheckUser: true` to the whole group. Both are self-writes
// (auth.uid == guestId) and must be allowed even when the group-resolution
// edge cases apply. These mirror the exact payloads from rsvp-responses.js
// and IdentityModal.jsx.

test("a guest can save RSVP scale answers to their own document", async () => {
  await seedGuestAuth();
  const db = environment.authenticatedContext(editorUid).firestore();
  await assertSucceeds(
    setDoc(doc(db, "guests", editorUid), {
      guestId: editorUid,
      rsvp: { answers: { q1: 5, q2: 3 } },
      updatedBy: editorUid,
      updatedAt: serverTimestamp(),
    }, { merge: true }),
  );
});

test("a guest can save RSVP scale answers to a group member's document", async () => {
  await seedGuestAuth();
  await environment.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(admin.firestore(), "guests", "catherine"), {
      guestId: "catherine",
      identity: { firstName: "Catherine", lastName: "Martin" },
      invitationGroup: editorGroup,
      updatedBy: "seed",
      updatedAt: serverTimestamp(),
    });
  });
  const db = environment.authenticatedContext(editorUid).firestore();
  await assertSucceeds(
    setDoc(doc(db, "guests", "catherine"), {
      guestId: "catherine",
      rsvp: { answers: { q1: 4, q2: 2 } },
      updatedBy: editorUid,
      updatedAt: serverTimestamp(),
    }, { merge: true }),
  );
});

test("a guest can confirm identity (idCheckUser) on their own document", async () => {
  await seedGuestAuth();
  const db = environment.authenticatedContext(editorUid).firestore();
  await assertSucceeds(
    setDoc(doc(db, "guests", editorUid), {
      guestId: editorUid,
      idCheckUser: true,
      updatedBy: editorUid,
      updatedAt: serverTimestamp(),
    }, { merge: true }),
  );
});

// ── Admin write scope: invitationGroup and _deleted ─────────────────────
// Regular guests may NOT modify `invitationGroup` (reassign a guest to a
// different group) or `_deleted` (soft-delete a guest). These are
// administrative operations. Admins MAY modify both.

test("a group member cannot change invitationGroup (admin-only)", async () => {
  await seedGuestAuth();
  // Seed the target guest so the write below is an UPDATE.
  await environment.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(admin.firestore(), "guests", "catherine"), {
      guestId: "catherine",
      identity: {
        firstName: "Catherine",
        lastName: "Martin",
        phone: "+33 6 00 00 00 00",
      },
      invitationGroup: editorGroup,
      updatedBy: "seed",
      updatedAt: serverTimestamp(),
    });
  });

  const db = environment.authenticatedContext(editorUid).firestore();
  await assertFails(
    setDoc(doc(db, "guests", "catherine"), {
      guestId: "catherine",
      identity: { phone: "+33 6 12 34 56 78" },
      invitationGroup: "PetanclubGDL", // attempt to move to another group
      updatedBy: "david_aili",
      updatedAt: serverTimestamp(),
    }),
  );
});

test("a group member cannot soft-delete a guest (admin-only)", async () => {
  await seedGuestAuth();
  // Seed the target guest so the write below is an UPDATE.
  await environment.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(admin.firestore(), "guests", "catherine"), {
      guestId: "catherine",
      identity: {
        firstName: "Catherine",
        lastName: "Martin",
        phone: "+33 6 00 00 00 00",
      },
      invitationGroup: editorGroup,
      updatedBy: "seed",
      updatedAt: serverTimestamp(),
    });
  });

  const db = environment.authenticatedContext(editorUid).firestore();
  await assertFails(
    setDoc(doc(db, "guests", "catherine"), {
      guestId: "catherine",
      identity: { phone: "+33 6 12 34 56 78" },
      invitationGroup: editorGroup,
      _deleted: true, // attempt to soft-delete
      updatedBy: "david_aili",
      updatedAt: serverTimestamp(),
    }),
  );
});

test("an admin can change invitationGroup", async () => {
  await seedAdmin();
  // Seed the target guest so the write below is an UPDATE.
  await environment.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(admin.firestore(), "guests", "catherine"), {
      guestId: "catherine",
      identity: {
        firstName: "Catherine",
        lastName: "Martin",
        phone: "+33 6 00 00 00 00",
      },
      invitationGroup: editorGroup,
      updatedBy: "seed",
      updatedAt: serverTimestamp(),
    });
  });

  const db = environment.authenticatedContext(adminUid).firestore();
  await assertSucceeds(
    setDoc(doc(db, "guests", "catherine"), {
      guestId: "catherine",
      identity: { phone: "+33 6 12 34 56 78" },
      invitationGroup: "PetanclubGDL", // admin may reassign
      updatedBy: "admin-uid-1",
      updatedAt: serverTimestamp(),
    }),
  );
});

test("an admin can soft-delete a guest", async () => {
  await seedAdmin();
  // Seed the target guest so the write below is an UPDATE.
  await environment.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(admin.firestore(), "guests", "catherine"), {
      guestId: "catherine",
      identity: {
        firstName: "Catherine",
        lastName: "Martin",
        phone: "+33 6 00 00 00 00",
      },
      invitationGroup: editorGroup,
      updatedBy: "seed",
      updatedAt: serverTimestamp(),
    });
  });

  const db = environment.authenticatedContext(adminUid).firestore();
  await assertSucceeds(
    setDoc(doc(db, "guests", "catherine"), {
      guestId: "catherine",
      identity: { phone: "+33 6 12 34 56 78" },
      invitationGroup: editorGroup,
      _deleted: true, // admin may soft-delete
      updatedBy: "admin-uid-1",
      updatedAt: serverTimestamp(),
    }),
  );
});


// ── Attendance responses: group-scoped reads ────────────────────────────
// The rules allow a guest to read attendance responses only for their own
// invitation group. Admins can read all. Guests can create/update responses
// for members of their own group.

const attendanceGroup = "Familia de David";
const otherGroup = "PetanclubGDL";

async function seedAttendanceData() {
  await environment.withSecurityRulesDisabled(async (admin) => {
    // Seed the editor's own guest doc (already done in seedGuestAuth).
    // Seed attendance responses for the editor's group and another group.
    await setDoc(doc(admin.firestore(), "attendance_responses", "catherine"), {
      guestId: "catherine",
      friday: "yes",
      saturday: "yes",
      sunday: "maybe",
      invitationGroup: attendanceGroup,
      updatedBy: "seed",
      language: "es",
      schemaVersion: 1,
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(admin.firestore(), "attendance_responses", "sebastien"), {
      guestId: "sebastien",
      friday: "no",
      saturday: "yes",
      sunday: "yes",
      invitationGroup: otherGroup,
      updatedBy: "seed",
      language: "es",
      schemaVersion: 1,
      updatedAt: serverTimestamp(),
    });
  });
}

test("a guest can read attendance responses for their own group", async () => {
  await seedGuestAuth();
  await seedAttendanceData();
  const db = environment.authenticatedContext(editorUid).firestore();
  await assertSucceeds(getDoc(doc(db, "attendance_responses", "catherine")));
});

test("a guest can read attendance responses for another group (read-all policy)", async () => {
  await seedGuestAuth();
  await seedAttendanceData();
  const db = environment.authenticatedContext(editorUid).firestore();
  await assertSucceeds(getDoc(doc(db, "attendance_responses", "sebastien")));
});


test("an admin can read attendance responses for any group", async () => {
  await seedAdmin();
  await seedAttendanceData();
  const db = environment.authenticatedContext(adminUid).firestore();
  await assertSucceeds(getDoc(doc(db, "attendance_responses", "catherine")));
  await assertSucceeds(getDoc(doc(db, "attendance_responses", "sebastien")));
});

test("a guest can create an attendance response for their own group", async () => {
  await seedGuestAuth();
  const db = environment.authenticatedContext(editorUid).firestore();
  await assertSucceeds(
    setDoc(doc(db, "attendance_responses", "catherine"), {
      guestId: "catherine",
      friday: "yes",
      saturday: "yes",
      sunday: "maybe",
      invitationGroup: attendanceGroup,
      updatedBy: editorUid,
      language: "es",
      schemaVersion: 1,
      updatedAt: serverTimestamp(),
    }),
  );
});

test("a guest cannot create an attendance response for another group", async () => {
  await seedGuestAuth();
  const db = environment.authenticatedContext(editorUid).firestore();
  await assertFails(
    setDoc(doc(db, "attendance_responses", "sebastien"), {
      guestId: "sebastien",
      friday: "no",
      saturday: "yes",
      sunday: "yes",
      invitationGroup: otherGroup,
      updatedBy: editorUid,
      language: "es",
      schemaVersion: 1,
      updatedAt: serverTimestamp(),
    }),
  );
});

// ── Admin access to guests collection ──────────────────────────────────
// Admins (guests/{auth.uid}.isAdmin == true) can read and write any guest
// document. Regular guests can only read/write their own group.

test("an admin can read any guest document", async () => {
  await seedAdmin();
  await environment.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(admin.firestore(), "guests", "sebastien"), {
      guestId: "sebastien",
      invitationGroup: otherGroup,
      updatedBy: "seed",
      updatedAt: serverTimestamp(),
    });
  });
  const db = environment.authenticatedContext(adminUid).firestore();
  await assertSucceeds(getDoc(doc(db, "guests", "sebastien")));
});

test("a guest can read a guest from another group (read-all policy)", async () => {
  await seedGuestAuth();
  await environment.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(admin.firestore(), "guests", "sebastien"), {
      guestId: "sebastien",
      invitationGroup: otherGroup,
      updatedBy: "seed",
      updatedAt: serverTimestamp(),
    });
  });
  const db = environment.authenticatedContext(editorUid).firestore();
  await assertSucceeds(getDoc(doc(db, "guests", "sebastien")));
});


// ── Invitation groups: group-scoped reads ─────────────────────────────
// Group content (customContent, tag styling) is personalized per group.
// A guest may only read their OWN group's document (document ID = group
// name). Admins may read all groups. Unauthenticated users may read none.

const groupName = "Familia de David";
const otherGroupName = "PetanclubGDL";

async function seedInvitationGroups() {
  await environment.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(admin.firestore(), "invitation_groups", groupName), {
      customContent: {
        greeting: "¡Hola familia!",
        message: "Bienvenidos a nuestra boda.",
        section: "",
        hideSections: [],
      },
      tag: { color: "#55452d", textColor: "#ffffff", label: "Familia de David" },
    });
    await setDoc(doc(admin.firestore(), "invitation_groups", otherGroupName), {
      customContent: {
        greeting: "Hola Petanclub",
        message: "Nos vemos en GDL.",
        section: "",
        hideSections: [],
      },
      tag: { color: "#123456", textColor: "#ffffff", label: "PetanclubGDL" },
    });
  });
}

test("a guest can read their own invitation group's document", async () => {
  await seedGuestAuth();
  await seedInvitationGroups();
  const db = environment.authenticatedContext(editorUid).firestore();
  await assertSucceeds(getDoc(doc(db, "invitation_groups", groupName)));
});

test("a guest can read another invitation group's document (read-all policy)", async () => {
  await seedGuestAuth();
  await seedInvitationGroups();
  const db = environment.authenticatedContext(editorUid).firestore();
  await assertSucceeds(getDoc(doc(db, "invitation_groups", otherGroupName)));
});


test("an admin can read any invitation group's document", async () => {
  await seedAdmin();
  await seedInvitationGroups();
  const db = environment.authenticatedContext(adminUid).firestore();
  await assertSucceeds(getDoc(doc(db, "invitation_groups", groupName)));
  await assertSucceeds(getDoc(doc(db, "invitation_groups", otherGroupName)));
});

test("an unauthenticated visitor cannot read invitation groups", async () => {
  await seedInvitationGroups();
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, "invitation_groups", groupName)));
});

test("a guest cannot write to invitation groups", async () => {
  await seedGuestAuth();
  await seedInvitationGroups();
  const db = environment.authenticatedContext(editorUid).firestore();
  await assertFails(
    setDoc(doc(db, "invitation_groups", groupName), {
      customContent: { greeting: "Hacked", message: "", section: "", hideSections: [] },
    }),
  );
});

test("an admin can write to invitation groups", async () => {
  await seedAdmin();
  await seedInvitationGroups();
  const db = environment.authenticatedContext(adminUid).firestore();
  await assertSucceeds(
    setDoc(doc(db, "invitation_groups", groupName), {
      customContent: {
        greeting: "¡Hola familia!",
        message: "Bienvenidos a nuestra boda.",
        section: "",
        hideSections: [],
      },
      tag: { color: "#55452d", textColor: "#ffffff", label: "Familia de David" },
    }),
  );
});

// ── Cabins & rooms: invited-guest reads ─────────────────────────────────
// The `cabins` and `rooms` collections are the source of truth for the
// Accommodation section. They are readable by invited guests only (NOT the
// public), and writable only by administrators. This prevents unauthenticated
// visitors and non-invited users from reading the cabin inventory (capacity,
// pricing) and room inventory.

const cabinId = "VILLA AZALEA";
const roomId = "VILLA AZALEA-1";

async function seedCabinsAndRooms() {
  await environment.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(admin.firestore(), "cabins", cabinId), {
      id: cabinId,
      name: "VILLA AZALEA - 12p",
      capacity: 12,
      totalPrice2Nights: 24000,
      pricePerPerson2Nights: 2000,
      isPrivate: false,
      showcase: { es: "Villa", fr: "Villa", en: "Villa" },
      cloudinaryIds: "cabin-azalea-01",
    });
    await setDoc(doc(admin.firestore(), "rooms", roomId), {
      id: roomId,
      cabin: cabinId,
      description: { es: "Cuarto", fr: "Chambre", en: "Room" },
      capacity: 2,
      isShared: true,
    });
  });
}

test("an invited guest can read cabins and rooms", async () => {
  await seedGuestAuth();
  await seedCabinsAndRooms();
  const db = environment.authenticatedContext(editorUid).firestore();
  await assertSucceeds(getDoc(doc(db, "cabins", cabinId)));
  await assertSucceeds(getDoc(doc(db, "rooms", roomId)));
});

test("an unauthenticated visitor cannot read cabins or rooms", async () => {
  await seedCabinsAndRooms();
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, "cabins", cabinId)));
  await assertFails(getDoc(doc(db, "rooms", roomId)));
});

test("a non-invited authenticated user can read cabins or rooms (read-all policy)", async () => {
  await seedCabinsAndRooms();
  const db = environment
    .authenticatedContext("not-invited", {
      email: "stranger@example.com",
      email_verified: true,
    })
    .firestore();
  await assertSucceeds(getDoc(doc(db, "cabins", cabinId)));
  await assertSucceeds(getDoc(doc(db, "rooms", roomId)));
});


test("a guest cannot write to cabins or rooms (admin-only)", async () => {
  await seedGuestAuth();
  await seedCabinsAndRooms();
  const db = environment.authenticatedContext(editorUid).firestore();
  await assertFails(
    setDoc(doc(db, "cabins", cabinId), {
      id: cabinId,
      name: "Hacked",
      capacity: 1,
      totalPrice2Nights: 0,
      pricePerPerson2Nights: 0,
      isPrivate: false,
    }),
  );
  await assertFails(
    setDoc(doc(db, "rooms", roomId), {
      id: roomId,
      cabin: cabinId,
      description: { es: "Hacked", fr: "Hacked", en: "Hacked" },
      capacity: 1,
      isShared: false,
    }),
  );
});

