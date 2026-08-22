import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config";

/**
 * Klient Supabase z kluczem sekretnym — omija RLS i odebrane prawa ról
 * anon/authenticated. To jedyna droga aplikacji do bazy; przeglądarka nigdy
 * nie rozmawia z bazą bezpośrednio (decyzja D9).
 *
 * Tworzony leniwie i cache'owany: funkcja Vercela żyje między żądaniami,
 * więc nie ma po co budować klienta na każde z nich.
 */
let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!client) {
    client = createClient(config.supabaseUrl, config.supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/** Tylko do testów — pozwala podstawić atrapę zamiast prawdziwego klienta. */
export function __setDb(fake: SupabaseClient | null): void {
  client = fake;
}

export type Guest = {
  id: string;
  name: string;
  slug: string;
  drive_folder_id: string | null;
};

export type Photo = {
  id: string;
  guest_id: string;
  category_id: number;
  preview_path: string;
  thumb_path: string;
  bytes: number;
  width: number | null;
  height: number | null;
  drive_file_id: string | null;
  drive_status: "pending" | "ok" | "failed";
  drive_error: string | null;
  original_bytes: number | null;
  is_active: boolean;
  created_at: string;
};
