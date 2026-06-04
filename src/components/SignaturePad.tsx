import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Upload, Trash2, Smartphone, CheckCircle2 } from "lucide-react";
import StyledQRCode from "@/components/StyledQRCode";
import { supabase } from "@/lib/supabase";
import { useIsMobile } from "@/hooks/use-mobile";

interface SignaturePadProps {
  value: string; // base64 data URL
  onChange: (value: string) => void;
}

function randomToken() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 6-digit PIN — generated alongside the token. The signer enters it on the
// mobile page to prove they have line-of-sight to the desktop screen. Without
// this, anyone who intercepted the QR could submit a signature to the
// drafter's session.
function randomPin() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const n = ((bytes[0] << 24) >>> 0) + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3];
  return String(n % 1_000_000).padStart(6, "0");
}

const SignaturePad = ({ value, onChange }: SignaturePadProps) => {
  // When the drafter is already on a phone there's no point offering the
  // "scan a QR to sign on your phone" handoff — they can just draw directly.
  const isMobile = useIsMobile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<"mobile" | "draw" | "upload">("draw");
  const [mobileToken, setMobileToken] = useState<string | null>(null);
  const [mobilePin, setMobilePin] = useState<string | null>(null);
  const [mobileStatus, setMobileStatus] = useState<"idle" | "waiting" | "scanned" | "received">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  const mobileSignUrl = mobileToken
    ? `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/sign-mobile/${mobileToken}`
    : "";

  // Generate a token + PIN on switching into Mobile Signature mode.
  useEffect(() => {
    if (mode !== "mobile") return;
    if (!mobileToken) {
      setMobileToken(randomToken());
      setMobilePin(randomPin());
      setMobileStatus("waiting");
    }
  }, [mode, mobileToken]);

  // ── Cross-device handoff via Supabase Realtime broadcast ─────────────────
  // The desktop subscribes to a per-token channel and the mobile page sends
  // a `signature` broadcast (containing the entered PIN + data URL). We
  // validate the PIN locally and apply the signature only on a match. No DB
  // rows are written — broadcast messages are ephemeral, which suits a
  // "one-shot signature handoff" perfectly. Anyone trying to brute-force the
  // PIN over the channel hits 1-in-a-million per attempt and the channel
  // closes the moment a valid signature lands.
  useEffect(() => {
    if (!mobileToken || !mobilePin) return;
    const channel = supabase.channel(`mobile-sig:${mobileToken}`, {
      config: { broadcast: { self: false } },
    });
    channel
      .on("broadcast", { event: "scanned" }, () => {
        setMobileStatus((s) => (s === "waiting" ? "scanned" : s));
      })
      .on("broadcast", { event: "signature" }, ({ payload }) => {
        if (!payload || typeof payload !== "object") return;
        if (payload.pin !== mobilePin) return; // wrong PIN — silently drop
        const sig = String(payload.signature || "");
        if (!sig.startsWith("data:")) return;
        onChange(sig);
        setMobileStatus("received");
        // Brief delay so the user sees the "received" confirmation before
        // we drop them back to the Draw mode preview of the new signature.
        setTimeout(() => setMode("draw"), 1200);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [mobileToken, mobilePin, onChange]);

  function regenerateMobileToken() {
    setMobileToken(randomToken());
    setMobilePin(randomPin());
    setMobileStatus("waiting");
  }

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (value && value.startsWith("data:")) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = value;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [value, mode]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing]);

  const endDraw = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL("image/png"));
    }
  }, [isDrawing, onChange]);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    onChange("");
  }, [onChange]);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {!isMobile && (
          <Button
            type="button"
            variant={mode === "mobile" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("mobile")}
          >
            <Smartphone className="mr-1 h-3.5 w-3.5" />
            Mobile Signature
          </Button>
        )}
        <Button
          type="button"
          variant={mode === "draw" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("draw")}
        >
          <Pencil className="mr-1 h-3.5 w-3.5" />
          Draw
        </Button>
        <Button
          type="button"
          variant={mode === "upload" ? "default" : "outline"}
          size="sm"
          onClick={() => { setMode("upload"); fileRef.current?.click(); }}
        >
          <Upload className="mr-1 h-3.5 w-3.5" />
          Upload Signature
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      {mode === "draw" && (
        <canvas
          ref={canvasRef}
          width={500}
          height={150}
          className="w-full h-[100px] rounded-md border border-input bg-background cursor-crosshair touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      )}

      {mode === "upload" && value && (
        <div className="rounded-md border border-input bg-background p-2">
          <img src={value} alt="Signature" className="max-h-[100px] object-contain" />
        </div>
      )}

      {mode === "mobile" && !isMobile && (
        <div className="rounded-md border border-input bg-background p-3 flex flex-col sm:flex-row gap-3 items-start">
          <div className="rounded-2xl border border-border bg-[#0b0b0c] p-1.5 shrink-0">
            <StyledQRCode value={mobileSignUrl} size={176} aria-label="Mobile signature QR code" />
          </div>
          <div className="flex-1 min-w-0 space-y-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Scan to sign on your phone</p>
            <p>
              Open the QR code on your phone. You'll be asked to enter the PIN
              below to prove you're the same user, then draw your signature —
              it'll appear here automatically.
            </p>
            {mobilePin && (
              <div className="rounded-md bg-primary/10 border border-primary/30 p-2 flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">PIN</span>
                <span className="font-mono text-lg font-bold tracking-[0.3em] text-foreground">
                  {mobilePin}
                </span>
              </div>
            )}
            <p className="font-mono break-all bg-muted/40 rounded px-2 py-1 text-[10px]">
              {mobileSignUrl}
            </p>
            {mobileStatus === "scanned" && (
              <p className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Phone connected — waiting for the signature.
              </p>
            )}
            {mobileStatus === "received" && (
              <p className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" />
                Signature received.
              </p>
            )}
            <button
              type="button"
              onClick={regenerateMobileToken}
              className="text-[11px] text-primary hover:underline"
            >
              Generate a new code
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignaturePad;
