import valley from "../../assets/art/valley.webp";

/**
 * Akwarelowa dolina — ten sam widok, który otwiera zaproszenie i leży na
 * winietce pod imieniem gościa.
 *
 * Wchodzi na ekranach powitalnych (brak kodu, logowanie do panelu), gdzie jest
 * miejsce na obraz i gdzie ktoś dopiero orientuje się, gdzie trafił. Na planszy
 * go nie ma: tam liczy się 25 kafelków, nie panorama.
 *
 * Bitmapa pochodzi z winietki, gdzie dolina jest **na całą szerokość** — a nie
 * z zaproszenia, gdzie jest wyspą z wystrzępionymi brzegami. W pasku nad
 * tytułem wyspa zostawiałaby białe rogi.
 *
 * Niebo nie jest tu białe, tylko przezroczyste: `canva-art.py` odejmuje biel
 * papieru, więc góra rozpływa się w kremowym tle strony zamiast kończyć się
 * prostą krawędzią. Dawny SVG udawał to gradientem.
 *
 * Dół gaśnie maską, bo na winietce dolina dochodzi do krawędzi karty i tam
 * kończy ją nożyk drukarni. W aplikacji leży w środku strony, więc ta sama
 * prosta krawędź czyta się jak przycięte zdjęcie. Akwarela w tym projekcie
 * nigdzie nie ma twardego brzegu — rzeka na zaproszeniu też rozpuszcza się
 * w horyzoncie, zamiast się urywać.
 */
export function Valley({ className = "" }: { className?: string }) {
  return (
    <img
      src={valley}
      alt=""
      aria-hidden="true"
      draggable={false}
      // Pierwszy ekran gościa bez kodu — dolina ma być już na miejscu, kiedy
      // pojawia się tekst, wiec bez `loading="lazy"`.
      decoding="async"
      style={{
        // Wprost w `style`, nie klasą: Tailwind nie prefiksuje `mask-image`,
        // a Safari poniżej 15.4 zna wyłącznie wersję z `-webkit-`. Bez niej
        // maska po prostu nie działa i wraca twarda krawędź — nic się nie psuje,
        // ale nie ma po co, skoro dwie linijki załatwiają oba.
        WebkitMaskImage: FADE,
        maskImage: FADE,
      }}
      className={`pointer-events-none block w-full object-cover object-bottom select-none ${className}`}
    />
  );
}

const FADE = "linear-gradient(to bottom, #000 72%, transparent 100%)";
