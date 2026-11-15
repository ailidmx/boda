/**
 * Ceremonia Player — browser-local audio store.
 *
 * The imported track is a lawfully obtained local file chosen by the admin (no
 * download from Spotify/YouTube, no copy in the repo, no copy in Firebase
 * Hosting). It lives in IndexedDB, per browser, so it is never published with
 * the site and never leaves the machine unless the admin exports something.
 *
 * Everything degrades gracefully: if IndexedDB is unavailable the panel still
 * works, it just cannot remember the file between reloads.
 */

const DB_NAME = "boda-ceremonia";
const DB_VERSION = 1;
const STORE = "audio";
const KEY = "current";

/** Hard cap so a wrong file cannot freeze the dashboard. */
export const MAX_AUDIO_BYTES = 48 * 1024 * 1024;

const ACCEPTED = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
  "audio/webm",
];

export function isSupportedAudioFile(file) {
  if (!file) return false;
  if (file.size > MAX_AUDIO_BYTES) return false;
  if (ACCEPTED.includes(file.type)) return true;
  return /\.(mp3|wav|m4a|aac|ogg|oga|webm)$/iu.test(file.name || "");
}

let dbPromise = null;

function openDb() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    let request;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
  return dbPromise;
}

function runTransaction(mode, action) {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) {
          resolve(null);
          return;
        }
        let request;
        try {
          const tx = db.transaction(STORE, mode);
          request = action(tx.objectStore(STORE));
        } catch {
          resolve(null);
          return;
        }
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => resolve(null);
      }),
  );
}

/**
 * Persist the audio file + the metadata the panel needs to restore it.
 * `record = { blob, name, type, size, duration }`.
 */
export function saveAudio(record) {
  return runTransaction("readwrite", (store) => store.put(record, KEY));
}

/** @returns {Promise<null|{blob:Blob,name:string,type:string,size:number,duration:number,savedAt:number}>} */
export function loadAudio() {
  return runTransaction("readonly", (store) => store.get(KEY));
}

export function clearAudio() {
  return runTransaction("readwrite", (store) => store.delete(KEY));
}
