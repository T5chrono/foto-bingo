-- FotoBingo — schemat początkowy.
--
-- Trzy tabele. 25 kategorii planszy NIE jest tabelą — to statyczna stała
-- w src/lib/board.ts, do której photos.category_id odwołuje się po numerze
-- (patrz sekcja 8 specyfikacji).

create table public.guests (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  -- SHA-256 kodu z QR. Kod jawny nie jest nigdzie przechowywany, więc wyciek
  -- bazy nie daje dostępu do niczyjej planszy.
  token_hash      text not null unique,
  -- Wypełniane leniwie, przy pierwszym zdjęciu gościa.
  drive_folder_id text,
  created_at      timestamptz not null default now()
);

create table public.photos (
  id             uuid primary key default gen_random_uuid(),
  guest_id       uuid not null references public.guests(id) on delete cascade,
  category_id    int  not null check (category_id between 1 and 25),
  preview_path   text not null,
  thumb_path     text not null,
  -- Suma podglądu i miniatury. Zasila licznik zajętości w panelu, który pilnuje
  -- limitu 1 GB w Supabase Storage.
  bytes          int  not null check (bytes >= 0),
  width          int,
  height         int,
  drive_file_id  text,
  drive_status   text not null default 'pending'
                 check (drive_status in ('pending', 'ok', 'failed')),
  drive_error    text,
  original_bytes int,
  -- false = zdjęcie podmienione przez gościa. Nic nie kasujemy; oryginał
  -- podmienionego zdjęcia zostaje na Dysku.
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- Jeden aktywny kafelek na gościa i kategorię. Wymuszone w bazie, a nie tylko
-- w kodzie — podwójne kliknięcie na słabym łączu nie może zrobić dwóch aktywnych
-- zdjęć na jednym polu.
create unique index photos_one_active_per_tile
  on public.photos (guest_id, category_id) where is_active;

-- Kolejka kopiowania na Dysk. Częściowy indeks, bo docelowo prawie każdy wiersz
-- ma status 'ok' i nie ma po co go indeksować.
create index photos_drive_pending
  on public.photos (drive_status) where drive_status <> 'ok';

create table public.claims (
  id          uuid primary key default gen_random_uuid(),
  guest_id    uuid not null references public.guests(id) on delete cascade,
  kind        text not null check (kind in ('row', 'col', 'diag', 'full')),
  -- Numer wiersza/kolumny (1..5) albo przekątnej (1..2); null dla 'full'.
  -- Nazwa z line_index zamiast index, bo "index" w SQL-u wymaga cudzysłowów
  -- w połowie narzędzi i czyta się jak DDL, a nie jak kolumna.
  line_index  int check (line_index is null or line_index between 1 and 5),
  status      text not null default 'new'
              check (status in ('new', 'accepted', 'rejected')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

-- Jedno otwarte zgłoszenie na linię. Gość klikający "Zgłoś bingo" trzy razy
-- pod rząd nie zasypuje panelu Pary Młodej duplikatami w trakcie zabawy.
create unique index claims_one_open_per_line
  on public.claims (guest_id, kind, coalesce(line_index, -1)) where status = 'new';

create index claims_open on public.claims (created_at) where status = 'new';

-- ---------------------------------------------------------------------------
-- Zamknięcie Data API.
--
-- Funkcja serwerowa jest jedyną granicą autoryzacji (decyzja D9). Przeglądarka
-- nigdy nie rozmawia z bazą bezpośrednio — wszystko idzie przez /api/*.
--
-- Domyślnie Supabase nadaje rolom anon i authenticated prawa do tabel w public.
-- Bez RLS oznaczałoby to, że każdy z kluczem publishable — a ten jest w kodzie
-- każdej zainstalowanej aplikacji — czyta i zapisuje wszystko. Odbieramy te
-- prawa, i dodatkowo włączamy RLS bez żadnych polityk jako druga warstwa.
-- service_role omija oba mechanizmy, więc aplikacja działa normalnie.

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

alter table public.guests enable row level security;
alter table public.photos enable row level security;
alter table public.claims enable row level security;
