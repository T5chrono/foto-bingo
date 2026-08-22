# Zakładanie projektu Supabase

Jednorazowa procedura. Po jej wykonaniu projekt `foto-bingo` obsługuje bazę (trzy tabele)
i magazyn roboczy (podglądy i miniatury zdjęć).

Kontekst: organizacja `T5chrono ORG`, w której stoi już `split-dec`. Nowy projekt kosztuje
**0 zł/mies.**

## 1. Utworzenie projektu

[supabase.com/dashboard](https://supabase.com/dashboard) → **New project**

| Pole | Wartość |
|---|---|
| Organization | `T5chrono ORG` |
| Name | `foto-bingo` |
| Database Password | wygeneruj i **zapisz w menedżerze haseł** |
| Region | **West EU (Paris) — `eu-west-3`** |

**Region nie jest dowolny.** Funkcja serwerowa na Vercelu stoi w `cdg1` (Paryż). Baza w innym
regionie dokłada kilkaset milisekund do każdego zapytania — widać to, gdy panel ładuje kilkanaście
zdjęć naraz w trybie rzutnika. Ta sama zasada obowiązuje w SplitDecu i jest tam opisana
w `CLAUDE.md`.

**Hasło do bazy** nie jest potrzebne na co dzień — łączymy się przez `supabase-js` z kluczem
`service_role`, nie hasłem (decyzja D8 w specyfikacji). Ale jedyną drogą odzyskania go później
jest reset, więc zapisz je od razu.

Projekt wstaje ~2 minuty.

## 2. Bucket na zdjęcia

**Storage** → **New bucket**

| Pole | Wartość |
|---|---|
| Name | `fotobingo` |
| Public bucket | **wyłączone** |

Nazwa bez myślnika, bo wchodzi w ścieżki plików. Bucket publiczny oznaczałby, że każdy, kto
zgadnie adres, obejrzy zdjęcia z wesela — zostaje prywatny, a aplikacja wydaje podpisane linki
o krótkiej ważności.

## 3. Klucze

**Project Settings** → **API keys**

| Co | Gdzie trafia | Jawny? |
|---|---|---|
| Project URL | `VITE_SUPABASE_URL` i `SUPABASE_URL` | tak |
| Publishable key (`sb_publishable_…`) | `VITE_SUPABASE_PUBLISHABLE_KEY` | tak, ląduje w przeglądarce |
| Secret key (`sb_secret_…`) | `SUPABASE_SECRET_KEY` | **NIE — sekret** |

**Bierz nowe klucze, nie te z działki „Legacy API keys".** Stary `service_role` działa tak samo,
ale jest JWT podpisanym sekretem projektu — żeby go zrotować, trzeba zrotować sekret JWT, co
unieważnia wszystko naraz. Nowe klucze tworzy się i unieważnia pojedynczo.

Klucz sekretny omija RLS i wszystkie zabezpieczenia bazy. Wolno mu żyć wyłącznie w lokalnym
`.env` (jest w `.gitignore`) i w zmiennych środowiskowych funkcji na Vercelu. Nigdy w kodzie,
nigdy w commicie, nigdy w komunikatorze.

To jedyny klucz, którego nie da się pobrać przez API Supabase — trzeba go skopiować z panelu ręcznie.

**Sprawdzenie, że jedno i drugie działa jak trzeba** — zapytanie do `/rest/v1/guests`:
kluczem sekretnym musi zwrócić `HTTP 200 []`, a kluczem publishable **`HTTP 401
permission denied for table guests`**. Drugi wynik jest ważniejszy od pierwszego: klucz
publishable siedzi w kodzie każdej zainstalowanej aplikacji gościa, więc 200 w tym miejscu
oznaczałoby, że każdy gość czyta cudze plansze.

## 4. Migracja schematu

Pliki SQL w `supabase/migrations/` są źródłem prawdy dla schematu, ale są nakładane na żywą bazę
osobno — przez Supabase MCP albo panel. Dodając migrację, zawsze rób obie rzeczy: zapisz plik
**i** nałóż go na bazę.

## Pułapki

**Darmowy plan: 2 aktywne projekty na organizację.** Po `foto-bingo` limit jest wykorzystany
(`split-dec` zajmuje drugi). Trzeci wymagałby planu Pro albo osobnej organizacji.

**Projekt pauzuje się po 7 dniach bez ruchu.** To jest ryzyko dla wesela, nie ciekawostka.
Jeśli między końcem budowy a weselem będzie dłuższa przerwa, baza może być uśpiona w piątek rano.
Wybudzenie jest ręczne i trwa kilka minut. **Wejdź do aplikacji w czwartek przed weselem** —
jest to osobny punkt checklisty w specyfikacji.

**Limit 1 GB w Storage.** Budżet projektu zakłada 456 MB przy 48 zapełnionych planszach, czyli
55% zapasu. Licznik zajętości jest w panelu Pary Młodej. Szczegóły w sekcji 5 specyfikacji.
