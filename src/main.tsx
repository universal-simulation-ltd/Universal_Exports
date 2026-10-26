import { createRoot } from "react-dom/client";
import { UniversalProvider } from "@unisim/sdk";
import App from "./App.tsx";
import { UsageTracker } from "@unisim/sdk";
import "./index.css";
import { migrateLegacyLanguage } from "./lib/i18n/migrate";
import SuiteClientBridge from "./components/SuiteClientBridge";

// Before the provider mounts, so its first read of the language already sees an
// old `eboxy-lang` choice carried across as this app's override.
migrateLegacyLanguage();

console.log(`build: ${import.meta.env.VITE_BUILD_SHA}`);

const universalConfig = {
  supabaseUrl: import.meta.env.VITE_PLATFORM_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_PLATFORM_SUPABASE_ANON_KEY,
  product: "exports" as const,
  cookieDomain: import.meta.env.PROD ? ".unisim.co.uk" : undefined,
  // No "Sign in" in the profile menu for a guest (James, 2026-10-26: only
  // where signing in adds little). The one thing that needs an account, the
  // online store, asks for it in its own dialog; signed in, the account rows
  // and Sign out are back (SDK 0.205.0).
  signInInMenu: false,
};

createRoot(document.getElementById("root")!).render(
  <UniversalProvider config={universalConfig}>
    {/* First child, always: binds the one Supabase client (src/lib/supabase.ts). */}
    <SuiteClientBridge />
    <UsageTracker />
    <App />
  </UniversalProvider>,
);
