import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { MediaKind } from "./media.js";

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
 *
 * **Oryginał leży w kawałkach, w osobnym magazynie.** Od filmów jeden
 * ArrayBuffer na cały plik przestał wchodzić w grę: minuta 4K to 350 MB,
 * a `file.arrayBuffer()` wciąga to do pamięci karty naraz — starszy iPhone
 * ubija ją bez słowa. Kroimy więc plik na kawałki po 3 MB, czytając
 * z galerii jeden na raz, i każdy zapisujemy jako własny rekord. W pamięci
 * nigdy nie ma więcej niż jeden kawałek, a bajty są prawdziwą kopią, nie
 * referencją do pliku w galerii, który telefon może w międzyczasie przemielić.
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
  /** Zdjęcie czy film. Na planszy i tak stoi obrazek — to mówi tylko,
   *  co jedzie na Dysk i czy oryginał ma czekać na Wi-Fi. */
  kind: MediaKind;
  /** Długość filmu; zero dla zdjęcia. */
  durationMs: number;
  /** Ile kawałków oryginału leży w magazynie `chunks`. Zero = oryginału nie ma. */
  originalChunks: number;
  originalMime: string | null;
  originalName: string | null;
  width: number;
  height: number;
  /** Podgląd plus miniatura — to trafia do licznika zajętości w panelu. */
  bytes: number;
  originalBytes: number;
  /** Podglad i miniatura sa juz na serwerze — kafelek jest zapelniony,
   *  a zadanie zostaje w kolejce wylacznie dla oryginalu. */
  previewDone: boolean;
  /** Ile bajtow oryginalu Google juz ma. Przezywa restart telefonu. */
  originalOffset: number;
  /** Gość dotknął „wyślij teraz" — film idzie bez czekania na Wi-Fi.
   *  Dla zdjęć bez znaczenia. */
  sendNow: boolean;
  attempts: number;
  lastError: string | null;
  createdAt: number;
  updatedAt: number;
};

type Chunk = { photoId: string; index: number; bytes: ArrayBuffer };

interface Schema extends DBSchema {
  jobs: {
    key: string;
    value: Job;
    indexes: { "by-state": JobState; "by-category": number };
  };
  chunks: {
    key: [string, number];
    value: Chunk;
    indexes: { "by-photo": string };
  };
}

/** Rozmiar kawałka w magazynie. Ten sam co kawałek do Google (`CHUNK_SIZE`
 *  w `api/_lib/drive.ts`), ale to zbieżność, nie zależność — `readOriginal`
 *  składa dowolny zakres z dowolnych kawałków. */
export const CHUNK_BYTES = 3 * 1024 * 1024;

const DB_NAME = "fotobingo";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;

/** Zadanie z wersji 1 — oryginał w jednym ArrayBufferze, bez pola `kind`. */
type LegacyJob = Omit<Job, "kind" | "durationMs" | "originalChunks" | "sendNow"> & {
  original?: ArrayBuffer | null;
};

function database(): Promise<IDBPDatabase<Schema>> {
  dbPromise ??= openDB<Schema>(DB_NAME, DB_VERSION, {
    async upgrade(db, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) {
        const store = db.createObjectStore("jobs", { keyPath: "photoId" });
        store.createIndex("by-state", "state");
        store.createIndex("by-category", "categoryId");
      }

      if (oldVersion < 2) {
        const chunks = db.createObjectStore("chunks", { keyPath: ["photoId", "index"] });
        chunks.createIndex("by-photo", "photoId");

        // Zadania, które leżały w telefonie w chwili aktualizacji — gość mógł
        // wysłać zdjęcie w piątek i dostać nowego service workera w sobotę.
        // Oryginał wędruje z zadania do magazynu kawałków; nic nie ginie.
        const jobs = tx.objectStore("jobs");
        for (let cursor = await jobs.openCursor(); cursor; cursor = await cursor.continue()) {
          const legacy = cursor.value as unknown as LegacyJob;
          const { original, ...rest } = legacy;
          let count = 0;
          if (original && original.byteLength > 0) {
            for (let start = 0; start < original.byteLength; start += CHUNK_BYTES) {
              await chunks.put({
                photoId: legacy.photoId,
                index: count++,
                bytes: original.slice(start, Math.min(start + CHUNK_BYTES, original.byteLength)),
              });
            }
          }
          await cursor.update({
            ...rest,
            kind: "photo",
            durationMs: 0,
            originalChunks: count,
            sendNow: false,
          });
        }
      }
    },
  });
  return dbPromise;
}

export type NewJob = Omit<
  Job,
  | "state"
  | "attempts"
  | "lastError"
  | "createdAt"
  | "updatedAt"
  | "bytes"
  | "previewDone"
  | "originalOffset"
  | "originalChunks"
  | "sendNow"
