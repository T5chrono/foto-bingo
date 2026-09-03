import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { originalStart, originalChunk } = vi.hoisted(() => ({
  originalStart: vi.fn(),
  originalChunk: vi.fn(),
}));

const { uploadTargets, finalize } = vi.hoisted(() => ({
  uploadTargets: vi.fn(),
  finalize: vi.fn(),
}));

vi.mock("./api.js", () => ({
  ApiError: class ApiError extends Error {},
  api: { originalStart, originalChunk, uploadTargets, finalize },
}));

// `putSigned` dociąga supabase-js dopiero przy pierwszej wysyłce — atrapa
// musi więc istnieć, żeby dało się w ogóle przetestować ścieżkę podglądu.
vi.mock("./supabase.js", () => ({
  supabase: { storage: { from: () => ({ uploadToSignedUrl: async () => ({ error: null }) }) } },
}));

import * as queue from "./queue.js";
import {
  connectionKind,
  drain,
  originalAllowed,
  setWifiOnly,
  watchProgress,
  type Progress,
} from "./uploader.js";

const bytes = (n: number) => new Uint8Array(n).fill(7).buffer;
const ID = "11111111-1111-4111-8111-111111111111";

/** Zadanie po udanym podglądzie — w kolejce zostaje wyłącznie oryginał. */
async function zadanieZOryginalem(rozmiar: number, kind: "photo" | "video" = "photo") {
  await queue.enqueue({
    photoId: ID,
    categoryId: 7,
    ext: "webp",
    mime: "image/webp",
    preview: bytes(100),
    thumb: bytes(50),
    kind,
    durationMs: kind === "video" ? 9000 : 0,
    original: new Blob([bytes(rozmiar)]),
    originalMime: kind === "video" ? "video/mp4" : "image/jpeg",
    originalName: kind === "video" ? "IMG_0100.MOV" : "IMG_0042.HEIC",
    width: 1600,
    height: 1200,
    originalBytes: rozmiar,
  });
  await queue.patch(ID, { previewDone: true });
}

/** Podstawia `navigator.connection` — albo je zabiera, jak na iOS. */
function siec(conn: { type?: string; saveData?: boolean } | null) {
  Object.defineProperty(navigator, "connection", { value: conn ?? undefined, configurable: true });
}

beforeEach(async () => {
  for (const j of await queue.allJobs()) await queue.remove(j.photoId);
  vi.clearAllMocks();
  setWifiOnly(false);
  siec(null);
});

afterEach(() => siec(null));

describe("wysyłka oryginału", () => {
  it("idzie kawałek po kawałku i sprząta zadanie po zakończeniu", async () => {
    await zadanieZOryginalem(5000);
    originalStart.mockResolvedValue({ done: false, offset: 0, chunkSize: 2000 });
    originalChunk
      .mockResolvedValueOnce({ done: false, offset: 2000 })
      .mockResolvedValueOnce({ done: false, offset: 4000 })
      .mockResolvedValueOnce({ done: true });

    await drain();

    expect(originalChunk).toHaveBeenCalledTimes(3);
    // Kawałki idą z magazynu, w rozmiarze, o jaki prosi serwer — nie w tym,
    // w jakim leżą w bazie.
    expect((originalChunk.mock.calls[0]![1] as ArrayBuffer).byteLength).toBe(2000);
    expect((originalChunk.mock.calls[2]![1] as ArrayBuffer).byteLength).toBe(1000);
    expect(await queue.allJobs()).toEqual([]);
  });

  /**
   * Odpowiedź 308 bez nagłówka `range` daje przesunięcie 0, więc pętla wraca
   * na początek pliku. Gdyby serwer odpowiadał tak w kółko, telefon wysyłałby
   * ten sam kawałek bez końca — a każde podejście to trzy zapytania do bazy.
   */
  it("poddaje się, gdy przesunięcie nie rośnie, zamiast kręcić się w kółko", async () => {
    await zadanieZOryginalem(5000);
    originalStart.mockResolvedValue({ done: false, offset: 0, chunkSize: 2000 });
    originalChunk.mockResolvedValue({ done: false, offset: 0 });

    await drain();

    expect(originalChunk).toHaveBeenCalledTimes(3);

    // Zdjęcie zostaje w kolejce i pójdzie przy następnym powrocie sieci —
    // pętla ma się zatrzymać, a nie zgubić oryginał.
    const [job] = await queue.allJobs();
    expect(job?.state).toBe("queued");
    expect(job?.lastError).toMatch(/nie posuwa się do przodu/);
  });
});

