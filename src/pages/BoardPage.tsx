import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { BingoBanner } from "../components/BingoBanner";
import { InstallBanner } from "../components/InstallBanner";
import { BoardGrid } from "../components/BoardGrid";
import { useBoard } from "../hooks/useBoard";
import { SIZE } from "../lib/board";
import { completedLines, countFilled } from "../lib/bingo";
import { autoDrain } from "../lib/uploader";

export default function BoardPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { me, tiles, refreshJobs } = useBoard();

  // Kolejka rusza sama, gdy wraca sieć albo aplikacja wraca na wierzch.
  // Gość, który wysłał zdjęcie na spacerze bez zasięgu, nie musi o niczym
  // pamiętać — wystarczy, że wejdzie z powrotem do budynku.
  useEffect(
    () =>
      autoDrain((p) => {
        void refreshJobs();
        // Plansza odswieza sie po podgladzie — oryginal niczego na niej
        // nie zmienia, wiec nie ma po co pytac serwera drugi raz.
        if (p.phase === "preview" && p.state === "done") {
          void client.invalidateQueries({ queryKey: ["me"] });
        }
      }),
    [client, refreshJobs],
  );

  const filled = new Set(
    [...tiles.entries()].filter(([, t]) => t.thumbUrl).map(([id]) => id),
  );
  const lines = completedLines(filled);

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-4 px-3 py-5">
      <header className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-brand-800">Foto Bingo</h1>
          {me.data && (
            <p className="truncate text-sm text-ink/50">{me.data.guest.name}</p>
          )}
        </div>
        <span className="flex shrink-0 items-center gap-3">
          <p className="text-sm text-ink/60" aria-live="polite">
            {countFilled(filled)} / {SIZE * SIZE}
          </p>
          <Link
            to="/ustawienia"
            aria-label="Ustawienia"
            className="text-lg leading-none text-ink/30"
          >
            &#9881;
          </Link>
        </span>
      </header>

      {me.isError && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Nie mogę pobrać planszy. Zdjęcia i tak czekają w telefonie i wyślą się same.
        </p>
      )}

      <BoardGrid tiles={tiles} onPick={(cat) => navigate(`/kategoria/${cat.id}`)} />

      <BingoBanner filled={filled} lines={lines} />

      <InstallBanner />
    </main>
  );
}
