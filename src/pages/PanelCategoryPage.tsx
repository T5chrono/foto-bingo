import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useT } from "../hooks/useLocale";

/**
 * Wszystkie zdjęcia jednej kategorii, od wszystkich gości.
 *
 * To jest widok, którego Dysk Google z natury nie potrafi: plik ma tam
 * dokładnie jednego rodzica, więc folder-na-gościa i folder-na-kategorię
 * wykluczają się. Wybraliśmy foldery gości, a ten widok domyka drugą oś.
 */
export default function PanelCategoryPage() {
  const { id = "" } = useParams();
  const t = useT();
  const view = useQuery({
    queryKey: ["panel", "category", id],
    queryFn: () => api.panelCategory(Number(id)),
    enabled: Boolean(id),
  });

  if (view.isLoading) return <p className="p-8 text-center text-brand-800/60">{t.app.loading}</p>;
  if (view.isError || !view.data) {
    return <p className="p-8 text-center text-brand-800/70">{t.panel.noCategory}</p>;
  }

  const { label, position, photos } = view.data;

  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-5 px-4 py-6">
      <Link to="/panel" className="self-start text-sm text-brand-700 underline">
        {t.panel.backToPanel}
      </Link>

      <header>
        <p className="text-xs font-medium text-brand-800/55">{position}</p>
        <h1 className="text-2xl leading-tight font-semibold text-brand-800">{label}</h1>
        <p className="text-sm text-brand-800/60">
          {photos.length === 0 ? t.panel.categoryEmpty : t.panel.photoCount(photos.length)}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((p) => (
          <figure key={p.photoId} className="overflow-hidden rounded-lg border border-brand-200 bg-paper">
            <img
              src={p.url}
              alt={`${label} — ${p.guestName}`}
              loading="lazy"
              className="aspect-square w-full object-cover"
            />
            <figcaption className="flex items-center justify-between px-2 py-1.5 text-[0.65rem] text-brand-800/70">
              <span className="truncate">{p.guestName}</span>
              {p.driveStatus !== "ok" && (
                <span className="shrink-0 text-clay-700" title={t.panel.originalPending}>
                  ○
                </span>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
