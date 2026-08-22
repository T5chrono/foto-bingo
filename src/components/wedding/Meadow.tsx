import { useMemo } from "react";

/**
 * Łąka polnych kwiatów — pas, który zamyka każdy ekran aplikacji.
 *
 * To ten sam motyw, który na zaproszeniu i na papierowej karcie Foto Bingo
 * wyrasta z dolnej krawędzi. Rysunek jest **własny, w SVG**, a nie wycięty
 * z Canvy: grafiki stockowe wolno użyć w projekcie, ale nie wyjąć z niego
 * jako osobny plik i wgrać do aplikacji. Przy okazji cały pas waży tyle, co
 * kawałek tekstu, skaluje się do każdego ekranu i bierze kolory z palety.
 *
 * Układ kwiatów jest **losowy, ale zawsze ten sam**: generator dostaje ziarno
 * z daty ślubu, więc łąka nie przetasowuje się przy każdym renderze — a bez
 * tego kafelek odświeżony po wysłaniu zdjęcia migałby innym bukietem.
 */

const WIDTH = 600;
const HEIGHT = 96;

/** Łodygi, od zszarzałej po soczystą — jak w akwareli, gdzie każda jest inna. */
const GREENS = ["#7c8267", "#8a8e75", "#6b7253", "#909a59", "#99a06a", "#7f8b58"];

type Bloom = { petal: string; heart: string };

/** Kwiaty zdjęte z bukietu na zaproszeniu: mak, dzika róża, jaskier, rumianek, chaber. */
const BLOOMS: Bloom[] = [
  { petal: "#c5675a", heart: "#9d4a3f" },
  { petal: "#d69797", heart: "#b06a72" },
  { petal: "#e4bd5b", heart: "#b48c46" },
  { petal: "#f3e9cd", heart: "#d4a52f" },
  { petal: "#71859c", heart: "#5a6b91" },
  { petal: "#b88d9a", heart: "#9b5e66" },
  { petal: "#e8debe", heart: "#c5a470" },
];

type Kind = "daisy" | "poppy" | "spike" | "bud" | "sprig";

const KINDS: Kind[] = ["daisy", "poppy", "spike", "bud", "daisy", "sprig", "poppy", "daisy"];

type Stem = {
  x: number;
  height: number;
  lean: number;
  kind: Kind;
  green: string;
  bloom: Bloom;
  size: number;
  leaves: number;
  spin: number;
};

/** Mulberry32 — trzy linijki, powtarzalny, w zupełności wystarczy na łąkę. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildStems(count: number): Stem[] {
  const rand = seeded(3102026); // 3 października 2026
  const stems: Stem[] = [];

  for (let i = 0; i < count; i += 1) {
    // Równy podział z rozrzutem: kwiaty stoją nieregularnie, ale nigdzie nie
    // robi się łysego pola ani zbitego bukietu.
    const slot = (WIDTH / count) * i;
    stems.push({
      x: slot + rand() * (WIDTH / count) * 1.4 - 6,
      height: 24 + rand() * 52,
      lean: (rand() - 0.5) * 22,
      kind: KINDS[Math.floor(rand() * KINDS.length)]!,
      green: GREENS[Math.floor(rand() * GREENS.length)]!,
      bloom: BLOOMS[Math.floor(rand() * BLOOMS.length)]!,
      size: 2.8 + rand() * 3.4,
      leaves: rand() < 0.72 ? 1 + Math.floor(rand() * 2) : 0,
      spin: rand() * 60,
    });
  }

  // Niskie z przodu, wysokie z tyłu — inaczej wysoki mak zasłania rumianek.
  return stems.sort((a, b) => b.height - a.height);
}

/** Punkt na krzywej łodygi — po to, żeby liście trzymały się jej, a nie wisiały obok. */
function cubicAt(t: number, p: number[][]): [number, number] {
  const u = 1 - t;
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [
    w.reduce((s, k, i) => s + k * p[i]![0]!, 0),
    w.reduce((s, k, i) => s + k * p[i]![1]!, 0),
  ];
}

export function Meadow({ className = "" }: { className?: string }) {
  const stems = useMemo(() => buildStems(48), []);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      // Na wąskim telefonie łąka przycina się po bokach zamiast rozciągać —
      // rozciągnięty kwiat od razu widać, że jest rysunkiem, a nie kwiatem.
      preserveAspectRatio="xMidYMax slice"
      className={`block h-24 w-full ${className}`}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="lakaMgla" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#9aa97b" stopOpacity="0.30" />
          <stop offset="55%" stopColor="#b7c29c" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#b7c29c" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Wilgotna zieleń u podstawy — bez niej łodygi wyglądają, jakby wisiały. */}
      <rect x="0" y={HEIGHT - 34} width={WIDTH} height="34" fill="url(#lakaMgla)" />

      {stems.map((stem, i) => (
        <Stalk key={i} stem={stem} />
      ))}
    </svg>
  );
}

