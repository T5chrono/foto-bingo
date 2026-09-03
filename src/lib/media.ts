/**
 * Co wolno wysłać na kafelek — zdjęcia i filmy, nic poza tym.
 *
 * Ten plik jest WSPÓLNY dla frontu i backendu (`api/_lib/` importuje stąd, tak
 * samo jak `slug.ts`). To celowe: telefon i serwer muszą odpowiadać na pytanie
 * „czy to jest zdjęcie albo film?" identycznie, bo inaczej powstaje klasa
 * błędów, w której gość widzi zielony kafelek, a serwer odrzuca oryginał —
 * czyli zdjęcie policzone do bingo, którego Para Młoda nigdy nie dostanie.
 *
 * Rozpoznajemy po PIERWSZYCH BAJTACH, nie po nazwie i nie po typie MIME.
 * Jedno i drugie podaje przeglądarka na podstawie rozszerzenia, więc jedno
 * i drugie kłamie dokładnie wtedy, kiedy nam na prawdzie zależy: przy pliku
 * przemianowanym z `.exe` na `.jpg`. Nagłówek pliku pochodzi z aparatu i nie
 * da się go podmienić, nie psując pliku.
 *
 * Czego to NIE załatwia: pliku, który naprawdę zaczyna się jak zdjęcie, a ma
 * coś doklejone na końcu. Żeby to zamknąć, trzeba by przekodować oryginał,
 * czyli przestać archiwizować to, co gość faktycznie nagrał — a po to ten
 * oryginał w ogóle jedzie na Dysk. Przy 48 gościach z kodem z winietki w ręku
 * to jest właściwy kurs wymiany.
 */

export type MediaKind = "photo" | "video";

export type Media = {
  kind: MediaKind;
  /** Typ MIME, który wpisujemy Google — rozpoznany, nie ten podany przez telefon. */
  mime: string;
  /** Rozszerzenie pliku w folderze na Dysku. */
  ext: string;
};

/** Tyle bajtów z początku pliku wystarczy każdemu podpisowi poniżej.
 *  Czytamy dokładnie tyle — `slice` nie rusza reszty pliku, więc rozpoznanie
 *  200-megabajtowego filmu kosztuje tyle samo, co rozpoznanie miniatury. */
export const HEAD_BYTES = 16;

const JPEG: Media = { kind: "photo", mime: "image/jpeg", ext: "jpg" };
const PNG: Media = { kind: "photo", mime: "image/png", ext: "png" };
const GIF: Media = { kind: "photo", mime: "image/gif", ext: "gif" };
const WEBP: Media = { kind: "photo", mime: "image/webp", ext: "webp" };
const HEIC: Media = { kind: "photo", mime: "image/heic", ext: "heic" };
const HEIF: Media = { kind: "photo", mime: "image/heif", ext: "heif" };
const AVIF: Media = { kind: "photo", mime: "image/avif", ext: "avif" };
const MP4: Media = { kind: "video", mime: "video/mp4", ext: "mp4" };
const MOV: Media = { kind: "video", mime: "video/quicktime", ext: "mov" };
const M4V: Media = { kind: "video", mime: "video/x-m4v", ext: "m4v" };
const WEBM: Media = { kind: "video", mime: "video/webm", ext: "webm" };
const THREEGP: Media = { kind: "video", mime: "video/3gpp", ext: "3gp" };

/**
 * Marki kontenera ISO-BMFF — czyli tego, w czym iPhone oddaje i zdjęcia,
 * i filmy. Cztery znaki spod ósmego bajtu mówią, czy w środku jest HEIC,
 * czy film z wesela; sam kontener wygląda tak samo.
 */
const ISO_BRANDS: Record<string, Media> = {
  heic: HEIC,
  heix: HEIC,
  heim: HEIC,
  heis: HEIC,
  hevc: HEIC,
  hevx: HEIC,
  hevm: HEIC,
  hevs: HEIC,
  mif1: HEIF,
  msf1: HEIF,
  avif: AVIF,
  avis: AVIF,
  qt: MOV,
  m4v: M4V,
  m4a: M4V,
  isom: MP4,
  iso2: MP4,
  iso4: MP4,
  iso5: MP4,
  iso6: MP4,
  mp41: MP4,
  mp42: MP4,
  avc1: MP4,
  mmp4: MP4,
  dash: MP4,
  "3gp4": THREEGP,
  "3gp5": THREEGP,
  "3gp6": THREEGP,
  "3g2a": THREEGP,
};

