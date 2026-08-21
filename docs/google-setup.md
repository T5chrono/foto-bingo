# Konfiguracja Google Drive — krok po kroku

Jednorazowa procedura. Po jej wykonaniu serwer może odkładać zdjęcia na Dysk Pary Młodej,
a goście nigdy nie widzą Google na oczy.

Etykiety podane po polsku, z angielskimi w nawiasach — Google tłumaczy konsolę tylko częściowo.

> **Uwaga o dwóch układach interfejsu.** Google przenosi ustawienia OAuth do działu
> **Google Auth Platform**. W starszym układzie wszystko siedzi pod *Ekran zgody OAuth*;
> w nowszym jest rozbite na *Marka*, *Odbiorcy*, *Klienci* i *Dostęp do danych*.
> Kroki są te same, zmienia się tylko, gdzie klikasz — poniżej opisane obie drogi.

---

## 1. Nowy projekt

[console.cloud.google.com](https://console.cloud.google.com) → selektor projektu na górnym pasku
→ **Nowy projekt** (*New project*) → nazwa `foto-bingo` → **Utwórz**.

Poczekaj kilka sekund i **przełącz się na niego** — selektor musi pokazywać `foto-bingo`.
To najczęstsza wpadka: konfiguracja ląduje w cudzym projekcie i potem nic się nie zgadza.

## 2. Włącz Drive API

Menu ☰ → **Interfejsy API i usługi** (*APIs & Services*) → **Biblioteka** (*Library*)
→ wyszukaj `Google Drive API` → **Włącz** (*Enable*).

## 3. Ekran zgody

**Starszy układ:** Interfejsy API i usługi → **Ekran zgody OAuth** (*OAuth consent screen*).
**Nowszy układ:** menu ☰ → **Google Auth Platform** → **Rozpocznij** (*Get started*).

Wypełnij:

| Pole | Wartość |
|---|---|
| Nazwa aplikacji (*App name*) | `Foto Bingo` |
| Adres e-mail zespołu pomocy (*User support email*) | Twój adres |
| Typ użytkownika / Odbiorcy (*User type* / *Audience*) | **Zewnętrzny** (*External*) |
| Dane kontaktowe dewelopera (*Developer contact information*) | Twój adres |

**Zewnętrzny** to jedyna opcja dla zwykłego konta Gmail — *Wewnętrzny* (*Internal*) wymaga
Google Workspace. Resztę pól zostaw pustą i **Zapisz i kontynuuj** (*Save and continue*).

## 4. Zakres — dokładnie jeden

**Starszy układ:** krok **Zakresy** (*Scopes*) w kreatorze.
**Nowszy układ:** Google Auth Platform → **Dostęp do danych** (*Data access*).

Kliknij **Dodaj lub usuń zakresy** (*Add or remove scopes*) → w filtrze wpisz `drive.file`
→ zaznacz `.../auth/drive.file` → **Aktualizuj** (*Update*) → **Zapisz**.

**Nie dodawaj nic więcej.** `drive` i `drive.readonly` to zakresy **ograniczone** (*restricted*) —
uruchamiają weryfikację Google i audyt bezpieczeństwa, czyli tygodnie czekania zamiast
dziesięciu minut. `drive.file` jest **niewrażliwy** i nie wymaga żadnego przeglądu.

## 5. Opublikuj — krok, którego nie wolno pominąć

**Starszy układ:** Ekran zgody OAuth → przycisk **Opublikuj aplikację** (*Publish app*).
**Nowszy układ:** Google Auth Platform → **Odbiorcy** (*Audience*) → **Opublikuj aplikację**.

Stan publikacji musi pokazywać **W wersji produkcyjnej** (*In production*), nie **Testowanie**
(*Testing*).

W stanie *Testowanie* Google unieważnia refresh token **po 7 dniach**. Token wydany w tym
stanie już taki zostaje — opublikowanie aplikacji później go nie naprawi. Aplikacja działałaby
przez tydzień testów i przestała dokładnie w weekend wesela.

**Dlatego ten krok musi być przed krokiem 7.**

Google może pokazać notkę o niezweryfikowanej aplikacji. Przy samym `drive.file` jest bez
znaczenia — przez ten ekran przechodzi tylko jedna osoba, raz.

## 6. Klient OAuth

**Starszy układ:** Interfejsy API i usługi → **Dane logowania** (*Credentials*).
**Nowszy układ:** Google Auth Platform → **Klienci** (*Clients*).

**Utwórz dane logowania** (*Create credentials*) → **Identyfikator klienta OAuth**
(*OAuth client ID*) → **Typ aplikacji** (*Application type*): **Aplikacja komputerowa**
(*Desktop app*) → nazwa dowolna → **Utwórz**.

Skopiuj **Identyfikator klienta** (*Client ID*) i **Tajny klucz klienta** (*Client secret*).

Typ *Aplikacja komputerowa* jest tu właściwy, mimo że aplikacja jest webowa: przez ten flow
przechodzi jednorazowo skrypt na Twoim komputerze, a nie goście w przeglądarce.

## 7. Folder na Dysku

[drive.google.com](https://drive.google.com) → **Nowy** → **Nowy folder** → `FotoBingo 2026`.

Wejdź do niego i skopiuj identyfikator z adresu:

```
drive.google.com/drive/folders/1a2B3cD4eF5gH6iJ7kL8mN
                               ^^^^^^^^^^^^^^^^^^^^^^ to
```

## 8. Trzy wklejki do `.env`

```
GOOGLE_CLIENT_ID=<z kroku 6>
GOOGLE_CLIENT_SECRET=<z kroku 6>
DRIVE_ROOT_FOLDER_ID=<z kroku 7>
```

`GOOGLE_REFRESH_TOKEN` zostaw pusty — wypełni się sam w następnym kroku.

## 9. Refresh token — jedna komenda

```
npm run google-auth
```

Otworzy przeglądarkę. Zaloguj się **kontem, na którego Dysku mają lądować zdjęcia**,
i zezwól na dostęp.

Skrypt zapisuje token prosto do `.env`, żeby nie przechodził przez schowek ani przez historię
terminala. Na koniec odpytuje Drive API i wypisuje adres konta oraz **ile masz wolnego
miejsca** — lepiej dowiedzieć się teraz niż w sobotę.

---

## Gdy coś nie wyjdzie

**„Brak refresh_token w odpowiedzi"** — to konto już raz zgodziło się na dostęp, więc Google
nie wydaje nowego. Cofnij zgodę na [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
i uruchom skrypt ponownie.

**„Aplikacja niezweryfikowana" i nie da się przejść dalej** — kliknij *Zaawansowane*
(*Advanced*) → *Przejdź do Foto Bingo (niebezpieczne)*. To ostrzeżenie dotyczy aplikacji,
którą sam napisałeś, dla własnego konta.

**`redirect_uri_mismatch`** — klient został utworzony jako *Aplikacja internetowa*
(*Web application*) zamiast *Aplikacja komputerowa*. Utwórz nowy, właściwego typu.

**Wolne miejsce poniżej ~6 GB** — 1200 oryginałów to około 4,8 GB, a limit 15 GB dzielisz
z Gmailem i Zdjęciami. Google One 100 GB kosztuje 8,99 zł miesięcznie i zamyka temat.

---

## Kiedy token przestaje działać

Mimo publikacji do produkcji refresh token umiera, gdy: cofniesz dostęp w ustawieniach konta,
zmienisz hasło do konta Google, albo nie użyjesz go przez 6 miesięcy. Żaden z tych przypadków
nie dotyczy weekendu wesela — ale gdyby aplikacja nagle przestała odkładać zdjęcia na Dysk,
zacznij od sprawdzenia tej listy.
