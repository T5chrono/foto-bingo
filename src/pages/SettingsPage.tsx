import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import * as queue from "../lib/queue";
import { setWifiOnly, wifiOnly } from "../lib/uploader";
import { useT } from "../hooks/useLocale";
import { LanguagePicker } from "../components/LanguagePicker";
import { Meadow } from "../components/wedding/Meadow";

export default function SettingsPage() {
  const navigate = useNavigate();
  const t = useT();
  const [onlyWifi, setOnlyWifi] = useState(wifiOnly);
  const [jobs, setJobs] = useState<queue.Job[]>([]);

  useEffect(() => {
    void queue.allJobs().then(setJobs);
  }, []);

  const czekaPodglad = jobs.filter((j) => !j.previewDone).length;
  const czekaOryginal = jobs.filter((j) => j.previewDone && j.original).length;

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-6 px-4 py-5">
      <button onClick={() => navigate("/")} className="self-start text-sm text-brand-700 underline">
        {t.category.board}
      </button>

      <h1 className="font-script pb-1 text-3xl text-ink">{t.settings.title}</h1>

      <section className="flex items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-paper px-4 py-4">
        <span className="font-medium">{t.app.language}</span>
        <LanguagePicker />
      </section>

      <section className="rounded-2xl border border-brand-200 bg-paper px-4 py-4">
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
            <span className="mt-1 block text-sm text-brand-800/70">{t.settings.wifiOnlyHint}</span>
          </span>
        </label>
      </section>

      <section className="rounded-2xl border border-brand-200 bg-paper px-4 py-4">
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

      <section className="rounded-2xl border border-brand-200 bg-paper px-4 py-4 text-sm text-brand-800/75">
        <h2 className="mb-2 text-sm font-medium text-brand-800/60">{t.settings.yourPhotos}</h2>
        {t.privacy.paragraphs.slice(0, 2).map((p) => (
          <p key={p.slice(0, 24)} className="mb-2 last:mb-0">
            {p}
          </p>
        ))}
        <p className="mt-2 text-xs text-brand-800/55">{t.privacy.removal}</p>
      </section>
      <Meadow className="-mx-4 -mb-5 mt-auto pt-4" />
    </main>
  );
}
