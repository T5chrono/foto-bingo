import { slugify } from "./slug.ts";

/**
 * 25 kategorii planszy. Świadomie NIE jest to tabela w bazie (sekcja 8
 * specyfikacji): nigdy się nie zmienią, front potrzebuje ich offline przy
 * zerowym zasięgu, a `photos.category_id` odwołuje się do nich po numerze.
 */

export const SIZE = 5;

export type Category = {
  /** 1..25, liczone wierszami: (row - 1) * 5 + col */
  id: number;
  /** 1..5 */
  row: number;
  /** 1..5 */
  col: number;
  label: string;
  /** Wchodzi w nazwę pliku na Dysku. Wyliczany, nie wpisany ręcznie. */
  slug: string;
};

/**
 * Kolumny dokładnie tak, jak Para Młoda ułożyła je w oryginalnej tabeli —
 * zapisane wierszami, bo tak czyta się planszę i tak numerujemy kategorie.
 */
const LABELS: readonly (readonly string[])[] = [
  [
    "Selfie z parą młodą",
    "Ktoś w saunie albo w balii",
    "Ognisko z iskrami",
    "Widok na Beskid Niski o wschodzie słońca",
    "Selfie z osobą, której nie znałeś przed tym weekendem",
  ],
  [
    "Zdjęcie zrobione z ziemi, od dołu",
    "Najgorsze możliwe zdjęcie grupowe",
    "Bukiet panny młodej z bliska",
    "Zdjęcie z obiema mamami",
    "Ktoś, kto zasnął",
  ],
  [
    "Trzy pokolenia na jednym zdjęciu",
    "Moment ceremonii",
    "Pierwszy taniec",
    "Uchwycona wpadka",
    "Ktoś tańczący z zamkniętymi oczami",
  ],
  [
    "Ktoś owinięty kocem",
    "Tort przed pokrojeniem",
    "Świadkowie razem",
    "Zdjęcie z basenu",
    "Najlepszy widok z tarasu",
  ],
  [
    "Ktoś, kto trzyma dwa drinki naraz",
    "Gwiazdy albo nocne niebo",
    "Ktoś, kto próbuje uciec przed zdjęciem",
    "Ktoś, kto płacze ze wzruszenia",
    "Cała drużyna z gry oczepinowej",
  ],
];

/**
 * Slugi są WYLICZANE ze slugify, a nie wpisane obok etykiet. Wpisane ręcznie
 * rozjechałyby się z tym, co robi serwer przy budowaniu nazwy pliku — a taki
 * rozjazd jest niewidoczny aż do momentu, gdy na Dysku pojawi się plik pod
 * nazwą, której nikt się nie spodziewa. Stabilność pilnuje test na liście
 * slugów: zmiana w slugify wywala CI, zamiast po cichu przemianować pliki.
 */
export const BOARD: readonly Category[] = LABELS.flatMap((labels, r) =>
  labels.map((label, c) => ({
    id: r * SIZE + c + 1,
    row: r + 1,
    col: c + 1,
    label,
    slug: slugify(label),
  })),
);

const BY_ID = new Map(BOARD.map((cat) => [cat.id, cat]));

export function categoryById(id: number): Category | undefined {
  return BY_ID.get(id);
}
