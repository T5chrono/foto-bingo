import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api";
import { categoryById, categoryLabel } from "../lib/board";
import { errorText } from "../lib/errors";
import { prepare } from "../lib/image";
import * as queue from "../lib/queue";
import { drain, originalAllowed, type Progress } from "../lib/uploader";
import { useBoard } from "../hooks/useBoard";
import { useLocale } from "../hooks/useLocale";
import type { Strings } from "../lib/strings/pl";
import { BackButton } from "../components/BackButton";
import { PlayBadge } from "../components/PlayBadge";
import { MeadowBand } from "../components/wedding/Meadow";
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
  | "waitingWifi"
  | "failed";

/**
 * Jeden kafelek z bliska.
 *
 * Ekran ma dwa życia. Na pustym kafelku jest formularzem: jeden duży przycisk
 * i zdanie o tym, że zasięg nie jest do niczego potrzebny. Na zdobytym jest
 * **zdjęciem** — gość wraca tu głównie po to, żeby zobaczyć, co właściwie
 * wysłał wczoraj wieczorem, a nie żeby cokolwiek zmieniać. Dlatego fotografia
 * dostaje całą wolną wysokość, a obie decyzje stoją pod nią w kolejności
 * odwrotnej do ryzyka: zamiana jest dużym przyciskiem, usunięcie zwykłym,
 * i dopiero po dotknięciu pyta o potwierdzenie.
 */
