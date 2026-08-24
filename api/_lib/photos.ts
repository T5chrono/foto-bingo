import { db, type Photo } from "./db.js";
import { removeObjects } from "./storage.js";

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

export type ActivePhoto = {
  id: string;
  previewPath: string;
  thumbPath: string;
  /** Puste, gdy oryginał nie zdążył dojechać na Dysk — nie ma czego zabierać. */
  driveFileId: string | null;
};

/** Zdjęcie, które w tej chwili stoi na kafelku gościa. */
export async function activePhoto(
  guestId: string,
  categoryId: number,
): Promise<ActivePhoto | null> {
  const { data, error } = await db()
    .from("photos")
    .select("id, preview_path, thumb_path, drive_file_id")
    .eq("guest_id", guestId)
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id as string,
    previewPath: data.preview_path as string,
    thumbPath: data.thumb_path as string,
    driveFileId: (data.drive_file_id as string | null) ?? null,
  };
}

/**
 * Zdejmuje zdjęcie z kafelka — odwrotność `finalizePhoto`.
 *
 * Wiersz zostaje w bazie z `is_active=false`, bo historia kafelka jest tym,
 * z czego panel wie, że podmiana w ogóle była. Z bucketa znika podgląd
 * i miniatura — dokładnie te same dwa pliki, które kasuje podmiana, i z tego
 * samego powodu: wersja robocza po zdjętym kafelku nie służy już niczemu,
 * a miejsce w Supabase jest jedynym zasobem, którego w tym projekcie
 * naprawdę brakuje.
 *
 * Pliku na Dysku ta funkcja **nie rusza** — kolejność jest ważna i pilnuje jej
 * `index.ts`: najpierw kosz na Dysku, dopiero potem baza. Odwrotna kolejność
 * przy padzie Google zostawiłaby gościa z pustym kafelkiem i zdjęciem, które
 * mimo wszystko dalej leży w folderze — czyli z cichym „usunęliśmy",
 * które nie jest prawdą.
 */
export async function dropPhoto(photo: ActivePhoto): Promise<void> {
  const { error } = await db()
    .from("photos")
    .update({ is_active: false })
    .eq("id", photo.id);
  if (error) throw error;

  await removeObjects([photo.previewPath, photo.thumbPath].filter(Boolean));
}
