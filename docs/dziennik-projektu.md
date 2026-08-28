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
- [Obciążenie i równoczesny ruch](#obciążenie-i-równoczesny-ruch)
- [Przeglądarka i front](#przeglądarka-i-front)
- [Wizualia](#wizualia)
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

Stan końcowy: **90 testów**, produkcja na https://foto-bingo.vercel.app.

Osobne dokumenty: [wizualia](wizualia.md), [konfiguracja Google](google-setup.md),
[Supabase](supabase-setup.md), [wdrożenie](vercel-deploy.md), [runbook weselny](runbook-weekend.md).

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

## Obciążenie i równoczesny ruch

Sekcja powstała z jednego pytania: **czy przy wielu gościach naraz powtórzy się to,
co spotkało nas w SplitDecu.** Odpowiedź okazała się ciekawsza od pytania.

### Nie — i to nie przypadek, tylko decyzja D8

To są dwa różne sposoby rozmowy z bazą i tylko jeden z nich ma czym się zatkać.

| | SplitDec | FotoBingo |
|---|---|---|
| Warstwa dostępu | SQLAlchemy + asyncpg, `DATABASE_URL` | `supabase-js` → PostgREST po HTTPS |
| Co robi funkcja | otwiera **połączenie do Postgresa** | wysyła **żądanie HTTP** |
| N równoległych wywołań | N połączeń do bazy | N żądań, zero nowych połączeń |
| Konieczna obrona | pooler :6543, `NullPool`, `statement_cache_size=0` | żadna — pooling jest po stronie Supabase |

W SplitDecu każda instancja funkcji zajmowała gniazdo w bazie, a serverless to dziesiątki
instancji budzących się na zimno. Stąd cała ostrożna konfiguracja opisana w tamtejszym
`CLAUDE.md`. Tutaj decyzja D8 odcięła ten problem u źródła, zanim zdążył się pojawić.

**Zmierzone na żywym projekcie `foto-bingo`:** `max_connections` = 60, PostgREST trzymał
w spoczynku **jedno** połączenie, żadna rola nie ma własnego limitu połączeń. Wolumen też
nie jest problemem: ~27 zapytań na zdjęcie × 1200 zdjęć ≈ 32 tys. zapytań rozłożone
na 72 godziny. Kształt ruchu mógł być problemem — patrz niżej.

### Prawdziwe wąskie gardło leżało piętro dalej: podpisy do plików

Szukaliśmy kłopotu w bazie, a siedział w magazynie. `GET /me` podpisywał każdy kafelek
osobno, w pętli: **25 równoległych żądań do Storage na jedno odświeżenie planszy**,
otwieranych z wnętrza funkcji, która ma 30 sekund do limitu. Kilkunastu gości naraz
w czasie pierwszego tańca — czyli szczyt ruchu z sekcji 2 specyfikacji — to kilkaset
połączeń i realna droga do 504.

Gorsza połowa jest mniej oczywista. **Podpis zmienia adres**, bo token niesie znacznik
czasu. Ten sam kafelek dostawał przy każdym odświeżeniu inny URL, więc przeglądarka
nie trafiała w cache i pobierała miniaturę jeszcze raz — z pakietu danych gościa
i z darmowego transferu Supabase, dzielonego przez całą organizację ze SplitDekiem.

Naprawione (decyzja D12): jeden `createSignedUrls` na ekran, sześciogodzinna ważność,
cache adresów w instancji funkcji, `cacheControl: 86400` przy wgrywaniu.

**Morał:** pytanie „czy baza wytrzyma" było dobre, ale odpowiedź leżała o warstwę dalej.
Warto policzyć żądania **wychodzące z funkcji**, nie tylko te do niej przychodzące.

### Pętla wysyłki oryginału mogła kręcić się w miejscu

`putChunk` przy odpowiedzi 308 bez nagłówka `range` zwraca przesunięcie 0. To jest
wartość, nie `null`, więc `??` w pętli jej nie przykrywało i wysyłka wracała na początek
pliku. Gdyby Google odpowiadał tak w kółko, telefon wysyłałby ten sam kawałek po 3 MB
bez końca, a każde podejście to jeszcze trzy zapytania do bazy.

**Nie zdarzyło się ani razu** — to znalezisko z czytania kodu, nie z awarii. Pętla ma
teraz licznik `MAX_STALLED_CHUNKS`: po trzech próbach bez postępu zadanie wraca do
kolejki i czeka na następny powrót sieci, zamiast zostać generatorem ruchu.

### Czego naprawiać nie trzeba było: wyścig o kafelek

Dwa równoległe `finalize` na ten sam kafelek nie zrobią dwóch aktywnych zdjęć — pilnuje
tego częściowy indeks unikalny `photos_one_active_per_tile`. SplitDec potrzebował na to
blokad wierszy `FOR SHARE`, protokołu opisanego w `CLAUDE.md` i osobnego testu na
Postgresie, bo w SQLite te klauzule cicho znikają. Tutaj wystarczyła jedna linijka
w migracji, bo model danych jest prostszy. Przegrane żądanie kończy się błędem 500,
kolejka ponawia, drugie podejście przechodzi czysto.

### Co zostało świadomie nieruszone

- **Limity wysyłek na gościa.** Specyfikacja obiecuje w sekcji 11 trzy zdjęcia na kafelek
  i 120 wysyłek na gościa. **W kodzie ich nie ma** — jedyny hamulec w API to licznik
  nieudanych PIN-ów do panelu. Prawdziwy limit musi liczyć w bazie, nie w pamięci procesu,
  bo funkcja Vercela to kilka instancji budzących się na zimno; SplitDec ma na to osobny
  `ratelimit.py`. Przy 40 zaproszonych gościach to ochrona przed zepsutym telefonem,
  nie przed złośliwością — a temu przypadkowi zdążył już zapobiec licznik w pętli wysyłki.
- **Wyścig przy zakładaniu folderu na Dysku.** `ensureGuestFolder` szuka folderu po
  nazwie, zanim go utworzy, i komentarz w kodzie twierdzi, że to chroni przed duplikatem.
  Nie chroni: dwa równoległe żądania oba nie znajdują nic i oba tworzą folder. Trafia
  tylko przy dwóch otwartych kartach naraz, a skutek jest kosmetyczny — zdublowany folder
  w archiwum.

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

### Przycisk „Zainstaluj" pojawiał się dopiero przy drugim skanie kodu QR

Zgłoszone z fizycznego Androida i potwierdzone: przy **pierwszym** zeskanowaniu
winietki baner instalacji nie pokazywał się wcale, przy drugim był od razu.

`beforeinstallprompt` leci **raz na załadowanie strony**, w momencie wybranym przez
Chrome, i przepada bezpowrotnie, jeśli w tej sekundzie nikt nie słucha — nie da się
o nie dopytać później. Nasłuch siedział w `useEffect` komponentu `InstallBanner`,
a ten renderuje się na planszy, czyli **za bramką o zdjęciach**. Przy pierwszym
skanie gość czyta wtedy ekran zgody przez kilkanaście sekund, Chrome strzela
w próżnię i przycisku nie ma. Przy drugim wejściu zgoda jest już zapamiętana,
plansza wchodzi od razu, nasłuch zdąża.

Lekarstwem jest przeniesienie samego przechwycenia poza React —
`src/lib/install.ts`, uruchamiane z `main.tsx` przed pierwszym renderem. Komponent
tylko czyta przez `useSyncExternalStore` to, co już zostało złapane. Zdarzenie
potrafi przyjść przed zamontowaniem czegokolwiek, więc stan musi je przeżyć bez
żadnego drzewa komponentów — dlatego zwykły moduł, a nie kontekst.

**Ogólniejszy wniosek, wart zapamiętania poza tym jednym przyciskiem:** zdarzenia
okna, które lecą raz i nie wracają, nie mogą być nasłuchiwane z komponentu
stojącego za jakąkolwiek bramką. Nie ma znaczenia, jak szybko ta bramka się
przeklikuje — liczy się, że gość może przy niej stanąć.

Testu nie dało się napisać na prawdziwym zdarzeniu (Chrome nie strzela nim na
żądanie), ale scenariusz odtwarza się wiernie zdarzeniem syntetycznym wysłanym
dokładnie w tym momencie, w którym gość czyta ekran zgody. Zanim uznaliśmy test
za dobry, sprawdziliśmy, że **psuje się po zakomentowaniu jednej linijki**
w `install.ts` — trzy przypadki na czerwono.

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

Po dojściu angielskiego kusiło, żeby zrobić z tego jedną wspólną abstrakcję na oba języki.
Nie zrobiliśmy — i serbski pokazał później, ile to było warte. Serbski ma **też trzy formy,
ale inaczej rozdzielone**: 21 bierze formę pojedynczą („21 fotografija"), gdy polski bierze
dopełniaczową („21 zdjęć"). Wspólny mechanizm musiałby więc i tak trzymać dwie reguły pod
jednym interfejsem.

Drugi haczyk wyszedł przy niemieckim i serbskim: odmienia się nie tylko rzeczownik, ale
i **czasownik** („1 Foto wartet", ale „2 Fotos warten"), więc formą jest cała fraza, a nie
samo słowo. Sklejanie liczby z rzeczownikiem i doklejanie reszty zdania z zewnątrz psuje
liczbę mnogą w połowie języków.

**Każdy słownik rządzi się własną gramatyką** — polski woła `count()` z `plural.ts`,
a angielski, serbski i niemiecki liczą u siebie, każdy w kilku linijkach.

### Czcionka ciągnie podzbiory, o których nikt nie prosił

Przeglądarka pobiera tylko potrzebne (`unicode-range`), ale **precache service workera
bierze wszystko jak leci** — czyli cyrylicę, grekę i wietnamski przy pierwszym wejściu,
przy weselu w górach. Wykluczone w `workbox.globIgnores`.

Pułapka jest w tym, że lista wykluczeń **nazywa pliki po imieniu**. Napisana była dla
Manrope'a; przy zmianie wizualiów Manrope wyleciał, a wzorce zostałyby martwe i po cichu
przepuściłyby cztery nowe podzbiory Lory. Zmiana rodziny pisma to zawsze także zmiana
w `globIgnores` — sprawdzaj po buildzie, co naprawdę wylądowało w `dist/sw.js`, a nie
co miało wylądować.

### Vercel ma limit 4,5 MB na ciało funkcji

Dlatego kompresja dzieje się w telefonie, a oryginał idzie kawałkami po 3 MB
(12 × 256 KB — Google wymaga wielokrotności 256 KB dla wszystkich kawałków poza ostatnim).

---

## Wizualia

Pełny opis palety, typografii i ozdobników: [wizualia.md](wizualia.md). Tutaj to, na czym
się nadzialiśmy po drodze.

### Kolory czyta się z projektu, a nie dobiera na oko

Projekt weselny w Canvie da się otworzyć narzędziem i **odczytać jego strukturę**, a nie
tylko obejrzeć podgląd. Wyszło z tego, że ramka kafelka na papierowej karcie to `#b7c29c`,
obwódka kółka `#9aa97b`, a wszystkie podpisy `#525938`. Dobieranie tych wartości z oka
na podstawie miniatury dałoby paletę „w tej okolicy", a nie tę samą — i to widać, gdy
telefon leży obok wydrukowanej karty.

Przy okazji: nazwy tokenów zostały `brand-*` mimo zmiany z wina na zieleń. Dzięki temu
przemalowanie całej aplikacji nie dotknęło **ani jednej klasy** w komponentach.

### Build przeszedł, a fontów w `dist` nie było

Weryfikację „czystego" `develop` robiłem w osobnym worktree na dysku C, podpinając
`node_modules` z dysku D junctionem — żeby nie czekać na drugą instalację. Build
zakończył się sukcesem, testy przeszły, wszystko wyglądało dobrze.

Fontów nie było. Vite nie skopiował ich do `dist/assets`, tylko wstawił do CSS ścieżki
w rodzaju `url(../../../../../../../../../../../../D:/Programowanie/FotoBingo/node_modules/...)`.
Bez błędu, bez ostrzeżenia. Wyszło dopiero przy porównaniu liczby wpisów w precache'u:
**23 zamiast 27**.

**Morał:** `node_modules` podpięte przez junction na inny dysk to nie to samo co
`node_modules`. Jeśli weryfikujesz build w osobnym worktree, zrób w nim prawdziwe
`npm ci` — a wynik sprawdzaj po liczbie plików w `dist`, nie po tym, że polecenie
wyszło z zerem.

### Akwarelową dolinę trzeba było narysować trzy razy

Pierwsze dwa podejścia rysowały wzgórza jako pełne wypełnienia schodzące do dolnej
krawędzi, a rzekę jako kształt między nimi. Za każdym razem rzeka czytała się jak
szczelina w zieleni, bo zbiegała się do punktu na horyzoncie i była tam węższa niż
kreska. Kolejne poprawki geometrii niczego nie ratowały.

Zadziałało dopiero odwrócenie problemu: rzeka **rozpuszcza się** w horyzoncie —
jej gradient zaczyna się od przezroczystości — więc nie trzeba jej niczym zasłaniać
ani do niczego dopasowywać krawędzi wzgórz. Cztery niezależne plany, każdy ciemniejszy
i mniej rozmyty, i jeden kształt na wierzchu.

**Postscriptum: ten rysunek już nie istnieje.** Trzy podejścia poszły na coś, co i tak
przegrało z bitmapą wyjętą z Canvy — patrz niżej. Wniosek o rozpuszczaniu krawędzi przeżył
i został użyty jeszcze raz: dolina z Canvy gaśnie u dołu maską, bo prosta krawędź w środku
strony czyta się jak przycięte zdjęcie.

### Własne SVG przegrało z akwarelą, mimo że wygrywało w każdej tabelce

Ozdobniki były najpierw rysowane od zera: łąka, dolina, gałązka. Argumenty były policzalne
i wszystkie prawdziwe — kilka kilobajtów zamiast stu, skalowanie bez granic, kolory brane
z palety. Rachunek wychodził na tyle jednoznacznie, że zapisaliśmy go jako decyzję D13.

Przegrał z czymś, czego nie było w rachunku: **gość trzyma winietkę w ręku i patrzy
w telefon**. Prawdziwa akwarela obok elipsy udającej kwiat nie wygląda jak wariant tego
samego stylu, tylko jak podróbka. Żadna liczba w tabelce tego nie mierzyła.

Co warto z tego zapamiętać: gdy porównanie wychodzi jednoznacznie, sprawdź najpierw, czy
mierzysz to, co decyduje. Tu decydowało sąsiedztwo z papierem, a mierzyliśmy kilobajty.

### Eksport z Canvy do PNG jest gorszy niż do PDF, i to nie po trochu

Naturalny odruch to `export-design` z `format: png` i `width: 2000`. Wychodzą z tego dwa
problemy naraz. Po pierwsze `width` (tak samo jak `export_quality: pro`) **wymaga Canva Pro**
i bez niego API zwraca `Not allowed to access design` — komunikat, który wygląda na problem
z uprawnieniami do projektu, a nie z parametrem. Eksport bez tych dwóch pól działa od ręki.

Po drugie PNG bez `width` daje 1x, czyli 454 px na stronę, **i wypala białe tło**: kwiaty
przyjeżdżają w białym prostokącie, który na kremowej stronie widać jak kafel.

Rozwiązaniem jest eksport do **PDF**, który osadza oryginalne bitmapy razem z ich maskami
przezroczystości (`smask`). Stamtąd wyjmuje się je w pełnej rozdzielczości i z gotową alfą.
Robi to [scripts/canva-art.py](../scripts/canva-art.py).

### Biel na akwareli to nie kolor, tylko papier

Winietka nie ma maski — jest płaską bitmapą na białym tle. Zwykłe „usuń biały piksel"
zostawia brzydkie obwódki, bo akwarela nie ma ostrych krawędzi, tylko rozmyte przejścia.

Zadziałało potraktowanie obrazka tak, jak działa medium: akwarela **mnoży**, biel to goły
papier prześwitujący przez farbę. Czyli `alpha = 1 - min(r,g,b)`, a potem dzielenie koloru
przez alfę. Po złożeniu z powrotem na białym wychodzi piksel w piksel oryginał, a na kremowym —
akwarela na kremowym papierze, z całą miękkością brzegów.

### Precache nie pomaga ekranom, które ogląda się raz

Pierwszy odruch po dodaniu trzech obrazków: wrzucić wszystkie do `globPatterns` i mieć
spokój. To by kosztowało 127 KB na pierwsze wejście i **nie pomogło ani razu** dwóm z nich.

Service worker instaluje się **po** załadowaniu strony, więc przy pierwszym wyświetleniu
ekranu powitalnego precache i tak nie zdąży — obrazek leci z sieci normalnie. A przy drugim
wejściu tego ekranu już nie ma: bramka o zdjęciach pokazuje się raz, a ekran bez kodu jest
awaryjny. Płacilibyśmy więc za pobranie dwa razy i ani razu na czas.

W precache'u została sama łąka, bo jest na każdym ekranie. Dolina i łuk mają `runtimeCaching`
z `CacheFirst`: pobierają się raz, przy okazji, i zostają.

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

### Ostrzeżenia w logu builda: `@vercel/node` nie był nikomu potrzebny

**Objaw:** każdy build kończy się `5 vulnerabilities (2 moderate, 3 high)` oraz
`npm warn deprecated glob@11.1.0`. Aplikacja działa, ale log wygląda jak zaniedbany.

**Przyczyna:** dwie osobne sprawy, które w logu wyglądają na jedną.

- **Wszystkie pięć podatności** (`path-to-regexp`, `undici`, `ajv`) ciągnęło się
  z `@vercel/node`. Pakiet siedział w `devDependencies` i **nikt go nie importował** —
  handler eksportuje `fetch` z `hono/vercel`, a typy `VercelRequest`/`VercelResponse`
  nie występują w kodzie ani razu. Runtime Node dla `api/` daje sama platforma; obecność
  pakietu w `package.json` niczego nie przypina.
- **`glob@11.1.0`** to zależność `workbox-build`, czyli `vite-plugin-pwa`. Autor `glob`
  zdeprecjonował stare wydania i nasz kod nie ma tu nic do powiedzenia.

**Rozwiązanie:** `@vercel/node` usunięty z `devDependencies`. Na `glob` wpis w `overrides`
zawężony do `workbox-build` — workbox woła wyłącznie `globSync(wzorzec, {cwd, follow,
ignore})`, API niezmienne od v9, więc 13 wchodzi bez zmiany zachowania. `ajv` (jedyna
podatność, jaka została po usunięciu `@vercel/node`) podniesiony w `package-lock.json`
w obrębie `^8.6.0`, bez ruszania `package.json`.

**Sprawdzenie:** manifest precache po zmianie jest **co do wpisu identyczny** — te same
28 pozycji, 758,88 KiB, wszystkie testy zielone. Czysta instalacja z samego
`package.json` + `package-lock.json`: zero ostrzeżeń, `found 0 vulnerabilities`.

**Pułapka przy `overrides`:** samo `npm install` nie podmieniło już rozpakowanego
`node_modules/workbox-build/node_modules/glob` — `npm ls glob` pokazywał
`glob@11.1.0 invalid` dopóki katalogu nie skasowałem ręcznie. Świeża instalacja,
taka jak na Vercelu, tego problemu nie ma.

**Trzecie ostrzeżenie widać dopiero na Vercelu:** `npm warn allow-scripts` dla dwóch kopii
esbuilda (jedna z `tsx`, druga z `vite`). Lokalny npm 11.11.0 tej funkcji jeszcze nie ma,
więc czysta instalacja na Windowsie milczała — komunikat wyszedł dopiero z loga wdrożenia.
Nowszy npm domyślnie **pomija** skrypty instalacyjne zależności i czeka na jawną zgodę;
build i tak przechodzi, bo binarki esbuilda przychodzą przez `optionalDependencies`, a nie
przez `postinstall`. Zgoda siedzi w polu `allowScripts` w `package.json` i jest **pinowana
do wersji** — przy każdym podbiciu esbuilda wpis trzeba odświeżyć, inaczej ostrzeżenie
wraca. **Czysta instalacja lokalnie nie dowodzi czystego loga na Vercelu**: ostatnie słowo
ma log wdrożenia, nie terminal.

**Morał:** `npm audit fix --force` proponował tutaj **cofnięcie** `@vercel/node`
z 5.10.2 do 3.0.1 i nazywał to „breaking change". Zanim się to odpali, warto sprawdzić,
czy winna zależność jest w ogóle do czegokolwiek używana.

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
| Podpis osobno na każdy kafelek | jeden podpis na cały ekran | 25 żądań na odświeżenie i cache przeglądarki bezużyteczny |
| Wino i krem | akwarelowa zieleń z Canvy | Aplikacja leżała obok zaproszenia i jako jedyna była różowa |
| Kod pozycji na każdym kafelku | tylko w `aria-label` i poza planszą | 25 kodów na 25 polach hałasowało tam, gdzie liczy się podpis |
| Ozdobniki rysowane od zera w SVG | bitmapy wyjęte z Canvy | Obok winietki w ręku gościa własny rysunek wyglądał jak podróbka |
| Eksport grafik z Canvy do PNG | do PDF | PNG daje 1x i wypala białe tło; PDF osadza oryginały z maskami alfa |
| Tylko po polsku | polski i angielski | Część gości jest z zagranicy — zaproszenia mają wersję EN od początku |
| Angielski dla wszystkich spoza Polski | osobny serbski i niemiecki | Angielski jako drugi język to nie to samo, co ekran zgody na zdjęcia we własnym |
| Osobna stała `LABELS_EN` obok polskich etykiet | `Record<Locale, …>` w `board.ts` | Przy trzecim języku osobne stałe przepuszczają planszę bez kompletu podpisów |
| Etapy wysyłki trzymane jako polskie zdania | jako kody stanu | Stan aplikacji wyświetlany wprost nie da się przetłumaczyć |

---

## Czego nadal nie sprawdziliśmy

Rzeczy, których **nie da się** potwierdzić z linii poleceń — wszystkie są
w checkliście przedweselnej w specyfikacji.

- **Instalacja PWA na fizycznym Androidzie.** Skan QR, wysyłka zdjęcia i baner
  „Zainstaluj" — sprawdzone 23.08.2026 na produkcji; to właśnie tam wyszło, że baner
  pojawia się dopiero za drugim razem (opisane wyżej, naprawione). **Nadal do
  sprawdzenia:** sama instalacja, start bez paska adresu i to, czy zainstalowana
  aplikacja pamięta tożsamość gościa.
- **Tryb rzutnika na docelowym sprzęcie.** Pełny ekran i Wake Lock wymagają
  prawdziwego gestu i widocznej karty. Sprawdź szczególnie, **czy ekran nie gaśnie
  po minucie**.
- **Kompresja realnego HEIC z iPhone'a.** Testowaliśmy na syntetycznym szumie, który
  jest dla kompresora przypadkiem skrajnym — ale to nie to samo co plik z aparatu.
- **Nowa ścieżka podpisów na prawdziwym Storage.** Hurtowe `createSignedUrls` i cache
  adresów mają testy jednostkowe na atrapie, ale przez prawdziwy bucket jeszcze nie
  przeszły — do sprawdzenia przy pierwszym wejściu na planszę z danymi.
- **Wizualia na fizycznym telefonie.** Pisanka w rozmiarze logotypu i podpisy kafelków
  po 9 px oglądaliśmy wyłącznie w przeglądarce na biurku. Sprawdź czytelność podpisów
  w słońcu i to, czy łąka na dole nie wchodzi pod pasek gestów.
- **Akwarele na ekranie z wysokim DPR.** Bitmapy mają 560–800 px szerokości i świadomie
  ich nie powiększamy. Na biurku wygląda to dobrze, ale na telefonie z DPR 3 łąka jest
  rozciągana ponad dwukrotnie — akwarela to wybacza, tylko trzeba to zobaczyć na szkle.
- **Maska gasząca dolinę na starszym Safari.** `mask-image` bez prefiksu działa dopiero
  od Safari 15.4; jest wersja `-webkit-`, ale sprawdzona wyłącznie na Chromie. Gdyby
  nie zadziałała, wraca twarda krawędź — brzydko, ale nic się nie psuje.
- **Obce wersje u prawdziwego gościa z zagranicy.** Wykrywanie języka, długość podpisów
  w kafelku 65 px i to, czy ktoś w ogóle zauważy przełącznik. Do serbskiego i niemieckiego
  dochodzi jedno pytanie, na które nie odpowie żaden test: **czy zdania brzmią jak
  zaproszenie, a nie jak tłumaczenie**. Warto dać je przeczytać komuś, kto mówi tym językiem
  na co dzień — zwłaszcza cztery akapity o zdjęciach, bo to jedyny ekran, który naprawdę
  trzeba zrozumieć.
- **Zachowanie przy naprawdę słabym zasięgu.** Symulacja w DevTools to nie to samo,
  co jeden maszt i czterdzieści telefonów.

---

## Jedna rzecz, którą warto zapamiętać ponad wszystkie inne

**Zielony build i zielone testy nie znaczą, że działa.**

W tym projekcie: trzy nieudane wdrożenia i dwa błędy widoczne wyłącznie w prawdziwej
przeglądarce — wszystkie przy stu procentach przechodzących testów. Każdy z nich
wyszedł dopiero wtedy, gdy coś naprawdę uruchomiliśmy i sprawdziliśmy wynik po drugiej
stronie: w logach funkcji, w bazie, na Dysku albo w DOM-ie.
