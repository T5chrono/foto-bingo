import { describe, expect, it } from "vitest";

import { LOCALES, STRINGS, detectLocale } from "./locale.js";
import { en } from "./strings/en.js";
import { pl } from "./strings/pl.js";

/**
 * Kompletność słowników pilnuje w pierwszej kolejności `tsc`: `en` jest typu
 * `typeof pl`, więc brakujący klucz nie skompiluje się. Te testy łapią to,
 * czego typ nie widzi — pusty string, tekst zostawiony po polsku, tablica
 * akapitów innej długości.
 */

/** Ścieżki do wszystkich liści słownika, żeby błąd nazywał klucz po imieniu. */
function leaves(value: unknown, path = ""): [string, unknown][] {
  if (Array.isArray(value)) return value.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [[path, value]];
}

describe("słowniki", () => {
  it("mają dokładnie te same klucze", () => {
    expect(leaves(en).map(([k]) => k)).toEqual(leaves(pl).map(([k]) => k));
  });

  it("nie mają pustych tekstów", () => {
    for (const [key, value] of [...leaves(pl), ...leaves(en)]) {
      if (typeof value === "string") expect(value.trim(), key).not.toBe("");
    }
  });

  /**
   * Polskie ogonki w angielskim słowniku to prawie zawsze niedokończone
   * tłumaczenie — zdanie przekopiowane z `pl.ts` i zapomniane.
   */
  it("nie zostawia polskich znaków po angielskiej stronie", () => {
    for (const [key, value] of leaves(en)) {
      if (typeof value === "string") expect(value, key).not.toMatch(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/);
    }
  });

  it("ma tyle samo akapitów informacji o zdjęciach", () => {
    expect(en.privacy.paragraphs).toHaveLength(pl.privacy.paragraphs.length);
  });

  it("wystawia oba języki pod kodem, którym się nazywają", () => {
    for (const code of LOCALES) expect(STRINGS[code].htmlLang).toBe(code);
  });
});

describe("liczebniki w obu językach", () => {
  it("odmienia po polsku przez trzy formy", () => {
    expect(pl.settings.queueWaiting(1)).toBe("1 zdjęcie czeka na wysłanie");
    expect(pl.settings.queueWaiting(2)).toBe("2 zdjęcia czeka na wysłanie");
    expect(pl.settings.queueWaiting(5)).toBe("5 zdjęć czeka na wysłanie");
    // 12 kończy się dwójką, ale „12 zdjęcia" to błąd.
    expect(pl.settings.queueWaiting(12)).toBe("12 zdjęć czeka na wysłanie");
  });

  it("odmienia po angielsku przez dwie", () => {
    expect(en.settings.queueWaiting(1)).toBe("1 photo waiting to send");
    expect(en.settings.queueWaiting(2)).toBe("2 photos waiting to send");
    expect(en.panel.photosFrom(1, 1)).toBe("1 photo from 1 guest");
    expect(en.panel.photosFrom(3, 2)).toBe("3 photos from 2 guests");
  });
});

describe("wykrywanie języka", () => {
  it("daje polski tylko telefonowi ustawionemu po polsku", () => {
    expect(detectLocale(["pl-PL", "en-US"])).toBe("pl");
    expect(detectLocale(["pl"])).toBe("pl");
  });

  /**
   * Reszta świata dostaje angielski, a nie polski. Gość z Serbii na polskim
   * ekranie zgody na zdjęcia to gorszy błąd niż Polak z telefonem po angielsku,
   * który przełącza język jednym dotknięciem.
   */
  it("daje angielski każdemu innemu", () => {
    expect(detectLocale(["en-GB"])).toBe("en");
    expect(detectLocale(["sr-RS", "de"])).toBe("en");
    expect(detectLocale([])).toBe("en");
  });
});
