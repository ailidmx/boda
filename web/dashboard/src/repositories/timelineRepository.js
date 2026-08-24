// timelineRepository — Firestore access for the multi-layer wedding timeline.
// Owns the `timeline_layers` and `timeline_slots` collections.
// No UI behavior, no business rules (those live in `web/dashboard/src/budget/`).

import { collection, doc, deleteDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { collections } from "../../../shared/firestore-paths.js";

export function saveLayer(payload) {
  if (!payload?.id) return Promise.reject(new Error("[timelineRepository] layer missing id"));
  return setDoc(doc(db, collections.timelineLayers, payload.id), payload, { merge: true });
}

export function saveSlot(payload) {
  if (!payload?.id) return Promise.reject(new Error("[timelineRepository] slot missing id"));
  return setDoc(doc(db, collections.timelineSlots, payload.id), payload, { merge: true });
}

export function deleteLayer(id) {
  return deleteDoc(doc(db, collections.timelineLayers, id));
}

export function deleteSlot(id) {
  return deleteDoc(doc(db, collections.timelineSlots, id));
}

export function subscribeLayers(onData) {
  return onSnapshot(collection(db, collections.timelineLayers), (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function subscribeSlots(onData) {
  return onSnapshot(collection(db, collections.timelineSlots), (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export default { saveLayer, saveSlot, deleteLayer, deleteSlot, subscribeLayers, subscribeSlots };
