import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Upload, Trash2, Smartphone, CheckCircle2 } from "lucide-react";
import { UnisimQr, useDefaultView } from "@unisim/sdk";
import { supabase } from "@/lib/supabase";
import { BASE_PATH } from "@/lib/basePath";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/lib/i18n";
import { isImageDataUrl } from "@/lib/safeDataUrl";
import { toast } from "sonner";
import { SIGNATURE_MODE_ID, SIGNATURE_MODES, type SignatureMode } from "@/components/SignatureModePreference";

// What an uploaded signature may be: these are what jsPDF embeds and what
// every viewer of the counter-signature will accept (see safeDataUrl.ts).
const UPLOAD_TYPES = ["image/png", "image/jpeg"];

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

// The default mode is orange: filled while it is the one showing, an orange
// outline while it is not (Jukebox's look — SDK README ▸ Default views).
const DEFAULT_ACTIVE =
  "data-[default-view=true]:bg-gradient-to-br data-[default-view=true]:from-[#FE8C01] data-[default-view=true]:to-[#E05504] data-[default-view=true]:text-white";
const DEFAULT_IDLE =
  "data-[default-view=true]:border-orange-400/70 data-[default-view=true]:text-orange-700 dark:data-[default-view=true]:text-orange-400";

const SignaturePad = ({ value, onChange }: SignaturePadProps) => {
  // When the drafter is already on a phone there's no point offering the
  // "scan a QR to sign on your phone" handoff — they can just draw directly.
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const dv = useDefaultView<SignatureMode>(SIGNATURE_MODE_ID, "draw", { views: SIGNATURE_MODES });
  // ⚠️ Worked out here, not from `isMobile`: that hook answers false on the
  // first render and only corrects itself in an effect, and a phone that
  // started in Mobile mode would already have minted a token and opened a
  // Realtime channel for a QR it never shows. Same 768px breakpoint as
  // hooks/use-mobile.
  const [mode, setMode] = useState<SignatureMode>(() =>
    dv.defaultView === "mobile" && window.innerWidth < 768 ? "draw" : dv.defaultView,
  );
  const [mobileToken, setMobileToken] = useState<string | null>(null);
  const [mobilePin, setMobilePin] = useState<string | null>(null);
  const [mobileStatus, setMobileStatus] = useState<"idle" | "waiting" | "scanned" | "received">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  const mobileSignUrl = mobileToken
    ? `${window.location.origin}${BASE_PATH}/sign-mobile/${mobileToken}`
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
        // Only a real image — the phone side is a public page.
        if (!isImageDataUrl(sig)) return;
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
    e.target.value = ""; // so choosing the same file again still fires
    if (!file) return;
    if (!UPLOAD_TYPES.includes(file.type)) {
      toast.error(t("pad.badFile"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (isImageDataUrl(reader.result as string)) {
        onChange(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  }, [onChange, t]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {!isMobile && (
          <Button
            type="button"
            variant={mode === "mobile" ? "default" : "outline"}
            size="sm"
            {...dv.buttonProps("mobile", t("pad.mobile"))}
            className={mode === "mobile" ? DEFAULT_ACTIVE : DEFAULT_IDLE}
            onClick={() => { dv.tap("mobile"); setMode("mobile"); }}
            aria-pressed={mode === "mobile"}
          >
            <Smartphone className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            {t("pad.mobile")}
          </Button>
        )}
        <Button
          type="button"
          variant={mode === "draw" ? "default" : "outline"}
          size="sm"
          {...dv.buttonProps("draw", t("pad.draw"))}
          className={mode === "draw" ? DEFAULT_ACTIVE : DEFAULT_IDLE}
          onClick={() => { dv.tap("draw"); setMode("draw"); }}
          aria-pressed={mode === "draw"}
        >
          <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          {t("pad.draw")}
        </Button>
        {/* ⚠️ The file picker opens on the first click, so its second click
            never reaches the button on a desktop: Upload's default is set from
            Tune this app ▸ "Signature opens on" (SignatureModePreference.tsx). */}
        <Button
          type="button"
          variant={mode === "upload" ? "default" : "outline"}
          size="sm"
          {...dv.buttonProps("upload", t("pad.upload"))}
          className={mode === "upload" ? DEFAULT_ACTIVE : DEFAULT_IDLE}
          onClick={() => { dv.tap("upload"); setMode("upload"); fileRef.current?.click(); }}
          aria-pressed={mode === "upload"}
        >
          <Upload className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          {t("pad.upload")}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
            <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            {t("pad.clear")}
          </Button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={UPLOAD_TYPES.join(",")}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleUpload}
      />

      {mode === "draw" && (
        <canvas
          ref={canvasRef}
          width={500}
          height={200}
          role="img"
          aria-label={t("pad.canvasLabel")}
          // White like paper in both themes: the ink is dark, and on the dark
          // theme's background a fresh signature was all but invisible.
          className="w-full h-[140px] rounded-md border border-input bg-white cursor-crosshair touch-none"
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
        <div className="rounded-md border border-input bg-white p-2">
          <img src={value} alt={t("pad.uploadedAlt")} className="max-h-[140px] object-contain" />
        </div>
      )}

      {mode === "mobile" && !isMobile && (
        <div className="rounded-md border border-input bg-background p-3 flex flex-col sm:flex-row gap-3 items-start">
          <div className="rounded-2xl border border-border bg-white p-1.5 shrink-0">
            <UnisimQr value={mobileSignUrl} size={176} label="signing on your phone" />
          </div>
          <div className="flex-1 min-w-0 space-y-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{t("pad.scanTitle")}</p>
            <p>{t("pad.scanBody")}</p>
            {mobilePin && (
              <div className="rounded-md bg-primary/10 border border-primary/30 p-2 flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">{t("pad.pin")}</span>
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
                {t("pad.connected")}
              </p>
            )}
            {mobileStatus === "received" && (
              <p className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                {t("pad.received")}
              </p>
            )}
            {mobileStatus === "received" && value?.startsWith("data:") && (
              <div className="rounded-md border border-border bg-white p-1.5">
                <img
                  src={value}
                  alt={t("pad.receivedAlt")}
                  className="max-h-[120px] w-full object-contain"
                />
              </div>
            )}
            <button
              type="button"
              onClick={regenerateMobileToken}
              className="text-[11px] text-primary hover:underline py-1"
            >
              {t("pad.newCode")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignaturePad;
