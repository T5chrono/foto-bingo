/**
 * Jednorazowe zdobycie refresh tokena do Dysku Google.
 *
 *   node scripts/google-auth.mjs
 *
 * Wymaga wypełnionych GOOGLE_CLIENT_ID i GOOGLE_CLIENT_SECRET w .env.
 * Po udanym logowaniu dopisuje GOOGLE_REFRESH_TOKEN prosto do .env — token
 * nie przechodzi przez schowek ani przez historię terminala.
 *
 * ZANIM to uruchomisz: ekran zgody musi być opublikowany do „In production".
 * W statusie „Testing" Google unieważnia refresh token po 7 dniach, a token
 * wydany w tym stanie już taki zostaje — publikacja po fakcie go nie naprawi.
 */
import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { config as loadEnv } from "dotenv";

loadEnv();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SCOPE = "https://www.googleapis.com/auth/drive.file";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(`
  Brak GOOGLE_CLIENT_ID albo GOOGLE_CLIENT_SECRET w .env.

  Google Cloud Console -> APIs & Services -> Credentials
  -> Create credentials -> OAuth client ID -> typ "Desktop app".
`);
  process.exit(1);
}

// PKCE. Dla klienta typu Desktop sekret i tak nie jest prawdziwym sekretem,
// wiec to weryfikator chroni wymiane kodu przed przechwyceniem.
const verifier = randomBytes(32).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");
const state = randomBytes(16).toString("base64url");

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);

  // Krotki adres startowy. Pelny adres do Google ma kilkaset znakow i pare
  // ampersandow — a te potrafia zginac przy kopiowaniu z terminala albo przy
  // przekazywaniu przez powloke. Tutaj uzytkownik otwiera http://localhost:8765/start
  // i przekierowanie robi serwer, ktory adres zna w calosci.
  if (url.pathname === "/start") {
    res.writeHead(302, { Location: authUrl() });
    return void res.end();
  }

  if (url.pathname !== "/") return void res.writeHead(404).end();

  const finish = (msg) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<meta charset="utf-8"><body style="font:16px system-ui;padding:3rem">${msg}</body>`);
  };

  if (url.searchParams.get("state") !== state) {
    finish("Niezgodny parametr state. Zamknij okno i uruchom skrypt ponownie.");
    return void fail("Niezgodny state — przerwane.");
  }

  const error = url.searchParams.get("error");
  if (error) {
    finish(`Google odmówiło: ${error}. Możesz zamknąć to okno.`);
    return void fail(`Google odmowilo: ${error}`);
  }

  const code = url.searchParams.get("code");
  if (!code) return void finish("Brak kodu w odpowiedzi.");

  try {
    const tokens = await exchange(code);

    if (!tokens.refresh_token) {
      finish("Google nie oddało refresh tokena. Sprawdź konsolę.");
      return void fail(
        "Brak refresh_token w odpowiedzi.\n" +
          "Najczestsza przyczyna: to konto juz raz zgodzilo sie na dostep, wiec Google\n" +
          "nie wydaje nowego. Cofnij dostep na https://myaccount.google.com/permissions\n" +
          "i uruchom skrypt ponownie.",
      );
    }

    const who = await verify(tokens.access_token);
    saveToEnv(tokens.refresh_token);

    finish("Gotowe. Możesz zamknąć to okno i wrócić do terminala.");
    console.log(`
  Refresh token zapisany w .env

  Sprawdzenie na zywym API: ${who}

  Nastepny krok: utworz na Dysku folder "FotoBingo 2026", wejdz do niego
  i skopiuj identyfikator z adresu (.../folders/TO_JEST_ID) do
  DRIVE_ROOT_FOLDER_ID w .env.
