import type { LandingProduct } from "./catalog";

export type LocalLandingState = {
  images: Record<string, string>;
  edits: Record<string, Partial<Pick<LandingProduct, "title" | "short" | "long">>>;
  custom: LandingProduct[];
};

const DATABASE = "momtazchem-home-preview-v2";
const STORE = "local-content";
const STATE_KEY = "landing";

function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) { reject(new Error("Browser storage is unavailable.")); return; }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open browser storage."));
    request.onblocked = () => reject(new Error("Browser storage is blocked by another tab."));
  });
}

export async function readLocalLanding(): Promise<LocalLandingState | null> {
  const db = await openStore();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readonly");
    const request = transaction.objectStore(STORE).get(STATE_KEY);
    transaction.oncomplete = () => db.close();
    transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error("Could not read browser storage.")); };
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => { db.close(); reject(request.error ?? new Error("Could not read browser storage.")); };
  });
}

export async function writeLocalLanding(state: LocalLandingState): Promise<void> {
  const db = await openStore();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(state, STATE_KEY);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("Could not save browser preview.")); };
    transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error("Browser preview save was interrupted.")); };
  });
}

export function imageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) { reject(new Error("Please choose an image file.")); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected image could not be read."));
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Invalid image data."));
    reader.readAsDataURL(file);
  });
}
