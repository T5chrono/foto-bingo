import { useState, useSyncExternalStore } from "react";

import { useT } from "../hooks/useLocale";
import {
  isInstalled,
  isIos,
  readInstallPrompt,
  showInstallPrompt,
  subscribeInstallPrompt,
} from "../lib/install";

/**
 * Zachęta do zainstalowania aplikacji.
 *
 * **Android jest ścieżką główną** i tam działa to samo z siebie: przeglądarka
 * zgłasza `beforeinstallprompt`, my go przechwytujemy i pokazujemy własny
 * przycisk zamiast czekać, aż Chrome sam coś zaproponuje.
 *
 * Samo przechwycenie **nie dzieje się tutaj**, tylko w `src/lib/install.ts`,
 * uruchomione z `main.tsx` przed pierwszym renderem. Ten komponent siedzi za
 * bramką o zdjęciach i przy pierwszym skanie kodu QR montuje się o kilkanaście
 * sekund za późno — a zdarzenie leci raz i nie wraca. Ten podział to jedyny
 * powód, dla którego przycisk pojawia się już przy pierwszym wejściu.
 *
 * iOS nie ma tego zdarzenia i mieć nie będzie, więc dostaje jedno zdanie
 * instrukcji. Świadomie bez obrazków i bez rozbudowanego kreatora: to jest
 * mniejszość gości, a aplikacja działa w Safari tak samo dobrze — instalacja
 * daje tylko ikonę i pełny ekran.
 */

const HIDDEN_KEY = "fotobingo.installHidden";

export function InstallBanner() {
  const t = useT();
  const prompt = useSyncExternalStore(subscribeInstallPrompt, readInstallPrompt, () => null);

  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(HIDDEN_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (hidden || isInstalled()) return null;

  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(HIDDEN_KEY, "1");
    } catch {
      /* pusto */
    }
  };

  if (prompt) {
    return (
      <Frame onHide={hide}>
        <p className="text-sm text-brand-800">{t.install.prompt}</p>
        <button
          type="button"
          onClick={() => void showInstallPrompt()}
          className="mt-2 w-full rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-medium text-white"
        >
          {t.install.action}
        </button>
      </Frame>
    );
  }

  if (isIos()) {
    return (
      <Frame onHide={hide}>
        <p className="text-sm text-brand-800">
          {t.install.iosBefore} <strong>{t.install.iosShare}</strong> {t.install.iosBetween}{" "}
          <strong>{t.install.iosAdd}</strong>.
        </p>
      </Frame>
    );
  }

  return null;
}

function Frame({ children, onHide }: { children: React.ReactNode; onHide: () => void }) {
  const t = useT();

  return (
    <section className="relative rounded-2xl border border-brand-200 bg-paper px-4 py-3">
      {children}
      <button
        type="button"
        onClick={onHide}
        aria-label={t.install.hide}
        className="absolute top-2 right-3 text-lg leading-none text-brand-800/50"
      >
        ×
      </button>
    </section>
  );
}
