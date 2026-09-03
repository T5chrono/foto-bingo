import type { Strings } from "./pl.js";

/**
 * `1 Foto` / `2 Fotos` — niemiecki ma dwie formy, tak jak angielski.
 *
 * Argumentem jest **cała fraza**, nie sam rzeczownik: niemiecki czasownik idzie
 * za liczbą („1 Foto wartet", ale „2 Fotos warten"), więc doklejanie reszty
 * zdania z zewnątrz psułoby liczbę mnogą.
 */
const n = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/**
 * Niemieckie teksty aplikacji.
 *
 * Na „du", nie na „Sie". To wesele, nie bank — a gość, który dostaje „Ihre
 * Fotos" przy ognisku, czyta pismo urzędowe. Angielski słownik trzyma ten sam
 * ton i z tego samego powodu.
 *
 * „Para Młoda" to wszędzie „Karolina & Tomek", tak jak po angielsku:
 * „das Brautpaar" brzmi jak podpis pod zdjęciem, a nie jak dwoje ludzi, do
 * których się podchodzi. Wyjątkiem jest kafelek planszy, gdzie „Brautpaar"
 * jest właśnie tym, o co chodzi — parą na zdjęciu.
 */
export const de: Strings = {
  htmlLang: "de",
  languageName: "Deutsch",

  app: {
    title: "Foto Bingo",
    para: "Karolina & Tomek · 2.–4. Oktober 2026",
    loading: "Einen Moment…",
    language: "Sprache",
  },

  board: {
    settings: "Einstellungen",
    cantLoad:
      "Die Karte lässt sich gerade nicht laden. Deine Fotos liegen sicher auf dem " +
      "Handy und senden sich von selbst.",
    grid: "Foto-Bingo-Karte, 5 mal 5",
    tileDone: "geschafft",
    tileQueued: "in der Warteschlange",
    tileFailed: "Senden fehlgeschlagen",
    sending: "senden…",
    failedTap: "fehlgeschlagen — tippen",
    tileVideo: "Video",
  },

  bingo: {
    fullCard: "Volle Karte!",
    line: "Bingo!",
    allTiles: "Alle 25 Felder.",
    manyLines: (count: number) => `Du hast ${count} Reihen — du meldest die erste.`,
    submit: "Bingo melden!",
    submitting: "Melde…",
    submitFailed: "Die Meldung ging nicht raus",
    accepted: "Anerkannt ✓",
    rejected: "Nicht anerkannt — frag Karolina & Tomek, welches Foto nicht gepasst hat.",
    pending: "Gemeldet — Karolina & Tomek schauen gleich drauf.",
    row: (count: number) => `Reihe ${count}`,
    col: (count: number) => `Spalte ${count}`,
    diagDown: "Diagonale ↘",
    diagUp: "Diagonale ↙",
    full: "volle Karte",
  },

  prizes: {
    title: "Preise",
    short:
      "Für jede Reihe, jede Spalte und jede Diagonale gibt es einen Preis — für den, " +
      "der sie zuerst meldet. Und am Ende wartet noch der Hauptpreis.",
    lines:
      "Jede Reihe, Spalte und Diagonale ist ein eigener Preis — für den, der die " +
      "Linie zuerst meldet.",
    main:
      "Der Hauptpreis: die ganze Karte, sonst die vollste.",
    hide: "Hinweis zu den Preisen ausblenden",
  },

  install: {
    prompt:
      "Leg Foto Bingo auf den Startbildschirm — dann ist es das ganze Wochenende " +
      "einen Fingertipp entfernt.",
    action: "Installieren",
    iosShare: "Teilen",
    iosAdd: "Zum Home-Bildschirm",
    iosBefore: "Foto Bingo auf dem Startbildschirm? Tippe auf",
    iosBetween: "unten am Bildschirm, dann",
    hide: "Installationshinweis ausblenden",
  },

  category: {
    missing: "Diese Kategorie gibt es nicht.",
    backToBoard: "Zurück zur Karte",
    board: "← Karte",
    chosenPhoto: "Ausgewähltes Foto",
    yourPhoto: "Dein Foto auf diesem Feld",
    chosenVideo: "Ausgewähltes Video",
    yourVideo: "Dein Video auf diesem Feld",
    pick: "Foto oder Video auswählen",
    replace: "Austauschen",
    remove: "Löschen",
    removeAsk: "Von diesem Feld löschen?",
    removeNote:
      "Es verschwindet von der Karte und aus dem Google-Drive-Ordner von Karolina & Tomek.",
    removeYes: "Löschen",
    removeNo: "Behalten",
    removing: "Lösche…",
    removeFailed: "Löschen hat nicht geklappt",
    offline:
      "Du kannst ein Foto auch ohne Empfang senden — es wartet auf dem Handy und geht " +
      "von allein raus.",
    saved: "Gespeichert ✓",
    failed: "Hat nicht geklappt",
    sendFailed: "Senden hat nicht geklappt",
    unknownError: "Da ist etwas schiefgelaufen",
    waitingWifi: "Das Video wartet auf WLAN",
    waitingWifiHint:
      "Das Standbild ist schon auf der Karte und zählt fürs Bingo. Das Video selbst geht los, " +
      "sobald das Handy im WLAN ist — oder tipp unten, um es jetzt über mobile Daten zu senden.",
    waitingWifiCost:
      "Ein Video dauert viel länger als ein Foto — bei einer großen Datei auch mal " +
      "Dutzende Minuten. Die Warteschlange ist so lange nur damit beschäftigt: Fotos, die " +
      "du zwischendurch aussuchst, bleiben auf dem Handy und kommen erst auf die Karte, " +
      "wenn das Video durch ist.",
    sendNow: (size: string) => `Jetzt senden (${size})`,
    phase: {
      processing: "verarbeiten",
      queued: "in der Warteschlange",
      uploading: "senden",
      originalOnTheWay: "Original unterwegs",
      waitingWifi: "wartet auf WLAN",
    },
  },

  noToken: {
    scan: "Scanne den QR-Code auf deinem Tischkärtchen — daran erkennt die App, wer du bist.",
    lost: "Wenn das Kärtchen abhandengekommen ist, frag Karolina & Tomek nach einem neuen Code.",
  },

  settings: {
    title: "Einstellungen",
    wifiOnly: "Originale nur über WLAN",
    wifiOnlyHint:
      "Die Karte füllt sich genauso schnell — nur die volle Qualität wartet, " +
      "rund 4 MB pro Foto.",
    queue: "Warteschlange",
    queueEmpty: "Alles gesendet.",
    queueWaiting: (count: number) =>
      n(count, "Foto wartet aufs Senden", "Fotos warten aufs Senden"),
    queueOriginals: (count: number) =>
      n(count, "Original ist auf dem Weg zu Drive", "Originale sind auf dem Weg zu Drive"),
    queueHint: "Die Warteschlange läuft weiter, sobald der Empfang zurück ist.",
    videosHint:
      "Videos warten auf WLAN und belegen die Warteschlange lange — Fotos aus der Zeit " +
      "warten mit. Auf dem iPhone startet sie erst „Jetzt senden“.",
    queueVideos: (count: number) => `${n(count, "Video wartet", "Videos warten")} auf WLAN`,
    sendVideosNow: "Videos jetzt senden",
    sendingNow: (was: string) => `Wird gesendet: ${was}`,
    yourPhotos: "Deine Fotos",
  },

  privacy: {
    title: "Bevor es losgeht",
    paragraphs: [
      "Die Fotos, die du hier sendest, landen auf dem privaten Google Drive von " +
        "Karolina & Tomek — in einem Ordner mit deinem Namen. Sehen können sie nur die beiden.",

      "Kein anderer Gast sieht deine Fotos in dieser App, und du siehst seine nicht. " +
        "Alle haben ihre eigene Karte.",

      "Die App sammelt nichts außer Fotos: keine Konten, keine Passwörter, keine " +
        "E-Mail-Adressen, kein Tracking. Der Code auf deinem Tischkärtchen sagt nur, " +
        "in wessen Ordner ein Foto gehört.",

      "Zuerst geht eine verkleinerte Version raus, damit das Foto sofort auf der Karte " +
        "steht; das Original folgt im Hintergrund. Ohne Empfang wartet alles auf dem " +
        "Handy und sendet sich später von selbst.",
    ],
    short: "Die Fotos gehen auf das private Drive von Karolina & Tomek. Sonst sieht sie niemand.",
    removal:
      "Ein Foto verschwindet von der Karte und aus dem Drive-Ordner, wenn du es auf " +
      "seinem Feld löschst.",
    accept: "Alles klar, los geht's",
  },

  errors: {
    network: "Keine Verbindung. Das Foto wartet auf dem Handy und sendet sich von selbst.",
    server: "Der Server antwortet nicht. Wir versuchen es gleich noch einmal.",
    imageRead: "Dieses Foto lässt sich nicht lesen. Wähl es bitte noch einmal aus.",
    imageEncode: "Dieses Foto lässt sich nicht zum Senden vorbereiten.",
    unsupportedFile: "Auf ein Feld kommen Fotos und Videos — diese Datei ist etwas anderes.",
    videoRead: "Dieses Video lässt sich nicht lesen. Wähl es bitte noch einmal aus.",
    uploadStalled: "Das Senden des Originals steht still — wir versuchen es später.",
    lineIncomplete:
      "Diese Reihe ist noch nicht vollständig. Lade die Karte neu und versuch es noch einmal.",
  },

  panel: {
    title: "Panel von Karolina & Tomek",
    pin: "PIN",
    pinLabel: "Panel-PIN",
    checking: "Prüfe…",
    enter: "Weiter",
    loginFailed: "Hat nicht geklappt",
    logout: "Abmelden",
    claims: "Meldungen",
    newClaims: (count: number) => `${count} neu`,
    noClaims: "Noch hat niemand ein Bingo gemeldet.",
    byCategory: "Fotos nach Kategorie",
    toReview: "zu prüfen",
    accepted: "anerkannt ✓",
    rejected: "abgelehnt",
    stats: "Sammlung",
    photosFrom: (photos: number, guests: number) =>
      `${n(photos, "Foto", "Fotos")} von ${n(guests, "Gast", "Gästen")}`,
    space: (used: string, limit: string) => `Speicher: ${used} / ${limit}`,
    pendingOriginals: "Originale unterwegs",
    pendingCount: (count: number) => n(count, "Original", "Originale"),
    pendingHint: "Bitte diese Leute, die App zu öffnen — die Fotos kommen dann von selbst.",
    pendingVideos: (count: number) => `davon ${n(count, "Video", "Videos")}`,
    pendingVideosHint:
      "Videos gehen nur über WLAN — und auf iPhones erst nach „Jetzt senden“ auf dem Feld.",
    lineWinners: "Geschaffte Linien",
    lineWinnersHint:
      "Wer zuerst alle fünf Fotos einer Linie beisammen hatte. Die Uhrzeit ist der " +
      "Moment, in dem das letzte fehlende Foto ankam.",
    lineNobody: "noch niemand",
    moreFinishers: (count: number) => `noch ${count}`,
    mainPrize: "Hauptpreis",
    mainPrizeHint:
      "Wer gerade die meisten Felder hat. Bei Gleichstand steht oben, wer zuerst dort war.",
    noPhotosYet: "Noch keine Fotos.",

    noCategory: "Diese Kategorie gibt es nicht.",
    backToPanel: "← Panel",
    categoryEmpty: "In dieser Kategorie hat noch niemand ein Foto geschickt.",
    photoCount: (count: number) => n(count, "Foto", "Fotos"),
    originalPending: "Das Original ist noch nicht da",
    video: "Video",
    noClaim: "Diese Meldung gibt es nicht.",
    missingTiles: (missing: number, total: number) =>
      `${missing} von ${total} Fotos dieser Reihe fehlen.`,
    noPhoto: "kein Foto",
    projector: "Auf den Beamer",
    accept: "Anerkennen",
    reject: "Ablehnen",
    acceptedFinal: "Anerkannt ✓",
    rejectedFinal: "Abgelehnt",
    nextPhoto: "Nächstes Foto",
    close: "Schließen",
  },
};
