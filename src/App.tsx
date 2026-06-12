import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { grantDemoAccess, hasDemoAccess } from "@/lib/demoAccess";
import { UniversalAppsNavBar } from "@unisim/sdk";
import ProductLogo from "@/components/ProductLogo";
import FileMenu from "@/components/FileMenu";
import Index from "./pages/Index.tsx";
import Landing from "./pages/Landing.tsx";
import Auth from "./pages/Auth.tsx";
import Sign from "./pages/Sign.tsx";
import SignMobile from "./pages/SignMobile.tsx";
import AgreementView from "./pages/AgreementView.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  // The /demo bypass (sessionStorage flag) lets demos in without a Universal ID.
  if (user || hasDemoAccess()) return <>{children}</>;
  // Stash the intercepted navigation state (e.g. the project name typed on the
  // landing page) so Auth can restore it after sign-in.
  return <Navigate to="/auth" replace state={{ appState: location.state }} />;
}

// Hidden demo entry — opensource.unisim.co.uk/exports/demo. Grants this tab
// gate-free access and drops straight into the pre-filled example project.
function DemoEntry() {
  grantDemoAccess();
  return <Navigate to="/app" replace state={{ loadDemo: true }} />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  // Once sign-in succeeds this redirect can win the race against Auth's own
  // navigate — forward the stashed pre-gate state so it isn't dropped.
  const appState = (location.state as { appState?: unknown } | null)?.appState;
  return user ? <Navigate to="/app" replace state={appState} /> : <>{children}</>;
}

function AppShell() {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();
  // Hide the actions menu on the landing page — same convention as PDF/Images:
  // actions only make sense once the user is inside the editor.
  const showFileMenu = pathname !== "/";
  const inDemoBypass = !loading && !user && hasDemoAccess() && pathname === "/app";
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <UniversalAppsNavBar
        product="exports"
        productLogo={<ProductLogo />}
        productHomeHref={import.meta.env.BASE_URL}
        fileMenu={showFileMenu ? <FileMenu variant="header" /> : undefined}
        suiteSwitcherIconSrc={`${import.meta.env.BASE_URL}unisim-icon.png`}
        contentMaxWidth={1152}
      />
      {inDemoBypass && (
        <div className="shrink-0 bg-amber-500/15 border-b border-amber-500/30 text-center text-xs text-foreground py-1 px-4">
          Demo access — you're not signed in, so changes won't be saved.
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto">
        <Routes>
          <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          {/* Hidden gate bypass for demos — not linked from anywhere. */}
          <Route path="/demo" element={<DemoEntry />} />
          {/* Public counter-sign route — no auth gate. The uuid token
              in the URL is the bearer credential and the row is RLS-
              readable only when the caller knows it. */}
          <Route path="/sign/:token" element={<Sign />} />
          {/* Mobile-signature handoff — desktop SignaturePad shows a
              QR that opens this page on the user's phone. Public,
              no auth needed (demo-only, same-device localStorage
              handoff for now). */}
          <Route path="/sign-mobile/:token" element={<SignMobile />} />
          {/* Public read-only agreement view — the QR stamped on every
              generated PDF opens here. Token-gated like /sign. */}
          <Route path="/view/:token" element={<AgreementView />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AppShell />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
