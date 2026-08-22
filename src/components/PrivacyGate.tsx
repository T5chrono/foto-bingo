import { useState } from "react";
import { LEGAL_UPDATED, PRIVACY } from "../lib/legal";

const KEY = "fotobingo.privacyAccepted";

/**
 * Ekran pierwszego uruchomienia. Pokazuje się raz, przed planszą.
 *
 * Zapamiętana jest data wersji, a nie samo „zaakceptowano": gdyby zmieniło się
 * to, gdzie zdjęcia lądują albo kto je widzi, gość musi zobaczyć nową treść,
 * a nie zostać z decyzją podjętą wobec innego tekstu.
 */
export function PrivacyGate({ children }: { children: React.ReactNode }) {
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
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-5 px-6 py-10">
      <h1 className="text-2xl font-semibold text-brand-800">{PRIVACY.title}</h1>

      <div className="flex flex-col gap-3 text-ink/75">
        {PRIVACY.paragraphs.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </div>

      <p className="text-sm text-ink/50">{PRIVACY.removal}</p>

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
        {PRIVACY.accept}
      </button>
    </main>
  );
}
