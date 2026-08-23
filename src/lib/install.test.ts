import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Sedno tych testów: zdarzenie ma zostać złapane **zanim ktokolwiek zacznie je
 * czytać**. Tak zachowuje się pierwszy skan kodu QR — Chrome strzela, gdy gość
 * czyta ekran o zdjęciach, a baner instalacji montuje się dopiero na planszy,
 * kilkanaście sekund później.
 *
 * Moduł trzyma złapane zaproszenie w zmiennej modułowej, więc każdy przypadek
 * dostaje **świeżą kopię modułu** przez `resetModules`. Bez tego testy
 * przechodziłyby zależnie od kolejności, a to gorsze niż brak testu: zielono
 * jest tak samo, tylko nic nie znaczy.
 */
type Install = typeof import("./install.js");

let install: Install;
let bus: EventTarget;

beforeEach(async () => {
  vi.resetModules();
  install = await import("./install.js");
  bus = new EventTarget();
  install.watchInstallPrompt(bus);
});

function fireInstallPrompt() {
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(event, {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: "accepted" as const }),
  });
  bus.dispatchEvent(event);
  return event as Event & { prompt: ReturnType<typeof vi.fn> };
}

describe("zaproszenie do instalacji", () => {
  it("nie ma go, dopóki przeglądarka nic nie zgłosiła", () => {
    expect(install.readInstallPrompt()).toBeNull();
  });

  it("przechowuje zdarzenie, które przyszło ZANIM ktokolwiek się zapisał", () => {
    fireInstallPrompt();

    // Baner montuje się dopiero teraz — i mimo to ma co pokazać.
    expect(install.readInstallPrompt()).not.toBeNull();
  });

  it("blokuje własny pasek przeglądarki", () => {
    expect(fireInstallPrompt().defaultPrevented).toBe(true);
  });

  it("budzi subskrybenta, gdy zdarzenie przyjdzie po zapisaniu się", () => {
    const onChange = vi.fn();
    install.subscribeInstallPrompt(onChange);

    fireInstallPrompt();

    expect(onChange).toHaveBeenCalled();
    expect(install.readInstallPrompt()).not.toBeNull();
  });

  it("przestaje budzić po wypisaniu", () => {
    const onChange = vi.fn();
    install.subscribeInstallPrompt(onChange)();

    fireInstallPrompt();

    expect(onChange).not.toHaveBeenCalled();
  });

  /** Zaproszenia nie da się użyć dwa razy — przycisk musi zniknąć po dotknięciu. */
  it("zużywa zaproszenie po pokazaniu okna", async () => {
    const event = fireInstallPrompt();
    const onChange = vi.fn();
    install.subscribeInstallPrompt(onChange);

    await install.showInstallPrompt();

    expect(event.prompt).toHaveBeenCalledOnce();
    expect(install.readInstallPrompt()).toBeNull();
    expect(onChange).toHaveBeenCalled();
  });

  it("nie wywraca się, gdy nie ma czego pokazać", async () => {
    await expect(install.showInstallPrompt()).resolves.toBeUndefined();
  });

  it("zapomina zaproszenie po zainstalowaniu aplikacji", () => {
    fireInstallPrompt();
    bus.dispatchEvent(new Event("appinstalled"));

    expect(install.readInstallPrompt()).toBeNull();
  });
});
