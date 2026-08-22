import { afterEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { __setDb } from "./db.js";
import { __clearUrlCache, createDownloadUrls, signedUrl } from "./storage.js";

type Row = { path: string | null; signedUrl: string | null; error: string | null };

let podpis = 0;

/**
 * Atrapa magazynu. Oddaje listę wywołań, żeby dało się sprawdzić nie tylko
 * wynik, ale i to, ile razy w ogóle pytaliśmy Storage — bo o to w tej zmianie
 * chodzi. Każdy podpis jest inny, więc powtórzony adres dowodzi, że przyszedł
 * z cache'u, a nie z ponownego podpisania.
 */
function stubStorage(reply: (paths: string[]) => Row[]) {
  const calls: string[][] = [];
  const client = {
    storage: {
      from: () => ({
        createSignedUrls: async (paths: string[]) => {
          calls.push(paths);
          return { data: reply(paths), error: null };
        },
      }),
    },
  };
  __setDb(client as unknown as SupabaseClient);
  return calls;
}

const ok = (paths: string[]): Row[] =>
  paths.map((path) => ({ path, signedUrl: `https://x/${path}?token=${++podpis}`, error: null }));

const plansza = (n: number) =>
  Array.from({ length: n }, (_, i) => `gosc/${i + 1}/zdjecie-${i + 1}-t.webp`);

afterEach(() => {
  __setDb(null);
  __clearUrlCache();
});

describe("podpisy do pobrania", () => {
  it("pyta o całą planszę jednym żądaniem, nie 25 razy", async () => {
    const calls = stubStorage(ok);

    const urls = await createDownloadUrls(plansza(25));

    expect(calls).toHaveLength(1);
    expect(calls[0]).toHaveLength(25);
    expect(urls.size).toBe(25);
  });

  // To jest cały powód istnienia cache'u: ten sam kafelek ma dostać ten sam
  // adres, bo inaczej przeglądarka pobiera miniaturę od nowa przy każdym
  // odświeżeniu planszy.
  it("oddaje ten sam adres przy kolejnym odświeżeniu planszy", async () => {
    const calls = stubStorage(ok);
    const sciezki = plansza(3);

    const pierwsze = await createDownloadUrls(sciezki);
    const drugie = await createDownloadUrls(sciezki);

    expect(calls).toHaveLength(1);
    for (const sciezka of sciezki) {
      expect(signedUrl(drugie, sciezka)).toBe(signedUrl(pierwsze, sciezka));
    }
  });

  it("dopytuje wyłącznie o ścieżki spoza cache'u", async () => {
    const calls = stubStorage(ok);

    await createDownloadUrls(["a.webp", "b.webp"]);
    const urls = await createDownloadUrls(["a.webp", "b.webp", "c.webp"]);

    expect(calls[1]).toEqual(["c.webp"]);
    expect(urls.size).toBe(3);
  });

  it("nie podpisuje niczego, gdy plansza jest pusta", async () => {
    const calls = stubStorage(ok);

    const urls = await createDownloadUrls([]);

    expect(calls).toHaveLength(0);
    expect(urls.size).toBe(0);
  });

  // Brakujący obiekt w bucketcie to anomalia — wiersz w `photos` powstaje
  // dopiero po udanym wgraniu. Ma być widoczny jako błąd, a nie jako pusty
  // kafelek, bo pusty kafelek wypada z bingo.
  it("rzuca, gdy któraś ścieżka nie dostała adresu", async () => {
    stubStorage((paths) =>
      paths.map((path) => ({ path, signedUrl: null, error: "Object not found" })),
    );

    await expect(createDownloadUrls(["brak.webp"])).rejects.toThrow("Object not found");
  });
});

describe("odczyt adresu z mapy", () => {
  it("rzuca zamiast oddać undefined dla nieznanej ścieżki", () => {
    expect(() => signedUrl(new Map(), "czego-tam-nie-ma.webp")).toThrow(
      "czego-tam-nie-ma.webp",
    );
  });
});
