import { BOARD, SIZE, categoryLabel, type Category } from "../lib/board";
import { highlightedIds } from "../lib/bingo";
import { useLocale } from "../hooks/useLocale";
import type { MediaKind } from "../lib/media";
import { PlayBadge } from "./PlayBadge";

export type TileView = {
  /** Zdjęcie czy film — na miniaturze różni je tylko znaczek. */
  kind?: MediaKind;
  /** Miniatura z serwera; brak = kafelek jeszcze nie ma zdjęcia u nas. */
  thumbUrl?: string;
  /** Ta sama fotografia w wersji na cały ekran — potrzebna dopiero na ekranie
   *  kategorii, ale przychodzi razem z planszą, więc leży tu obok miniatury. */
  previewUrl?: string;
  /** Zdjęcie czeka w kolejce w telefonie albo właśnie leci. */
  pending?: boolean;
  /** Nieponawialny błąd — czeka na człowieka. */
  failed?: boolean;
};

type Props = {
  tiles: ReadonlyMap<number, TileView>;
  onPick?: (category: Category) => void;
  /** Rozmiar planszy ustala ekran, nie ona sama — patrz komentarz niżej. */
  className?: string;
};

/**
 * Plansza 5×5 — ta sama, którą Para Młoda narysowała w Canvie.
 *
 * Kafelek jest wzięty stamtąd co do liczby: kremowe wypełnienie, cienka
 * szałwiowa ramka, wyśrodkowany podpis i **kółko do zaznaczenia** pod nim.
 * Kółko jest tu najważniejsze — na papierze zakreśla się je długopisem,
 * w aplikacji zamalowuje się samo, gdy zdjęcie dojdzie. To jeden gest
 * przeniesiony z kartki na ekran i po nim widać, że to ta sama gra.
 *
 * Kafelek ma na telefonie ~65 px, więc pełna etykieta się nie mieści —
 * zostaje przycięta wizualnie, ale w całości w aria-label i title, żeby
 * dotknięcie w ciemno nie było loterią. W aria-label siedzi też pozycja
 * (R3K2), bo z planszy zniknęła: 25 kodów na 25 kafelkach robiło hałas,
 * którego papierowa karta nie ma, a gość i tak czyta podpis, nie współrzędne.
 *
 * Kafelek zdobyty pokazuje miniaturę, a nie tekst: po dwóch dniach zbierania
 * gość rozpoznaje własne zdjęcie szybciej niż nazwę kategorii.
 *
 * **Wiersze są `1fr`, a nie wysokością kafelka.** Plansza dostaje z ekranu
 * kwadratowe pudełko przycięte do wolnej wysokości (`aspect-square max-h-full`),
 * a rząd dzieli to, co zostało. Na typowym telefonie kafelki wychodzą kwadratowe
 * co do piksela; na niskim ekranie — albo takim, gdzie pod planszą stanął pasek
 * bingo i zachęta do instalacji — ściskają się o kilka procent, zamiast zepchnąć
 * ostatni rząd pod krawędź. Plansza, po której trzeba przewijać, przestaje być
 * kartą do bingo.
 */
export function BoardGrid({ tiles, onPick, className = "" }: Props) {
  const { locale, t } = useLocale();

  const filled = new Set(
    [...tiles.entries()].filter(([, tile]) => tile.thumbUrl || tile.pending).map(([id]) => id),
  );
  const highlighted = highlightedIds(filled);

  return (
    <div
      className={`grid gap-1.5 ${className}`}
      style={{
        gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${SIZE}, minmax(0, 1fr))`,
      }}
      role="grid"
      aria-label={t.board.grid}
    >
      {BOARD.map((cat) => {
        const tile = tiles.get(cat.id);
        const done = Boolean(tile?.thumbUrl);
        const pending = Boolean(tile?.pending);
        const failed = Boolean(tile?.failed);
        const video = tile?.kind === "video";
        const inLine = highlighted.has(cat.id);
        const label = categoryLabel(cat, locale);

        const state = done
          ? t.board.tileDone
          : pending
            ? t.board.tileQueued
            : failed
              ? t.board.tileFailed
              : null;

        return (
          <button
            key={cat.id}
            type="button"
            role="gridcell"
            onClick={() => onPick?.(cat)}
            title={label}
            aria-label={
              `R${cat.row}K${cat.col} — ${label}` +
              (state ? ` — ${state}` : "") +
              (video ? ` — ${t.board.tileVideo}` : "")
            }
            className={[
              "relative h-full w-full overflow-hidden rounded-lg border transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700",
              failed
                ? "border-clay-400 bg-clay-50"
                : done
                  ? "border-brand-600"
                  : pending
                    ? "border-brand-500 bg-brand-50"
                    : "border-brand-400 bg-paper hover:border-brand-600",
              inLine ? "ring-2 ring-brand-700 ring-offset-1 ring-offset-cream" : "",
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

            {!done && (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1 pb-1">
                <span
                  className={[
                    "line-clamp-4 text-center text-[0.56rem] leading-[1.12]",
                    pending ? "text-brand-800" : failed ? "text-clay-900" : "text-brand-800",
                  ].join(" ")}
                >
                  {pending ? t.board.sending : failed ? t.board.failedTap : label}
                </span>
                <Kolko state={pending ? "pending" : failed ? "failed" : "empty"} />
              </span>
            )}

            {done && (
              // Nad zdjęciem kółko dostaje jasną obwódkę: miniatura bywa ciemna,
              // bywa jasna, a znacznik musi być widoczny na obu.
              <span className="absolute right-1 bottom-1">
                <Kolko state="done" />
              </span>
            )}

            {/* Znaczek filmu w przeciwległym rogu niż kółko — na 65 pikselach
                dwa znaczki obok siebie zlewają się w jeden. */}
            {video && (done || pending) && (
              <span className="absolute top-1 left-1">
                <PlayBadge className="size-4" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Kółko do zaznaczania — wprost z papierowej karty. */
function Kolko({ state }: { state: "empty" | "pending" | "done" | "failed" }) {
  if (state === "done") {
    return (
      <span className="flex size-4 items-center justify-center rounded-full bg-brand-700 ring-1 ring-white/70">
        <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden="true">
          <path
            d="M2 6.4 L4.6 9 L10 3"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={[
        "size-2.5 shrink-0 rounded-full border",
        state === "pending"
          ? "animate-pulse border-brand-600 bg-brand-300"
          : state === "failed"
            ? "border-clay-500"
            : "border-brand-500",
      ].join(" ")}
    />
  );
}
