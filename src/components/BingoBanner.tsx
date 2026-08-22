import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type ClaimKind, type GuestClaim } from "../lib/api";
import { type Line, isFullCard, lineLabel } from "../lib/bingo";

type Props = { filled: ReadonlySet<number>; lines: Line[] };

/**
 * Pasek bingo pod planszą.
 *
 * Zgłasza się **jedna, najlepsza rzecz naraz** — pełna karta ma pierwszeństwo
 * przed pojedynczą linią. Gość z trzema liniami i tak biegnie do Pary Młodej
 * raz, a nie trzy razy, więc trzy przyciski byłyby tylko sposobem na zasypanie
 * panelu duplikatami w środku zabawy.
 */
export function BingoBanner({ filled, lines }: Props) {
  const client = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const claims = useQuery({ queryKey: ["claims"], queryFn: api.myClaims, staleTime: 15_000 });

  const best = pickBest(filled, lines);

  const send = useMutation({
    mutationFn: () => api.claim({ kind: best!.kind, lineIndex: best!.lineIndex }),
    onSuccess: () => {
      setError(null);
      void client.invalidateQueries({ queryKey: ["claims"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Nie udało się zgłosić"),
  });

  if (!best) return null;

  const existing = (claims.data ?? []).find(
    (c) => c.kind === best.kind && c.line_index === best.lineIndex,
  );

  return (
    <section className="rounded-2xl bg-brand-50 px-4 py-3" role="status">
      <p className="font-medium text-brand-800">
        {best.kind === "full" ? "Pełna karta! Wszystkie 25 pól." : `Bingo: ${best.label}`}
      </p>

      {lines.length > 1 && best.kind !== "full" && (
        <p className="mt-0.5 text-xs text-brand-800/60">
          Masz {lines.length} linie — zgłaszasz tę pierwszą.
        </p>
      )}

      {existing ? (
        <ClaimStatus claim={existing} />
      ) : (
        <button
          type="button"
          onClick={() => send.mutate()}
          disabled={send.isPending}
          className="mt-2 w-full rounded-xl bg-brand-700 px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {send.isPending ? "Zgłaszam…" : "Zgłoś bingo!"}
        </button>
      )}

      {error && <p className="mt-2 text-xs text-amber-900">{error}</p>}
    </section>
  );
}

function ClaimStatus({ claim }: { claim: GuestClaim }) {
  if (claim.status === "accepted") {
    return <p className="mt-2 text-sm font-medium text-brand-800">Uznane ✓</p>;
  }
  if (claim.status === "rejected") {
    return (
      <p className="mt-2 text-sm text-amber-900">
        Nie uznane — dopytaj Parę Młodą, które zdjęcie nie pasowało.
      </p>
    );
  }
  return (
    <p className="mt-2 text-sm text-ink/60">
      Zgłoszone — Para Młoda zaraz to obejrzy.
    </p>
  );
}

type Best = { kind: ClaimKind; lineIndex: number | null; label: string };

/** Pełna karta bije wszystko; poza tym pierwsza zdobyta linia. */
function pickBest(filled: ReadonlySet<number>, lines: Line[]): Best | null {
  if (isFullCard(filled)) return { kind: "full", lineIndex: null, label: "pełna karta" };
  const first = lines[0];
  if (!first) return null;
  return { kind: first.kind, lineIndex: first.index, label: lineLabel(first) };
}
