// Jednorazowe generowanie ikon PWA z public/favicon.svg.
// Uruchomienie: npm run icons
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

// Wariant maskable: launcher Androida potrafi obciąć do ~20% z każdej krawędzi,
// więc znak siedzi mniejszy na pełnym, nieobciętym tle w kolorze marki.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#66744a"/>
  <g transform="translate(32 32) scale(0.62) translate(-32 -32)">
    <g fill="none" stroke="#f6f3e9" stroke-width="4.5" stroke-linejoin="round">
      <rect x="8" y="8" width="14" height="14" rx="3"/>
      <rect x="25" y="8" width="14" height="14" rx="3"/>
      <rect x="42" y="8" width="14" height="14" rx="3"/>
      <rect x="8" y="25" width="14" height="14" rx="3"/>
      <rect x="25" y="25" width="14" height="14" rx="3"/>
      <rect x="42" y="25" width="14" height="14" rx="3"/>
      <rect x="8" y="42" width="14" height="14" rx="3"/>
      <rect x="25" y="42" width="14" height="14" rx="3"/>
      <rect x="42" y="42" width="14" height="14" rx="3"/>
    </g>
    <circle cx="32" cy="32" r="4.6" fill="#e8bfb4"/>
  </g>
</svg>`;

await mkdir("public/icons", { recursive: true });

for (const size of [192, 512]) {
  await sharp("public/favicon.svg", { density: 300 })
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`);
}

// iOS nie lubi przezroczystości w apple-touch-icon — spłaszczamy na kremowe tło.
await sharp("public/favicon.svg", { density: 300 })
  .resize(180, 180)
  .flatten({ background: "#f6f3e9" })
  .png()
  .toFile("public/icons/apple-touch-icon.png");

await sharp(Buffer.from(maskableSvg), { density: 300 })
  .resize(512, 512)
  .png()
  .toFile("public/icons/icon-maskable-512.png");

console.log("ikony zapisane w public/icons/");
