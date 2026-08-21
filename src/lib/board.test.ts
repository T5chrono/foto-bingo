import { describe, expect, it } from "vitest";
import { BOARD, SIZE, categoryById } from "./board";

describe("plansza", () => {
  it("ma 25 kategorii ponumerowanych 1..25 wierszami", () => {
    expect(BOARD).toHaveLength(SIZE * SIZE);
    expect(BOARD.map((c) => c.id)).toEqual(
      Array.from({ length: 25 }, (_, i) => i + 1),
    );
  });

  it("wiąże id z pozycją wzorem (row - 1) * 5 + col", () => {
    for (const cat of BOARD) {
      expect(cat.id).toBe((cat.row - 1) * SIZE + cat.col);
    }
  });

  it("zachowuje kolumny z oryginalnej tabeli Pary Młodej", () => {
    expect(categoryById(1)?.label).toBe("Selfie z parą młodą");
    expect(categoryById(3)?.label).toBe("Ognisko z iskrami");
    expect(categoryById(11)?.label).toBe("Trzy pokolenia na jednym zdjęciu");
    expect(categoryById(25)?.label).toBe("Cała drużyna z gry oczepinowej");
  });

  it("nie ma dwóch kategorii o tym samym slugu", () => {
    expect(new Set(BOARD.map((c) => c.slug)).size).toBe(BOARD.length);
  });

  it("daje slugi bezpieczne jako nazwy plików", () => {
    for (const cat of BOARD) {
      expect(cat.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(cat.slug.length).toBeLessThanOrEqual(60);
    }
  });

  /**
   * Ten test jest zamkiem na nazwach plików, nie sprawdzeniem slugify.
   *
   * Slugi wchodzą w nazwy plików na Dysku Google. Gdyby ktoś kiedyś poprawił
   * slugify, wszystkie zdjęcia wysłane po tej zmianie trafiłyby na Dysk pod
   * innymi nazwami niż te sprzed zmiany — i nikt by tego nie zauważył aż do
   * przeglądania folderu po weselu. Lista poniżej wywala CI zamiast pozwolić
   * na cichy rozjazd.
   */
  it("ma stabilne slugi — zmiana tej listy oznacza zmianę nazw plików na Dysku", () => {
    expect(BOARD.map((c) => c.slug)).toEqual([
      "selfie-z-para-mloda",
      "ktos-w-saunie-albo-w-balii",
      "ognisko-z-iskrami",
      "widok-na-beskid-niski-o-wschodzie-slonca",
      "selfie-z-osoba-ktorej-nie-znales-przed-tym-weekendem",
      "zdjecie-zrobione-z-ziemi-od-dolu",
      "najgorsze-mozliwe-zdjecie-grupowe",
      "bukiet-panny-mlodej-z-bliska",
      "zdjecie-z-obiema-mamami",
      "ktos-kto-zasnal",
      "trzy-pokolenia-na-jednym-zdjeciu",
      "moment-ceremonii",
      "pierwszy-taniec",
      "uchwycona-wpadka",
      "ktos-tanczacy-z-zamknietymi-oczami",
      "ktos-owiniety-kocem",
      "tort-przed-pokrojeniem",
      "swiadkowie-razem",
      "zdjecie-z-basenu",
      "najlepszy-widok-z-tarasu",
      "ktos-kto-trzyma-dwa-drinki-naraz",
      "gwiazdy-albo-nocne-niebo",
      "ktos-kto-probuje-uciec-przed-zdjeciem",
      "ktos-kto-placze-ze-wzruszenia",
      "cala-druzyna-z-gry-oczepinowej",
    ]);
  });
});
