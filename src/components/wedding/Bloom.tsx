import bloom from "../../assets/art/bloom.webp";

/**
 * Kwiatowy łuk zwieszający się z górnej krawędzi — górna połowa winietki,
 * czyli tej samej karteczki, z której gość przed chwilą zeskanował kod QR.
 *
 * Stoi wyłącznie na ekranie pierwszego uruchomienia, nad informacją o zdjęciach.
 * To jedyny moment, w którym aplikacja przedstawia się komuś, kto jej jeszcze
 * nie zna — i jedyny, w którym warto powtórzyć obrazek trzymany w ręku, żeby
 * było jasne, że to ta sama impreza, a nie przypadkowa strona z formularzem.
 *
 * Dalej już go nie ma: łuk zajmuje jedną trzecią ekranu telefonu i na planszy
 * odbierałby miejsce 25 kafelkom.
 */
export function Bloom({ className = "" }: { className?: string }) {
  return (
    <img
      src={bloom}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      className={`pointer-events-none block w-full object-cover object-top select-none ${className}`}
    />
  );
}
