import { BOARD, SIZE, type Category } from "../lib/board";
import { highlightedIds } from "../lib/bingo";

type Props = {
  /** Identyfikatory kategorii, które gość ma już zdobyte. */
  filled: ReadonlySet<number>;
  onPick?: (category: Category) => void;
};

/**
 * Plansza 5×5. Cała szerokość ekranu telefonu, kwadratowe kafelki.
 *
 * Etykiety są długie ("Selfie z osobą, której nie znałeś przed tym weekendem"),
 * a kafelek ma ~68 px na telefonie — pełny tekst czyta się dopiero na ekranie
 * kategorii. Tutaj tekst jest przycięty wizualnie, ale zostaje w całości
 * w `aria-label` i w `title`, żeby dotknięcie w ciemno nie było loterią.
 */
export function BoardGrid({ filled, onPick }: Props) {
  const highlighted = highlightedIds(filled);

  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
      role="grid"
      aria-label="Plansza Foto Bingo, 5 na 5"
    >
      {BOARD.map((cat) => {
        const done = filled.has(cat.id);
        const inLine = highlighted.has(cat.id);

        return (
          <button
            key={cat.id}
            type="button"
            role="gridcell"
            onClick={() => onPick?.(cat)}
            title={cat.label}
            aria-label={`${cat.label}${done ? " — zdobyte" : ""}`}
            className={[
              "aspect-square rounded-xl border p-1.5 text-left transition-colors",
              "flex flex-col justify-between overflow-hidden",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700",
              done
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-brand-200 bg-white text-ink/75 hover:border-brand-400",
              inLine ? "ring-2 ring-brand-800 ring-offset-1" : "",
            ].join(" ")}
          >
            <span className="text-[0.55rem] leading-tight font-medium opacity-60">
              R{cat.row}K{cat.col}
            </span>
            <span className="line-clamp-3 text-[0.6rem] leading-[1.15]">
              {cat.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