export default function CategoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const { locale, t } = useLocale();
  const fileInput = useRef<HTMLInputElement>(null);
  const { tiles, jobs, refreshJobs } = useBoard();

  const category = categoryById(Number(id));
  const tile = category ? tiles.get(category.id) : undefined;

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sizeInfo, setSizeInfo] = useState<string | null>(null);
  const [originalRatio, setOriginalRatio] = useState(0);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [removing, setRemoving] = useState(false);

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

  // Świeżo wybrane zdjęcie wygrywa z tym z serwera: leży już w pamięci telefonu
  // i pokazuje się natychmiast, także wtedy, gdy podgląd dopiero leci w górę.
  const shown = preview ?? tile?.previewUrl ?? tile?.thumbUrl ?? null;
  const onServer = Boolean(tile?.thumbUrl);
  // Zablokowany kafelek (nieudana wysyłka) też da się zwolnić — inaczej gość
  // zostaje z polem, którego nie umie ani wysłać, ani wyczyścić.
  const canRemove = Boolean(shown || tile?.pending || tile?.failed);
  const isVideo = tile?.kind === "video";

  // Film, którego klatka już stoi na planszy, a oryginał leży w telefonie
  // i czeka na Wi-Fi. Na iPhonie czeka na palec gościa, bo Safari nie mówi,
  // jaka to sieć — i właśnie dlatego ten stan dostaje własną kartę z guzikiem,
  // a nie pasek postępu, który nigdy nie ruszy.
  const job = jobs.find((j) => j.categoryId === category.id && j.state !== "done");
  const waitingVideo =
    job && job.kind === "video" && job.previewDone && job.originalChunks > 0 && !originalAllowed(job)
      ? job
      : null;

  /** Jeden odbiornik postępu dla wysyłki po wyborze pliku i po „wyślij teraz". */
  function track(p: Progress) {
    if (p.waiting === "wifi") {
      setPhase("waitingWifi");
      return;
    }
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
          `${encoded.preview.width}×${encoded.preview.height}` +
          (encoded.kind === "video" ? ` · ${seconds(encoded.durationMs)}` : ""),
      );

      await queue.enqueue({
        photoId: crypto.randomUUID(),
        categoryId: category!.id,
        ext: encoded.preview.ext,
        mime: encoded.preview.blob.type,
        preview: await encoded.preview.blob.arrayBuffer(),
        thumb: await encoded.thumb.blob.arrayBuffer(),
        kind: encoded.kind,
        durationMs: encoded.durationMs,
        // Oryginal czeka na Etap 3. Kolejka kopiuje go od razu, kawalek po
        // kawalku, bo galeria telefonu moze go do tego czasu przemielic —
        // a drugi raz gosc go nie wybierze. Sam plik nie idzie do pamieci
        // w calosci: przy filmie to bylby koniec karty na starszym iPhonie.
        original: file,
        originalMime: file.type || "image/jpeg",
        originalName: file.name || null,
        width: encoded.preview.width,
        height: encoded.preview.height,
        originalBytes: encoded.originalBytes,
      });

      setPhase("queued");
      await refreshJobs();
      await drain(track);

      await client.invalidateQueries({ queryKey: ["me"] });
      if (navigator.onLine) await api.me().catch(() => null);
    } catch (err) {
      setPhase("failed");
      setError(errorText(err, t, t.category.unknownError));
    }
  }

  /** „Wyślij teraz" — gość bierze na siebie dane komórkowe za ten jeden film. */
  async function handleSendNow(j: queue.Job) {
    setError(null);
    await queue.patch(j.photoId, { sendNow: true });
    await refreshJobs();
    setPhase("queued");
    await drain(track);
  }

  /**
   * Zdejmuje zdjęcie z kafelka — z telefonu i z serwera.
   *
   * Kolejność ma znaczenie: najpierw znika zadanie z kolejki, bo zdjęcie,
   * które właśnie leci w górę, wróciłoby na kafelek chwilę po tym, jak serwer
   * je stamtąd zdjął. Oryginał na Dysku zostaje — kasuje się wersja robocza,
   * a nie wspomnienie.
   */
  async function handleRemove() {
    setRemoving(true);
    setError(null);

    try {
      const job = await queue.jobFor(category!.id);
      if (job) await queue.remove(job.photoId);
      await refreshJobs();

      if (onServer) await api.removePhoto(category!.id);
      // Zdjęcie, które nigdy nie doszło do serwera, kasuje się w całości
      // w telefonie. Brak zasięgu nie jest tu awarią, tylko brakiem roboty.
      else await api.removePhoto(category!.id).catch(() => null);

      await client.invalidateQueries({ queryKey: ["me"] });
      // Powrót na planszę jest potwierdzeniem: gość widzi zwolniony kafelek,
      // a nie zdanie o tym, że coś się udało.
      navigate("/");
    } catch (err) {
      setRemoving(false);
      setConfirmingRemoval(false);
      setPhase("failed");
      setError(errorText(err, t, t.category.removeFailed));
    }
  }

  /**
   * Guziki ekranu. Stoją w zmiennej, bo trafiają w dwa różne miejsca układu:
   * pod zdjęciem albo tuż pod nazwą kategorii — a to ma być ten sam guzik,
   * nie dwa podobne.
   */
  const akcje = confirmingRemoval ? (
    <section className="rounded-2xl border border-clay-300 bg-clay-50 px-4 py-3">
      <p className="font-medium text-clay-900">{t.category.removeAsk}</p>
      <p className="mt-1 text-xs text-clay-900/70">{t.category.removeNote}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void handleRemove()}
          disabled={removing}
          className="flex-1 rounded-xl bg-clay-700 px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {removing ? t.category.removing : t.category.removeYes}
        </button>
        <button
          type="button"
          onClick={() => setConfirmingRemoval(false)}
          disabled={removing}
          className="flex-1 rounded-xl border border-brand-300 bg-paper px-4 py-3 font-medium text-brand-800"
        >
          {t.category.removeNo}
        </button>
      </div>
    </section>
  ) : (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={phase === "processing"}
        className="rounded-2xl bg-brand-700 px-5 py-3.5 text-lg font-medium text-white disabled:opacity-50"
      >
        {shown ? t.category.replace : t.category.pick}
      </button>

      {canRemove && (
        <button
          type="button"
          onClick={() => setConfirmingRemoval(true)}
          className="rounded-2xl border border-clay-300 bg-paper px-5 py-2.5 font-medium text-clay-700"
        >
          {t.category.remove}
        </button>
      )}
    </div>
  );

  return (
    <main className="mx-auto flex h-dvh max-w-md flex-col gap-3 overflow-hidden px-4 pt-3 pb-[var(--meadow-h)]">
      <BackButton />

      {/* Nazwa kategorii stoi na środku razem z gałązką pod spodem — tak samo,
          jak nagłówki na zaproszeniu i jak podpis na papierowym kafelku. */}
      <header className="flex flex-col items-center gap-1 text-center">
        <p className="text-xs tracking-widest text-brand-500 uppercase">
          R{category.row}K{category.col}
        </p>
        <h1 className="text-xl leading-tight font-semibold text-brand-800">
          {categoryLabel(category, locale)}
        </h1>
        <Sprig />
      </header>

      {shown ? (
        <>
          {/* Zdjęcie i guziki są **jedną grupą** i to jest tu cały trik.
              Obrazek dostaje `max-h-full`, czyli tyle wysokości, ile zostało
              po nagłówku, i kurczy się razem z kolumną, gdy trzeba zrobić
              miejsce na guziki — a szerokość idzie za wysokością, bo proporcje
              trzyma sam plik. Pudełko obrazka kończy się więc dokładnie tam,
              gdzie kończy się fotografia: kategoria styka się z nią od góry,
              guziki od dołu, i nigdzie nie ma pasa pustego papieru.

              Działa tak samo dla zdjęć pionowych i poziomych. Przy poziomych
              zapas zostaje pod guzikami, czyli tam, gdzie i tak rośnie łąka. */}
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {/* Pudełko wokół obrazka istnieje tylko po to, żeby znaczek filmu
                miał do czego się przykleić — poza tym ma być niewidoczne,
                więc bierze dokładnie wymiary obrazka i ani piksela więcej. */}
            <div className="relative mx-auto flex min-h-0 max-w-full shrink justify-center">
              <img
                src={shown}
                alt={
                  isVideo
                    ? preview
                      ? t.category.chosenVideo
                      : t.category.yourVideo
                    : preview
                      ? t.category.chosenPhoto
                      : t.category.yourPhoto
                }
                className="max-h-full max-w-full min-h-0 rounded-2xl object-contain"
              />
              {isVideo && (
                <PlayBadge className="absolute top-2 left-2 size-8" title={t.board.tileVideo} />
              )}
            </div>
            {waitingVideo && <WifiCard job={waitingVideo} onSendNow={handleSendNow} t={t} />}
            {akcje}
          </div>
        </>
      ) : (
        <>
          {/* Pusty kafelek to jedno pytanie: „które zdjęcie?". Guzik zostaje
              tuż pod nazwą kategorii, bo między jednym a drugim nie ma nic do
              przeczytania — ale z odstępem, żeby nie wyglądał jak część
              nagłówka i żeby kciuk nie sięgał po niego w biegu. */}
          {/* Karta Wi-Fi także tutaj: klatka jest już na serwerze, ale bez
              zasięgu plansza nie dostała jej adresu i nie ma czego pokazać —
              a guzik „wyślij teraz" ma być tam, gdzie gość go szuka. */}
          {waitingVideo && <WifiCard job={waitingVideo} onSendNow={handleSendNow} t={t} />}
          <div className={waitingVideo ? "" : "mt-6"}>{akcje}</div>
          <p className="text-center text-sm text-brand-800/55">{t.category.offline}</p>
        </>
      )}

      {/* PIERWSZE SITO — i jedyne, które gość widzi.
          Podpowiedź dla okna wyboru pliku, nie zabezpieczenie: w każdym
          systemie da się przełączyć na „wszystkie pliki". Prawdziwe sita
          stoją dalej — `prepare()` czyta pierwsze bajty, a serwer sprawdza je
          jeszcze raz przy pierwszym kawałku oryginału.

          Filmy wchodzą tą samą drogą: `prepare()` wycina klatkę z pierwszej
          sekundy, kolejka kroi oryginał na kawałki, a na Dysk jedzie dopiero
          po Wi-Fi albo po „wyślij teraz". */}
      <input
        ref={fileInput}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Wyzerowanie pozwala wybrać ten sam plik ponownie po nieudanej próbie.
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />

      <StatusLine
        phase={phase}
        error={error}
        sizeInfo={sizeInfo}
        originalRatio={originalRatio}
        t={t}
      />

      <MeadowBand />
    </main>
  );
}

