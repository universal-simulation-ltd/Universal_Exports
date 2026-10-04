import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nRoot } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { grantDemoAccess, hasDemoAccess } from "@/lib/demoAccess";
import { BASE_PATH } from "@/lib/basePath";
import { UniversalAppsNavBar, type AboutAppConfig } from "@unisim/sdk";
// Generated — `npm run credits` after any dependency change. Never edit it by
// hand: it is read off the installed tree, so a hand-kept list drifts from the
// lockfile the first time anyone upgrades anything, and a credits list naming a
// package we removed is worse than no list at all.
import credits from "./generated/credits.json";
import { CONTAINER } from "@/lib/layout";
import ProductLogo from "@/components/ProductLogo";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";

// Every page but the landing page loads on demand. The editor (Index →
// MainContent and the PDF builders) is most of the app's code, and the people
// opening a /sign or /view link from an email or a QR code never need it.
const Index = lazy(() => import("./pages/Index.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Sign = lazy(() => import("./pages/Sign.tsx"));
const SignMobile = lazy(() => import("./pages/SignMobile.tsx"));
const AgreementView = lazy(() => import("./pages/AgreementView.tsx"));
const Verify = lazy(() => import("./pages/Verify.tsx"));
import { KNOWLEDGE_BASE } from './knowledge'

// "About this app". Since SDK 0.161 the SDK draws the row at the foot of "Tune
// this app" and opens its own AboutAppDialog; it used to be FileMenu's
// Advanced section.
//
// ⚠ privacy={false} on purpose. Universal Exports keeps agreements in a
// database so the other side of a trade can reach them — "never leaves this
// computer" would be false, and false in the one dialog somebody opens to check.
const ABOUT: AboutAppConfig = {
  repo:    "https://github.com/universal-simulation-ltd/Universal_Exports",
  privacy: false,
  credits,
  noticesHref: "https://github.com/universal-simulation-ltd/Universal_Exports/blob/main/THIRD-PARTY-NOTICES.md",
};

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
  const inDemoBypass = !loading && !user && hasDemoAccess() && pathname === "/app";
  // Language is the SDK's (2026-09-29): App preferences / Global preferences in
  // the profile menu set it, and `useI18n()` translates this app from the same
  // value. The old Actions rows in the profile pill were only Exports' own
  // Language picker (FileMenu.tsx), with `showLanguageSelector={false}` keeping
  // the SDK's out — both went, so there is one Language, and it works.
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <UniversalAppsNavBar
        product="exports"
        productLogo={<ProductLogo />}
        productHomeHref={`${BASE_PATH}/`}
        // Profile menu ▸ Advanced ▸ Knowledge base (SDK 0.163.0): this app's own
        // articles, bundled from ./knowledge so they read offline.
        knowledgeBase={KNOWLEDGE_BASE}
        about={ABOUT}
        suiteSwitcherIconSrc={`${BASE_PATH}/unisim-icon.png`}
        contentClassName={CONTAINER}
      />
      {inDemoBypass && (
        <div className="shrink-0 bg-amber-500/15 border-b border-amber-500/30 text-center text-xs text-foreground py-1 px-4">
          Demo access — you're not signed in, so changes won't be saved.
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto">
        <Suspense fallback={null}>
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
            {/* Public check of a signed copy — the address and QR on every
                audit page. The file is hashed in the browser, never sent. */}
            <Route path="/verify" element={<Verify />} />
            <Route path="/verify/:auditId" element={<Verify />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nRoot>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={BASE_PATH}>
          <AuthProvider>
            <AppShell />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </I18nRoot>
  </QueryClientProvider>
);

export default App;
