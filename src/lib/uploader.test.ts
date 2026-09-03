import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { originalStart, originalChunk } = vi.hoisted(() => ({
  originalStart: vi.fn(),
  originalChunk: vi.fn(),
}));

vi.mock("./api.js", () => ({
  ApiError: class ApiError extends Error {},
  api: { originalStart, originalChunk, uploadTargets: vi.fn(), finalize: vi.fn() },
}));

import * as queue from "./queue.js";
import { connectionKind, drain, originalAllowed, setWifiOnly, type Progress } from "./uploader.js";

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
