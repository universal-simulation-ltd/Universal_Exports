import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { UniversalAppsNavBar } from "@unisim/sdk";
import ProductLogo from "@/components/ProductLogo";
import FileMenu from "@/components/FileMenu";
import Index from "./pages/Index.tsx";
import Landing from "./pages/Landing.tsx";
import Auth from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <>{children}</> : <Navigate to="/auth" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/app" replace /> : <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <div className="h-screen flex flex-col overflow-hidden">
              <UniversalAppsNavBar
                product="exports"
                productLogo={<ProductLogo />}
                fileMenu={<FileMenu variant="header" />}
                suiteSwitcherIconSrc={`${import.meta.env.BASE_URL}unisim-icon.png`}
                contentMaxWidth={1152}
              />
              <div className="flex-1 min-h-0 overflow-auto">
                <Routes>
                  <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
                  <Route path="/" element={<Landing />} />
                  <Route path="/app" element={<Index />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
