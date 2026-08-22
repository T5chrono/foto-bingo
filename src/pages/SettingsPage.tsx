import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PRIVACY } from "../lib/legal";
import * as queue from "../lib/queue";
import { ORYGINALY, ZDJECIA, count } from "../lib/plural";
import { setWifiOnly, wifiOnly } from "../lib/uploader";
import { Meadow } from "../components/wedding/Meadow";

export default function SettingsPage() {
  const navigate = useNavigate();
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
        ← Plansza
      </button>

      <h1 className="font-script pb-1 text-3xl text-ink">Ustawienia</h1>

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
            <span className="font-medium">Oryginały tylko przez Wi-Fi</span>
            <span className="mt-1 block text-sm text-brand-800/70">
              Zdjęcia pojawią się na planszy tak samo szybko — w tle poczeka
              tylko wersja pełnej jakości. Około 4 MB na zdjęcie.
            </span>
          </span>
        </label>
      </section>

      <section className="rounded-2xl border border-brand-200 bg-paper px-4 py-4">
        <h2 className="text-sm font-medium text-brand-800/60">Kolejka</h2>
        {jobs.length === 0 ? (
          <p className="mt-1 text-sm text-brand-800/70">Wszystko wysłane.</p>
        ) : (
          <ul className="mt-1 text-sm text-brand-800/75">
            {czekaPodglad > 0 && <li>{count(czekaPodglad, ZDJECIA)} czeka na wysłanie</li>}
            {czekaOryginal > 0 && <li>{count(czekaOryginal, ORYGINALY)} w drodze na Dysk</li>}
          </ul>
        )}
        <p className="mt-2 text-xs text-brand-800/55">
          Kolejka rusza sama, gdy wróci zasięg. Nie trzeba nic klikać.
        </p>
      </section>

      <section className="rounded-2xl border border-brand-200 bg-paper px-4 py-4 text-sm text-brand-800/75">
        <h2 className="mb-2 text-sm font-medium text-brand-800/60">Twoje zdjęcia</h2>
        {PRIVACY.paragraphs.slice(0, 2).map((p) => (
          <p key={p.slice(0, 24)} className="mb-2 last:mb-0">
            {p}
          </p>
        ))}
        <p className="mt-2 text-xs text-brand-800/55">{PRIVACY.removal}</p>
      </section>
      <Meadow className="-mx-4 -mb-5 mt-auto pt-4" />
    </main>
  );
}