function Stalk({ stem }: { stem: Stem }) {
  const { x, height, lean, green, size, kind, bloom, leaves, spin } = stem;

  const points = [
    [x, HEIGHT],
    [x + lean * 0.15, HEIGHT - height * 0.45],
    [x + lean * 0.75, HEIGHT - height * 0.8],
    [x + lean, HEIGHT - height],
  ];
  const [tipX, tipY] = cubicAt(1, points);
  const d =
    `M ${points[0]![0]} ${points[0]![1]} C ${points[1]![0]} ${points[1]![1]}` +
    ` ${points[2]![0]} ${points[2]![1]} ${points[3]![0]} ${points[3]![1]}`;

  return (
    <g opacity={0.92}>
      <path d={d} stroke={green} strokeWidth={0.9} strokeLinecap="round" fill="none" />

      {Array.from({ length: leaves }, (_, i) => {
        const t = 0.34 + i * 0.27;
        const [lx, ly] = cubicAt(t, points);
        return <Leaf key={i} x={lx} y={ly} side={i % 2 === 0 ? 1 : -1} size={size * 1.5} fill={green} />;
      })}

      {kind === "daisy" && <Daisy x={tipX} y={tipY} r={size} bloom={bloom} spin={spin} />}
      {kind === "poppy" && <Poppy x={tipX} y={tipY} r={size} bloom={bloom} />}
      {kind === "spike" && <Spike x={tipX} y={tipY} r={size * 0.62} bloom={bloom} />}
      {kind === "bud" && <Bud x={tipX} y={tipY} r={size} bloom={bloom} lean={lean} />}
    </g>
  );
}

function Leaf({
  x,
  y,
  side,
  size,
  fill,
}: {
  x: number;
  y: number;
  side: number;
  size: number;
  fill: string;
}) {
  const s = size * side;
  return (
    <path
      d={
        `M ${x} ${y} C ${x + s * 0.85} ${y - size * 0.1} ${x + s} ${y - size * 0.7}` +
        ` ${x + s * 0.2} ${y - size * 0.95} C ${x + s * 0.12} ${y - size * 0.55}` +
        ` ${x + s * 0.3} ${y - size * 0.2} ${x} ${y} Z`
      }
      fill={fill}
      opacity={0.75}
    />
  );
}

function Daisy({
  x,
  y,
  r,
  bloom,
  spin,
}: {
  x: number;
  y: number;
  r: number;
  bloom: Bloom;
  spin: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: 6 }, (_, i) => (
        <ellipse
          key={i}
          cx={0}
          cy={-r * 0.66}
          rx={r * 0.3}
          ry={r * 0.66}
          fill={bloom.petal}
          opacity={0.94}
          transform={`rotate(${spin + i * 60})`}
        />
      ))}
      <circle r={r * 0.33} fill={bloom.heart} />
    </g>
  );
}

function Poppy({ x, y, r, bloom }: { x: number; y: number; r: number; bloom: Bloom }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* Dwa nierówno nałożone koła zamiast jednego — tak zachowuje się plama
          farby, która rozlała się poza pierwsze pociągnięcie pędzla. */}
      <circle r={r * 0.95} fill={bloom.petal} opacity={0.9} />
      <circle cx={r * 0.3} cy={-r * 0.2} r={r * 0.78} fill={bloom.petal} opacity={0.75} />
      <circle cx={r * 0.1} cy={-r * 0.05} r={r * 0.26} fill={bloom.heart} opacity={0.85} />
    </g>
  );
}

function Spike({ x, y, r, bloom }: { x: number; y: number; r: number; bloom: Bloom }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: 7 }, (_, i) => (
        <circle
          key={i}
          cx={(i % 2 === 0 ? 1 : -1) * r * 0.34}
          cy={-i * r * 0.72}
          r={r * (1 - i * 0.09)}
          fill={i % 3 === 0 ? bloom.heart : bloom.petal}
          opacity={0.88}
        />
      ))}
    </g>
  );
}

function Bud({
  x,
  y,
  r,
  bloom,
  lean,
}: {
  x: number;
  y: number;
  r: number;
  bloom: Bloom;
  lean: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${lean * 0.8})`}>
      <ellipse rx={r * 0.55} ry={r * 1.05} cy={-r * 0.5} fill={bloom.petal} opacity={0.92} />
      <ellipse rx={r * 0.24} ry={r * 0.6} cx={-r * 0.2} cy={-r * 0.6} fill={bloom.heart} opacity={0.5} />
    </g>
  );
}
