import { describe, expect, it } from "vitest";
import { fitWithin } from "./image.js";

describe("skalowanie do dłuższego boku", () => {
  it("nie powiększa zdjęcia mniejszego niż budżet", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("skaluje po dłuższym boku, zachowując proporcje", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("radzi sobie z panoramą, nie gubiąc jej na zero pikseli", () => {
    const r = fitWithin(12000, 400, 400);
    expect(r.width).toBe(400);
    expect(r.height).toBeGreaterThanOrEqual(1);
  });

  it("nie dzieli przez zero na pustym obrazie", () => {
    expect(fitWithin(0, 0, 1600)).toEqual({ width: 0, height: 0 });
  });
});
