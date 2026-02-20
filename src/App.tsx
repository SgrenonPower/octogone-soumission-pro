import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
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
import AdminRoute from "./components/AdminRoute";
import AuthRedirect from "./components/AuthRedirect";

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
        <AuthRedirect />
        <Routes>
          {/* Pages publiques */}
          <Route path="/" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Routes protégées */}
          <Route path="/calculateur" element={<ProtectedRoute><Calculateur /></ProtectedRoute>} />
          <Route path="/soumissions" element={<ProtectedRoute><Soumissions /></ProtectedRoute>} />
          <Route path="/soumissions/:id" element={<ProtectedRoute><SoumissionDetail /></ProtectedRoute>} />

          {/* Mode présentation — protégé par ProtectedRoute */}
          <Route path="/soumissions/:id/presentation" element={
            <ProtectedRoute><SoumissionPresentation /></ProtectedRoute>
          } />

          {/* Routes admin — réservées aux administrateurs */}
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="/admin/tarification" element={<AdminRoute><AdminTarification /></AdminRoute>} />
          <Route path="/admin/rabais" element={<AdminRoute><AdminRabais /></AdminRoute>} />
          <Route path="/admin/roi" element={<AdminRoute><AdminRoi /></AdminRoute>} />
          <Route path="/admin/soumissions" element={<AdminRoute><AdminConfigSoumissions /></AdminRoute>} />
          <Route path="/admin/utilisateurs" element={<AdminRoute><AdminUtilisateurs /></AdminRoute>} />
          <Route path="/admin/historique" element={<AdminRoute><AdminHistorique /></AdminRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
