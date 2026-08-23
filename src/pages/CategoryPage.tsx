import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api";
import { categoryById, categoryLabel } from "../lib/board";
import { errorText } from "../lib/errors";
import { prepare } from "../lib/image";
import * as queue from "../lib/queue";
import { drain } from "../lib/uploader";
import { useLocale } from "../hooks/useLocale";
import type { Strings } from "../lib/strings/pl";
import { Meadow } from "../components/wedding/Meadow";
import { Sprig } from "../components/wedding/Sprig";

/**
 * Etapy wysyłki. Nazwy są **kodami, nie napisami** — wcześniej stan trzymał
 * wprost polskie zdanie i wyświetlał je jeden do jednego, co przy dwóch
 * językach oznaczałoby polski pasek postępu na angielskim ekranie.
 */
type Phase =
  | "idle"
  | "processing"
  | "queued"
  | "uploading"
  | "saved"
  | "originalOnTheWay"
  | "failed";

export default function CategoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const { locale, t } = useLocale();
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
      <p className="p-6 text-center text-brand-800/70">
        {t.category.missing}{" "}
        <button className="underline" onClick={() => navigate("/")}>
          {t.category.backToBoard}
        </button>
      </p>
    );
  }

  async function handleFile(file: File) {
    setError(null);
    setPhase("processing");

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

      setPhase("queued");

      await drain((p) => {
        if (p.phase === "preview") {
          if (p.state === "uploading") setPhase("uploading");
          // Podglad doszedl — kafelek jest zapelniony i zdjecie liczy sie do
          // bingo. Oryginal idzie dalej w tle i nikt na niego nie czeka.
          if (p.state === "done") setPhase("saved");
        } else if (p.state === "uploading") {
          setPhase("originalOnTheWay");
          setOriginalRatio(p.ratio ?? 0);
        } else if (p.state === "done") {
          setPhase("saved");
          setOriginalRatio(1);
        }
        if (p.state === "failed") {
          setPhase("failed");
          // `p.code` jest przetłumaczalny; `p.error` to polski zapis awaryjny.
          setError(errorText(p, t, t.category.sendFailed));
        }
      });

      await client.invalidateQueries({ queryKey: ["me"] });
      if (navigator.onLine) await api.me().catch(() => null);
    } catch (err) {
      setPhase("failed");
      setError(errorText(err, t, t.category.unknownError));
    }
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-5 px-4 py-5">
      <button
        onClick={() => navigate("/")}
        className="self-start text-sm text-brand-700 underline"
      >
        {t.category.board}
      </button>

      <header className="flex flex-col gap-1.5">
        <p className="text-xs tracking-widest text-brand-500 uppercase">
          R{category.row}K{category.col}
        </p>
        <h1 className="text-2xl leading-tight font-semibold text-brand-800">
          {categoryLabel(category, locale)}
        </h1>
        <Sprig className="mt-1" />
      </header>

      {preview && (
        <img
          src={preview}
          alt={t.category.chosenPhoto}
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
        disabled={phase === "processing"}
        className="rounded-2xl bg-brand-700 px-5 py-4 text-lg font-medium text-white disabled:opacity-50"
      >
        {preview ? t.category.change : t.category.pick}
      </button>

      <StatusLine
        phase={phase}
        error={error}
        sizeInfo={sizeInfo}
        originalRatio={originalRatio}
        t={t}
      />

      <p className="mt-auto text-center text-xs text-brand-800/55">{t.category.offline}</p>

      <Meadow className="-mx-4 -mb-5" />
    </main>
  );
}

function StatusLine({
  phase,
  error,
  sizeInfo,
  originalRatio,
  t,
}: {
  phase: Phase;
  error: string | null;
  sizeInfo: string | null;
  originalRatio: number;
  t: Strings;
}) {
  if (phase === "idle") return null;

  const tone =
    phase === "saved"
      ? "bg-brand-50 text-brand-800"
      : phase === "failed"
        ? "bg-clay-50 text-clay-900"
        : "bg-paper text-brand-800/75 border border-brand-200";

  // Etapy przejściowe dostają wielokropek, dwa stany końcowe mają własne zdanie.
  const headline =
    phase === "saved"
      ? t.category.saved
      : phase === "failed"
        ? t.category.failed
        : `${t.category.phase[phase]}…`;

  return (
    <div className={`rounded-xl px-4 py-3 text-sm ${tone}`} role="status" aria-live="polite">
      <p className="font-medium">{headline}</p>
      {error && <p className="mt-1 text-xs">{error}</p>}
      {sizeInfo && !error && <p className="mt-1 text-xs opacity-60">{sizeInfo}</p>}
      {phase === "originalOnTheWay" && (
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
