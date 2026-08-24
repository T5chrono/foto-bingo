import meadow from "../../assets/art/meadow.webp";

/**
 * Łąka polnych kwiatów — pas, który zamyka każdy ekran aplikacji.
 *
 * To **ta sama bitmapa**, która wyrasta z dolnej krawędzi zaproszenia i
 * papierowej karty Foto Bingo, wyjęta z projektu w Canvie przez
 * [scripts/canva-art.py](../../../scripts/canva-art.py). Wcześniej stał tu
 * własny rysunek w SVG — ważył mniej i skalował się bez końca, ale obok
 * prawdziwej akwareli na tym samym stole było widać, że to nie ta sama ręka.
 *
 * Grafika ma **własną maskę przezroczystości**, nie białe tło: kwiaty siadają
 * wprost na kremowym papierze aplikacji, bez widocznej krawędzi kafla.
 *
 * `object-bottom` jest tu istotne: gdy wywołanie ograniczy wysokość, obraz ma
 * zostać przycięty od góry, bo łodygi rosną z dołu. Przycięcie od dołu
 * ucięłoby je w połowie i zostałyby wiszące główki.
 */
export function Meadow({ className = "" }: { className?: string }) {
  return (
    <img
      src={meadow}
      alt=""
      aria-hidden="true"
      draggable={false}
      // Łąka jest na każdym ekranie i nigdy nie jest treścią — nie ma po co
      // zatrzymywać na niej pierwszego malowania ani łapać na nią dotknięcia.
      decoding="async"
      className={`pointer-events-none block w-full object-cover object-bottom select-none ${className}`}
    />
  );
}

/**
 * Ta sama łąka w roli pasa u dołu **całego okna**, a nie kolumny z treścią.
 *
 * Ekrany aplikacji stoją w kolumnie szerokiej na `max-w-md` i wyśrodkowanej —
 * łąka wpisana w tę kolumnę kończyła się razem z nią, więc na szerszym ekranie
 * kwiaty wyglądały jak wycinek naklejony na środku dołu strony. Na papierowej
 * karcie łąka idzie od krawędzi do krawędzi i tutaj ma tak samo.
 *
 * `fixed` jest tu ceną za tę pełną szerokość: pas wypada z układu, więc każdy
 * ekran musi zostawić nad nim miejsce przez `pb-[var(--meadow-h)]`. Ta sama
 * zmienna trzyma obie liczby zgodne.
 */
export function MeadowBand() {
  return <Meadow className="fixed inset-x-0 bottom-0 h-[var(--meadow-h)]" />;
}
