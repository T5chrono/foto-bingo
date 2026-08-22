import { Hills } from "../components/wedding/Hills";
import { Meadow } from "../components/wedding/Meadow";
import { Sprig } from "../components/wedding/Sprig";
import { PARA, Wordmark } from "../components/wedding/Wordmark";

/**
 * Ekran dla kogoś, kto trafił na adres bez kodu — najczęściej po instalacji
 * z gołego adresu zamiast z linku osobistego, co na iOS zdarza się łatwo,
 * bo zainstalowana aplikacja dostaje osobny magazyn danych od Safari.
 *
 * Jedyny ekran z pełną doliną u góry. Gość jest tu, bo coś nie wyszło —
 * niech przynajmniej od razu widzi, że to ta sama impreza co na zaproszeniu,
 * a nie że pomylił adres.
 */
export default function NoTokenPage() {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col">
      <Hills className="h-44" />

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-8 text-center">
        <div>
          <Wordmark size="lg" />
          <p className="text-xs text-brand-800/70">{PARA}</p>
        </div>

        <Sprig />

        <p className="text-brand-800/80">
          Zeskanuj kod QR ze swojej winietki — to on mówi aplikacji, kim jesteś.
        </p>
        <p className="text-sm text-brand-800/60">
          Jeśli winietka gdzieś przepadła, poproś Parę Młodą o nowy kod.
        </p>
      </div>

      <Meadow />
    </main>
  );
}
