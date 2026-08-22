import { useEffect, useState } from "react";

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
        <p className="text-sm text-brand-800">
          Dodaj Foto Bingo na ekran główny — będzie pod ręką przez cały weekend.
        </p>
        <button
          type="button"
          onClick={async () => {
            await prompt.prompt();
            await prompt.userChoice;
            setPrompt(null);
          }}
          className="mt-2 w-full rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-medium text-white"
        >
          Zainstaluj
        </button>
      </Frame>
    );
  }

  if (isIos()) {
    return (
      <Frame onHide={hide}>
        <p className="text-sm text-brand-800">
          Chcesz mieć Foto Bingo na ekranie głównym? Dotknij{" "}
          <span aria-label="Udostępnij">Udostępnij</span> na dole ekranu, potem{" "}
          <strong>Dodaj do ekranu początkowego</strong>.
        </p>
      </Frame>
    );
  }

  return null;
}

function Frame({ children, onHide }: { children: React.ReactNode; onHide: () => void }) {
  return (
    <section className="relative rounded-2xl border border-brand-200 bg-white px-4 py-3">
      {children}
      <button
        type="button"
        onClick={onHide}
        aria-label="Ukryj podpowiedź o instalacji"
        className="absolute top-2 right-3 text-lg leading-none text-ink/30"
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
