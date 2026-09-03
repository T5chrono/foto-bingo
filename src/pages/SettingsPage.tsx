import { useEffect, useState } from "react";

import * as queue from "../lib/queue";
import { drain, originalAllowed, setWifiOnly, wifiOnly } from "../lib/uploader";
import { useT } from "../hooks/useLocale";
import { BackButton } from "../components/BackButton";
import { LanguagePicker } from "../components/LanguagePicker";
import { MeadowBand } from "../components/wedding/Meadow";

export default function SettingsPage() {
  const t = useT();
  const [onlyWifi, setOnlyWifi] = useState(wifiOnly);
  const [jobs, setJobs] = useState<queue.Job[]>([]);

  useEffect(() => {
    void queue.allJobs().then(setJobs);
  }, []);

  const czekaPodglad = jobs.filter((j) => !j.previewDone).length;
  const czekaOryginal = jobs.filter((j) => j.previewDone && j.originalChunks > 0).length;
  // Filmy, które nie ruszą same: bez Wi-Fi, a na iPhonie — bez palca gościa.
  const czekajaFilmy = jobs.filter(
    (j) => j.kind === "video" && j.previewDone && j.originalChunks > 0 && !originalAllowed(j),
  );

  async function wyslijFilmy() {
    for (const j of czekajaFilmy) await queue.patch(j.photoId, { sendNow: true });
    setJobs(await queue.allJobs());
    void drain();
  }

  return (
    <main className="mx-auto flex h-dvh max-w-md flex-col gap-2 overflow-hidden px-4 pt-3 pb-[var(--meadow-h)]">
      <BackButton />

      <h1 className="font-script pb-1 text-2xl text-ink">{t.settings.title}</h1>

      {/* Karty przewijają się w swoim polu, jeśli nie zmieszczą się co do
          piksela — a nie mieszczą się dopiero na starym, niskim telefonie.
          Wyjście na planszę zostaje wtedy tam, gdzie było, zamiast uciekać
          pod dolną krawędź razem z resztą. */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {/* `flex-wrap`, bo od czterech języków pasek i podpis nie mieszczą się
            w jednym rzędzie na najwęższych telefonach. Wtedy przełącznik schodzi
            pod podpis, zamiast wypchnąć kartę poza ekran. */}
        <section className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-2xl border border-brand-200 bg-paper px-4 py-2.5">
          <span className="font-medium">{t.app.language}</span>
          <LanguagePicker />
        </section>

        <section className="rounded-2xl border border-brand-200 bg-paper px-4 py-2.5">
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
              <span className="mt-1 block text-xs text-brand-800/70">
                {t.settings.wifiOnlyHint}
              </span>
            </span>
          </label>
          {/* Przełącznik wyżej dotyczy zdjęć. Filmy nie mają przełącznika —
              zawsze czekają — i to zdanie ma o tym powiedzieć, zanim gość
              zacznie szukać, gdzie to wyłączyć. */}
          <p className="mt-2 text-xs text-brand-800/55">{t.settings.videosHint}</p>
        </section>

        <section className="rounded-2xl border border-brand-200 bg-paper px-4 py-2.5">
          <h2 className="text-sm font-medium text-brand-800/60">
            {t.settings.queue}
          </h2>
          {jobs.length === 0 ? (
            <p className="mt-1 text-sm text-brand-800/70">
              {t.settings.queueEmpty}
            </p>
          ) : (
            <ul className="mt-1 text-sm text-brand-800/75">
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
          {czekajaFilmy.length > 0 && (
            <button
              type="button"
              onClick={() => void wyslijFilmy()}
              className="mt-2 w-full rounded-xl border border-brand-400 bg-paper px-4 py-2 text-sm font-medium text-brand-800"
            >
              {t.settings.sendVideosNow}
            </button>
          )}
          <p className="mt-2 text-xs text-brand-800/55">
            {t.settings.queueHint}
          </p>
        </section>

        {/* Zasady nagród na stałe. Pasek pod planszą gość zamyka raz i już
          nie wraca, a pytanie „to za co właściwie są te nagrody" pada w sobotę
          wieczorem, nie przy pierwszym uruchomieniu. Tutaj tekst stoi w pełnej
          wersji — rozbity na dwa akapity, bo to dwie różne nagrody. */}
        <section className="rounded-2xl border border-brand-200 bg-paper px-4 py-2.5 text-sm text-brand-800/75">
          <h2 className="mb-1 text-sm font-medium text-brand-800/60">
            {t.prizes.title}
          </h2>
          <p>{t.prizes.lines}</p>
          <p className="mt-2">{t.prizes.main}</p>
        </section>

        {/* Tu stoi **zdanie**, nie cztery akapity z bramki. Pełny tekst gość
          czytał raz, przy wejściu; ustawienia otwiera po to, żeby przestawić
          Wi-Fi albo zobaczyć, czy coś jeszcze wisi w kolejce, i ma to zobaczyć
          bez przewijania. Zostaje sedno i jedno zdanie o tym, do kogo się
          zgłosić po usunięcie zdjęcia z Dysku. */}
        <section className="rounded-2xl border border-brand-200 bg-paper px-4 py-2.5 text-sm text-brand-800/75">
          <h2 className="mb-1 text-sm font-medium text-brand-800/60">
            {t.settings.yourPhotos}
          </h2>
          <p>{t.privacy.short}</p>
          <p className="mt-2 text-xs text-brand-800/55">{t.privacy.removal}</p>
        </section>
      </div>

      <MeadowBand />
    </main>
  );
}
