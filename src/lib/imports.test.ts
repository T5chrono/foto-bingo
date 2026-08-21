import { describe, expect, it } from "vitest";

/**
 * Wszystkie względne importy w `src/lib` muszą mieć jawne `.ts`.
 *
 * Ten katalog jest współdzielony: `api/` importuje stąd `board.ts`, `slug.ts`
 * i `bingo.ts`, żeby serwer i front liczyły nazwy plików oraz linie bingo tym
 * samym kodem. Vite rozwiązuje ścieżki bez rozszerzenia, ale Node przy
 * `--experimental-strip-types` już nie — i wtedy serwer deweloperski nie
 * wstaje wcale, z błędem wskazującym plik, którego nikt nie ruszał.
 *
 * Ten sam błąd wyłożył start API trzy razy z rzędu, za każdym razem po dodaniu
 * jednego importu. Test kosztuje mniej niż czwarta diagnoza.
 *
 * Czytamy pliki przez `import.meta.glob`, a nie przez `node:fs`, bo ten test
 * mieszka w projekcie frontowym — sięgnięcie po API Node'a wywala `tsc`.
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

  it.each(files.map(([path]) => path))("%s importuje z jawnym rozszerzeniem", (path) => {
    const source = sources[path] ?? "";
    const statyczne = [...source.matchAll(/from\s+"(\.[^"]*)"/g)].map((m) => m[1]!);
    const dynamiczne = [...source.matchAll(/import\(\s*"(\.[^"]*)"\s*\)/g)].map((m) => m[1]!);

    expect([...statyczne, ...dynamiczne].filter((spec) => !spec.endsWith(".ts"))).toEqual([]);
  });
});
