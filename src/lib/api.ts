import { readToken } from "./guest";
import type { Budget } from "./image";

const BASE = import.meta.env.VITE_API_URL ?? "/api";

export type Tile = {
  categoryId: number;
  photoId: string;
  driveStatus: "pending" | "ok" | "failed";
  thumbUrl: string;
};

export type Me = {
  guest: { name: string; slug: string };
  tiles: Tile[];
  budget: { preview: Budget; thumb: Budget };
};

export type SignedUpload = { path: string; token: string };

export type UploadTargets = {
  photoId: string;
  bucket: string;
  preview: SignedUpload;
  thumb: SignedUpload;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }

  /** Kod nieznany serwerowi — ponawianie nic nie da, trzeba zeskanować QR. */
  get isAuth(): boolean {
    return this.status === 401;
  }

  /** Błędy 5xx i sieciowe mają sens do ponowienia; 4xx nie. */
  get isRetryable(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = readToken();
  let response: Response;

  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        // Domyslnie JSON, ale init.headers jest PO tym wpisie i moze go
        // przykryc — kawalki oryginalu leca jako application/octet-stream.
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { "X-Guest-Token": token } : {}),
        ...init?.headers,
      },
    });
  } catch (cause) {
    // Brak sieci wygląda tu identycznie jak awaria serwera — i dobrze,
    // bo w obu przypadkach zadanie ma wrócić do kolejki.
    throw new ApiError(0, cause instanceof Error ? cause.message : "Brak połączenia");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(response.status, body?.error ?? `Błąd ${response.status}`);
  }

  return (await response.json()) as T;
}

export type OriginalStart = {
  done: boolean;
  offset?: number;
  chunkSize: number;
  name?: string;
};

export const api = {
  me: () => request<Me>("/me"),

  uploadTargets: (body: { photoId: string; categoryId: number; ext: string }) =>
    request<UploadTargets>("/photos/upload-url", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  finalize: (body: {
    photoId: string;
    categoryId: number;
    ext: string;
    bytes: number;
    width: number;
    height: number;
    originalBytes: number;
  }) =>
    request<{ photoId: string; replaced: boolean; alreadyExisted: boolean }>(
      "/photos/finalize",
      { method: "POST", body: JSON.stringify(body) },
    ),

  originalStart: (body: {
    photoId: string;
    size: number;
    mime: string;
    filename: string | null;
  }) =>
    request<OriginalStart>("/photos/original/start", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** Cialo jest surowe, nie JSON — base64 dokladaloby 33% do kazdego bajtu. */
  originalChunk: (
    args: { photoId: string; offset: number; total: number },
    chunk: ArrayBuffer,
  ) =>
    request<{ done: boolean; offset?: number; fileId?: string; name?: string }>(
      `/photos/original/chunk?photoId=${args.photoId}&offset=${args.offset}&total=${args.total}`,
      {
        method: "POST",
        body: chunk,
        headers: { "Content-Type": "application/octet-stream" },
      },
    ),
};
