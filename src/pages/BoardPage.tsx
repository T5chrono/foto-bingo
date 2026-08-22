import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { BingoBanner } from "../components/BingoBanner";
import { InstallBanner } from "../components/InstallBanner";
import { BoardGrid } from "../components/BoardGrid";
import { Meadow } from "../components/wedding/Meadow";
import { PARA, Wordmark } from "../components/wedding/Wordmark";
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
  const zdobyte = countFilled(filled);
  const wszystkie = SIZE * SIZE;

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-4 px-3 py-5">
      <header className="relative text-center">
        {/* Zębatka wychodzi z układu na bok, żeby logotyp mógł stać na środku
            karty — tak jak tytuł na papierowej wersji. */}
        <Link
          to="/ustawienia"
          aria-label="Ustawienia"
          className="absolute top-0 right-0 text-lg leading-none text-brand-600"
        >
          &#9881;
        </Link>
        <Wordmark size="sm" />
        <p className="text-[0.7rem] text-brand-800/70">{PARA}</p>
      </header>

      <div className="border-y border-brand-200 py-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate text-sm text-brand-800">
            {me.data?.guest.name ?? " "}
          </p>
          <p className="shrink-0 text-sm text-brand-800/70" aria-live="polite">
            {zdobyte} / {wszystkie}
          </p>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-brand-200">
          <div
            className="h-full rounded-full bg-brand-500 transition-[width] duration-500"
            style={{ width: `${(zdobyte / wszystkie) * 100}%` }}
          />
        </div>
      </div>

      {me.isError && (
        <p className="rounded-xl bg-clay-50 px-3 py-2 text-sm text-clay-900">
          Nie mogę pobrać planszy. Zdjęcia i tak czekają w telefonie i wyślą się same.
        </p>
      )}

      <BoardGrid tiles={tiles} onPick={(cat) => navigate(`/kategoria/${cat.id}`)} />

      <BingoBanner filled={filled} lines={lines} />

      <InstallBanner />

      <Meadow className="-mx-3 -mb-5 mt-auto pt-6" />
    </main>
  );
}
