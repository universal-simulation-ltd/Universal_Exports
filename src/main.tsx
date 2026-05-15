import { createRoot } from "react-dom/client";
import { UniversalProvider } from "@unisim/sdk";
import App from "./App.tsx";
import "./index.css";

const universalConfig = {
  supabaseUrl: import.meta.env.VITE_PLATFORM_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_PLATFORM_SUPABASE_ANON_KEY,
  product: "exports" as const,
  cookieDomain: import.meta.env.PROD ? ".unisim.co.uk" : undefined,
};

createRoot(document.getElementById("root")!).render(
  <UniversalProvider config={universalConfig}>
    <App />
  </UniversalProvider>,
);
