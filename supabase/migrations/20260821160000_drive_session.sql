-- Sesja resumable Google Drive, trzymana między żądaniami.
--
-- Oryginał idzie kawałkami po 3 MB (S1-C, sekcja 13 specyfikacji), a każdy
-- kawałek to osobne wywołanie funkcji Vercela — bezstanowej i budzącej się
-- na zimno. Adres sesji musi więc leżeć w bazie, nie w pamięci procesu.
--
-- Przeżywa to też restart telefonu w środku wysyłki: gość wraca po godzinie,
-- serwer pyta Google, ile bajtów już doszło, i wysyłka wznawia się od tego
-- miejsca zamiast zaczynać od zera przez górski maszt.

alter table public.photos
  add column drive_session_uri text,
  add column drive_uploaded_bytes int not null default 0
    check (drive_uploaded_bytes >= 0);

-- Nazwa pliku wyliczona przy otwieraniu sesji. Zapisujemy ją, bo znaczniki
-- czasu w nazwie muszą być stabilne przy wznowieniu — inaczej ponowna próba
-- tworzyłaby plik pod inną nazwą niż ta, którą Google już zna.
alter table public.photos add column drive_file_name text;
