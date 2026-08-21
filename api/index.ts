import { Hono } from "hono";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { handle } from "hono/vercel";

import { guestByToken } from "./_lib/auth.ts";
import { BUDGET, config } from "./_lib/config.ts";
import { db, type Guest } from "./_lib/db.ts";
import { boardState, finalizePhoto } from "./_lib/photos.ts";
import { createDownloadUrl, createUploadUrl, storagePath, usedBytes } from "./_lib/storage.ts";
import {
  CHUNK_SIZE,
  ensureGuestFolder,
  markSuperseded,
  putChunk,
  sessionOffset,
  startResumable,
  extensionFor,
} from "./_lib/drive.ts";
import { categoryById } from "../src/lib/board.ts";
import { driveFileName } from "../src/lib/slug.ts";

type Vars = { guest: Guest };

// vercel.json przepisuje /api/(.*) na tę funkcję, więc ścieżki przychodzą
// z przedrostkiem /api — basePath sprawia, że trasy poniżej pisze się bez niego.
export const app = new Hono<{ Variables: Vars }>().basePath("/api");

// CORS wyłącznie w dev, gdzie front stoi na :5173, a backend na :8787.
// W produkcji wszystko jest pod jednym adresem i CORS-u nie ma po co włączać.
app.use("*", async (c, next) => {
  if (!config.isDev) return next();
  return cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    allowHeaders: ["Content-Type", "X-Guest-Token"],
  })(c, next);
});

/** Wszystkie trasy gościa wymagają nagłówka z kodem z QR. */
const requireGuest = createMiddleware<{ Variables: Vars }>(async (c, next) => {
  const guest = await guestByToken(c.req.header("X-Guest-Token") ?? null);
  if (!guest) return c.json({ error: "Nieznany kod gościa" }, 401);
  c.set("guest", guest);
  await next();
});

app.get("/health", (c) => c.json({ ok: true }));

/**
 * Stan planszy gościa plus podpisane linki do miniatur.
 *
 * Linki lecą razem z planszą, a nie osobnym żądaniem: przy 25 kafelkach
 * osobne zapytanie na każdy oznaczałoby 25 round-tripów przez górski maszt,
 * żeby narysować jeden ekran.
 */
app.get("/me", requireGuest, async (c) => {
  const guest = c.get("guest");
  const tiles = await boardState(guest.id);

  const withUrls = await Promise.all(
    tiles.map(async (tile) => ({
      categoryId: tile.categoryId,
      photoId: tile.photoId,
      driveStatus: tile.driveStatus,
      thumbUrl: await createDownloadUrl(tile.thumbPath, 3600),
    })),
  );

  return c.json({
    guest: { name: guest.name, slug: guest.slug },
    tiles: withUrls,
    budget: await currentBudget(),
  });
});

/**
 * Podpisy do wgrania podglądu i miniatury.
 *
 * photoId przychodzi z telefonu, nie jest tu losowany. Dzięki temu ponowienie
 * z kolejki trafia w te same ścieżki zamiast zostawiać w bucketcie sierotę
 * po nieudanej próbie.
 */
app.post("/photos/upload-url", requireGuest, async (c) => {
  const guest = c.get("guest");
  const body = await c.req.json().catch(() => null);

  const photoId = String(body?.photoId ?? "");
  const categoryId = Number(body?.categoryId);
  const ext = String(body?.ext ?? "webp").replace(/[^a-z0-9]/gi, "").toLowerCase();

  if (!isUuid(photoId)) return c.json({ error: "Brak poprawnego photoId" }, 400);
  if (!Number.isInteger(categoryId) || categoryId < 1 || categoryId > 25) {
    return c.json({ error: "categoryId musi być z zakresu 1..25" }, 400);
  }
  if (!["webp", "jpeg", "jpg"].includes(ext)) {
    return c.json({ error: "Nieobsługiwany format" }, 400);
  }

  const previewPath = storagePath({ guestId: guest.id, categoryId, photoId, kind: "p", ext });
  const thumbPath = storagePath({ guestId: guest.id, categoryId, photoId, kind: "t", ext });

  return c.json({
    photoId,
    // Nazwa bucketa leci z serwera zamiast siedzieć w zmiennej frontu —
    // jedno miejsce prawdy zamiast dwóch, które muszą się zgadzać.
    bucket: config.bucket,
    preview: await createUploadUrl(previewPath),
    thumb: await createUploadUrl(thumbPath),
  });
});

