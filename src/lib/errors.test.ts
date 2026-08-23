import { describe, expect, it } from "vitest";

import { ApiError } from "./api.js";
import { AppError, errorText } from "./errors.js";
import { en } from "./strings/en.js";
import { pl } from "./strings/pl.js";

describe("tekst błędu dla gościa", () => {
  it("tłumaczy błąd z kodem", () => {
    const err = new AppError("imageRead", "Nie udało się odczytać zdjęcia");
    expect(errorText(err, pl, "…")).toBe(pl.errors.imageRead);
    expect(errorText(err, en, "…")).toBe(en.errors.imageRead);
  });

  it("tłumaczy kod niesiony przez ApiError", () => {
    const err = new ApiError(0, "Failed to fetch", "network");
    expect(errorText(err, en, "…")).toBe(en.errors.network);
  });

  /**
   * Raport z kolejki nie jest `Error`, ale niesie te same dwa pola — i to on
   * trafia na ekran przy nieudanej wysyłce, więc musi się tłumaczyć tak samo.
   */
  it("tłumaczy kod z raportu postępu kolejki", () => {
    expect(errorText({ code: "uploadStalled", error: "…" }, en, "…")).toBe(
      en.errors.uploadStalled,
    );
  });

  it("tłumaczy kod przysłany przez serwer", () => {
    const err = new ApiError(409, "Ta linia nie jest jeszcze kompletna.", "lineIncomplete");
    expect(errorText(err, en, "…")).toBe(en.errors.lineIncomplete);
  });

  /**
   * Walidacja serwera bez kodu zostaje po polsku. To błędy, których gość nie
   * umie wywołać inaczej niż naszą pomyłką — mają być czytelne na zrzucie
   * ekranu, a nie ładne.
   */
  it("przepuszcza nieznany komunikat serwera bez zmian", () => {
    const err = new ApiError(400, "Brak poprawnego photoId");
    expect(errorText(err, en, "fallback")).toBe("Brak poprawnego photoId");
  });

  it("schodzi na tekst zapasowy, gdy nie ma ani kodu, ani komunikatu", () => {
    expect(errorText(null, en, "fallback")).toBe("fallback");
    expect(errorText(new Error(""), en, "fallback")).toBe("fallback");
    expect(errorText({ nonsense: 1 }, en, "fallback")).toBe("fallback");
  });

  it("nie wywraca się na kodzie, którego nie ma w słowniku", () => {
    expect(errorText({ code: "cosNowego", message: "surowy" }, en, "fallback")).toBe("surowy");
  });
});
