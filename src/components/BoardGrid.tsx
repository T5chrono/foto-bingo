import { BOARD, SIZE, type Category } from "../lib/board";
import { highlightedIds } from "../lib/bingo";

export type TileView = {
  /** Miniatura z serwera; brak = kafelek jeszcze nie ma zdjęcia u nas. */
  thumbUrl?: string;
  /** Zdjęcie czeka w kolejce w telefonie albo właśnie leci. */
  pending?: boolean;
  /** Nieponawialny błąd — czeka na człowieka. */
  failed?: boolean;
};

type Props = {
  tiles: ReadonlyMap<number, TileView>;
  onPick?: (category: Category) => void;
};

/**
 * Plansza 5×5. Kafelek ma na telefonie ~65 px, więc pełna etykieta się nie
 * mieści — zostaje przycięta wizualnie, ale w całości w aria-label i title,
 * żeby dotknięcie w ciemno nie było loterią.
 *
 * Kafelek zdobyty pokazuje miniaturę, a nie tekst: po dwóch dniach zbierania
 * gość rozpoznaje własne zdjęcie szybciej niż nazwę kategorii.
 */
export function BoardGrid({ tiles, onPick }: Props) {
  const filled = new Set(
    [...tiles.entries()].filter(([, t]) => t.thumbUrl || t.pending).map(([id]) => id),
  );
  const highlighted = highlightedIds(filled);

  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
      role="grid"
      aria-label="Plansza Foto Bingo, 5 na 5"
    >
      {BOARD.map((cat) => {
        const tile = tiles.get(cat.id);
        const done = Boolean(tile?.thumbUrl);
        const pending = Boolean(tile?.pending);
        const failed = Boolean(tile?.failed);
        const inLine = highlighted.has(cat.id);

        return (
          <button
            key={cat.id}
            type="button"
            role="gridcell"
            onClick={() => onPick?.(cat)}
            title={cat.label}
            aria-label={
              cat.label +
              (done ? " — zdobyte" : pending ? " — w kolejce" : failed ? " — błąd wysyłki" : "")
            }
            className={[
              "relative aspect-square overflow-hidden rounded-xl border transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700",
              failed
                ? "border-amber-500 bg-amber-50"
                : done
                  ? "border-brand-600"
                  : pending
                    ? "border-brand-400 bg-brand-50"
                    : "border-brand-200 bg-white hover:border-brand-400",
              inLine ? "ring-2 ring-brand-800 ring-offset-1" : "",
            ].join(" ")}
          >
            {done && (
              <img
                src={tile?.thumbUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}

            <span className="absolute inset-0 flex flex-col justify-between p-1.5 text-left">
              <span
                className={[
                  "text-[0.55rem] leading-tight font-medium",
                  done ? "text-white drop-shadow-sm" : "text-ink/40",
                ].join(" ")}
              >
                R{cat.row}K{cat.col}
              </span>

              {!done && (
                <span
                  className={[
                    "line-clamp-3 text-[0.6rem] leading-[1.15]",
                    pending ? "text-brand-800" : failed ? "text-amber-900" : "text-ink/75",
                  ].join(" ")}
                >
                  {pending ? "wysyłanie…" : failed ? "błąd — dotknij" : cat.label}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
