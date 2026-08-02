import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

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

test("the guest and unrelated accounts cannot read submissions", async () => {
  const guestDb = environment.authenticatedContext(guestUid).firestore();
  const otherDb = environment
    .authenticatedContext("other", {
      email: "someone@example.com",
      email_verified: true,
    })
    .firestore();

  await assertFails(getDoc(doc(guestDb, "rsvp_submissions", "valid")));
  await assertFails(getDoc(doc(otherDb, "rsvp_submissions", "valid")));
});

test("David and Aydé can read submissions with verified emails", async () => {
  for (const email of ["david.aili.mx@gmail.com", "aydemiss@gmail.com"]) {
    const db = environment
      .authenticatedContext(email, { email, email_verified: true })
      .firestore();
    await assertSucceeds(getDoc(doc(db, "rsvp_submissions", "valid")));
    await assertSucceeds(
      getDoc(doc(db, "experience_suggestions", "valid")),
    );
    await assertSucceeds(getDoc(doc(db, "coast_interest", "valid")));
  }
});

test("an allowlisted but unverified email cannot read submissions", async () => {
  const db = environment
    .authenticatedContext("unverified-david", {
      email: "david.aili.mx@gmail.com",
      email_verified: false,
    })
    .firestore();
  await assertFails(getDoc(doc(db, "rsvp_submissions", "valid")));
});

// ── Guests collection: group members may edit each other's contact ──────
// The `guests` collection is the source of truth for guest records. Any
// authenticated guest may update the phone/email of a member of their own
// invitation group (mapped via guest_auth/{uid}.invitationGroup), but nothing
// else, and never members of another group.

const editorUid = "editor-uid-1";
const editorGroup = "Familia de David";

async function seedGuestAuth() {
  const admin = environment.adminContext().firestore();
  await setDoc(doc(admin, "guest_auth", editorUid), {
    guestId: "david_aili",
    invitationGroup: editorGroup,
  });
}

test("a group member can update the phone of another member in their group", async () => {
  await seedGuestAuth();
  const db = environment.authenticatedContext(editorUid).firestore();
  await assertSucceeds(
    setDoc(doc(db, "guests", "catherine"), {
      guestId: "catherine",
      phone: "+33 6 12 34 56 78",
      email: "catherine@example.com",
      invitationGroup: editorGroup,
      updatedBy: "david_aili",
      updatedAt: serverTimestamp(),
    }),
  );
});

test("a group member cannot edit non-contact fields of another member", async () => {
  await seedGuestAuth();
  const db = environment.authenticatedContext(editorUid).firestore();
  await assertFails(
    setDoc(doc(db, "guests", "catherine"), {
      guestId: "catherine",
      firstName: "Hacked",
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
      phone: "+33 6 00 00 00 00",
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
      phone: "+33 6 00 00 00 00",
      invitationGroup: editorGroup,
      updatedBy: "david_aili",
      updatedAt: serverTimestamp(),
    }),
  );
});

