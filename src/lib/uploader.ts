import { ApiError, api } from "./api.js";
import { AppError, type ErrorCode } from "./errors.js";
import * as queue from "./queue.js";

/**
 * Opróżnianie kolejki, w dwóch priorytetach.
 *
 * **Najpierw wszystkie podglądy, potem dopiero oryginały.** To nie jest
 * kosmetyka: od podglądu zależy, czy kafelek się zapełni i czy zdjęcie
 * policzy się do bingo. Oryginał to archiwum — może iść godzinę i nikt na
 * niego nie patrzy. Gdyby szły wymieszane, jeden dziesięciomegabajtowy plik
 * blokowałby pięć zdjęć czekających na to, żeby w ogóle pojawić się na planszy.
 *
 * W obu przejściach sekwencyjnie, nie równolegle: 40 telefonów na jednym
 * maszcie w Beskidzie to nie jest łącze, na którym pięć równoległych wysyłek
 * jest szybsze od pięciu po kolei — a przy sekwencyjnej pierwsza kończy się
 * naprawdę wcześnie, zamiast wszystkich pięciu naraz na końcu.
 */

export type Phase = "preview" | "original";

/**
 * Ile razy z rzędu wolno wysyłce oryginału nie ruszyć się do przodu.
 *
 * Przy odpowiedzi 308 bez nagłówka `range` serwer zwraca przesunięcie 0 —
 * to jest wartość, nie `null`, więc `??` niżej jej nie przykryje i pętla
 * wraca na początek pliku. Sam w sobie jest to zachowanie poprawne (Google
 * mówi „nie mam jeszcze nic"), ale gdyby powtarzało się w kółko, telefon
 * wysyłałby ten sam kawałek po 3 MB bez końca, a każde takie podejście to
 * jeszcze trzy zapytania do bazy. Po kilku próbach oddajemy zadanie do
 * kolejki i wracamy przy następnym powrocie sieci, zamiast kręcić się
 * w miejscu przez cały wieczór.
 */
const MAX_STALLED_CHUNKS = 3;

export type Progress = {
  photoId: string;
  phase: Phase;
  state: queue.JobState | "done";
  /** 0..1 dla oryginału — do paska postępu. */
  ratio?: number;
  /** Polski tekst błędu — do logów i jako ostatnia deska ratunku na ekranie. */
  error?: string;
  /** Kod do przetłumaczenia. Brak = błąd, dla którego nie mamy własnego zdania. */
  code?: ErrorCode;
  /** Oryginał celowo nie ruszył — film czeka na Wi-Fi albo na dotknięcie gościa. */
  waiting?: "wifi";
};

let running = false;

export async function drain(onProgress?: (p: Progress) => void): Promise<void> {
  if (running) return;
  running = true;
  try {
    for (const job of await queue.previewPending()) {
      await sendPreview(job, onProgress);
    }
    for (const job of await queue.originalPending()) {
      if (!originalAllowed(job)) {
        // Nie błąd, nie ponowienie — zadanie zostaje w kolejce i ruszy, gdy
        // zmieni się sieć albo gość dotknie „wyślij teraz". Ekran kategorii
        // ma o tym wiedzieć, więc mówimy, zamiast po cichu pomijać.
        onProgress?.({ photoId: job.photoId, phase: "original", state: "queued", waiting: "wifi" });
        continue;
      }
      await sendOriginal(job, onProgress);
    }
  } finally {
    running = false;
  }
}

async function sendPreview(job: queue.Job, onProgress?: (p: Progress) => void): Promise<void> {
  await queue.patch(job.photoId, { state: "uploading" });
  onProgress?.({ photoId: job.photoId, phase: "preview", state: "uploading" });

  try {
    const targets = await api.uploadTargets({
      photoId: job.photoId,
      categoryId: job.categoryId,
      ext: job.ext,
    });

    await putSigned(targets.bucket, targets.preview, queue.toBlob(job.preview, job.mime));
    await putSigned(targets.bucket, targets.thumb, queue.toBlob(job.thumb, job.mime));

    await api.finalize({
      photoId: job.photoId,
      categoryId: job.categoryId,
      ext: job.ext,
      bytes: job.bytes,
      width: job.width,
      height: job.height,
      originalBytes: job.originalBytes,
      kind: job.kind,
      durationMs: job.durationMs,
    });

    // Od tej chwili zdjęcie jest bezpieczne po stronie serwera i liczy się
    // do bingo. Zadanie zostaje w kolejce wyłącznie dla oryginału.
    if (job.originalChunks > 0) {
      await queue.patch(job.photoId, { previewDone: true, state: "queued", lastError: null });
    } else {
      await queue.remove(job.photoId);
    }
    onProgress?.({ photoId: job.photoId, phase: "preview", state: "done" });
  } catch (err) {
    await recordFailure(job, err, onProgress, "preview");
  }
}

