import "fake-indexeddb/auto";
import { openDB } from "idb";
import { beforeEach, describe, expect, it } from "vitest";
import * as queue from "./queue.js";

/**
 * Osobny plik, bo ten test musi zacząć od bazy w WERSJI 1 — a każdy inny
 * test w procesie otwiera już wersję 2. Fake IndexedDB żyje między plikami,
 * więc tu najpierw kasujemy bazę do zera i budujemy ją tak, jak wyglądała
 * na telefonie gościa przed aktualizacją.
 */
const DB = "fotobingo";

function deleteDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe("aktualizacja kolejki z wersji 1", () => {
  beforeEach(async () => {
    queue.__resetDb();
    await deleteDb();
  });

  // Gość wysłał zdjęcie w piątek i dostał nowego service workera w sobotę.
  // Zadanie sprzed aktualizacji trzyma oryginał w jednym ArrayBufferze —
  // ma przejść do magazynu kawałków i dojechać na Dysk, jakby nic się nie stało.
  it("przenosi oryginał z zadania do magazynu kawałków", async () => {
    const legacy = await openDB(DB, 1, {
      upgrade(db) {
        const store = db.createObjectStore("jobs", { keyPath: "photoId" });
        store.createIndex("by-state", "state");
        store.createIndex("by-category", "categoryId");
      },
    });
    const size = queue.CHUNK_BYTES + 100;
    await legacy.put("jobs", {
      photoId: "stare",
      categoryId: 4,
      state: "queued",
      ext: "webp",
      mime: "image/webp",
      preview: new Uint8Array(10).buffer,
      thumb: new Uint8Array(5).buffer,
      original: new Uint8Array(size).fill(3).buffer,
      originalMime: "image/jpeg",
      originalName: "IMG_1.jpg",
      width: 100,
      height: 100,
      bytes: 15,
      originalBytes: size,
      previewDone: true,
      originalOffset: 0,
      attempts: 0,
      lastError: null,
      createdAt: 1,
      updatedAt: 1,
    });
    legacy.close();

    const [migrated] = await queue.allJobs();
    expect(migrated?.kind).toBe("photo");
    expect(migrated?.sendNow).toBe(false);
    expect(migrated?.originalChunks).toBe(2);
    expect((migrated as unknown as { original?: unknown })?.original).toBeUndefined();

    const tail = new Uint8Array(await queue.readOriginal("stare", size - 4, size));
    expect([...tail]).toEqual([3, 3, 3, 3]);
    expect((await queue.originalPending()).map((j) => j.photoId)).toEqual(["stare"]);
  });
});
