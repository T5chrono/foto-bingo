import {
  FILMY,
  FILMY_CZEKAJA,
  GOSCIE,
  LINIE,
  NOWE_ZGLOSZENIA,
  ORYGINALY,
  ZDJECIA,
  ZDJECIA_CZEKAJA,
  count,
} from "../plural.js";

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
    /** Do aria-label kafelka — na ekranie mówi o tym znaczek. */
    tileVideo: "film",
  },

  bingo: {
    fullCard: "Pełna karta!",
    line: "Bingo!",
    allTiles: "Wszystkie 25 pól.",
    manyLines: (n: number) => `Masz ${count(n, LINIE)} — zgłaszasz tę pierwszą.`,
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

  /**
   * Za co są nagrody.
   *
   * Zasada gry, nie ozdobnik: gość ma wiedzieć, po co biega z telefonem, zanim
   * zdobędzie pierwszą linię. Dlatego ten sam tekst stoi w dwóch miejscach —
   * na pasku pod planszą przy pierwszym wejściu i na stałe w ustawieniach,
   * dla kogoś, kto dopyta w sobotę wieczorem.
   */
  prizes: {
    title: "Nagrody",
    /** Krótka wersja na pasek pod planszą — musi zmieścić się w dwóch linijkach. */
    short:
      "Za każdy wiersz, każdą kolumnę i każdą przekątną jest nagroda — dla tego, " +
      "kto zgłosi ją pierwszy. Na koniec czeka jeszcze nagroda główna.",
    lines:
      "Każdy wiersz, kolumna i przekątna to osobna nagroda — dla tego, kto zgłosi " +
      "daną linię jako pierwszy.",
    main:
      "Nagroda główna: cała plansza, a jeśli nikt jej nie skompletuje — " +
      "największa liczba pól.",
    hide: "Ukryj informację o nagrodach",
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
    yourPhoto: "Twoje zdjęcie na tym polu",
    chosenVideo: "Wybrany film",
    yourVideo: "Twój film na tym polu",
    pick: "Wybierz zdjęcie lub film",
    /** Bez „zdjęcie" w guziku — pod spodem może stać film, a guzik jest jeden. */
    replace: "Zamień",
    remove: "Usuń",
    /** Pytanie przed skasowaniem — jedno zdanie, bo pada w środku zabawy. */
    removeAsk: "Usunąć z tego pola?",
    removeNote: "Zniknie z planszy i z folderu na Dysku Pary Młodej.",
    removeYes: "Usuń",
    removeNo: "Zostaw",
    removing: "Usuwam…",
    removeFailed: "Nie udało się usunąć",
    offline: "Zdjęcie możesz wysłać bez zasięgu — poczeka w telefonie i doleci samo.",
    saved: "Zapisane ✓",
    failed: "Nie wyszło",
    sendFailed: "Nie udało się wysłać",
    unknownError: "Coś poszło nie tak",
    /**
     * Film czeka na Wi-Fi. To nie jest komunikat o błędzie, tylko o decyzji:
     * klatka już liczy się do bingo, a 350 MB nie pójdzie po komórce bez
     * wyraźnej zgody. Na iPhonie to jedyna droga, bo Safari nie mówi
     * aplikacji, jaka to sieć.
     */
    waitingWifi: "Film czeka na Wi-Fi",
    waitingWifiHint:
      "Klatka jest już na planszy i liczy się do bingo. Sam film wyślę, gdy telefon " +
      "złapie Wi-Fi — albo dotknij niżej, żeby wysłać go teraz przez dane komórkowe.",
    /**
     * Ostrzeżenie o koszcie, nie o błędzie. Wysyłka idzie po jednym zadaniu
     * naraz (`drain` w `uploader.ts`), więc film trzyma kolejkę na wyłączność
     * przez cały czas swojej wysyłki — i zdjęcie wybrane w międzyczasie zostaje
     * na kafelku jako „w kolejce", zamiast się pokazać. Gość ma to wiedzieć
     * ZANIM dotknie, bo potem nie ma jak przerwać.
     */
    waitingWifiCost:
      "Film jedzie dużo dłużej niż zdjęcie — przy dużym pliku nawet kilkadziesiąt minut. " +
      "Kolejka jest wtedy zajęta tylko nim: zdjęcia wybrane w międzyczasie zostaną " +
      "w telefonie i wskoczą na planszę dopiero, gdy film dojdzie do końca.",
    sendNow: (size: string) => `Wyślij teraz (${size})`,
    /** Etapy wysyłki — pokazywane z wielokropkiem, więc bez kropki na końcu. */
    phase: {
      processing: "przetwarzanie",
      queued: "w kolejce",
      uploading: "wysyłanie",
      originalOnTheWay: "oryginał w drodze",
      waitingWifi: "czeka na Wi-Fi",
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
      "Plansza zapełnia się tak samo szybko — w tle czeka tylko pełna jakość, " +
      "około 4 MB na zdjęcie.",
    queue: "Kolejka",
    queueEmpty: "Wszystko wysłane.",
    queueWaiting: (n: number) => `${count(n, ZDJECIA_CZEKAJA)} na wysłanie`,
    queueOriginals: (n: number) => `${count(n, ORYGINALY)} w drodze na Dysk`,
    queueHint: "Kolejka rusza sama, gdy wróci zasięg.",
    /** Krótko, bo ekran ustawień ma się mieścić bez przewijania. Pełna wersja
     *  stoi tam, gdzie zapada decyzja — na karcie filmu w `CategoryPage`. */
    videosHint:
      "Filmy czekają na Wi-Fi i długo zajmują kolejkę — zdjęcia z tego czasu też " +
      "poczekają. Na iPhonie rusza je dopiero „Wyślij teraz”.",
    queueVideos: (n: number) => `${count(n, FILMY_CZEKAJA)} na Wi-Fi`,
    sendVideosNow: "Wyślij filmy teraz",
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
    removal:
      "Zdjęcie zniknie z planszy i z Dysku Pary Młodej, gdy usuniesz je na jego kafelku.",
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
    unsupportedFile: "Na kafelek wchodzą zdjęcia i filmy — ten plik jest czymś innym.",
    videoRead: "Nie udało się odczytać tego filmu. Spróbuj wybrać go jeszcze raz.",
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
    pendingVideos: (n: number) => `w tym ${count(n, FILMY)}`,
    /** Film nie dojdzie sam przez komórkę — trzeba Wi-Fi albo palca gościa. */
    pendingVideosHint:
      "Filmy ruszają dopiero na Wi-Fi — a na iPhonie po dotknięciu „Wyślij teraz” na kafelku.",
    /**
     * Arkusz sędziowski. Liczy się ze zdjęć, nie ze zgłoszeń — zgłoszenie mówi
     * tylko, kto zdążył kliknąć.
     */
    lineWinners: "Zdobyte linie",
    lineWinnersHint:
      "Kto pierwszy skompletował wszystkie pięć zdjęć danej linii. Godzina to moment, " +
      "w którym doszło ostatnie brakujące zdjęcie.",
    lineNobody: "jeszcze nikt",
    moreFinishers: (n: number) => `jeszcze ${count(n, GOSCIE)}`,
    mainPrize: "Nagroda główna",
    mainPrizeHint:
      "Kto ma teraz najwięcej pól. Przy remisie wyżej stoi ten, kto doszedł do tej " +
      "liczby wcześniej.",
    noPhotosYet: "Jeszcze nikt nie wysłał zdjęcia.",

    noCategory: "Nie ma takiej kategorii.",
    backToPanel: "← Panel",
    categoryEmpty: "Jeszcze nikt nie wysłał zdjęcia w tej kategorii.",
    photoCount: (n: number) => count(n, ZDJECIA),
    originalPending: "Oryginał jeszcze nie doszedł",
    video: "film",
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
