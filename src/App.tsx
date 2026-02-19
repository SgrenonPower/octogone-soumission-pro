import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";
import Login from "./pages/Login";
import Calculateur from "./pages/Calculateur";
import Soumissions from "./pages/Soumissions";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Page de connexion */}
          <Route
            path="/"
            element={
              isAuthenticated() ? <Navigate to="/calculateur" replace /> : <Login />
            }
          />

          {/* Pages protégées */}
          <Route
            path="/calculateur"
            element={
              <ProtectedRoute>
                <Calculateur />
              </ProtectedRoute>
            }
          />
          <Route
            path="/soumissions"
            element={
              <ProtectedRoute>
                <Soumissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
