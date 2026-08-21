/**
 * Sprawdzenie połączenia z Dyskiem Google.
 *
 *   npm run drive:check        — sprawdza token, konto, wolne miejsce i folder główny
 *   npm run drive:init         — dodatkowo tworzy folder główny, jeśli go nie ma
 *
 * Jest w checkliście przedweselnej: uruchom w czwartek przed weselem, żeby nie
 * dowiedzieć się w sobotę, że coś przestało działać.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { config as loadEnv } from "dotenv";

loadEnv();

const ROOT_NAME = "FotoBingo 2026";
const init = process.argv.includes("--init");

const need = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"];
const missing = need.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`\n  Brak w .env: ${missing.join(", ")}\n  Uruchom najpierw: npm run google-auth\n`);
  process.exit(1);
}

const token = await accessToken();
console.log("\n  token odswiezony: ok");

const about = await drive(
  "about?fields=user(emailAddress),storageQuota(limit,usage)",
  token,
);
const gb = (n) => `${(Number(n) / 1024 ** 3).toFixed(1)} GB`;
const limit = Number(about.storageQuota?.limit ?? 0);
const usage = Number(about.storageQuota?.usage ?? 0);
const free = limit - usage;

console.log(`  konto:            ${about.user?.emailAddress}`);
console.log(
  limit
    ? `  miejsce:          ${gb(free)} wolnego z ${gb(limit)}`
    : "  miejsce:          bez limitu",
);

// 1200 oryginalow po ~4 MB. Liczby z sekcji 5 specyfikacji.
const POTRZEBA = 4.8 * 1024 ** 3;
if (limit && free < POTRZEBA) {
  console.log(
    `\n  UWAGA: na 1200 oryginalow trzeba okolo ${gb(POTRZEBA)}, a wolnego jest ${gb(free)}.` +
      `\n  Google One 100 GB kosztuje 8,99 zl/mies. i zamyka temat.`,
  );
}

const rootId = process.env.DRIVE_ROOT_FOLDER_ID;
let folder = rootId ? await tryGet(rootId, token) : null;

if (folder) {
  console.log(`  folder glowny:    "${folder.name}" (${folder.id}) — dostepny`);
} else {
  console.log(
    rootId
      ? `\n  Folder ${rootId} jest NIEDOSTEPNY dla tej aplikacji.`
      : "\n  Brak DRIVE_ROOT_FOLDER_ID w .env.",
  );
  console.log(
    `
  Zakres drive.file daje dostep WYLACZNIE do plikow, ktore aplikacja sama
  utworzyla. Folder zalozony recznie w przegladarce jest dla niej niewidoczny,
  nawet jesli to Twoj wlasny Dysk i widzisz go na oczy.

  Dlatego folder glowny musi utworzyc aplikacja.`,
  );

  if (!init) {
    console.log("\n  Uruchom: npm run drive:init\n");
    process.exit(1);
  }

  folder = await create(ROOT_NAME, token);
  saveToEnv("DRIVE_ROOT_FOLDER_ID", folder.id);
  console.log(`\n  Utworzono "${folder.name}" (${folder.id}) i zapisano w .env`);
  console.log(`  Zobaczysz go na swoim Dysku jak kazdy inny folder.`);
}

// Prawdziwy zapis i kasowanie — jedyny sposob, zeby wiedziec, ze uprawnienia
// naprawde dzialaja, a nie tylko wygladaja na dzialajace.
const probe = await create("_test-zapisu", token, folder.id);
await remove(probe.id, token);
console.log("  zapis do folderu: ok (plik testowy utworzony i skasowany)\n");

// ---------------------------------------------------------------------------

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
    console.error(`\n  Odswiezenie tokena nie wyszlo: ${JSON.stringify(body)}`);
    if (body.error === "invalid_grant") {
      console.error(
        `\n  invalid_grant oznacza jedno z: ekran zgody byl w stanie "Testowanie"\n` +
          `  (token zyje wtedy 7 dni), cofnieto dostep w ustawieniach konta,\n` +
          `  albo zmieniono haslo. Uruchom ponownie: npm run google-auth\n`,
      );
    }
    process.exit(1);
  }
  return body.access_token;
}

async function drive(path, token) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function tryGet(id, token) {
  try {
    return await drive(`files/${id}?fields=id,name,mimeType,trashed`, token);
  } catch {
    return null;
  }
}

async function create(name, token, parent) {
  const res = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: parent ? "text/plain" : "application/vnd.google-apps.folder",
      ...(parent ? { parents: [parent] } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Tworzenie "${name}" ${res.status}: ${await res.text()}`);
  return res.json();
}

async function remove(id, token) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

function saveToEnv(key, value) {
  const current = readFileSync(".env", "utf8");
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  writeFileSync(
    ".env",
    re.test(current) ? current.replace(re, line) : `${current.replace(/\s*$/, "")}\n${line}\n`,
  );
}
