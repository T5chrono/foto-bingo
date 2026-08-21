import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import * as queue from "./queue";

const bytes = (n: number) => new Uint8Array(n).fill(7).buffer;

function job(photoId: string, categoryId: number) {
  return {
    photoId,
    categoryId,
    ext: "webp" as const,
    mime: "image/webp",
    preview: bytes(1000),
    thumb: bytes(100),
    original: bytes(5000),
    originalMime: "image/jpeg",
    originalName: "IMG_0042.HEIC",
    width: 1600,
    height: 1200,
    originalBytes: 5000,
  };
}

describe("kolejka wysyłkowa", () => {
  beforeEach(async () => {
    for (const j of await queue.allJobs()) await queue.remove(j.photoId);
  });

  it("zapisuje zadanie od razu jako oczekujące", async () => {
    const j = await queue.enqueue(job("a", 3));
    expect(j.state).toBe("queued");
    expect(j.attempts).toBe(0);
    expect(await queue.pendingJobs()).toHaveLength(1);
  });

  // To jest sedno działania bez zasięgu: bajty muszą przeżyć zapis i odczyt,
  // bo między jednym a drugim gość zamyka aplikację i idzie na spacer.
  it("przechowuje zawartość zdjęcia, nie tylko metadane", async () => {
    await queue.enqueue(job("a", 3));
    const [stored] = await queue.allJobs();
    expect(stored?.preview.byteLength).toBe(1000);
    expect(stored?.original?.byteLength).toBe(5000);
    expect(new Uint8Array(stored!.preview)[0]).toBe(7);
  });

  it("liczy bytes jako podgląd plus miniatura — to zasila licznik zajętości", async () => {
    const j = await queue.enqueue(job("a", 3));
    expect(j.bytes).toBe(1100);
  });

  it("odtwarza Blob z bajtów z właściwym typem MIME", () => {
    const b = queue.toBlob(bytes(50), "image/webp");
    expect(b.size).toBe(50);
    expect(b.type).toBe("image/webp");
  });

  it("wydaje zadania w kolejności zgłoszeń", async () => {
    await queue.enqueue(job("pierwsze", 1));
    await new Promise((r) => setTimeout(r, 2));
    await queue.enqueue(job("drugie", 2));
    expect((await queue.pendingJobs()).map((j) => j.photoId)).toEqual([
      "pierwsze",
      "drugie",
    ]);
  });

  it("zwraca do ponowienia także zadania nieudane i przerwane w locie", async () => {
    await queue.enqueue(job("a", 1));
    await queue.enqueue(job("b", 2));
    await queue.enqueue(job("c", 3));
    await queue.patch("a", { state: "failed" });
    // "uploading" zostaje po telefonie ubitym w trakcie wysyłki — takie zadanie
    // musi wrócić, inaczej zdjęcie zniknie po cichu.
    await queue.patch("b", { state: "uploading" });
    expect((await queue.pendingJobs()).map((j) => j.photoId).sort()).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("zapamiętuje przyczynę i liczbę prób", async () => {
    await queue.enqueue(job("a", 3));
    await queue.patch("a", { attempts: 2, lastError: "Brak połączenia" });
    const [stored] = await queue.allJobs();
    expect(stored?.attempts).toBe(2);
    expect(stored?.lastError).toBe("Brak połączenia");
  });

  it("oddaje najnowsze zadanie dla kafelka", async () => {
    await queue.enqueue(job("stare", 8));
    await new Promise((r) => setTimeout(r, 2));
    await queue.enqueue(job("nowe", 8));
    expect((await queue.jobFor(8))?.photoId).toBe("nowe");
  });

  it("usuwa zadanie dopiero na żądanie — to jedyne miejsce, gdzie zdjęcie znika", async () => {
    await queue.enqueue(job("a", 3));
    await queue.remove("a");
    expect(await queue.allJobs()).toHaveLength(0);
  });

  it("nie wywraca się na łatce do zadania, którego już nie ma", async () => {
    await expect(queue.patch("nieistnieje", { state: "done" })).resolves.toBeUndefined();
  });
});