/**
 * Potwierdzenie, że pliki są w bucketcie. Od odpowiedzi 200 zdjęcie jest
 * bezpieczne — dopiero teraz kolejka w telefonie może o nim zapomnieć.
 */
app.post("/photos/finalize", requireGuest, async (c) => {
  const guest = c.get("guest");
  const body = await c.req.json().catch(() => null);

  const photoId = String(body?.photoId ?? "");
  const categoryId = Number(body?.categoryId);
  const bytes = Number(body?.bytes);

  if (!isUuid(photoId)) return c.json({ error: "Brak poprawnego photoId" }, 400);
  if (!Number.isInteger(categoryId) || categoryId < 1 || categoryId > 25) {
    return c.json({ error: "categoryId musi być z zakresu 1..25" }, 400);
  }
  if (!Number.isFinite(bytes) || bytes < 0) {
    return c.json({ error: "Brak rozmiaru" }, 400);
  }

  const ext = String(body?.ext ?? "webp").replace(/[^a-z0-9]/gi, "").toLowerCase();

  const result = await finalizePhoto({
    guestId: guest.id,
    photoId,
    categoryId,
    previewPath: storagePath({ guestId: guest.id, categoryId, photoId, kind: "p", ext }),
    thumbPath: storagePath({ guestId: guest.id, categoryId, photoId, kind: "t", ext }),
    bytes: Math.round(bytes),
    width: toIntOrNull(body?.width),
    height: toIntOrNull(body?.height),
    originalBytes: toIntOrNull(body?.originalBytes),
  });

  return c.json(result);
});

/**
 * Otwiera sesje resumable dla oryginalu albo mowi, ile Google juz ma.
 *
 * Wolane rowniez przy wznowieniu: telefon ubity w srodku wysylki nie wie,
 * gdzie skonczyl, wiec pyta serwer, a ten pyta Google.
 */
app.post("/photos/original/start", requireGuest, async (c) => {
  const guest = c.get("guest");
  const body = await c.req.json().catch(() => null);

  const photoId = String(body?.photoId ?? "");
  const size = Number(body?.size);
  if (!isUuid(photoId)) return c.json({ error: "Brak poprawnego photoId" }, 400);
  if (!Number.isInteger(size) || size <= 0) return c.json({ error: "Brak rozmiaru" }, 400);

  const photo = await ownPhoto(photoId, guest.id);
  if (!photo) return c.json({ error: "Nie ma takiego zdjecia" }, 404);
  if (photo.drive_status === "ok") return c.json({ done: true, chunkSize: CHUNK_SIZE });

  if (photo.drive_session_uri) {
    const offset = await sessionOffset(photo.drive_session_uri, size);
    return c.json({ done: false, offset, chunkSize: CHUNK_SIZE });
  }

  const category = categoryById(photo.category_id);
  if (!category) return c.json({ error: "Nieznana kategoria" }, 400);

  const folderId = await ensureGuestFolder(guest);
  const name = driveFileName({
    row: category.row,
    col: category.col,
    categorySlug: category.slug,
    guestSlug: guest.slug,
    takenAt: new Date(photo.created_at),
    extension: extensionFor(String(body?.filename ?? ""), String(body?.mime ?? "")),
  });

  const sessionUri = await startResumable({
    name,
    parentId: folderId,
    mimeType: String(body?.mime ?? "application/octet-stream"),
    size,
    description: category.label,
    appProperties: {
      categoryId: String(category.id),
      guestId: guest.id,
      photoId: photo.id,
    },
  });

  await db()
    .from("photos")
    .update({ drive_session_uri: sessionUri, drive_file_name: name, drive_uploaded_bytes: 0 })
    .eq("id", photo.id);

  return c.json({ done: false, offset: 0, chunkSize: CHUNK_SIZE, name });
});

/**
 * Przekazuje jeden kawalek do Google. Cialo jest surowe, nie JSON —
 * base64 doklada 33% do kazdego bajtu, a limit Vercela to 4,5 MB.
 */
