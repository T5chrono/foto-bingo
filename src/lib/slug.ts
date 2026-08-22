/**
 * Slugifikacja polskich nazw do nazw plików na Dysku Google.
 *
 * Ten plik jest WSPÓLNY dla frontu i backendu (`api/_lib/` importuje go stąd).
 * To celowe: nazwa pliku jest budowana po stronie serwera, ale front musi
 * przewidzieć ją co do znaku, żeby pokazać gościowi, co się wysyła. Dwie
 * implementacje, które muszą dawać identyczny wynik, rozjechałyby się przy
 * pierwszej poprawce.
 */

// Ł/ł nie rozkłada się przez NFD — to osobny znak Unicode, nie L z diakrytykiem.
// Reszta polskich znaków rozkłada się normalnie, więc obsługujemy je hurtem
// przez normalize + usunięcie znaków łączących.
const HARD_CASES: Record<string, string> = {
  ł: "l",
  Ł: "l",
};

export function slugify(input: string): string {
  return input
    .replace(/[łŁ]/g, (ch) => HARD_CASES[ch] ?? ch)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/**
 * Nazwa pliku na Dysku:
 *   R3K1_trzy-pokolenia-na-jednym-zdjeciu__anna-kowalska__20260815-193045.jpg
 *
 * Prefiks R{wiersz}K{kolumna} nie jest ozdobą: sortowanie folderu po nazwie
 * układa zdjęcia w kolejności czytania planszy.
 */
export function driveFileName(args: {
  row: number;
  col: number;
  categorySlug: string;
  guestSlug: string;
  takenAt: Date;
  extension: string;
}): string {
  const { row, col, categorySlug, guestSlug, takenAt, extension } = args;
  const ext = extension.replace(/^\.+/, "").toLowerCase();
  return `R${row}K${col}_${categorySlug}__${guestSlug}__${stamp(takenAt)}.${ext}`;
}

/** RRRRMMDD-GGMMSS w czasie lokalnym — pliki mają czytać się jak wspomnienia,
 *  a nie jak logi, więc nie UTC. */
function stamp(d: Date): string {
  const p = (n: number, len = 2) => String(n).padStart(len, "0");
  return (
    `${p(d.getFullYear(), 4)}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}
