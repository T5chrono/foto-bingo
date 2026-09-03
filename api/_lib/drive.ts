import { config } from "./config.js";
import { db, type Guest } from "./db.js";

/**
 * Klient Google Drive.
 *
 * Uwierzytelnia się JEDNYM refresh tokenem konta Pary Młodej (D3) — goście
 * nigdy nie widzą Google na oczy. Zakres to wyłącznie `drive.file`, więc
 * aplikacja widzi tylko to, co sama utworzyła; reszta Dysku jest dla niej
 * niewidoczna, i to nie jest ograniczenie do obejścia, tylko gwarancja.
 */

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";

/** Kawałek 3 MB: mieści się pod limitem 4,5 MB na ciało funkcji Vercela,
 *  a Google wymaga wielokrotności 256 KB dla wszystkich poza ostatnim.
 *  3 MB to równe 12 × 256 KB. */
export const CHUNK_SIZE = 3 * 1024 * 1024;

// Token żyje godzinę, a funkcja Vercela przeżywa wiele żądań — nie ma po co
// odświeżać go na każde. Minuta zapasu na zegar i lot pakietu.
let cached: { token: string; expiresAt: number } | null = null;

export async function accessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      refresh_token: config.googleRefreshToken,
      grant_type: "refresh_token",
    }),
  });
  const body = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };

  if (!res.ok || !body.access_token) {
    throw new Error(
      body.error === "invalid_grant"
        ? "Refresh token do Google jest nieważny — cofnięto dostęp, zmieniono hasło " +
          "albo ekran zgody był w stanie „Testowanie”. Uruchom npm run google-auth."
        : `Odświeżenie tokena Google nie wyszło: ${JSON.stringify(body)}`,
    );
  }

  cached = { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return cached.token;
}

/** Tylko do testów — pozwala ominąć prawdziwe odświeżanie. */
export function __setToken(token: string | null): void {
  cached = token ? { token, expiresAt: Date.now() + 3_600_000 } : null;
}

async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await accessToken();
  return fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
}

/**
 * Folder gościa, tworzony leniwie przy pierwszym zdjęciu.
 *
 * Identyfikator zapisujemy w bazie, więc kolejne zdjęcia nie pytają Google
 * o nic. Przy pustym `drive_folder_id` szukamy najpierw po nazwie: funkcja
 * budzi się na zimno i dwa równoległe zdjęcia tego samego gościa potrafią
 * trafić tutaj naraz, a dwa foldery o tej samej nazwie to bałagan, którego
 * po weselu nikt nie posprząta.
 */
export async function ensureGuestFolder(guest: Guest): Promise<string> {
  if (guest.drive_folder_id) return guest.drive_folder_id;

  const found = await findFolder(guest.name);
  const id = found ?? (await createFolder(guest.name));

  await db().from("guests").update({ drive_folder_id: id }).eq("id", guest.id);
  return id;
}

async function findFolder(name: string): Promise<string | null> {
  const q = [
    `'${config.driveRootFolderId}' in parents`,
    `mimeType = '${FOLDER_MIME}'`,
    `name = '${name.replace(/'/g, "\\'")}'`,
    "trashed = false",
  ].join(" and ");

  const res = await driveFetch(`${API}/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`);
  if (!res.ok) throw new Error(`Szukanie folderu: ${res.status} ${await res.text()}`);
  const { files } = (await res.json()) as { files: { id: string }[] };
  return files[0]?.id ?? null;
}

async function createFolder(name: string): Promise<string> {
  const res = await driveFetch(`${API}/files?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME,
      parents: [config.driveRootFolderId],
    }),
  });
  if (!res.ok) throw new Error(`Tworzenie folderu: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}

/**
 * Otwiera sesję resumable i zwraca jej adres. Sesja jest ważna tydzień,
 * więc przeżywa nawet gościa, który wysyła zdjęcie z piątku w niedzielę.
 */
export async function startResumable(args: {
  name: string;
  parentId: string;
  mimeType: string;
  size: number;
  description: string;
  appProperties: Record<string, string>;
}): Promise<string> {
  const res = await driveFetch(`${UPLOAD}/files?uploadType=resumable&fields=id,name,size`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": args.mimeType,
      "X-Upload-Content-Length": String(args.size),
    },
    body: JSON.stringify({
      name: args.name,
      parents: [args.parentId],
      description: args.description,
      // Przeżywa ręczną zmianę nazwy pliku i pozwala odtworzyć bazę z samego
      // Dysku, gdyby Supabase kiedyś zniknął.
      appProperties: args.appProperties,
    }),
  });

  const location = res.headers.get("location");
  if (!res.ok || !location) {
    throw new Error(`Otwarcie sesji: ${res.status} ${await res.text()}`);
  }
  return location;
}

