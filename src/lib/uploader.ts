import { ApiError, api } from "./api";
import * as queue from "./queue";

/**
 * Opróżnianie kolejki. Jeden bieg przemiela wszystkie zaległe zadania,
 * po kolei, po jednym naraz.
 *
 * Świadomie sekwencyjnie, nie równolegle: 40 telefonów na jednym maszcie
 * w Beskidzie to nie jest łącze, na którym pięć równoległych wysyłek jest
 * szybsze od pięciu po kolei — a przy sekwencyjnej pierwsza kończy się
 * naprawdę wcześnie, zamiast wszystkich pięciu naraz na końcu.
 */

export type Progress = { photoId: string; state: queue.JobState; error?: string };

let running = false;

export async function drain(onProgress?: (p: Progress) => void): Promise<void> {
  if (running) return;
  running = true;
  try {
    for (const job of await queue.pendingJobs()) {
      await send(job, onProgress);
    }
  } finally {
    running = false;
  }
}

async function send(job: queue.Job, onProgress?: (p: Progress) => void): Promise<void> {
  await queue.patch(job.photoId, { state: "uploading" });
  onProgress?.({ photoId: job.photoId, state: "uploading" });

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

    // Dopiero teraz zdjęcie jest bezpieczne po stronie serwera i wolno
    // je usunąć z telefonu.
    await queue.remove(job.photoId);
    onProgress?.({ photoId: job.photoId, state: "done" });
  } catch (err) {
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
      state: retryable ? "queued" : "failed",
      error: message,
    });
  }
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
