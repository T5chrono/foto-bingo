/**
 * Akwarelowa dolina — ten sam widok, który otwiera zaproszenie.
 *
 * Wchodzi na ekranach powitalnych (brak kodu, logowanie do panelu), gdzie jest
 * miejsce na obraz i gdzie ktoś dopiero orientuje się, gdzie trafił. Na planszy
 * go nie ma: tam liczy się 25 kafelków, nie panorama.
 *
 * Cztery plany, każdy ciemniejszy i mniej rozmyty od poprzedniego — tak działa
 * perspektywa powietrzna i tak maluje się góry akwarelą. Każdy ma gradient od
 * jaśniejszego grzbietu po ciemniejsze podnóże, bo tam osiada pigment.
 *
 * Rzeka **nie kończy się na horyzoncie, tylko się w nim rozpuszcza**: jej
 * gradient zaczyna się od przezroczystości. Pierwsza wersja dawała rzece
 * ostry początek między dwoma wzgórzami i wyglądała jak szczelina w zieleni;
 * wyblakły początek załatwia to samo bez żadnego przycinania kształtów.
 */
export function Hills({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 150"
      preserveAspectRatio="xMidYMid slice"
      className={`block w-full ${className}`}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="gorySwit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fdfcf7" />
          <stop offset="100%" stopColor="#f2f3e8" />
        </linearGradient>
        <linearGradient id="goryPlan1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d2dcc2" />
          <stop offset="100%" stopColor="#bdc9a5" />
        </linearGradient>
        <linearGradient id="goryPlan2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b9c79b" />
          <stop offset="100%" stopColor="#9dae7c" />
        </linearGradient>
        <linearGradient id="goryPlan3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#97ab72" />
          <stop offset="100%" stopColor="#7b8f58" />
        </linearGradient>
        <linearGradient id="goryPlan4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#71874f" />
          <stop offset="100%" stopColor="#53673a" />
        </linearGradient>
        <linearGradient id="goryRzeka" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0f5ef" stopOpacity="0" />
          <stop offset="18%" stopColor="#f0f5ef" stopOpacity="0.75" />
          <stop offset="55%" stopColor="#dbe8e6" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#c2d7dd" stopOpacity="0.95" />
        </linearGradient>

        <filter id="goryDaleko" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id="goryBlisko" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.9" />
        </filter>

        {/* Dolna krawędź rozpuszcza się w papierze, zamiast kończyć równą
            linią. Akwarela na zaproszeniu nie ma ramki i tutaj też nie ma —
            prosty pas obrazka uciety w poziomie od razu wyglada jak baner. */}
        <linearGradient id="goryZanik" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="93%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#000000" />
        </linearGradient>
        <mask id="goryMaska">
          <rect width="400" height="150" fill="url(#goryZanik)" />
        </mask>

        {/* Ziarno papieru. Jedna warstwa szumu na wierzchu robi za fakturę,
            której gładkie wypełnienia same z siebie nie mają. */}
        <filter id="goryZiarno" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="3"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      <g mask="url(#goryMaska)">
        <rect width="400" height="150" fill="url(#gorySwit)" />

        <path
          d="M0 44 C46 26 84 16 128 24 C174 32 200 12 244 16 C292 20 330 36 366 30 C382 28 392 34 400 38 L400 150 L0 150 Z"
          fill="url(#goryPlan1)"
          filter="url(#goryDaleko)"
          opacity="0.9"
        />

        <path
          d="M0 64 C40 50 76 40 118 48 C162 56 190 38 232 44 C276 50 310 64 348 58 C372 54 388 60 400 64 L400 150 L0 150 Z"
          fill="url(#goryPlan2)"
          filter="url(#goryDaleko)"
        />

        <path
          d="M0 82 C34 70 72 62 110 70 C152 79 184 64 224 70 C266 76 302 86 340 80 C366 76 386 80 400 84 L400 150 L0 150 Z"
          fill="url(#goryPlan3)"
          filter="url(#goryBlisko)"
        />

        {/* Rzeka schodzi środkiem doliny, rozszerzając się ku widzowi. */}
        <path
          d="M186 74 C193 90 178 100 174 112 C169 128 146 140 112 150 L288 150 C254 140 231 128 226 112 C222 100 199 90 198 74 Z"
          fill="url(#goryRzeka)"
        />

        {/* Pierwszy plan: dwa najciemniejsze zbocza wchodzą w kadr z boków
          i zbiegają się ku rzece, nie dotykając jej. */}
        <path
          d="M0 100 C22 90 46 92 66 104 C78 112 82 130 84 150 L0 150 Z"
          fill="url(#goryPlan4)"
        />
        <path
          d="M400 96 C378 86 354 90 334 102 C322 110 318 130 316 150 L400 150 Z"
          fill="url(#goryPlan4)"
        />

        <rect
          width="400"
          height="150"
          filter="url(#goryZiarno)"
          opacity="0.07"
          style={{ mixBlendMode: "multiply" }}
        />
      </g>
    </svg>
  );
}
