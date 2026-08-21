import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // W dev front stoi na :5173, a funkcja API na :8787. Proxy sprawia, ze
  // aplikacja wola /api tak samo jak w produkcji, gdzie vercel.json przepisuje
  // to na funkcje — jeden adres, zero CORS-u, jedna sciezka do debugowania.
  server: {
    proxy: { "/api": { target: "http://localhost:8787", changeOrigin: true } },
  },
  build: {
    rollupOptions: {
      output: {
        // Jawna lista, nie "wszystko z node_modules". To jest runtime, ktorego
        // pierwszy ekran potrzebuje w calosci, wiec deploy dotykajacy samego
        // kodu aplikacji zostawia go w cache'u telefonu. supabase-js celowo
        // TU NIE MA — wchodzi leniwie dopiero przy pierwszej wysylce.
        manualChunks: {
          vendor: [
            "react",
            "react-dom",
            "react-dom/client",
            "react-router-dom",
            "@tanstack/react-query",
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Foto Bingo",
        short_name: "Foto Bingo",
        description: "Weselna gra w zdjęcia — zbierz linię, zgłoś bingo.",
        lang: "pl",
        theme_color: "#be123c",
        background_color: "#fdf8f6",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Offline fallback for client-side routes. The denylist is load-bearing:
        // a cached response to a photo upload would silently swallow a guest's
        // submission, so /api/* must never be intercepted or served stale.
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // Manrope wchodzi z pięcioma podzbiorami znaków. Przeglądarka i tak
        // pobiera tylko te, których potrzebuje (unicode-range), ale precache
        // service workera bierze wszystko jak leci — czyli 32 KB cyrylicy,
        // greki i wietnamskiego na pierwsze wejście, przy weselu w górach.
        // Gdyby czyjeś imię ich jednak wymagało, dociągną się z sieci albo
        // spadną na czcionkę systemową.
        globIgnores: [
          "**/manrope-cyrillic*",
          "**/manrope-greek*",
          "**/manrope-vietnamese*",
        ],
      },
    }),
  ],
});
