# Runbook weselny

Co robić, gdy coś nie działa, a Ty masz garnitur i nie masz laptopa.

Ten dokument jest pisany dla osoby, która **nie zna kodu** — świadkowi, siostrze,
komukolwiek, kto ma PIN. Wydrukuj go albo miej otwarty w telefonie.

---

## Najpierw: co prawdopodobnie NIE jest awarią

**„Wysłałem zdjęcie, a kafelek się nie zmienił."** Sprawdź, czy w aplikacji pisze
*w kolejce* albo *wysyłanie*. Jeśli tak — nie ma awarii, jest słaby zasięg. Zdjęcie
leży bezpiecznie w telefonie i wyśle się samo, gdy gość wejdzie do budynku. Nic nie klikaj.

**„Zdjęcie jest na planszy, ale w panelu pisze, że oryginał w drodze."** Tak ma być.
Zmniejszona wersja leci od razu, żeby gra działała; pełna jakość dosyła się w tle,
czasem godzinami. Zdjęcie **już się liczy do bingo**.

**„Panel pokazuje, że ktoś ma 3 oryginały w drodze."** Poproś tę osobę, żeby otworzyła
aplikację i zostawiła ją na wierzchu przez minutę. Serwer nie może dosłać tych plików
sam — leżą w jej telefonie.

---

## Awarie i co z nimi zrobić

### Gość mówi, że aplikacja się nie otwiera

1. Czy skanuje **swój** kod, czy cudzy? Każda winietka ma inny.
2. Czy ma internet? Niech otworzy cokolwiek innego w przeglądarce.
3. Jeśli aplikacja otwiera się, ale pisze **„Zeskanuj kod QR ze swojej winietki"** —
   otworzył gołą stronę zamiast swojego linku. Niech zeskanuje QR jeszcze raz.

### Gość zgubił winietkę

Daj mu **kartę zapasową** — mają puste miejsce na imię, wpisz je długopisem.
Zapasowe karty są w kopercie razem z wydrukiem tego dokumentu.

Jeśli zapasowe się skończyły, a masz laptopa: `npm run add-guest -- "Imię Nazwisko"`
wypisze nowy kod i link.

### Gość zgłosił bingo, ale w panelu nie ma zgłoszenia

Panel odświeża się sam co 15 sekund. Odczekaj chwilę, potem odśwież stronę.
Jeśli nadal pusto — niech gość kliknie „Zgłoś bingo!" jeszcze raz. Powtórne
kliknięcie nie zrobi duplikatu.

### Aplikacja pisze „Ta linia nie jest jeszcze kompletna"

Plansza w telefonie gościa się rozjechała z tym, co wie serwer. Niech odświeży
stronę (przeciągnięcie w dół albo zamknięcie i otwarcie aplikacji). Serwer sprawdza
linię sam i ma rację — brakuje któregoś zdjęcia.

### Panel nie wpuszcza, PIN jest dobry

Po dziesięciu nietrafieniach panel zamyka się **na godzinę**. Jeśli ktoś próbował
zgadywać, trzeba poczekać. Innej drogi nie ma — i o to chodziło.

### Zdjęcia nie pojawiają się u nikogo, w ogóle

To jedyny scenariusz, który wygląda na prawdziwą awarię. Sprawdź po kolei:

1. Czy **Ty** masz internet.
2. Otwórz aplikację jako gość (własny kod) i spróbuj wysłać zdjęcie. Zobacz, co pisze.
3. Jeśli pisze o błędzie serwera — nic nie zrobisz bez laptopa. **Zdjęcia gości nie
   giną**: leżą w kolejkach w ich telefonach i dojdą, gdy usługa wróci. Powiedz ludziom,
   żeby wysyłali dalej i nie kasowali aplikacji.

To ostatnie zdanie jest najważniejsze w całym dokumencie. **Odinstalowanie aplikacji
kasuje kolejkę razem ze zdjęciami, które w niej czekają.**

---

## Tryb rzutnika

W panelu: zgłoszenie → **Na rzutnik**.

- strzałki lub spacja — następne zdjęcie
- dotknięcie ekranu — następne zdjęcie
- Esc lub **Zamknij** — wyjście

Ekran nie powinien gasnąć. Jeśli gaśnie, ustaw w telefonie czas wygaszania na maksimum —
zabezpieczenie w aplikacji nie działa na wszystkich modelach.

---

## Czego NIE robić

**Nie kasuj niczego z Dysku Google w trakcie wesela.** Nazwy plików wyglądają technicznie,
ale są potrzebne. Porządki po weselu.

**Nie zmieniaj nic w ustawieniach Google ani Supabase.** Wszystko jest skonfigurowane
i przetestowane. Zmiana czegokolwiek w sobotę to jedyny sposób, żeby naprawdę to zepsuć.

**Nie proś gości o odinstalowanie i zainstalowanie od nowa.** To kasuje kolejkę.
Jeśli aplikacja się zacina, wystarczy zamknąć ją i otworzyć.

---

## Po weselu

1. Otwórz panel i sprawdź, czy ktoś ma jeszcze oryginały w drodze. Jeśli tak — poproś
   te osoby o otwarcie aplikacji, zanim skasują ją z telefonu.
2. Dopiero potem można ogłosić koniec gry.
3. Zdjęcia leżą na Dysku w `FotoBingo/Imię Nazwisko/`. Nazwy plików zaczynają się od
   `R1K1`, `R2K3` i tak dalej — to pozycja na planszy, więc sortowanie po nazwie
   układa je w kolejności czytania karty.
