import { useUniversal } from "@unisim/sdk";
import { bindSuiteClient } from "@/lib/supabase";

/**
 * Hands the provider's Supabase client to src/lib/supabase.ts, so the whole app
 * runs on the one suite session (see that file). Bound during render, not in an
 * effect: mounted as the provider's FIRST child, it renders before any page and
 * so before any page's effect can query. Keep it first.
 */
export default function SuiteClientBridge() {
  const { supabase } = useUniversal();
  bindSuiteClient(supabase);
  return null;
}
