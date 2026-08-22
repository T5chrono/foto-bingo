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

/**
 * Podpis do wgrania jednego pliku.
 *
 * Ważności nie ustawiamy, bo `createSignedUploadUrl` jej nie przyjmuje —
 * bierze wyłącznie `upsert`. Stała `UPLOAD_TTL_SECONDS` stała tu kiedyś obok
 * i wyglądała, jakby coś robiła; w rzeczywistości służyła tylko za domyślną
 * ważność **pobrań**, czyli dziesięć minut tam, gdzie potrzeba godzin.
 * Nie wracać do niej bez sprawdzenia, czy SDK zaczęło ten parametr przyjmować.
 */
export async function createUploadUrl(path: string): Promise<SignedUpload> {
  const { data, error } = await db()
    .storage.from(config.bucket)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data) throw error ?? new Error("Brak odpowiedzi na podpis wgrania");
  return { path: data.path, token: data.token };
}

/**
 * Ważność podpisu do pobrania — sześć godzin, a nie godzina.
 *
 * To jest decyzja o transferze, nie o wygodzie. Podpisany adres niesie token
 * ze znacznikiem czasu, więc **każde ponowne podpisanie tego samego pliku daje
 * inny adres**, a inny adres to dla przeglądarki inny zasób: miniatura leci
 * przez sieć jeszcze raz. Plansza odświeża się przy każdym powrocie do
 * aplikacji, więc przy godzinnej ważności gość przez jeden wieczór pobierał
 * te same 25 miniatur kilkadziesiąt razy — ze swojego pakietu danych i z
 * darmowego transferu Supabase, dzielonego przez całą organizację.
 *
 * Sześć godzin plus cache poniżej dają jeden adres na całe wesele. Kosztem
 * jest dłużej ważna przepustka do jednego pliku — przy miniaturze zdjęcia,
 * które i tak należy do tego gościa, to dobry kurs wymiany.
 */
const DOWNLOAD_TTL_SECONDS = 6 * 3600;

/** Adres oddajemy tylko wtedy, gdy będzie ważny jeszcze co najmniej tyle —
 *  inaczej gość dostałby link wygasający mu w rękach. */
const REUSE_MARGIN_MS = 30 * 60_000;

/** Sufit wpisów. 48 plansz × 25 kafelków to 1200, więc zapas jest podwójny. */
const CACHE_LIMIT = 2400;

/**
 * Adresy wydane przez tę instancję funkcji.
 *
 * Funkcja Vercela żyje między żądaniami, więc kolejne pytanie o tę samą
 * planszę zwykle trafia w ten sam proces i dostaje **ten sam** adres — a to
 * jest cały warunek, żeby cache przeglądarki w ogóle zadziałał. Instancji jest
 * kilka i budzą się na zimno, więc to nie jest gwarancja, tylko większość
 * przypadków; nietrafienie kosztuje jeden podpis, nie błąd.
 */
const cache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Podpisy do pobrania — jednym żądaniem dla wszystkich ścieżek naraz.
 *
 * Wersja na jedną ścieżkę, wołana w pętli po kafelkach, oznaczała 25
 * równoległych żądań do Storage **na jedno odświeżenie planszy**. Przy
 * kilkunastu gościach naraz w czasie pierwszego tańca to kilkaset połączeń
 * otwieranych z wnętrza funkcji, która ma 30 sekund do limitu — czyli droga
 * do 504, a nie do błędu bazy. `createSignedUrls` załatwia to jednym POST-em.
 *
 * Rzuca, gdy którakolwiek ścieżka nie dostanie adresu. Brakujący obiekt
 * w bucketcie jest anomalią — wiersz w `photos` powstaje dopiero po udanym
 * wgraniu — a nie stanem do pokazania gościowi jako pusty kafelek.
 */
export async function createDownloadUrls(
  paths: string[],
  expiresIn = DOWNLOAD_TTL_SECONDS,
): Promise<Map<string, string>> {
  const now = Date.now();
  const found = new Map<string, string>();
  const missing: string[] = [];

  for (const path of new Set(paths)) {
    const hit = cache.get(path);
    if (hit && hit.expiresAt - now > REUSE_MARGIN_MS) found.set(path, hit.url);
    else missing.push(path);
  }

  if (missing.length === 0) return found;

  const { data, error } = await db()
    .storage.from(config.bucket)
    .createSignedUrls(missing, expiresIn);

  if (error || !data) throw error ?? new Error("Brak odpowiedzi na podpisy pobrania");

  for (const row of data) {
    if (!row.path || !row.signedUrl) {
      throw new Error(
        `Podpis pobrania dla ${row.path ?? "?"}: ${row.error ?? "brak adresu w odpowiedzi"}`,
      );
    }
    found.set(row.path, row.signedUrl);
    cache.set(row.path, { url: row.signedUrl, expiresAt: now + expiresIn * 1000 });
  }

  prune(now);
  return found;
}

/**
 * Adres z mapy zwróconej przez `createDownloadUrls`.
 *
 * Każda przekazana ścieżka ma tam wpis, bo inaczej całe wywołanie by rzuciło —
 * brak oznacza więc pomyłkę w kodzie wołającym. Rzucamy zamiast oddawać
 * `undefined`, bo puste `thumbUrl` w odpowiedzi wygląda na planszy dokładnie
 * jak niezdobyty kafelek: zdjęcie wypadłoby z bingo przez literówkę w ścieżce.
 */
export function signedUrl(urls: Map<string, string>, path: string): string {
  const url = urls.get(path);
  if (!url) throw new Error(`Brak podpisanego adresu dla ${path}`);
  return url;
}

/** Sprzątanie, gdy instancja funkcji żyje długo. Najpierw wygasłe wpisy,
 *  a jeśli to za mało — najstarsze, bo Map trzyma kolejność wstawiania. */
function prune(now: number): void {
  if (cache.size <= CACHE_LIMIT) return;

  for (const [path, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(path);
  }
  for (const path of cache.keys()) {
    if (cache.size <= CACHE_LIMIT) break;
    cache.delete(path);
  }
}

/** Tylko do testów — cache jest modułowy i przeżywa między przypadkami. */
export function __clearUrlCache(): void {
  cache.clear();
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
