import { useEffect, useRef } from "react";
import QRCodeStyling, { type Options } from "qr-code-styling";
import unisimIcon from "@/assets/unisim-icon.png";

interface Props {
  /** The URL the QR code should open. */
  value: string;
  /** Rendered width/height in px. Fixed for the lifetime of the mount. */
  size?: number;
  className?: string;
  "aria-label"?: string;
}

// Brand-styled QR: orange, fluid rounded modules on a near-black tile with the
// UniSim globe mark in the middle — mirroring the look the team uses elsewhere.
// Error correction is forced to "H" so the centre logo (which masks a chunk of
// modules) doesn't stop the code from scanning.
const QR_COLOR = "#F97316"; // orange-500 — the app's accent colour
const QR_BG = "#0b0b0c";    // near-black tile

const buildOptions = (value: string, size: number): Options => ({
  width: size,
  height: size,
  type: "canvas",
  data: value,
  image: unisimIcon,
  margin: 8,
  qrOptions: { errorCorrectionLevel: "H" },
  dotsOptions: { type: "extra-rounded", color: QR_COLOR },
  cornersSquareOptions: { type: "extra-rounded", color: QR_COLOR },
  cornersDotOptions: { type: "dot", color: QR_COLOR },
  backgroundOptions: { color: QR_BG, round: 0.12 },
  imageOptions: { crossOrigin: "anonymous", margin: 6, imageSize: 0.24, hideBackgroundDots: true },
});

const StyledQRCode = ({ value, size = 200, className, "aria-label": ariaLabel }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  // Create + append the styled canvas once. The library renders into the
  // container element rather than a caller-owned <canvas>.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    qrRef.current = new QRCodeStyling(buildOptions(value, size));
    qrRef.current.append(el);
    return () => {
      // Drop the appended canvas so a re-mount doesn't stack duplicates.
      el.innerHTML = "";
      qrRef.current = null;
    };
    // `value`/`size` changes are handled by the update effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-draw in place when the URL (or size) changes.
  useEffect(() => {
    qrRef.current?.update(buildOptions(value, size));
  }, [value, size]);

  return <div ref={containerRef} className={className} role="img" aria-label={ariaLabel} />;
};

export default StyledQRCode;
