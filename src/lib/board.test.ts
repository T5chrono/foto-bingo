import { describe, expect, it } from "vitest";
import { BOARD, SIZE, categoryById, categoryLabel } from "./board.js";
import { LOCALES } from "./locale.js";
import { slugify } from "./slug.js";

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

  it("zachowuje wiersze z tabeli Pary Młodej", () => {
    expect(categoryById(1)?.label).toBe("Selfie z parą młodą");
    expect(categoryById(3)?.label).toBe("Ognisko z iskrami");
    expect(categoryById(11)?.label).toBe("Trzy pokolenia na jednym zdjęciu");
    expect(categoryById(25)?.label).toBe("Cała drużyna z gry weselnej");
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
      "moment-ceremonii-slubnej",
      "pierwszy-taniec",
      "uchwycona-wpadka",
      "ktos-tanczacy-z-zamknietymi-oczami",
      "ktos-owiniety-kocem",
      "tort-przed-pokrojeniem",
      "swiadkowie-razem",
      "kreatywne-zdjecie-z-basenu",
      "najlepszy-widok-z-tarasu",
      "ktos-kto-trzyma-dwa-drinki-naraz",
      "gwiazdy-albo-nocne-niebo",
      "ktos-kto-probuje-uciec-przed-zdjeciem",
      "ktos-kto-placze-ze-wzruszenia",
      "cala-druzyna-z-gry-weselnej",
    ]);
  });
});

describe("etykiety w językach gości", () => {
  /** Języki inne niż kanoniczny — tylko one mogą zostać nieprzetłumaczone. */
  const TRANSLATED = LOCALES.filter((code) => code !== "pl");

  it("ma tłumaczenie każdego z 25 pól w każdym języku", () => {
    for (const cat of BOARD) {
      for (const code of TRANSLATED) {
        expect(cat.labels[code], `pole ${cat.id} po ${code}`).toBeTruthy();
        expect(cat.labels[code], `pole ${cat.id} zostało po polsku w ${code}`).not.toBe(cat.label);
      }
    }
  });

  it("nie powtarza tej samej etykiety na dwóch polach", () => {
    for (const code of LOCALES) {
      expect(new Set(BOARD.map((c) => c.labels[code])).size, code).toBe(BOARD.length);
    }
  });

  it("podaje etykietę zgodną z językiem", () => {
    const cat = categoryById(12)!;
    expect(categoryLabel(cat, "pl")).toBe("Moment ceremonii ślubnej");
    expect(categoryLabel(cat, "en")).toBe("A moment from the wedding ceremony");
    expect(categoryLabel(cat, "sr")).toBe("Trenutak sa venčanja");
    expect(categoryLabel(cat, "de")).toBe("Ein Moment der Trauung");
  });

  it("trzyma polską etykietę także w mapie języków", () => {
    for (const cat of BOARD) expect(cat.labels.pl).toBe(cat.label);
  });

  /**
   * Nazwa pliku na Dysku powstaje na serwerze, który nie wie, w jakim języku
   * jest telefon gościa. Gdyby slug szedł za tłumaczeniem, to samo pole
   * lądowałoby w folderze pod czterema nazwami — i wyszłoby to dopiero po weselu.
   */
  it("liczy slug z polskiej etykiety, nie z tłumaczenia", () => {
    for (const cat of BOARD) {
      expect(cat.slug).toBe(slugify(cat.label));
      for (const code of TRANSLATED) {
        expect(cat.slug, `pole ${cat.id} po ${code}`).not.toBe(slugify(cat.labels[code]));
      }
    }
  });
});
