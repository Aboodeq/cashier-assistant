import { collection, deleteDoc, doc, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "../../../firebase/config";
import { nowMs } from "../domain/dates";

/*
 * Every write goes through here.
 *
 * Firestore applies writes to its local cache immediately, so these functions
 * don't await the server: the UI updates from the local snapshot right away
 * and the change syncs whenever there's signal. That's what makes the app
 * usable in the field with no connection. Failures surface later through the
 * registered error handler (a toast), not by blocking the screen.
 */

let reportError = (error) => console.error(error);

export function setWriteErrorHandler(handler) {
  reportError = handler;
}

function track(promise) {
  promise.catch((error) => {
    console.error(error);
    reportError(error);
  });
}

const uid = () => auth.currentUser?.uid;
const colRef = (name) => collection(db, "users", uid(), name);
const docRef = (name, id) => doc(db, "users", uid(), name, id);
const newRef = (name) => doc(colRef(name));

/**
 * Firestore rejects `undefined` field values, and forms routinely produce them
 * (e.g. `createdAt: existing?.createdAt` when editing a document written before
 * that field existed). Drop them — `null` is used where a value is cleared.
 */
function prune(data) {
  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) clean[key] = value;
  }
  return clean;
}

/** Upsert helper: keeps createdAt on updates, stamps it on inserts. */
function save(name, data, id) {
  const ref = id ? docRef(name, id) : newRef(name);
  const payload = prune({ ...data, updatedAt: nowMs() });
  if (!id || data.createdAt) payload.createdAt = data.createdAt || nowMs();
  track(setDoc(ref, payload, { merge: true }));
  return ref.id;
}

const remove = (name, id) => track(deleteDoc(docRef(name, id)));

/* ── Territories ── */
export const saveTerritory = (data, id) => save("salesTerritories", data, id);
export const deleteTerritory = (id) => remove("salesTerritories", id);

/* ── Clients ── */
export const saveClient = (data, id) => save("salesClients", data, id);
export const deleteClient = (id) => remove("salesClients", id);
export const setClientLocation = (id, coords) =>
  track(updateDoc(docRef("salesClients", id), { location: { ...coords, savedAt: nowMs() } }));
export const clearClientLocation = (id) => track(updateDoc(docRef("salesClients", id), { location: null }));

/* ── Visits ── */
export const saveVisit = (data, id) => save("salesVisits", data, id);
export const deleteVisit = (id) => remove("salesVisits", id);
export const setVisitFollowUpDone = (id, done) =>
  track(updateDoc(docRef("salesVisits", id), { followUpDone: done }));

/* ── Products & promotions ── */
export const saveProduct = (data, id) => save("salesProducts", data, id);
export const deleteProduct = (id) => remove("salesProducts", id);
export const savePromotion = (data, id) => save("salesPromotions", data, id);
export const deletePromotion = (id) => remove("salesPromotions", id);
export const setPromotionActive = (id, active) =>
  track(updateDoc(docRef("salesPromotions", id), { active, updatedAt: nowMs() }));

/* ── Payments (collections) ── */
export const savePayment = (data, id) => save("salesPayments", data, id);
export const deletePayment = (id) => remove("salesPayments", id);

/* ── Expenses & goals ── */
export const saveExpense = (data, id) => save("salesExpenses", data, id);
export const deleteExpense = (id) => remove("salesExpenses", id);
export const saveGoal = (data, id) => save("salesGoals", data, id);
export const deleteGoal = (id) => remove("salesGoals", id);

/* ── Settings ── */
export const saveSettings = (data) =>
  track(setDoc(docRef("salesSettings", "main"), prune({ ...data, updatedAt: nowMs() }), { merge: true }));

/* ── Stock moves ── */
export const saveMove = (data, id) => save("salesStockMoves", data, id);
export const deleteMove = (id) => remove("salesStockMoves", id);

/**
 * An invoice and the stock it moves are written together in one batch, so the
 * two can never disagree. Editing replaces the previous moves and any down
 * payment recorded with it.
 */
export function saveOrder({ order, id, moves = [], payments = [], replaceMoves = [], replacePayments = [] }) {
  const batch = writeBatch(db);
  const ref = id ? docRef("salesOrders", id) : newRef("salesOrders");
  batch.set(ref, prune({ ...order, createdAt: order.createdAt || nowMs(), updatedAt: nowMs() }));

  for (const move of replaceMoves) batch.delete(docRef("salesStockMoves", move.id));
  for (const payment of replacePayments) batch.delete(docRef("salesPayments", payment.id));
  for (const move of moves) {
    batch.set(newRef("salesStockMoves"), prune({ ...move, orderId: ref.id, createdAt: nowMs() }));
  }
  for (const payment of payments) {
    batch.set(newRef("salesPayments"), prune({ ...payment, orderId: ref.id, createdAt: nowMs() }));
  }
  track(batch.commit());
  return ref.id;
}

export function deleteOrder({ order, moves = [], payments = [] }) {
  const batch = writeBatch(db);
  for (const move of moves) batch.delete(docRef("salesStockMoves", move.id));
  for (const payment of payments) batch.delete(docRef("salesPayments", payment.id));
  batch.delete(docRef("salesOrders", order.id));
  track(batch.commit());
}

/** Bulk load / return: one document for the run plus a move per line. */
export function saveLoad({ load, moves, id, replaceMoves = [] }) {
  const batch = writeBatch(db);
  const ref = id ? docRef("salesLoads", id) : newRef("salesLoads");
  batch.set(ref, prune({ ...load, createdAt: load.createdAt || nowMs(), updatedAt: nowMs() }));
  for (const move of replaceMoves) batch.delete(docRef("salesStockMoves", move.id));
  for (const move of moves) {
    batch.set(newRef("salesStockMoves"), prune({ ...move, loadId: ref.id, createdAt: nowMs() }));
  }
  track(batch.commit());
  return ref.id;
}

export function deleteLoad({ load, moves = [] }) {
  const batch = writeBatch(db);
  for (const move of moves) batch.delete(docRef("salesStockMoves", move.id));
  batch.delete(docRef("salesLoads", load.id));
  track(batch.commit());
}

/** End-of-day count: the count sheet plus one correction move per difference. */
export function saveCount({ count, moves }) {
  const batch = writeBatch(db);
  const ref = newRef("salesCounts");
  batch.set(ref, prune({ ...count, createdAt: nowMs() }));
  for (const move of moves) {
    batch.set(newRef("salesStockMoves"), prune({ ...move, countId: ref.id, createdAt: nowMs() }));
  }
  track(batch.commit());
  return ref.id;
}

export function deleteCount({ count, moves = [] }) {
  const batch = writeBatch(db);
  for (const move of moves) batch.delete(docRef("salesStockMoves", move.id));
  batch.delete(docRef("salesCounts", count.id));
  track(batch.commit());
}
