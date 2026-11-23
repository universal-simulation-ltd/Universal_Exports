import { useEffect } from "react";
import { useTwoStepDue, useUniversal } from "@unisim/sdk";
import { markBridged, reportTwoStep } from "@/lib/twoStepGate";

/**
 * Tells src/lib/twoStepGate.ts whether the signed-in account still owes its
 * two-step code (SDK `useTwoStepDue`, re-asked when the code is entered), so
 * the stores can hold every read and write of the account's rows until it is
 * in. Renders nothing.
 */
export default function TwoStepGateBridge() {
  const { supabase, session, loading } = useUniversal();
  const uid = session?.user && session.user.is_anonymous !== true ? session.user.id : null;
  const state = useTwoStepDue(supabase, uid);
  // In render, not an effect: mounted beside <SuiteClientBridge />, ahead of
  // every page, so no store can read before the gate is in place.
  markBridged();
  useEffect(() => {
    // Until the provider has its session, say nothing: a 'clear' for "nobody
    // signed in yet" must not let a store's read through for the real account.
    reportTwoStep(uid, loading ? null : state);
  }, [uid, state, loading]);
  return null;
}
