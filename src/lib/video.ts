/**
 * Pierwsza klatka filmu — to, co stanie na kafelku.
 *
 * Kafelek nigdy nie pokazuje pliku gościa, tylko obrazek wyprodukowany
 * z canvasa (`image.ts`). Dla filmu zmienia się wyłącznie to, skąd bierzemy
 * piksele: zamiast `<img>` mamy `<video>` przewinięte na sekundę. Dalej
 * wszystko jest identyczne — ten sam budżet bajtów, ten sam WebP, ta sama
 * kolejka. Dlatego plansza, bingo i rzutnik nie wiedzą, że filmy istnieją.
 *
 * Nie klatka zerowa. Pierwsza klatka filmu z telefonu to zwykle czarny albo
 * rozmazany kadr — matryca jeszcze się rozjaśnia, obiektyw jeszcze ostrzy.
 * Sekunda dalej film już „widzi", a kafelek z wesela ma wyglądać jak
 * wspomnienie, nie jak awaria.
 */

import { AppError } from "./errors.js";

/** Skąd bierzemy klatkę. Przy filmie krótszym niż dwie sekundy schodzimy
 *  na jego połowę — inaczej celowalibyśmy za koniec i dostali czarny kadr. */
export const FRAME_AT_SECONDS = 1;

/** Odczyt metadanych to zwykle milisekundy, ale film 4K z pełnej pamięci
 *  starszego iPhone'a potrafi się grzebać. Piętnaście sekund to granica,
 *  za którą i tak lepiej powiedzieć gościowi, że nie wyszło. */
const METADATA_TIMEOUT_MS = 15_000;

/** Na przewinięcie dajemy mniej i **nie traktujemy przekroczenia jak błędu**:
 *  jak nie uda się dojść do sekundy, bierzemy to, co jest na starcie.
 *  Ciemna klatka jest gorsza od jasnej, ale bez porównania lepsza od pustego
 *  kafelka i komunikatu „nie udało się". */
const SEEK_TIMEOUT_MS = 10_000;

export type VideoFrame = {
  /** Element gotowy do `drawImage` — `encodeToBudget` bierze go tak samo
   *  jak `ImageBitmap`. */
  frame: HTMLVideoElement;
  durationMs: number;
  /** Zwalnia obiekt URL i odpina plik od elementu. Trzeba zawołać —
   *  inaczej film zostaje w pamięci karty do końca życia strony. */
  release: () => void;
};

export async function firstFrame(file: Blob): Promise<VideoFrame> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");

  const release = () => {
    video.removeAttribute("src");
    // Bez `load()` Safari trzyma dekoder przy życiu mimo zdjętego src.
    video.load();
    URL.revokeObjectURL(url);
  };

  // `muted` i `playsInline` nie są tu o dźwięku ani o odtwarzaniu — bez nich
  // iOS odmawia dekodowania czegokolwiek poza pełnym ekranem, a my nic nie
  // odtwarzamy, tylko prosimy o jedną klatkę.
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  try {
    if (!(await waitFor(video, "loadedmetadata", METADATA_TIMEOUT_MS))) {
      throw new AppError("videoRead", "Nie udało się odczytać metadanych filmu");
    }

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    // Nieznana długość (Infinity) to nie powód, żeby zostać na klatce zerowej —
    // WebM nagrany na żywo w Chromie nie ma jej w nagłówku, a przewijanie
    // działa mimo to. Celujemy w sekundę; jak film jest krótszy, `seeked`
    // przyjdzie z końca i to też jest lepsze niż czarny start.
    const target = duration > 0 ? Math.min(FRAME_AT_SECONDS, duration / 2) : FRAME_AT_SECONDS;

    video.currentTime = target;
    await waitFor(video, "seeked", SEEK_TIMEOUT_MS);

    // HAVE_CURRENT_DATA. Poniżej tego progu `drawImage` rysuje pustkę,
    // i to bez rzucania błędem — canvas po prostu zostaje przezroczysty.
    if (video.readyState < 2) await waitFor(video, "loadeddata", SEEK_TIMEOUT_MS);

    if (!video.videoWidth || !video.videoHeight) {
      throw new AppError("videoRead", "Film nie oddał ani jednej klatki");
    }

    return {
      frame: video,
      durationMs: duration > 0 ? Math.round(duration * 1000) : 0,
      release,
    };
  } catch (err) {
    release();
    throw err;
  }
}

/**
 * Czeka na zdarzenie. `true` = przyszło, `false` = minął czas.
 * Błąd elementu przerywa czekanie od razu — nie ma po co siedzieć piętnastu
 * sekund nad plikiem, o którym przeglądarka już powiedziała, że go nie umie.
 */
function waitFor(video: HTMLVideoElement, event: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener(event, onEvent);
      video.removeEventListener("error", onError);
    };
    const onEvent = () => {
      cleanup();
      resolve(true);
    };
    const onError = () => {
      cleanup();
      reject(new AppError("videoRead", "Przeglądarka nie umie odczytać tego filmu"));
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    video.addEventListener(event, onEvent);
    video.addEventListener("error", onError);
  });
}
