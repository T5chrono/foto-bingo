import { ApiError, api } from "./api";
import * as queue from "./queue";

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

export type Progress = {
  photoId: string;
  phase: Phase;
  state: queue.JobState | "done";
  /** 0..1 dla oryginału — do paska postępu. */
  ratio?: number;
  error?: string;
};

let running = false;

export async function drain(onProgress?: (p: Progress) => void): Promise<void> {
  if (running) return;
  running = true;
  try {
    for (const job of await queue.previewPending()) {
      await sendPreview(job, onProgress);
    }
    if (originalsAllowed()) {
      for (const job of await queue.originalPending()) {
        await sendOriginal(job, onProgress);
      }
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
    });

    // Od tej chwili zdjęcie jest bezpieczne po stronie serwera i liczy się
    // do bingo. Zadanie zostaje w kolejce wyłącznie dla oryginału.
    if (job.original) {
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
  if (!job.original) return void (await queue.remove(job.photoId));

  const total = job.original.byteLength;
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

    while (offset < total) {
      const chunk = job.original.slice(offset, Math.min(offset + chunkSize, total));
      const res = await api.originalChunk({ photoId: job.photoId, offset, total }, chunk);

      if (res.done) break;
      offset = res.offset ?? offset + chunk.byteLength;

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

  await queue.patch(job.photoId, {
    // Zadanie nieponawialne (400, 403) zostaje jako "failed" i czeka na
    // człowieka. Ponawialne wraca do kolejki i pójdzie, gdy wróci sieć.
    state: retryable ? "queued" : "failed",
    attempts: job.attempts + 1,
    lastError: message,
  });
  onProgress?.({
    photoId: job.photoId,
    phase,
    state: retryable ? "queued" : "failed",
    error: message,
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
  const { supabase } = await import("./supabase");
  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(target.path, target.token, blob, { upsert: true });
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

/**
 * Czy wolno teraz wysyłać oryginały.
 *
 * `navigator.connection` istnieje tylko w przeglądarkach opartych na Chromium —
 * na iOS nie ma go wcale. Dlatego przy braku informacji **wysyłamy**: gość,
 * który świadomie włączył „tylko Wi-Fi", woli żeby oryginały czasem poszły
 * przez sieć komórkową, niż żeby nie poszły nigdy. Podgląd i tak leci zawsze,
 * bo od niego zależy bingo.
 */
export function originalsAllowed(): boolean {
  if (!wifiOnly()) return true;
  const conn = (navigator as { connection?: { type?: string; saveData?: boolean } }).connection;
  if (!conn) return true;
  if (conn.saveData) return false;
  return conn.type !== "cellular";
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

  window.addEventListener("online", go);
  document.addEventListener("visibilitychange", onVisible);
  go();

  return () => {
    window.removeEventListener("online", go);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
