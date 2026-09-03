import type { Strings } from "./pl.js";

/**
 * Serbski ma trzy formy liczebnika, tak jak polski, ale **po innej regule**:
 * 21 idzie z formą pojedynczą („21 fotografija"), a nie mnogą jak w polskim
 * („21 zdjęć"). Dlatego nie da się tu użyć `plural.ts` — to osobna gramatyka,
 * a nie ten sam wzór z innymi słowami.
 *
 * Wyjątek na 11–14 jest sednem: 21 kończy się jedynką i bierze formę
 * pojedynczą, ale 11 już nie.
 */
function form(n: number): 0 | 1 | 2 {
  const abs = Math.abs(Math.trunc(n));
  const last = abs % 10;
  const lastTwo = abs % 100;

  if (last === 1 && lastTwo !== 11) return 0;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return 1;
  return 2;
}

/**
 * Formy podaje się jako **całe frazy**, nie same rzeczowniki: serbski czasownik
 * też się odmienia („1 fotografija čeka", ale „2 fotografije čekaju"), więc
 * sklejenie liczby z rzeczownikiem i doklejenie reszty zdania z zewnątrz
 * dawałoby błąd przy dwóch, trzech i czterech.
 */
const count = (n: number, one: string, few: string, many: string) =>
  `${n} ${[one, few, many][form(n)]}`;

/**
 * Serbskie teksty aplikacji.
 *
 * **Latinica, nie cyrylica.** Oba pisma są w Serbii urzędowe, ale to latinicą
 * pisze się na telefonie — i tylko ona jest w podzbiorach Lory, które wchodzą
 * do precache'u service workera (`globIgnores` w `vite.config.ts` wyklucza
 * `lora-cyrillic*` wprost). Cyrylica oznaczałaby albo dociąganie kolejnego
 * pliku czcionki przy jednej kresce zasięgu, albo napisy czcionką systemową.
 *
 * Ton jak w pozostałych słownikach: na „ty", bez oficjalności. „Para Młoda" to
 * wszędzie „Karolina i Tomek", z tego samego powodu co po angielsku.
 */
