import { createClient } from "@supabase/supabase-js";

/**
 * Klient wyłącznie do wgrywania plików podpisanymi linkami.
 *
 * Klucz publishable nie daje dostępu do bazy — prawa ról anon i authenticated
 * są odebrane migracją, co jest sprawdzone: zapytanie tym kluczem do
 * /rest/v1/guests zwraca 401. Do bucketa też nie ma dostępu sam z siebie;
 * przepustką jest token z `createSignedUploadUrl`, który wystawia serwer
 * po sprawdzeniu kodu gościa.
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
