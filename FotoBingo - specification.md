# FotoBingo — specyfikacja

Wersja 1.0 · sierpień 2026

Aplikacja weselna do gry Foto Bingo: goście dostają planszę 5×5 z 25 kategoriami zdjęć,
wysyłają zdjęcia z telefonu, a Para Młoda weryfikuje zgłoszenia bingo i wyświetla zdjęcia
na rzutniku. Zdjęcia trafiają na Dysk Google Pary Młodej, do folderu każdego gościa,
pod nazwami kodującymi kategorię.

---

## 1. Cel i kontekst

Wesele trwa trzy dni: piątkowe ognisko, sobota (ceremonia i zabawa), niedziela do późnej nocy.
Ośrodek leży w Beskidzie Niskim. W głównym budynku jest Wi-Fi; w dalszych częściach terenu
i na spacerach zasięgu może nie być wcale.

Zamiast drukowanej listy kategorii i zdjęć rozsypanych po prywatnych WhatsAppach, każdy gość
dostaje instalowalną aplikację na telefon. Klika kategorię, wybiera zdjęcie z galerii, wysyła.
Aplikacja sama pilnuje, co jest zebrane, i sama wykrywa bingo.

**Trzy rzeczy, które przesądziły o kształcie rozwiązania:**

1. Nazwa pliku na Dysku ma kodować kategorię i autora — po weselu musi być wiadomo, co jest co.
2. Gdy ktoś zgłasza bingo, jego zdjęcia muszą pojawić się na rzutniku natychmiast, na żywo.
3. Para Młoda chce mieć oryginały w pełnej rozdzielczości, **bez proszenia gości o cokolwiek
   po weselu**.

---

## 2. Skala i budżet

| Wielkość | Wartość |
|---|---|
| Goście | 40 |
| Kodów QR — goście plus zapas | **48** |
| Kategorii na planszy | 25 |
| Plansz maksymalnie | 48 |
| Zdjęć maksymalnie | **1200** |
| Okres zbierania | ~72 godziny |
| Szczyt ruchu | ceremonia i pierwszy taniec — kilkanaście wysyłek naraz |

Gości jest 40, ale kodów drukujemy 48. Osiem zapasowych pokrywa zgubione winietki, nieplanowane
osoby towarzyszące i dzieci, które zechcą grać na własnej planszy — czyli wszystko, czego nie da
się przewidzieć w piątek. Zapasowy kod nie zajmuje miejsca, dopóki ktoś go nie użyje.

**Wszystkie budżety poniżej liczone są od sufitu 48 plansz**, a nie od 40 realnych gości — i to
przy założeniu, że każdy zapełni wszystkie 25 pól. Realnie będzie znacznie mniej. Zapas ma być
zapasem, nie nadzieją.

---

## 3. Decyzje architektoniczne

Sekcja zapisuje **co** zdecydowaliśmy, **jakie były alternatywy** i **dlaczego** wybór padł tak,
a nie inaczej. Kolejność chronologiczna.

### D1 — Aplikacja jest PWA, nie aplikacją natywną

**Wybrano:** instalowalna strona (Progressive Web App) hostowana na Vercelu.

**Odrzucono:** aplikacja z Google Play. Wymaga konta developerskiego, przeglądu, publikacji,
a goście musieliby jej szukać w sklepie. Dla 40 osób i jednego weekendu to absurdalny narzut.

**Dlaczego to działa:** gość skanuje QR, otwiera stronę, dodaje ją do ekranu głównego dwoma
dotknięciami. Dostaje ikonę, pełny ekran bez paska adresu i działanie offline. Aktualizacja
aplikacji to zwykły deploy — bez czekania na sklep.

### D2 — Zdjęcia lądują na Dysku Google, nie w Zdjęciach Google

**Wybrano:** Google Drive API ze scope `https://www.googleapis.com/auth/drive.file`.

**Odrzucono:** Google Photos Library API. Trzy powody, każdy wystarczający:

- `photoslibrary.appendonly` to **scope wrażliwy**. Bez przejścia weryfikacji Google aplikacja
  zostaje w statusie „Testing", gdzie **refresh token wygasa po 7 dniach**. Token wygasający
  w środku wesela jest nie do przyjęcia.
- Zdjęcia Google nie mają folderów, a nazwa pliku jest w interfejsie praktycznie niewidoczna —
  czyli wymaganie nr 1 z sekcji 1 przepada.
- Udostępnianie albumów zdeprecjonowano 31.03.2025.

**Dlaczego `drive.file` jest bezpieczny:** to scope **niewrażliwy**. Consent screen publikuje się
do statusu „In production" **bez żadnej weryfikacji Google**, a refresh token żyje bezterminowo.
Aplikacja widzi wyłącznie pliki, które sama utworzyła — nie ma dostępu do reszty Dysku.

### D3 — Uwierzytelnienie do Google trzyma serwer, nie gość

**Wybrano:** jeden refresh token konta Pary Młodej, przechowywany w zmiennej środowiskowej
na Vercelu. Serwer wysyła pliki w imieniu wszystkich gości.

**Odrzucono:** logowanie gości do Google. 40 osób przechodzących przez ekran zgody Google,
część bez konta pod ręką, część na iOS gdzie flow bywa kapryśny — plus pliki lądowałyby
na ich Dyskach, a nie na naszym.

**Odrzucono też:** konto serwisowe (service account). **Konta serwisowe nie mają własnego limitu
Dysku** i przy zapisie do folderu konta osobistego zwracają `storageQuotaExceeded`. To musi być
token zwykłego konta.

### D4 — Dwa magazyny, każdy do czego innego

