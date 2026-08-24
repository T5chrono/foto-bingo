import { useState } from "react";

import { useT } from "../hooks/useLocale";
import { LEGAL_UPDATED } from "../lib/legal";
import { LanguagePicker } from "./LanguagePicker";
import { Bloom } from "./wedding/Bloom";
import { MeadowBand } from "./wedding/Meadow";
import { ScreenTitle } from "./wedding/Wordmark";

const KEY = "fotobingo.privacyAccepted";

/**
 * Ekran pierwszego uruchomienia. Pokazuje się raz, przed planszą.
 *
 * Zapamiętana jest data wersji, a nie samo „zaakceptowano": gdyby zmieniło się
 * to, gdzie zdjęcia lądują albo kto je widzi, gość musi zobaczyć nową treść,
 * a nie zostać z decyzją podjętą wobec innego tekstu.
 *
 * Przełącznik języka stoi **tutaj, nie tylko w ustawieniach**. To pierwszy ekran
 * po zeskanowaniu kodu i jedyny, na którym treść naprawdę wymaga zrozumienia —
 * a ustawienia leżą dopiero za nim. Gość, któremu wykrywanie języka źle
 * podpowiedziało, nie może zaakceptować zdania, którego nie czyta.
 */
export function PrivacyGate({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [accepted, setAccepted] = useState(() => {
    try {
      return localStorage.getItem(KEY) === LEGAL_UPDATED;
    } catch {
      // Prywatne okno bez localStorage: pokazujemy ekran za kazdym razem.
      // Uciazliwe, ale lepsze niz przemilczenie informacji o zdjeciach.
      return false;
    }
  });

  if (accepted) return <>{children}</>;

  return (
    // Jedyny ekran gościa, na którym treści może zabraknąć miejsca — cztery
    // akapity o zdjęciach nie skrócą się do wysokości telefonu, a skracać ich
    // nie wolno. Przewija się więc **sam tekst**, w swoim polu, a nie strona:
    // przycisk „rozumiem" zostaje na widoku i nikt nie utknie na ekranie,
    // z którego nie widać wyjścia.
    <main className="mx-auto flex h-dvh max-w-md flex-col overflow-hidden pb-[var(--meadow-h)]">
      {/* Kwiatowy łuk z winietki — tej samej karteczki, z której gość przed
          chwilą zeskanował kod. Jedyny ekran, na którym się pojawia. */}
      <Bloom className="-mt-2 shrink-0" />

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-1.5 px-6 pb-1">
        <div className="flex justify-center">
          <LanguagePicker />
        </div>

        <ScreenTitle>{t.privacy.title}</ScreenTitle>

        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto text-sm leading-snug text-brand-800/80">
          {t.privacy.paragraphs.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>

        <p className="text-xs text-brand-800/60">{t.privacy.removal}</p>

        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(KEY, LEGAL_UPDATED);
            } catch {
              /* pusto */
            }
            setAccepted(true);
          }}
          className="shrink-0 rounded-2xl bg-brand-700 px-5 py-3.5 text-lg font-medium text-white"
        >
          {t.privacy.accept}
        </button>
      </div>

      <MeadowBand />
    </main>
  );
}
