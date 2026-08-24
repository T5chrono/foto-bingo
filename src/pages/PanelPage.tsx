import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type PanelClaim, type PanelStats } from "../lib/api";
import { BOARD, SIZE } from "../lib/board";
import { claimLabel } from "../lib/bingo";
import { useT } from "../hooks/useLocale";
import type { Strings } from "../lib/strings/pl";
import { LanguagePicker } from "../components/LanguagePicker";
import { Valley } from "../components/wedding/Valley";
import { Sprig } from "../components/wedding/Sprig";

export default function PanelPage() {
  const t = useT();
  const session = useQuery({ queryKey: ["panel", "session"], queryFn: api.panelSession });

  if (session.isLoading) {
    return <p className="p-8 text-center text-brand-800/60">{t.app.loading}</p>;
  }
  return session.data?.ok ? <Dashboard /> : <Login />;
}

function Login() {
  const client = useQueryClient();
  const t = useT();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: () => api.panelLogin(pin),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["panel"] }),
    onError: (e) => setError(e instanceof Error ? e.message : t.panel.loginFailed),
  });

  return (
    <main className="mx-auto flex min-h-full max-w-sm flex-col justify-center gap-4 px-6 py-10">
      <Valley className="h-36" />

      <div className="flex flex-col items-center gap-1.5">
        <h1 className="font-script pb-1 text-center text-3xl text-ink">{t.panel.title}</h1>
        <Sprig />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          send.mutate();
        }}
        className="flex flex-col gap-3"
      >
        <input
          type="password"
          // Klawiatura numeryczna na telefonie — panel obsluguje sie z reki
          // przy rzutniku, nie zza biurka.
          inputMode="numeric"
          autoComplete="one-time-code"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder={t.panel.pin}
          aria-label={t.panel.pinLabel}
          className="rounded-xl border border-brand-400 bg-paper px-4 py-3 text-center text-2xl tracking-[0.4em] text-brand-800"
        />
        <button
          type="submit"
          disabled={pin.length < 4 || send.isPending}
          className="rounded-xl bg-brand-700 px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {send.isPending ? t.panel.checking : t.panel.enter}
        </button>
      </form>

      {error && <p className="text-center text-sm text-clay-900">{error}</p>}

      <LanguagePicker className="self-center" />
    </main>
  );
}

