import { LINES, type LineKind } from "./bingo.js";

/**
 * Kto pierwszy skompletował którą linię i kto prowadzi w liczbie zdjęć.
 *
 * To jest **arkusz sędziowski**, nie ranking dla gości: liczy się z surowych
 * zdjęć w bazie, a nie ze zgłoszeń. Zgłoszenie mówi, kto zdążył kliknąć
 * „Zgłoś bingo"; te wyliczenia mówią, kto rzeczywiście miał komplet i o której.
 * Gość, któremu padła bateria, zanim zdążył zgłosić linię, nadal jest tu
 * widoczny — i to Para Młoda, nie serwer, decyduje, co z tym zrobić.
 *
 * Funkcja jest czysta i nie zna bazy: dostaje płaską listę wierszy, oddaje
 * gotowe zestawienie. Dzięki temu da się ją przetestować na wymyślonych
 * danych, zamiast klikać po weselu w produkcyjny panel.
 */

/** Jeden wiersz tabeli `photos` — tyle, ile potrzeba do rozstrzygnięcia. */
export type PhotoRow = {
  guestId: string;
  guestName: string;
  categoryId: number;
  /** ISO 8601, prosto z `photos.created_at`. */
  createdAt: string;
  /** `false` = zdjęcie usunięte albo podmienione; baza nic nie kasuje. */
  isActive: boolean;
};

export type Finisher = {
  guestId: string;
  guestName: string;
  /** Moment, w którym linia stała się kompletna. */
  completedAt: string;
};

export type LineStanding = {
  kind: LineKind;
  index: number;
  /** Ukończenia w kolejności czasu. Pusta lista = nikt jeszcze nie zebrał. */
  finishers: Finisher[];
};

export type Leader = {
  guestId: string;
  guestName: string;
  /** Pola planszy zajęte **teraz**. */
  photos: number;
  /** Kiedy gość doszedł do tego stanu — rozstrzyga remis. */
  reachedAt: string | null;
};

export type Results = { lines: LineStanding[]; leaders: Leader[] };

/**
 * Stan jednego kafelka u jednego gościa.
 *
 * `filled` mówi o **teraz**, `firstAt` o przeszłości — i te dwie rzeczy celowo
 * nie są tym samym polem. Podmiana zdjęcia na tym samym kafelku wstawia nowy
 * wiersz i gasi stary, więc branie czasu z aktywnego zdjęcia cofałoby komuś
 * ukończenie linii za to, że po godzinie wybrał ładniejsze ujęcie. Liczy się
 * pierwsza dostawa; podmiana niczego nie przesuwa.
 */
type TileState = { filled: boolean; firstAt: string };

export function computeResults(rows: readonly PhotoRow[]): Results {
  const names = new Map<string, string>();
  const tiles = new Map<string, Map<number, TileState>>();

  for (const row of rows) {
    names.set(row.guestId, row.guestName);

    let byCategory = tiles.get(row.guestId);
    if (!byCategory) tiles.set(row.guestId, (byCategory = new Map()));

    const seen = byCategory.get(row.categoryId);
    byCategory.set(row.categoryId, {
      filled: (seen?.filled ?? false) || row.isActive,
      firstAt: seen && seen.firstAt <= row.createdAt ? seen.firstAt : row.createdAt,
    });
  }

  return { lines: standings(tiles, names), leaders: leaderboard(tiles, names) };
}

function standings(
  tiles: Map<string, Map<number, TileState>>,
  names: Map<string, string>,
): LineStanding[] {
  return LINES.map((line) => {
    const finishers: Finisher[] = [];

    for (const [guestId, byCategory] of tiles) {
      const times: string[] = [];
      for (const id of line.ids) {
        const tile = byCategory.get(id);
        if (!tile?.filled) break;
        times.push(tile.firstAt);
      }
      if (times.length < line.ids.length) continue;

      // Linia jest kompletna dopiero z ostatnim brakującym kafelkiem, więc
      // liczy się najpóźniejsza z pięciu dostaw, a nie moment zgłoszenia.
      finishers.push({
        guestId,
        guestName: names.get(guestId) ?? "?",
        completedAt: times.reduce((a, b) => (a >= b ? a : b)),
      });
    }

    finishers.sort(byTimeThenName);
    return { kind: line.kind, index: line.index, finishers };
  });
}

function leaderboard(
  tiles: Map<string, Map<number, TileState>>,
  names: Map<string, string>,
): Leader[] {
  const leaders: Leader[] = [];

  for (const [guestId, byCategory] of tiles) {
    const times = [...byCategory.values()].filter((t) => t.filled).map((t) => t.firstAt);
    if (times.length === 0) continue;

    leaders.push({
      guestId,
      guestName: names.get(guestId) ?? "?",
      photos: times.length,
      reachedAt: times.reduce((a, b) => (a >= b ? a : b)),
    });
  }

  // Remis rozstrzyga czas: przy dwóch osobach z dwudziestoma zdjęciami wyżej
  // stoi ta, która doszła do dwudziestu wcześniej. Bez tego kolejność zależałaby
  // od tego, w jakiej kolejności baza oddała wiersze — czyli od niczego.
  leaders.sort(
    (a, b) =>
      b.photos - a.photos ||
      byTimeThenName(
        { completedAt: a.reachedAt ?? "", guestName: a.guestName },
        { completedAt: b.reachedAt ?? "", guestName: b.guestName },
      ),
  );

  return leaders;
}

/** Nazwisko jako ostatni tie-break, żeby kolejność była powtarzalna. */
function byTimeThenName(
  a: { completedAt: string; guestName: string },
  b: { completedAt: string; guestName: string },
): number {
  if (a.completedAt !== b.completedAt) return a.completedAt < b.completedAt ? -1 : 1;
  return a.guestName.localeCompare(b.guestName);
}
