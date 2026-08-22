# Wdrożenie na Vercela

Produkcja: **https://foto-bingo.vercel.app**

Projekt `foto-bingo` w `t5chronos-projects`, podłączony do `T5chrono/foto-bingo`.
Push do `master` wdraża produkcję automatycznie; `develop` tworzy deployment Preview.

---

## Trzy pułapki, każda kosztowała jedno nieudane wdrożenie

Wszystkie trzy łączy jedno: **build i testy przechodziły lokalnie za każdym razem**.
Błąd wychodził dopiero na wdrożonej funkcji.

### 1. Rozszerzenia w importach: `.js`, nie `.ts` i nie brak

Vercel transpiluje `api/index.ts` do `api/index.js`, ale **zostawia specyfikatory
importów bez zmian**. Import `./_lib/auth.ts` szuka więc pliku, którego po
transpilacji nie ma — `ERR_MODULE_NOT_FOUND` na każdym żądaniu.

Bez rozszerzeń też nie przejdzie: type-check `api/` po stronie Vercela działa
z `moduleResolution: node16`, które wymaga jawnych rozszerzeń i podpowiada `.js`.

Stan właściwy to konwencja ESM w TypeScripcie: **w imporcie piszesz `.js`, na dysku
leży `.ts`**. Obowiązuje w `api/**` i `src/lib/**`, czyli w łańcuchu, który Vercel
kompiluje. `src/components`, `src/pages` i `src/hooks` zostają bez rozszerzeń —
obsługuje je wyłącznie Vite. Pilnuje tego test `src/lib/imports.test.ts`.

### 2. `tsconfig.json` w korzeniu musi mieć `compilerOptions`

Nasz korzeń był czystym rozdzielnikiem (`files: []` plus `references`). Vercel
kompiluje `api/` własnym przebiegiem i czyta **wyłącznie ten plik**, więc dostawał
domyślne ustawienia bez `strict`.

Bez `strict` przestaje działać zawężanie unii po polu rozróżniającym, więc kod
w rodzaju `if (!result.done) return result.offset` — poprawny lokalnie — wywala
kompilację na Vercelu.

`compilerOptions` w rozdzielniku istnieją **dla Vercela, nie dla nas**: nasz build
i tak idzie przez referencje.

### 3. Funkcja eksportuje `fetch`, nie `default`

Runtime Node na Vercelu traktuje domyślny eksport jako `(req, res) => void`
i **ignoruje zwróconą wartość**. `hono/vercel` oddaje handler w stylu Web `fetch`,
więc `Response` nigdy nie trafiał do `res`: każde żądanie wisiało do limitu
30 sekund i kończyło się 504.

To była najbardziej myląca z trzech awarii — build zielony, żadnego błędu
w logach aplikacji, tylko timeout. Vercel podpowiada to wprost we własnym
ostrzeżeniu w logach runtime, więc **przy 504 na funkcji zaczynaj od
`vercel logs`**, nie od zgadywania.

```ts
const handler = app.fetch;
export { handler as fetch };
```

Alias, żeby nazwany eksport nie przesłonił globalnego `fetch` w tym module.

---

## Zmienne środowiskowe

Dwanaście zmiennych, każda w dwóch środowiskach (Production i Preview) — w panelu
Vercela wygląda to na duplikaty, ale to jeden wpis na środowisko. Sprawdzenie:

```
npx vercel env ls
```

`ENV` jest ustawione na `production` **jawnie**, a nie skopiowane z lokalnego
`.env`, gdzie ma wartość `development`. Skopiowanie włączyłoby CORS dla localhosta
na produkcji.

`PUBLIC_BASE_URL` **nie jest** na Vercelu: używają go wyłącznie lokalne skrypty
generujące winietki, funkcja serwerowa nigdy go nie czyta.

**Deploymenty Preview mają te same sekrety co produkcja**, więc pisałyby do tej
samej bazy i do tego samego folderu na Dysku. Są chronione logowaniem do Vercela
(SSO), więc nie są publicznie dostępne — ale warto o tym pamiętać, zanim ktoś
otworzy podgląd niedokończonej gałęzi w weekend wesela. Usunięcie ich to
`npx vercel env rm NAZWA preview` dla każdej z dwunastu.

---

## Regiony

`vercel.json` ustawia `regions: ["cdg1"]` (Paryż), bo tam stoi baza Supabase
(`eu-west-3`). Działa — potwierdza to nagłówek odpowiedzi:

```
X-Vercel-Id: arn1::cdg1::5c2h2-...
             ^^^^  ^^^^
             brzeg  funkcja
```

Pierwszy człon to brzeg sieci najbliższy dzwoniącemu i **zmienia się razem z tym,
skąd przychodzi żądanie** — łatwo wziąć go za region funkcji i zacząć naprawiać
coś, co nie jest zepsute. Liczy się drugi.

---

## Sprawdzenie po wdrożeniu

```
curl -s https://foto-bingo.vercel.app/api/health
curl -s -o /dev/null -w '%{http_code}\n' https://foto-bingo.vercel.app/api/me
```

Pierwsze ma dać `{"ok":true}`, drugie **401** — brak kodu gościa musi być odrzucony.
Jeśli pierwsze wisi i kończy się 504, patrz pułapka 3.
