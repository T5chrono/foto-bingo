import { useEffect, useState } from "react";

import { useT } from "../hooks/useLocale";

/**
 * Zachęta do zainstalowania aplikacji.
 *
 * **Android jest ścieżką główną** i tam działa to samo z siebie: przeglądarka
 * zgłasza `beforeinstallprompt`, my go przechwytujemy i pokazujemy własny
 * przycisk zamiast czekać, aż Chrome sam coś zaproponuje.
 *
 * iOS nie ma tego zdarzenia i mieć nie będzie, więc dostaje jedno zdanie
 * instrukcji. Świadomie bez obrazków i bez rozbudowanego kreatora: to jest
 * mniejszość gości, a aplikacja działa w Safari tak samo dobrze — instalacja
 * daje tylko ikonę i pełny ekran.
 */

type Prompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const HIDDEN_KEY = "fotobingo.installHidden";

export function InstallBanner() {
  const t = useT();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(HIDDEN_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onPrompt = (e: Event) => {
      // Bez tego Chrome pokaże własny pasek w swoim momencie — najczęściej
      // wtedy, gdy gość jest w środku wybierania zdjęcia.
      e.preventDefault();
      setPrompt(e as Prompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setPrompt(null));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

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
          onClick={async () => {
            await prompt.prompt();
            await prompt.userChoice;
            setPrompt(null);
          }}
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

/** Zainstalowana aplikacja nie ma po co zachęcać do instalacji. */
function isInstalled(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS nie wspiera display-mode, ma własną, niestandardową flagę.
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
