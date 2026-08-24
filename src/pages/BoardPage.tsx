import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { BingoBanner } from "../components/BingoBanner";
import { InstallBanner } from "../components/InstallBanner";
import { BoardGrid } from "../components/BoardGrid";
import { MeadowBand } from "../components/wedding/Meadow";
import { Wordmark } from "../components/wedding/Wordmark";
import { useBoard } from "../hooks/useBoard";
import { useT } from "../hooks/useLocale";
import { SIZE } from "../lib/board";
import { completedLines, countFilled } from "../lib/bingo";
import { autoDrain } from "../lib/uploader";

export default function BoardPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { me, tiles, refreshJobs } = useBoard();
  const t = useT();

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
    // Plansza mieści się w jednym oknie i nigdzie się nie przewija: `h-dvh`
    // liczy realną wysokość ekranu telefonu (z paskiem adresu i bez), a to,
    // co się nie zmieści, oddaje wysokość plansza — nie ostatni rząd kafelków.
    //
    // `overflow-y-auto`, a nie `hidden`: przewijanie jest tu wentylem, nie
    // trybem pracy. Na telefonie, jaki naprawdę przyjedzie na wesele, całość
    // się mieści; na czymś skrajnie niskim, z paskiem bingo i zachętą do
    // instalacji naraz, lepiej dać przesunąć ekran, niż uciąć guzik.
    <main className="mx-auto flex h-dvh max-w-md flex-col gap-3 overflow-y-auto px-3 pt-3 pb-[var(--meadow-h)]">
      <header className="relative flex items-center justify-center">
        {/* Zębatka wychodzi z układu na bok, żeby logotyp mógł stać na środku
            karty — tak jak tytuł na papierowej wersji. */}
        <Wordmark size="sm" />
        <Link
          to="/ustawienia"
          aria-label={t.board.settings}
          className="absolute top-1/2 right-0 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
        >
          <Zebatka className="size-7" />
        </Link>
      </header>

      <div className="border-y border-brand-200 py-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate text-sm text-brand-800">
            {me.data?.guest.name ?? " "}
          </p>
          <p className="shrink-0 text-sm text-brand-800/70" aria-live="polite">
            {zdobyte} / {wszystkie}
          </p>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-brand-200">
          <div
            className="h-full rounded-full bg-brand-500 transition-[width] duration-500"
            style={{ width: `${(zdobyte / wszystkie) * 100}%` }}
          />
        </div>
      </div>

      {me.isError && (
        <p className="rounded-xl bg-clay-50 px-3 py-2 text-sm text-clay-900">
          {t.board.cantLoad}
        </p>
      )}

      {/* Plansza bierze całą wolną wysokość i tylko tyle: `min-h-0` jest tu
          konieczne, bo bez niego element w kolumnie flex nie schodzi poniżej
          swojej treści i 25 kafelków wypchnęłoby resztę ekranu w dół. */}
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <BoardGrid
          // `min-h` to podłoga dla kafelka: przy 16 rem rząd ma 46 px, czyli
          // wciąż opuszek palca. Poniżej plansza przestaje być planszą i lepiej,
          // żeby ekran dał się przesunąć, niż żeby została z niej siatka pasków.
          className="aspect-square max-h-full min-h-64 w-full"
          tiles={tiles}
          onPick={(cat) => navigate(`/kategoria/${cat.id}`)}
        />
      </div>

      <BingoBanner filled={filled} lines={lines} />

      {/* Zachęta do instalacji ustępuje miejsca zdobytej linii. To jedyny
          moment, w którym gościowi coś się udało — nie dzieli go z podpowiedzią
          techniczną, a plansza nie oddaje wtedy wysokości dwóm paskom naraz. */}
      {lines.length === 0 && <InstallBanner />}

      <MeadowBand />
    </main>
  );
}

/**
 * Zębatka ustawień — złożona z ośmiu zębów i pierścienia, nie z glifu ⚙.
 *
 * Znak z czcionki był rysowany razem z tekstem: przy `text-lg` wychodził
 * drobny i w każdej przeglądarce inny, bo każda bierze go z innego fontu
 * systemowego. Tu jest to samo, co reszta ozdobników w tej aplikacji —
 * własny SVG o policzonej geometrii, który skaluje się razem z polem dotyku
 * i wszędzie wygląda tak samo.
 *
 * Otwór w środku robi obrys, nie wypełnienie w kolorze tła: zębatka siedzi na
 * kremowym papierze, ale trafia też na jaśniejsze karty i dziura wycięta
 * „kremem" byłaby tam widoczną łatką.
 */
function Zebatka({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x="10.7"
          y="1.6"
          width="2.6"
          height="5.2"
          rx="1"
          fill="currentColor"
          transform={`rotate(${i * 45} 12 12)`}
        />
      ))}
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="currentColor" strokeWidth="3.4" />
    </svg>
  );
}
