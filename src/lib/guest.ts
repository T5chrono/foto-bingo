/**
 * Tożsamość gościa: kod z QR trzymany w localStorage.
 *
 * Kod przychodzi ze ścieżki /g/:token albo z ?g= w adresie startowym. Ta druga
 * droga jest po to, żeby zainstalowana aplikacja na iOS wiedziała, kim jest —
 * iOS bierze adres startowy z bieżącej strony, a instalacja z linku osobistego
 * to jedyna ścieżka, w której kod przeżywa dodanie do ekranu głównego.
 */
const KEY = "fotobingo.token";

export function readToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    // Prywatne okno na starszym Safari potrafi rzucić na samym dostępie.
    return null;
  }
}

export function saveToken(token: string): void {
  try {
    localStorage.setItem(KEY, normalize(token));
  } catch {
    /* pusto — aplikacja i tak zadziała do końca tej sesji */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* pusto */
  }
}

export function normalize(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Kod z adresu: /g/ABCD1234 albo /?g=ABCD1234 */
export function tokenFromLocation(loc: { pathname: string; search: string }): string | null {
  const fromPath = /^\/g\/([^/?#]+)/.exec(loc.pathname)?.[1];
  if (fromPath) return normalize(decodeURIComponent(fromPath));
  const fromQuery = new URLSearchParams(loc.search).get("g");
  return fromQuery ? normalize(fromQuery) : null;
}
