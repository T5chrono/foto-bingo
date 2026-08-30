import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  api,
  type Leader,
  type LineStanding,
  type PanelClaim,
  type PanelStats,
} from "../lib/api";
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
  // Wolniej niz zgloszenia, bo to jedyne zapytanie, ktore czyta cala tabele
  // zdjec. Pol minuty wystarczy: nagrode za wiersz wreczy sie i tak dopiero
  // wtedy, gdy ktos podejdzie z telefonem, a panel odswieza sie tez sam po
  // powrocie na wierzch.
  const results = useQuery({
    queryKey: ["panel", "results"],
    queryFn: api.panelResults,
    refetchInterval: 30_000,
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

      {results.data && <LineWinners lines={results.data.lines} t={t} />}
      {results.data && <MainPrize leaders={results.data.leaders} t={t} />}

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

/**
 * Godzina ukonczenia, nie data.
 *
 * Wesele trwa jeden weekend, wiec dzien tygodnia plus godzina mowi wszystko,
 * a pelna data zajmowalaby pol wiersza. Format bierze jezyk panelu, zeby
 * "sob 21:37" i "Sa. 21:37" nie stalo obok siebie w jednej tabelce.
 */
function useClock(lang: string) {
  return useMemo(
    () =>
      new Intl.DateTimeFormat(lang, {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [lang],
  );
}

/**
 * Dwanascie linii i osoba, ktora zamknela kazda z nich jako pierwsza.
 *
 * Linie nieukonczone tez tu stoja, wyszarzone. Para Mloda ma widziec **komplet
 * nagrod**, takze te jeszcze nierozdane — lista, ktora rosnie z niczego, nie
 * mowi, ile zostalo do konca zabawy.
 *
 * Kolejnosc jest kolejnoscia zdjec, nie zgloszen. Zgloszenie mowi tylko, kto
 * zdazyl kliknac "Zglos bingo"; tutaj liczy sie moment, w ktorym doszlo ostatnie
 * brakujace zdjecie linii. Kto zglosil, widac w sekcji zgloszen wyzej.
 */
function LineWinners({ lines, t }: { lines: LineStanding[]; t: Strings }) {
  const clock = useClock(t.htmlLang);

  return (
    <section>
      <h2 className="mb-1 text-sm font-medium text-brand-800/60">{t.panel.lineWinners}</h2>
      <p className="mb-2 text-xs text-brand-800/55">{t.panel.lineWinnersHint}</p>

      <ul className="flex flex-col gap-1">
        {lines.map((line) => {
          const [winner, ...rest] = line.finishers;

          return (
            <li
              key={`${line.kind}-${line.index}`}
              className={`flex items-baseline justify-between gap-3 rounded-xl border px-4 py-2 ${
                winner ? "border-brand-300 bg-brand-50" : "border-brand-200 bg-paper"
              }`}
            >
              <span className="shrink-0 text-sm text-brand-800/70">
                {claimLabel({ kind: line.kind, index: line.index }, t.bingo)}
              </span>

              {winner ? (
                <span className="flex min-w-0 items-baseline justify-end gap-2">
                  <span className="truncate font-medium text-ink">{winner.guestName}</span>
                  <span className="shrink-0 text-xs text-brand-800/55">
                    {clock.format(new Date(winner.completedAt))}
                  </span>
                  {rest.length > 0 && (
                    <span
                      title={t.panel.moreFinishers(rest.length)}
                      className="shrink-0 rounded-full bg-brand-200 px-1.5 text-[0.65rem] text-brand-800/70"
                    >
                      +{rest.length}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-sm text-brand-800/40">{t.panel.lineNobody}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Pretendent do nagrody glownej i pierwsza piatka za nim.
 *
 * Piatka, a nie wszyscy: przy czterdziestu gosciach pelna lista to ekran
 * przewijania, na ktorym i tak liczy sie gora. Kto stoi nizej, widac po
 * kategoriach.
 */
function MainPrize({ leaders, t }: { leaders: Leader[]; t: Strings }) {
  const top = leaders.slice(0, 5);

  return (
    <section className="rounded-2xl border border-brand-200 bg-paper px-4 py-4">
      <h2 className="text-sm font-medium text-brand-800/60">{t.panel.mainPrize}</h2>
      <p className="mt-1 text-xs text-brand-800/55">{t.panel.mainPrizeHint}</p>

      {top.length === 0 ? (
        <p className="mt-3 text-sm text-brand-800/55">{t.panel.noPhotosYet}</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-1.5">
          {top.map((leader, i) => (
            <li key={leader.guestId} className="flex items-baseline gap-3">
              <span className="w-4 shrink-0 text-xs text-brand-800/45">{i + 1}.</span>
              <span
                className={`min-w-0 flex-1 truncate ${
                  i === 0 ? "font-medium text-ink" : "text-brand-800/80"
                }`}
              >
                {leader.guestName}
              </span>
              <span className="shrink-0 text-sm text-brand-800/70">
                {t.panel.photoCount(leader.photos)}
              </span>
              {/* Pasek zamiast drugiej liczby: roznica miedzy 18 a 11 zdjeciami
                  ma byc widoczna z drugiego konca stolu, a nie do przeczytania. */}
              <span className="hidden h-1 w-20 shrink-0 overflow-hidden rounded-full bg-brand-100 sm:block">
                <span
                  className="block h-full rounded-full bg-brand-500"
                  style={{ width: `${Math.round((leader.photos / (top[0]?.photos || 1)) * 100)}%` }}
                />
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
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
