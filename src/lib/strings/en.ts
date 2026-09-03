import type { Strings } from "./pl.js";

/** `1 photo` / `2 photos` — angielski ma dwie formy, nie trzy jak polski. */
const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * Angielskie teksty aplikacji.
 *
 * Typ `Strings` pochodzi z `pl.ts`, więc brakujący klucz nie skompiluje się.
 * Tłumaczenie jest **swobodne, nie dosłowne**: zaproszenie po angielsku (strony
 * 2, 3, 9 i 10 projektu w Canvie) mówi „Karolina & Tomek" i „joyfully invite",
 * więc aplikacja mówi tym samym tonem, a nie kalką z polskiego.
 *
 * „Para Młoda" nie ma dobrego angielskiego odpowiednika w tej roli — „the Bride
 * and Groom" brzmi jak podpis pod zdjęciem, nie jak osoby, do których się
 * podchodzi. Wszędzie stoi „Karolina & Tomek": krócej i po ludzku.
 */
export const en: Strings = {
  htmlLang: "en",
  languageName: "English",

  app: {
    title: "Foto Bingo",
    para: "Karolina & Tomek · 2–4 October 2026",
    loading: "One moment…",
    language: "Language",
  },

  board: {
    settings: "Settings",
    cantLoad: "Can't reach the board right now. Your photos are safe on your phone and will send themselves.",
    grid: "Foto Bingo board, 5 by 5",
    tileDone: "done",
    tileQueued: "queued",
    tileFailed: "upload failed",
    sending: "sending…",
    failedTap: "failed — tap",
    tileVideo: "video",
  },

  bingo: {
    fullCard: "Full card!",
    line: "Bingo!",
    allTiles: "All 25 squares.",
    manyLines: (count: number) => `You have ${count} lines — you're claiming the first one.`,
    submit: "Claim your bingo!",
    submitting: "Claiming…",
    submitFailed: "Couldn't send the claim",
    accepted: "Approved ✓",
    rejected: "Not approved — ask Karolina & Tomek which photo didn't fit.",
    pending: "Claimed — Karolina & Tomek will take a look in a moment.",
    row: (count: number) => `row ${count}`,
    col: (count: number) => `column ${count}`,
    diagDown: "diagonal ↘",
    diagUp: "diagonal ↙",
    full: "full card",
  },

  prizes: {
    title: "Prizes",
    short:
      "Every row, every column and every diagonal wins a prize — for whoever claims " +
      "it first. And there's a grand prize waiting at the end.",
    lines:
      "Every row, every column and every diagonal is a prize of its own. It goes to " +
      "whoever claims that line first.",
    main:
      "The grand prize is waiting for whoever collects every photo on the board — " +
      "or, if nobody fills it completely, for the fullest board of all.",
    hide: "Hide the note about prizes",
  },

  install: {
    prompt: "Add Foto Bingo to your home screen — it'll be one tap away all weekend.",
    action: "Install",
    iosShare: "Share",
    iosAdd: "Add to Home Screen",
    iosBefore: "Want Foto Bingo on your home screen? Tap",
    iosBetween: "at the bottom of the screen, then",
    hide: "Hide the install tip",
  },

  category: {
    missing: "No such category.",
    backToBoard: "Back to the board",
    board: "← Board",
    chosenPhoto: "Chosen photo",
    yourPhoto: "Your photo on this square",
    chosenVideo: "Chosen video",
    yourVideo: "Your video on this square",
    pick: "Choose a photo or video",
    replace: "Replace",
    remove: "Delete",
    removeAsk: "Delete this from the square?",
    removeNote: "It leaves your board and Karolina & Tomek's Drive folder.",
    removeYes: "Delete",
    removeNo: "Keep it",
    removing: "Deleting…",
    removeFailed: "Couldn't delete it",
    offline: "You can send a photo with no signal — it waits on your phone and flies off by itself.",
    saved: "Saved ✓",
    failed: "Didn't work",
    sendFailed: "Couldn't send it",
    unknownError: "Something went wrong",
    waitingWifi: "The video is waiting for Wi-Fi",
    waitingWifiHint:
      "The still frame is already on your board and counts toward bingo. The video itself " +
      "will go once your phone is on Wi-Fi — or tap below to send it now over mobile data.",
    sendNow: (size: string) => `Send now (${size})`,
    phase: {
      processing: "processing",
      queued: "queued",
      uploading: "sending",
      originalOnTheWay: "full size on the way",
      waitingWifi: "waiting for Wi-Fi",
    },
  },

  noToken: {
    scan: "Scan the QR code on your place card — that's what tells the app who you are.",
    lost: "If your place card has wandered off, ask Karolina & Tomek for a new code.",
  },

  settings: {
    title: "Settings",
    wifiOnly: "Full-size photos on Wi-Fi only",
    wifiOnlyHint:
      "Photos still appear on the board just as fast — only the full-quality version " +
      "waits in the background. Around 4 MB per photo.",
    queue: "Queue",
    queueEmpty: "Everything sent.",
    queueWaiting: (count: number) => `${n(count, "photo", "photos")} waiting to send`,
    queueOriginals: (count: number) => `${n(count, "full-size photo", "full-size photos")} on the way to Drive`,
    queueHint: "The queue starts by itself when the signal comes back. Nothing to tap.",
    videosHint:
      "Videos always wait for Wi-Fi. iPhones don't tell the app which network they're on, " +
      "so there a video only goes after you tap “Send now” — on its square or here.",
    queueVideos: (count: number) => `${n(count, "video", "videos")} waiting for Wi-Fi`,
    sendVideosNow: "Send videos now",
    yourPhotos: "Your photos",
  },

  privacy: {
    title: "Before you start",
    paragraphs: [
      "The photos you send here go to Karolina & Tomek's private Google Drive — " +
        "into a folder with your name on it. Only they can see them.",

      "No other guest sees your photos in this app, and you don't see theirs. " +
        "Everyone has their own board.",

      "The app collects nothing but photos: no accounts, no passwords, no email " +
        "addresses, no tracking. The code on your place card is only there to know " +
        "whose folder a photo belongs in.",

      "A smaller version goes first, so the photo shows up on your board straight " +
        "away, and the full-size one follows in the background. With no signal, " +
        "everything waits on your phone and sends itself later.",
    ],
    short: "Photos go to Karolina & Tomek's private Drive. Nobody else will see them.",
    removal:
      "Want a photo gone? Delete it on its square — it leaves the board and the Drive " +
      "folder alike.",
    accept: "Got it, let's play",
  },

  errors: {
    network: "No connection. The photo waits on your phone and will send itself.",
    server: "The server isn't answering. We'll try again shortly.",
    imageRead: "Couldn't read that photo. Try picking it again.",
    imageEncode: "Couldn't prepare that photo for sending.",
    unsupportedFile: "Tiles take photos and videos — this file is something else.",
    videoRead: "Couldn't read that video. Try picking it again.",
    uploadStalled: "The full-size upload has stalled — we'll try again later.",
    lineIncomplete: "That line isn't complete yet. Refresh the board and try again.",
  },

  panel: {
    title: "Karolina & Tomek's panel",
    pin: "PIN",
    pinLabel: "Panel PIN",
    checking: "Checking…",
    enter: "Enter",
    loginFailed: "Didn't work",
    logout: "Log out",
    claims: "Claims",
    newClaims: (count: number) => `${count} new`,
    noClaims: "Nobody has claimed a bingo yet.",
    byCategory: "Photos by category",
    toReview: "to review",
    accepted: "approved ✓",
    rejected: "rejected",
    stats: "Collection",
    photosFrom: (photos: number, guests: number) =>
      `${n(photos, "photo", "photos")} from ${n(guests, "guest", "guests")}`,
    space: (used: string, limit: string) => `Space: ${used} / ${limit}`,
    pendingOriginals: "Full-size photos on the way",
    pendingCount: (count: number) => n(count, "full-size photo", "full-size photos"),
    pendingHint: "Ask these people to open the app — the photos will arrive by themselves.",
    pendingVideos: (count: number) => `including ${n(count, "video", "videos")}`,
    pendingVideosHint:
      "Videos only go over Wi-Fi — and on iPhones only after tapping “Send now” on the square.",
    lineWinners: "Lines completed",
    lineWinnersHint:
      "Who was first to collect all five photos of a line. The time is the moment the " +
      "last missing photo arrived.",
    lineNobody: "nobody yet",
    moreFinishers: (count: number) => `${count} more`,
    mainPrize: "Grand prize",
    mainPrizeHint:
      "Who has the most squares right now. On a tie, whoever got there first ranks higher.",
    noPhotosYet: "No photos yet.",

    noCategory: "No such category.",
    backToPanel: "← Panel",
    categoryEmpty: "Nobody has sent a photo in this category yet.",
    photoCount: (count: number) => n(count, "photo", "photos"),
    originalPending: "Full-size photo hasn't arrived yet",
    video: "video",
    noClaim: "No such claim.",
    missingTiles: (missing: number, total: number) =>
      `${missing} of ${total} photos in this line are missing.`,
    noPhoto: "no photo",
    projector: "To the projector",
    accept: "Approve",
    reject: "Reject",
    acceptedFinal: "Approved ✓",
    rejectedFinal: "Rejected",
    nextPhoto: "Next photo",
    close: "Close",
  },
};
