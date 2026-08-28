import { de } from "./strings/de.js";
import { en } from "./strings/en.js";
import { pl, type Strings } from "./strings/pl.js";
import { sr } from "./strings/sr.js";

/**
 * Wybór języka: wykrycie, zapamiętanie, słowniki.
 *
 * Bez biblioteki. `react-i18next` waży więcej niż wszystkie słowniki razem
 * wzięte, a daje rzeczy, których tu nie ma po co mieć: ładowanie z sieci,
 * interpolację w stringach, przestrzenie nazw. Cztery języki i jeden obiekt na
 * język załatwiają to samo, z pełnym sprawdzaniem typów i zerem kilobajtów
 * ponad tekst — a bajty na tym weselu liczymy (patrz D12 i D13 w specyfikacji).
 *
 * Wszystkie słowniki jadą w głównej paczce, nie leniwie. Razem to kilkanaście
 * kilobajtów tekstu, czyli mniej niż jedna miniatura — a leniwe ładowanie
 * oznaczałoby ekran bez napisów u kogoś, kto właśnie zeskanował kod przy
 * ognisku. Ta arytmetyka trzyma się do kilku języków; przy kilkunastu trzeba by
 * ją policzyć jeszcze raz.
 */
export type Locale = "pl" | "en" | "sr" | "de";

/** Kolejność wyznacza układ przełącznika: gospodarze, wspólny, goście. */
export const LOCALES: readonly Locale[] = ["pl", "en", "sr", "de"];

export const STRINGS: Record<Locale, Strings> = { pl, en, sr, de };

const KEY = "fotobingo.lang";

function isLocale(value: string | null): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** Wybór gościa, jeśli kiedykolwiek go dokonał. */
export function readLocale(): Locale | null {
  try {
    const saved = localStorage.getItem(KEY);
    return isLocale(saved) ? saved : null;
  } catch {
    // Prywatne okno bez localStorage — zostaje wykrywanie przy każdym wejściu.
    return null;
  }
}

export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(KEY, locale);
  } catch {
    /* pusto — wybór przeżyje przynajmniej tę sesję, w stanie Reacta */
  }
}

/**
 * Prefiks kodu języka telefonu → słownik. Angielskiego tu nie ma, bo jest
 * odpowiedzią na wszystko, czego ta lista nie zna.
 *
 * `sr` łapie też `sr-Latn`, `sr-Cyrl` i `sr-RS` — aplikacja i tak mówi
 * latinicą, więc pismo ustawione w telefonie niczego tu nie zmienia. Pokrewne
 * `hr`, `bs` i `sh` **celowo zostają przy angielskim**: serbski byłby dla tych
 * osób zrozumiały, ale podanie go bez pytania jest w tamtej części Europy
 * gestem, którego lepiej nie robić. Przełącznik stoi obok.
 */
const BY_PREFIX: readonly (readonly [prefix: string, locale: Locale])[] = [
  ["pl", "pl"],
  ["sr", "sr"],
  ["de", "de"],
];

/**
 * Język telefonu, gdy gość jeszcze nic nie wybrał.
 *
 * **Angielski jest odpowiedzią domyślną**, nie polski. Gość, którego języka nie
 * znamy, ma zobaczyć ekran zgody na zdjęcia po angielsku, a nie po polsku —
 * czyli w języku, w którym ma szansę go zrozumieć. Polak z telefonem po
 * angielsku przełącza jednym dotknięciem; ten drugi przypadek jest gorszy
 * i to on wygrywa.
 */
export function detectLocale(languages: readonly string[] = phoneLanguages()): Locale {
  // Bierzemy pierwszy język z listy, a nie „czy gdziekolwiek jest polski":
  // telefon po angielsku z polskim na drugim miejscu należy do kogoś, kto
  // świadomie ustawił sobie angielski.
  const first = (languages[0] ?? "").toLowerCase();
  return BY_PREFIX.find(([prefix]) => first.startsWith(prefix))?.[1] ?? "en";
}

/** Wydzielone, żeby `detectLocale([])` znaczyło „brak języka", a nie „zapytaj przeglądarkę". */
function phoneLanguages(): readonly string[] {
  const list = navigator.languages;
  return list && list.length > 0 ? list : [navigator.language ?? ""];
}

export function initialLocale(): Locale {
  return readLocale() ?? detectLocale();
}
