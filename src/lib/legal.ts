/**
 * Data wersji informacji dla gości o tym, co dzieje się z ich zdjęciami.
 *
 * **Sama treść mieszka w słownikach** (`strings/pl.ts` i `strings/en.ts`, klucz
 * `privacy`), bo od kiedy aplikacja mówi w dwóch językach, jedno miejsce na
 * tekst musiałoby i tak trzymać dwie wersje — a wtedy lepiej, żeby leżały tam,
 * gdzie reszta zdań i gdzie `tsc` pilnuje, że żadnej nie brakuje.
 *
 * **Każda zmiana w tym, gdzie zdjęcia lądują, kto je widzi albo jak długo leżą,
 * jest zmianą daty poniżej** — a nie tylko zdania w słowniku. Bramka zapamiętuje
 * właśnie tę datę, nie samo „zaakceptowano": gość, wobec którego zmieniły się
 * fakty, ma zobaczyć nowy tekst, a nie zostać z decyzją podjętą wobec innego.
 *
 * Dodanie tłumaczenia **nie jest** taką zmianą: polski czytelnik widzi to samo
 * zdanie co wcześniej, a po angielsku nikt niczego jeszcze nie akceptował.
 */
export const LEGAL_UPDATED = "2026-08-21";