export const sr: Strings = {
  /**
   * `sr-Latn`, nie samo `sr`: domyślnym pismem dla `sr` jest cyrylica, więc
   * czytnik ekranu dostałby latinicę pod kodem zapowiadającym coś innego.
   */
  htmlLang: "sr-Latn",
  languageName: "Srpski",

  app: {
    title: "Foto Bingo",
    para: "Karolina i Tomek · 2–4. oktobar 2026",
    loading: "Samo trenutak…",
    language: "Jezik",
  },

  board: {
    settings: "Podešavanja",
    cantLoad: "Ne mogu da učitam tablu. Fotografije su bezbedne u telefonu i poslaće se same.",
    grid: "Foto Bingo tabla, 5 puta 5",
    tileDone: "osvojeno",
    tileQueued: "u redu čekanja",
    tileFailed: "greška pri slanju",
    sending: "šalje se…",
    failedTap: "greška — dodirni",
    tileVideo: "snimak",
  },

  bingo: {
    fullCard: "Puna karta!",
    line: "Bingo!",
    allTiles: "Svih 25 polja.",
    manyLines: (n: number) =>
      `Imaš ${count(n, "liniju", "linije", "linija")} — prijavljuješ prvu.`,
    submit: "Prijavi bingo!",
    submitting: "Prijavljujem…",
    submitFailed: "Prijava nije poslata",
    accepted: "Priznato ✓",
    rejected: "Nije priznato — pitaj Karolinu i Tomeka koja fotografija nije odgovarala.",
    pending: "Prijavljeno — Karolina i Tomek će uskoro pogledati.",
    row: (n: number) => `red ${n}`,
    col: (n: number) => `kolona ${n}`,
    diagDown: "dijagonala ↘",
    diagUp: "dijagonala ↙",
    full: "puna karta",
  },

  prizes: {
    title: "Nagrade",
    short:
      "Za svaki red, svaku kolonu i svaku dijagonalu ide nagrada — onome ko je prvi " +
      "prijavi. A na kraju čeka i glavna nagrada.",
    lines:
      "Svaki red, svaka kolona i svaka dijagonala je posebna nagrada. Dobija je onaj " +
      "ko tu liniju prvi prijavi.",
    main:
      "Glavna nagrada čeka onoga ko sakupi sve fotografije sa table — a ako niko ne " +
      "popuni celu, onoga ko ima najpuniju tablu.",
    hide: "Sakrij obaveštenje o nagradama",
  },

  install: {
    prompt: "Dodaj Foto Bingo na početni ekran — biće ti pri ruci celog vikenda.",
    action: "Instaliraj",
    iosShare: "Podeli",
    iosAdd: "Dodaj na početni ekran",
    iosBefore: "Želiš Foto Bingo na početnom ekranu? Dodirni",
    iosBetween: "na dnu ekrana, pa",
    hide: "Sakrij savet o instalaciji",
  },

  category: {
    missing: "Nema takve kategorije.",
    backToBoard: "Nazad na tablu",
    board: "← Tabla",
    chosenPhoto: "Izabrana fotografija",
    yourPhoto: "Tvoja fotografija na ovom polju",
    chosenVideo: "Izabrani snimak",
    yourVideo: "Tvoj snimak na ovom polju",
    pick: "Izaberi fotografiju ili snimak",
    replace: "Zameni",
    remove: "Obriši",
    removeAsk: "Obrisati sa ovog polja?",
    removeNote: "Nestaje sa table i iz foldera na Google Disku Karoline i Tomeka.",
    removeYes: "Obriši",
    removeNo: "Ostavi",
    removing: "Brišem…",
    removeFailed: "Brisanje nije uspelo",
    offline: "Fotografiju možeš da pošalješ i bez signala — sačekaće u telefonu i otići sama.",
    saved: "Sačuvano ✓",
    failed: "Nije uspelo",
    sendFailed: "Slanje nije uspelo",
    unknownError: "Nešto je pošlo naopako",
    waitingWifi: "Snimak čeka Wi-Fi",
    waitingWifiHint:
      "Kadar je već na tabli i računa se za bingo. Sam snimak ću poslati čim telefon uhvati " +
      "Wi-Fi — ili dodirni ispod da ga pošalješ odmah preko mobilnih podataka.",
    sendNow: (size: string) => `Pošalji odmah (${size})`,
    phase: {
      processing: "obrada",
      queued: "u redu čekanja",
      uploading: "slanje",
      originalOnTheWay: "original je na putu",
      waitingWifi: "čeka Wi-Fi",
    },
  },

  noToken: {
    scan: "Skeniraj QR kod sa svoje kartice sa imenom — po njemu aplikacija zna ko si.",
    lost: "Ako je kartica negde zalutala, traži novi kod od Karoline i Tomeka.",
  },

  settings: {
    title: "Podešavanja",
    wifiOnly: "Originali samo preko Wi-Fi-ja",
    wifiOnlyHint:
      "Fotografije se pojavljuju na tabli isto tako brzo — u pozadini čeka samo " +
      "verzija u punom kvalitetu. Oko 4 MB po fotografiji.",
    queue: "Red čekanja",
    queueEmpty: "Sve je poslato.",
    queueWaiting: (n: number) =>
      count(
        n,
        "fotografija čeka na slanje",
        "fotografije čekaju na slanje",
        "fotografija čeka na slanje",
      ),
    queueOriginals: (n: number) =>
      count(
        n,
        "original je na putu ka Disku",
        "originala su na putu ka Disku",
        "originala je na putu ka Disku",
      ),
    queueHint: "Red kreće sam čim se signal vrati. Ne treba ništa da diraš.",
    videosHint:
      "Snimci uvek čekaju Wi-Fi. iPhone ne govori aplikaciji na kojoj je mreži, pa tamo " +
      "snimak kreće tek kad dodirneš „Pošalji odmah” — na njegovom polju ili ovde.",
    queueVideos: (n: number) => `${count(n, "snimak čeka", "snimka čekaju", "snimaka čeka")} Wi-Fi`,
    sendVideosNow: "Pošalji snimke odmah",
    yourPhotos: "Tvoje fotografije",
  },

  privacy: {
    title: "Pre nego što počneš",
    paragraphs: [
      "Fotografije koje ovde pošalješ idu na privatni Google Disk Karoline i Tomeka — " +
        "u folder sa tvojim imenom. Vide ih samo njih dvoje.",

      "Nijedan drugi gost neće videti tvoje fotografije u ovoj aplikaciji, a ni ti " +
        "njegove. Svako ima svoju tablu.",

      "Aplikacija ne prikuplja ništa osim fotografija: nema naloga, lozinki, imejl " +
        "adresa ni praćenja. Kod sa tvoje kartice služi samo da se zna u čiji folder " +
        "fotografija ide.",

      "Prvo ide smanjena verzija, da se fotografija odmah pojavi na tabli, a original " +
        "stiže u pozadini. Ako nemaš signala, sve sačeka u telefonu i pošalje se samo.",
    ],
    short: "Fotografije idu na privatni Disk Karoline i Tomeka. Niko drugi ih neće videti.",
    removal:
      "Želiš da neka fotografija nestane? Obriši je na njenom polju — silazi sa table " +
      "i sa Diska Karoline i Tomeka.",
    accept: "Jasno, igramo",
  },

  errors: {
    network: "Nema veze. Fotografija sačeka u telefonu i poslaće se sama.",
    server: "Server ne odgovara. Pokušaćemo ponovo za koji trenutak.",
    imageRead: "Ne mogu da pročitam ovu fotografiju. Probaj da je izabereš ponovo.",
    imageEncode: "Ne mogu da pripremim ovu fotografiju za slanje.",
    unsupportedFile: "Na polje idu fotografije i snimci — ovaj fajl je nešto drugo.",
    videoRead: "Ne mogu da pročitam ovaj snimak. Probaj da ga izabereš ponovo.",
    uploadStalled: "Slanje originala je stalo — pokušaćemo kasnije.",
    lineIncomplete: "Ova linija još nije kompletna. Osveži tablu i pokušaj ponovo.",
  },

  panel: {
    title: "Panel Karoline i Tomeka",
    pin: "PIN",
    pinLabel: "PIN za panel",
    checking: "Proveravam…",
    enter: "Uđi",
    loginFailed: "Nije uspelo",
    logout: "Izađi",
    claims: "Prijave",
    newClaims: (n: number) => count(n, "nova", "nove", "novih"),
    noClaims: "Još niko nije prijavio bingo.",
    byCategory: "Fotografije po kategorijama",
    toReview: "za proveru",
    accepted: "priznato ✓",
    rejected: "odbijeno",
    stats: "Stanje zbirke",
    /** „od" wymaga dopełniacza, więc także liczba pojedyncza stoi w nim: „od 1 gosta". */
    photosFrom: (photos: number, guests: number) =>
      `${count(photos, "fotografija", "fotografije", "fotografija")} od ` +
      `${count(guests, "gosta", "gosta", "gostiju")}`,
    space: (used: string, limit: string) => `Prostor: ${used} / ${limit}`,
    pendingOriginals: "Originali na putu",
    pendingCount: (n: number) => count(n, "original", "originala", "originala"),
    pendingHint: "Zamoli ove ljude da otvore aplikaciju — fotografije će stići same.",
    pendingVideos: (n: number) => `od toga ${count(n, "snimak", "snimka", "snimaka")}`,
    pendingVideosHint:
      "Snimci kreću samo preko Wi-Fi-ja — a na iPhone-u tek posle „Pošalji odmah” na polju.",
    lineWinners: "Osvojene linije",
    lineWinnersHint:
      "Ko je prvi sakupio svih pet fotografija jedne linije. Vreme je trenutak kada je " +
      "stigla poslednja fotografija koja je nedostajala.",
    lineNobody: "još niko",
    moreFinishers: (n: number) => `još ${n}`,
    mainPrize: "Glavna nagrada",
    mainPrizeHint:
      "Ko trenutno ima najviše polja. Pri izjednačenju gore stoji onaj ko je prvi " +
      "stigao dotle.",
    noPhotosYet: "Još niko nije poslao fotografiju.",

    noCategory: "Nema takve kategorije.",
    backToPanel: "← Panel",
    categoryEmpty: "Još niko nije poslao fotografiju u ovoj kategoriji.",
    photoCount: (n: number) => count(n, "fotografija", "fotografije", "fotografija"),
    originalPending: "Original još nije stigao",
    video: "snimak",
    noClaim: "Nema takve prijave.",
    missingTiles: (missing: number, total: number) =>
      `Nedostaje ${missing} od ${total} fotografija ove linije.`,
    noPhoto: "nema fotografije",
    projector: "Na projektor",
    accept: "Priznaj",
    reject: "Odbij",
    acceptedFinal: "Priznato ✓",
    rejectedFinal: "Odbijeno",
    nextPhoto: "Sledeća fotografija",
    close: "Zatvori",
  },
};
