import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import * as queue from "./queue.js";

const bytes = (n: number, fill = 7) => new Uint8Array(n).fill(fill).buffer;

function job(photoId: string, categoryId: number) {
  return {
    photoId,
    categoryId,
    ext: "webp" as const,
    mime: "image/webp",
    preview: bytes(1000),
    thumb: bytes(100),
    kind: "photo" as const,
    durationMs: 0,
    original: new Blob([bytes(5000)]),
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
    expect(j.sendNow).toBe(false);
    expect(await queue.pendingJobs()).toHaveLength(1);
  });

  // To jest sedno działania bez zasięgu: bajty muszą przeżyć zapis i odczyt,
  // bo między jednym a drugim gość zamyka aplikację i idzie na spacer.
  it("przechowuje zawartość zdjęcia, nie tylko metadane", async () => {
    await queue.enqueue(job("a", 3));
    const [stored] = await queue.allJobs();
    expect(stored?.preview.byteLength).toBe(1000);
    expect(stored?.originalChunks).toBe(1);
    expect(new Uint8Array(stored!.preview)[0]).toBe(7);

    const original = await queue.readOriginal("a", 0, 5000);
    expect(original.byteLength).toBe(5000);
    expect(new Uint8Array(original).every((b) => b === 7)).toBe(true);
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
    // Razem z kawałkami — sierota w magazynie to 3 MB, których nikt nie sprzątnie.
    await expect(queue.readOriginal("a", 0, 10)).rejects.toThrow(/Brak kawałka/);
  });

  it("nie wywraca się na łatce do zadania, którego już nie ma", async () => {
    await expect(queue.patch("nieistnieje", { state: "done" })).resolves.toBeUndefined();
  });
});

describe("oryginał w kawałkach", () => {
  beforeEach(async () => {
    for (const j of await queue.allJobs()) await queue.remove(j.photoId);
  });

  // Film 4K to setki megabajtów. Kroimy go po 3 MB, żeby w pamięci karty
  // nigdy nie leżał w całości — a potem musimy umieć złożyć z powrotem
  // dowolny zakres, bo serwer prosi o tyle bajtów, ile sam chce.
  it("kroi oryginał większy niż kawałek i składa go z powrotem", async () => {
    const size = queue.CHUNK_BYTES + 10;
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) data[i] = i % 251;

    const j = await queue.enqueue({
      ...job("film", 5),
      kind: "video",
      durationMs: 12_000,
      original: new Blob([data]),
      originalBytes: size,
    });
    expect(j.originalChunks).toBe(2);

    // Zakres przez granicę kawałków — tu właśnie łatwo o błąd o jeden.
    const across = new Uint8Array(
      await queue.readOriginal("film", queue.CHUNK_BYTES - 5, queue.CHUNK_BYTES + 5),
    );
    expect([...across]).toEqual([...data.subarray(queue.CHUNK_BYTES - 5, queue.CHUNK_BYTES + 5)]);

    const tail = new Uint8Array(await queue.readOriginal("film", size - 3, size));
    expect([...tail]).toEqual([...data.subarray(size - 3)]);

    const whole = new Uint8Array(await queue.readOriginal("film", 0, size));
    expect(whole.byteLength).toBe(size);
    expect(whole[queue.CHUNK_BYTES]).toBe(data[queue.CHUNK_BYTES]);
  });

  it("nie zakłada żadnego kawałka, gdy oryginału nie ma", async () => {
    const j = await queue.enqueue({ ...job("a", 3), original: null, originalBytes: 0 });
    expect(j.originalChunks).toBe(0);
    await queue.patch("a", { previewDone: true });
    expect(await queue.originalPending()).toEqual([]);
  });
});

describe("priorytety kolejki", () => {
  beforeEach(async () => {
    for (const j of await queue.allJobs()) await queue.remove(j.photoId);
  });

  // Sedno podzialu: podglad decyduje, czy kafelek sie zapelni i czy zdjecie
  // policzy sie do bingo. Oryginal to archiwum i moze czekac godzinami.
  it("nowe zadanie czeka najpierw na podglad, nie na oryginal", async () => {
    await queue.enqueue(job("a", 3));
    expect((await queue.previewPending()).map((j) => j.photoId)).toEqual(["a"]);
    expect(await queue.originalPending()).toEqual([]);
  });

  it("po wyslaniu podgladu zadanie przechodzi do kolejki oryginalow", async () => {
    await queue.enqueue(job("a", 3));
    await queue.patch("a", { previewDone: true });
    expect(await queue.previewPending()).toEqual([]);
    expect((await queue.originalPending()).map((j) => j.photoId)).toEqual(["a"]);
  });

  it("zapamietuje postep oryginalu miedzy uruchomieniami", async () => {
    await queue.enqueue(job("a", 3));
    await queue.patch("a", { previewDone: true, originalOffset: 3 * 1024 * 1024 });
    const [stored] = await queue.originalPending();
    expect(stored?.originalOffset).toBe(3 * 1024 * 1024);
  });
});
