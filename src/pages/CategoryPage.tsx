import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api";
import { categoryById } from "../lib/board";
import { prepare } from "../lib/image";
import * as queue from "../lib/queue";
import { drain } from "../lib/uploader";

type Phase =
  | "idle"
  | "przetwarzanie"
  | "w kolejce"
  | "wysyłanie"
  | "zapisane"
  | "oryginał w drodze"
  | "błąd";

export default function CategoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const category = categoryById(Number(id));
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sizeInfo, setSizeInfo] = useState<string | null>(null);
  const [originalRatio, setOriginalRatio] = useState(0);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  if (!category) {
    return (
      <p className="p-6 text-center text-ink/60">
        Nie ma takiej kategorii.{" "}
        <button className="underline" onClick={() => navigate("/")}>
          Wróć na planszę
        </button>
      </p>
    );
  }

  async function handleFile(file: File) {
    setError(null);
    setPhase("przetwarzanie");

    try {
      // Budżet przychodzi z serwera, nie jest zaszyty w aplikacji — dzięki temu
      // da się zejść z jakością bez deployu i bez czekania, aż 40 telefonów
      // pobierze nowego service workera.
      const budget = client.getQueryData<{ budget: Parameters<typeof prepare>[1] }>(["me"])
        ?.budget ?? {
        preview: { maxEdge: 1600, maxBytes: 350 * 1024 },
        thumb: { maxEdge: 400, maxBytes: 30 * 1024 },
      };

      const encoded = await prepare(file, budget);

      setPreview(URL.createObjectURL(encoded.preview.blob));
      setSizeInfo(
        `${kb(encoded.originalBytes)} → ${kb(encoded.preview.blob.size)} · ` +
          `${encoded.preview.width}×${encoded.preview.height}`,
      );

      await queue.enqueue({
        photoId: crypto.randomUUID(),
        categoryId: category!.id,
        ext: encoded.preview.ext,
        mime: encoded.preview.blob.type,
        preview: await encoded.preview.blob.arrayBuffer(),
        thumb: await encoded.thumb.blob.arrayBuffer(),
        // Oryginal czeka na Etap 3. Trzymamy go od razu, bo galeria telefonu
        // moze go do tego czasu przemielic — a drugi raz gosc go nie wybierze.
        original: await file.arrayBuffer(),
        originalMime: file.type || "image/jpeg",
        originalName: file.name || null,
        width: encoded.preview.width,
        height: encoded.preview.height,
        originalBytes: encoded.originalBytes,
      });

      setPhase("w kolejce");

      await drain((p) => {
        if (p.phase === "preview") {
          if (p.state === "uploading") setPhase("wysyłanie");
          // Podglad doszedl — kafelek jest zapelniony i zdjecie liczy sie do
          // bingo. Oryginal idzie dalej w tle i nikt na niego nie czeka.
          if (p.state === "done") setPhase("zapisane");
        } else if (p.state === "uploading") {
          setPhase("oryginał w drodze");
          setOriginalRatio(p.ratio ?? 0);
        } else if (p.state === "done") {
          setPhase("zapisane");
          setOriginalRatio(1);
        }
        if (p.state === "failed") {
          setPhase("błąd");
          setError(p.error ?? "Nie udało się wysłać");
        }
      });

      await client.invalidateQueries({ queryKey: ["me"] });
      if (navigator.onLine) await api.me().catch(() => null);
    } catch (err) {
      setPhase("błąd");
      setError(err instanceof Error ? err.message : "Coś poszło nie tak");
    }
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-5 px-4 py-5">
      <button
        onClick={() => navigate("/")}
        className="self-start text-sm text-brand-700 underline"
      >
        ← Plansza
      </button>

      <header>
        <p className="text-xs font-medium text-ink/40">
          R{category.row}K{category.col}
        </p>
        <h1 className="text-2xl leading-tight font-semibold text-brand-800">
          {category.label}
        </h1>
      </header>

      {preview && (
        <img
          src={preview}
          alt="Wybrane zdjęcie"
          className="w-full rounded-2xl border border-brand-200 object-cover"
        />
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Wyzerowanie pozwala wybrać ten sam plik ponownie po nieudanej próbie.
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />

      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={phase === "przetwarzanie"}
        className="rounded-2xl bg-brand-700 px-5 py-4 text-lg font-medium text-white disabled:opacity-50"
      >
        {preview ? "Zmień zdjęcie" : "Wybierz zdjęcie"}
      </button>

      <StatusLine
        phase={phase}
        error={error}
        sizeInfo={sizeInfo}
        originalRatio={originalRatio}
      />

      <p className="mt-auto text-center text-xs text-ink/40">
        Zdjęcie możesz wysłać bez zasięgu — poczeka w telefonie i doleci samo.
      </p>
    </main>
  );
}

function StatusLine({
  phase,
  error,
  sizeInfo,
  originalRatio,
}: {
  phase: Phase;
  error: string | null;
  sizeInfo: string | null;
  originalRatio: number;
}) {
  if (phase === "idle") return null;

  const tone =
    phase === "zapisane"
      ? "bg-brand-50 text-brand-800"
      : phase === "błąd"
        ? "bg-amber-50 text-amber-900"
        : "bg-white text-ink/70 border border-brand-200";

  return (
    <div className={`rounded-xl px-4 py-3 text-sm ${tone}`} role="status" aria-live="polite">
      <p className="font-medium">
        {phase === "zapisane" ? "Zapisane ✓" : phase === "błąd" ? "Nie wyszło" : `${phase}…`}
      </p>
      {error && <p className="mt-1 text-xs">{error}</p>}
      {sizeInfo && !error && <p className="mt-1 text-xs opacity-60">{sizeInfo}</p>}
      {phase === "oryginał w drodze" && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-brand-100">
          <div
            className="h-full bg-brand-600 transition-[width]"
            style={{ width: `${Math.round(originalRatio * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function kb(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}
