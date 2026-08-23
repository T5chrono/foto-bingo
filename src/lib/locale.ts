import { en } from "./strings/en.js";
import { pl, type Strings } from "./strings/pl.js";

/**
 * Wybór języka: wykrycie, zapamiętanie, słowniki.
 *
 * Bez biblioteki. `react-i18next` waży więcej niż oba słowniki razem wzięte,
 * a daje rzeczy, których tu nie ma po co mieć: ładowanie z sieci, interpolację
 * w stringach, przestrzenie nazw. Dwa języki i jeden obiekt na język załatwiają
 * to samo, z pełnym sprawdzaniem typów i zerem kilobajtów ponad tekst — a bajty
 * na tym weselu liczymy (patrz D12 i D13 w specyfikacji).
 *
 * Oba słowniki jadą w głównej paczce, nie leniwie. Razem to kilka kilobajtów
 * tekstu, czyli mniej niż jedna miniatura — a leniwe ładowanie oznaczałoby
 * ekran bez napisów u kogoś, kto właśnie zeskanował kod przy ognisku.
 */
export type Locale = "pl" | "en";

export const LOCALES: readonly Locale[] = ["pl", "en"];

export const STRINGS: Record<Locale, Strings> = { pl, en };

const KEY = "fotobingo.lang";

function isLocale(value: string | null): value is Locale {
  return value === "pl" || value === "en";
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
 * Język telefonu, gdy gość jeszcze nic nie wybrał.
 *
 * **Polski tylko wtedy, gdy telefon jest po polsku** — reszta świata dostaje
 * angielski. Odwrotne domyślne (polski dla wszystkich) zostawiłoby gościa
 * z Serbii czy Anglii na polskim ekranie zgody na zdjęcia, czyli dokładnie tam,
 * gdzie treść ma znaczenie. Polak z telefonem po angielsku przełącza jednym
 * dotknięciem; ten drugi przypadek jest gorszy i to on wygrywa.
 */
export function detectLocale(languages: readonly string[] = phoneLanguages()): Locale {
  // Bierzemy pierwszy język z listy, a nie „czy gdziekolwiek jest polski":
  // telefon po angielsku z polskim na drugim miejscu należy do kogoś, kto
  // świadomie ustawił sobie angielski.
  const first = languages[0] ?? "";
  return first.toLowerCase().startsWith("pl") ? "pl" : "en";
}

/** Wydzielone, żeby `detectLocale([])` znaczyło „brak języka", a nie „zapytaj przeglądarkę". */
function phoneLanguages(): readonly string[] {
  const list = navigator.languages;
  return list && list.length > 0 ? list : [navigator.language ?? ""];
}

export function initialLocale(): Locale {
  return readLocale() ?? detectLocale();
}
