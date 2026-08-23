/**
 * Przechwycenie zaproszenia do instalacji, poza Reactem.
 *
 * `beforeinstallprompt` strzela **raz na załadowanie strony** i Chrome wybiera
 * moment sam. Jeśli w tej sekundzie nikt nie słucha, zdarzenie przepada
 * bezpowrotnie — nie da się o nie dopytać później.
 *
 * Wcześniej nasłuch siedział w `useEffect` komponentu `InstallBanner`, a ten
 * renderuje się dopiero na planszy, czyli **za bramką o zdjęciach**. Przy
 * pierwszym skanie kodu QR gość czyta wtedy ekran zgody, Chrome strzela
 * w próżnię i przycisk „Zainstaluj" nie pojawia się w ogóle. Przy drugim
 * wejściu zgoda jest już zapamiętana, plansza wchodzi od razu, nasłuch zdąża —
 * i przycisk jest. Dokładnie to zgłosił Tomek z telefonu z Androidem.
 *
 * Dlatego nasłuch startuje w `main.tsx`, **przed pierwszym renderem Reacta**,
 * a komponent tylko czyta to, co już zostało złapane. Sklep jest zwykłym
 * modułem, nie kontekstem: zdarzenie potrafi przyjść przed zamontowaniem
 * czegokolwiek, więc stan musi je przeżyć bez żadnego drzewa komponentów.
 */

export type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/**
 * Zaczyna nasłuchiwać. Wołane raz, z `main.tsx`.
 *
 * `target` istnieje wyłącznie po to, żeby test mógł podstawić własny
 * `EventTarget` zamiast okna — bez furtki widocznej w produkcyjnym API.
 */
export function watchInstallPrompt(target: EventTarget = window): void {
  target.addEventListener("beforeinstallprompt", (event) => {
    // Bez tego Chrome pokaże własny pasek w swoim momencie — najczęściej
    // wtedy, gdy gość jest w środku wybierania zdjęcia.
    event.preventDefault();
    deferred = event as InstallPrompt;
    emit();
  });

  target.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

/** Dla `useSyncExternalStore`. Zwraca tę samą referencję, dopóki nic się nie zmieni. */
export function subscribeInstallPrompt(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => void listeners.delete(onChange);
}

export function readInstallPrompt(): InstallPrompt | null {
  return deferred;
}

/**
 * Pokazuje systemowe okno instalacji i sprząta po sobie.
 *
 * Zaproszenie jest **jednorazowe**: po `prompt()` to samo zdarzenie nie da się
 * użyć drugi raz, więc czyścimy je niezależnie od tego, co gość wybrał.
 * Przycisk, który po odmowie zostałby na ekranie i przy drugim dotknięciu nie
 * robił nic, byłby gorszy niż jego brak.
 */
export async function showInstallPrompt(): Promise<void> {
  const prompt = deferred;
  if (!prompt) return;

  try {
    await prompt.prompt();
    await prompt.userChoice;
  } finally {
    deferred = null;
    emit();
  }
}

/** Zainstalowana aplikacja nie ma po co zachęcać do instalacji. */
export function isInstalled(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS nie wspiera display-mode, ma własną, niestandardową flagę.
    (navigator as { standalone?: boolean }).standalone === true
  );
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
