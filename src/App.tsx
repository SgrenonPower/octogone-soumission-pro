import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";
import Login from "./pages/Login";
import Calculateur from "./pages/Calculateur";
import Soumissions from "./pages/Soumissions";
import SoumissionDetail from "./pages/SoumissionDetail";
import SoumissionPresentation from "./pages/SoumissionPresentation";
import Admin from "./pages/Admin";
import AdminTarification from "./pages/admin/Tarification";
import AdminRabais from "./pages/admin/Rabais";
import AdminRoi from "./pages/admin/Roi";
import AdminConfigSoumissions from "./pages/admin/ConfigSoumissions";
import AdminUtilisateurs from "./pages/admin/Utilisateurs";
import AdminHistorique from "./pages/admin/Historique";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
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
          <Route
            path="/"
            element={
              isAuthenticated() ? <Navigate to="/calculateur" replace /> : <Login />
            }
          />

          <Route path="/calculateur" element={<ProtectedRoute><Calculateur /></ProtectedRoute>} />
          <Route path="/soumissions" element={<ProtectedRoute><Soumissions /></ProtectedRoute>} />
          <Route path="/soumissions/:id" element={<ProtectedRoute><SoumissionDetail /></ProtectedRoute>} />

          {/* Mode présentation — sans sidebar */}
          <Route path="/soumissions/:id/presentation" element={
            isAuthenticated() ? <SoumissionPresentation /> : <Navigate to="/" replace />
          } />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/admin/tarification" element={<ProtectedRoute><AdminTarification /></ProtectedRoute>} />
          <Route path="/admin/rabais" element={<ProtectedRoute><AdminRabais /></ProtectedRoute>} />
          <Route path="/admin/roi" element={<ProtectedRoute><AdminRoi /></ProtectedRoute>} />
          <Route path="/admin/soumissions" element={<ProtectedRoute><AdminConfigSoumissions /></ProtectedRoute>} />
          <Route path="/admin/utilisateurs" element={<ProtectedRoute><AdminUtilisateurs /></ProtectedRoute>} />
          <Route path="/admin/historique" element={<ProtectedRoute><AdminHistorique /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
