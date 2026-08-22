/**
 * Winietki z kodami QR dla całej listy gości.
 *
 *   npm run guests -- goscie.csv
 *   npm run guests -- goscie.csv --zapas 8
 *
 * Dla każdego gościa: wiersz w bazie i karta z kodem QR. Karty lądują
 * w `winietki/winietki.html` — otwierasz w przeglądarce i drukujesz
 * (Ctrl+P → Zapisz jako PDF). Świadomie bez biblioteki PDF: przeglądarka
 * pokazuje podgląd przed drukiem, a Ty widzisz, co wyjdzie na papier.
 *
 * **Kody jawne istnieją tylko w tym pliku HTML.** W bazie leży wyłącznie
 * SHA-256, więc zgubionego kodu nie da się odzyskać — trzeba wygenerować
 * nowy. Katalog `winietki/` jest w .gitignore razem z plikami CSV.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { config as loadEnv } from "dotenv";
import QRCode from "qrcode";

loadEnv();

const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith("--"));
const spare = Number(args[args.indexOf("--zapas") + 1]) || 0;

if (!csvPath) {
  console.error(`
  Podaj plik z lista gosci:

    npm run guests -- goscie.csv --zapas 8

  Plik to jedno imie i nazwisko w linii. Linie zaczynajace sie od # sa pomijane.
`);
  process.exit(1);
}

const BASE = process.env.PUBLIC_BASE_URL ?? "http://localhost:5173";
if (BASE.includes("localhost")) {
  console.warn(`
  UWAGA: PUBLIC_BASE_URL nie jest ustawione, wiec kody prowadza na localhost.
  Ustaw je w .env na docelowa domene ZANIM wydrukujesz winietki — zmiana
  adresu po druku uniewaznia wszystkie kody naraz.
`);
}

const { generateToken, hashToken } = await import("../api/_lib/auth.ts");
const { db } = await import("../api/_lib/db.ts");
const { slugify } = await import("../src/lib/slug.ts");

const names = (await readFile(csvPath, "utf8"))
  .split(/\r?\n/)
  .map((line) => line.split(/[,;\t]/)[0]?.trim() ?? "")
  .filter((n) => n && !n.startsWith("#"));

if (names.length === 0) {
  console.error("  Lista gosci jest pusta.");
  process.exit(1);
}

const { data: istniejacy } = await db().from("guests").select("slug");
const zajete = new Set((istniejacy ?? []).map((g) => g.slug));

const cards = [];
let dodanych = 0;
let pominietych = 0;

for (const name of names) {
  const base = slugify(name);
  if (!base) {
    console.warn(`  Pomijam "${name}" — nie da sie z tego zrobic nazwy folderu.`);
    continue;
  }

  // Dwie Anny Kowalskie na jednym weselu to nie jest sytuacja hipotetyczna.
  let slug = base;
  for (let n = 2; zajete.has(slug); n++) slug = `${base}-${n}`;

  if (zajete.has(base) && slug !== base) {
    console.warn(`  Uwaga: "${name}" dostaje slug ${slug} — ${base} juz istnieje.`);
  }

  const token = generateToken();
  const { error } = await db().from("guests").insert({ name, slug, token_hash: hashToken(token) });
  if (error) {
    console.error(`  Nie udalo sie dodac "${name}": ${error.message}`);
    pominietych++;
    continue;
  }

  zajete.add(slug);
  cards.push({ name, token });
  dodanych++;
}

// Karty zapasowe: prawdziwe kody bez przypisanego imienia. Ktos zgubi
// winietke, ktos przyjdzie z osoba towarzyszaca — w piatek wieczorem nie ma
// czasu na generowanie czegokolwiek, wiec te karty maja juz lezec w kieszeni.
for (let i = 1; i <= spare; i++) {
  const token = generateToken();
  const name = `Zapasowa ${i}`;
  const slug = `zapasowa-${i}`;
  if (zajete.has(slug)) continue;
  const { error } = await db().from("guests").insert({ name, slug, token_hash: hashToken(token) });
  if (error) continue;
  zajete.add(slug);
  cards.push({ name: null, token });
}

await mkdir("winietki", { recursive: true });
await writeFile("winietki/winietki.html", await renderHtml(cards), "utf8");

console.log(`
  Dodanych gosci:   ${dodanych}
  Kart zapasowych:  ${spare}
  Pominietych:      ${pominietych}
  Kart razem:       ${cards.length}

  Winietki: winietki/winietki.html
  Otworz w przegladarce i wydrukuj (Ctrl+P -> Zapisz jako PDF).

  Kody jawne sa TYLKO w tym pliku. W bazie leza wylacznie skroty SHA-256.
`);

async function renderHtml(cards) {
  const rendered = await Promise.all(
    cards.map(async (card) => {
      const url = `${BASE}/g/${card.token}`;
      const qr = await QRCode.toString(url, {
        type: "svg",
        margin: 0,
        errorCorrectionLevel: "M",
      });
      return { ...card, url, qr };
    }),
  );

  const cardsHtml = rendered
    .map(
      (c) => `
    <article class="card">
      <div class="qr">${c.qr}</div>
      <div class="txt">
        <svg class="sprig" viewBox="0 0 120 18" xmlns="http://www.w3.org/2000/svg"><path d="M6 11 C34 4 86 4 114 11" stroke="#9aa97b" stroke-width="0.9" fill="none" stroke-linecap="round"/><path d="M0 0 C4 -1 6 -5 0 -9 C-6 -5 -4 -1 0 0 Z" fill="#9aa97b" opacity="0.85" transform="translate(20 8.3) rotate(-38)"/><path d="M0 0 C4 -1 6 -5 0 -9 C-6 -5 -4 -1 0 0 Z" fill="#9aa97b" opacity="0.85" transform="translate(36.4 6.6) rotate(152)"/><path d="M0 0 C4 -1 6 -5 0 -9 C-6 -5 -4 -1 0 0 Z" fill="#9aa97b" opacity="0.85" transform="translate(83.6 6.6) rotate(208)"/><path d="M0 0 C4 -1 6 -5 0 -9 C-6 -5 -4 -1 0 0 Z" fill="#9aa97b" opacity="0.85" transform="translate(99.9 8.3) rotate(38)"/><circle cx="60" cy="5.8" r="1.6" fill="#e4bd5b"/></svg>
        ${
          c.name
            ? `<p class="name">${escapeHtml(c.name)}</p>`
            : `<p class="name blank"><span></span></p>`
        }
        <p class="lead">Zeskanuj i graj w <em>Foto Bingo</em></p>
        <p class="url">${escapeHtml(c.url)}</p>
      </div>
    </article>`,
    )
    .join("");

  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<title>Foto Bingo — winietki</title>
<style>
  /* Cwiartki A4: 8 kart na strone, linie ciecia na krawedziach.

     Winietka jest pierwsza rzecza, ktora gosc bierze do reki, wiec wyglada jak
     zaproszenie: szeryfowy krój, szalwiowa galazka i olwikowy podpis. Kolory
     siedza w RAMKACH I TEKSCIE, nie w tlach — przegladarki domyslnie nie
     drukuja teł, wiec karta z kremowym wypelnieniem wyszlaby z drukarki biala
     i bez charakteru. To, co ma sie wydrukowac, musi byc kreska. */
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Georgia, "Times New Roman", "Liberation Serif", serif;
    color: #3b3b3b;
  }
  .sheet {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: 68mm;
  }
  .card {
    display: flex;
    align-items: center;
    gap: 5mm;
    padding: 6mm;
    border: 0.2mm dashed #b7c29c;
    break-inside: avoid;
  }
  .qr {
    width: 32mm;
    flex: 0 0 32mm;
    padding: 2mm;
    border: 0.3mm solid #dfe4cd;
    border-radius: 2mm;
  }
  .qr svg { width: 100%; height: auto; display: block; }
  .txt { min-width: 0; }
  .sprig { display: block; width: 20mm; height: auto; margin: 0 0 2mm; }
  .name { margin: 0 0 2mm; font-size: 15pt; font-weight: 600; line-height: 1.15; }
  .name.blank span {
    display: block;
    width: 50mm;
    border-bottom: 0.4mm solid #b7c29c;
    height: 6mm;
  }
  .lead { margin: 0 0 1.5mm; font-size: 9pt; color: #66744a; }
  .lead em { font-style: italic; }
  .url { margin: 0; font-size: 7pt; color: #9aa97b; word-break: break-all; }

  @media screen {
    body { background: #f6f3e9; padding: 10mm; }
    .sheet { background: #fdfcf7; padding: 8mm; max-width: 210mm; margin: 0 auto; }
    .hint {
      max-width: 210mm; margin: 0 auto 6mm; font-size: 12pt; color: #525938;
    }
  }
  @media print { .hint { display: none; } }
</style>
</head>
<body>
  <p class="hint">
    ${cards.length} kart. Wydrukuj (Ctrl+P), tnij po przerywanych liniach.
    Ten plik zawiera kody w postaci jawnej — nie wysyłaj go nikomu.
  </p>
  <div class="sheet">${cardsHtml}
  </div>
</body>
</html>`;
}

function escapeHtml(s) {
  return s.replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch,
  );
}
