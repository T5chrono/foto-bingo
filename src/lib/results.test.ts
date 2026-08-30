import { describe, expect, it } from "vitest";

import { LINES } from "./bingo";
import { computeResults, type PhotoRow } from "./results";

const T = (minute: number) =>
  new Date(Date.UTC(2026, 9, 3, 18, minute)).toISOString();

function row(over: Partial<PhotoRow> & Pick<PhotoRow, "guestId" | "categoryId">): PhotoRow {
  return {
    guestName: over.guestId.toUpperCase(),
    createdAt: T(0),
    isActive: true,
    ...over,
  };
}

/** Wszystkie pola jednej linii, każde o innej minucie. */
function line(kind: "row" | "col" | "diag", index: number, guestId: string, from: number) {
  const ids = LINES.find((l) => l.kind === kind && l.index === index)!.ids;
  return ids.map((categoryId, i) => row({ guestId, categoryId, createdAt: T(from + i) }));
}

describe("computeResults — linie", () => {
  it("nie zalicza linii, w której brakuje jednego pola", () => {
    const rows = line("row", 1, "ala", 0).slice(0, 4);
    const first = computeResults(rows).lines[0]!;
    expect(first.finishers).toEqual([]);
  });

  it("liczy czas ukończenia z ostatniego brakującego pola, nie z pierwszego", () => {
    const rows = line("row", 1, "ala", 10);
    const first = computeResults(rows).lines[0]!;
    expect(first.finishers).toHaveLength(1);
    expect(first.finishers[0]!.completedAt).toBe(T(14));
  });

  it("układa gości w kolejności ukończenia, nie alfabetycznie", () => {
    const rows = [...line("row", 2, "zofia", 0), ...line("row", 2, "ala", 20)];
    const standing = computeResults(rows).lines.find((l) => l.kind === "row" && l.index === 2)!;
    expect(standing.finishers.map((f) => f.guestId)).toEqual(["zofia", "ala"]);
  });

  it("oddaje wszystkie dwanaście linii, także puste", () => {
    const { lines } = computeResults([]);
    expect(lines).toHaveLength(12);
    expect(lines.filter((l) => l.kind === "diag")).toHaveLength(2);
    expect(lines.every((l) => l.finishers.length === 0)).toBe(true);
  });

  it("podmiana zdjęcia nie przesuwa czasu ukończenia", () => {
    const base = line("col", 3, "ala", 0);
    const swapped: PhotoRow[] = [
      // Pierwsza dostawa gaśnie, ale kafelek zostaje zajęty przez następcę.
      ...base.map((r, i) => (i === 4 ? { ...r, isActive: false } : r)),
      row({ guestId: "ala", categoryId: base[4]!.categoryId, createdAt: T(90) }),
    ];
    const standing = computeResults(swapped).lines.find((l) => l.kind === "col" && l.index === 3)!;
    expect(standing.finishers[0]!.completedAt).toBe(T(4));
  });

  it("usunięte zdjęcie rozbiera linię", () => {
    const rows = line("diag", 1, "ala", 0).map((r, i) =>
      i === 2 ? { ...r, isActive: false } : r,
    );
    const standing = computeResults(rows).lines.find((l) => l.kind === "diag" && l.index === 1)!;
    expect(standing.finishers).toEqual([]);
  });
});

describe("computeResults — nagroda główna", () => {
  it("prowadzi ten, kto ma więcej pól", () => {
    const rows = [
      ...line("row", 1, "ala", 0),
      row({ guestId: "zofia", categoryId: 1 }),
    ];
    const { leaders } = computeResults(rows);
    expect(leaders.map((l) => [l.guestId, l.photos])).toEqual([
      ["ala", 5],
      ["zofia", 1],
    ]);
  });

  it("przy remisie wyżej stoi ten, kto doszedł do tej liczby wcześniej", () => {
    const rows = [...line("row", 1, "zofia", 0), ...line("row", 2, "ala", 50)];
    const { leaders } = computeResults(rows);
    expect(leaders.map((l) => l.guestId)).toEqual(["zofia", "ala"]);
  });

  it("nie liczy dwa razy kafelka, na którym zdjęcie podmieniono", () => {
    const rows = [
      row({ guestId: "ala", categoryId: 7, createdAt: T(0), isActive: false }),
      row({ guestId: "ala", categoryId: 7, createdAt: T(5) }),
    ];
    const { leaders } = computeResults(rows);
    expect(leaders[0]!.photos).toBe(1);
    expect(leaders[0]!.reachedAt).toBe(T(0));
  });

  it("pomija gościa, któremu nie zostało ani jedno aktywne zdjęcie", () => {
    const rows = [row({ guestId: "ala", categoryId: 7, isActive: false })];
    expect(computeResults(rows).leaders).toEqual([]);
  });
});
