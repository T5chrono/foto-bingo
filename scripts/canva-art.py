"""
Wycina akwarele z projektu weselnego w Canvie i zapisuje je jako WebP dla aplikacji.

DLACZEGO PDF, A NIE EKSPORT PNG. Eksport strony do PNG daje 1x (454 px szerokosci)
i wypala biale tlo pod kwiatami. Eksport do PDF **osadza oryginalne bitmapy** razem
z ich maskami przezroczystosci (`smask`), wiec stad wychodzi laka z prawdziwa alfa,
a nie z bialym prostokatem. Parametry `width` i `export_quality: pro` w Canva API
wymagaja Canva Pro i zwracaja mylace "Not allowed to access design" — PDF nie
wymaga niczego.

DLACZEGO ODEJMUJEMY BIEL. Winietka jest w PDF-ie jedna nieprzezroczysta bitmapa
na bialym papierze. Akwarela jest medium mnozacym: biel to nie farba, tylko goly
papier. Zamiana bieli na przezroczystosc oddaje wiec obrazek taki, jaki naprawde
jest, i pozwala mu lezec na kremowym tle aplikacji zamiast wnosic ze soba bialy
kafel. Po zlozeniu z powrotem na bialym wychodzi piksel w piksel oryginal.

DLACZEGO NIE POWIEKSZAMY. Bitmapy maja 560-800 px szerokosci, a pas laki zajmuje
najwyzej ~470 px CSS. Powiekszenie nie dokłada ani jednego szczegolu, ktorego
w zrodle nie ma — dokłada wylacznie kilobajty, a te ida do precache'u service
workera, czyli do pobrania przez 40 osob na weselu w gorach.

URUCHOMIENIE (nie jest czescia builda — assety leza w repo, to sie robi raz):

    # 1. wyeksportuj projekt do PDF (Canva MCP: export-design, format pdf,
    #    strony 1 i 11 — bez `width` i bez `export_quality`, patrz wyzej)
    # 2. uv, bo pymupdf nie jest zaleznoscia tego projektu.
    #    --native-tls jest konieczne: Norton podmienia certyfikat pypi.org.
    uv run --native-tls --with pymupdf --with pillow --with numpy \
        python scripts/canva-art.py sciezka/do/eksportu.pdf
"""

import io
import sys
from pathlib import Path

import numpy as np
import pymupdf
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "src" / "assets" / "art"

# Alfa kosztuje w WebP wiecej niz kolor: na tej samej grafice a60 wazy polowe
# tego, co a80, a roznicy nie widac na telefonie z pasem kwiatow wysokim na 2 cm.
QUALITY, ALPHA_QUALITY = 70, 60

# Rozmiary bitmap w PDF-ie. Szukamy po nich, a nie po numerze strony ani xref:
# jedno i drugie zmienia sie przy kazdym ponownym eksporcie i przy innym wyborze
# stron, rozmiar bitmapy nie.
MEADOW = (560, 206)  # laka polnych kwiatow spod zaproszenia, wlasna maska alfa
CARD = (800, 568)  # winietka w calosci: kwiatowy luk u gory, dolina u dolu


def unmultiply_white(img: Image.Image) -> Image.Image:
    """Zamienia biel na przezroczystosc, zachowujac kolor akwareli.

    `alpha = 1 - min(r,g,b)` mowi, ile pigmentu jest w pikselu. Potem dzielimy
    kolor przez alfe (odwrotnosc premultiply), zeby po zlozeniu z powrotem na
    biel wyszlo dokladnie to samo, a na kremowym — akwarela na kremowym papierze.
    """
    rgb = np.asarray(img.convert("RGB")).astype(np.float32) / 255.0
    alpha = 1.0 - rgb.min(axis=2)
    safe = np.maximum(alpha, 1e-4)[..., None]
    unmul = np.clip((rgb - (1.0 - safe)) / safe, 0.0, 1.0)
    out = np.dstack([unmul, alpha[..., None]])
    return Image.fromarray((out * 255).round().astype(np.uint8), "RGBA")


def embedded(doc: pymupdf.Document, size: tuple[int, int]) -> Image.Image:
    """Bitmapa o zadanym rozmiarze, gdziekolwiek w dokumencie, razem z maska.

    Brak trafienia jest bledem, a nie cichym pominieciem — inaczej skrypt
    zostawilby stare assety i nikt by nie zauwazyl, ze nic sie nie odswiezylo.
    """
    for page in doc:
        for info in page.get_images(full=True):
            img = doc.extract_image(info[0])
            if (img["width"], img["height"]) != size:
                continue

            picture = Image.open(io.BytesIO(img["image"])).convert("RGB")
            if smask := info[1]:
                mask = doc.extract_image(smask)
                alpha = Image.open(io.BytesIO(mask["image"])).convert("L")
                if alpha.size != picture.size:
                    alpha = alpha.resize(picture.size, Image.LANCZOS)
                picture.putalpha(alpha)
            return picture

    raise SystemExit(f"Brak bitmapy {size[0]}x{size[1]} w PDF-ie — czy to ten eksport?")


def save(img: Image.Image, name: str, width: int | None = None) -> None:
    if width and width != img.width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    path = OUT / f"{name}.webp"
    img.save(path, "WEBP", quality=QUALITY, alpha_quality=ALPHA_QUALITY, method=6)
    print(f"  {path.name:12} {img.width}x{img.height}  {path.stat().st_size / 1024:5.1f} KB")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("uzycie: canva-art.py <eksport.pdf>")

    OUT.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(sys.argv[1])

    # Laka ma juz wlasna maske — bieli nie ma po co odejmowac.
    save(embedded(doc, MEADOW), "meadow")

    # Winietka to jedna bitmapa. Tniemy na y=310, tam gdzie zaczyna sie zielen
    # doliny, z kilkoma pikselami zapasu, zeby mgla nad rzeka nie zostala obcieta.
    card = embedded(doc, CARD)
    save(unmultiply_white(card.crop((0, 0, CARD[0], 320))), "bloom", width=560)
    save(unmultiply_white(card.crop((0, 310, CARD[0], CARD[1]))), "valley")


if __name__ == "__main__":
    main()
