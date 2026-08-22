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

Trzy komponenty w `src/components/wedding/`:

- **`Meadow`** — łąka polnych kwiatów zamykająca każdy ekran. Układ jest losowy,
  ale **zawsze ten sam**: generator dostaje ziarno z daty ślubu.
- **`Hills`** — akwarelowa dolina na ekranach powitalnych. Cztery plany, każdy
  ciemniejszy i mniej rozmyty; rzeka **rozpuszcza się** w horyzoncie zamiast
  kończyć ostrą krawędzią.
- **`Sprig`** — gałązka pod tytułem, tam gdzie zwykła linia byłaby za twarda.

**Rysunki są własne, w SVG.** Grafik stockowych z Canvy nie wolno wyjąć
z projektu jako osobne pliki i wgrać do aplikacji — licencja pozwala użyć ich
w projekcie, nie rozprowadzać jako elementy. Przy okazji własne SVG waży tyle,
co kawałek tekstu, skaluje się do każdego ekranu i bierze kolory z palety.

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
