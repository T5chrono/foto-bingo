import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db, type Guest } from "./db";

/**
 * Tożsamość gościa to kod z QR — bez konta, bez hasła, bez logowania (D6).
 * W bazie leży wyłącznie SHA-256 kodu, więc wyciek bazy nie daje dostępu
 * do niczyjej planszy.
 */

/** Base32 bez znaków, które mylą się przy przepisywaniu z winietki: 0/O, 1/I/L. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const TOKEN_LENGTH = 8;

export function generateToken(): string {
  // Odrzucamy bajty spoza pełnych wielokrotności alfabetu, żeby rozkład był
  // równomierny — modulo na 256 faworyzowałoby początek alfabetu.
  const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  let out = "";
  while (out.length < TOKEN_LENGTH) {
    for (const b of randomBytes(TOKEN_LENGTH)) {
      if (b >= limit) continue;
      out += ALPHABET[b % ALPHABET.length];
      if (out.length === TOKEN_LENGTH) break;
    }
  }
  return out;
}

/** Kody z winietek bywają przepisywane ręcznie — wielkość liter nie ma znaczenia. */
export function normalizeToken(raw: string): string {
  return raw.trim().toUpperCase();
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(normalizeToken(raw)).digest("hex");
}

export function tokenLooksValid(raw: string): boolean {
  const t = normalizeToken(raw);
  return (
    t.length === TOKEN_LENGTH && [...t].every((ch) => ALPHABET.includes(ch))
  );
}

/**
 * Zwraca gościa albo null. Odrzuca oczywiste śmieci zanim dotknie bazy —
 * przy 48 kodach każdy zaoszczędzony round-trip do Postgresa to mniej pracy
 * dla funkcji, która i tak budzi się na zimno.
 */
export async function guestByToken(raw: string | null): Promise<Guest | null> {
  if (!raw || !tokenLooksValid(raw)) return null;

  const { data, error } = await db()
    .from("guests")
    .select("id, name, slug, drive_folder_id")
    .eq("token_hash", hashToken(raw))
    .maybeSingle();

  if (error) throw error;
  return (data as Guest | null) ?? null;
}

/** Porównanie odporne na pomiar czasu — do PIN-u panelu. */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
