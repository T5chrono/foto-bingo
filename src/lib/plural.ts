/**
 * Polskie liczebniki.
 *
 * Trzy formy, nie dwie: „1 zdjęcie", „2 zdjęcia", „5 zdjęć". Angielskie
 * `n === 1 ? x : x + "s"` daje tu „1 gości" i „22 zdjęć" — czyli dokładnie
 * te zdania, które Para Młoda ma przed oczami przez cały weekend.
 *
 * Wyjątek na 12–14 jest istotny: 12 kończy się dwójką, ale „12 zdjęcia"
 * to błąd. Ta sama reguła dotyczy 112, 213 i tak dalej.
 */
export type Forms = readonly [one: string, few: string, many: string];

export function pluralForm(n: number): 0 | 1 | 2 {
  const abs = Math.abs(Math.trunc(n));
  if (abs === 1) return 0;

  const last = abs % 10;
  const lastTwo = abs % 100;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return 1;

  return 2;
}

/** `plural(5, ZDJECIA)` → „zdjęć" (samo słowo, bez liczby). */
export function plural(n: number, forms: Forms): string {
  return forms[pluralForm(n)];
}

/** `count(5, ZDJECIA)` → „5 zdjęć". */
export function count(n: number, forms: Forms): string {
  return `${n} ${plural(n, forms)}`;
}

export const ZDJECIA: Forms = ["zdjęcie", "zdjęcia", "zdjęć"];
// „gości" w obu formach mnogich — „2 goście" brzmi tu sztucznie w liczniku.
export const GOSCIE: Forms = ["gościa", "gości", "gości"];
export const ORYGINALY: Forms = ["oryginał", "oryginały", "oryginałów"];
export const NOWE_ZGLOSZENIA: Forms = ["nowe", "nowe", "nowych"];
