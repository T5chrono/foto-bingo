/**
 * Konfiguracja z zmiennych środowiskowych.
 *
 * Czytana leniwie, a nie na starcie modułu: funkcja Vercela importuje ten plik
 * również w testach i w skryptach, gdzie większość zmiennych nie istnieje.
 * Wywalenie się przy imporcie zamieniłoby brak jednej zmiennej w "cała funkcja
 * nie startuje", zamiast w czytelny błąd 500 na jednym endpointcie.
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Brak zmiennej środowiskowej ${name}`);
  return v;
}

export const config = {
  get supabaseUrl() {
    return required("SUPABASE_URL");
  },
  /** Nowy klucz sekretny (sb_secret_…), nie Legacy service_role. Omija RLS. */
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY");
  },
  get bucket() {
    return process.env.SUPABASE_BUCKET ?? "fotobingo";
  },
  get isDev() {
    return (process.env.ENV ?? "production") === "development";
  },

  get googleClientId() {
    return required("GOOGLE_CLIENT_ID");
  },
  get googleClientSecret() {
    return required("GOOGLE_CLIENT_SECRET");
  },
  get googleRefreshToken() {
    return required("GOOGLE_REFRESH_TOKEN");
  },
  /** Folder utworzony przez `npm run drive:init` — zakres drive.file nie widzi
   *  folderow zalozonych recznie w przegladarce. */
  get driveRootFolderId() {
    return required("DRIVE_ROOT_FOLDER_ID");
  },

  get panelPin() {
    return required("PANEL_PIN");
  },
  get sessionSecret() {
    return required("SESSION_SECRET");
  },
} as const;

/**
 * Budżety kompresji. Front dostaje je z serwera zamiast mieć zaszyte na sztywno,
 * żeby dało się zejść z jakością bez wypuszczania nowej wersji aplikacji —
 * w sobotę wieczorem nikt nie będzie czekał na deploy i na to, aż 40 telefonów
 * pobierze nowego service workera.
 *
 * Liczby z sekcji 5 specyfikacji: 1200 zdjęć × (350 + 30) KB ≈ 456 MB z 1 GB.
 */
export const BUDGET = {
  preview: { maxEdge: 1600, maxBytes: 350 * 1024 },
  thumb: { maxEdge: 400, maxBytes: 30 * 1024 },
  /** Po przekroczeniu tego progu w bucketcie schodzimy z jakością podglądów. */
  degradeAboveBytes: 750 * 1024 * 1024,
  degradedPreview: { maxEdge: 1280, maxBytes: 200 * 1024 },
} as const;

export type Budget = {
  preview: { maxEdge: number; maxBytes: number };
  thumb: { maxEdge: number; maxBytes: number };
};
