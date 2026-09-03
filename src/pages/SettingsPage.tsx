import { useEffect, useState } from "react";

import * as queue from "../lib/queue";
import { drain, originalAllowed, setWifiOnly, watchProgress, wifiOnly } from "../lib/uploader";
import { categoryById, categoryLabel } from "../lib/board";
import { useLocale } from "../hooks/useLocale";
import { BackButton } from "../components/BackButton";
import { LanguagePicker } from "../components/LanguagePicker";
import { MeadowBand } from "../components/wedding/Meadow";

export default function SettingsPage() {
  const { locale, t } = useLocale();
  const [onlyWifi, setOnlyWifi] = useState(wifiOnly);
  const [jobs, setJobs] = useState<queue.Job[]>([]);

  // Kolejka odczytywana na nowo przy każdym kawałku, żeby licznik i pasek
  // szły do przodu na oczach gościa — to jest ten ekran, na który wchodzi
  // się z pytaniem „czy to w ogóle jeszcze idzie?".
  useEffect(() => watchProgress(() => void queue.allJobs().then(setJobs)), []);

  const czekaPodglad = jobs.filter((j) => !j.previewDone).length;
  const czekaOryginal = jobs.filter((j) => j.previewDone && j.originalChunks > 0).length;
  // Filmy, które nie ruszą same: bez Wi-Fi, a na iPhonie — bez palca gościa.
  const czekajaFilmy = jobs.filter(
    (j) => j.kind === "video" && j.previewDone && j.originalChunks > 0 && !originalAllowed(j),
  );

  // Co leci w tej chwili. Bierzemy z kolejki, nie ze zdarzeń: po wejściu
  // w ustawienia w środku wysyłki pasek ma być od razu, a nie po pierwszym
  // kawałku, który przy 3 MB na słabym zasięgu potrafi iść minutę.
  const wysylany = jobs.find(
    (j) => j.previewDone && j.originalChunks > 0 && (j.state === "uploading" || j.originalOffset > 0),
  );
  const wysylanyRatio =
    wysylany && wysylany.originalBytes > 0
      ? Math.min(1, wysylany.originalOffset / wysylany.originalBytes)
      : 0;
  const wysylanaKategoria = wysylany ? categoryById(wysylany.categoryId) : undefined;

  async function wyslijFilmy() {
    for (const j of czekajaFilmy) await queue.patch(j.photoId, { sendNow: true });
    setJobs(await queue.allJobs());
    void drain();
  }

  return (
    <main className="mx-auto flex h-dvh max-w-md flex-col gap-1.5 overflow-hidden px-4 pt-3 pb-[var(--meadow-h)]">
      <BackButton />

      {/* `leading-none`, bo pisanka ma wysokie pudełko wiersza: przy jednym
          słowie to kilkanaście pikseli powietrza nad i pod, których nie widać,
          a które decydują o tym, czy karty zmieszczą się bez przewijania. */}
      <h1 className="font-script text-xl leading-none text-ink">{t.settings.title}</h1>

      {/* Karty przewijają się w swoim polu, jeśli nie zmieszczą się co do
          piksela. Na telefonie, jaki naprawdę przyjedzie na wesele, mieszczą
          się **w całości** — łącznie z kolejką pełną po brzegi — i to jest
          powód, dla którego typografia niżej jest ciasna, a teksty krótkie:
          ustawienia otwiera się, żeby coś przestawić i wyjść, a nie czytać.
          Przewijanie zostaje jako wentyl na stary, niski ekran; wyjście na
          planszę zostaje wtedy tam, gdzie było, zamiast uciekać pod krawędź. */}
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {/* `flex-wrap`, bo od czterech języków pasek i podpis nie mieszczą się
            w jednym rzędzie na najwęższych telefonach. Wtedy przełącznik schodzi
            pod podpis, zamiast wypchnąć kartę poza ekran. */}
        <section className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-2xl border border-brand-200 bg-paper px-3.5 py-1.5">
          <span className="font-medium">{t.app.language}</span>
          <LanguagePicker />
        </section>

        <section className="rounded-2xl border border-brand-200 bg-paper px-3.5 py-1.5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={onlyWifi}
              onChange={(e) => {
                setOnlyWifi(e.target.checked);
                setWifiOnly(e.target.checked);
              }}
              className="mt-1 size-5 accent-brand-700"
            />
            <span>
              <span className="font-medium">{t.settings.wifiOnly}</span>
              <span className="mt-0.5 block text-[0.7rem] leading-snug text-brand-800/70">
                {t.settings.wifiOnlyHint}
              </span>
            </span>
          </label>
          {/* Przełącznik wyżej dotyczy zdjęć. Filmy nie mają przełącznika —
              zawsze czekają — i to zdanie ma o tym powiedzieć, zanim gość
              zacznie szukać, gdzie to wyłączyć. */}
          <p className="mt-1.5 text-[0.7rem] leading-snug text-brand-800/55">
            {t.settings.videosHint}
          </p>
        </section>

        <section className="rounded-2xl border border-brand-200 bg-paper px-3.5 py-1.5">
          <h2 className="text-sm font-medium text-brand-800/60">
            {t.settings.queue}
          </h2>
          {jobs.length === 0 ? (
            <p className="mt-0.5 text-sm text-brand-800/70">
              {t.settings.queueEmpty}
            </p>
          ) : (
            <ul className="mt-0.5 text-sm leading-snug text-brand-800/75">
              {czekaPodglad > 0 && (
                <li>{t.settings.queueWaiting(czekaPodglad)}</li>
              )}
              {czekaOryginal > 0 && (
                <li>{t.settings.queueOriginals(czekaOryginal)}</li>
              )}
              {czekajaFilmy.length > 0 && (
                <li>{t.settings.queueVideos(czekajaFilmy.length)}</li>
              )}
            </ul>
          )}
          {/* Co idzie TERAZ — z nazwą kafelka, bo „oryginał w drodze" bez
              wskazania którego nie daje się z niczym zestawić. */}
          {wysylany && wysylanaKategoria && (
            <div className="mt-1.5">
              <p className="flex items-baseline justify-between gap-2 text-xs text-brand-800/75">
                <span className="truncate">
                  {t.settings.sendingNow(categoryLabel(wysylanaKategoria, locale))}
                </span>
                <span className="shrink-0 tabular-nums">{Math.round(wysylanyRatio * 100)}%</span>
              </p>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-brand-100">
                <div
                  className="h-full bg-brand-600 transition-[width]"
                  style={{ width: `${Math.round(wysylanyRatio * 100)}%` }}
                />
              </div>
            </div>
          )}

          {czekajaFilmy.length > 0 && (
            <button
              type="button"
              onClick={() => void wyslijFilmy()}
              className="mt-1.5 w-full rounded-xl border border-brand-400 bg-paper px-4 py-1.5 text-sm font-medium text-brand-800"
            >
              {t.settings.sendVideosNow}
            </button>
          )}
          {/* Podpowiedź odpowiada na „czemu to nie rusza?", więc w trakcie
              wysyłki nie ma czego tłumaczyć — i zwalnia miejsce dokładnie
              wtedy, gdy zajmuje je pasek. Ekran zostaje bez przewijania. */}
          {!wysylany && (
            <p className="mt-1.5 text-[0.7rem] leading-snug text-brand-800/55">
              {t.settings.queueHint}
            </p>
          )}
        </section>

        {/* Zasady nagród na stałe. Pasek pod planszą gość zamyka raz i już
          nie wraca, a pytanie „to za co właściwie są te nagrody" pada w sobotę
          wieczorem, nie przy pierwszym uruchomieniu. Tutaj tekst stoi w pełnej
          wersji — rozbity na dwa akapity, bo to dwie różne nagrody. */}
        <section className="rounded-2xl border border-brand-200 bg-paper px-3.5 py-1.5 text-xs leading-snug text-brand-800/75">
          <h2 className="mb-0.5 text-sm font-medium text-brand-800/60">
            {t.prizes.title}
          </h2>
          <p>{t.prizes.lines}</p>
          <p className="mt-1">{t.prizes.main}</p>
        </section>

        {/* Tu stoi **zdanie**, nie cztery akapity z bramki. Pełny tekst gość
          czytał raz, przy wejściu; ustawienia otwiera po to, żeby przestawić
          Wi-Fi albo zobaczyć, czy coś jeszcze wisi w kolejce, i ma to zobaczyć
          bez przewijania. Zostaje sedno i jedno zdanie o tym, do kogo się
          zgłosić po usunięcie zdjęcia z Dysku. */}
        <section className="rounded-2xl border border-brand-200 bg-paper px-3.5 py-1.5 text-xs leading-snug text-brand-800/75">
          <h2 className="mb-0.5 text-sm font-medium text-brand-800/60">
            {t.settings.yourPhotos}
          </h2>
          <p>{t.privacy.short}</p>
          <p className="mt-1 text-brand-800/55">{t.privacy.removal}</p>
        </section>
      </div>

      <MeadowBand />
    </main>
  );
}