/** Rozszerzenia, które wolno postawić na Dysku — odwrotność `ISO_BRANDS`
 *  i podpisów niżej, do rozpoznawania po nazwie pliku. */
const BY_EXTENSION: Record<string, Media> = {
  jpg: JPEG,
  jpeg: JPEG,
  jpe: JPEG,
  png: PNG,
  gif: GIF,
  webp: WEBP,
  heic: HEIC,
  heif: HEIF,
  avif: AVIF,
  mp4: MP4,
  m4v: M4V,
  mov: MOV,
  qt: MOV,
  webm: WEBM,
  mkv: WEBM,
  "3gp": THREEGP,
  "3gpp": THREEGP,
};

const BY_MIME: Record<string, Media> = {
  "image/jpeg": JPEG,
  "image/jpg": JPEG,
  "image/png": PNG,
  "image/gif": GIF,
  "image/webp": WEBP,
  "image/heic": HEIC,
  "image/heic-sequence": HEIC,
  "image/heif": HEIF,
  "image/heif-sequence": HEIF,
  "image/avif": AVIF,
  "video/mp4": MP4,
  "video/x-m4v": M4V,
  "video/quicktime": MOV,
  "video/webm": WEBM,
  "video/x-matroska": WEBM,
  "video/3gpp": THREEGP,
};

/**
 * Rozpoznanie po pierwszych bajtach. `null` = nie jest ani zdjęciem,
 * ani filmem, czyli nie wchodzi.
 */
export function sniff(head: ArrayBuffer | Uint8Array): Media | null {
  const b = head instanceof Uint8Array ? head : new Uint8Array(head);
  if (b.length < 12) return null;

  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return JPEG;
  if (matches(b, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return PNG;
  if (ascii(b, 0, 4) === "GIF8") return GIF;
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return WEBP;
  // Matroska i WebM mają wspólny nagłówek EBML; rozróżnia je dopiero DocType
  // kilkadziesiąt bajtów dalej. Dla nas to ta sama rzecz — film do wgrania.
  if (matches(b, 0, [0x1a, 0x45, 0xdf, 0xa3])) return WEBM;

  if (ascii(b, 4, 4) === "ftyp") {
    const brand = ascii(b, 8, 4).trim().toLowerCase();
    // Nieznana marka to wciąż kontener ISO-BMFF, czyli z definicji zdjęcie
    // albo film — nikt nie zapisze w nim arkusza kalkulacyjnego. Wolę oddać
    // filmowi z nietypowej kamery złe rozszerzenie, niż odrzucić go w sobotę
    // o dwudziestej trzeciej, bo nie przewidziałem czterech znaków.
    return ISO_BRANDS[brand] ?? MP4;
  }

  return null;
}

/**
 * Rozpoznanie z tego, co podał telefon — nazwa pliku, potem typ MIME.
 * Używane tam, gdzie bajtów jeszcze nie widzieliśmy: przy otwieraniu sesji
 * na Dysku nazwa pliku musi już istnieć, a pierwszy kawałek dopiero jedzie.
 *
 * Nazwa idzie przed typem MIME i tak było od początku — tylko ona odróżnia
 * `.heic` od `.heif`, a na Dysku ma leżeć dokładnie to, co wyszło z aparatu.
 * Różnica jest w tym, że teraz nazwa może dać wyłącznie rozszerzenie z listy
 * wyżej. Wcześniej przepisywaliśmy ją znak w znak, więc `wesele.exe` jechał
 * na Dysk jako `.exe` i to była cała „walidacja".
 */
export function mediaFor(filename: string, mime: string): Media | null {
  const ext = /\.([a-z0-9]{1,5})$/i.exec(filename)?.[1]?.toLowerCase();
  if (ext && BY_EXTENSION[ext]) return BY_EXTENSION[ext];
  return BY_MIME[mime.trim().toLowerCase()] ?? null;
}

function matches(bytes: Uint8Array, at: number, signature: number[]): boolean {
  if (bytes.length < at + signature.length) return false;
  return signature.every((byte, i) => bytes[at + i] === byte);
}

function ascii(bytes: Uint8Array, at: number, length: number): string {
  let out = "";
  for (let i = at; i < at + length && i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]!);
  }
  return out;
}
