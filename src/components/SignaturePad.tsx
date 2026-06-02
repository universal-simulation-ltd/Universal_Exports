import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Upload, Trash2, Smartphone } from "lucide-react";
import QRCode from "qrcode";

interface SignaturePadProps {
  value: string; // base64 data URL
  onChange: (value: string) => void;
}

// LocalStorage key prefix for the Mobile-Signature handoff. The mobile page
// at /sign-mobile/<token> writes the drawn signature here; the SignaturePad
// listens for the storage event and pulls the value into `onChange`.
const MOBILE_STORAGE_PREFIX = "exports:mobile-sig:";

function randomToken() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const SignaturePad = ({ value, onChange }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<"mobile" | "draw" | "upload">("draw");
  const [mobileToken, setMobileToken] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const mobileSignUrl = mobileToken
    ? `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/sign-mobile/${mobileToken}`
    : "";

  // Generate a token on switching into Mobile Signature mode.
  useEffect(() => {
    if (mode !== "mobile") return;
    if (!mobileToken) setMobileToken(randomToken());
  }, [mode, mobileToken]);

  // Render the QR whenever the URL changes.
  useEffect(() => {
    if (mode !== "mobile" || !mobileSignUrl || !qrCanvasRef.current) return;
    QRCode.toCanvas(qrCanvasRef.current, mobileSignUrl, {
      width: 192,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    }).catch((err) => console.error("[exports] mobile QR render failed:", err));
  }, [mode, mobileSignUrl]);

  // Listen for the mobile page to drop a signature into localStorage. Works
  // same-device (mobile + desktop on same machine, or open in two tabs); the
  // 6-digit PIN + cross-device sync is a planned follow-up.
  useEffect(() => {
    if (!mobileToken) return;
    const key = `${MOBILE_STORAGE_PREFIX}${mobileToken}`;
    function check() {
      const v = localStorage.getItem(key);
      if (v && v.startsWith("data:")) {
        onChange(v);
        localStorage.removeItem(key);
        setMode("draw");
      }
    }
    function onStorage(e: StorageEvent) {
      if (e.key === key) check();
    }
    check();
    window.addEventListener("storage", onStorage);
    const interval = window.setInterval(check, 2000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(interval);
    };
  }, [mobileToken, onChange]);

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
        <Button
          type="button"
          variant={mode === "mobile" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("mobile")}
        >
          <Smartphone className="mr-1 h-3.5 w-3.5" />
          Mobile Signature
        </Button>
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
          Upload
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

      {mode === "mobile" && (
        <div className="rounded-md border border-input bg-background p-3 flex flex-col sm:flex-row gap-3 items-start">
          <div className="rounded-md border border-border bg-white p-2 shrink-0">
            <canvas ref={qrCanvasRef} aria-label="Mobile signature QR code" />
          </div>
          <div className="flex-1 min-w-0 space-y-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Scan to sign on your phone</p>
            <p>
              Open the QR code on a mobile device. Draw your signature there and
              it'll appear here automatically.
            </p>
            <p className="font-mono break-all bg-muted/40 rounded px-2 py-1">
              {mobileSignUrl}
            </p>
            <p className="text-[10px] opacity-70">
              Demo mode — same-device sync only. A 6-digit PIN + cross-device
              sync is on the way.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignaturePad;
