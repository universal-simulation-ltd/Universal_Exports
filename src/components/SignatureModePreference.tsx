import { DefaultViewSelect } from "@unisim/sdk";
import { useI18n } from "@/lib/i18n";

// The signature pad's three ways to sign. James, 2026-09-30: double-tap one to
// make it the one the pad opens on (the SDK's useDefaultView, from Jukebox's
// library tabs). Per device, like every default view. Draw is the app's own
// default.
//
// ⚠️ Its own module, not SignaturePad.tsx: App.tsx mounts the Tune this app row
// eagerly, and SignaturePad (Supabase, the QR handoff) belongs to the editor's
// lazily loaded chunk.
export type SignatureMode = "mobile" | "draw" | "upload";
export const SIGNATURE_MODES = ["mobile", "draw", "upload"] as const satisfies readonly SignatureMode[];
export const SIGNATURE_MODE_ID = "signature-mode";
export const MODE_LABEL_KEYS = {
  mobile: "pad.mobile",
  draw: "pad.draw",
  upload: "pad.upload",
} as const;

/** Tune this app ▸ the pad's default, for anybody who cannot double-tap. */
export function SignatureModePreference() {
  const { t } = useI18n();
  return (
    <DefaultViewSelect<SignatureMode>
      id={SIGNATURE_MODE_ID}
      label={t("pad.opensOn")}
      fallback="draw"
      views={SIGNATURE_MODES.map((m) => ({ value: m, label: t(MODE_LABEL_KEYS[m]) }))}
    />
  );
}
