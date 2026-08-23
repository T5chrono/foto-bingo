import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type ClaimKind, type GuestClaim } from "../lib/api";
import { type Line, isFullCard, lineLabel } from "../lib/bingo";
import { errorText } from "../lib/errors";
import { useT } from "../hooks/useLocale";
import type { Strings } from "../lib/strings/pl";
import { Sprig } from "./wedding/Sprig";

type Props = { filled: ReadonlySet<number>; lines: Line[] };

/**
 * Pasek bingo pod planszą.
 *
 * Jedyne miejsce w aplikacji poza logotypem, gdzie wchodzi pisanka — bo to
 * jedyny moment, w którym coś się gościowi udało. Reszta ekranu jest spokojna
 * właśnie po to, żeby ten pasek miał czym się wyróżnić.
 *
 * Zgłasza się **jedna, najlepsza rzecz naraz** — pełna karta ma pierwszeństwo
 * przed pojedynczą linią. Gość z trzema liniami i tak biegnie do Pary Młodej
 * raz, a nie trzy razy, więc trzy przyciski byłyby tylko sposobem na zasypanie
 * panelu duplikatami w środku zabawy.
 */
export function BingoBanner({ filled, lines }: Props) {
  const client = useQueryClient();
  const t = useT();
  const [error, setError] = useState<string | null>(null);

  const claims = useQuery({ queryKey: ["claims"], queryFn: api.myClaims, staleTime: 15_000 });

  const best = pickBest(filled, lines, t);

  const send = useMutation({
    mutationFn: () => api.claim({ kind: best!.kind, lineIndex: best!.lineIndex }),
    onSuccess: () => {
      setError(null);
      void client.invalidateQueries({ queryKey: ["claims"] });
    },
    onError: (e) => setError(errorText(e, t, t.bingo.submitFailed)),
  });

  if (!best) return null;

  const existing = (claims.data ?? []).find(
    (c) => c.kind === best.kind && c.line_index === best.lineIndex,
  );

  return (
    <section
      className="rounded-2xl border border-brand-300 bg-brand-50 px-4 py-4 text-center"
      role="status"
    >
      <p className="font-script pb-1 text-3xl text-ink">
        {best.kind === "full" ? t.bingo.fullCard : t.bingo.line}
      </p>
      <p className="text-sm text-brand-800">
        {best.kind === "full" ? t.bingo.allTiles : best.label}
      </p>

      {lines.length > 1 && best.kind !== "full" && (
        <p className="mt-0.5 text-xs text-brand-800/60">
          {t.bingo.manyLines(lines.length)}
        </p>
      )}

      <Sprig className="mx-auto my-3" />

      {existing ? (
        <ClaimStatus claim={existing} t={t} />
      ) : (
        <button
          type="button"
          onClick={() => send.mutate()}
          disabled={send.isPending}
          className="w-full rounded-xl bg-brand-700 px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {send.isPending ? t.bingo.submitting : t.bingo.submit}
        </button>
      )}

      {error && <p className="mt-2 text-xs text-clay-900">{error}</p>}
    </section>
  );
}

function ClaimStatus({ claim, t }: { claim: GuestClaim; t: Strings }) {
  if (claim.status === "accepted") {
    return <p className="text-sm font-medium text-brand-800">{t.bingo.accepted}</p>;
  }
  if (claim.status === "rejected") {
    return <p className="text-sm text-clay-900">{t.bingo.rejected}</p>;
  }
  return <p className="text-sm text-brand-800/70">{t.bingo.pending}</p>;
}

type Best = { kind: ClaimKind; lineIndex: number | null; label: string };

/** Pełna karta bije wszystko; poza tym pierwsza zdobyta linia. */
function pickBest(filled: ReadonlySet<number>, lines: Line[], t: Strings): Best | null {
  if (isFullCard(filled)) return { kind: "full", lineIndex: null, label: t.bingo.full };
  const first = lines[0];
  if (!first) return null;
  return { kind: first.kind, lineIndex: first.index, label: lineLabel(first, t.bingo) };
}
