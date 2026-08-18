import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

const projectId = "boda-rules-test";
const guestUid = "yfu7MMCmFaPCK7UW4czr5c3x7Aa2";
let environment;

// ─────────────────────────────────────────────────────────────────────────
// SIMPLE RULES MODEL
// ─────────────────────────────────────────────────────────────────────────
// 1. ANY authenticated guest can READ every collection.
// 2. ANY authenticated guest can WRITE (create/update) any document,
//    including editing any other guest's document.
// 3. ONLY administrators (isAdmin) can DELETE.
// 4. No schema/field validation — the rules do not depend on any field
//    definition. The app validates payloads client-side.
//
// An administrator is any authenticated user whose own guest document in
// `guests/{auth.uid}` has `isAdmin == true`.
// ─────────────────────────────────────────────────────────────────────────

const adminUid = "admin-uid-1";
const editorUid = "editor-uid-1";
const editorGroup = "Familia de David";
const otherGroup = "PetanclubGDL";

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

async function seedGuestAuth() {
  await environment.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(admin.firestore(), "guests", editorUid), {
      guestId: editorUid,
      invitationGroup: editorGroup,
      updatedBy: "seed",
      updatedAt: serverTimestamp(),
    });
  });
}

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

  // Seed the invited guest so `isAdmin()` / reads resolve cleanly.
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

// ── Reads: any authenticated user can read everything ───────────────────

test("an authenticated guest can read any collection", async () => {
  await seedGuestAuth();
  const db = environment.authenticatedContext(editorUid).firestore();
  await assertSucceeds(getDoc(doc(db, "guests", "catherine")));
  await assertSucceeds(getDoc(doc(db, "rsvp_submissions", "valid")));
  await assertSucceeds(getDoc(doc(db, "experience_suggestions", "valid")));
  await assertSucceeds(getDoc(doc(db, "coast_interest", "valid")));
  await assertSucceeds(getDoc(doc(db, "petanque_participation", "valid")));
  await assertSucceeds(getDoc(doc(db, "attendance_responses", "catherine")));
  await assertSucceeds(getDoc(doc(db, "invitation_groups", editorGroup)));
  await assertSucceeds(getDoc(doc(db, "cabins", "VILLA AZALEA")));
  await assertSucceeds(getDoc(doc(db, "rooms", "VILLA AZALEA-1")));
  await assertSucceeds(getDoc(doc(db, "tables", "Mesa 1")));
  await assertSucceeds(getDoc(doc(db, "thanks", "credit-1")));
  await assertSucceeds(getDoc(doc(db, "login_events", "event-1")));
  await assertSucceeds(getDoc(doc(db, "activity_events", "event-1")));
  await assertSucceeds(getDoc(doc(db, "page_views", "view-1")));
  await assertSucceeds(getDoc(doc(db, "card_votes", "vote-1")));
  await assertSucceeds(getDoc(doc(db, "genre_ratings", "rating-1")));
  await assertSucceeds(getDoc(doc(db, "guiso_rankings", "guest-1")));
  await assertSucceeds(getDoc(doc(db, "song_requests", "request-1")));
});

test("an unauthenticated visitor cannot read anything", async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, "guests", "catherine")));
  await assertFails(getDoc(doc(db, "rsvp_submissions", "valid")));
  await assertFails(getDoc(doc(db, "invitation_groups", editorGroup)));
  await assertFails(getDoc(doc(db, "cabins", "VILLA AZALEA")));
});

// ── Writes: any authenticated user can create/update any document ───────