/**
 * Karta „film czeka na Wi-Fi".
 *
 * Stoi między klatką a guzikami, bo to jest informacja o TYM filmie, a nie
 * o stanie wysyłki. Rozmiar w guziku jest celowy: gość ma wiedzieć, na ile
 * megabajtów się zgadza, zanim dotknie — to jego pakiet, nie nasz.
 */
function WifiCard({
  job,
  onSendNow,
  t,
}: {
  job: queue.Job;
  onSendNow: (job: queue.Job) => Promise<void>;
  t: Strings;
}) {
  return (
    <section className="rounded-2xl border border-brand-300 bg-brand-50 px-4 py-3">
      <p className="font-medium text-brand-800">{t.category.waitingWifi}</p>
      <p className="mt-1 text-xs text-brand-800/70">{t.category.waitingWifiHint}</p>
      <button
        type="button"
        onClick={() => void onSendNow(job)}
        className="mt-3 w-full rounded-xl border border-brand-400 bg-paper px-4 py-2.5 font-medium text-brand-800"
      >
        {t.category.sendNow(kb(job.originalBytes))}
      </button>
    </section>
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
    <div className={`rounded-xl px-4 py-2.5 text-sm ${tone}`} role="status" aria-live="polite">
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

/** `1:07` — długość filmu przy rozmiarze, żeby gość widział, co wybrał. */
function seconds(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
