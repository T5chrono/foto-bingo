-- Licznik zajętości bucketa dla panelu Pary Młodej.
--
-- Supabase Storage nie ma taniego "ile waży ten bucket" — trzeba by przejść
-- listę obiektów. Kolumna photos.bytes istnieje właśnie po to, żeby licznik
-- był jednym zapytaniem, a nie spacerem po 2400 plikach w sobotę wieczorem.
--
-- Liczymy tylko wiersze aktywne, bo podglądy podmienionych zdjęć są kasowane
-- z bucketa — suma ma odpowiadać temu, co tam faktycznie leży.

create or replace function public.used_bytes()
returns bigint
language sql
stable
as $$
  select coalesce(sum(bytes), 0)::bigint from public.photos where is_active;
$$;

-- Ta sama zasada co dla tabel: do bazy wchodzi wyłącznie klucz sekretny.
revoke all on function public.used_bytes() from public, anon, authenticated;
