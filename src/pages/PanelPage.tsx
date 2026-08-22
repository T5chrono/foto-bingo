import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type PanelClaim, type PanelStats } from "../lib/api";
import { BOARD } from "../lib/board";
import { GOSCIE, NOWE_ZGLOSZENIA, ORYGINALY, ZDJECIA, count } from "../lib/plural";
import { Hills } from "../components/wedding/Hills";
import { Sprig } from "../components/wedding/Sprig";

export default function PanelPage() {
  const session = useQuery({ queryKey: ["panel", "session"], queryFn: api.panelSession });

  if (session.isLoading) {
    return <p className="p-8 text-center text-brand-800/60">Chwileczkę…</p>;
  }
  return session.data?.ok ? <Dashboard /> : <Login />;
}

function Login() {
  const client = useQueryClient();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: () => api.panelLogin(pin),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["panel"] }),
    onError: (e) => setError(e instanceof Error ? e.message : "Nie wyszło"),
  });

  return (
    <main className="mx-auto flex min-h-full max-w-sm flex-col justify-center gap-4 px-6 py-10">
      <Hills className="h-36" />

      <div className="flex flex-col items-center gap-1.5">
        <h1 className="font-script pb-1 text-center text-3xl text-ink">Panel Pary Młodej</h1>
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
          placeholder="PIN"
          aria-label="PIN do panelu"
          className="rounded-xl border border-brand-400 bg-paper px-4 py-3 text-center text-2xl tracking-[0.4em] text-brand-800"
        />
        <button
          type="submit"
          disabled={pin.length < 4 || send.isPending}
          className="rounded-xl bg-brand-700 px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {send.isPending ? "Sprawdzam…" : "Wejdź"}
        </button>
      </form>

      {error && <p className="text-center text-sm text-clay-900">{error}</p>}
    </main>
  );
}

function Dashboard() {
  const client = useQueryClient();

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
        <h1 className="font-script pb-1 text-3xl text-ink">Panel Pary Młodej</h1>
        <button
          onClick={async () => {
            await api.panelLogout();
            void client.invalidateQueries({ queryKey: ["panel"] });
          }}
          className="text-sm text-brand-800/60 underline"
        >
          Wyjdź
        </button>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-medium text-brand-800/60">
          Zgłoszenia {nowe.length > 0 && `· ${count(nowe.length, NOWE_ZGLOSZENIA)}`}
        </h2>
        {nowe.length === 0 && reszta.length === 0 ? (
          <p className="rounded-xl border border-brand-200 bg-paper px-4 py-6 text-center text-sm text-brand-800/55">
            Jeszcze nikt nie zgłosił bingo.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {[...nowe, ...reszta].map((claim) => (
              <ClaimRow key={claim.id} claim={claim} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-brand-800/60">Zdjęcia po kategoriach</h2>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {BOARD.map((cat) => (
            <Link
              key={cat.id}
              to={`/panel/kategoria/${cat.id}`}
              className="rounded-lg border border-brand-400 bg-paper px-3 py-2 text-xs leading-tight text-brand-800 hover:border-brand-600"
            >
              <span className="block text-[0.6rem] text-brand-800/50">
                R{cat.row}K{cat.col}
              </span>
              {cat.label}
            </Link>
          ))}
        </div>
      </section>

      {stats.data && <Stats stats={stats.data} />}
    </main>
  );
}

function ClaimRow({ claim }: { claim: PanelClaim }) {
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
          <span className="ml-2 text-sm text-brand-800/70">{describe(claim)}</span>
        </span>
        <span className="text-xs text-brand-800/55">
          {claim.status === "new"
            ? "do sprawdzenia"
            : claim.status === "accepted"
              ? "uznane ✓"
              : "odrzucone"}
        </span>
      </Link>
    </li>
  );
}

function Stats({ stats }: { stats: PanelStats }) {
  const mb = (n: number) => `${Math.round(n / 1024 / 1024)} MB`;
  const ratio = stats.usedBytes / stats.limitBytes;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-paper px-4 py-4">
      <h2 className="text-sm font-medium text-brand-800/60">Stan zbiórki</h2>

      <p className="text-sm text-brand-800/75">
        {count(stats.photos, ZDJECIA)} od {count(stats.guests, GOSCIE)}
      </p>

      <div>
        <p className="mb-1 text-xs text-brand-800/60">
          Miejsce: {mb(stats.usedBytes)} / {mb(stats.limitBytes)}
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
          <p className="text-xs text-brand-800/60">Oryginały w drodze</p>
          <ul className="mt-1 text-sm text-brand-800/75">
            {stats.pendingOriginals.map((p) => (
              <li key={p.guestName}>
                {p.guestName} — {count(p.count, ORYGINALY)}
              </li>
            ))}
          </ul>
          {/* Serwer nie moze doslac oryginalu, bo lezy na telefonie goscia.
              Jedyne, co da sie zrobic, to poprosic czlowieka. */}
          <p className="mt-2 text-xs text-brand-800/55">
            Poproś te osoby o otwarcie aplikacji — zdjęcia dojdą same.
          </p>
        </div>
      )}
    </section>
  );
}

export function describe(claim: Pick<PanelClaim, "kind" | "lineIndex">): string {
  if (claim.kind === "full") return "pełna karta";
  if (claim.kind === "row") return `wiersz ${claim.lineIndex}`;
  if (claim.kind === "col") return `kolumna ${claim.lineIndex}`;
  return claim.lineIndex === 1 ? "przekątna ↘" : "przekątna ↙";
}
