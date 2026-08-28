/**
 * Wypisuje 25 kategorii planszy jako [docs/kategorie.md](../docs/kategorie.md).
 *
 * Skrypt, a nie plik pisany ręcznie, z tego samego powodu, dla którego slugi są
 * wyliczane, a nie wpisywane obok etykiet: dokument o zawartości planszy, który
 * trzeba pamiętać, żeby poprawić razem z `board.ts`, prędzej czy później zacznie
 * kłamać — a kłamie cicho, bo nikt nie porównuje 25 wierszy z kodem.
 *
 * Uruchomienie po każdej zmianie etykiet:
 *
 *     npm run kategorie
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { BOARD, SIZE } from "../src/lib/board.js";
import { LOCALES, STRINGS } from "../src/lib/locale.js";

const OUT = fileURLToPath(new URL("../docs/kategorie.md", import.meta.url));

const rows = Array.from({ length: SIZE }, (_, r) => BOARD.slice(r * SIZE, r * SIZE + SIZE));
const line = (cells: readonly string[]) => `| ${cells.join(" | ")} |`;
const divider = (n: number) => `|${" --- |".repeat(n)}`;

/** Siatka 5x5 w układzie karty — do przepisania do Canvy pole po polu. */
function grid(label: (i: number) => string): string[] {
  return [
    line(["", ...Array.from({ length: SIZE }, (_, c) => `**Kolumna ${c + 1}**`)]),
    divider(SIZE + 1),
    ...rows.map((row, r) => line([`**Wiersz ${r + 1}**`, ...row.map((_, c) => label(r * SIZE + c))])),
  ];
}

const doc = [
  "# Kategorie planszy",
  "",
  "**Ten plik jest generowany.** Źródłem prawdy jest `LABELS`",
  "w [src/lib/board.ts](../src/lib/board.ts); po każdej zmianie etykiet uruchom",
  "`npm run kategorie`, żeby ta lista nie zaczęła kłamać.",
  "",
  "Tłumaczenia są **wyłącznie do pokazania gościowi**. Numer pola, slug",
  "i nazwa pliku na Dysku wiszą na polskiej etykiecie i nie zmieniają się razem",
  "z językiem aplikacji — patrz **D14** w [specyfikacji](../FotoBingo%20-%20specification.md).",
  "",
  ...LOCALES.flatMap((code) => [
    `## ${STRINGS[code].languageName}, w układzie karty`,
    "",
    ...grid((i) => BOARD[i]!.labels[code]),
    "",
  ]),
  "## Wszystko obok siebie",
  "",
  "Slug wchodzi w nazwę pliku na Dysku — `R3K2_moment-ceremonii-slubnej__anna-kowalska__…`.",
  "",
  line(["#", "Pole", ...LOCALES.map((code) => STRINGS[code].languageName), "Slug"]),
  divider(LOCALES.length + 2),
  ...BOARD.map((c) =>
    line([
      String(c.id),
      `R${c.row}K${c.col}`,
      ...LOCALES.map((code) => c.labels[code]),
      `\`${c.slug}\``,
    ]),
  ),
  "",
].join("\n");

writeFileSync(OUT, doc, "utf8");
console.log(`Zapisano ${BOARD.length} kategorii do docs/kategorie.md`);
