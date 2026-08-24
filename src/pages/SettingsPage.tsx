import { useEffect, useState } from "react";

import * as queue from "../lib/queue";
import { setWifiOnly, wifiOnly } from "../lib/uploader";
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
  const czekaOryginal = jobs.filter((j) => j.previewDone && j.original).length;

  return (
    <main className="mx-auto flex h-dvh max-w-md flex-col gap-3 overflow-hidden px-4 pt-3 pb-[var(--meadow-h)]">
      <BackButton />

      <h1 className="font-script pb-1 text-3xl text-ink">{t.settings.title}</h1>

      <section className="flex items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-paper px-4 py-3">
        <span className="font-medium">{t.app.language}</span>
        <LanguagePicker />
      </section>

      <section className="rounded-2xl border border-brand-200 bg-paper px-4 py-3">
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
            <span className="mt-1 block text-xs text-brand-800/70">{t.settings.wifiOnlyHint}</span>
          </span>
        </label>
      </section>

      <section className="rounded-2xl border border-brand-200 bg-paper px-4 py-3">
        <h2 className="text-sm font-medium text-brand-800/60">{t.settings.queue}</h2>
        {jobs.length === 0 ? (
          <p className="mt-1 text-sm text-brand-800/70">{t.settings.queueEmpty}</p>
        ) : (
          <ul className="mt-1 text-sm text-brand-800/75">
            {czekaPodglad > 0 && <li>{t.settings.queueWaiting(czekaPodglad)}</li>}
            {czekaOryginal > 0 && <li>{t.settings.queueOriginals(czekaOryginal)}</li>}
          </ul>
        )}
        <p className="mt-2 text-xs text-brand-800/55">{t.settings.queueHint}</p>
      </section>

      {/* Tu stoi **zdanie**, nie cztery akapity z bramki. Pełny tekst gość
          czytał raz, przy wejściu; ustawienia otwiera po to, żeby przestawić
          Wi-Fi albo zobaczyć, czy coś jeszcze wisi w kolejce, i ma to zobaczyć
          bez przewijania. Zostaje sedno i jedno zdanie o tym, do kogo się
          zgłosić po usunięcie zdjęcia z Dysku. */}
      <section className="rounded-2xl border border-brand-200 bg-paper px-4 py-3 text-sm text-brand-800/75">
        <h2 className="mb-1 text-sm font-medium text-brand-800/60">{t.settings.yourPhotos}</h2>
        <p>{t.privacy.short}</p>
        <p className="mt-2 text-xs text-brand-800/55">{t.privacy.removal}</p>
      </section>

      <MeadowBand />
    </main>
  );
}
