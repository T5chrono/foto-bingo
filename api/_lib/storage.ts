import { config } from "./config.js";
import { db } from "./db.js";

/**
 * Bucket jest prywatny. Wszystko, co z niego wychodzi i do niego wchodzi,
 * idzie przez podpisane linki o krótkiej ważności — a te wystawia wyłącznie
 * serwer, po sprawdzeniu kodu gościa.
 */

export type PhotoKind = "p" | "t";

/**
 * `{guestId}/{categoryId}/{photoId}-p.webp`
 *
 * Ścieżka zawiera guestId, więc podpisany link do cudzego pliku wymagałby
 * zgadnięcia dwóch UUID-ów naraz. Kategoria w środku ułatwia ręczne grzebanie
 * w bucketcie, gdyby coś poszło nie tak w sobotę.
 */
export function storagePath(args: {
  guestId: string;
  categoryId: number;
  photoId: string;
  kind: PhotoKind;
  ext: string;
}): string {
  const ext = args.ext.replace(/^\.+/, "").toLowerCase();
  return `${args.guestId}/${args.categoryId}/${args.photoId}-${args.kind}.${ext}`;
}

export type SignedUpload = { path: string; token: string };

/** Ważność podpisu do wgrania. Kolejka może czekać na sieć, ale sam transfer
 *  jednego pliku po ≤350 KB nie ma prawa trwać dłużej niż te dziesięć minut. */
const UPLOAD_TTL_SECONDS = 600;

export async function createUploadUrl(path: string): Promise<SignedUpload> {
  const { data, error } = await db()
    .storage.from(config.bucket)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data) throw error ?? new Error("Brak odpowiedzi na podpis wgrania");
  return { path: data.path, token: data.token };
}

export async function createDownloadUrl(
  path: string,
  expiresIn = UPLOAD_TTL_SECONDS,
): Promise<string> {
  const { data, error } = await db()
    .storage.from(config.bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data) throw error ?? new Error("Brak odpowiedzi na podpis pobrania");
  return data.signedUrl;
}

/** Kasowanie podmienionych podglądów. Oryginał podmienionego zdjęcia zostaje
 *  na Dysku — kasujemy tylko wersję roboczą, która do niczego już nie służy. */
export async function removeObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await db().storage.from(config.bucket).remove(paths);
  if (error) throw error;
}

/**
 * Zajętość bucketa liczona z bazy, nie z API magazynu.
 *
 * Storage nie ma taniego "ile waży ten bucket" — trzeba by przejść listę
 * obiektów. Kolumna `bytes` w `photos` jest po to, żeby licznik w panelu był
 * jednym zapytaniem, a nie spacerem po 2400 plikach.
 */
export async function usedBytes(): Promise<number> {
  const { data, error } = await db().rpc("used_bytes");
  if (error) throw error;
  return Number(data ?? 0);
}
