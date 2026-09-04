import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Blokada ekranu ma stan modułowy — jedną blokadę na całą aplikację — więc
 * każdy test bierze świeży moduł, zamiast dziedziczyć licznik po poprzednim.
 */
async function swiezyModul() {
  vi.resetModules();
  return import("./wakelock.js");
}

/** Sentinel z przeglądarki: da się go zwolnić i sam mówi o tym zdarzeniem. */
class FalszywySentinel extends EventTarget {
  release = vi.fn(async () => void this.dispatchEvent(new Event("release")));
}

function api(request: (typ: string) => Promise<unknown>) {
  Object.defineProperty(navigator, "wakeLock", { value: { request }, configurable: true });
}

function widocznosc(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

afterEach(() => {
  Object.defineProperty(navigator, "wakeLock", { value: undefined, configurable: true });
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
});

describe("blokada ekranu", () => {
  it("bierze blokadę na czas roboty i oddaje ją po niej", async () => {
    const lock = new FalszywySentinel();
    const request = vi.fn(async () => lock);
    api(request);

    const { holdScreen } = await swiezyModul();
    const zwolnij = holdScreen();
    // `request` jest asynchroniczne — blokada przychodzi w następnym takcie.
    await Promise.resolve();

    expect(request).toHaveBeenCalledWith("screen");

    zwolnij();
    expect(lock.release).toHaveBeenCalled();
  });

  /**
   * System zabiera blokadę sam, gdy karta schodzi na spód. Powrót na wierzch
   * musi ją odzyskać — inaczej gość, który zerknął na powiadomienie w środku
   * wysyłki filmu, wraca do ekranu, który znowu gaśnie po minucie.
   */
  it("bierze blokadę drugi raz, gdy karta wraca na wierzch", async () => {
    const request = vi.fn(async () => new FalszywySentinel());
    api(request);

    const { holdScreen } = await swiezyModul();
    const zwolnij = holdScreen();
    await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(1);

    // Karta schowana: system zwalnia blokadę, a prośba z tła i tak by odpadła.
    const [lock] = request.mock.results.map((r) => r.value);
    (await lock).dispatchEvent(new Event("release"));
    widocznosc("hidden");
    expect(request).toHaveBeenCalledTimes(1);

    widocznosc("visible");
    await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(2);

    zwolnij();
  });

  it("zwolnienie przez jednego nie gasi ekranu drugiemu", async () => {
    const lock = new FalszywySentinel();
    api(async () => lock);

    const { holdScreen } = await swiezyModul();
    const pierwszy = holdScreen();
    const drugi = holdScreen();
    await Promise.resolve();

    pierwszy();
    expect(lock.release).not.toHaveBeenCalled();

    drugi();
    expect(lock.release).toHaveBeenCalled();
  });

  // Safari przed 16.4 nie ma tego API wcale. Wysyłka ma wtedy działać jak
  // dotąd, a nie wywrócić się na pierwszej linijce.
  it("bez API nie wywraca niczego", async () => {
    const { holdScreen } = await swiezyModul();
    const zwolnij = holdScreen();
    await Promise.resolve();
    expect(() => zwolnij()).not.toThrow();
  });
});
