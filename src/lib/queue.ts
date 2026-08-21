import { openDB, type DBSchema, type IDBPDatabase } from "idb";

/**
 * Kolejka wysyłkowa w IndexedDB.
 *
 * Zdjęcie trafia tutaj ZANIM poleci sieć. Gość widzi „w kolejce" natychmiast,
 * nawet przy zerowym zasięgu na spacerze, a zadanie przeżywa zamknięcie
 * aplikacji i restart telefonu — przy zbiórce rozłożonej na trzy dni to nie
 * jest scenariusz awaryjny, tylko normalny.
 *
 * Zadanie znika dopiero po potwierdzeniu z serwera (`finalize`). Wszystko
 * pomiędzy jest ponawialne, bo `photoId` powstaje na telefonie: powtórka
 * trafia w te same ścieżki w bucketcie i w ten sam wiersz w bazie.
 *
 * **Trzymamy ArrayBuffer, nie Blob.** Blob w IndexedDB jest w teorii trwały,
 * ale iOS Safari ma udokumentowaną historię gubienia zawartości blobów po
 * zamknięciu strony — a to jest dokładnie ten scenariusz, na którym opiera się
 * cała obietnica „zdjęcie dojdzie samo". Surowe bajty nie mają tej klasy
 * problemów i przy okazji dają się przetestować, bo Blob nie przechodzi przez
 * structuredClone w środowisku testowym.
 */

export type JobState = "queued" | "uploading" | "done" | "failed";

export type Job = {
  photoId: string;
  categoryId: number;
  state: JobState;
  ext: "webp" | "jpeg";
  mime: string;
  preview: ArrayBuffer;
  thumb: ArrayBuffer;
  /** Oryginał trzymamy od Etapu 2, wysyłamy na Dysk dopiero w Etapie 3. */
  original: ArrayBuffer | null;
  originalMime: string | null;
  originalName: string | null;
  width: number;
  height: number;
  /** Podgląd plus miniatura — to trafia do licznika zajętości w panelu. */
  bytes: number;
  originalBytes: number;
  attempts: number;
  lastError: string | null;
  createdAt: number;
  updatedAt: number;
};

interface Schema extends DBSchema {
  jobs: {
    key: string;
    value: Job;
    indexes: { "by-state": JobState; "by-category": number };
  };
}

const DB_NAME = "fotobingo";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;

function database(): Promise<IDBPDatabase<Schema>> {
  dbPromise ??= openDB<Schema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore("jobs", { keyPath: "photoId" });
      store.createIndex("by-state", "state");
      store.createIndex("by-category", "categoryId");
    },
  });
  return dbPromise;
}

export type NewJob = Omit<
  Job,
  "state" | "attempts" | "lastError" | "createdAt" | "updatedAt" | "bytes"
>;

export async function enqueue(job: NewJob): Promise<Job> {
  const now = Date.now();
  const full: Job = {
    ...job,
    bytes: job.preview.byteLength + job.thumb.byteLength,
    state: "queued",
    attempts: 0,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };
  await (await database()).put("jobs", full);
  return full;
}

export async function allJobs(): Promise<Job[]> {
  return (await database()).getAll("jobs");
}

export async function pendingJobs(): Promise<Job[]> {
  const db = await database();
  const jobs = await db.getAll("jobs");
  // "uploading" też wraca: taki stan zostaje po telefonie ubitym w trakcie
  // wysyłki, a zadanie musi wrócić, bo inaczej zdjęcie znika po cichu.
  // Kolejność zgłoszeń — gość, który wysłał ognisko przed pierwszym tańcem,
  // ma prawo zobaczyć je pierwsze.
  return jobs
    .filter((j) => j.state !== "done")
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function jobFor(categoryId: number): Promise<Job | undefined> {
  const db = await database();
  const jobs = await db.getAllFromIndex("jobs", "by-category", categoryId);
  return jobs.sort((a, b) => b.createdAt - a.createdAt)[0];
}

export async function patch(photoId: string, changes: Partial<Job>): Promise<void> {
  const db = await database();
  const current = await db.get("jobs", photoId);
  if (!current) return;
  await db.put("jobs", { ...current, ...changes, updatedAt: Date.now() });
}

/**
 * Usuwa zadanie. To jedyne miejsce, gdzie zdjęcie znika z telefonu — wolno je
 * wywołać dopiero, gdy serwer potwierdził zapis.
 */
export async function remove(photoId: string): Promise<void> {
  await (await database()).delete("jobs", photoId);
}

export function toBlob(bytes: ArrayBuffer, mime: string): Blob {
  return new Blob([bytes], { type: mime });
}

/** Tylko do testów. */
export function __resetDb(): void {
  dbPromise = null;
}
