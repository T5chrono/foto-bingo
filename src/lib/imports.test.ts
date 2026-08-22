import { describe, expect, it } from "vitest";

/**
 * Względne importy w `src/lib` muszą kończyć się na `.js` — mimo że na dysku
 * leżą pliki `.ts`. To jest konwencja ESM w TypeScripcie: specyfikator opisuje
 * plik **po** kompilacji.
 *
 * Ta reguła zmieniała się dwa razy i obie zmiany kosztowały wdrożenie, więc
 * warto zapisać, skąd się wzięła.
 *
 * Najpierw importy nie miały rozszerzeń. Natywny stripper Node'a
 * (`--experimental-strip-types`) nie robi rozszerzania ścieżek w stylu
 * bundlera, więc dev-serwer nie wstawał — dodaliśmy `.ts`.
 *
 * Potem okazało się, że **Vercel transpiluje `api/index.ts` do `.js`, ale
 * zostawia specyfikatory bez zmian**: funkcja na produkcji szukała
 * `api/_lib/auth.ts`, którego już nie ma. Zdjęliśmy `.ts` i przestawiliśmy
 * dev-serwer na `tsx`.
 *
 * Wtedy Vercel odmówił kompilacji: jego type-check dla `api/` działa
 * z `moduleResolution: node16`, które wymaga jawnych rozszerzeń — i to `.js`,
 * nie `.ts`. Stąd stan obecny, jedyny, który zadowala wszystkich naraz:
 * Vercel, `tsc`, Vite, vitest i `tsx`.
 *
 * Za każdym razem build i testy przechodziły. Oba błędy pokazały się dopiero
 * na wdrożonej funkcji — stąd ten test.
 */
const sources = import.meta.glob("./*.ts", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const files = Object.entries(sources).filter(([path]) => !path.endsWith(".test.ts"));

describe("importy w src/lib", () => {
  it("znajduje pliki do sprawdzenia", () => {
    expect(files.length).toBeGreaterThan(3);
  });

  it.each(files.map(([path]) => path))("%s importuje z rozszerzeniem .js", (path) => {
    const source = sources[path] ?? "";
    const statyczne = [...source.matchAll(/from\s+"(\.[^"]*)"/g)].map((m) => m[1]!);
    const dynamiczne = [...source.matchAll(/import\(\s*"(\.[^"]*)"\s*\)/g)].map((m) => m[1]!);

    expect([...statyczne, ...dynamiczne].filter((spec) => !spec.endsWith(".js"))).toEqual([]);
  });
});
