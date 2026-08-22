-- Nieudane próby PIN-u do panelu.
--
-- Licznik musi mieszkać w bazie, a nie w pamięci procesu: funkcja Vercela
-- to kilka instancji budzących się na zimno, więc licznik w pamięci resetuje
-- się sam i nie chroni przed niczym.
--
-- PIN ma sześć cyfr, czyli milion kombinacji. Bez hamulca da się je przejść
-- skryptem w kilka godzin, a za panelem leżą zdjęcia wszystkich gości.

create table public.panel_attempts (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create index panel_attempts_recent on public.panel_attempts (created_at desc);

revoke all on table public.panel_attempts from anon, authenticated;
alter table public.panel_attempts enable row level security;
