import { useState } from "react";

import { useT } from "../hooks/useLocale";

const SEEN_KEY = "fotobingo.prizesSeen";

/**
 * Pasek z zasadami nagród — pierwsza rzecz, jaką gość czyta pod planszą.
 *
 * Stoi w tym samym miejscu, co zachęta do instalacji, i **przed nią**: bez tego
 * paska plansza jest tylko dwudziestoma pięcioma poleceniami do odhaczenia,
 * a nagroda za wiersz wychodzi na jaw dopiero wtedy, gdy ktoś ten wiersz już
 * przypadkiem zdobył. Zachęta techniczna może poczekać jeden gest.
 *
 * Zamyka się na stałe, jak podpowiedź o instalacji: to informacja do przeczytania
 * raz, a każde jej 60 pikseli schodzi kafelkom z wysokości. Pełny tekst zostaje
 * w ustawieniach, dla kogoś, kto w sobotę wieczorem zapyta „a co ja z tego mam".
 */
export function PrizesBanner({ onHide }: { onHide: () => void }) {
  const t = useT();

  return (
    <section className="relative shrink-0 rounded-2xl border border-brand-300 bg-brand-50 py-2 pr-9 pl-4">
      <p className="font-script text-xl leading-tight text-ink">{t.prizes.title}</p>
      <p className="text-xs text-brand-800">{t.prizes.short}</p>
      <button
        type="button"
        onClick={onHide}
        aria-label={t.prizes.hide}
        className="absolute top-1.5 right-2.5 text-lg leading-none text-brand-800/50"
      >
        ×
      </button>
    </section>
  );
}

/**
 * Czy gość widział już pasek nagród.
 *
 * Stan siedzi tutaj, a nie w samym pasku, bo decyduje o **dwóch** komponentach:
 * plansza pokazuje zachętę do instalacji dopiero wtedy, gdy nagrody są odczytane.
 * Gdyby pasek chował się sam i zwracał `null`, plansza nie miałaby skąd wiedzieć,
 * że zwolniło się miejsce.
 */
export function usePrizesSeen(): [boolean, () => void] {
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // Prywatne okno bez localStorage: pasek wraca przy każdym wejściu.
      // Uciążliwe, ale lepsze niż gość, który nie wie, o co gra.
      return false;
    }
  });

  return [
    seen,
    () => {
      setSeen(true);
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* pusto */
      }
    },
  ];
}
