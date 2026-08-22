import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { originalStart, originalChunk } = vi.hoisted(() => ({
  originalStart: vi.fn(),
  originalChunk: vi.fn(),
}));

vi.mock("./api.js", () => ({
  ApiError: class ApiError extends Error {},
  api: { originalStart, originalChunk, uploadTargets: vi.fn(), finalize: vi.fn() },
}));

import * as queue from "./queue.js";
import { drain } from "./uploader.js";

const bytes = (n: number) => new Uint8Array(n).fill(7).buffer;

/** Zadanie po udanym podglądzie — w kolejce zostaje wyłącznie oryginał. */
async function zadanieZOryginalem(rozmiar: number) {
  await queue.enqueue({
    photoId: "11111111-1111-4111-8111-111111111111",
    categoryId: 7,
    ext: "webp",
    mime: "image/webp",
    preview: bytes(100),
    thumb: bytes(50),
    original: bytes(rozmiar),
    originalMime: "image/jpeg",
    originalName: "IMG_0042.HEIC",
    width: 1600,
    height: 1200,
    originalBytes: rozmiar,
  });
  await queue.patch("11111111-1111-4111-8111-111111111111", { previewDone: true });
}

beforeEach(async () => {
  for (const j of await queue.allJobs()) await queue.remove(j.photoId);
  vi.clearAllMocks();
});

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
