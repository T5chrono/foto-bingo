import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import BoardPage from "./pages/BoardPage";
import JoinPage from "./pages/JoinPage";
import NoTokenPage from "./pages/NoTokenPage";
import { GuestTokenProvider, useGuestToken } from "./hooks/useGuestToken";

const CategoryPage = lazy(() => import("./pages/CategoryPage"));

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
