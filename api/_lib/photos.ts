import { db, type Photo } from "./db";
import { removeObjects } from "./storage";

export type TileState = {
  categoryId: number;
  photoId: string;
  previewPath: string;
  thumbPath: string;
  driveStatus: Photo["drive_status"];
  createdAt: string;
};

/** Aktualna plansza gościa: po jednym aktywnym zdjęciu na zdobytą kategorię. */
export async function boardState(guestId: string): Promise<TileState[]> {
  const { data, error } = await db()
    .from("photos")
    .select("id, category_id, preview_path, thumb_path, drive_status, created_at")
    .eq("guest_id", guestId)
    .eq("is_active", true)
    .order("category_id");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    categoryId: row.category_id as number,
    photoId: row.id as string,
    previewPath: row.preview_path as string,
    thumbPath: row.thumb_path as string,
    driveStatus: row.drive_status as Photo["drive_status"],
    createdAt: row.created_at as string,
  }));
}

export type FinalizeInput = {
  guestId: string;
  photoId: string;
  categoryId: number;
  previewPath: string;
  thumbPath: string;
  bytes: number;
  width: number | null;
  height: number | null;
  originalBytes: number | null;
};

export type FinalizeResult = {
  photoId: string;
  replaced: boolean;
  /** true, gdy ten sam photoId był już zapisany — powtórka z kolejki, nie nowe zdjęcie. */
  alreadyExisted: boolean;
};

/**
 * Zapisuje zdjęcie i dezaktywuje poprzednie na tym kafelku.
 *
 * Dwie rzeczy są tu celowe i nieoczywiste:
 *
 * 1. **Odpowiadamy na powtórkę zanim cokolwiek zmienimy.** Kolejka w telefonie
 *    ponawia zadanie, którego odpowiedzi nigdy nie zobaczyła — przy zasięgu
 *    w Beskidzie to sytuacja normalna, nie awaryjna. Ten sam photoId musi dać
 *    ten sam wynik, a nie drugi wiersz albo błąd.
 *
 * 2. **Stary podgląd kasujemy z bucketa dopiero po udanym zapisie.** Kolejność
 *    odwrotna oznaczałaby, że nieudany insert zostawia gościa z pustym
 *    kafelkiem i skasowanym plikiem. Oryginał starego zdjęcia zostaje na Dysku
 *    — na weselu nic nie ginie bezpowrotnie.
 */
export async function finalizePhoto(input: FinalizeInput): Promise<FinalizeResult> {
  const client = db();

  const { data: existing, error: existingError } = await client
    .from("photos")
    .select("id, guest_id")
    .eq("id", input.photoId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    if (existing.guest_id !== input.guestId) {
      throw Object.assign(new Error("Zdjęcie należy do innego gościa"), {
        status: 403,
      });
    }
    return { photoId: input.photoId, replaced: false, alreadyExisted: true };
  }

  const { data: previous, error: previousError } = await client
    .from("photos")
    .select("id, preview_path, thumb_path")
    .eq("guest_id", input.guestId)
    .eq("category_id", input.categoryId)
    .eq("is_active", true)
    .maybeSingle();
  if (previousError) throw previousError;

  if (previous) {
    const { error } = await client
      .from("photos")
      .update({ is_active: false })
      .eq("id", previous.id);
    if (error) throw error;
  }

  const { error: insertError } = await client.from("photos").insert({
    id: input.photoId,
    guest_id: input.guestId,
    category_id: input.categoryId,
    preview_path: input.previewPath,
    thumb_path: input.thumbPath,
    bytes: input.bytes,
    width: input.width,
    height: input.height,
    original_bytes: input.originalBytes,
  });

  if (insertError) {
    // Wstawienie padło — cofamy dezaktywację, żeby gość nie został z pustym
    // kafelkiem i zdjęciem, którego nigdzie nie ma.
    if (previous) {
      await client.from("photos").update({ is_active: true }).eq("id", previous.id);
    }
    throw insertError;
  }

  if (previous) {
    await removeObjects(
      [previous.preview_path as string, previous.thumb_path as string].filter(Boolean),
    );
  }

  return { photoId: input.photoId, replaced: Boolean(previous), alreadyExisted: false };
}
