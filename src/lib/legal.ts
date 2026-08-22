/**
 * Informacja dla gości o tym, co dzieje się z ich zdjęciami.
 *
 * Jeden plik jako źródło prawdy, tak jak w SplitDecu. **Każda zmiana w tym,
 * gdzie zdjęcia lądują, kto je widzi albo jak długo leżą, jest zmianą w tym
 * pliku** — a nie tylko w kodzie, który to robi.
 *
 * Świadomie krótko. Ściana prawniczego tekstu przy ognisku zostanie
 * przeklikana bez czytania, a wtedy nie informuje nikogo o niczym.
 */

export const LEGAL_UPDATED = "2026-08-21";

export const PRIVACY = {
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
    "Chcesz, żeby jakieś zdjęcie zniknęło? Powiedz Parze Młodej — usuną je z Dysku.",

  accept: "Rozumiem, gramy",
} as const;
