import { describe, expect, it } from "vitest";
import { driveFileName, slugify } from "./slug.js";

describe("slugify", () => {
  it("usuwa wszystkie polskie diakrytyki", () => {
    expect(slugify("ąćęłńóśźż ĄĆĘŁŃÓŚŹŻ")).toBe("acelnoszz-acelnoszz");
  });

  // Ł nie rozkłada się przez NFD — to osobny znak Unicode, nie L z ogonkiem.
  // Bez jawnej obsługi wypadałoby całkiem i "pierwszy" stałby się "pierwszy",
  // ale "Ktoś owinięty kocem" -> "ktos-owiniety-kocem" straciłoby litery.
  it("obsługuje Ł, którego NFD nie rozkłada", () => {
    expect(slugify("Łódź")).toBe("lodz");
    expect(slugify("Ktoś owinięty kocem")).toBe("ktos-owiniety-kocem");
  });

  it("zbija interpunkcję i spacje do pojedynczych myślników", () => {
    expect(slugify("Ktoś, kto zasnął")).toBe("ktos-kto-zasnal");
    expect(slugify("  a  --  b  ")).toBe("a-b");
  });

  it("nie zostawia myślnika na końcu po obcięciu do 60 znaków", () => {
    const s = slugify("a".repeat(58) + " bardzo dluga koncowka");
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith("-")).toBe(false);
  });

  it("nie wywraca się na pustym wejściu", () => {
    expect(slugify("")).toBe("");
    expect(slugify("!!!")).toBe("");
  });
});

describe("driveFileName", () => {
  it("buduje nazwę zgodną ze wzorem z sekcji 9 specyfikacji", () => {
    expect(
      driveFileName({
        row: 1,
        col: 3,
        categorySlug: "ognisko-z-iskrami",
        guestSlug: "anna-kowalska",
        takenAt: new Date(2026, 7, 15, 20, 12, 33),
        extension: "HEIC",
      }),
    ).toBe("R1K3_ognisko-z-iskrami__anna-kowalska__20260815-201233.heic");
  });

  it("znosi rozszerzenie podane z kropką", () => {
    const name = driveFileName({
      row: 5,
      col: 5,
      categorySlug: "x",
      guestSlug: "y",
      takenAt: new Date(2026, 0, 2, 3, 4, 5),
      extension: ".JPG",
    });
    expect(name).toBe("R5K5_x__y__20260102-030405.jpg");
  });
});
