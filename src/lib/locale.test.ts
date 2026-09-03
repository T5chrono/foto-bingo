import { describe, expect, it } from "vitest";

import { LOCALES, STRINGS, detectLocale, type Locale } from "./locale.js";
import { de } from "./strings/de.js";
import { en } from "./strings/en.js";
import { pl } from "./strings/pl.js";
import { sr } from "./strings/sr.js";

/**
 * Kompletność słowników pilnuje w pierwszej kolejności `tsc`: każdy z nich jest
 * typu `typeof pl`, więc brakujący klucz nie skompiluje się. Te testy łapią to,
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

/** Języki inne niż kanoniczny — te, w których coś może zostać nieprzetłumaczone. */
const TRANSLATED = LOCALES.filter((code) => code !== "pl");

describe("słowniki", () => {
  it("mają dokładnie te same klucze", () => {
    const expected = leaves(pl).map(([k]) => k);
    for (const code of TRANSLATED) {
      expect(leaves(STRINGS[code]).map(([k]) => k), code).toEqual(expected);
    }
  });

  it("nie mają pustych tekstów", () => {
    for (const code of LOCALES) {
      for (const [key, value] of leaves(STRINGS[code])) {
        if (typeof value === "string") expect(value.trim(), `${code}.${key}`).not.toBe("");
      }
    }
  });

  /**
   * Polskie ogonki w cudzym słowniku to prawie zawsze niedokończone
   * tłumaczenie — zdanie przekopiowane z `pl.ts` i zapomniane.
   *
   * Zbiór liter jest osobny dla każdego języka, bo `ć` **należy** do serbskiej
   * latinicy („moguća") i wspólna lista wywalałaby poprawne zdania.
   */
  const POLISH_ONLY: Record<Exclude<Locale, "pl">, RegExp> = {
    en: /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/,
    de: /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/,
    sr: /[ąęłńóśźżĄĘŁŃÓŚŹŻ]/,
  };

  it("nie zostawia polskich znaków w tłumaczeniach", () => {
    for (const code of TRANSLATED) {
      for (const [key, value] of leaves(STRINGS[code])) {
        if (typeof value === "string") expect(value, `${code}.${key}`).not.toMatch(POLISH_ONLY[code]);
      }
    }
  });

  /**
   * Serbski jedzie latinicą, a nie cyrylicą — inaczej napisy spadłyby na
   * czcionkę systemową: podzbiór `lora-cyrillic` jest wprost wykluczony
   * z precache'u w `vite.config.ts`.
   */
  it("pisze po serbsku latinicą", () => {
    for (const [key, value] of leaves(sr)) {
      if (typeof value === "string") expect(value, `sr.${key}`).not.toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("ma tyle samo akapitów informacji o zdjęciach", () => {
    for (const code of TRANSLATED) {
      expect(STRINGS[code].privacy.paragraphs, code).toHaveLength(pl.privacy.paragraphs.length);
    }
  });

  /**
   * `htmlLang` bywa dokładniejszy niż sam kod — serbski deklaruje się jako
   * `sr-Latn`, bo domyślnym pismem dla `sr` jest cyrylica — ale musi zaczynać
   * się od kodu, pod którym słownik stoi w `STRINGS`.
   */
  it("wystawia każdy język pod kodem, którym się nazywa", () => {
    for (const code of LOCALES) expect(STRINGS[code].htmlLang).toMatch(new RegExp(`^${code}\\b`));
  });
});

describe("liczebniki", () => {
  /**
   * Polski odmienia rzeczownik I czasownik naraz, i to jest cała treść tego
   * testu. Stała `ZDJECIA` daje poprawne „2 zdjęcia", ale doklejone z zewnątrz
   * „czeka" robiło z tego „2 zdjęcia czeka" — po polsku źle, a stało w kolejce
   * w ustawieniach przez cały weekend. Dlatego frazy z czasownikiem mają
   * własne stałe (`ZDJECIA_CZEKAJA`), tak samo jak w `de.ts` i `sr.ts`.
   */
  it("odmienia po polsku przez trzy formy, razem z czasownikiem", () => {
    expect(pl.settings.queueWaiting(1)).toBe("1 zdjęcie czeka na wysłanie");
    expect(pl.settings.queueWaiting(2)).toBe("2 zdjęcia czekają na wysłanie");
    expect(pl.settings.queueWaiting(5)).toBe("5 zdjęć czeka na wysłanie");
    // 12 kończy się dwójką, ale „12 zdjęcia" to błąd.
    expect(pl.settings.queueWaiting(12)).toBe("12 zdjęć czeka na wysłanie");

    expect(pl.settings.queueVideos(1)).toBe("1 film czeka na Wi-Fi");
    expect(pl.settings.queueVideos(2)).toBe("2 filmy czekają na Wi-Fi");
    expect(pl.settings.queueVideos(5)).toBe("5 filmów czeka na Wi-Fi");

    // „Masz 5 linie" było tym samym błędem w pasku bingo.
    expect(pl.bingo.manyLines(2)).toBe("Masz 2 linie — zgłaszasz tę pierwszą.");
    expect(pl.bingo.manyLines(5)).toBe("Masz 5 linii — zgłaszasz tę pierwszą.");
  });

  it("odmienia po angielsku przez dwie", () => {
    expect(en.settings.queueWaiting(1)).toBe("1 photo waiting to send");
    expect(en.settings.queueWaiting(2)).toBe("2 photos waiting to send");
    expect(en.panel.photosFrom(1, 1)).toBe("1 photo from 1 guest");
    expect(en.panel.photosFrom(3, 2)).toBe("3 photos from 2 guests");
  });

  /**
   * Serbski też ma trzy formy, ale **inaczej rozdzielone niż polski**: 21 bierze
   * formę pojedynczą, a nie dopełniaczową. To jest cały powód, dla którego
   * `sr.ts` liczy po swojemu, zamiast wołać `plural.ts`.
   */
  it("odmienia po serbsku przez trzy formy, po serbsku rozdzielone", () => {
    expect(sr.panel.photoCount(1)).toBe("1 fotografija");
    expect(sr.panel.photoCount(2)).toBe("2 fotografije");
    expect(sr.panel.photoCount(5)).toBe("5 fotografija");
    expect(sr.panel.photoCount(11)).toBe("11 fotografija");
    // Tu drogi się rozchodzą: po polsku „21 zdjęć", po serbsku „21 fotografija".
    expect(sr.panel.photoCount(21)).toBe("21 fotografija");
    expect(sr.panel.photoCount(22)).toBe("22 fotografije");
    expect(sr.panel.photosFrom(1, 1)).toBe("1 fotografija od 1 gosta");
    expect(sr.panel.photosFrom(3, 5)).toBe("3 fotografije od 5 gostiju");
  });

  /** Serbski odmienia też czasownik, więc liczba mnoga bierze całą frazę. */
  it("uzgadnia serbski czasownik z liczbą", () => {
    expect(sr.settings.queueWaiting(1)).toBe("1 fotografija čeka na slanje");
    expect(sr.settings.queueWaiting(3)).toBe("3 fotografije čekaju na slanje");
    expect(sr.settings.queueWaiting(9)).toBe("9 fotografija čeka na slanje");
  });

  it("odmienia po niemiecku przez dwie, razem z czasownikiem", () => {
    expect(de.settings.queueWaiting(1)).toBe("1 Foto wartet aufs Senden");
    expect(de.settings.queueWaiting(2)).toBe("2 Fotos warten aufs Senden");
    expect(de.panel.photosFrom(1, 1)).toBe("1 Foto von 1 Gast");
    expect(de.panel.photosFrom(3, 2)).toBe("3 Fotos von 2 Gästen");
  });
});

describe("wykrywanie języka", () => {
  it("daje polski tylko telefonowi ustawionemu po polsku", () => {
    expect(detectLocale(["pl-PL", "en-US"])).toBe("pl");
    expect(detectLocale(["pl"])).toBe("pl");
  });

  it("rozpoznaje serbski niezależnie od pisma w telefonie", () => {
    expect(detectLocale(["sr-RS"])).toBe("sr");
    expect(detectLocale(["sr-Latn-RS"])).toBe("sr");
    expect(detectLocale(["sr-Cyrl-RS"])).toBe("sr");
  });

  it("rozpoznaje niemiecki także spoza Niemiec", () => {
    expect(detectLocale(["de"])).toBe("de");
    expect(detectLocale(["de-AT"])).toBe("de");
    expect(detectLocale(["de-CH", "fr"])).toBe("de");
  });

  /**
   * Angielski jest odpowiedzią na wszystko, czego lista nie zna — nie polski.
   * Gość, którego języka nie mamy, ma zobaczyć ekran zgody na zdjęcia po
   * angielsku, czyli tam, gdzie ma szansę go zrozumieć.
   *
   * Chorwacki i bośniacki **celowo** nie wpadają na serbski, choć byłby dla nich
   * zrozumiały: podanie go bez pytania jest w tamtej części Europy gestem,
   * którego lepiej nie robić.
   */
  it("daje angielski każdemu innemu", () => {
    expect(detectLocale(["en-GB"])).toBe("en");
    expect(detectLocale(["hr-HR"])).toBe("en");
    expect(detectLocale(["bs-BA"])).toBe("en");
    expect(detectLocale(["uk", "pl"])).toBe("en");
    expect(detectLocale([])).toBe("en");
  });
});