app.post("/photos/original/chunk", requireGuest, async (c) => {
  const guest = c.get("guest");
  const photoId = c.req.query("photoId") ?? "";
  const offset = Number(c.req.query("offset"));
  const total = Number(c.req.query("total"));

  if (!isUuid(photoId)) return c.json({ error: "Brak poprawnego photoId" }, 400);
  if (!Number.isInteger(offset) || offset < 0) return c.json({ error: "Zle przesuniecie" }, 400);
  if (!Number.isInteger(total) || total <= 0) return c.json({ error: "Zly rozmiar" }, 400);

  const photo = await ownPhoto(photoId, guest.id);
  if (!photo) return c.json({ error: "Nie ma takiego zdjecia" }, 404);
  if (photo.drive_status === "ok") return c.json({ done: true });
  if (!photo.drive_session_uri) return c.json({ error: "Sesja nie zostala otwarta" }, 409);

  const bytes = await c.req.arrayBuffer();
  if (bytes.byteLength === 0) return c.json({ error: "Pusty kawalek" }, 400);

  const result = await putChunk({
    sessionUri: photo.drive_session_uri,
    bytes,
    offset,
    total,
  });

  if (!result.done) {
    await db()
      .from("photos")
      .update({ drive_uploaded_bytes: result.offset })
      .eq("id", photo.id);
    return c.json({ done: false, offset: result.offset });
  }

  await db()
    .from("photos")
    .update({
      drive_file_id: result.fileId,
      drive_file_name: result.fileName,
      drive_status: "ok",
      drive_error: null,
      drive_uploaded_bytes: total,
      drive_session_uri: null,
    })
    .eq("id", photo.id);

  // Podmienione zdjecie tego kafelka dostaje przyrostek dopiero teraz — gdy
  // nastepca naprawde lezy na Dysku. Wczesniej zostawaloby oznaczenie
  // "zastapione" przy pliku, ktorego nastepca nigdy nie dojechal.
  await renameSuperseded(guest.id, photo.category_id, photo.id);

  return c.json({ done: true, fileId: result.fileId, name: result.fileName });
});

app.onError((err, c) => {
  const status = (err as { status?: number }).status;
  if (status === 403) return c.json({ error: err.message }, 403);
  console.error("Nieobsłużony błąd:", err);
  return c.json({ error: "Błąd serwera" }, 500);
});

/**
 * Budżet kompresji schodzi w dół, gdy bucket się zapełnia. Zjazd jakości jest
 * lepszy od odmowy przyjęcia zdjęcia — po weselu nie da się poprosić gościa
 * o powtórkę pierwszego tańca.
 */
async function currentBudget() {
  const used = await usedBytes().catch(() => 0);
  const preview = used > BUDGET.degradeAboveBytes ? BUDGET.degradedPreview : BUDGET.preview;
  return { preview, thumb: BUDGET.thumb };
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

async function ownPhoto(photoId: string, guestId: string) {
  const { data, error } = await db()
    .from("photos")
    .select("id, guest_id, category_id, created_at, drive_status, drive_session_uri")
    .eq("id", photoId)
    .eq("guest_id", guestId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Poprzednie zdjecia tego kafelka, ktore doszly na Dysk, dostaja przyrostek. */
async function renameSuperseded(guestId: string, categoryId: number, keepPhotoId: string) {
  const { data } = await db()
    .from("photos")
    .select("drive_file_id, drive_file_name")
    .eq("guest_id", guestId)
    .eq("category_id", categoryId)
    .eq("is_active", false)
    .eq("drive_status", "ok")
    .neq("id", keepPhotoId);

  for (const row of data ?? []) {
    if (row.drive_file_id && row.drive_file_name) {
      await markSuperseded(row.drive_file_id as string, row.drive_file_name as string).catch(
        // Przyrostek to kosmetyka archiwum, nie moze wywrocic wysylki zdjecia,
        // ktore wlasnie sie udala.
        (err) => console.error("Nie udalo sie oznaczyc zastapionego pliku:", err),
      );
    }
  }
}

function toIntOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export default handle(app);
