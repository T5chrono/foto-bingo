// Serwer deweloperski dla funkcji API. Odpowiednik `npm run api` w SplitDecu:
// front stoi na :5173, backend tutaj na :8787, a produkcja i tak trzyma jedno
// i drugie pod jednym adresem, wiec ta rozdzielnosc konczy sie na maszynie.
import { serve } from "@hono/node-server";
import { config as loadEnv } from "dotenv";

loadEnv();
process.env.ENV ??= "development";

const { app } = await import("../api/index.ts");

serve({ fetch: app.fetch, port: 8787 }, (info) => {
  console.log(`API na http://localhost:${info.port}/api/health`);
});
