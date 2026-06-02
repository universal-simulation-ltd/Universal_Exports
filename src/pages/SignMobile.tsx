import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Smartphone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SignaturePad from "@/components/SignaturePad";
import { toast } from "sonner";

const MOBILE_STORAGE_PREFIX = "exports:mobile-sig:";

/**
 * Mobile Signature handoff page — the QR code on the desktop "Mobile
 * Signature" tab points here. The signer draws their signature, taps
 * Submit, and the original SignaturePad picks up the value via the
 * `storage` event (same browser, multiple tabs) or the next localStorage
 * poll on the originating device.
 *
 * Demo only: cross-device sync requires a backend handoff (Supabase row +
 * polling, like /sign/:token does for counter-signing). The 6-digit PIN
 * lockout the user mentioned is the natural next step.
 */
const SignMobile = () => {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [signature, setSignature] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!signature || !token) {
      toast.error("Draw or upload a signature first.");
      return;
    }
    try {
      localStorage.setItem(`${MOBILE_STORAGE_PREFIX}${token}`, signature);
      setSubmitted(true);
      toast.success("Signature sent back to the desktop tab.");
    } catch (err) {
      console.error(err);
      toast.error("Could not save signature.");
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-semibold">Signature sent</h1>
          <p className="text-sm text-muted-foreground">
            You can close this tab. Your signature has been sent back to the
            desktop tab that generated the QR code.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>Back to Universal Exports</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold">Mobile signature</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Draw your signature below, then tap Send. The signature will appear
          on the desktop tab that opened this QR code.
        </p>
        <div className="rounded-lg border border-input bg-background p-3">
          <SignaturePad value={signature} onChange={setSignature} />
        </div>
        <Button className="w-full" disabled={!signature} onClick={handleSubmit}>
          Send signature
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">
          Demo only — your signature is sent via the browser's local storage to
          the desktop tab. A 6-digit PIN + cross-device sync is on the way.
        </p>
      </div>
    </div>
  );
};

export default SignMobile;
