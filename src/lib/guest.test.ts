import { describe, expect, it } from "vitest";
import { normalize, tokenFromLocation } from "./guest.js";

describe("kod gościa z adresu", () => {
  it("czyta kod ze ścieżki /g/", () => {
    expect(tokenFromLocation({ pathname: "/g/BDEGAXDN", search: "" })).toBe("BDEGAXDN");
  });

  it("czyta kod z ?g= — tą drogą wraca tożsamość po instalacji na iOS", () => {
    expect(tokenFromLocation({ pathname: "/", search: "?g=BDEGAXDN" })).toBe("BDEGAXDN");
  });

  it("normalizuje wielkość liter, bo kod bywa przepisywany z winietki", () => {
    expect(tokenFromLocation({ pathname: "/g/bdegaxdn", search: "" })).toBe("BDEGAXDN");
    expect(normalize("  bdegaxdn  ")).toBe("BDEGAXDN");
  });

  it("nie daje się zmylić ogonkiem w adresie", () => {
    expect(tokenFromLocation({ pathname: "/g/BDEGAXDN/", search: "" })).toBe("BDEGAXDN");
    expect(tokenFromLocation({ pathname: "/g/BDEGAXDN", search: "?x=1" })).toBe("BDEGAXDN");
  });

  it("zwraca null, gdy kodu nie ma", () => {
    expect(tokenFromLocation({ pathname: "/", search: "" })).toBeNull();
    expect(tokenFromLocation({ pathname: "/kategoria/3", search: "" })).toBeNull();
  });
});
