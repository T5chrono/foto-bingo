import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type PanelClaim, type PanelStats } from "../lib/api";
import { BOARD } from "../lib/board";
import { GOSCIE, NOWE_ZGLOSZENIA, ORYGINALY, ZDJECIA, count } from "../lib/plural";

export default function PanelPage() {
  const session = useQuery({ queryKey: ["panel", "session"], queryFn: api.panelSession });

  if (session.isLoading) {
    return <p className="p-8 text-center text-ink/50">Chwileczkę…</p>;
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
      <h1 className="text-center text-xl font-semibold text-brand-800">Panel Pary Młodej</h1>

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
          className="rounded-xl border border-brand-200 bg-white px-4 py-3 text-center text-2xl tracking-[0.4em]"
        />
        <button
          type="submit"
          disabled={pin.length < 4 || send.isPending}
          className="rounded-xl bg-brand-700 px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {send.isPending ? "Sprawdzam…" : "Wejdź"}
        </button>
      </form>

      {error && <p className="text-center text-sm text-amber-900">{error}</p>}
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
        <h1 className="text-xl font-semibold text-brand-800">Panel Pary Młodej</h1>
        <button
          onClick={async () => {
            await api.panelLogout();
            void client.invalidateQueries({ queryKey: ["panel"] });
          }}
          className="text-sm text-ink/50 underline"
        >
          Wyjdź
        </button>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-medium text-ink/50">
          Zgłoszenia {nowe.length > 0 && `· ${count(nowe.length, NOWE_ZGLOSZENIA)}`}
        </h2>
        {nowe.length === 0 && reszta.length === 0 ? (
          <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-ink/40">
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
        <h2 className="mb-2 text-sm font-medium text-ink/50">Zdjęcia po kategoriach</h2>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {BOARD.map((cat) => (
            <Link
              key={cat.id}
              to={`/panel/kategoria/${cat.id}`}
              className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-xs leading-tight text-ink/75 hover:border-brand-400"
            >
              <span className="block text-[0.6rem] text-ink/35">
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
        ? "border-brand-200 bg-white"
        : "border-amber-300 bg-amber-50";

  return (
    <li>
      <Link
        to={`/panel/zgloszenie/${claim.id}`}
        className={`flex items-center justify-between rounded-xl border px-4 py-3 ${tone}`}
      >
        <span>
          <span className="font-medium text-ink">{claim.guestName}</span>
          <span className="ml-2 text-sm text-ink/60">{describe(claim)}</span>
        </span>
        <span className="text-xs text-ink/40">
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
    <section className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-4">
      <h2 className="text-sm font-medium text-ink/50">Stan zbiórki</h2>

      <p className="text-sm text-ink/70">
        {count(stats.photos, ZDJECIA)} od {count(stats.guests, GOSCIE)}
      </p>

      <div>
        <p className="mb-1 text-xs text-ink/50">
          Miejsce: {mb(stats.usedBytes)} / {mb(stats.limitBytes)}
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-brand-100">
          <div
            className={ratio > 0.75 ? "h-full bg-amber-500" : "h-full bg-brand-600"}
            style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
          />
        </div>
      </div>

      {stats.pendingOriginals.length > 0 && (
        <div>
          <p className="text-xs text-ink/50">Oryginały w drodze</p>
          <ul className="mt-1 text-sm text-ink/70">
            {stats.pendingOriginals.map((p) => (
              <li key={p.guestName}>
                {p.guestName} — {count(p.count, ORYGINALY)}
              </li>
            ))}
          </ul>
          {/* Serwer nie moze doslac oryginalu, bo lezy na telefonie goscia.
              Jedyne, co da sie zrobic, to poprosic czlowieka. */}
          <p className="mt-2 text-xs text-ink/40">
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