> & {
  /**
   * Oryginał jako Blob, nie ArrayBuffer — celowo. Blob to uchwyt do pliku,
   * nie jego zawartość; bajty czytamy stąd po jednym kawałku i dopiero one
   * lądują w bazie. Sam Blob nigdy nie trafia do IndexedDB.
   */
  original: Blob | null;
};

export async function enqueue(job: NewJob): Promise<Job> {
  const db = await database();
  const { original, ...rest } = job;

  // Najpierw kawałki, potem zadanie. Telefon ubity w połowie zostawia
  // wtedy sieroce kawałki bez zadania — sprząta je `remove` przy następnym
  // zadaniu o tym samym photoId, a nie zadanie bez kawałków, które
  // wyglądałoby na kompletne i wysłało na Dysk pusty plik.
  let originalChunks = 0;
  if (original && original.size > 0) {
    try {
      for (let start = 0; start < original.size; start += CHUNK_BYTES) {
        const end = Math.min(start + CHUNK_BYTES, original.size);
        const bytes = await original.slice(start, end).arrayBuffer();
        await db.put("chunks", { photoId: job.photoId, index: originalChunks, bytes });
        originalChunks++;
      }
    } catch (err) {
      await dropChunks(db, job.photoId);
      throw err;
    }
  }

  const now = Date.now();
  const full: Job = {
    ...rest,
    originalChunks,
    bytes: job.preview.byteLength + job.thumb.byteLength,
    previewDone: false,
    originalOffset: 0,
    sendNow: false,
    state: "queued",
    attempts: 0,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.put("jobs", full);
  return full;
}

/**
 * Zakres bajtów oryginału `[start, end)`, złożony z kawałków.
 *
 * Wysyłka pyta o tyle, ile każe serwer (`chunkSize` z `originalStart`),
 * a magazyn ma swoje 3 MB — te dwie liczby nie muszą się zgadzać i nie
 * mogą od siebie zależeć. Kopiujemy więc z tylu rekordów, ilu trzeba,
 * i tylko te bajty, o które proszono.
 */
export async function readOriginal(photoId: string, start: number, end: number): Promise<ArrayBuffer> {
  const db = await database();
  const out = new Uint8Array(Math.max(0, end - start));
  if (out.byteLength === 0) return out.buffer;

  const first = Math.floor(start / CHUNK_BYTES);
  const last = Math.floor((end - 1) / CHUNK_BYTES);

  for (let index = first; index <= last; index++) {
    const chunk = await db.get("chunks", [photoId, index]);
    if (!chunk) throw new Error(`Brak kawałka ${index} oryginału ${photoId}`);

    const chunkStart = index * CHUNK_BYTES;
    const from = Math.max(start, chunkStart) - chunkStart;
    const to = Math.min(end, chunkStart + chunk.bytes.byteLength) - chunkStart;
    out.set(new Uint8Array(chunk.bytes, from, to - from), chunkStart + from - start);
  }

  return out.buffer;
}

/** Jedno zadanie po identyfikatorze. Wysyłka pyta o nie przed każdym krokiem,
 *  żeby wiedzieć, czy gość nie zwolnił kafelka w międzyczasie. */
export async function jobById(photoId: string): Promise<Job | undefined> {
  return (await database()).get("jobs", photoId);
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

/** Zadania czekające na podgląd — mają pierwszeństwo, bo od nich zależy,
 *  czy kafelek się zapełni i czy zdjęcie policzy się do bingo. */
export async function previewPending(): Promise<Job[]> {
  return (await pendingJobs()).filter((j) => !j.previewDone);
}

/** Zadania czekające już tylko na oryginał — niższy priorytet, mogą iść
 *  godzinami i nikt na nie nie patrzy. */
export async function originalPending(): Promise<Job[]> {
  return (await pendingJobs()).filter((j) => j.previewDone && j.originalChunks > 0);
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
 * Usuwa zadanie razem z kawałkami oryginału. To jedyne miejsce, gdzie
 * zdjęcie znika z telefonu — wolno je wywołać dopiero, gdy serwer
 * potwierdził zapis.
 */
export async function remove(photoId: string): Promise<void> {
  const db = await database();
  await db.delete("jobs", photoId);
  await dropChunks(db, photoId);
}

async function dropChunks(db: IDBPDatabase<Schema>, photoId: string): Promise<void> {
  const keys = await db.getAllKeysFromIndex("chunks", "by-photo", photoId);
  if (keys.length === 0) return;
  const tx = db.transaction("chunks", "readwrite");
  await Promise.all([...keys.map((key) => tx.store.delete(key)), tx.done]);
}

export function toBlob(bytes: ArrayBuffer, mime: string): Blob {
  return new Blob([bytes], { type: mime });
}

/** Tylko do testów. */
export function __resetDb(): void {
  dbPromise = null;
}
