import { GOSCIE, NOWE_ZGLOSZENIA, ORYGINALY, ZDJECIA, count } from "../plural.js";

/**
 * Polskie teksty aplikacji — **źródło prawdy**.
 *
 * Angielski (`en.ts`) jest typowany jako `Strings`, czyli `typeof pl`. Dzięki
 * temu brak tłumaczenia jest błędem kompilacji, a nie polskim zdaniem, które
 * wychodzi na angielskim ekranie dopiero przy gościu z zagranicy. Nowy tekst
 * dopisuje się tutaj i `tsc` od razu mówi, czego brakuje po drugiej stronie.
 *
 * Liczebniki **nie są tu uogólnione**. Polski ma trzy formy, angielski dwie,
 * a jedna wspólna abstrakcja na to obsługiwałaby oba języki gorzej niż każdy
 * z nich osobno. Każdy słownik rządzi się własną gramatyką: tu wchodzi
 * `count()` z `plural.ts`, tam zwykłe `n === 1`.
 */
export const pl = {
  /** Kod BCP 47 — trafia do `<html lang>`, więc czyta go czytnik ekranu. */
  htmlLang: "pl",
  /** Nazwa języka na przełączniku — zawsze we własnym języku. */
  languageName: "Polski",

  app: {
    title: "Foto Bingo",
    /** Podpis spod logotypu — ten sam, co na papierowej karcie. */
    para: "Karolina i Tomek · 2–4 października 2026",
    loading: "Chwileczkę…",
    language: "Język",
  },

  board: {
    settings: "Ustawienia",
    /** Plansza działa offline, więc to nie jest awaria — tylko brak świeżych danych. */
    cantLoad: "Nie mogę pobrać planszy. Zdjęcia i tak czekają w telefonie i wyślą się same.",
    grid: "Plansza Foto Bingo, 5 na 5",
    tileDone: "zdobyte",
    tileQueued: "w kolejce",
    tileFailed: "błąd wysyłki",
    sending: "wysyłanie…",
    failedTap: "błąd — dotknij",
  },

  bingo: {
    fullCard: "Pełna karta!",
    line: "Bingo!",
    allTiles: "Wszystkie 25 pól.",
    manyLines: (n: number) => `Masz ${n} linie — zgłaszasz tę pierwszą.`,
    submit: "Zgłoś bingo!",
    submitting: "Zgłaszam…",
    submitFailed: "Nie udało się zgłosić",
    accepted: "Uznane ✓",
    rejected: "Nie uznane — dopytaj Parę Młodą, które zdjęcie nie pasowało.",
    pending: "Zgłoszone — Para Młoda zaraz to obejrzy.",
    /** Nazwy linii. Numeracja 1-based, zgodna z R1..R5 / K1..K5 na kafelkach. */
    row: (n: number) => `wiersz ${n}`,
    col: (n: number) => `kolumna ${n}`,
    diagDown: "przekątna ↘",
    diagUp: "przekątna ↙",
    full: "pełna karta",
  },

  install: {
    prompt: "Dodaj Foto Bingo na ekran główny — będzie pod ręką przez cały weekend.",
    action: "Zainstaluj",
    iosShare: "Udostępnij",
    iosAdd: "Dodaj do ekranu początkowego",
    /** iOS nie ma `beforeinstallprompt`, więc zostaje jedno zdanie instrukcji. */
    iosBefore: "Chcesz mieć Foto Bingo na ekranie głównym? Dotknij",
    iosBetween: "na dole ekranu, potem",
    hide: "Ukryj podpowiedź o instalacji",
  },

  category: {
    missing: "Nie ma takiej kategorii.",
    backToBoard: "Wróć na planszę",
    board: "← Plansza",
    chosenPhoto: "Wybrane zdjęcie",
    pick: "Wybierz zdjęcie",
    change: "Zmień zdjęcie",
    offline: "Zdjęcie możesz wysłać bez zasięgu — poczeka w telefonie i doleci samo.",
    saved: "Zapisane ✓",
    failed: "Nie wyszło",
    sendFailed: "Nie udało się wysłać",
    unknownError: "Coś poszło nie tak",
    /** Etapy wysyłki — pokazywane z wielokropkiem, więc bez kropki na końcu. */
    phase: {
      processing: "przetwarzanie",
      queued: "w kolejce",
      uploading: "wysyłanie",
      originalOnTheWay: "oryginał w drodze",
    },
  },

  noToken: {
    scan: "Zeskanuj kod QR ze swojej winietki — to on mówi aplikacji, kim jesteś.",
    lost: "Jeśli winietka gdzieś przepadła, poproś Parę Młodą o nowy kod.",
  },

  settings: {
    title: "Ustawienia",
    wifiOnly: "Oryginały tylko przez Wi-Fi",
    wifiOnlyHint:
      "Zdjęcia pojawią się na planszy tak samo szybko — w tle poczeka tylko wersja " +
      "pełnej jakości. Około 4 MB na zdjęcie.",
    queue: "Kolejka",
    queueEmpty: "Wszystko wysłane.",
    queueWaiting: (n: number) => `${count(n, ZDJECIA)} czeka na wysłanie`,
    queueOriginals: (n: number) => `${count(n, ORYGINALY)} w drodze na Dysk`,
    queueHint: "Kolejka rusza sama, gdy wróci zasięg. Nie trzeba nic klikać.",
    yourPhotos: "Twoje zdjęcia",
  },

  privacy: {
    title: "Zanim zaczniesz",
    paragraphs: [
      "Zdjęcia, które tu wyślesz, trafiają na prywatny Dysk Google Pary Młodej — " +
        "do folderu z Twoim imieniem. Widzi je wyłącznie Para Młoda.",

      "Żaden inny gość nie zobaczy Twoich zdjęć w tej aplikacji, a Ty nie " +
        "zobaczysz jego. Każdy ma własną planszę.",

      "Aplikacja nie zbiera nic poza zdjęciami: nie ma kont, haseł, adresów " +
        "e-mail ani śledzenia. Kod z Twojej winietki służy tylko do tego, żeby " +
        "wiedzieć, do czyjego folderu zapisać zdjęcie.",

      "Zdjęcie trafia najpierw w zmniejszonej wersji, żeby od razu pojawiło się " +
        "na planszy, a oryginał dosyła się w tle. Jeśli nie masz zasięgu, wszystko " +
        "poczeka w telefonie i wyśle się samo.",
    ],
    /** Zdanie, które musi dać się przeczytać w dwie sekundy przy ognisku. */
    short: "Zdjęcia trafiają na prywatny Dysk Pary Młodej. Nikt inny ich nie zobaczy.",
    removal: "Chcesz, żeby jakieś zdjęcie zniknęło? Powiedz Parze Młodej — usuną je z Dysku.",
    accept: "Rozumiem, gramy",
  },

  /**
   * Błędy, które gość naprawdę zobaczy. Reszta komunikatów serwera to walidacja,
   * której nie da się wywołać inaczej niż naszą pomyłką — te zostają po polsku.
   */
  errors: {
    network: "Brak połączenia. Zdjęcie poczeka w telefonie i wyśle się samo.",
    server: "Serwer nie odpowiada. Spróbujemy jeszcze raz za chwilę.",
    imageRead: "Nie udało się odczytać tego zdjęcia. Spróbuj wybrać je jeszcze raz.",
    imageEncode: "Nie udało się przygotować tego zdjęcia do wysyłki.",
    uploadStalled: "Wysyłka oryginału stanęła w miejscu — spróbujemy później.",
    lineIncomplete: "Ta linia nie jest jeszcze kompletna. Odśwież planszę i spróbuj ponownie.",
  },

  panel: {
    title: "Panel Pary Młodej",
    pin: "PIN",
    pinLabel: "PIN do panelu",
    checking: "Sprawdzam…",
    enter: "Wejdź",
    loginFailed: "Nie wyszło",
    logout: "Wyjdź",
    claims: "Zgłoszenia",
    newClaims: (n: number) => count(n, NOWE_ZGLOSZENIA),
    noClaims: "Jeszcze nikt nie zgłosił bingo.",
    byCategory: "Zdjęcia po kategoriach",
    toReview: "do sprawdzenia",
    accepted: "uznane ✓",
    rejected: "odrzucone",
    stats: "Stan zbiórki",
    photosFrom: (photos: number, guests: number) =>
      `${count(photos, ZDJECIA)} od ${count(guests, GOSCIE)}`,
    space: (used: string, limit: string) => `Miejsce: ${used} / ${limit}`,
    pendingOriginals: "Oryginały w drodze",
    pendingCount: (n: number) => count(n, ORYGINALY),
    /** Serwer nie dośle oryginału — leży na telefonie gościa. Zostaje poprosić człowieka. */
    pendingHint: "Poproś te osoby o otwarcie aplikacji — zdjęcia dojdą same.",
    noCategory: "Nie ma takiej kategorii.",
    backToPanel: "← Panel",
    categoryEmpty: "Jeszcze nikt nie wysłał zdjęcia w tej kategorii.",
    photoCount: (n: number) => count(n, ZDJECIA),
    originalPending: "Oryginał jeszcze nie doszedł",
    noClaim: "Nie ma takiego zgłoszenia.",
    missingTiles: (missing: number, total: number) =>
      `Brakuje ${missing} z ${total} zdjęć tej linii.`,
    noPhoto: "brak zdjęcia",
    projector: "Na rzutnik",
    accept: "Uznaj",
    reject: "Odrzuć",
    acceptedFinal: "Uznane ✓",
    rejectedFinal: "Odrzucone",
    nextPhoto: "Następne zdjęcie",
    close: "Zamknij",
  },
};

export type Strings = typeof pl;