**Wybrano:**

- **Supabase Storage** — wersje zmniejszone (podgląd + miniatura). Magazyn roboczy: karmi
  planszę, panel i rzutnik.
- **Dysk Google** — oryginały z aparatów w pełnej rozdzielczości. Archiwum.

**Odrzucono:** wyłącznie Dysk. Dysk oddaje pliki tylko przez autoryzowane pobranie
z krótkożyjącymi linkami — każdy obrazek musiałby przejść przez naszą funkcję serwerową.
Przy rzutniku na sali, na żywo, to znaczy „stoimy i czekamy". Supabase oddaje pliki
podpisanym linkiem prosto z sieci dostawczej.

**Odrzucono:** wyłącznie Supabase. Darmowy limit to 1 GB, a 1200 oryginałów to kilka gigabajtów.
Poza tym Para Młoda chce mieć zdjęcia u siebie, w normalnych folderach, nie w cudzej chmurze.

**Efekt uboczny, który okazał się ważny:** gdy Dysk jest chwilowo nieosiągalny, zdjęcie jest już
bezpieczne w Supabase. Kopiowanie ponawiamy choćby następnego dnia i nikt tego nie zauważa.

### D5 — Oryginały jadą, ale w tle

**Wybrano:** telefon produkuje z jednego zdjęcia **dwie rzeczy** i wysyła je z różnym priorytetem.

1. **Podgląd** (≤350 KB) leci natychmiast do Supabase. Kafelek się zapełnia, bingo działa.
   Gość czeka kilka sekund i ma poczucie, że skończył.
2. **Oryginał** (~4 MB, nietknięty) leci osobno na Dysk, w tle, z niskim priorytetem. Może iść
   godzinę. Nikt na niego nie patrzy.

**Odrzucono:** jedna wersja dla wszystkiego. Musiałaby być kompromisem — albo za duża dla
darmowego Supabase, albo za mała jako archiwum.

**Odrzucono:** proszenie gości o oryginały po weselu. To była realna alternatywa (oryginały i tak
zostają w telefonach), ale Para Młoda nie chce po weselu ścigać 40 osób. Decyzja świadoma,
podjęta ze znajomością kosztu: ~110 MB transferu na gościa i ~5 GB na Dysku.

**Gwarancja bezpieczeństwa:** jeśli oryginał nigdy nie dojdzie, **nic nie jest stracone**.
Podgląd jest w Supabase, zdjęcie liczy się do bingo, widać je na rzutniku. Oryginał to bonus.

### D6 — Tożsamość gościa to kod z QR, nie konto

**Wybrano:** z listy gości generujemy losowe kody (8 znaków base32, ~40 bitów entropii)
i drukujemy je jako QR na winietkach. Adres `https://<domena>/g/k7m2q` to cała tożsamość.
W bazie trzymamy wyłącznie SHA-256 kodu.

**Odrzucono:** wpisywanie imienia na starcie. Literówki, duplikaty, podszywanie się.
Zostaje jako awaryjna ścieżka w panelu, obsługiwana ręcznie przez Parę Młodą.

**Odrzucono:** hasła, e-maile, logowanie. Na weselu. Nie.

### D7 — Backend w TypeScript, nie w Pythonie

