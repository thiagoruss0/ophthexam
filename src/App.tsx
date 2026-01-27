import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "@/hooks/useAuth";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/Auth";
import PendingApprovalPage from "./pages/PendingApproval";
import DashboardPage from "./pages/Dashboard";
import NewAnalysisPage from "./pages/NewAnalysis";
import ExamViewPage from "./pages/ExamView";
import HistoryPage from "./pages/History";
import PatientPage from "./pages/Patient";
import SettingsPage from "./pages/Settings";
import AdminPage from "./pages/Admin";
import AiMetricsPage from "./pages/AiMetrics";
import SharedReportPage from "./pages/SharedReport";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/aguardando-aprovacao" element={<PendingApprovalPage />} />
            <Route path="/laudo/:token" element={<SharedReportPage />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/nova-analise"
              element={
                <ProtectedRoute>
                  <NewAnalysisPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exame/:id"
              element={
                <ProtectedRoute>
                  <ExamViewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/historico"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/paciente/:id"
              element={
                <ProtectedRoute>
                  <PatientPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ai-metrics"
              element={
                <ProtectedRoute requireAdmin>
                  <AiMetricsPage />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
