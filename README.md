# FotoBingo

Aplikacja weselna do gry Foto Bingo. Goście dostają planszę 5×5 z 25 kategoriami zdjęć,
wysyłają zdjęcia z telefonu, a Para Młoda weryfikuje zgłoszenia bingo i wyświetla je na rzutniku.

Instalowalna PWA — bez sklepu, bez logowania, bez kont. Gość skanuje QR z winietki i gra.
Po polsku albo po angielsku, zależnie od telefonu; przełącznik jest w zasięgu ręki.

## Jak to działa

Telefon kompresuje zdjęcie do twardego budżetu i wrzuca je do kolejki, która działa bez zasięgu.
Podgląd trafia do Supabase i natychmiast zapełnia kafelek. Oryginał w pełnej rozdzielczości jedzie
w tle na Dysk Google Pary Młodej, do folderu gościa, pod nazwą kodującą kategorię:

```
FotoBingo/Anna Kowalska/R1K3_ognisko-z-iskrami__anna-kowalska__20260815-201233.heic
```

Dwa magazyny, bo każdy robi co innego: Supabase serwuje zdjęcia na rzutnik w ułamku sekundy,
Dysk trzyma archiwum. Jeśli Google chwilowo nie odpowiada, zdjęcie i tak jest już bezpieczne.

## Dokumentacja

**[FotoBingo - specification.md](FotoBingo%20-%20specification.md)** — pełna specyfikacja:
wszystkie decyzje architektoniczne wraz z odrzuconymi alternatywami i powodami, model danych,
budżety miejsca, konfiguracja Google, etapy realizacji i checklista przedweselna.

**[docs/dziennik-projektu.md](docs/dziennik-projektu.md)** — czego się nauczyliśmy po drodze:
pułapki opisane objawem, decyzje które odwróciliśmy i powody, oraz lista rzeczy, których
nie da się sprawdzić inaczej niż na prawdziwym telefonie. **Zacznij tutaj, gdy coś nie działa.**

Pozostałe: [kategorie planszy](docs/kategorie.md) · [wizualia](docs/wizualia.md) ·
[konfiguracja Google](docs/google-setup.md) ·
[Supabase](docs/supabase-setup.md) · [wdrożenie](docs/vercel-deploy.md) ·
[runbook weselny](docs/runbook-weekend.md)

## Stack

Vite · React 19 · TypeScript · Tailwind 4 · vite-plugin-pwa · Vercel Functions (Hono) ·
Supabase Postgres i Storage · Google Drive API

## Praca z repozytorium

Praca na `develop`, nigdy bezpośrednio na `master`. Push → PR do `master` → automatyczny
przegląd → merge na zielonym CI → Vercel wdraża `master` na produkcję.

```bash
npm run dev      # Vite
npm test         # vitest
npm run build    # tsc -b && vite build (tu mieszka type-check)
```

### Teksty i języki

Wszystkie zdania widoczne dla człowieka leżą w `src/lib/strings/`. Polski (`pl.ts`) jest
źródłem prawdy, angielski (`en.ts`) ma typ `typeof pl` — **brakujące tłumaczenie nie
kompiluje się**, więc nowy tekst dopisuje się po polsku i `npm run build` mówi, czego
brakuje po drugiej stronie. Dlaczego bez biblioteki i dlaczego angielski jest domyślny
poza Polską: **D14** w [specyfikacji](FotoBingo%20-%20specification.md).

Etykiety 25 kategorii są wyjątkiem — mieszkają w `src/lib/board.ts` razem z planszą.
**Slug do nazwy pliku na Dysku liczy się zawsze z polskiej etykiety**, niezależnie od
języka aplikacji. Po zmianie etykiet odśwież zestawienie obu wersji:

```bash
npm run kategorie   # -> docs/kategorie.md
```

## Czego tu nie ma

Listy gości, kodów z QR, zdjęć ani sekretów. Repozytorium jest publiczne — dane osobowe żyją
w lokalnym CSV poza repo i w bazie, a klucze w zmiennych środowiskowych Vercela.
