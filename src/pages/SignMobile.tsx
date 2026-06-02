import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Smartphone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SignaturePad from "@/components/SignaturePad";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

/**
 * Mobile Signature handoff page — the QR code on the desktop "Mobile
 * Signature" tab points here. Cross-device flow:
 *
 *   1. Visitor lands here with `?` token = uuid-ish from the QR.
 *   2. We join the Supabase Realtime channel `mobile-sig:<token>` and emit
 *      a `scanned` broadcast so the desktop tab can show "Phone connected".
 *   3. User enters the 6-digit PIN displayed on the desktop screen.
 *   4. User draws a signature.
 *   5. Tapping "Send signature" emits a `signature` broadcast with the PIN
 *      + the drawn data URL. The desktop receives, validates the PIN, and
 *      applies the signature to the form. We don't write anything to the
 *      database — broadcast messages are ephemeral, which is exactly what a
 *      one-shot signature handoff needs.
 *
 * The PIN check happens on the desktop side. Wrong PIN → desktop silently
 * drops the message. We don't tell the mobile user whether the PIN was
 * accepted (that would help a brute-force attacker); instead we show a
 * generic "Sent — check your desktop" confirmation.
 */
const SignMobile = () => {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [signature, setSignature] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  // Tell the desktop tab we're here so it can swap "Scan with your phone" for
  // "Phone connected — waiting for the signature." We do this once per
  // token; if the connection drops mid-flow the desktop just stays in the
  // waiting state, which is fine for a manual flow.
  useEffect(() => {
    if (!token) return;
    const channel = supabase.channel(`mobile-sig:${token}`, {
      config: { broadcast: { self: false } },
    });
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void channel.send({ type: "broadcast", event: "scanned", payload: {} });
      }
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [token]);

  const handleSubmit = async () => {
    if (!signature || !token) {
      toast.error("Draw or upload a signature first.");
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      toast.error("Enter the 6-digit PIN shown on your desktop.");
      return;
    }
    setSending(true);
    const channel = supabase.channel(`mobile-sig:${token}`, {
      config: { broadcast: { self: false } },
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("timeout")), 5000);
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            clearTimeout(timer);
            resolve();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            clearTimeout(timer);
            reject(new Error(status));
          }
        });
      });
      const res = await channel.send({
        type: "broadcast",
        event: "signature",
        payload: { pin, signature },
      });
      if (res !== "ok") throw new Error("send-failed");
      setSubmitted(true);
    } catch (err) {
      console.error("[exports] mobile-sig broadcast failed:", err);
      toast.error("Could not send signature — check your connection and try again.");
    } finally {
      setSending(false);
      void supabase.removeChannel(channel);
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
            Check the desktop tab — if the PIN matched, your signature is now
            on the form. You can close this page.
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
          Enter the 6-digit PIN shown on your desktop, draw your signature,
          then tap Send. The signature will appear on the desktop form.
        </p>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground" htmlFor="mobile-sig-pin">
            PIN
          </label>
          <Input
            id="mobile-sig-pin"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="\d{6}"
            placeholder="123456"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="font-mono text-lg tracking-[0.3em] text-center"
          />
        </div>
        <div className="rounded-lg border border-input bg-background p-3">
          <SignaturePad value={signature} onChange={setSignature} />
        </div>
        <Button
          className="w-full"
          disabled={!signature || pin.length !== 6 || sending}
          onClick={handleSubmit}
        >
          {sending ? "Sending…" : "Send signature"}
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">
          The PIN proves you're the same person at the desktop. Your signature
          is sent over an encrypted realtime channel and never stored.
        </p>
      </div>
    </div>
  );
};

export default SignMobile;
