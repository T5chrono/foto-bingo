import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import BoardPage from "./pages/BoardPage";
import JoinPage from "./pages/JoinPage";
import NoTokenPage from "./pages/NoTokenPage";
import { GuestTokenProvider, useGuestToken } from "./hooks/useGuestToken";

const CategoryPage = lazy(() => import("./pages/CategoryPage"));

// Panel jest osobna galezia aplikacji: gosc nigdy go nie otworzy, wiec nie ma
// powodu, zeby jego kod jechal w paczce, ktora 40 osob pobiera przy ognisku.
const PanelPage = lazy(() => import("./pages/PanelPage"));
const ClaimPage = lazy(() => import("./pages/ClaimPage"));
const PanelCategoryPage = lazy(() => import("./pages/PanelCategoryPage"));

const client = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: true, staleTime: 30_000 },
  },
});

function Screens() {
  const { token } = useGuestToken();

  return (
    <Suspense fallback={<p className="p-8 text-center text-ink/50">Chwileczkę…</p>}>
      <Routes>
        {/* /g/:token działa zawsze — to jedyna droga zdobycia tożsamości. */}
        <Route path="/g/:token" element={<JoinPage />} />

        {/* Panel ma wlasne uwierzytelnienie (PIN) i nie zalezy od kodu goscia,
            wiec lezy poza gałęzią token/brak-tokenu. */}
        <Route path="/panel" element={<PanelPage />} />
        <Route path="/panel/zgloszenie/:id" element={<ClaimPage />} />
        <Route path="/panel/kategoria/:id" element={<PanelCategoryPage />} />
        {token ? (
          <>
            <Route path="/" element={<BoardPage />} />
            <Route path="/kategoria/:id" element={<CategoryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <Route path="*" element={<NoTokenPage />} />
        )}
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={client}>
      <GuestTokenProvider>
        <BrowserRouter>
          <Screens />
        </BrowserRouter>
      </GuestTokenProvider>
    </QueryClientProvider>
  );
}
