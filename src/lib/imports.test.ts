import { describe, expect, it } from "vitest";

/**
 * Względne importy w `src/lib` **nie mogą** mieć rozszerzenia `.ts`.
 *
 * Reguła jest odwrotna do tej, którą ten plik pilnował wcześniej — i to jest
 * ważniejsza połowa jego historii.
 *
 * Katalog jest współdzielony: `api/` importuje stąd `board`, `slug` i `bingo`,
 * żeby serwer i front liczyły nazwy plików oraz linie bingo tym samym kodem.
 * Natywny stripper Node'a (`--experimental-strip-types`) wymagał jawnego `.ts`,
 * więc dodaliśmy je wszędzie. **Vercel transpiluje `api/index.ts` do `.js`,
 * ale zostawia specyfikatory importów bez zmian** — więc funkcja na produkcji
 * szukała `api/_lib/auth.ts`, którego po transpilacji nie ma, i wywalała się
 * z `ERR_MODULE_NOT_FOUND` na każdym żądaniu.
 *
 * Build i testy przechodziły. Zobaczyliśmy to dopiero na wdrożonej funkcji.
 *
 * Dev-serwer używa teraz `tsx`, który rozwiązuje ścieżki po bundlerowemu, więc
 * wymóg zniknął po tej stronie, w której był wygodą — a został po tej, w której
 * jest warunkiem działania.
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

  it.each(files.map(([path]) => path))("%s importuje bez rozszerzenia", (path) => {
    const source = sources[path] ?? "";
    const statyczne = [...source.matchAll(/from\s+"(\.[^"]*)"/g)].map((m) => m[1]!);
    const dynamiczne = [...source.matchAll(/import\(\s*"(\.[^"]*)"\s*\)/g)].map((m) => m[1]!);

    expect([...statyczne, ...dynamiczne].filter((spec) => spec.endsWith(".ts"))).toEqual([]);
  });
});