describe("bramka Wi-Fi", () => {
  // iOS nie ma `navigator.connection` — to jest przypadek połowy gości.
  it("bez informacji o sieci: zdjęcie jedzie, film czeka", () => {
    siec(null);
    expect(connectionKind()).toBe("unknown");
    expect(originalAllowed({ kind: "photo", sendNow: false })).toBe(true);
    expect(originalAllowed({ kind: "video", sendNow: false })).toBe(false);
  });

  it("film rusza na potwierdzonym Wi-Fi albo po „wyślij teraz”", () => {
    siec({ type: "wifi" });
    expect(originalAllowed({ kind: "video", sendNow: false })).toBe(true);

    siec({ type: "cellular" });
    expect(originalAllowed({ kind: "video", sendNow: false })).toBe(false);
    expect(originalAllowed({ kind: "video", sendNow: true })).toBe(true);
  });

  it("zdjęcie szanuje przełącznik „tylko Wi-Fi”, ale nie na ślepo", () => {
    setWifiOnly(true);
    siec({ type: "cellular" });
    expect(originalAllowed({ kind: "photo", sendNow: false })).toBe(false);
    siec({ saveData: true, type: "wifi" });
    expect(originalAllowed({ kind: "photo", sendNow: false })).toBe(false);
    // Nie wiadomo, jaka sieć — zdjęcie ma 4 MB i lepiej, żeby doszło.
    siec(null);
    expect(originalAllowed({ kind: "photo", sendNow: false })).toBe(true);
  });

  it("film bez Wi-Fi zostaje w kolejce i mówi o tym ekranowi, zamiast po cichu przepaść", async () => {
    await zadanieZOryginalem(5000, "video");
    const progress: Progress[] = [];

    await drain((p) => progress.push(p));

    expect(originalStart).not.toHaveBeenCalled();
    expect(progress).toEqual([
      { photoId: ID, phase: "original", state: "queued", waiting: "wifi" },
    ]);
    expect((await queue.originalPending()).map((j) => j.photoId)).toEqual([ID]);
  });

  it("po „wyślij teraz” ten sam film jedzie od razu", async () => {
    await zadanieZOryginalem(5000, "video");
    await queue.patch(ID, { sendNow: true });
    originalStart.mockResolvedValue({ done: false, offset: 0, chunkSize: 5000 });
    originalChunk.mockResolvedValue({ done: true });

    await drain();

    expect(originalChunk).toHaveBeenCalledTimes(1);
    expect(await queue.allJobs()).toEqual([]);
  });
});

/**
 * Postęp jako stan aplikacji, nie stan ekranu.
 *
 * Pasek żył dotąd w `useState` ekranu kategorii i znikał razem z nim: gość
 * wychodził na planszę, wracał na kafelek i paska nie było, mimo że film dalej
 * leciał. Te testy pilnują, żeby raport docierał do KAŻDEGO, kto patrzy,
 * niezależnie od tego, kto uruchomił wysyłkę.
 */
