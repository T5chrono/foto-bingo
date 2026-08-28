import { useLocale } from "../hooks/useLocale";
import { LOCALES, STRINGS } from "../lib/locale";

/**
 * Przełącznik języka.
 *
 * Nazwa każdego języka stoi **w tym języku** („Polski", „English"), a nie
 * przetłumaczona na aktualny. Ktoś, kto trafił na ekran w języku, którego nie
 * zna, szuka wzrokiem swojego słowa — „polski" napisane po angielsku nie
 * pomaga nikomu.
 *
 * Bez flag. Flaga to państwo, nie język, a na tym weselu są goście z kilku
 * krajów mówiący po angielsku — angielska bandera przy ich nazwisku byłaby
 * drobnym nietaktem tam, gdzie dwa słowa załatwiają sprawę. Przy serbskim
 * kosztowałoby to jeszcze więcej: to samo pismo i ten sam język obsługują
 * kilka państw, więc każda flaga byłaby wyborem, którego nikt tu nie robi.
 *
 * Cztery nazwy mieszczą się w jednym rzędzie nawet na 320 px, ale bez zapasu —
 * stąd `max-w-full` i wąski padding. Piąty język nie zmieści się już w pasku
 * i będzie oznaczał inny układ, a nie kolejny przycisk.
 */
export function LanguagePicker({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      role="group"
      aria-label={t.app.language}
      className={`inline-flex max-w-full overflow-hidden rounded-full border border-brand-300 ${className}`}
    >
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            className={[
              "px-2.5 py-1 text-xs whitespace-nowrap transition-colors",
              active ? "bg-brand-700 text-white" : "bg-paper text-brand-800/70 hover:bg-brand-50",
            ].join(" ")}
          >
            {STRINGS[code].languageName}
          </button>
        );
      })}
    </div>
  );
}
