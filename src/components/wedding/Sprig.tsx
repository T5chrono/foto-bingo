/**
 * Gałązka — ozdobnik pod tytułem, dokładnie w tej roli, w jakiej występuje
 * na zaproszeniu: oddziela nagłówek od treści, gdy zwykła linia byłaby
 * za twarda, a sam odstęp za mało.
 */
export function Sprig({ className = "" }: { className?: string }) {
  const leaves: [number, number, number][] = [
    // [x, y, obrót] — punkty policzone na krzywej łodygi, więc liście z niej
    // wyrastają, a nie leżą obok.
    [20, 8.3, -38],
    [36.4, 6.6, 152],
    [83.6, 6.6, 208],
    [99.9, 8.3, 38],
  ];

  return (
    <svg
      viewBox="0 0 120 18"
      className={`block h-3 w-30 shrink-0 ${className}`}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6 11 C34 4 86 4 114 11"
        stroke="#9aa97b"
        strokeWidth="0.9"
        strokeLinecap="round"
        fill="none"
      />
      {leaves.map(([x, y, angle], i) => (
        <path
          key={i}
          d="M0 0 C4 -1 6 -5 0 -9 C-6 -5 -4 -1 0 0 Z"
          fill="#9aa97b"
          opacity="0.85"
          transform={`translate(${x} ${y}) rotate(${angle})`}
        />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <ellipse
          key={i}
          cx="0"
          cy="-2.6"
          rx="1.1"
          ry="2.6"
          fill="#c8d0b3"
          transform={`translate(60 5.8) rotate(${i * 72})`}
        />
      ))}
      <circle cx="60" cy="5.8" r="1.1" fill="#e4bd5b" />
    </svg>
  );
}