async function sendOriginal(job: queue.Job, onProgress?: (p: Progress) => void): Promise<void> {
  if (job.originalChunks === 0) return void (await queue.remove(job.photoId));

  const total = job.originalBytes;
  await queue.patch(job.photoId, { state: "uploading" });

  try {
    const start = await api.originalStart({
      photoId: job.photoId,
      size: total,
      mime: job.originalMime ?? "application/octet-stream",
      filename: job.originalName,
    });

    if (start.done) {
      await queue.remove(job.photoId);
      onProgress?.({ photoId: job.photoId, phase: "original", state: "done", ratio: 1 });
      return;
    }

    // Przesunięcie bierzemy z serwera, nie z lokalnego licznika: telefon mógł
    // zostać ubity w środku wysyłki i nie wie, ile bajtów naprawdę doszło.
    let offset = start.offset ?? 0;
    const chunkSize = start.chunkSize;
    let stalled = 0;

    while (offset < total) {
      // Z magazynu, nie z pamięci: w RAM-ie jest w tej chwili dokładnie jeden
      // kawałek filmu, a nie cały film.
      const chunk = await queue.readOriginal(job.photoId, offset, Math.min(offset + chunkSize, total));
      const res = await api.originalChunk({ photoId: job.photoId, offset, total }, chunk);

      if (res.done) break;
      const next = res.offset ?? offset + chunk.byteLength;

      if (next <= offset) {
        if (++stalled >= MAX_STALLED_CHUNKS) {
          throw new AppError("uploadStalled", "Wysyłka oryginału nie posuwa się do przodu");
        }
      } else {
        stalled = 0;
      }

      offset = next;
      await queue.patch(job.photoId, { originalOffset: offset, state: "queued" });
      onProgress?.({
        photoId: job.photoId,
        phase: "original",
        state: "uploading",
        ratio: offset / total,
      });
    }

    await queue.remove(job.photoId);
    onProgress?.({ photoId: job.photoId, phase: "original", state: "done", ratio: 1 });
  } catch (err) {
    await recordFailure(job, err, onProgress, "original");
  }
}

async function recordFailure(
  job: queue.Job,
  err: unknown,
  onProgress: ((p: Progress) => void) | undefined,
  phase: Phase,
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  const retryable = !(err instanceof ApiError) || err.isRetryable;
  const code = (err as { code?: ErrorCode } | null)?.code;

  await queue.patch(job.photoId, {
    // Zadanie nieponawialne (400, 403) zostaje jako "failed" i czeka na
    // człowieka. Ponawialne wraca do kolejki i pójdzie, gdy wróci sieć.
    state: retryable ? "queued" : "failed",
    attempts: job.attempts + 1,
    // W kolejce ląduje polski tekst, nie kod: to zapis diagnostyczny dla nas,
    // czytany po weselu, a nie zdanie do pokazania komukolwiek.
    lastError: message,
  });
  onProgress?.({
    photoId: job.photoId,
    phase,
    state: retryable ? "queued" : "failed",
    error: message,
    code,
  });
}

async function putSigned(
  bucket: string,
  target: { path: string; token: string },
  blob: Blob,
): Promise<void> {
  // supabase-js waży ~110 KB gzip i jest potrzebny dopiero tutaj — przy
  // pierwszym wysyłaniu, a nie przy wejściu na planszę. Gość skanujący QR
  // przy oświetleniu ogniska ma zobaczyć kafelki od razu; ten kawałek dojedzie,
  // zanim wybierze pierwsze zdjęcie z galerii.
  const { supabase } = await import("./supabase.js");
  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(target.path, target.token, blob, {
      upsert: true,
      // Ścieżka niesie photoId, więc pod jednym adresem zawsze leżą te same
      // bajty — plik jest niezmienny i przeglądarka może go trzymać na dysku.
      // Domyślna godzina kazałaby telefonom dopytywać o te same miniatury
      // przez cały wieczór, a to jest dokładnie ten transfer, którego
      // sześciogodzinne podpisy w `api/_lib/storage.ts` mają oszczędzić.
      cacheControl: "86400",
    });
  // Powtórka z kolejki trafia w tę samą ścieżkę, więc "już istnieje" nie jest
  // błędem, tylko dowodem, że poprzednie podejście doszło dalej, niż sądziliśmy.
  if (error && !/already exists/i.test(error.message)) throw error;
}

