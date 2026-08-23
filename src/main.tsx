import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { watchInstallPrompt } from "./lib/install";
import "./index.css";

// MUSI stać przed pierwszym renderem. `beforeinstallprompt` leci raz na
// załadowanie strony, w momencie wybranym przez Chrome, i przepada, jeśli nikt
// nie słucha. Baner instalacji jest za bramką o zdjęciach, więc przy pierwszym
// skanie kodu QR zamontowałby się długo po tym zdarzeniu — i przycisk
// „Zainstaluj" pojawiał się dopiero przy drugim wejściu.
watchInstallPrompt();

const root = document.getElementById("root");
if (!root) throw new Error("Brak #root w index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
