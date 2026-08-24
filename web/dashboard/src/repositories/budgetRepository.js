// budgetRepository — Firestore access for the funding / budget domain.
// Owns `budget_manual_items`, `contributions`, `payments`, and `budget_events`.
// No UI behavior, no business rules (those live in `web/dashboard/src/budget/`).

import { collection, doc, deleteDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { collections } from "../../../shared/firestore-paths.js";

export function saveManualItem(payload) {
  if (!payload?.id) return Promise.reject(new Error("[budgetRepository] manual item missing id"));
  return setDoc(doc(db, collections.budgetManualItems, payload.id), payload, { merge: true });
}

export function saveContribution(payload) {
  if (!payload?.id) return Promise.reject(new Error("[budgetRepository] contribution missing id"));
  return setDoc(doc(db, collections.contributions, payload.id), payload, { merge: true });
}

export function savePayment(payload) {
  if (!payload?.id) return Promise.reject(new Error("[budgetRepository] payment missing id"));
  return setDoc(doc(db, collections.payments, payload.id), payload, { merge: true });
}

export function saveEventContext(payload) {
  const id = payload?.id || "main";
  return setDoc(doc(db, collections.budgetEvents, id), payload, { merge: true });
}

export function deleteManualItem(id) { return deleteDoc(doc(db, collections.budgetManualItems, id)); }
export function deleteContribution(id) { return deleteDoc(doc(db, collections.contributions, id)); }
export function deletePayment(id) { return deleteDoc(doc(db, collections.payments, id)); }

export function subscribeManualItems(onData) {
  return onSnapshot(collection(db, collections.budgetManualItems), (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function subscribeContributions(onData) {
  return onSnapshot(collection(db, collections.contributions), (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function subscribePayments(onData) {
  return onSnapshot(collection(db, collections.payments), (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export default {
  saveManualItem, saveContribution, savePayment, saveEventContext,
  deleteManualItem, deleteContribution, deletePayment,
  subscribeManualItems, subscribeContributions, subscribePayments,
};
