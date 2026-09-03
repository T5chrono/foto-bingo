import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import * as queue from "../lib/queue";
import type { TileView } from "../components/BoardGrid";

/**
 * Plansza to złożenie dwóch źródeł: tego, co potwierdził serwer, i tego, co
 * jeszcze czeka w telefonie. Gość ma widzieć swoje zdjęcie od razu po wybraniu,
 * a nie dopiero po powrocie sieci — inaczej przy ognisku wygląda to jak awaria.
 */
export function useBoard() {
  const [jobs, setJobs] = useState<queue.Job[]>([]);

  const refreshJobs = useCallback(async () => {
    setJobs(await queue.allJobs());
  }, []);

  useEffect(() => {
    void refreshJobs();
  }, [refreshJobs]);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    staleTime: 30_000,
    retry: (count, err) =>
      // Nieznany kod nie naprawi się przez ponawianie.
      count < 3 && !(err as { status?: number }).status?.toString().startsWith("4"),
  });

  const tiles = new Map<number, TileView>();
  for (const tile of me.data?.tiles ?? []) {
    tiles.set(tile.categoryId, {
      thumbUrl: tile.thumbUrl,
      previewUrl: tile.previewUrl,
      kind: tile.kind,
    });
  }
  for (const job of jobs) {
    if (job.state === "done") continue;
    const existing = tiles.get(job.categoryId) ?? {};
    tiles.set(job.categoryId, {
      ...existing,
      // Zadanie z telefonu jest świeższe niż odpowiedź serwera — gość mógł
      // właśnie zamienić zdjęcie na film i znaczek ma się zgadzać od razu.
      kind: job.kind,
      pending: job.state !== "failed",
      failed: job.state === "failed",
    });
  }

  return { me, tiles, jobs, refreshJobs };
}