const WIFI_ONLY_KEY = "fotobingo.wifiOnly";

export function wifiOnly(): boolean {
  try {
    return localStorage.getItem(WIFI_ONLY_KEY) === "1";
  } catch {
    return false;
  }
}

export function setWifiOnly(on: boolean): void {
  try {
    localStorage.setItem(WIFI_ONLY_KEY, on ? "1" : "0");
  } catch {
    /* pusto */
  }
}

export type Connection = "wifi" | "cellular" | "unknown";

/**
 * Jaką sieć widzi telefon.
 *
 * `navigator.connection` istnieje tylko w przeglądarkach opartych na Chromium —
 * na iOS nie ma go wcale, i **nie da się tego obejść**: Safari po prostu nie
 * mówi, czy to Wi-Fi. Dlatego są trzy odpowiedzi, nie dwie, a co zrobić
 * z „nie wiem", decyduje osobno każdy rodzaj pliku — patrz `originalAllowed`.
 */
export function connectionKind(): Connection {
  const conn = (navigator as { connection?: { type?: string; saveData?: boolean } }).connection;
  if (!conn) return "unknown";
  // Oszczędzanie danych to deklaracja gościa, nie rodzaj sieci — ale znaczy
  // dokładnie to samo, co „jestem na komórce i liczę megabajty".
  if (conn.saveData) return "cellular";
  if (conn.type === "wifi" || conn.type === "ethernet") return "wifi";
  if (conn.type === "cellular") return "cellular";
  return "unknown";
}

/**
 * Czy wolno teraz wysyłać ten oryginał.
 *
 * Zdjęcie i film odpowiadają na „nie wiem, jaka sieć" odwrotnie, i to jest
 * cała treść tej funkcji:
 *
 * - **Zdjęcie (4 MB)** przy braku informacji **jedzie**. Gość, który włączył
 *   „tylko Wi-Fi", woli żeby oryginały czasem poszły przez komórkę, niż żeby
 *   nie poszły nigdy. Domyślnie bramka jest wyłączona.
 * - **Film (350 MB)** przy braku informacji **czeka**. Tu pomyłka kosztuje
 *   gościa pakiet danych na cały miesiąc, więc rusza wyłącznie na potwierdzonym
 *   Wi-Fi albo po tym, jak sam dotknie „wyślij teraz" — na iPhonie to jedyna
 *   droga, i ekran kategorii mówi mu to wprost.
 *
 * Podgląd i tak leci zawsze, bo od niego zależy bingo.
 */
export function originalAllowed(job: Pick<queue.Job, "kind" | "sendNow">): boolean {
  const kind = connectionKind();
  if (job.kind === "video") return job.sendNow || kind === "wifi";
  if (!wifiOnly()) return true;
  return kind !== "cellular";
}

/**
 * Uruchamia opróżnianie, gdy wraca sieć albo aplikacja wraca na wierzch.
 * Zwraca funkcję odpinającą — do sprzątania w useEffect.
 */
export function autoDrain(onProgress?: (p: Progress) => void): () => void {
  const go = () => void drain(onProgress);

  const onVisible = () => {
    if (document.visibilityState === "visible") go();
  };

  // Zmiana sieci bez utraty połączenia — komórka → Wi-Fi w pensjonacie —
  // nie budzi `online`, a to jest dokładnie moment, w którym film ma ruszyć.
  const conn = (navigator as { connection?: EventTarget }).connection;

  window.addEventListener("online", go);
  document.addEventListener("visibilitychange", onVisible);
  conn?.addEventListener("change", go);
  go();

  return () => {
    window.removeEventListener("online", go);
    document.removeEventListener("visibilitychange", onVisible);
    conn?.removeEventListener("change", go);
  };
}
