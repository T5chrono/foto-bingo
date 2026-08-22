/**
 * Dodaje gościa i wypisuje jego osobisty link.
 *
 *   node --experimental-strip-types scripts/add-guest.mjs "Anna Kowalska"
 *
 * Kod jawny pojawia się WYŁĄCZNIE na ekranie, przy tworzeniu. W bazie leży
 * tylko SHA-256, więc zgubionego kodu nie da się odzyskać — wtedy generuje
 * się nowy. Etap 5 dorzuci na tym generator winietek z QR dla całej listy.
 */
import { config as loadEnv } from "dotenv";

loadEnv();

const { generateToken, hashToken } = await import("../api/_lib/auth.ts");
const { db } = await import("../api/_lib/db.ts");
const { slugify } = await import("../src/lib/slug.ts");

const name = process.argv.slice(2).join(" ").trim();
if (!name) {
  console.error('Podaj imię i nazwisko, np. node ... scripts/add-guest.mjs "Anna Kowalska"');
  process.exit(1);
}

const baseSlug = slugify(name);
if (!baseSlug) {
  console.error("Z tego imienia nie da się zrobić nazwy folderu.");
  process.exit(1);
}

// Dwie Anny Kowalskie na jednym weselu to nie jest sytuacja hipotetyczna.
let slug = baseSlug;
for (let n = 2; ; n++) {
  const { data, error } = await db().from("guests").select("id").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data) break;
  slug = `${baseSlug}-${n}`;
}

const token = generateToken();
const { error } = await db()
  .from("guests")
  .insert({ name, slug, token_hash: hashToken(token) });
if (error) throw error;

const base = process.env.PUBLIC_BASE_URL ?? "http://localhost:5173";
console.log(`\n  ${name}`);
console.log(`  folder:  ${slug}`);
console.log(`  kod:     ${token}`);
console.log(`  link:    ${base}/g/${token}\n`);