export type ChunkResult =
  | { done: false; offset: number }
  | { done: true; fileId: string; fileName: string };

/**
 * Wysyła jeden kawałek. Google odpowiada 308 z zakresem, który już ma
 * (stąd następne przesunięcie), albo 200/201 z metadanymi gotowego pliku.
 */
export async function putChunk(args: {
  sessionUri: string;
  bytes: ArrayBuffer;
  offset: number;
  total: number;
}): Promise<ChunkResult> {
  const { sessionUri, bytes, offset, total } = args;
  const last = offset + bytes.byteLength - 1;

  // Bez Authorization: adres sesji sam jest przepustką (potwierdzone
  // eksperymentalnie w spike'u S1). Nagłówek i tak nie zaszkodzi, ale
  // pominięcie go pozwala wysłać kawałek nawet gdy token akurat wygasa.
  const res = await fetch(sessionUri, {
    method: "PUT",
    headers: {
      "Content-Range": `bytes ${offset}-${last}/${total}`,
      "Content-Type": "application/octet-stream",
    },
    body: bytes,
  });

  if (res.status === 308) {
    // Range wygląda tak: "bytes=0-3145727". Brak nagłówka oznacza, że Google
    // nie przyjął jeszcze nic — wtedy zaczynamy od zera.
    const range = res.headers.get("range");
    const upTo = range ? Number(range.split("-")[1]) : -1;
    return { done: false, offset: Number.isFinite(upTo) ? upTo + 1 : 0 };
  }

  if (res.ok) {
    const file = (await res.json()) as { id: string; name: string };
    return { done: true, fileId: file.id, fileName: file.name };
  }

  throw new Error(`Wysyłka kawałka: ${res.status} ${await res.text()}`);
}

/**
 * Ile bajtów Google już ma. Wołane przy wznowieniu — telefon mógł zostać
 * ubity w środku wysyłki i nie wie, gdzie skończył.
 */
export async function sessionOffset(sessionUri: string, total: number): Promise<number> {
  const res = await fetch(sessionUri, {
    method: "PUT",
    headers: { "Content-Range": `bytes */${total}` },
  });

  if (res.status === 308) {
    const range = res.headers.get("range");
    if (!range) return 0;
    const upTo = Number(range.split("-")[1]);
    return Number.isFinite(upTo) ? upTo + 1 : 0;
  }
  // 200/201 oznacza, ze plik jest juz kompletny.
  if (res.ok) return total;
  throw new Error(`Pytanie o postep: ${res.status} ${await res.text()}`);
}

/**
 * Zabiera zdjęcie z folderu gościa — po usunięciu kafelka i po podmianie.
 *
 * **Kosz, nie kasowanie bezpowrotne.** Z folderu plik znika natychmiast, więc
 * gość dostaje dokładnie to, o co prosił, a Para Młoda nie przegląda po
 * weselu archiwum pełnego cudzych pomyłek. Ale przez 30 dni leży w koszu
 * Dysku i da się go przywrócić jednym kliknięciem — bo „usuń" dotknięte
 * w środku zabawy, po ciemku i jedną ręką, bywa dotknięte przez pomyłkę,
 * a zdjęcia z wesela nie da się zrobić drugi raz.
 *
 * Zakres `drive.file` pozwala na to bez dodatkowych uprawnień: aplikacja
 * rusza wyłącznie pliki, które sama tam wgrała.
 */
export async function trashFile(fileId: string): Promise<void> {
  const res = await driveFetch(`${API}/files/${fileId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trashed: true }),
  });

  // 404 znaczy, że pliku już nie ma — ktoś sprzątnął go ręcznie albo to
  // powtórka tego samego żądania. Cel jest osiągnięty, nie ma o czym mówić.
  if (!res.ok && res.status !== 404) {
    throw new Error(`Kosz dla ${fileId}: ${res.status} ${await res.text()}`);
  }
}
