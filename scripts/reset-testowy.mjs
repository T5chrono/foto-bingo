/**
 * Wyczyszczenie danych z testów — zdjęcia, filmy i zgłoszenia.
 *
 *   npm run reset            — pokazuje, co zniknie, i nie kasuje nic
 *   npm run reset -- --serio — kasuje naprawdę
 *
 * Do czego to jest: między testami, a przede wszystkim **w czwartek przed
 * weselem**, żeby goście zastali puste plansze zamiast zdjęć z prób. Lista
 * gości, ich kody i winietki zostają nietknięte — kasuje się to, co goście
 * przysłali, nie to, kim są.
 *
 * Kolejność jest taka sama, jak przy usuwaniu pojedynczego zdjęcia w aplikacji
 * (`dropPhoto` w `api/_lib/photos.ts`): **najpierw Dysk, na końcu baza**.
 * Odwrotna kolejność przy padzie Google zostawiłaby puste plansze i zdjęcia,
 * które mimo wszystko dalej leżą w folderze — czyli ciche „skasowaliśmy",
 * które nie jest prawdą.
 *
 * Pliki na Dysku lądują w **koszu**, nie znikają na dobre. Kosz opróżnia się
 * ręcznie i celowo nie robi tego ten skrypt: to jedyny krok bez odwrotu, a
 * trzydzieści dni w koszu kosztuje wyłącznie miejsce.
 *
 * Skrypt czyta `.env`, więc działa na tej bazie, na którą wskazuje
 * `SUPABASE_URL` — przy zwykłej konfiguracji jest to produkcja. To jest
 * zamierzone (czyścimy przed weselem produkcję, nie kopię), i dlatego bieg
 * na sucho jest domyślny, a `--serio` trzeba dopisać z palca.
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnv();

const SERIO = process.argv.includes("--serio");

const need = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_BUCKET",
];
const missing = need.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`\n  Brak w .env: ${missing.join(", ")}\n`);
  process.exit(1);
}

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

// Wiersze bierzemy **wszystkie**, także wygaszone (`is_active = false`).
// Zdjęcie podmienione na kafelku zostawia stary wiersz i stary plik na Dysku;
// czyszczenie, które omija wygaszone, zostawiłoby po testach same sieroty.
const { data: photos, error } = await sb
  .from("photos")
  .select("id, drive_file_id, preview_path, thumb_path");
if (error) throw error;

const { count: claims } = await sb.from("claims").select("*", { count: "exact", head: true });
const { count: proby } = await sb
  .from("panel_attempts")
  .select("*", { count: "exact", head: true });

const driveIds = photos.map((p) => p.drive_file_id).filter(Boolean);
const paths = photos.flatMap((p) => [p.preview_path, p.thumb_path]).filter(Boolean);

console.log(`\n  baza:              ${process.env.SUPABASE_URL}`);
console.log(`  tryb:              ${SERIO ? "KASOWANIE" : "na sucho — nic nie zniknie"}\n`);
console.log(`  wiersze photos:    ${photos.length}`);
console.log(`  zgłoszenia:        ${claims}`);
console.log(`  pliki na Dysku:    ${driveIds.length} (do kosza)`);
console.log(`  ścieżki w Storage: ${paths.length}`);
console.log(`  próby PIN-u:       ${proby}`);

const token = await accessToken();
console.log(`\n  token Google:      odświeżony`);

// Ile z tych plików Dysk jeszcze ma. Rozjazd z liczbą wyżej jest normalny:
// zdjęcia usunięte w aplikacji poszły do kosza już wcześniej.
let zywe = 0;
for (const id of driveIds) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=trashed`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok && !(await res.json()).trashed) zywe++;
}
console.log(`  z tego na Dysku:   ${zywe} (reszta już w koszu albo skasowana)\n`);

if (!SERIO) {
  console.log(`  Nic nie skasowano. Żeby wykonać: npm run reset -- --serio\n`);
  process.exit(0);
}

// 1. Dysk — najpierw, bo to jedyny krok, który może paść z winy Google.
let doKosza = 0;
for (const id of driveIds) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ trashed: true }),
  });
  if (res.ok) doKosza++;
  else console.warn(`  ! plik ${id} został na Dysku (HTTP ${res.status})`);
}
console.log(`  Dysk:      ${doKosza}/${driveIds.length} do kosza`);

// 2. Storage — podglądy i miniatury. Usunięcie nieistniejącej ścieżki to pusty
//    ruch, więc nie ma po co sprawdzać, które z nich jeszcze są.
if (paths.length) {
  const { error: rmError } = await sb.storage.from(process.env.SUPABASE_BUCKET).remove(paths);
  if (rmError) throw rmError;
}
console.log(`  Storage:   ${paths.length} ścieżek`);

// 3. Baza — na końcu. `claims` przed `photos` nie jest wymagane (klucz obcy
//    prowadzi do `guests`, nie do `photos`), ale trzyma porządek: najpierw
//    znika werdykt, potem dowody.
await wyczysc("claims");
await wyczysc("photos");
// Licznik nietrafionych PIN-ów. Bez tego panel potrafi wejść w wesele
// zablokowany na godzinę po czyichś próbach z testów.
await wyczysc("panel_attempts");

console.log(`\n  Gotowe. Lista gości i ich kody nietknięte.`);
console.log(`  Kosz na Dysku został pełny — opróżnij go ręcznie, jeśli chcesz odzyskać miejsce.\n`);

/** `neq('id', ...)` z niemożliwym id, bo PostgREST nie przyjmuje `delete` bez filtra. */
async function wyczysc(tabela) {
  const { error: delError, count } = await sb
    .from(tabela)
    .delete({ count: "exact" })
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (delError) throw delError;
  console.log(`  ${tabela.padEnd(10)} ${count} wierszy`);
}

async function accessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    console.error(`\n  Odświeżenie tokena nie wyszło: ${JSON.stringify(body)}`);
    if (body.error === "invalid_grant") {
      console.error(`  Uruchom ponownie: npm run google-auth\n`);
    }
    process.exit(1);
  }
  return body.access_token;
}
