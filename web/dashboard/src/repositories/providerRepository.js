// providerRepository — Firestore access for the provider/vendor catalog.
// Owns the `providers`, `provider_offers`, and `slot_candidates` collections.
// No UI behavior, no business rules (those live in `web/dashboard/src/budget/`).

import { collection, doc, deleteDoc, getDocs, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { collections } from "../../../shared/firestore-paths.js";

async function upsert(collectionName, id, payload) {
  if (!id) throw new Error(`[providerRepository] missing id for ${collectionName}`);
  await setDoc(doc(db, collectionName, id), payload, { merge: true });
  return id;
}

export function saveProvider(payload) {
  return upsert(collections.providers, payload.id, payload);
}

export function saveOffer(payload) {
  return upsert(collections.providerOffers, payload.id, payload);
}

export function saveCandidate(payload) {
  // candidate doc id convention: `${slotId}_${offerId}` (stable, dedupes).
  const id = payload.id || (payload.slotId && payload.offerId ? `${payload.slotId}_${payload.offerId}` : null);
  return upsert(collections.slotCandidates, id, { ...payload, id });
}

export async function deleteProvider(id) {
  await deleteDoc(doc(db, collections.providers, id));
}

export async function deleteOffer(id) {
  await deleteDoc(doc(db, collections.providerOffers, id));
}

export async function deleteCandidate(id) {
  await deleteDoc(doc(db, collections.slotCandidates, id));
}

export function subscribeProviders(onData) {
  return onSnapshot(collection(db, collections.providers), (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function subscribeOffers(onData) {
  return onSnapshot(collection(db, collections.providerOffers), (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function subscribeCandidates(onData) {
  return onSnapshot(collection(db, collections.slotCandidates), (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export default {
  saveProvider, saveOffer, saveCandidate,
  deleteProvider, deleteOffer, deleteCandidate,
  subscribeProviders, subscribeOffers, subscribeCandidates,
};