`);
    server.close();
    process.exit(0);
  } catch (err) {
    finish("Wymiana kodu na token nie wyszła. Sprawdź konsolę.");
    fail(String(err));
  }
});

// Staly port i "localhost", nie losowy i nie 127.0.0.1. Powody sa dwa:
// Google nie akceptuje adresu 127.0.0.1 dla klientow typu "Aplikacja
// internetowa" (dla "Aplikacji komputerowej" oba dzialaja), a staly port
// daje sie zarejestrowac recznie, gdyby klient okazal sie tego pierwszego
// typu. Losowy port nie da sie zarejestrowac z definicji.
const PORT = 8765;

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    // Nieudane uruchomienie zostawia ten serwer w tle, wiec kolejna proba
    // pada wlasnie tutaj. Warto od razu powiedziec, jak to zamknac.
    fail(
      `Port ${PORT} jest zajety — najpewniej przez poprzednie uruchomienie tego\n` +
        `  skryptu, ktore zostalo w tle. Zamknij je i sprobuj ponownie:\n\n` +
        `    npm run google-auth:reset\n`,
    );
  } else fail(String(e));
});

let port;
server.listen(PORT, "127.0.0.1", () => {
  port = PORT;
  const redirectUri = `http://localhost:${port}`;

  console.log(`
  Otwieram przegladarke. Zaloguj sie kontem, na ktorego Dysku maja
  ladowac zdjecia z wesela, i zezwol na dostep.

  Gdyby okno sie nie otworzylo, wklej w przegladarke ten adres:

      http://localhost:${port}/start

  (adres przekierowania dla klienta OAuth: ${redirectUri})
`);
  openBrowser(`http://localhost:${port}/start`);
});

function authUrl() {
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.searchParams.set("client_id", CLIENT_ID);
  auth.searchParams.set("redirect_uri", `http://localhost:${port}`);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", SCOPE);
  // Bez tych dwoch Google nie wyda refresh tokena przy powtornym logowaniu.
  auth.searchParams.set("access_type", "offline");
  auth.searchParams.set("prompt", "consent");
  auth.searchParams.set("state", state);
  auth.searchParams.set("code_challenge", challenge);
  auth.searchParams.set("code_challenge_method", "S256");
  return auth.toString();
}

async function exchange(code) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: `http://localhost:${port}`,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

/** Prawdziwe wywolanie Drive API — lepiej dowiedziec sie teraz niz w sobote. */
async function verify(accessToken) {
  const res = await fetch(
    "https://www.googleapis.com/drive/v3/about?fields=user(emailAddress),storageQuota(limit,usage)",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return `nie udalo sie odpytac Drive API (HTTP ${res.status})`;
  const { user, storageQuota } = await res.json();
  const gb = (n) => (n ? `${(Number(n) / 1024 ** 3).toFixed(1)} GB` : "?");
  const wolne =
    storageQuota?.limit && storageQuota?.usage
      ? `${gb(Number(storageQuota.limit) - Number(storageQuota.usage))} wolnego z ${gb(storageQuota.limit)}`
      : "limit nieznany";
  return `${user?.emailAddress ?? "?"} — ${wolne}`;
}

function saveToEnv(refreshToken) {
  const current = readFileSync(".env", "utf8");
  const line = `GOOGLE_REFRESH_TOKEN=${refreshToken}`;
  const next = /^GOOGLE_REFRESH_TOKEN=.*$/m.test(current)
    ? current.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, line)
    : `${current.replace(/\s*$/, "")}\n${line}\n`;
  writeFileSync(".env", next);
}

function openBrowser(url) {
  // NIE przez `cmd /c start`: cmd.exe traktuje & jako separator polecen, wiec
  // ucina adres na pierwszym parametrze zapytania. Objawia sie to bledem
  // "Required parameter is missing: response_type" — Google dostaje sam
  // client_id. rundll32 nie przechodzi przez zadna powloke.
  const cmd =
    process.platform === "win32" ? ["rundll32", ["url.dll,FileProtocolHandler", url]]
    : process.platform === "darwin" ? ["open", [url]]
    : ["xdg-open", [url]];
  try {
    spawn(cmd[0], cmd[1], { stdio: "ignore", detached: true }).unref();
  } catch {
    /* wklei recznie */
  }
}

function fail(msg) {
  console.error(`\n  ${msg}\n`);
  server.close();
  process.exit(1);
}
