import { SIZE } from "./board.js";

/**
 * Wykrywanie linii na planszy 5×5.
 *
 * Dwanaście linii: 5 wierszy, 5 kolumn, 2 przekątne. Plus pełna karta jako
 * osobna kategoria zgłoszenia. Numeracja `index` jest 1-based, żeby zgadzała
 * się z `claims.line_index` w bazie i z etykietami R1..R5 / K1..K5, które
 * gość widzi na winietce i w nazwach plików.
 */

export type LineKind = "row" | "col" | "diag";

export type Line = {
  kind: LineKind;
  /** 1..5 dla wierszy i kolumn, 1..2 dla przekątnych */
  index: number;
  /** identyfikatory kategorii (1..25) tworzących tę linię */
  ids: readonly number[];
};

const idAt = (row: number, col: number) => (row - 1) * SIZE + col;

function buildLines(): readonly Line[] {
  const lines: Line[] = [];

  for (let r = 1; r <= SIZE; r++) {
    lines.push({
      kind: "row",
      index: r,
      ids: Array.from({ length: SIZE }, (_, i) => idAt(r, i + 1)),
    });
  }
  for (let c = 1; c <= SIZE; c++) {
    lines.push({
      kind: "col",
      index: c,
      ids: Array.from({ length: SIZE }, (_, i) => idAt(i + 1, c)),
    });
  }
  // 1 = lewy górny → prawy dolny, 2 = prawy górny → lewy dolny
  lines.push({
    kind: "diag",
    index: 1,
    ids: Array.from({ length: SIZE }, (_, i) => idAt(i + 1, i + 1)),
  });
  lines.push({
    kind: "diag",
    index: 2,
    ids: Array.from({ length: SIZE }, (_, i) => idAt(i + 1, SIZE - i)),
  });

  return lines;
}

export const LINES: readonly Line[] = buildLines();

/** Linie w całości zapełnione. Kolejność stabilna: wiersze, kolumny, przekątne. */
export function completedLines(filled: ReadonlySet<number>): Line[] {
  return LINES.filter((line) => line.ids.every((id) => filled.has(id)));
}

export function isFullCard(filled: ReadonlySet<number>): boolean {
  return countFilled(filled) === SIZE * SIZE;
}

/** Liczy tylko pola planszy — obce identyfikatory w zbiorze są ignorowane. */
export function countFilled(filled: ReadonlySet<number>): number {
  let n = 0;
  for (let id = 1; id <= SIZE * SIZE; id++) if (filled.has(id)) n++;
  return n;
}

/** Wszystkie pola należące do jakiejkolwiek zdobytej linii — do podświetlenia. */
export function highlightedIds(filled: ReadonlySet<number>): Set<number> {
  const out = new Set<number>();
  for (const line of completedLines(filled)) for (const id of line.ids) out.add(id);
  return out;
}

/**
 * Nazwa linii w języku gościa.
 *
 * Teksty wchodzą parametrem, zamiast być zaszyte w tym pliku, bo nazwa linii
 * pada w dwóch miejscach naraz — na pasku bingo u gościa i na liście zgłoszeń
 * w panelu — i musi być tam identyczna. Gdyby każde z nich sklejało ją sobie
 * samo, jedno z dwóch prędzej czy później zostałoby po polsku.
 *
 * `full` obsługuje ta sama funkcja, choć pełna karta nie jest linią: zgłoszenie
 * ma jeden typ (`ClaimKind`) i jedna funkcja opisująca go w całości znaczy, że
 * nie da się przetłumaczyć trzech przypadków i przeoczyć czwartego.
 */
export function claimLabel(
  claim: { kind: LineKind | "full"; index: number | null },
  t: {
    row: (n: number) => string;
    col: (n: number) => string;
    diagDown: string;
    diagUp: string;
    full: string;
  },
): string {
  if (claim.kind === "full") return t.full;
  if (claim.kind === "row") return t.row(claim.index ?? 0);
  if (claim.kind === "col") return t.col(claim.index ?? 0);
  return claim.index === 1 ? t.diagDown : t.diagUp;
}

/** Skrót dla zdobytej linii, gdzie `index` jest zawsze znany. */
export function lineLabel(line: Line, t: Parameters<typeof claimLabel>[1]): string {
  return claimLabel({ kind: line.kind, index: line.index }, t);
}
