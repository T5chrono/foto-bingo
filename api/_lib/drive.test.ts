import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHUNK_SIZE,
  __setToken,
  extensionFor,
  putChunk,
  sessionOffset,
  trashFile,
} from "./drive.js";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

/** Podstawia jedną odpowiedź i oddaje argumenty, z jakimi wołano fetch. */
function stubFetch(response: Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = vi.fn(async (url: unknown, init: unknown) => {
    calls.push({ url: String(url), init: (init ?? {}) as RequestInit });
    return response;
  }) as unknown as typeof fetch;
  return calls;
}

const bytes = (n: number) => new Uint8Array(n).buffer;

describe("rozmiar kawałka", () => {
  // Dwa warunki naraz: limit ciała funkcji Vercela (4,5 MB) i wymóg Google,
  // żeby każdy kawałek poza ostatnim był wielokrotnością 256 KB.
  it("mieści się pod limitem Vercela i jest wielokrotnością 256 KB", () => {
    expect(CHUNK_SIZE).toBeLessThan(4.5 * 1024 * 1024);
    expect(CHUNK_SIZE % (256 * 1024)).toBe(0);
  });
});

describe("wysyłka kawałka", () => {
  it("buduje Content-Range zgodnie z tym, czego oczekuje Google", async () => {
    const calls = stubFetch(new Response(null, { status: 308, headers: { range: "bytes=0-3145727" } }));
    await putChunk({ sessionUri: "https://x", bytes: bytes(CHUNK_SIZE), offset: 0, total: 10_000_000 });
    expect((calls[0]?.init.headers as Record<string, string>)["Content-Range"]).toBe(
      "bytes 0-3145727/10000000",
    );
  });

  it("czyta następne przesunięcie z nagłówka Range", async () => {
    stubFetch(new Response(null, { status: 308, headers: { range: "bytes=0-3145727" } }));
    const r = await putChunk({ sessionUri: "https://x", bytes: bytes(10), offset: 0, total: 999 });
    expect(r).toEqual({ done: false, offset: 3145728 });
  });

  // Google pomija Range, gdy nie przyjął jeszcze ani bajtu. Potraktowanie
  // tego jako NaN cofnęłoby wysyłkę w nieskończoną pętlę.
  it("bez nagłówka Range zaczyna od zera", async () => {
    stubFetch(new Response(null, { status: 308 }));
    const r = await putChunk({ sessionUri: "https://x", bytes: bytes(10), offset: 0, total: 999 });
    expect(r).toEqual({ done: false, offset: 0 });
  });

  it("na 200 oddaje identyfikator gotowego pliku", async () => {
    stubFetch(
      new Response(JSON.stringify({ id: "abc123", name: "R1K1_x__y__20260815-120000.heic" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const r = await putChunk({ sessionUri: "https://x", bytes: bytes(10), offset: 0, total: 10 });
    expect(r).toEqual({
      done: true,
      fileId: "abc123",
      fileName: "R1K1_x__y__20260815-120000.heic",
    });
  });

  it("nie połyka błędu — 500 od Google ma dojść do kolejki", async () => {
    stubFetch(new Response("cos padlo", { status: 500 }));
    await expect(
      putChunk({ sessionUri: "https://x", bytes: bytes(10), offset: 0, total: 10 }),
    ).rejects.toThrow(/500/);
  });

  it("nie dokłada nagłówka Authorization — adres sesji sam jest przepustką", async () => {
    const calls = stubFetch(new Response(null, { status: 308 }));
    await putChunk({ sessionUri: "https://x", bytes: bytes(10), offset: 0, total: 99 });
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(Object.keys(headers).map((k) => k.toLowerCase())).not.toContain("authorization");
  });
});

describe("pytanie o postęp przy wznowieniu", () => {
  it("pyta zakresem otwartym, bez wysyłania bajtów", async () => {
    const calls = stubFetch(new Response(null, { status: 308, headers: { range: "bytes=0-524287" } }));
    await sessionOffset("https://x", 1_000_000);
    const init = calls[0]?.init;
    expect((init?.headers as Record<string, string>)["Content-Range"]).toBe("bytes */1000000");
    expect(init?.body).toBeUndefined();
  });

  it("zwraca liczbę bajtów, które Google już ma", async () => {
    stubFetch(new Response(null, { status: 308, headers: { range: "bytes=0-524287" } }));
    expect(await sessionOffset("https://x", 1_000_000)).toBe(524288);
  });

  it("na 200 uznaje plik za kompletny", async () => {
    stubFetch(new Response("{}", { status: 200 }));
    expect(await sessionOffset("https://x", 777)).toBe(777);
  });

  it("bez nagłówka Range zaczyna od zera", async () => {
    stubFetch(new Response(null, { status: 308 }));
    expect(await sessionOffset("https://x", 777)).toBe(0);
  });
});

describe("rozszerzenie oryginału", () => {
  // Na Dysku ma lezec dokladnie to, co wyszlo z aparatu — .heic z iPhone'a
  // zostaje .heic, bo tylko nazwa odroznia je od .heif.
  it("bierze rozszerzenie z nazwy pliku", () => {
    expect(extensionFor("IMG_0042.HEIC", "image/jpeg")).toBe("heic");
    expect(extensionFor("wakacje.2026.jpg", "")).toBe("jpg");
  });

  it("spada na typ MIME, gdy galeria nie poda nazwy", () => {
    expect(extensionFor("", "image/heic")).toBe("heic");
    expect(extensionFor("", "image/png")).toBe("png");
    expect(extensionFor("bez-kropki", "image/webp")).toBe("webp");
  });

  it("przy zupełnie nieznanym wejściu daje jpg zamiast pliku bez rozszerzenia", () => {
    expect(extensionFor("", "application/octet-stream")).toBe("jpg");
    expect(extensionFor("", "")).toBe("jpg");
  });
});

describe("kosz na Dysku", () => {
  // Zdjęcie zdjęte z kafelka ma wyjść z folderu gościa, ale nie z Dysku
  // do zera: `trashed` daje Parze Młodej 30 dni na odkręcenie cudzej pomyłki.
  // Gdyby kiedyś zamieniło się to na DELETE, ten test ma o tym powiedzieć.
  it("prosi o kosz, a nie o skasowanie pliku", async () => {
    __setToken("token-testowy");
    const calls = stubFetch(new Response("{}", { status: 200 }));

    await trashFile("plik-1");

    expect(calls[0]?.url).toContain("/files/plik-1");
    expect(calls[0]?.init.method).toBe("PATCH");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ trashed: true });
    __setToken(null);
  });

  it("na 404 nie robi afery — pliku i tak już nie ma", async () => {
    __setToken("token-testowy");
    stubFetch(new Response("brak", { status: 404 }));

    await expect(trashFile("plik-2")).resolves.toBeUndefined();
    __setToken(null);
  });

  // Od tego rzutu zależy, czy trasa kasująca zatrzyma się przed bazą. Połknięty
  // błąd znaczyłby pusty kafelek nad zdjęciem, które dalej leży w folderze.
  it("nie połyka odmowy Google", async () => {
    __setToken("token-testowy");
    stubFetch(new Response("nie dzisiaj", { status: 500 }));

    await expect(trashFile("plik-3")).rejects.toThrow();
    __setToken(null);
  });
});
