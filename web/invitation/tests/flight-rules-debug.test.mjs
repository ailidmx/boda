import { readFile } from "node:fs/promises";
import { initializeTestEnvironment, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const projectId = "boda-rules-test";
const uid = "dimitar";

const env = await initializeTestEnvironment({
  projectId,
  firestore: {
    rules: await readFile(new URL("../../../firebase/firestore.rules", import.meta.url), "utf8"),
  },
});

// Seed the dimitar guest doc with its REAL fields (from PROD inspection)
await env.withSecurityRulesDisabled(async (admin) => {
  await setDoc(doc(admin.firestore(), "guests", uid), {
    _migratedAt: serverTimestamp(),
    _source: "sheet",
    hosting: {
      cabin: "casona", room: "1", xtraCabin: "", xtraRoom: "",
      isCabinPaid: true, isCabinPaidByNovios: false,
      isXtraCabinPaid: false, isXtraCabinPaidByNovios: false
    },
    id: uid,
    idCheckUser: false,
    identity: {
      age: "30", cloudinaryId: "cabin/casona/foo", firstName: "Dimitar",
      gender: "male", lang: "es", lastName: "S", maternalLastName: "",
      middleName: "", phone: "+52 1 55 0000 0000"
    },
    invitationGroup: "Dimitar",
    isAdmin: false,
    maternalLastName: "",
    message: "",
    messageAuthor: "",
    modifiedAt: serverTimestamp(),
    rsvp: { attendance: "yes" },
    sent: true,
    table: "1",
    tagGroup: "amigos",
    travelsByPlane: true,
    updatedAt: serverTimestamp(),
    updatedBy: "seed",
  });
});

const db = env.authenticatedContext(uid).firestore();

// TEST 1: minimal write (no flightInfo) - does the base schema pass?
const minimal = {
  guestId: uid,
  updatedBy: uid,
  updatedAt: serverTimestamp()
};
try {
  await assertSucceeds(setDoc(doc(db, "guests", uid), minimal, { merge: true }));
  console.log("TEST1 (minimal): SUCCEEDED");
} catch (e) {
  console.log("TEST1 (minimal): FAILED -", e.message.split("\n")[0]);
}

// TEST 2: flightInfo write
const payload = {
  guestId: uid,
  flightInfo: {
    origin: { iata: "GDL", name: "Guadalajara", countryCode: "MX" },
    destination: { iata: "PVR", name: "Puerto Vallarta", countryCode: "MX" },
    arrivalDate: "2026-08-20",
    arrivalTime: "14:30",
    finalFlightNumber: "VW123"
  },
  updatedBy: uid,
  updatedAt: serverTimestamp()
};
try {
  await assertSucceeds(setDoc(doc(db, "guests", uid), payload, { merge: true }));
  console.log("TEST2 (flightInfo): SUCCEEDED");
} catch (e) {
  console.log("TEST2 (flightInfo): FAILED -", e.message.split("\n")[0]);
}

await env.cleanup();
process.exit(0);
