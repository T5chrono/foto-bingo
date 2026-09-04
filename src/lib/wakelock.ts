/**
 * Ekran, który nie gaśnie, dopóki coś leci w górę.
 *
 * **Objaw:** gość wybiera film, odkłada telefon na stół, po minucie ekran
 * gaśnie sam — i pasek postępu stoi dokładnie tam, gdzie go zostawił. To nie
 * jest awaria wysyłki. Uśpiony telefon usypia razem z podświetleniem cały
 * JavaScript karty: żądanie w locie zostaje ucięte, a pętla kawałków nie
 * dostaje już ani jednego kroku.
 *
 * Blokada `screen` mówi systemowi „nie wygaszaj sam z siebie". Nie broni się
 * przed przyciskiem blokady — tego nie da się obejść żadnym API przeglądarki
 * i nie próbujemy — ale usuwa dokładnie ten przypadek, który zdarza się
 * naprawdę: telefon leżący ekranem do góry przez trzy minuty wysyłania filmu.
 *
 * Trzy rzeczy, które w tym API zaskakują:
 *
 * - **`request` odrzuca, gdy karta jest schowana.** Prośba z tła to nie błąd
 *   do zgłoszenia, tylko normalne „nie teraz" — dlatego po cichu.
 * - **System zwalnia blokadę sam**, gdy karta schodzi na spód albo siada
 *   bateria. Sentinel zostaje wtedy martwy, więc po powrocie na wierzch
 *   trzeba poprosić drugi raz — stąd nasłuch na `visibilitychange`.
 * - **Safari przed 16.4 nie ma tego wcale.** Brak API nie może niczego
 *   wywrócić: wysyłka leci jak dotąd, tylko ekran gaśnie po swojemu.
 */

/**
 * Ilu wołających trzyma teraz ekran.
 *
 * Blokada jest jedna na całą aplikację, a chętnych może być dwóch naraz —
 * wysyłka z kolejki i tryb rzutnika. Bez licznika zwolnienie jednego gasiłoby
 * ekran drugiemu, w środku jego roboty.
 */
let holders = 0;
let sentinel: WakeLockSentinel | null = null;
/** Prośba już poszła i czeka na odpowiedź systemu — druga byłaby zbędna. */
let pending = false;

async function acquire(): Promise<void> {
  const wakeLock: WakeLock | undefined = navigator.wakeLock;
  if (!wakeLock || pending || sentinel || holders === 0) return;
  if (document.visibilityState !== "visible") return;

  pending = true;
  try {
    const lock = await wakeLock.request("screen");
    // Wołający mógł skończyć, kiedy czekaliśmy na odpowiedź — wtedy blokada
    // przyszła do nikogo i oddajemy ją od razu, zamiast trzymać ekran zapalony
    // po pustej kolejce.
    if (holders === 0) return void lock.release().catch(() => null);

    sentinel = lock;
    lock.addEventListener(
      "release",
      () => {
        if (sentinel === lock) sentinel = null;
      },
      { once: true },
    );
  } catch {
    /* Brak zgody albo brak API — nie ma czego naprawiać, ekran po prostu gaśnie. */
  } finally {
    pending = false;
  }
}

function onVisible(): void {
  if (document.visibilityState === "visible") void acquire();
}

/**
 * Trzyma ekran zapalony do czasu wywołania zwróconej funkcji.
 *
 * Zwolnienie jest odporne na powtórzenie — `drain` woła je w `finally`,
 * a to samo miejsce potrafi wykonać się przy błędzie i przy sukcesie.
 */
export function holdScreen(): () => void {
  holders += 1;
  if (holders === 1) document.addEventListener("visibilitychange", onVisible);
  void acquire();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders -= 1;
    if (holders > 0) return;

    document.removeEventListener("visibilitychange", onVisible);
    const lock = sentinel;
    sentinel = null;
    void lock?.release().catch(() => null);
  };
}
