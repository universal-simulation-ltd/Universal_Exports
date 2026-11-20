import { createRoot } from "react-dom/client";
import { UniversalProvider, installBoxStyles, installButtonStyles, installTabStyles } from "@unisim/sdk";
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
};

// The suite's key buttons and tray tabs (SDK 0.216), used as class strings by
// components/ui/button.tsx and tabs.tsx.
installButtonStyles();
installTabStyles();
// The suite's box marks (BRANDING.md → Boxes), also as class strings
// (u-box u-box--orbit / --key / --frame): the sheet goes in once.
installBoxStyles();

createRoot(document.getElementById("root")!).render(
  <UniversalProvider config={universalConfig}>
    {/* First child, always: binds the one Supabase client (src/lib/supabase.ts). */}
    <SuiteClientBridge />
    <UsageTracker />
    <App />
  </UniversalProvider>,
);