function Dashboard() {
  const client = useQueryClient();
  const t = useT();

  // Zgloszenia odswiezaja sie same: panel lezy otwarty na telefonie kogos
  // z rodziny przez cala zabawe i nikt nie bedzie pamietal o odswiezaniu.
  const claims = useQuery({
    queryKey: ["panel", "claims"],
    queryFn: api.panelClaims,
    refetchInterval: 15_000,
  });
  const stats = useQuery({
    queryKey: ["panel", "stats"],
    queryFn: api.panelStats,
    refetchInterval: 60_000,
  });

  const nowe = (claims.data ?? []).filter((c) => c.status === "new");
  const reszta = (claims.data ?? []).filter((c) => c.status !== "new");

  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col gap-6 px-4 py-6">
      <header className="flex items-baseline justify-between">
        <h1 className="font-script pb-1 text-3xl text-ink">{t.panel.title}</h1>
        <button
          onClick={async () => {
            await api.panelLogout();
            void client.invalidateQueries({ queryKey: ["panel"] });
          }}
          className="text-sm text-brand-800/60 underline"
        >
          {t.panel.logout}
        </button>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-medium text-brand-800/60">
          {t.panel.claims} {nowe.length > 0 && `· ${t.panel.newClaims(nowe.length)}`}
        </h2>
        {nowe.length === 0 && reszta.length === 0 ? (
          <p className="rounded-xl border border-brand-200 bg-paper px-4 py-6 text-center text-sm text-brand-800/55">
            {t.panel.noClaims}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {[...nowe, ...reszta].map((claim) => (
              <ClaimRow key={claim.id} claim={claim} t={t} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-brand-800/60">{t.panel.byCategory}</h2>
        {/* Kategorie leżą tu **w planszy 5×5**, nie w liście — bo Para Młoda
            szuka ich tak samo jak gość: „to pole z prawej u góry", a nie
            „dwudziesta trzecia pozycja". `BOARD` jest ułożone wierszami, więc
            pięć kolumn odtwarza papierową kartę co do kafelka.

            Etykieta jest przycięta wizualnie, tak jak na planszy gościa —
            w `title` i `aria-label` zostaje w całości, żeby dotknięcie
            w kafelek z długą nazwą nie było loterią. */}
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
        >
          {BOARD.map((cat) => (
            <Link
              key={cat.id}
              to={`/panel/kategoria/${cat.id}`}
              title={cat.label}
              aria-label={`R${cat.row}K${cat.col} — ${cat.label}`}
              className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border border-brand-400 bg-paper px-1 text-center text-brand-800 hover:border-brand-600"
            >
              <span className="text-[0.55rem] text-brand-800/50 sm:text-[0.65rem]">
                R{cat.row}K{cat.col}
              </span>
              <span className="line-clamp-4 text-[0.56rem] leading-[1.12] sm:text-xs sm:leading-tight">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {stats.data && <Stats stats={stats.data} t={t} />}
    </main>
  );
}

function ClaimRow({ claim, t }: { claim: PanelClaim; t: Strings }) {
  const tone =
    claim.status === "new"
      ? "border-brand-600 bg-brand-50"
      : claim.status === "accepted"
        ? "border-brand-200 bg-paper"
        : "border-clay-300 bg-clay-50";

  return (
    <li>
      <Link
        to={`/panel/zgloszenie/${claim.id}`}
        className={`flex items-center justify-between rounded-xl border px-4 py-3 ${tone}`}
      >
        <span>
          <span className="font-medium text-ink">{claim.guestName}</span>
          <span className="ml-2 text-sm text-brand-800/70">{describe(claim, t)}</span>
        </span>
        <span className="text-xs text-brand-800/55">
          {claim.status === "new"
            ? t.panel.toReview
            : claim.status === "accepted"
              ? t.panel.accepted
              : t.panel.rejected}
        </span>
      </Link>
    </li>
  );
}

function Stats({ stats, t }: { stats: PanelStats; t: Strings }) {
  const mb = (n: number) => `${Math.round(n / 1024 / 1024)} MB`;
  const ratio = stats.usedBytes / stats.limitBytes;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-paper px-4 py-4">
      <h2 className="text-sm font-medium text-brand-800/60">{t.panel.stats}</h2>

      <p className="text-sm text-brand-800/75">
        {t.panel.photosFrom(stats.photos, stats.guests)}
      </p>

      <div>
        <p className="mb-1 text-xs text-brand-800/60">
          {t.panel.space(mb(stats.usedBytes), mb(stats.limitBytes))}
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-brand-100">
          <div
            className={ratio > 0.75 ? "h-full bg-clay-500" : "h-full bg-brand-600"}
            style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
          />
        </div>
      </div>

      {stats.pendingOriginals.length > 0 && (
        <div>
          <p className="text-xs text-brand-800/60">{t.panel.pendingOriginals}</p>
          <ul className="mt-1 text-sm text-brand-800/75">
            {stats.pendingOriginals.map((p) => (
              <li key={p.guestName}>
                {p.guestName} — {t.panel.pendingCount(p.count)}
              </li>
            ))}
          </ul>
          {/* Serwer nie moze doslac oryginalu, bo lezy na telefonie goscia.
              Jedyne, co da sie zrobic, to poprosic czlowieka. */}
          <p className="mt-2 text-xs text-brand-800/55">
            {t.panel.pendingHint}
          </p>
        </div>
      )}
    </section>
  );
}

/** Ta sama nazwa linii, którą gość widzi na swoim pasku bingo. */
export function describe(claim: Pick<PanelClaim, "kind" | "lineIndex">, t: Strings): string {
  return claimLabel({ kind: claim.kind, index: claim.lineIndex }, t.bingo);
}
