import { describe, expect, it } from "vitest";
import { mediaFor, sniff } from "./media.js";

/** Szesnaście bajtów nagłówka — tyle czyta `prepare` i tyle ogląda serwer. */
function head(...parts: (number[] | string)[]): Uint8Array {
  const bytes: number[] = [];
  for (const part of parts) {
    if (typeof part === "string") for (const ch of part) bytes.push(ch.charCodeAt(0));
    else bytes.push(...part);
  }
  while (bytes.length < 16) bytes.push(0);
  return new Uint8Array(bytes);
}

/** Kontener ISO-BMFF: cztery bajty rozmiaru, `ftyp`, potem marka. */
const iso = (brand: string) => head([0, 0, 0, 0x20], "ftyp", brand);

describe("rozpoznawanie po pierwszych bajtach", () => {
  it("poznaje zdjęcia, które naprawdę wychodzą z telefonów", () => {
    expect(sniff(head([0xff, 0xd8, 0xff, 0xe0]))).toMatchObject({ kind: "photo", ext: "jpg" });
    expect(sniff(head([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toMatchObject({
      kind: "photo",
      ext: "png",
    });
    expect(sniff(head("GIF89a"))).toMatchObject({ kind: "photo", ext: "gif" });
    expect(sniff(head("RIFF", [0, 0, 0, 0], "WEBP"))).toMatchObject({
      kind: "photo",
      ext: "webp",
    });
  });

  // Zdjęcie z iPhone'a i film z iPhone'a mają identyczny kontener. Różnią się
  // czterema znakami marki — i to jest jedyne miejsce, gdzie się je rozdziela.
  it("rozdziela HEIC od filmu po marce kontenera", () => {
    expect(sniff(iso("heic"))).toMatchObject({ kind: "photo", ext: "heic" });
    expect(sniff(iso("mif1"))).toMatchObject({ kind: "photo", ext: "heif" });
    expect(sniff(iso("qt  "))).toMatchObject({ kind: "video", ext: "mov" });
    expect(sniff(iso("isom"))).toMatchObject({ kind: "video", ext: "mp4" });
    expect(sniff(iso("mp42"))).toMatchObject({ kind: "video", ext: "mp4" });
  });

  it("poznaje WebM po nagłówku EBML", () => {
    expect(sniff(head([0x1a, 0x45, 0xdf, 0xa3]))).toMatchObject({ kind: "video", ext: "webm" });
  });

  // Świadoma decyzja: nieznana marka to wciąż kontener na obraz albo film.
  // Lepiej dać filmowi z nietypowej kamery złe rozszerzenie, niż odrzucić go
  // w sobotę wieczorem przez cztery znaki, których nie przewidzieliśmy.
  it("nieznaną markę kontenera przepuszcza jako film", () => {
    expect(sniff(iso("zzzz"))).toMatchObject({ kind: "video", ext: "mp4" });
  });

  it("odrzuca wszystko, co nie jest zdjęciem ani filmem", () => {
    expect(sniff(head("%PDF-1.7"))).toBeNull();
    expect(sniff(head([0x50, 0x4b, 0x03, 0x04]))).toBeNull(); // ZIP, DOCX, APK
    expect(sniff(head([0x4d, 0x5a]))).toBeNull(); // .exe
    expect(sniff(head("<!DOCTYPE html>"))).toBeNull();
    expect(sniff(head("#!/bin/sh\n"))).toBeNull();
  });

  it("nie zgaduje na pliku krótszym niż nagłówek", () => {
    expect(sniff(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull();
    expect(sniff(new Uint8Array(0))).toBeNull();
  });

  it("bierze i ArrayBuffer, i Uint8Array — serwer ma jedno, telefon drugie", () => {
    const bytes = head([0xff, 0xd8, 0xff, 0xe0]);
    expect(sniff(bytes.buffer as ArrayBuffer)).toEqual(sniff(bytes));
  });
});

describe("rozpoznawanie z nazwy i typu MIME", () => {
  // Nazwa idzie przed typem MIME i tak było od początku: tylko ona odróżnia
  // .heic od .heif, a na Dysku ma leżeć dokładnie to, co wyszło z aparatu.
  it("bierze rozszerzenie z nazwy pliku", () => {
    expect(mediaFor("IMG_0042.HEIC", "image/jpeg")).toMatchObject({ ext: "heic" });
    expect(mediaFor("wakacje.2026.jpg", "")).toMatchObject({ ext: "jpg" });
    expect(mediaFor("IMG_0100.MOV", "")).toMatchObject({ kind: "video", ext: "mov" });
  });

  it("spada na typ MIME, gdy galeria nie poda nazwy", () => {
    expect(mediaFor("", "image/heic")).toMatchObject({ ext: "heic" });
    expect(mediaFor("", "image/png")).toMatchObject({ ext: "png" });
    expect(mediaFor("bez-kropki", "image/webp")).toMatchObject({ ext: "webp" });
    expect(mediaFor("", "video/quicktime")).toMatchObject({ kind: "video", ext: "mov" });
  });

  // TA DZIURA BYŁA OTWARTA: rozszerzenie przepisywało się z nazwy znak w znak,
  // więc `wesele.exe` lądował na Dysku jako `.exe`. Teraz nazwa może dać
  // wyłącznie rozszerzenie z whitelisty, a wszystko inne spada na typ MIME.
  it("nie przepisuje rozszerzenia spoza whitelisty", () => {
    expect(mediaFor("wesele.exe", "")).toBeNull();
    expect(mediaFor("pierwszy-taniec.pdf", "")).toBeNull();
    expect(mediaFor("wesele.exe", "video/mp4")).toMatchObject({ kind: "video", ext: "mp4" });
  });

  it("bez rozpoznania oddaje null, zamiast zgadywać jpg", () => {
    expect(mediaFor("", "application/octet-stream")).toBeNull();
    expect(mediaFor("", "")).toBeNull();
  });
});
