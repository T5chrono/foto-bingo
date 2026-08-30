import { computeResults, type PhotoRow, type Results } from "../../src/lib/results.js";
import { db } from "./db.js";

/**
 * Dane do arkusza sędziowskiego: kto pierwszy skompletował którą linię.
 *
 * Zestawienie liczy się **z całej historii zdjęć**, także z wierszy wygaszonych
 * (`is_active = false`), bo podmiana zdjęcia na kafelku nie może cofnąć komuś
 * ukończonej linii. Rozstrzyganie jest w `src/lib/results.ts`; tutaj zostaje
 * samo dowiezienie wierszy.
 */

/**
 * PostgREST oddaje **najwyżej tysiąc wierszy na żądanie** i robi to po cichu —
 * bez błędu, bez ostrzeżenia, po prostu krótszą listą. Przy 40 gościach po 25
 * pól sam komplet planszy to tysiąc wierszy, a każda podmiana zdjęcia dokłada
 * kolejny. Bez stronicowania panel wskazywałby zwycięzców z pierwszego tysiąca
 * wierszy i wyglądałby przy tym zupełnie zdrowo.
 */
const PAGE = 1000;

export async function collectResults(): Promise<Results> {
  // Nazwiska idą osobnym, jednorazowym zapytaniem, a nie złączeniem
  // `guests(name)` przy każdym zdjęciu. Złączenie powtarzałoby „Maria
  // Nowak-Kowalska" tysiąc razy w odpowiedzi, a panel odpytuje serwer
  // co pół minuty przez cały weekend — to jest różnica w rachunku za transfer,
  // nie w czytelności kodu.
  const { data: guests, error: guestsError } = await db().from("guests").select("id, name");
  if (guestsError) throw guestsError;

  const names = new Map<string, string>();
  for (const g of guests ?? []) names.set(g.id as string, g.name as string);

  const rows: PhotoRow[] = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db()
      .from("photos")
      .select("guest_id, category_id, created_at, is_active")
      // Kolejność musi być pełna i stała, inaczej strona druga potrafi powtórzyć
      // wiersz ze strony pierwszej i zgubić inny. `id` jest kluczem głównym.
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;

    for (const row of data ?? []) {
      rows.push({
        guestId: row.guest_id as string,
        guestName: names.get(row.guest_id as string) ?? "?",
        categoryId: row.category_id as number,
        createdAt: row.created_at as string,
        isActive: row.is_active as boolean,
      });
    }

    if ((data ?? []).length < PAGE) break;
  }

  return computeResults(rows);
}
