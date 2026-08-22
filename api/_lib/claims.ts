import { LINES, isFullCard } from "../../src/lib/bingo";
import { db, type Guest } from "./db";

/**
 * Zgłoszenia bingo.
 *
 * Serwer **sprawdza linię sam**, zamiast wierzyć telefonowi. Nie dlatego, że
 * spodziewamy się oszustów na weselu — tylko dlatego, że aplikacja na starym
 * telefonie z nieodświeżoną planszą potrafi zgłosić linię w dobrej wierze,
 * a Para Młoda dostałaby wtedy zgłoszenie z czterema zdjęciami zamiast pięciu
 * i musiała się zastanawiać, czy to błąd, czy oszustwo.
 */

export type ClaimKind = "row" | "col" | "diag" | "full";

export type CreateResult =
  | { ok: true; claimId: string; alreadyOpen: boolean }
  | { ok: false; reason: "niepelna-linia" | "zla-linia" };

export async function createClaim(
  guest: Guest,
  kind: ClaimKind,
  lineIndex: number | null,
): Promise<CreateResult> {
  const filled = await filledCategories(guest.id);

  if (kind === "full") {
    if (!isFullCard(filled)) return { ok: false, reason: "niepelna-linia" };
  } else {
    const line = LINES.find((l) => l.kind === kind && l.index === lineIndex);
    if (!line) return { ok: false, reason: "zla-linia" };
    if (!line.ids.every((id) => filled.has(id))) {
      return { ok: false, reason: "niepelna-linia" };
    }
  }

  // Częściowy indeks unikalny w bazie pilnuje, żeby jedna linia miała jedno
  // otwarte zgłoszenie. Sprawdzamy to jednak i tutaj, żeby odpowiedzieć
  // sensownie zamiast błędem 500 — gość klikający trzy razy pod rząd przy
  // słabym łączu to sytuacja normalna, nie awaryjna.
  const base = db()
    .from("claims")
    .select("id")
    .eq("guest_id", guest.id)
    .eq("kind", kind)
    .eq("status", "new");

  const { data: existing } = await (
    lineIndex === null ? base.is("line_index", null) : base.eq("line_index", lineIndex)
  ).maybeSingle();

  if (existing) return { ok: true, claimId: existing.id as string, alreadyOpen: true };

  const { data, error } = await db()
    .from("claims")
    .insert({ guest_id: guest.id, kind, line_index: lineIndex })
    .select("id")
    .single();
  if (error) throw error;

  return { ok: true, claimId: data.id as string, alreadyOpen: false };
}

export async function filledCategories(guestId: string): Promise<Set<number>> {
  const { data, error } = await db()
    .from("photos")
    .select("category_id")
    .eq("guest_id", guestId)
    .eq("is_active", true);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.category_id as number));
}

export async function guestClaims(guestId: string) {
  const { data, error } = await db()
    .from("claims")
    .select("id, kind, line_index, status, created_at")
    .eq("guest_id", guestId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function resolveClaim(
  claimId: string,
  status: "accepted" | "rejected",
): Promise<boolean> {
  const { data, error } = await db()
    .from("claims")
    .update({ status, resolved_at: new Date().toISOString() })
    .eq("id", claimId)
    .eq("status", "new")
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** Identyfikatory kategorii tworzących linię zgłoszenia — panel pokazuje
 *  dokładnie te zdjęcia, nie całą planszę. */
export function lineCategories(kind: ClaimKind, lineIndex: number | null): number[] {
  if (kind === "full") return Array.from({ length: 25 }, (_, i) => i + 1);
  return LINES.find((l) => l.kind === kind && l.index === lineIndex)?.ids.slice() ?? [];
}
