/**
 * Znaczek „to jest film" — trójkąt w kółku, do położenia na miniaturze.
 *
 * Kafelek z filmem wygląda jak kafelek ze zdjęciem, bo na obu stoi klatka
 * z canvasa, i to jest zamierzone. Ten znaczek jest jedyną różnicą: gość ma
 * wiedzieć, że wysłał film, a Para Młoda w panelu — że pod tą klatką na
 * Dysku leży coś, co się rusza.
 *
 * Własny SVG, nie glif ▶ — z tego samego powodu, co zębatka w `BoardPage`:
 * znak z czcionki wychodzi w każdej przeglądarce inny, a na 65-pikselowym
 * kafelku różnica między „czytelny" a „plamka" to dwa piksele.
 */
export function PlayBadge({
  className = "",
  title,
}: {
  className?: string;
  /** Podpis dla czytnika ekranu i dymka. Bez niego znaczek jest ozdobą. */
  title?: string;
}) {
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-ink/70 text-white ring-1 ring-white/70 ${className}`}
      title={title}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <svg viewBox="0 0 12 12" className="size-[60%] translate-x-[6%]" aria-hidden="true">
        <path d="M3 2.2v7.6L9.4 6z" fill="currentColor" />
      </svg>
    </span>
  );
}
