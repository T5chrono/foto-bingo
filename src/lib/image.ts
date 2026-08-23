/**
 * Kompresja zdjęcia do TWARDEGO budżetu bajtowego (decyzja D10).
 *
 * Nie do stałej jakości. Zdjęcia nocne, ziarniste i zatłoczone kompresują się
 * fatalnie — przy stałej jakości potrafią wyjść trzy razy większe niż zdjęcie
 * w dzień. A wesele to głównie zdjęcia nocne. Przy stałej jakości budżet
 * miejsca z sekcji 5 specyfikacji byłby prognozą; tutaj jest gwarancją.
 *
 * Ten sam krok załatwia jeszcze trzy rzeczy naraz:
 *   - HEIC z iPhone'a — Safari dekoduje go kodekiem systemowym, canvas oddaje
 *     WebP albo JPEG, więc reszta aplikacji nigdy nie widzi HEIC-a;
 *   - obrót EXIF — `imageOrientation: "from-image"` prostuje zdjęcie raz,
 *     zamiast zostawiać obrócone miniatury w panelu i na rzutniku;
 *   - limit 4,5 MB na ciało funkcji Vercela.
 */

import { AppError } from "./errors.js";

export type Budget = { maxEdge: number; maxBytes: number };

export type Encoded = {
  blob: Blob;
  width: number;
  height: number;
  ext: "webp" | "jpeg";
};

/** Zjazd jakości. Poniżej 0,5 zdjęcie zaczyna wyglądać na zepsute, więc dalej
 *  schodzimy już rozdzielczością, nie jakością. */
const QUALITIES = [0.82, 0.72, 0.62, 0.5] as const;

/** Kolejne podejścia z mniejszym dłuższym bokiem, gdy sama jakość nie wystarczy. */
const EDGE_SCALES = [1, 0.8, 0.64, 0.5] as const;

/**
 * Skaluje wymiary tak, by dłuższy bok nie przekroczył `maxEdge`.
 * Nigdy nie powiększa — zdjęcie mniejsze niż budżet zostaje jak jest.
 */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge || longest === 0) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const k = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * k)),
    height: Math.max(1, Math.round(height * k)),
  };
}

let webpSupport: boolean | null = null;

/** Sprawdzane raz. Safari umie WebP od 16, ale nie ma po co ufać wersjom —
 *  tańiej zapytać canvas, czy faktycznie coś takiego wyprodukuje. */
export async function supportsWebp(): Promise<boolean> {
  if (webpSupport !== null) return webpSupport;
  try {
    const canvas = makeCanvas(1, 1);
    // Kontekst MUSI powstać przed convertToBlob. OffscreenCanvas bez kontekstu
    // rzuca InvalidStateError, co wyglądało jak "przeglądarka nie umie WebP"
    // i cichcem schodziło całą aplikację na JPEG — czyli ~25% budżetu miejsca
    // wyrzucone przez jedną brakującą linijkę. Zwykły canvas tego nie wymaga,
    // więc błąd nie pokazywał się nigdzie poza realną przeglądarką.
    canvas.getContext("2d");
    const blob = await toBlob(canvas, "image/webp", 0.8);
    webpSupport = blob?.type === "image/webp";
  } catch {
    webpSupport = false;
  }
  return webpSupport;
}

export async function decode(source: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(source, { imageOrientation: "from-image" });
    } catch {
      // Starsze Safari nie zna opcji imageOrientation i rzuca zamiast ją zignorować.
    }
  }
  return await decodeViaElement(source);
}

function decodeViaElement(source: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new AppError("imageRead", "Nie udało się odczytać zdjęcia"));
    };
    img.src = url;
  });
}

/**
 * Zwraca najmniejszy wariant mieszczący się w budżecie. Gdy żaden się nie
 * zmieści — a to musiałoby być zdjęcie patologiczne — oddaje najmniejszy
 * uzyskany. Lepiej przyjąć zdjęcie odrobinę za duże niż odmówić gościowi
 * wysłania pierwszego tańca.
 */
export async function encodeToBudget(
  bitmap: ImageBitmap | HTMLImageElement,
  budget: Budget,
): Promise<Encoded> {
  const srcW = "width" in bitmap ? bitmap.width : 0;
  const srcH = "height" in bitmap ? bitmap.height : 0;
  const type = (await supportsWebp()) ? "image/webp" : "image/jpeg";
  const ext = type === "image/webp" ? "webp" : "jpeg";

  let smallest: Encoded | null = null;

  for (const scale of EDGE_SCALES) {
    const { width, height } = fitWithin(srcW, srcH, Math.round(budget.maxEdge * scale));
    const canvas = makeCanvas(width, height);
    const ctx = canvas.getContext("2d") as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null;
    if (!ctx) throw new Error("Brak kontekstu 2D");
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);

    for (const quality of QUALITIES) {
      const blob = await toBlob(canvas, type, quality);
      if (!blob) continue;
      const candidate: Encoded = { blob, width, height, ext };
      if (!smallest || blob.size < smallest.blob.size) smallest = candidate;
      if (blob.size <= budget.maxBytes) return candidate;
    }
  }

  if (!smallest) throw new AppError("imageEncode", "Nie udało się zakodować zdjęcia");
  return smallest;
}

/** Podgląd i miniatura z jednego dekodowania — dekodowanie 12-megapikselowego
 *  zdjęcia dwa razy na starszym telefonie to sekundy, nie milisekundy. */
export async function prepare(
  file: Blob,
  budgets: { preview: Budget; thumb: Budget },
): Promise<{ preview: Encoded; thumb: Encoded; originalBytes: number }> {
  const bitmap = await decode(file);
  try {
    return {
      preview: await encodeToBudget(bitmap, budgets.preview),
      thumb: await encodeToBudget(bitmap, budgets.thumb),
      originalBytes: file.size,
    };
  } finally {
    if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();
  }
}

function makeCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function toBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  type: string,
  quality: number,
): Promise<Blob | null> {
  if ("convertToBlob" in canvas) {
    return canvas.convertToBlob({ type, quality }).catch(() => null);
  }
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}
