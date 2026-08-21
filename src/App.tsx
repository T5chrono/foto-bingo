import { useState } from "react";
import { BoardGrid } from "./components/BoardGrid";
import { SIZE } from "./lib/board";
import { completedLines, countFilled, isFullCard, lineLabel } from "./lib/bingo";

/**
 * Etap 1: plansza działa lokalnie, bez sieci i bez zdjęć. Dotknięcie kafelka
 * przełącza go, żeby dało się przejść całą logikę bingo palcem na telefonie,
 * zanim powstanie wysyłka. Etap 2 podmienia to na prawdziwe zdjęcia.
 */
export default function App() {
  const [filled, setFilled] = useState<ReadonlySet<number>>(new Set());

  const toggle = (id: number) =>
    setFilled((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const done = countFilled(filled);
  const lines = completedLines(filled);

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-4 px-3 py-5">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-brand-800">Foto Bingo</h1>
        <p className="text-sm text-ink/60" aria-live="polite">
          {done} / {SIZE * SIZE}
        </p>
      </header>

      <BoardGrid filled={filled} onPick={(cat) => toggle(cat.id)} />

      {lines.length > 0 && (
        <p
          className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800"
          role="status"
        >
          {isFullCard(filled)
            ? "Pełna karta! Wszystkie 25 pól."
            : `Bingo: ${lines.map(lineLabel).join(", ")}`}
        </p>
      )}

      <p className="mt-auto text-center text-xs text-ink/40">
        Etap 1 — plansza bez wysyłania zdjęć
      </p>
    </main>
  );
}