**Wybrano:** jedna funkcja Vercela w TypeScript, router [Hono](https://hono.dev).

**Odrzucono:** FastAPI/Python, jak w SplitDecu. Powody:

- Backend to siedem endpointów. Nie potrzebuje ciężkiego frameworka.
- `googleapis` ma pierwszorzędny SDK dla Node.
- Znika cały aparat `.venv` / `UV_LINK_MODE` / `truststore`, który w SplitDecu istnieje wyłącznie
  jako obejście problemów Pythona na Windowsie i na Vercelu.
- Slugifikacja nazw plików jest **wspólna dla frontu i backendu** — jeden plik `src/lib/slug.ts`
  zamiast dwóch implementacji, które muszą dawać identyczny wynik.
- Jeden runner testów (vitest) dla całości zamiast pytest + vitest.

### D8 — Dostęp do bazy przez `supabase-js`, bez własnego poolera

**Wybrano:** serwer rozmawia z bazą przez `@supabase/supabase-js` z kluczem `service_role`.

**Odrzucono:** bezpośrednie połączenie Postgresem (jak `DATABASE_URL` w SplitDecu). Tam było
konieczne przez SQLAlchemy i wymagało uważnej konfiguracji transaction poolera, `NullPool`
i `statement_cache_size=0`. Przy trzech tabelach i zapytaniach typu „daj zdjęcia gościa" to
narzut bez korzyści.

**Konsekwencja:** klucz `service_role` omija RLS i **nigdy nie może trafić do przeglądarki**.
Żyje wyłącznie w zmiennych środowiskowych funkcji.

### D9 — RLS wyłączony, funkcja serwerowa jest jedyną granicą

Tak samo jak w SplitDecu. Przeglądarka nigdy nie rozmawia z bazą bezpośrednio — wszystko idzie
przez `/api/*`, gdzie sprawdzany jest kod gościa albo ciasteczko panelu. Jedyny wyjątek to
pobieranie obrazków z podpisanych linków, które same w sobie są ograniczonymi w czasie
przepustkami do pojedynczego pliku.

### D10 — Kompresja do budżetu bajtowego, nie do stałej jakości

**Wybrano:** kompresor dostaje **twardy limit rozmiaru** i schodzi z jakością, aż w niego trafi.

**Odrzucono:** stała jakość JPEG (np. 0,82). Zdjęcia nocne, ziarniste i zatłoczone kompresują
się fatalnie — przy stałej jakości potrafią wyjść trzy razy większe niż zdjęcie w dzień.
A wesele to głównie zdjęcia nocne. Przy stałej jakości budżet miejsca z sekcji 5 byłby
prognozą; przy budżecie bajtowym jest gwarancją.

---

## 4. Gdzie mieszkają dane

| Dane | Miejsce | Dlaczego tam | Kto ma dostęp |
|---|---|---|---|
| Oryginały zdjęć | Dysk Google Pary Młodej | archiwum docelowe, pełna rozdzielczość | Para Młoda (właściciel konta) |
| Podglądy 1600 px | Supabase Storage (bucket prywatny) | szybkie serwowanie planszy i rzutnika | serwer; goście przez podpisane linki |
| Miniatury 400 px | Supabase Storage | siatka 5×5 bez pobierania podglądów | jak wyżej |
| Kto, co, kiedy wysłał | Supabase Postgres | zapytania przekrojowe do panelu | wyłącznie serwer |
| Stan kopiowania na Dysk | Supabase Postgres | z definicji nie może być na Dysku | wyłącznie serwer |
| Zgłoszenia bingo | Supabase Postgres | stan zmienny bez naturalnego pliku | wyłącznie serwer |
| Kody gości | Supabase Postgres, jako SHA-256 | baza nigdy nie trzyma kodu jawnie | wyłącznie serwer |
| Token do Google | Zmienna środowiskowa Vercela | nie może trafić do przeglądarki | wyłącznie serwer |
| Kolejka wysyłkowa | IndexedDB w telefonie gościa | musi działać bez sieci | wyłącznie ten telefon |

Żaden gość nigdy nie widzi zdjęć innego gościa. Aplikacja gościa pokazuje wyłącznie jego planszę.

---

## 5. Budżet miejsca

Sedno wymagania „ma się zmieścić z zapasem".

### Supabase Storage — limit darmowy 1 GB

| Element | Budżet na sztukę | × 1200 |
|---|---|---|
| Podgląd, długi bok 1600 px | **≤ 350 KB** | 420 MB |
| Miniatura, długi bok 400 px | **≤ 30 KB** | 36 MB |
| **Razem** | | **≈ 456 MB** |

**Zajętość 45%. Zapas 55%, czyli ~568 MB.**

Trzy rzeczy pilnują, żeby to się nie rozjechało:

1. **Budżet jest twardy** (D10). Kompresor schodzi z jakością i, jeśli trzeba, z rozdzielczością,
   aż plik zmieści się w limicie. Nie ma zdjęcia, które przekroczy 350 KB.
2. **Podmiany nie kumulują się.** Gdy gość podmienia zdjęcie na kafelku, poprzedni podgląd
   **usuwamy z Supabase** — jego oryginał jest już bezpieczny na Dysku, a wersja robocza nie
   jest do niczego potrzebna. Baza pamięta, że podmiana była.
3. **Licznik z alarmem.** Panel pokazuje `zajęte / 1000 MB`, liczone jako `SUM(bytes)` z bazy.
   Po przekroczeniu **750 MB** panel wyświetla ostrzeżenie, a budżet podglądu dla nowych zdjęć
   schodzi automatycznie do 200 KB. Przy realnym ruchu ten mechanizm nigdy się nie uruchomi —
   istnieje po to, żeby w najgorszym razie zdegradować jakość zamiast odmówić przyjęcia zdjęcia.

Dlaczego 1600 px wystarcza: ta wersja obsługuje wyłącznie ekran telefonu i rzutnik. Rzutniki są
Full HD (1920×1080). Większy plik nic by tam nie zmienił, a archiwum i tak trzyma oryginał.

### Dysk Google — limit konta

1200 oryginałów × ~4 MB ≈ **4,8 GB**. Zakres zależy od telefonów: iPhone w HEIC daje ~2,5 MB,
Android w trybie 50 MP potrafi dać 10 MB. Realistyczny przedział: **3–10 GB**.

**Google One 100 GB (8,99 zł/mies.) jest wymagany**, nie opcjonalny. Darmowe 15 GB jest dzielone
z Gmailem i Zdjęciami — wchodzenie w ten limit z kilkoma gigabajtami zdjęć weselnych to proszenie
się o `storageQuotaExceeded` w sobotę wieczorem. Za dziewięć złotych problem znika całkowicie.

### Transfer po stronie gościa

25 × (350 KB + 30 KB + ~4 MB) ≈ **110 MB** na osobę, w większości przez Wi-Fi ośrodka.
Aplikacja ma przełącznik „wysyłaj oryginały tylko przez Wi-Fi" dla pilnujących pakietu.

---

## 6. Architektura

```
Telefon gościa (PWA)
  │
  │  1. wybór zdjęcia z galerii
  │  2. kompresja do budżetu → podgląd 1600 px + miniatura 400 px
  │  3. wszystko trafia do kolejki w IndexedDB     ◄── działa bez sieci
  │
  ├──► Supabase Storage ─── podgląd + miniatura, podpisanym linkiem prosto z przeglądarki
  │                          (omija limit 4,5 MB funkcji Vercela)
  │
  ├──► /api/photos/finalize ─── wpis do Postgresa; od tej chwili zdjęcie jest bezpieczne
  │
  └──► Dysk Google ─── oryginał, w tle, niskim priorytetem
                        droga zależna od wyniku spike'u S1 (sekcja 13)
```

Panel Pary Młodej czyta z Postgresa i wyświetla obrazki podpisanymi linkami z Supabase.

**Wszystko pod jednym adresem.** Aplikacja gościa, panel i backend to jeden projekt na Vercelu:
`https://<domena>` wydaje stronę, `https://<domena>/api/*` obsługuje funkcja. Brak CORS
w produkcji, brak osobnych domen, brak konfiguracji między usługami.

---

## 7. Stack

| Warstwa | Wybór |
|---|---|
| Frontend | Vite + React 19 + TypeScript + Tailwind 4 |
| PWA | `vite-plugin-pwa` (Workbox) |
| Backend | Vercel Functions, Node, TypeScript, router Hono |
| Baza | Supabase Postgres, przez `@supabase/supabase-js` (`service_role`) |
| Magazyn roboczy | Supabase Storage, bucket prywatny |
| Archiwum | Google Drive API v3, scope `drive.file` |
| Hosting | Vercel, jeden projekt, region `cdg1` (Paryż) |
| Testy | vitest (front i backend jednym runnerem) |

Stack celowo bliźniaczy do SplitDeca — poza D7 i D8, które upraszczają go dla tego projektu.

---

## 8. Model danych

### Postgres — trzy tabele

```sql
guests
  id              uuid primary key
  name            text not null           -- "Anna Kowalska"
  slug            text not null unique    -- "anna-kowalska", do nazw plików i folderu
  token_hash      text not null unique    -- SHA-256 kodu z QR; kod jawny nie jest przechowywany
  drive_folder_id text                    -- wypełniane leniwie przy pierwszym zdjęciu
  created_at      timestamptz not null default now()

photos
  id             uuid primary key
  guest_id       uuid not null references guests(id)
  category_id    int  not null           -- 1..25, odpowiada src/lib/board.ts
  preview_path   text not null           -- ścieżka w bucketcie
  thumb_path     text not null
  bytes          int  not null           -- suma podglądu i miniatury; zasila licznik miejsca
  width          int
  height         int
  drive_file_id  text
  drive_status   text not null default 'pending'   -- 'pending' | 'ok' | 'failed'
  drive_error    text
  original_bytes int
  is_active      boolean not null default true     -- false = podmienione
  created_at     timestamptz not null default now()

claims
  id           uuid primary key
  guest_id     uuid not null references guests(id)
  kind         text not null           -- 'row' | 'col' | 'diag' | 'full'
  index        int                     -- numer wiersza/kolumny/przekątnej; null dla 'full'
  status       text not null default 'new'       -- 'new' | 'accepted' | 'rejected'
  created_at   timestamptz not null default now()
  resolved_at  timestamptz
```

Indeksy: `photos(guest_id, category_id) where is_active`,
`photos(drive_status) where drive_status <> 'ok'`, `claims(status)`.

### Czego celowo nie ma w bazie

**25 kategorii to `src/lib/board.ts`**, statyczna stała. Nigdy się nie zmienią, frontend
potrzebuje ich offline, a `photos.category_id` odwołuje się do nich po numerze.

### Plansza 5×5

Numeracja `R{wiersz}K{kolumna}`, kolumny zgodnie z oryginalną listą Pary Młodej.
`category_id` liczone wierszami: `(wiersz − 1) × 5 + kolumna`.

| | K1 | K2 | K3 | K4 | K5 |
|---|---|---|---|---|---|
|**R1**| Selfie z parą młodą | Ktoś w saunie albo w balii | Ognisko z iskrami | Widok na Beskid Niski o wschodzie słońca | Selfie z osobą, której nie znałeś przed tym weekendem |
|**R2**| Zdjęcie zrobione z ziemi, od dołu | Najgorsze możliwe zdjęcie grupowe | Bukiet panny młodej z bliska | Zdjęcie z obiema mamami | Ktoś, kto zasnął |
|**R3**| Trzy pokolenia na jednym zdjęciu | Moment ceremonii | Pierwszy taniec | Uchwycona wpadka | Ktoś tańczący z zamkniętymi oczami |
|**R4**| Ktoś owinięty kocem | Tort przed pokrojeniem | Świadkowie razem | Zdjęcie z basenu | Najlepszy widok z tarasu |
|**R5**| Ktoś, kto trzyma dwa drinki naraz | Gwiazdy albo nocne niebo | Ktoś, kto próbuje uciec przed zdjęciem | Ktoś, kto płacze ze wzruszenia | Cała drużyna z gry oczepinowej |

---

## 9. Nazwy plików i struktura Dysku

```
FotoBingo 2026/                          ← folder root, tworzony przez aplikację
├── Anna Kowalska/
│   ├── R1K1_selfie-z-para-mloda__anna-kowalska__20260815-193045.jpg
│   ├── R1K3_ognisko-z-iskrami__anna-kowalska__20260815-201233.heic
│   └── R3K2_moment-ceremonii__anna-kowalska__20260816-141002.jpg
└── Marek Nowak/
    └── …
```

**Wzór:** `R{wiersz}K{kolumna}_{kategoria-slug}__{gosc-slug}__{RRRRMMDD-GGMMSS}.{rozszerzenie}`

Prefiks `R{w}K{k}` daje darmowy zysk: **sortowanie folderu po nazwie układa zdjęcia w kolejności
czytania planszy**. Rozszerzenie jest oryginalne (`.heic` z iPhone'a zostaje `.heic`) — na Dysku
leży dokładnie to, co wyszło z aparatu.

Slugifikacja usuwa polskie znaki (`ą→a`, `ć→c`, `ę→e`, `ł→l`, `ń→n`, `ó→o`, `ś→s`, `ź/ż→z`),
zamienia spacje na myślniki i obcina do 60 znaków. Implementacja: `src/lib/slug.ts`,
używana **przez front i backend** — jedno źródło prawdy.

**Metadane na pliku Dysku:**
- `description` — pełna nazwa kategorii, po polsku, z diakrytykami.
- `appProperties` — `categoryId`, `guestId`, `photoId`.

Dzięki temu ręczna zmiana nazwy pliku niczego nie psuje, a bazę dałoby się odtworzyć z samego
Dysku, gdyby Supabase kiedyś zniknął.

**Ograniczenie, o którym trzeba wiedzieć:** plik na Dysku ma dokładnie jednego rodzica (Google
usunęło wiele folderów w 2020). Folder-na-gościa i folder-na-kategorię wykluczają się. Dlatego
widok „wszystkie zdjęcia z danej kategorii" żyje w panelu aplikacji, nie na Dysku.

**Podmiany:** nowe zdjęcie na zajętym kafelku nie kasuje starego pliku na Dysku. Do nazwy
poprzedniego dopisujemy `__zastapione`, w bazie `is_active=false`, a podgląd z Supabase usuwamy.
Na weselu nic się nie kasuje bezpowrotnie.

---

## 10. Przepływ zdjęcia

1. **Wybór.** `<input type="file" accept="image/*">` — bez `capture`, żeby Android pokazał
   wybór galeria/aparat.
2. **Kompresja do budżetu.** `createImageBitmap(blob, { imageOrientation: 'from-image' })`
   → canvas → WebP (fallback JPEG, gdy `toBlob` nie zwróci WebP). Pętla schodzi z jakością
   0,82 → 0,72 → 0,62, a gdy to nie starczy, redukuje długi bok, aż plik zmieści się w budżecie.
   Ten krok załatwia naraz cztery rzeczy: **HEIC z iPhone'a** (Safari dekoduje go systemowym
   kodekiem, canvas oddaje WebP/JPEG), **obrót EXIF**, **limit 4,5 MB body funkcji Vercela**
   i **gwarancję budżetu miejsca**.
3. **Kolejka.** Podgląd, miniatura i oryginał trafiają do IndexedDB **zanim** poleci sieć.
   Gość widzi „w kolejce" natychmiast, nawet przy zerowym zasięgu. Kolejka przeżywa zamknięcie
   aplikacji — zdjęcie z piątkowego spaceru dojdzie w sobotę rano.
4. **Podpisany link.** `POST /api/photos/upload-url` → serwer sprawdza kod gościa, zwraca
   podpisany link do bucketa, ważny 10 minut.
5. **Wysyłka podglądu i miniatury.** `PUT` prosto do Supabase, z pominięciem naszej funkcji.
6. **Finalizacja.** `POST /api/photos/finalize` → wiersz w bazie. **Od tej chwili zdjęcie jest
   bezpieczne.** Kafelek zmienia się w miniaturę, plansza przelicza bingo.
7. **Oryginał, w tle.** Osobne zadanie w kolejce, niski priorytet, ustawia `drive_status`.
   Droga zależy od spike'u S1 (sekcja 13).
8. **Ponowienia.** `POST /api/mirror/drain` przemiela zaległości. Wołany z panelu przyciskiem
   „Wyślij zaległe na Dysk"; opcjonalnie z `pg_cron` w Supabase co 5 minut. Vercel Hobby daje
   crona tylko raz na dobę, co jest za rzadko — stąd przycisk jako podstawowa ścieżka.

Zadanie znika z kolejki dopiero po potwierdzeniu z serwera. Zadanie oryginału znika dopiero po
`drive_status='ok'`.

---

## 11. API

Wszystko pod `/api/*`, jedna funkcja, router Hono.

| Metoda i ścieżka | Kto woła | Co robi |
|---|---|---|
| `GET /api/me` | gość | Zwraca imię gościa i stan jego planszy |
| `POST /api/photos/upload-url` | gość | Podpisany link do bucketa dla jednej kategorii |
| `POST /api/photos/finalize` | gość | Zapisuje zdjęcie w bazie, uruchamia kopiowanie na Dysk |
| `POST /api/photos/original-url` | gość | Adres docelowy dla oryginału (zależny od S1) |
| `POST /api/claims` | gość | Zgłoszenie bingo |
| `POST /api/panel/login` | Para Młoda | PIN → podpisane ciasteczko httpOnly, ważne 30 dni |
| `GET /api/panel/claims` | Para Młoda | Lista zgłoszeń ze statusami |
| `POST /api/panel/claims/:id` | Para Młoda | Uznanie albo odrzucenie zgłoszenia |
| `GET /api/panel/photos` | Para Młoda | Zdjęcia pogrupowane po kategoriach albo po gościach |
| `POST /api/mirror/drain` | Para Młoda | Ponawia kopiowanie zaległych oryginałów |
| `POST /api/panel/guests` | Para Młoda | Dodaje gościa i zwraca nowy kod (awaryjne winietki) |

**Uwierzytelnienie gościa:** nagłówek `X-Guest-Token` z kodem z QR. Serwer porównuje SHA-256.
**Uwierzytelnienie panelu:** ciasteczko httpOnly, podpisane `SESSION_SECRET`. Nieudane próby PIN
liczone w bazie; po 10 nietrafieniach panel blokuje się na godzinę.

**Limity zdroworozsądkowe:** maksymalnie 3 zdjęcia na kafelek (podmiany) i 120 wysyłek na gościa.
Przy 40 gościach nie ma zagrożenia nadużyciem — te limity chronią przed zapętloną kolejką
w zepsutym telefonie, nie przed złośliwym gościem.

---

## 12. Aplikacja — ekrany

### Gość

| Ścieżka | Zawartość |
|---|---|
| `/g/:token` | Wejście z QR. Zapisuje kod, przekierowuje na `/` |
| `/` | Plansza 5×5, pasek postępu `7 / 25`, podświetlone zdobyte linie |
| `/kategoria/:id` | Pełna nazwa, przycisk wyboru zdjęcia, podgląd, status wysyłki, podmiana |
| `/ustawienia` | Przełącznik „oryginały tylko przez Wi-Fi", stan kolejki, informacja RODO |

Status wysyłki pokazywany wprost: **w kolejce → wysyłanie → zapisane ✓**, a dla oryginału osobno
**oryginał w drodze → oryginał na Dysku ✓**.

**Instalacja.** Android przez `beforeinstallprompt` i własny baner. iOS nie wspiera promptu —
dostaje osobną instrukcję „Udostępnij → Dodaj do ekranu początkowego". Przy 40 gościach iPhone'ów
będzie sporo, więc ta ścieżka jest równorzędna, nie awaryjna.

**Pułapka iOS, którą trzeba obsłużyć:** zainstalowana aplikacja dostaje na iOS własny magazyn
danych, osobny od Safari — gość, który „dołączył" w przeglądarce, po instalacji zobaczyłby pustą
aplikację. Rozwiązanie dwutorowe: iOS bierze adres startowy z bieżącej strony, więc instrukcja
mówi wprost „instaluj ze swojego osobistego linku", a dodatkowo serwujemy manifest per gość
(`/api/manifest?g=…`) z `start_url` zawierającym kod.

### Panel Pary Młodej — `/panel`

- Lista zgłoszeń bingo z licznikiem nowych.
- Kliknięcie zgłoszenia → **pięć zdjęć tej linii obok siebie** + „Uznaj" / „Odrzuć".
- **Tryb rzutnika**: pełny ekran, strzałki i spacja, Wake Lock (ekran nie gaśnie), duży podpis
  z kategorią i imieniem gościa.
- Widok wszystkich zdjęć pogrupowany po kategoriach — czego Dysk z natury nie potrafi.
- Licznik miejsca `zajęte / 1000 MB` i przycisk „Wyślij zaległe na Dysk".
- Dodanie gościa i wygenerowanie kodu, gdy ktoś zgubi winietkę.

---

## 13. Otwarta kwestia: droga oryginału na Dysk

**Spike S1 — do rozstrzygnięcia przed Etapem 3.**

Oryginał (~4 MB, czasem 10 MB) jest za duży, żeby przejść przez funkcję Vercela (limit 4,5 MB
na ciało żądania). Zostają dwie drogi:

**S1-A — z telefonu prosto do Google.** Serwer prosi Google o *resumable session URI* dla jednego
pliku, telefon wysyła bajty pod ten adres. Token Pary Młodej nigdy nie trafia do przeglądarki;
adres jest ważny tydzień i dotyczy jednego pliku. Zero tranzytu, zero zużycia limitów Supabase.

**Czego nie wiadomo:** dokumentacja Google dla Dysku wymienia przy wysyłce fragmentów tylko
nagłówki `Content-Length` i `Content-Range`, bez autoryzacji — ale nigdzie tego nie potwierdza
wprost. Dla Cloud Storage jest napisane jasno, że taki adres działa jak przepustka; dla Dysku nie.
Otwarte jest też pytanie o nagłówki CORS przy żądaniu z naszej domeny.

**S1-B — przez Supabase, gdyby A nie zadziałało.** Oryginał ląduje w bucketcie, serwer pobiera go
i przekłada na Dysk, po czym **usuwa z bucketa**. Działa na pewno, ale kosztuje: ~4,8 GB pobrania
z Supabase przy darmowym limicie 5 GB miesięcznie. Mieści się, ale bez zapasu — a zapas jest
w tym projekcie wymaganiem. Gdyby S1-B było jedyną opcją, rozważamy Supabase Pro na jeden miesiąc
($25) albo rozłożenie kopiowania na kilka dni po weselu.

**Sposób rozstrzygnięcia:** pół godziny, jeden plik, jeden telefon, konsola przeglądarki.
Wynik zapisujemy tutaj i w `CLAUDE.md`.

---

## 14. Konfiguracja Google

Najbardziej podatny na błąd fragment całego projektu. Kolejność ma znaczenie.

1. Google Cloud Console → nowy projekt → włącz **Google Drive API**.
2. OAuth consent screen: typ **External**. Wypełnij nazwę aplikacji, e-mail kontaktowy
   i adres polityki prywatności (wystarczy `/prywatnosc` w naszej aplikacji).
3. Scopes: **wyłącznie** `https://www.googleapis.com/auth/drive.file`.
   Nie dodawaj `drive` ani `drive.readonly` — to scope'y restricted, które uruchamiają
   weryfikację i audyt bezpieczeństwa.
4. **Opublikuj do „In production".** Kroku nie wolno pominąć: w statusie „Testing" refresh token
   umiera po 7 dniach i aplikacja przestaje działać w środku wesela. Przy samym `drive.file`
   publikacja **nie wymaga przeglądu Google** — ekran zgody pokaże ostrzeżenie o niezweryfikowanej
   aplikacji, co dla jednego konta (Waszego) jest bez znaczenia.
5. Utwórz OAuth client typu **Desktop app**. Uruchom raz `node scripts/google-auth.mjs`, przejdź
   flow z `access_type=offline` i `prompt=consent`, zapisz `refresh_token`.
6. Utwórz na Dysku folder `FotoBingo 2026`, skopiuj jego identyfikator z adresu URL.
7. Wgraj zmienne na Vercela (sekcja 15).

**Kiedy refresh token mimo produkcji przestaje działać:** gdy cofniesz dostęp w ustawieniach
konta Google, gdy zmienisz hasło do konta, albo gdy nie użyjesz go przez 6 miesięcy. Żaden
z tych przypadków nie dotyczy weekendu wesela, ale warto o nich wiedzieć.

**Wykup Google One 100 GB** przed weselem (sekcja 5).

---

## 15. Zmienne środowiskowe

```bash
# ---- Frontend (Vite, trafia do przeglądarki) ----
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...

# ---- Backend (wyłącznie serwer) ----
ENV=development

SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...        # omija RLS, NIGDY nie może trafić do przeglądarki
SUPABASE_BUCKET=fotobingo

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...             # z scripts/google-auth.mjs, jednorazowo
DRIVE_ROOT_FOLDER_ID=...             # identyfikator folderu "FotoBingo 2026"

PANEL_PIN=...                        # 6 cyfr, do panelu Pary Młodej
SESSION_SECRET=...                   # losowy, do podpisywania ciasteczka panelu
```

Wszystko poza `VITE_*` żyje wyłącznie w zmiennych funkcji na Vercelu i w lokalnym `.env`,
który jest w `.gitignore`. Repozytorium zawiera tylko `.env.example` z wartościami-zaślepkami.

---

## 16. Repozytorium

**https://github.com/T5chrono/foto-bingo** — publiczne, struktura odwzorowana ze SplitDeca.

Projekt nazywa się `foto-bingo` w trzech miejscach naraz: repozytorium na GitHubie, projekt
na Vercelu i projekt w Supabase. Jedna nazwa wszędzie — żaden z tych paneli nie każe się
zastanawiać, czy patrzysz na właściwą rzecz.

```
foto-bingo/
├── .github/
│   ├── dependabot.yml
│   └── workflows/
│       ├── ci.yml                    # vitest + build, na push do master/develop i na PR
│       ├── claude.yml                # @claude w komentarzach
│       └── claude-code-review.yml    # automatyczny przegląd każdego PR-a
├── api/
│   ├── index.ts                      # jedna funkcja Vercela, router Hono
│   └── _lib/                         # podkreślnik: Vercel nie robi z nich osobnych funkcji
│       ├── auth.ts                   # kod gościa, ciasteczko panelu
│       ├── config.ts
│       ├── db.ts                     # klient supabase-js z service_role
│       ├── storage.ts                # podpisane linki, kasowanie podmienionych podglądów
│       ├── drive.ts                  # odświeżanie tokena, folder gościa, wysyłka, appProperties
│       ├── photos.ts
│       ├── claims.ts
│       └── *.test.ts                 # testy backendu obok kodu
├── docs/
│   ├── google-setup.md               # rozwinięcie sekcji 14, ze zrzutami
│   └── runbook-weekend.md            # co robić, gdy w sobotę coś nie działa
├── public/
│   ├── icons/                        # 192, 512, maskable-512, apple-touch-icon
│   └── favicon.svg
├── scripts/
│   ├── generate-icons.mjs            # jak w SplitDecu
│   ├── google-auth.mjs               # jednorazowe zdobycie refresh tokena
│   └── generate-guests.mjs           # CSV → baza + PDF z winietkami QR
├── src/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   │   ├── board.ts                  # 25 kategorii
│   │   ├── bingo.ts                  # wykrywanie linii
│   │   ├── slug.ts                   # WSPÓLNE z api/ — jedno źródło prawdy
│   │   ├── image.ts                  # kompresja do budżetu
│   │   ├── queue.ts                  # IndexedDB
│   │   ├── api.ts
│   │   └── legal.ts                  # treść RODO, wzorzec ze SplitDeca
│   ├── pages/
│   ├── test/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── supabase/
│   └── migrations/                   # surowy SQL, źródło prawdy dla schematu
├── .env.example
├── .gitignore
├── CLAUDE.md
├── FotoBingo - specification.md      # ten plik
├── README.md
├── index.html
├── package.json
├── tsconfig.json
├── vercel.json
├── vite.config.ts
└── vitest.config.ts
```

**Odstępstwa od SplitDeca i ich powody:**

- **Brak katalogu `tests/`.** W SplitDecu mieści testy pytest dla Pythona. Tutaj backend jest
  w TypeScript, więc jego testy leżą obok kodu jako `api/_lib/*.test.ts` — tak samo, jak testy
  frontu leżą obok komponentów. Jeden runner, jedna konwencja.
- **Brak katalogu z systemem projektowym.** SplitDec ma `SplitDec DesignSystem/` (nietrackowany).
  FotoBingo żyje trzy dni i nie potrzebuje własnej marki.
- **`vitest.config.ts` osobno od `vite.config.ts`** — jak w SplitDecu, bo wtyczka PWA nie może
  uruchamiać się w testach.

**Przepływ pracy:** praca na `develop`, nigdy bezpośrednio na `master`. Push → PR do `master` →
automatyczny przegląd → merge na zielonym CI → Vercel wdraża `master` na produkcję.
Po merge'u synchronizacja: `git checkout develop && git merge master && git push`.

**Czego repozytorium nie zawiera:** listy gości, kodów z QR, żadnych zdjęć, żadnych sekretów.
Lista gości mieszka w lokalnym CSV poza repo i w bazie. Repo jest publiczne i ma takie zostać.

---

## 17. Bezpieczeństwo i prywatność

- **Nagłówki bezpieczeństwa** w `vercel.json`, wzorowane na SplitDecu: HSTS, `nosniff`,
  `frame-ancestors 'none'` z `X-Frame-Options: DENY`, polityka referrera i uprawnień.
- **Bucket jest prywatny.** Zdjęcia wychodzą wyłącznie podpisanymi linkami o krótkiej ważności.
- **Klucz `service_role` i token Google nigdy nie opuszczają serwera.**
- **Kody gości trzymane jako SHA-256.** Wyciek bazy nie daje dostępu do niczyjej planszy.
- **Service worker nigdy nie cache'uje `/api/*`** (`navigateFallbackDenylist: [/^\/api\//]`) —
  odpowiedź z pamięci podręcznej dla wysyłki zdjęcia byłaby katastrofą.
- **Żaden gość nie widzi zdjęć innego gościa.**

**Informacja dla gości (RODO), pokazywana przy pierwszym uruchomieniu**, treść w `src/lib/legal.ts`:
czyje to zdjęcia, gdzie trafiają (Dysk Google Pary Młodej), kto je widzi (wyłącznie Para Młoda),
jak długo są przechowywane i do kogo się zgłosić po usunięcie. Krótko, jednym akapitem,
bez ściany prawniczej.

---

## 18. Etapy realizacji

**Etap 1 — szkielet.** `git init`, repozytorium na GitHubie, scaffold Vite/React/TS/Tailwind,
`vite.config.ts` z PWA i ikonami, `vercel.json` z nagłówkami, projekt Supabase, migracja
z trzema tabelami, plansza w `src/lib/board.ts`, CI.

**Etap 2 — pętla gościa.** Wejście `/g/:token`, plansza 5×5, ekran kategorii, kompresja
do budżetu (`src/lib/image.ts`), kolejka IndexedDB (`src/lib/queue.ts`), podpisane linki,
`finalize`. **Na tym etapie zdjęcia lądują tylko w Supabase** — całość jest już grywalna.

**Etap 3 — Dysk Google.** Spike S1 (sekcja 13), potem `api/_lib/drive.ts`: odświeżanie tokena,
folder gościa, wysyłka, `appProperties`. Kolejka oryginałów w tle. Endpoint `drain`.

**Etap 4 — bingo i panel.** Wykrywanie linii (5 wierszy + 5 kolumn + 2 przekątne + pełna karta),
zgłoszenia, panel na PIN, widok linii, tryb rzutnika z Wake Lockiem, widok po kategoriach,
licznik miejsca.

**Etap 5 — przed weselem.** Generator winietek QR, ekran RODO, instrukcja instalacji na iOS,
runbook weekendowy, próba generalna.

---

## 19. Weryfikacja

- **Kompresja.** Zdjęcie z iPhone'a (HEIC, obrócone) i z Androida (50 MP) → sprawdź, że wychodzi
  plik ≤350 KB w poprawnej orientacji. Realne pliki z telefonu są tu niezastąpione — emulator
  tego nie odtworzy. Osobno: zdjęcie nocne, ziarniste, żeby zweryfikować pętlę budżetu.
- **Offline.** DevTools → Network: Offline → wyślij 3 zdjęcia → zamknij kartę → włącz sieć →
  otwórz ponownie → wszystkie trzy muszą dojść. Powtórz na **zainstalowanej** aplikacji.
- **Instalacja.** Fizyczny Android (Chrome) i fizyczny iPhone (Safari → Udostępnij). Na iOS
  instaluj z linku osobistego `/g/…`.
- **Dysk.** Po pierwszej wysyłce sprawdź, że powstał `FotoBingo 2026/Imię Nazwisko/` i nazwa
  pliku zgadza się ze wzorem z sekcji 9.
- **Odporność na awarię Google.** Podmień `GOOGLE_REFRESH_TOKEN` na śmieciowy → wysyłka podglądu
  musi się udać, a wiersz dostać `drive_status='pending'`. Przywróć token → „Wyślij zaległe" domyka.
- **Budżet miejsca.** Wgraj 1200 sztucznych wierszy → licznik w panelu musi pokazać wartość
  zgodną z sekcją 5, a panel i tryb rzutnika pozostać płynne (miniatury, nie podglądy).
- **Próba generalna.** Pięć osób, po trzy zdjęcia, na telefonach, w trybie Slow 3G.

---

## 20. Checklista przedweselna

- [ ] **Google One 100 GB wykupione.**
- [ ] OAuth consent screen w statusie **„In production"**, nie „Testing".
- [ ] Refresh token wygenerowany, wgrany na Vercela, testowa wysyłka przechodzi.
- [ ] Spike S1 rozstrzygnięty, wynik zapisany w `CLAUDE.md`.
- [ ] Domena ustalona i podpięta. **Winietki drukujemy dopiero po tym** — zmiana adresu
      po druku unieważnia wszystkie kody.
- [ ] Winietki z QR wydrukowane: **40 imiennych plus 8 zapasowych bez imienia**.
- [ ] Instrukcja na stołach: „Zeskanuj → Dodaj do ekranu początkowego → graj".
- [ ] Hasło do Wi-Fi ośrodka na winietce albo na instrukcji.
- [ ] PIN do panelu zna ktoś jeszcze poza Panem Młodym — w sobotę będzie zajęty.
- [ ] Licznik miejsca w panelu sprawdzony i pokazujący sensowną wartość.

---

## 21. Świadomie poza zakresem

- **Ekran na sali** — pełnoekranowy widok napływających zdjęć na żywo.
- **Ranking gości** — „kto ma ile pól", widoczny dla wszystkich.

Oba są dorzucalne po Etapie 4 bez zmian w modelu danych — dane już tam będą. Wypadły z zakresu
pierwszej wersji, bo każde z nich to osobny ekran do zaprojektowania i przetestowania,
a termin jest sztywny.
