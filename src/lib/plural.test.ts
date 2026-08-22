import { describe, expect, it } from "vitest";
import { GOSCIE, ZDJECIA, count, pluralForm } from "./plural";

describe("polskie liczebniki", () => {
  it("rozpoznaje formę pojedynczą", () => {
    expect(pluralForm(1)).toBe(0);
  });

  it("rozpoznaje formę dla 2, 3, 4 i ich wielokrotności", () => {
    for (const n of [2, 3, 4, 22, 33, 104, 1002]) expect(pluralForm(n)).toBe(1);
  });

  // Sedno reguly: 12 konczy sie dwojka, ale "12 zdjecia" to blad.
  it("robi wyjątek dla 12, 13 i 14 — także w setkach", () => {
    for (const n of [12, 13, 14, 112, 213, 1014]) expect(pluralForm(n)).toBe(2);
  });

  it("dla 0 i 5+ daje formę dopełniaczową", () => {
    for (const n of [0, 5, 9, 11, 25, 100]) expect(pluralForm(n)).toBe(2);
  });

  it("skleja liczbę ze słowem", () => {
    expect(count(1, ZDJECIA)).toBe("1 zdjęcie");
    expect(count(3, ZDJECIA)).toBe("3 zdjęcia");
    expect(count(25, ZDJECIA)).toBe("25 zdjęć");
    // To zdanie widzialo "1 gosci" w panelu, zanim powstal ten plik.
    expect(count(1, GOSCIE)).toBe("1 gościa");
    expect(count(40, GOSCIE)).toBe("40 gości");
  });
});
