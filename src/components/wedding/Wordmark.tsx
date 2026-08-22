import { Sprig } from "./Sprig";

/**
 * Podpis spod tytułu na papierowej karcie Foto Bingo. Aplikacja jest jedną
 * z rzeczy leżących tego weekendu na stole obok winietki i zaproszenia —
 * ma się przedstawiać tak samo jak one.
 */
export const PARA = "Karolina i Tomek · 2–4 października 2026";

const ROZMIARY = {
  sm: "text-3xl",
  md: "text-4xl",
  lg: "text-5xl",
} as const;

/**
 * Logotyp „Foto Bingo" — pisany, dokładnie jak nagłówek karty.
 *
 * Jest komponentem, a nie napisem wklejonym w pięciu miejscach, bo pisanka
 * wymaga własnej interlinii i odrobiny wcięcia u dołu (Yellowtail ma długie
 * wyrzutnie, które bez tego wchodzą w to, co stoi niżej).
 */
export function Wordmark({
  size = "md",
  className = "",
}: {
  size?: keyof typeof ROZMIARY;
  className?: string;
}) {
  return (
    <span className={`font-script block pb-1 text-ink ${ROZMIARY[size]} ${className}`}>
      Foto Bingo
    </span>
  );
}

/** Tytuł ekranu w pisance, z gałązką pod spodem — jak nagłówki na zaproszeniu. */
export function ScreenTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`flex flex-col items-center gap-1.5 ${className}`}>
      <span className="font-script pb-1 text-center text-4xl text-ink">{children}</span>
      <Sprig />
    </span>
  );
}
