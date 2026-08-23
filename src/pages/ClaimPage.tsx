import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type ClaimTile } from "../lib/api";
import { useT } from "../hooks/useLocale";
import type { Strings } from "../lib/strings/pl";
import { describe } from "./PanelPage";

export default function ClaimPage() {
  const { id = "" } = useParams();
  const client = useQueryClient();
  const t = useT();
  const [projector, setProjector] = useState(false);

  const claim = useQuery({
    queryKey: ["panel", "claim", id],
    queryFn: () => api.panelClaim(id),
    enabled: Boolean(id),
  });

  const resolve = useMutation({
    mutationFn: (status: "accepted" | "rejected") => api.panelResolve(id, status),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["panel"] }),
  });

  if (claim.isLoading) return <p className="p-8 text-center text-brand-800/60">{t.app.loading}</p>;
  if (claim.isError || !claim.data) {
    return <p className="p-8 text-center text-brand-800/70">{t.panel.noClaim}</p>;
  }

  const data = claim.data;
  const withPhoto = data.tiles.filter((t) => t.url);
  const missing = data.tiles.length - withPhoto.length;

  if (projector) {
    return (
      <Projector
        tiles={withPhoto}
        guestName={data.guestName}
        onExit={() => setProjector(false)}
        t={t}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-5 px-4 py-6">
      <Link to="/panel" className="self-start text-sm text-brand-700 underline">
        {t.panel.backToPanel}
      </Link>

      <header>
        <h1 className="text-2xl font-semibold text-brand-800">{data.guestName}</h1>
        <p className="text-brand-800/70">{describe(data, t)}</p>
      </header>

      {missing > 0 && (
        // Zgloszenie moglo powstac na nieodswiezonej planszy albo zdjecie
        // zostalo w miedzyczasie podmienione. Para Mloda ma zobaczyc dziure,
        // a nie krotsza liste i zgadywac, ktorego pola brakuje.
        <p className="rounded-xl bg-clay-50 px-4 py-3 text-sm text-clay-900">
          {t.panel.missingTiles(missing, data.tiles.length)}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {data.tiles.map((tile) => (
          <figure key={tile.categoryId} className="overflow-hidden rounded-lg border border-brand-200 bg-paper">
            {tile.url ? (
              <img src={tile.url} alt={tile.label} className="aspect-square w-full object-cover" />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-clay-50 text-xs text-clay-900">
                {t.panel.noPhoto}
              </div>
            )}
            <figcaption className="px-2 py-1.5 text-[0.65rem] leading-tight text-brand-800/70">
              <span className="text-brand-800/50">{tile.position}</span> {tile.label}
            </figcaption>
          </figure>
        ))}
      </div>

      {withPhoto.length > 0 && (
        <button
          onClick={() => setProjector(true)}
          className="rounded-2xl bg-brand-700 px-5 py-4 text-lg font-medium text-white"
        >
          {t.panel.projector}
        </button>
      )}

      {data.status === "new" ? (
        <div className="flex gap-2">
          <button
            onClick={() => resolve.mutate("accepted")}
            disabled={resolve.isPending}
            className="flex-1 rounded-2xl bg-brand-700 px-4 py-4 font-medium text-white disabled:opacity-50"
          >
            {t.panel.accept}
          </button>
          <button
            onClick={() => resolve.mutate("rejected")}
            disabled={resolve.isPending}
            className="flex-1 rounded-2xl border border-clay-400 bg-clay-50 px-4 py-4 font-medium text-clay-900 disabled:opacity-50"
          >
            {t.panel.reject}
          </button>
        </div>
      ) : (
        <p className="text-center text-sm text-brand-800/60">
          {data.status === "accepted" ? t.panel.acceptedFinal : t.panel.rejectedFinal}
        </p>
      )}
    </main>
  );
}

/**
 * Tryb rzutnika: pełny ekran, sterowanie strzałkami i spacją, ekran nie gaśnie.
 *
 * Wake Lock jest tu istotny, a nie ozdobny — telefon podłączony do rzutnika
 * gaśnie po minucie i zabiera obraz w środku pokazu. Nie ma go na starszym
 * Safari, więc obsługa jest opcjonalna i brak nie może niczego wywrócić.
 */
function Projector({
  tiles,
  guestName,
  onExit,
  t,
}: {
  tiles: ClaimTile[];
  guestName: string;
  onExit: () => void;
  t: Strings;
}) {
  const [index, setIndex] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (delta: number) => setIndex((i) => Math.max(0, Math.min(tiles.length - 1, i + delta))),
    [tiles.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        go(1);
      }
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onExit]);

  useEffect(() => {
    void box.current?.requestFullscreen?.().catch(() => {
      // Przegladarka moze odmowic, gdy gest uzytkownika sie "przeterminowal".
      // Pokaz i tak dziala, tylko z paskiem adresu — nie ma po co przerywac.
    });

    let lock: { release: () => Promise<void> } | null = null;
    const wakeLock = (navigator as { wakeLock?: { request: (t: string) => Promise<typeof lock> } })
      .wakeLock;
    void wakeLock?.request("screen").then((l) => (lock = l)).catch(() => null);

    return () => {
      void lock?.release().catch(() => null);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => null);
    };
  }, []);

  const tile = tiles[index];

  return (
    <div
      ref={box}
      className="flex h-screen w-screen flex-col bg-ink"
      onClick={() => go(1)}
      role="button"
      tabIndex={0}
      aria-label={t.panel.nextPhoto}
    >
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        {tile?.url && (
          <img src={tile.url} alt={tile.label} className="max-h-full max-w-full object-contain" />
        )}
      </div>

      <div className="flex items-end justify-between gap-4 px-6 pb-6 text-white">
        <div className="min-w-0">
          <p className="truncate text-2xl font-medium sm:text-4xl">{tile?.label}</p>
          <p className="text-white/60 sm:text-xl">{guestName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <span className="text-white/40">
            {index + 1} / {tiles.length}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExit();
            }}
            className="rounded-lg border border-white/25 px-3 py-1.5 text-sm text-white/70"
          >
            {t.panel.close}
          </button>
        </div>
      </div>
    </div>
  );
}
