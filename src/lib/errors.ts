import type { Strings } from "./strings/pl.js";

/**
 * Błędy, które gość naprawdę zobaczy — jako **kody, nie zdania**.
 *
 * Wcześniej te miejsca rzucały gotowym polskim tekstem i zdanie szło prosto na
 * ekran. Przy dwóch językach dawałoby to angielską aplikację, która przechodzi
 * na polski dokładnie wtedy, gdy coś nie wychodzi — a na weselu w górach z jedną
 * kreską zasięgu to nie jest przypadek brzegowy, tylko zwykły wieczór.
 *
 * Kod tłumaczy się dopiero przy wyświetlaniu, więc nie ma tu problemu z tekstem
 * zamrożonym w złym języku. Kolejka i tak nie zapisuje błędów na dysk — żyją
 * tyle, co jedna próba wysyłki.
 */
export type ErrorCode =
  | "network"
  | "server"
  | "imageRead"
  | "imageEncode"
  | "uploadStalled"
  | "lineIncomplete";

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    /** Tekst po polsku — dla logów i jako ostatnia deska ratunku. */
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** Czy da się z tego wyciągnąć kod. `ApiError` też go nosi, choć dziedziczy z `Error`. */
function codeOf(err: unknown): ErrorCode | null {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === "string" ? (code as ErrorCode) : null;
}

/**
 * Zdanie dla gościa.
 *
 * Przyjmuje `unknown`, bo woła się to zarówno na złapanym błędzie, jak i na
 * raporcie postępu z kolejki (`Progress`), który nie jest `Error`, ale nosi te
 * same dwa pola. Jeden szlak zamiast dwóch prawie identycznych.
 *
 * Bez kodu zostaje surowy tekst — tam siedzą komunikaty walidacyjne z serwera,
 * po polsku. Są to błędy, których gość nie umie wywołać inaczej niż przez naszą
 * pomyłkę, więc nie ma po co tłumaczyć dwudziestu zdań, których nikt nie
 * powinien nigdy zobaczyć; ważne, żeby dało się je odczytać ze zrzutu ekranu
 * przysłanego przez kogoś, komu aplikacja padła.
 */
export function errorText(source: unknown, t: Strings, fallback: string): string {
  const code = codeOf(source);
  if (code && code in t.errors) return t.errors[code];

  const raw = source as { message?: unknown; error?: unknown } | null;
  const text = typeof raw?.message === "string" ? raw.message : raw?.error;
  return typeof text === "string" && text ? text : fallback;
}
