import { useState } from "react";

import { useT } from "../hooks/useLocale";
import { LEGAL_UPDATED } from "../lib/legal";
import { LanguagePicker } from "./LanguagePicker";
import { Bloom } from "./wedding/Bloom";
import { Meadow } from "./wedding/Meadow";
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
    <main className="mx-auto flex min-h-full max-w-md flex-col">
      {/* Kwiatowy łuk z winietki — tej samej karteczki, z której gość przed
          chwilą zeskanował kod. Jedyny ekran, na którym się pojawia. */}
      <Bloom className="-mt-2" />

      <div className="flex flex-1 flex-col justify-center gap-5 px-6 pb-6">
        <div className="flex justify-center">
          <LanguagePicker />
        </div>

        <ScreenTitle>{t.privacy.title}</ScreenTitle>

        <div className="flex flex-col gap-3 text-brand-800/80">
          {t.privacy.paragraphs.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>

        <p className="text-sm text-brand-800/60">{t.privacy.removal}</p>

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
          className="rounded-2xl bg-brand-700 px-5 py-4 text-lg font-medium text-white"
        >
          {t.privacy.accept}
        </button>
      </div>

      <Meadow className="mt-auto" />
    </main>
  );
}