describe("podgląd postępu z dowolnego ekranu", () => {
  it("oddaje bieżący stan od razu przy podpięciu, a nie dopiero przy kolejnym kawałku", async () => {
    const widziane: (Progress | null)[] = [];
    const odepnij = watchProgress((p) => widziane.push(p));
    // Nic nie leci — nowy ekran ma to usłyszeć wprost, żeby wiedzieć,
    // że ma sięgnąć po to, co zapisane w kolejce.
    expect(widziane).toEqual([null]);
    odepnij();
  });

  it("raportuje ekranowi, który wysyłki nie zaczynał", async () => {
    await zadanieZOryginalem(5000);
    originalStart.mockResolvedValue({ done: false, offset: 0, chunkSize: 2000 });
    originalChunk
      .mockResolvedValueOnce({ done: false, offset: 2000 })
      .mockResolvedValueOnce({ done: false, offset: 4000 })
      .mockResolvedValueOnce({ done: true });

    const widziane: (Progress | null)[] = [];
    const odepnij = watchProgress((p) => widziane.push(p));

    // `drain` bez odbiornika — tak wysyłkę uruchamia plansza przez autoDrain.
    await drain();
    odepnij();

    const ratio = widziane.filter((p) => p?.state === "uploading").map((p) => p!.ratio);
    expect(ratio).toEqual([0.4, 0.8]);
    // Na koniec `null`: pasek ma zniknąć, a nie zamarznąć na ostatniej wartości.
    expect(widziane.at(-1)).toBeNull();
    expect(widziane.some((p) => p?.state === "done")).toBe(true);
  });

  it("po odpięciu nie dostaje już nic — ekran zdjęty z drzewa nie ma być budzony", async () => {
    await zadanieZOryginalem(5000);
    originalStart.mockResolvedValue({ done: false, offset: 0, chunkSize: 5000 });
    originalChunk.mockResolvedValue({ done: true });

    const widziane: (Progress | null)[] = [];
    watchProgress((p) => widziane.push(p))();
    await drain();

    expect(widziane).toEqual([null]);
  });

  /**
   * Film czekający na Wi-Fi też jest informacją dla ekranu — inaczej gość widzi
   * kafelek bez paska i bez wyjaśnienia, i nie wie, czy coś się dzieje.
   */
  it("mówi o filmie wstrzymanym na Wi-Fi, nie tylko o tym, co leci", async () => {
    await zadanieZOryginalem(5000, "video");
    const widziane: (Progress | null)[] = [];
    const odepnij = watchProgress((p) => widziane.push(p));

    await drain();
    odepnij();

    expect(widziane.some((p) => p?.waiting === "wifi")).toBe(true);
  });
});

/**
 * „Usuń" w środku wysyłki.
 *
 * Skasowanie zadania z kolejki nie zatrzymuje samo z siebie wysyłki, która
 * już trwa — `sendPreview` i `sendOriginal` trzymają zadanie w pamięci. Bez
 * sprawdzania w bazie `finalize` wstawiłby zdjęcie z powrotem na planszę
 * sekundę po tym, jak gość kazał je zdjąć, a kolejne kawałki dokładałyby plik
 * do folderu na Dysku.
 */
describe("zwolnienie kafelka w trakcie wysyłki", () => {
  it("nie wstawia zdjęcia z powrotem na planszę, gdy kafelek zwolniono w trakcie podglądu", async () => {
    await queue.enqueue({
      photoId: ID,
      categoryId: 7,
      ext: "webp",
      mime: "image/webp",
      preview: bytes(100),
      thumb: bytes(50),
      kind: "photo",
      durationMs: 0,
      original: null,
      originalMime: "image/jpeg",
      originalName: "IMG_1.jpg",
      width: 1600,
      height: 1200,
      originalBytes: 0,
    });

    uploadTargets.mockImplementation(async () => {
      // Gość dotyka „Usuń", kiedy podgląd jest w locie.
      await queue.remove(ID);
      return {
        photoId: ID,
        bucket: "fotobingo",
        preview: { path: "p", token: "t" },
        thumb: { path: "t", token: "t" },
      };
    });

    await drain();

    expect(finalize).not.toHaveBeenCalled();
    expect(await queue.allJobs()).toEqual([]);
  });

  it("przerywa wysyłkę oryginału na najbliższej granicy kawałka", async () => {
    await zadanieZOryginalem(9000);
    originalStart.mockResolvedValue({ done: false, offset: 0, chunkSize: 3000 });
    originalChunk.mockImplementation(async (args: { offset: number }) => {
      // Po pierwszym kawałku gość zwalnia kafelek.
      if (args.offset === 0) await queue.remove(ID);
      return { done: false, offset: args.offset + 3000 };
    });

    await drain();

    // Jeden kawałek zdążył pójść — ten, który był już w locie. Drugi nie.
    expect(originalChunk).toHaveBeenCalledTimes(1);
    expect(await queue.allJobs()).toEqual([]);
  });

  it("nie zaczyna wysyłki oryginału zdjętego tuż przed jej startem", async () => {
    await zadanieZOryginalem(9000);
    await queue.remove(ID);

    await drain();

    expect(originalStart).not.toHaveBeenCalled();
  });
});
