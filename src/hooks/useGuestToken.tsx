import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearToken, readToken, saveToken, tokenFromLocation } from "../lib/guest";

/**
 * Kod gościa jako stan aplikacji, a nie tylko wpis w localStorage.
 *
 * Bez tego ekran wejściowy /g/:token zapisywał kod, ale React nadal trzymał
 * starą wartość i pokazywał „zeskanuj kod" mimo poprawnego skanu. Można to
 * było załatwić przeładowaniem strony, ale przeładowanie oznacza drugie
 * pobranie aplikacji dokładnie przy pierwszym skanie — czyli tam, gdzie gość
 * stoi przy ognisku z jedną kreską zasięgu.
 */
type Ctx = {
  token: string | null;
  setToken: (token: string) => void;
  forget: () => void;
};

const GuestTokenContext = createContext<Ctx | null>(null);

export function GuestTokenProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => {
    // Kod z ?g= w adresie startowym: iOS bierze start_url z bieżącej strony,
    // więc instalacja z linku osobistego to jedyna droga, w której tożsamość
    // przeżywa dodanie do ekranu głównego.
    const fromUrl = tokenFromLocation(window.location);
    if (fromUrl && !window.location.pathname.startsWith("/g/")) saveToken(fromUrl);
    return readToken();
  });

  const setToken = useCallback((next: string) => {
    saveToken(next);
    setTokenState(readToken());
  }, []);

  const forget = useCallback(() => {
    clearToken();
    setTokenState(null);
  }, []);

  // Gość, który otworzył aplikację w dwóch kartach i zeskanował kod w jednej.
  useEffect(() => {
    const sync = () => setTokenState(readToken());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const value = useMemo(() => ({ token, setToken, forget }), [token, setToken, forget]);
  return (
    <GuestTokenContext.Provider value={value}>{children}</GuestTokenContext.Provider>
  );
}

export function useGuestToken(): Ctx {
  const ctx = useContext(GuestTokenContext);
  if (!ctx) throw new Error("useGuestToken poza GuestTokenProvider");
  return ctx;
}
