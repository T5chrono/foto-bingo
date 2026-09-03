-- Filmy na kafelkach.
--
-- Na planszy film wygląda jak zdjęcie: w bucketcie leży klatka z pierwszej
-- sekundy jako WebP, w tej samej ścieżce i w tym samym budżecie. Różnica jest
-- wyłącznie w tym, co jedzie na Dysk — i o tym mówi ta kolumna. Panel kładzie
-- po niej znaczek „film” na miniaturze i liczy osobno oryginały, które utknęły,
-- bo film czeka na Wi-Fi, a zdjęcie nie.
--
-- Domyślnie „photo”, bez wyjątku dla starych wierszy: wszystko, co leży
-- w tabeli przed tą migracją, jest zdjęciem z definicji.

alter table public.photos
  add column kind text not null default 'photo'
    check (kind in ('photo', 'video')),
  add column duration_ms int
    check (duration_ms is null or duration_ms >= 0);
