import { LOCALES, type Locale } from "./locale.js";
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
  /**
   * To samo pole we wszystkich językach — **wyłącznie do pokazania gościowi**.
   * Nie wchodzi nigdzie indziej: ani w slug, ani w panel, ani na Dysk.
   */
  labels: Record<Locale, string>;
  /** Wchodzi w nazwę pliku na Dysku. Wyliczany z `label`, nie wpisany ręcznie. */
  slug: string;
};

/**
 * Wiersze dokładnie tak, jak Para Młoda ułożyła je na papierowej karcie —
 * tak czyta się planszę i tak numerujemy kategorie. Polski jest pierwszy, bo
 * jest kanoniczny: z niego liczy się slug.
 *
 * Wszystkie języki leżą w jednej mapie, a nie w osobnych stałych obok siebie.
 * `Record<Locale, …>` znaczy, że dołożenie języka do `Locale` **nie skompiluje
 * się**, dopóki nie dojdzie tu 25 etykiet — osobne `LABELS_EN`, `LABELS_SR`
 * i tak dalej przepuściłyby planszę bez tłumaczenia, a puste kafelki zobaczyłby
 * dopiero gość.
 *
 * Tłumaczenia są **swobodne, nie dosłowne**: kafelek ma ~65 px i podpis musi się
 * w nim zmieścić, więc liczy się krótkie i zrozumiałe zdanie, a nie kalka.
 */
const LABELS: Record<Locale, readonly (readonly string[])[]> = {
  pl: [
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
  ],

  en: [
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
  ],

  sr: [
    [
      "Selfi sa mladencima",
      "Neko u sauni ili u kaci",
      "Logorska vatra sa varnicama",
      "Beskid Niski u svitanje",
      "Selfi s nekim koga nisi znao pre ovog vikenda",
    ],
    [
      "Fotografija sa zemlje, odozdo",
      "Najgora moguća grupna fotografija",
      "Mladin buket izbliza",
      "Fotografija sa obe mame",
      "Neko ko je zaspao",
    ],
    [
      "Tri generacije na jednoj fotografiji",
      "Trenutak sa venčanja",
      "Prvi ples",
      "Uhvaćen gaf",
      "Neko ko pleše zatvorenih očiju",
    ],
    [
      "Neko umotan u ćebe",
      "Torta pre sečenja",
      "Kum i kuma zajedno",
      "Kreativna fotografija sa bazena",
      "Najbolji pogled sa terase",
    ],
    [
      "Neko sa dva pića u rukama",
      "Zvezde ili noćno nebo",
      "Neko ko beži od fotografisanja",
      "Neko ko plače od ganutosti",
      "Ceo tim iz svadbene igre",
    ],
  ],

  de: [
    [
      "Selfie mit dem Brautpaar",
      "Jemand in der Sauna oder im Zuber",
      "Das Lagerfeuer mit Funkenflug",
      "Der Beskid Niski im Sonnenaufgang",
      "Selfie mit jemandem, den du vorher nicht kanntest",
    ],
    [
      "Ein Foto vom Boden aus, nach oben",
      "Das schlechtestmögliche Gruppenfoto",
      "Der Brautstrauß aus der Nähe",
      "Ein Foto mit beiden Müttern",
      "Jemand, der eingeschlafen ist",
    ],
    [
      "Drei Generationen auf einem Foto",
      "Ein Moment der Trauung",
      "Der erste Tanz",
      "Eine Panne im Bild",
      "Jemand, der mit geschlossenen Augen tanzt",
    ],
    [
      "Jemand in eine Decke gewickelt",
      "Die Torte, bevor sie angeschnitten wird",
      "Die Trauzeugen zusammen",
      "Ein kreatives Foto aus dem Pool",
      "Der beste Blick von der Terrasse",
    ],
    [
      "Jemand mit zwei Drinks auf einmal",
      "Sterne oder der Nachthimmel",
      "Jemand, der vor der Kamera flieht",
      "Jemand, der Freudentränen weint",
      "Das ganze Team aus dem Hochzeitsspiel",
    ],
  ],
};

/**
 * Slugi są WYLICZANE ze slugify, a nie wpisane obok etykiet. Wpisane ręcznie
 * rozjechałyby się z tym, co robi serwer przy budowaniu nazwy pliku — a taki
 * rozjazd jest niewidoczny aż do momentu, gdy na Dysku pojawi się plik pod
 * nazwą, której nikt się nie spodziewa. Stabilność pilnuje test na liście
 * slugów: zmiana w slugify wywala CI, zamiast po cichu przemianować pliki.
 *
 * Slug bierze się **zawsze z polskiej etykiety**, niezależnie od języka
 * aplikacji. Gdyby szedł za językiem telefonu, ta sama kategoria lądowałaby na
 * Dysku pod czterema różnymi nazwami zależnie od tego, kto akurat wysłał
 * zdjęcie — a nazwę pliku i tak buduje serwer, który o telefonie gościa nie wie
 * nic.
 */
export const BOARD: readonly Category[] = LABELS.pl.flatMap((labels, r) =>
  labels.map((label, c) => ({
    id: r * SIZE + c + 1,
    row: r + 1,
    col: c + 1,
    label,
    labels: Object.fromEntries(
      LOCALES.map((locale) => [locale, LABELS[locale][r]![c]!]),
    ) as Record<Locale, string>,
    slug: slugify(label),
  })),
);

const BY_ID = new Map(BOARD.map((cat) => [cat.id, cat]));

export function categoryById(id: number): Category | undefined {
  return BY_ID.get(id);
}

/** Etykieta w języku gościa. Panel i Dysk zawsze biorą `label`, czyli polską. */
export function categoryLabel(category: Category, locale: Locale): string {
  return category.labels[locale];
}
