# Wizualia

Aplikacja ma wyglądać jak reszta papierów tego wesela — zaproszenie, winietka,
papierowa karta Foto Bingo. Ten plik mówi, skąd wzięła się każda decyzja, żeby
następna zmiana nie musiała zgadywać.

**Źródło prawdy to projekt w Canvie** (Watercolor Floral Wedding Invitation,
12 stron: zaproszenia, winietka i karta Foto Bingo). Kolory i proporcje poniżej
są z niego **odczytane**, a nie dobrane na oko.

Decyzja i odrzucone alternatywy: **D13** w [specyfikacji](../FotoBingo%20-%20specification.md).
Czego się przy tym nadzialiśmy: [dziennik projektu](dziennik-projektu.md#wizualia).

## Paleta

Cała paleta mieszka w `@theme` w [src/index.css](../src/index.css). Nazwy
`brand-*` zostały z poprzedniej, winnej wersji — zmiana wartości przemalowuje
aplikację bez dotykania klas w komponentach.

| Token | Wartość | Skąd |
| --- | --- | --- |
| `brand-300` | `#c8d0b3` | delikatna zieleń tła |
| `brand-400` | `#b7c29c` | **ramka kafelka** na karcie z Canvy |
| `brand-500` | `#9aa97b` | **obwódka kółka do zaznaczania** |
| `brand-700` | `#66744a` | przyciski (5,05:1 z białym tekstem) |
| `brand-800` | `#525938` | **kolor wszystkich podpisów** na karcie |
| `paper` | `#fdfcf7` | wypełnienie kafelka — karty i pola |
| `cream` | `#f6f3e9` | papier zaproszenia — tło strony |
| `ink` | `#3b3b3b` | kolor tytułu „Foto Bingo" |

Ostrzeżenia i błędy noszą `clay-*` — terakotę maków z bukietu, zamiast
fabrycznego bursztynu Tailwinda. Żółto-pomarańczowy alarm na kremowym papierze
wygląda jak komunikat z bankowości.

## Typografia

Dwie rodziny, dwie role — tak samo jak na karcie:

- **Yellowtail** (`font-script`) — wyłącznie logotyp „Foto Bingo", tytuły
  ekranów i słowo „Bingo!". Ma latin i latin-ext, więc polskie ogonki są.
- **Lora** (`font-serif`) — cały pozostały tekst, od nagłówków po podpisy
  kafelków.

Manrope wyleciał: jedna rodzina mniej do pobrania przy weselu w górach.
W precache service workera lądują cztery pliki (~87 KB) — reszta podzbiorów
Lory jest wycięta w `globIgnores` w [vite.config.ts](../vite.config.ts).

**To jest wydatek w tej samej walucie, co decyzja D12 o podpisach do plików**:
netto jedna rodzina pisma więcej to ~47 KB na pierwsze wejście, jednorazowo
i z cache'u. D12 oszczędza wielokrotność tej liczby na samych miniaturach
pobieranych w kółko przez cały wieczór. Warto trzymać oba rachunki obok siebie,
gdyby kiedyś doszła trzecia rodzina.

Lista wykluczeń w `globIgnores` **nazywa pliki po imieniu**, więc zmiana rodziny
pisma jest zawsze także zmianą tam. Po buildzie sprawdź, co naprawdę wylądowało
w `dist/sw.js`.

## Ozdobniki

Trzy obrazki w `src/assets/art/`, każdy w komponencie w `src/components/wedding/`:

- **`Meadow`** — łąka polnych kwiatów zamykająca każdy ekran. Ta sama, która wyrasta
  z dolnej krawędzi zaproszenia i papierowej karty.
- **`Valley`** — akwarelowa dolina na ekranach powitalnych (brak kodu, logowanie do
  panelu). Wzięta z **winietki**, nie z zaproszenia: na winietce idzie na całą
  szerokość, a na zaproszeniu jest wyspą z wystrzępionymi brzegami, która w pasku
  nad tytułem zostawiałaby białe rogi.
- **`Bloom`** — kwiatowy łuk z górnej połowy winietki. Stoi **tylko** na ekranie
  pierwszego uruchomienia: gość dopiero co skanował kod z tej karteczki, więc to
  jedyny moment, w którym warto powtórzyć obrazek trzymany w ręku.

**Rysunki są wyjęte wprost z Canvy** — patrz **D13** w
[specyfikacji](../FotoBingo%20-%20specification.md), gdzie ta decyzja jest odwrócona
w stosunku do pierwszej wersji. Wcześniej stały tu własne SVG; ważyły ułamek tego, co
bitmapy, ale obok prawdziwej akwareli na tym samym stole było widać, że to nie ta sama ręka.

`Sprig` **został w SVG** i to nie jest niedoróbka. To kreska z listkami wysoka na 12 px,
a nie ilustracja: w tej skali bitmapa jest papką, a SVG zostaje ostry i bierze kolor
z palety. Wymiana ma sens tam, gdzie rysunek udaje akwarelę — nie tam, gdzie zastępuje
poziomą linię.

### Jak się je odtwarza

[scripts/canva-art.py](../scripts/canva-art.py) robi całość z jednego pliku PDF. Trzy
rzeczy, które warto wiedzieć, zanim się to powtórzy:

1. **Eksport idzie do PDF, nie do PNG.** PNG daje 1x (454 px na stronę) i wypala białe
   tło pod kwiatami. PDF osadza oryginalne bitmapy razem z maskami przezroczystości.
2. **`width` i `export_quality: pro` w Canva API wymagają Canva Pro** i zwracają mylące
   `Not allowed to access design`. Eksport bez tych parametrów działa bez niczego.
3. **Dolina nie ma maski** — jest płaską bitmapą na białym papierze. Biel odejmuje się
   rachunkiem (`alpha = 1 - min(r,g,b)`, potem dzielenie przez alfę), bo akwarela jest
   medium mnożącym: biel to nie farba, tylko goły papier. Po złożeniu z powrotem na białym
   wychodzi piksel w piksel oryginał, a na kremowym — akwarela na kremowym papierze.

Nic z tego nie jest częścią builda. Pliki leżą w repo, skrypt uruchamia się raz.

### Ile to waży

127 KB w trzech plikach WebP. **W precache'u service workera ląduje sama łąka (~54 KB)**,
bo jest na każdym ekranie. Dolina i łuk są wycięte przez `globIgnores` w
[vite.config.ts](../vite.config.ts) i łapie je `runtimeCaching` — ekrany powitalne ogląda
się **raz**, więc precache i tak nie zdążyłby przed pierwszym wyświetleniem (service worker
instaluje się po załadowaniu strony), a przy drugim wejściu nikt ich już nie zobaczy.
Płacilibyśmy za obrazek dwa razy i ani razu na czas.

Obrazki **nie są powiększane** przed zapisem. Bitmapy mają 560–800 px szerokości, a pas łąki
zajmuje najwyżej ~470 px CSS; powiększenie nie dokłada ani jednego szczegółu, którego w źródle
nie ma, tylko kilobajty. Akwarela nie ma ostrych krawędzi, więc przeglądarka rozciąga ją
bez artefaktów.

## Plansza

Kafelek jest wzięty z Canvy co do liczby: wypełnienie `paper`, ramka
`brand-400` grubości 1 px, wyśrodkowany podpis i **kółko do zaznaczenia** pod
nim. Kółko jest tu najważniejsze — na papierze zakreśla się je długopisem,
w aplikacji zamalowuje się samo, gdy zdjęcie dojdzie.

Z kafelków **zniknął kod pozycji** (R3K2). Papierowa karta go nie ma, a 25
kodów na 25 polach robiło hałas w miejscu, gdzie liczy się podpis. Kod został
w `aria-label`, na ekranie kategorii, w panelu i w nazwie pliku na Dysku.

## Winietki

[scripts/generate-guests.mjs](../scripts/generate-guests.mjs) drukuje winietki
w tym samym stroju: szeryfowy krój, gałązka nad imieniem, szałwiowe linie.
Kolory siedzą w **ramkach i tekście, nie w tłach** — przeglądarki domyślnie nie
drukują teł, więc karta z kremowym wypełnieniem wyszłaby z drukarki biała.
