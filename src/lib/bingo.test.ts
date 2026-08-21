import { describe, expect, it } from "vitest";
import {
  LINES,
  completedLines,
  countFilled,
  highlightedIds,
  isFullCard,
  lineLabel,
} from "./bingo";

const ids = (...n: number[]) => new Set(n);
const all = new Set(Array.from({ length: 25 }, (_, i) => i + 1));

describe("linie", () => {
  it("ma 12 linii: 5 wierszy, 5 kolumn, 2 przekątne", () => {
    expect(LINES).toHaveLength(12);
    expect(LINES.filter((l) => l.kind === "row")).toHaveLength(5);
    expect(LINES.filter((l) => l.kind === "col")).toHaveLength(5);
    expect(LINES.filter((l) => l.kind === "diag")).toHaveLength(2);
  });

  it("każda linia ma 5 różnych pól", () => {
    for (const line of LINES) {
      expect(line.ids).toHaveLength(5);
      expect(new Set(line.ids).size).toBe(5);
    }
  });

  it("liczy wiersze i kolumny zgodnie z numeracją planszy", () => {
    expect(LINES.find((l) => l.kind === "row" && l.index === 1)?.ids).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(LINES.find((l) => l.kind === "row" && l.index === 3)?.ids).toEqual([
      11, 12, 13, 14, 15,
    ]);
    expect(LINES.find((l) => l.kind === "col" && l.index === 1)?.ids).toEqual([
      1, 6, 11, 16, 21,
    ]);
    expect(LINES.find((l) => l.kind === "col" && l.index === 5)?.ids).toEqual([
      5, 10, 15, 20, 25,
    ]);
  });

  it("ma obie przekątne biegnące przez środek", () => {
    expect(LINES.find((l) => l.kind === "diag" && l.index === 1)?.ids).toEqual([
      1, 7, 13, 19, 25,
    ]);
    expect(LINES.find((l) => l.kind === "diag" && l.index === 2)?.ids).toEqual([
      5, 9, 13, 17, 21,
    ]);
  });
});

describe("wykrywanie bingo", () => {
  it("nie widzi linii na pustej planszy", () => {
    expect(completedLines(ids())).toEqual([]);
  });

  it("nie widzi linii przy czterech na pięć", () => {
    expect(completedLines(ids(1, 2, 3, 4))).toEqual([]);
  });

  it("wykrywa zapełniony wiersz", () => {
    const done = completedLines(ids(1, 2, 3, 4, 5));
    expect(done).toHaveLength(1);
    expect(done[0]).toMatchObject({ kind: "row", index: 1 });
  });

  it("wykrywa zapełnioną kolumnę", () => {
    const done = completedLines(ids(3, 8, 13, 18, 23));
    expect(done).toHaveLength(1);
    expect(done[0]).toMatchObject({ kind: "col", index: 3 });
  });

  it("zgłasza obie linie, gdy jedno pole domyka wiersz i kolumnę naraz", () => {
    // wiersz 1 (1..5) plus kolumna 1 (1,6,11,16,21) — wspólne pole to 1
    const done = completedLines(ids(1, 2, 3, 4, 5, 6, 11, 16, 21));
    expect(done.map((l) => `${l.kind}${l.index}`)).toEqual(["row1", "col1"]);
  });

  it("na pełnej karcie widzi wszystkie 12 linii", () => {
    expect(completedLines(all)).toHaveLength(12);
    expect(isFullCard(all)).toBe(true);
  });

  it("nie uznaje pełnej karty przy 24 polach", () => {
    const almost = new Set(all);
    almost.delete(13);
    expect(isFullCard(almost)).toBe(false);
    // środkowe pole leży na obu przekątnych, więc znikają obie
    expect(completedLines(almost).filter((l) => l.kind === "diag")).toEqual([]);
  });

  it("ignoruje identyfikatory spoza planszy", () => {
    expect(countFilled(ids(1, 2, 99, 0, -3))).toBe(2);
    expect(isFullCard(new Set([...all, 99]))).toBe(true);
  });
});

describe("podświetlanie", () => {
  it("zwraca pola zdobytych linii, i tylko ich", () => {
    const highlighted = highlightedIds(ids(1, 2, 3, 4, 5, 6, 7));
    expect([...highlighted].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it("jest puste, dopóki nie ma pełnej linii", () => {
    expect(highlightedIds(ids(1, 2, 3, 4)).size).toBe(0);
  });
});

describe("etykiety linii", () => {
  it("opisuje linię po polsku", () => {
    expect(lineLabel({ kind: "row", index: 2, ids: [] })).toBe("wiersz 2");
    expect(lineLabel({ kind: "col", index: 4, ids: [] })).toBe("kolumna 4");
    expect(lineLabel({ kind: "diag", index: 1, ids: [] })).toBe("przekątna ↘");
    expect(lineLabel({ kind: "diag", index: 2, ids: [] })).toBe("przekątna ↙");
  });
});
