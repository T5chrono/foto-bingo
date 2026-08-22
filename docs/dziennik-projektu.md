# Dziennik projektu

Co zbudowaliśmy i na co się nadzialiśmy po drodze — żeby nie odkrywać tego drugi raz.

Ten plik jest inny niż [specyfikacja](../FotoBingo%20-%20specification.md). Tamta mówi
**jak jest i dlaczego**. Ten mówi **czego się nauczyliśmy**, łącznie z rzeczami, które
są już naprawione i po których w kodzie nie widać, ile kosztowały.

Pułapki są opisane **objawem na początku**, bo tak się je spotyka: najpierw widzisz
dziwny komunikat, dopiero potem szukasz przyczyny.

---

## Spis treści

- [Co powstało](#co-powstało)
- [Google Drive i OAuth](#google-drive-i-oauth)
- [Spike S1 — najciekawsza porażka projektu](#spike-s1--najciekawsza-porażka-projektu)
- [Supabase](#supabase)
- [Przeglądarka i front](#przeglądarka-i-front)
- [Vercel](#vercel)
- [Środowisko lokalne (Windows)](#środowisko-lokalne-windows)
- [Decyzje, które odwróciliśmy](#decyzje-które-odwróciliśmy)
- [Czego nadal nie sprawdziliśmy](#czego-nadal-nie-sprawdziliśmy)

---

## Co powstało

Pięć etapów, każdy zamknięty własnym commitem na `master`.

| Etap | Zakres | Co z niego zostało w kodzie |
|---|---|---|
| 1 | Plansza 5×5, logika bingo, PWA, CI | `src/lib/board.ts`, `src/lib/bingo.ts`, `vite.config.ts` |
| 2 | Wejście z QR, kompresja, kolejka offline, wysyłka | `src/lib/image.ts`, `src/lib/queue.ts`, `src/lib/uploader.ts`, `api/_lib/photos.ts` |
| 3 | Oryginały na Dysk Google, kawałkami | `api/_lib/drive.ts`, endpointy `/photos/original/*` |
| 4 | Zgłoszenia bingo, panel, tryb rzutnika | `api/_lib/claims.ts`, `api/_lib/panel.ts`, `src/pages/PanelPage.tsx`, `src/pages/ClaimPage.tsx` |
| 5 | Winietki QR, ekran o zdjęciach, instalacja, runbook | `scripts/generate-guests.mjs`, `src/components/PrivacyGate.tsx`, `src/components/InstallBanner.tsx` |

Stan końcowy: **82 testy**, produkcja na https://foto-bingo.vercel.app.

Osobne dokumenty: [konfiguracja Google](google-setup.md), [Supabase](supabase-setup.md),
[wdrożenie](vercel-deploy.md), [runbook weselny](runbook-weekend.md).

---

## Google Drive i OAuth

### Folder założony ręcznie jest dla aplikacji niewidoczny

**Objaw:** zapis do folderu kończy się `404`, mimo że folder istnieje, należy do tego
samego konta i widzisz go w przeglądarce.

**Przyczyna:** zakres `drive.file` daje dostęp **wyłącznie do plików, które aplikacja
sama utworzyła**. Własność konta nie ma tu nic do rzeczy.

**Rozwiązanie:** folder główny tworzy `npm run drive:init`. Ta sama zasada jest zresztą
gwarancją prywatności — aplikacja nie widzi reszty Dysku.

### `Błąd 400: invalid_request`, „Required parameter is missing: response_type"

**Objaw:** ekran zgody Google rozpoznaje aplikację i pokazuje Twój adres e-mail,
ale twierdzi, że brakuje parametru, który na pewno wysłałeś.

**Przyczyna:** skrypt otwierał przeglądarkę przez `cmd /c start <adres>`, a **cmd.exe
traktuje `&` jako separator poleceń**. Adres autoryzacji ma osiem ampersandów, więc
został ucięty tuż za `client_id` — stąd rozpoznanie aplikacji i brak całej reszty.

**Rozwiązanie:** `rundll32 url.dll,FileProtocolHandler`, które nie przechodzi przez
powłokę. Dodatkowo skrypt wystawia krótki adres `http://localhost:8765/start`
i sam przekierowuje, więc pełny adres nie musi już przechodzić przez schowek.

### `127.0.0.1` bywa odrzucany, `localhost` nie

Dla klientów OAuth typu **Aplikacja internetowa** Google nie akceptuje adresu
zwrotnego z IP. Dla **Aplikacji komputerowej** działają oba. `localhost` działa
zawsze, więc nie ma powodu wybierać węższej opcji.

Do tego **stały port** zamiast losowego: losowego nie da się zarejestrować w konsoli,
gdyby klient okazał się jednak typem internetowym.

### `Port 8765 jest zajęty` przy drugiej próbie

Nieudane uruchomienie `google-auth` zostawia serwer nasłuchujący w tle. Stąd
`npm run google-auth:reset`.

### Konta serwisowego użyć się nie da

Service accounts **nie mają własnego limitu Dysku** — zapis do folderu konta
osobistego zwraca `storageQuotaExceeded`. Musi to być refresh token zwykłego konta.

### Publikacja ekranu zgody jest obowiązkowa i ma kolejność

W stanie **Testowanie** Google unieważnia refresh token po **7 dniach**, a token wydany
w tym stanie już taki zostaje — publikacja po fakcie go nie naprawi. **Publikuj przed
wygenerowaniem tokena.**

Przy samym `drive.file` (zakres niewrażliwy) publikacja nie wymaga żadnego przeglądu
ze strony Google.

---

## Spike S1 — najciekawsza porażka projektu

**Pytanie:** czy telefon może wysłać oryginał prosto do Google, z pominięciem
naszego serwera?

**Odpowiedź: nie — bo działa za dobrze.**

Sprawdzone na żywym API i w prawdziwej przeglądarce:

| Krok | Wynik |
|---|---|
| Utworzenie sesji resumable | HTTP 200 |
| Preflight CORS z `localhost:5173` | HTTP 200, `allow-methods: PUT` |
| `PUT` bez nagłówka `Authorization` | HTTP 200, **plik utworzony** |
| `Access-Control-Allow-Origin` w odpowiedzi na `PUT` | **BRAK** |
| To samo z przeglądarki | `TypeError: Failed to fetch` |

Preflight przechodzi, więc przeglądarka wysyła żądanie. Odpowiedź nie ma nagłówka CORS,
więc Chrome ją blokuje. **A plik na Dysku mimo to powstaje, w pełnym rozmiarze.**

To jest najgorszy możliwy układ: wysyłka się udaje, a klient widzi błąd. Kolejka
ponawiałaby zadania już wykonane, gość widziałby „nie wyszło" przy zdjęciu leżącym
na Dysku, a w folderze rosłyby duplikaty. **Cicha awaria nie do odróżnienia od
prawdziwej** — gorsza niż zwykłe „nie działa".

Obejście przez `mode: "no-cors"` też odpada: ten tryb nie dopuszcza metody `PUT`.

**Wniosek ogólniejszy:** „zadziałało" i „wiem, że zadziałało" to dwie różne rzeczy.
Przy kolejce, która nie ma prawa zgubić zdjęcia, ta druga jest ważniejsza — dlatego
oryginał idzie kawałkami przez naszą funkcję, mimo że to więcej kodu i więcej transferu.

---

## Supabase

### Klucz z działki Legacy vs nowy

`service_role` (Legacy) i `sb_secret_…` (nowy) mają tę samą moc. Różnica jest
w rotacji: stary to JWT podpisany sekretem projektu, więc jego rotacja unieważnia
**wszystko naraz**. Nowe klucze tworzy się i unieważnia pojedynczo.

### Wyłączony RLS to za mało — trzeba odebrać prawa

**Objaw, którego nie widać:** przy wyłączonym RLS Supabase domyślnie pozwala rolom
`anon` i `authenticated` czytać i pisać po tabelach w `public`. Klucz publishable
siedzi w kodzie **każdej zainstalowanej aplikacji gościa**, więc każdy gość mógłby
czytać cudze plansze.

**Rozwiązanie:** migracja odbiera prawa obu rolom (również domyślne dla przyszłych
obiektów) i dodatkowo włącza RLS bez żadnych polityk jako drugą warstwę.

**Sprawdzenie**, że działa — zapytanie do `/rest/v1/guests`:

| Klucz | Oczekiwane |
|---|---|
| `sb_secret_…` | `HTTP 200 []` |
| `sb_publishable_…` | **`HTTP 401 permission denied for table guests`** |

Drugi wynik jest ważniejszy od pierwszego.

### Projekt na darmowym planie usypia po 7 dniach

To jest ryzyko dla wesela, nie ciekawostka. Jeśli między końcem prac a weselem będzie
przerwa, baza może być uśpiona w piątek rano. Wybudzenie jest ręczne i trwa kilka minut.
**Punkt checklisty: wejdź do aplikacji w czwartek.**

### Darmowy plan: 2 projekty na organizację

`split-dec` plus `foto-bingo` wyczerpują limit.

### Storage nie umie tanio powiedzieć, ile waży

Stąd kolumna `photos.bytes` i funkcja `used_bytes()` w bazie — licznik w panelu ma być
jednym zapytaniem, a nie spacerem po 2400 plikach.

---

## Przeglądarka i front

### WebP nie działał przez brakującą linijkę, i nikt tego nie widział

**Objaw:** wszystkie zdjęcia zapisywały się jako JPEG, mimo obsługi WebP w przeglądarce.
Żaden test tego nie zgłaszał.

**Przyczyna:** `supportsWebp()` sprawdzał WebP na `OffscreenCanvas` **bez pobrania
kontekstu rysowania**. OffscreenCanvas rzuca wtedy `InvalidStateError`, `catch` zwracał
`false` i cała aplikacja po cichu schodziła na JPEG. To około **25% budżetu miejsca**
wyrzucone przez jedną brakującą linijkę.

**Dlaczego testy tego nie złapały:** jsdom nie ma canvasu. Ten błąd może wyjść
**wyłącznie w prawdziwej przeglądarce**.

### Zapisanie kodu z QR nie odświeżało widoku

**Objaw:** gość skanuje poprawny kod, a aplikacja pokazuje „Zeskanuj kod QR ze swojej
winietki".

**Przyczyna:** `localStorage` się zapisywał, ale React trzymał starą wartość w stanie.

**Rozwiązanie:** kontekst `useGuestToken`, a **nie** przeładowanie strony —
przeładowanie kosztowałoby drugie pobranie aplikacji dokładnie przy pierwszym skanie,
czyli tam, gdzie łącze jest najgorsze.

### Blob w IndexedDB — dwa niezależne powody, żeby go nie używać

1. **Testy:** `structuredClone` w środowisku testowym gubi zawartość Bloba, więc kolejki
   nie dało się przetestować w tym, co w niej najważniejsze.
2. **iOS Safari** ma udokumentowaną historię gubienia zawartości blobów po zamknięciu
   strony — a to jest dokładnie scenariusz, na którym stoi obietnica „zdjęcie dojdzie samo".

Kolejka trzyma `ArrayBuffer` plus typ MIME; Blob powstaje z powrotem tuż przed wysyłką.

### „6 zdjęć od 1 gości"

Polskie liczebniki mają **trzy** formy, nie dwie. `src/lib/plural.ts`, z wyjątkiem
na 12–14, który łapie też 112 i 213.

### Manrope ciągnął pięć zestawów znaków

Przeglądarka pobiera tylko potrzebne (`unicode-range`), ale **precache service workera
bierze wszystko jak leci** — 32 KB cyrylicy, greki i wietnamskiego przy pierwszym
wejściu. Wykluczone w `workbox.globIgnores`.

### Vercel ma limit 4,5 MB na ciało funkcji

Dlatego kompresja dzieje się w telefonie, a oryginał idzie kawałkami po 3 MB
(12 × 256 KB — Google wymaga wielokrotności 256 KB dla wszystkich kawałków poza ostatnim).

---

## Vercel

Pełny opis w [vercel-deploy.md](vercel-deploy.md). W skrócie — **trzy nieudane
wdrożenia z rzędu, każde z innej przyczyny, i za każdym razem build oraz 82 testy
przechodziły lokalnie**:

1. **`.ts` w importach** → Vercel transpiluje plik do `.js`, ale zostawia specyfikator →
   `ERR_MODULE_NOT_FOUND` na każdym żądaniu.
2. **Brak rozszerzeń** → type-check `api/` działa z `moduleResolution: node16`, który
   wymaga jawnych `.js`. Właściwa konwencja: **w imporcie `.js`, na dysku `.ts`**.
3. **Główny `tsconfig.json` bez `compilerOptions`** → Vercel kompiluje `api/` bez
   `strict`, a bez niego przestaje działać zawężanie unii po polu rozróżniającym.
4. **`export default` zamiast nazwanego `fetch`** → runtime Node ignoruje zwróconą
   wartość, `res` nigdy nie zostaje zapisany, każde żądanie wisi 30 s i kończy się 504.

Ta ostatnia była najbardziej myląca: build zielony, żadnego błędu w logach aplikacji,
tylko timeout. **Przy 504 na funkcji zaczynaj od `vercel logs`** — Vercel podpowiada
tam wprost, co jest nie tak.

### `X-Vercel-Id` ma dwa człony i łatwo je pomylić

```
X-Vercel-Id: arn1::cdg1::5c2h2-...
             ^^^^  ^^^^
             brzeg  funkcja
```

Pierwszy to brzeg sieci najbliższy dzwoniącemu i **zmienia się razem z tym, skąd
przychodzi żądanie**. Wziąłem go za region funkcji i przez chwilę naprawiałem coś,
co nie było zepsute.

### MCP Vercela nie mógł założyć projektu

`403 forbidden` na `create_project`. Zadziałało CLI (`npx vercel project add`).

### Deploymenty Preview mają produkcyjne sekrety

Piszą do tej samej bazy i tego samego folderu na Dysku. Są chronione logowaniem do
Vercela, więc nie są publicznie dostępne — ale warto o tym wiedzieć, zanim ktoś otworzy
podgląd niedokończonej gałęzi w weekend wesela.

---

## Środowisko lokalne (Windows)

### Norton przechwytuje HTTPS

**Objaw:** `git push` pada z `SSL certificate problem: unable to get local issuer certificate`.

**Rozwiązanie:** `git config --local http.sslBackend schannel` — kieruje weryfikację
przez magazyn certyfikatów Windowsa, gdzie Norton swój certyfikat instaluje.
Ustawić **zaraz po `git init`**: inaczej `gh repo create --push` tworzy repo na
GitHubie i zostawia je puste.

Ten sam Norton wywołuje `OPENSSL_Uplink ... no OPENSSL_Applink` w Pythonie z uv, gdy
próbuje robić HTTPS. W tym projekcie obeszliśmy to, używając `curl` i Node'a.

### `--experimental-strip-types` wymaga jawnych rozszerzeń

Node przy natywnym strippingu TypeScriptu nie robi rozszerzania ścieżek w stylu
bundlera. To nas wpędziło w rozszerzenia `.ts`, które **rozwaliły wdrożenie**
(patrz Vercel). Dev-serwer używa teraz `tsx`.

**Morał:** wygoda lokalna nie może dyktować kształtu kodu, który jedzie na produkcję.

### Stary serwer deweloperski serwuje stary kod

**Objaw:** `Invalid signature` przy wysyłce do bucketa, mimo poprawnego podpisu.

**Przyczyna:** serwer API chodził w tle od przed zmianą i nie znał nowego pola
w odpowiedzi. `bucket` było `undefined`, więc podpis dotyczył innej ścieżki.

**Morał:** przy nieoczekiwanym błędzie **najpierw sprawdź, czy proces zna aktualny kod.**

### Pułapki powłoki, które pochłonęły czas

- Bardzo długi heredoc kończy się `ENAMETOOLONG` — długie pliki pisz narzędziem do
  plików, nie przez powłokę.
- Backticki i `'''` w zagnieżdżonym Pythonie wywalają parsowanie bashа. Skrypty
  pomocnicze zapisuj do pliku i uruchamiaj, zamiast wklejać w `python -c`.

### Commit na złej gałęzi

Łańcuch poleceń zakończony na `git checkout master` zostawił mnie na `master`, więc
następny commit poszedł tam zamiast na `develop`. Nic nie przepadło (`git reflog`),
ale wdrożenie poszło ze starego stanu i dało **identyczny błąd co poprzednio** —
co przez chwilę wyglądało jak nieskuteczna poprawka.

**Morał:** po łańcuchu z `git checkout` sprawdź `git branch` przed commitem.

---

## Decyzje, które odwróciliśmy

Rzeczy zaplanowane, a potem zmienione — z powodem, bo sam powód bywa ważniejszy
od decyzji.

| Było | Jest | Dlaczego |
|---|---|---|
| Zdjęcia Google | Dysk Google | Scope wrażliwy, token ginie po 7 dniach, brak folderów |
| Google One 100 GB obowiązkowo | niepotrzebne | Konto ma plan 5 TB — sprawdziliśmy zamiast zakładać |
| Folder główny zakładany ręcznie | tworzy go aplikacja | `drive.file` nie widzi folderów zrobionych klikiem |
| Oryginał prosto z telefonu do Google | kawałkami przez funkcję | Spike S1: cicha awaria zamiast błędu |
| Kompresja do stałej jakości | do twardego budżetu bajtowego | Zdjęcia nocne psują każdą prognozę miejsca |
| Kolejka trzyma `Blob` | trzyma `ArrayBuffer` | iOS gubi bloby; do tego testowalność |
| `service_role` z Legacy | nowy klucz `sb_secret_` | Rotacja pojedynczego klucza zamiast wszystkiego |
| Endpoint „wyślij zaległe na Dysk" | lista gości do poproszenia | Serwer nie ma oryginału — leży na telefonie gościa |
| Dynamiczny manifest per gość | jedno zdanie instrukcji | iOS jest dodatkiem, nie priorytetem |
| Importy bez rozszerzeń → `.ts` | → `.js` | Trzy różne narzędzia, trzy różne wymagania |
| 48 gości | 40 gości + 8 kodów zapasowych | Doprecyzowanie od Pary Młodej |

---

## Czego nadal nie sprawdziliśmy

Rzeczy, których **nie da się** potwierdzić z linii poleceń — wszystkie są
w checkliście przedweselnej w specyfikacji.

- **Instalacja PWA na fizycznym Androidzie.** Prawdziwy skan QR, baner „Zainstaluj",
  start bez paska adresu, pamiętanie tożsamości. To ścieżka większości gości.
- **Tryb rzutnika na docelowym sprzęcie.** Pełny ekran i Wake Lock wymagają
  prawdziwego gestu i widocznej karty. Sprawdź szczególnie, **czy ekran nie gaśnie
  po minucie**.
- **Kompresja realnego HEIC z iPhone'a.** Testowaliśmy na syntetycznym szumie, który
  jest dla kompresora przypadkiem skrajnym — ale to nie to samo co plik z aparatu.
- **Zachowanie przy naprawdę słabym zasięgu.** Symulacja w DevTools to nie to samo,
  co jeden maszt i czterdzieści telefonów.

---

## Jedna rzecz, którą warto zapamiętać ponad wszystkie inne

**Zielony build i zielone testy nie znaczą, że działa.**

W tym projekcie: trzy nieudane wdrożenia i dwa błędy widoczne wyłącznie w prawdziwej
przeglądarce — wszystkie przy stu procentach przechodzących testów. Każdy z nich
wyszedł dopiero wtedy, gdy coś naprawdę uruchomiliśmy i sprawdziliśmy wynik po drugiej
stronie: w logach funkcji, w bazie, na Dysku albo w DOM-ie.
