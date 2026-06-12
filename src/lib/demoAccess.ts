// Demo bypass for the sign-in gate. Visiting /demo (the hidden route used for
// demos — opensource.unisim.co.uk/exports/demo) sets a sessionStorage flag and
// ProtectedRoute lets the tab into /app without a Universal ID. Scoped to the
// tab (sessionStorage, not localStorage) so a demo machine doesn't stay
// permanently ungated.

const DEMO_ACCESS_KEY = "ue:demo-access";

export function grantDemoAccess(): void {
  try {
    sessionStorage.setItem(DEMO_ACCESS_KEY, "1");
  } catch {
    // sessionStorage unavailable (private mode quirks) — the flag just won't
    // persist across reloads; /demo can be revisited.
  }
}

export function hasDemoAccess(): boolean {
  try {
    return sessionStorage.getItem(DEMO_ACCESS_KEY) === "1";
  } catch {
    return false;
  }
}
