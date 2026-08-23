import type { Locale } from "./locale.js";
import { slugify } from "./slug.js";

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
  /**
   * Polska etykieta — **kanoniczna**. Z niej powstaje slug, czyli nazwa pliku
   * na Dysku, i to ona idzie do panelu Pary Młodej.
   */
  label: string;
  /** Angielska etykieta — wyłącznie do pokazania gościowi. Nie wchodzi nigdzie indziej. */
  labelEn: string;
  /** Wchodzi w nazwę pliku na Dysku. Wyliczany z `label`, nie wpisany ręcznie. */
  slug: string;
};

/**
 * Wiersze dokładnie tak, jak Para Młoda ułożyła je na papierowej karcie —
 * tak czyta się planszę i tak numerujemy kategorie.
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
    "Moment ceremonii ślubnej",
    "Pierwszy taniec",
    "Uchwycona wpadka",
    "Ktoś tańczący z zamkniętymi oczami",
  ],
  [
    "Ktoś owinięty kocem",
    "Tort przed pokrojeniem",
    "Świadkowie razem",
    "Kreatywne zdjęcie z basenu",
    "Najlepszy widok z tarasu",
  ],
  [
    "Ktoś, kto trzyma dwa drinki naraz",
    "Gwiazdy albo nocne niebo",
    "Ktoś, kto próbuje uciec przed zdjęciem",
    "Ktoś, kto płacze ze wzruszenia",
    "Cała drużyna z gry weselnej",
  ],
];

/**
 * Te same 25 pól po angielsku, w tej samej kolejności.
 *
 * Tłumaczenie jest swobodne — kafelek ma ~65 px i podpis musi się w nim zmieścić,
 * więc liczy się krótkie i zrozumiałe zdanie, a nie kalka. Angielski nie wpływa
 * na nic poza tym, co widzi gość: `id`, `slug` i nazwa pliku na Dysku wiszą na
 * polskiej etykiecie.
 */
const LABELS_EN: readonly (readonly string[])[] = [
  [
    "Selfie with the newlyweds",
    "Someone in the sauna or hot tub",
    "The bonfire, sparks and all",
    "The Beskid Niski at sunrise",
    "Selfie with someone you hadn't met before this weekend",
  ],
  [
    "A photo taken from the ground, looking up",
    "The worst possible group photo",
    "The bride's bouquet, up close",
    "A photo with both mums",
    "Someone who fell asleep",
  ],
  [
    "Three generations in one photo",
    "A moment from the wedding ceremony",
    "The first dance",
    "A mishap caught on camera",
    "Someone dancing with their eyes closed",
  ],
  [
    "Someone wrapped in a blanket",
    "The cake before it's cut",
    "The witnesses together",
    "A creative shot from the pool",
    "The best view from the terrace",
  ],
  [
    "Someone holding two drinks at once",
    "Stars, or the night sky",
    "Someone trying to escape the camera",
    "Someone crying happy tears",
    "The whole team from the wedding game",
  ],
];

/**
 * Slugi są WYLICZANE ze slugify, a nie wpisane obok etykiet. Wpisane ręcznie
 * rozjechałyby się z tym, co robi serwer przy budowaniu nazwy pliku — a taki
 * rozjazd jest niewidoczny aż do momentu, gdy na Dysku pojawi się plik pod
 * nazwą, której nikt się nie spodziewa. Stabilność pilnuje test na liście
 * slugów: zmiana w slugify wywala CI, zamiast po cichu przemianować pliki.
 *
 * Slug bierze się **zawsze z polskiej etykiety**, niezależnie od języka
 * aplikacji. Gdyby szedł za językiem telefonu, ta sama kategoria lądowałaby na
 * Dysku pod dwiema różnymi nazwami zależnie od tego, kto akurat wysłał zdjęcie —
 * a nazwę pliku i tak buduje serwer, który o telefonie gościa nie wie nic.
 */
export const BOARD: readonly Category[] = LABELS.flatMap((labels, r) =>
  labels.map((label, c) => ({
    id: r * SIZE + c + 1,
    row: r + 1,
    col: c + 1,
    label,
    labelEn: LABELS_EN[r]![c]!,
    slug: slugify(label),
  })),
);

const BY_ID = new Map(BOARD.map((cat) => [cat.id, cat]));

export function categoryById(id: number): Category | undefined {
  return BY_ID.get(id);
}

/** Etykieta w języku gościa. Panel i Dysk zawsze biorą `label`, czyli polską. */
export function categoryLabel(category: Category, locale: Locale): string {
  return locale === "en" ? category.labelEn : category.label;
}
