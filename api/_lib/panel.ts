import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config";
import { db } from "./db";
import { safeEqual } from "./auth";

/**
 * Wejście do panelu Pary Młodej: PIN w zamian za podpisane ciasteczko.
 *
 * Bez konta i bez hasła — w sobotę o 23:00 nikt nie będzie resetował hasła.
 * PIN to sześć cyfr, czyli milion kombinacji, więc hamulec na nieudane próby
 * jest tu jedynym zabezpieczeniem, jakie w ogóle mamy.
 */

export const COOKIE = "fb_panel";
const MAX_AGE_SECONDS = 30 * 24 * 3600;

/** Po tylu nietrafieniach panel zamyka się na godzinę. */
const MAX_ATTEMPTS = 10;
const LOCKOUT_MINUTES = 60;

export type LoginResult =
  | { ok: true; cookie: string }
  | { ok: false; reason: "zly-pin" | "zablokowane"; retryAfterMinutes?: number };

export async function login(pin: string): Promise<LoginResult> {
  const recent = await failedAttempts();
  if (recent >= MAX_ATTEMPTS) {
    return { ok: false, reason: "zablokowane", retryAfterMinutes: LOCKOUT_MINUTES };
  }

  if (!safeEqual(pin.trim(), config.panelPin)) {
    await db().from("panel_attempts").insert({});
    return { ok: false, reason: "zly-pin" };
  }

  return { ok: true, cookie: buildCookie(sign(expiryStamp())) };
}

async function failedAttempts(): Promise<number> {
  const since = new Date(Date.now() - LOCKOUT_MINUTES * 60_000).toISOString();
  const { count, error } = await db()
    .from("panel_attempts")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Wartość ciasteczka to `wygaśnięcie.podpis`. Nie ma tu sesji po stronie
 * serwera, bo nie ma czego unieważniać — jedno wejście, jeden sekret.
 * Zmiana `SESSION_SECRET` unieważnia wszystkie wydane ciasteczka naraz,
 * co jest całym potrzebnym mechanizmem wylogowania awaryjnego.
 */
function expiryStamp(): string {
  return String(Date.now() + MAX_AGE_SECONDS * 1000);
}

function sign(payload: string): string {
  const mac = createHmac("sha256", config.sessionSecret).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

export function verifyCookie(raw: string | undefined): boolean {
  if (!raw) return false;
  const value = readCookie(raw, COOKIE);
  if (!value) return false;

  const dot = value.lastIndexOf(".");
  if (dot <= 0) return false;

  const payload = value.slice(0, dot);
  const mac = value.slice(dot + 1);

  const expected = createHmac("sha256", config.sessionSecret).update(payload).digest("hex");
  const a = Buffer.from(mac, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function buildCookie(value: string): string {
  return [
    `${COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE_SECONDS}`,
    // Bez Secure w dev — localhost nie jest po HTTPS, a bez tego przeglądarka
    // po prostu odrzuci ciasteczko i logowanie nigdy nie zadziała lokalnie.
    config.isDev ? "" : "Secure",
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function readCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}