test("an authenticated guest can write to any collection", async () => {
  await seedGuestAuth();
  const db = environment.authenticatedContext(editorUid).firestore();
  // Guests collection: edit any other guest.
  await assertSucceeds(
    setDoc(doc(db, "guests", "catherine"), {
      guestId: "catherine",
      identity: { phone: "+33 6 12 34 56 78" },
      invitationGroup: otherGroup,
      updatedBy: editorUid,
      updatedAt: serverTimestamp(),
    }),
  );
  // RSVP answers on any guest.
  await assertSucceeds(
    setDoc(doc(db, "guests", "catherine"), {
      guestId: "catherine",
      rsvp: { answers: { q1: 4, q2: 2 } },
      updatedBy: editorUid,
      updatedAt: serverTimestamp(),
    }, { merge: true }),
  );
  // Cabins / rooms / tables / thanks.
  await assertSucceeds(
    setDoc(doc(db, "cabins", "VILLA AZALEA"), {
      id: "VILLA AZALEA",
      name: "VILLA AZALEA - 12p",
      capacity: 12,
    }),
  );
  await assertSucceeds(
    setDoc(doc(db, "rooms", "VILLA AZALEA-1"), {
      id: "VILLA AZALEA-1",
      cabin: "VILLA AZALEA",
      capacity: 2,
    }),
  );
  await assertSucceeds(
    setDoc(doc(db, "tables", "Mesa 1"), {
      id: "Mesa 1",
      name: "Mesa 1",
      capacity: 10,
    }),
  );
  await assertSucceeds(
    setDoc(doc(db, "thanks", "credit-1"), { guest: "Camille", es: "Gracias" }),
  );
  // Submission collections.
  await assertSucceeds(
    setDoc(doc(db, "rsvp_submissions", "valid"), {
      firstName: "Camille",
      lastName: "Martin",
      email: "camille@example.com",
      whatsapp: "+33 6 00 00 00 00",
      attendance: "yes",
      language: "fr",
      schemaVersion: 3,
      createdAt: serverTimestamp(),
    }),
  );
  // Activity / page view / card vote / genre rating / guiso / song.
  await assertSucceeds(
    setDoc(doc(db, "activity_events", "event-1"), {
      guestId: editorUid,
      type: "inactive",
      idleSeconds: 300,
      createdAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    setDoc(doc(db, "page_views", "view-1"), {
      guestId: editorUid,
      sectionId: "hero",
      navigationType: "nav",
      createdAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    setDoc(doc(db, "card_votes", "vote-1"), {
      cardType: "food",
      cardKey: "tacos",
      guestId: editorUid,
      rating: 5,
      updatedBy: editorUid,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    setDoc(doc(db, "genre_ratings", "rating-1"), {
      genreId: "rock",
      genreName: "Rock",
      guestId: editorUid,
      rating: 4,
      updatedBy: editorUid,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    setDoc(doc(db, "guiso_rankings", "guest-1"), {
      guestId: editorUid,
      ranking: ["guiso1", "guiso2"],
      selected: ["guiso1"],
      updatedBy: editorUid,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    setDoc(doc(db, "song_requests", "request-1"), {
      guestId: editorUid,
      song: "La vie en rose",
      intent: "hear",
      updatedBy: editorUid,
      updatedAt: serverTimestamp(),
    }),
  );
});

// ── Payment confirmation (accommodation contribution) ───────────────────
// Mirrors the exact payload shape written by `savePaymentConfirmed` →
// `buildGuestPaymentConfirmedPayload` in the invitation app: a top-level
// boolean `paymentConfirmed` plus the standard audit fields. The rules use
// the SIMPLE model (`allow create, update: if canWrite()`), so ANY
// authenticated guest may write this field on their OWN doc AND on any other
// guest's doc (including every member of their invitation group) WITHOUT
// declaring the field name explicitly in the rules. These tests prove there
// is no permission error on prod when a guest confirms payment for
// themselves or for another guest in their group.

test("a guest can confirm payment on their OWN guest doc", async () => {
  await seedGuestAuth();
  const db = environment.authenticatedContext(editorUid).firestore();
  await assertSucceeds(
    setDoc(doc(db, "guests", editorUid), {
      guestId: editorUid,
      paymentConfirmed: true,
      updatedBy: editorUid,
      updatedAt: serverTimestamp(),
    }, { merge: true }),
  );
});

test("a guest can confirm payment on ANOTHER guest's doc (group member)", async () => {
  await seedGuestAuth();
  const db = environment.authenticatedContext(editorUid).firestore();
  // `catherine` is a different guest (same invitation group in the seed data).
  await assertSucceeds(
    setDoc(doc(db, "guests", "catherine"), {
      guestId: "catherine",
      paymentConfirmed: true,
      updatedBy: editorUid,
      updatedAt: serverTimestamp(),
    }, { merge: true }),
  );
});

test("a guest can write RSVP answers on ANOTHER guest's doc (group member)", async () => {
  await seedGuestAuth();
  const db = environment.authenticatedContext(editorUid).firestore();
  await assertSucceeds(
    setDoc(doc(db, "guests", "catherine"), {
      guestId: "catherine",
      rsvp: { answers: { friday: 4, saturday: 5, sunday: 4 } },
      updatedBy: editorUid,
      updatedAt: serverTimestamp(),
    }, { merge: true }),
  );
});

test("an unauthenticated visitor cannot write anything", async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(
    setDoc(doc(db, "guests", "catherine"), {
      guestId: "catherine",
      updatedBy: "anon",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    setDoc(doc(db, "rsvp_submissions", "valid"), {
      firstName: "Camille",
      lastName: "Martin",
      email: "camille@example.com",
      whatsapp: "+33 6 00 00 00 00",
      attendance: "yes",
      language: "fr",
      schemaVersion: 3,
      createdAt: serverTimestamp(),
    }),
  );
});

// ── Deletes: only administrators can delete ─────────────────────────────

test("a regular guest cannot delete documents", async () => {
  await seedGuestAuth();
  const db = environment.authenticatedContext(editorUid).firestore();
  await assertFails(deleteDoc(doc(db, "guests", "catherine")));
  await assertFails(deleteDoc(doc(db, "rsvp_submissions", "valid")));
});

test("an admin can delete documents", async () => {
  await seedAdmin();
  const db = environment.authenticatedContext(adminUid).firestore();
  await assertSucceeds(deleteDoc(doc(db, "guests", "catherine")));
  await assertSucceeds(deleteDoc(doc(db, "rsvp_submissions", "valid")));
});

// ── Admin write scope ───────────────────────────────────────────────────

test("an admin can write to any collection", async () => {
  await seedAdmin();
  const db = environment.authenticatedContext(adminUid).firestore();
  await assertSucceeds(
    setDoc(doc(db, "guests", "catherine"), {
      guestId: "catherine",
      isAdmin: true,
      invitationGroup: otherGroup,
      _deleted: true,
      updatedBy: adminUid,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    setDoc(doc(db, "invitation_groups", editorGroup), {
      customContent: { greeting: "¡Hola!", message: "", section: "", hideSections: [] },
      tag: { color: "#55452d", textColor: "#ffffff", label: "Familia de David" },
    }),
  );
});
