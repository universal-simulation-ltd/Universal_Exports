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
// Thin quiet zone — the card wrapper around this component carries the visible
// padding, so we don't want a second thick black band baked into the canvas.
const QUIET_ZONE = 2;

// Render the canvas at the screen's pixel density (capped) and display it at the
// logical size via CSS. Without this the code — and the 1080px centre logo —
// get rasterised at 1× and look soft on high-DPI/mobile screens.
const renderScale = () =>
  Math.min(Math.max(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 1), 3);

const buildOptions = (value: string, size: number, scale: number): Options => ({
  width: size * scale,
  height: size * scale,
  type: "canvas",
  data: value,
  image: unisimIcon,
  margin: QUIET_ZONE * scale,
  qrOptions: { errorCorrectionLevel: "H" },
  dotsOptions: { type: "extra-rounded", color: QR_COLOR },
  cornersSquareOptions: { type: "extra-rounded", color: QR_COLOR },
  cornersDotOptions: { type: "dot", color: QR_COLOR },
  backgroundOptions: { color: QR_BG, round: 0.12 },
  imageOptions: { crossOrigin: "anonymous", margin: 6 * scale, imageSize: 0.24, hideBackgroundDots: true },
});

const StyledQRCode = ({ value, size = 200, className, "aria-label": ariaLabel }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  // Pin the upscaled canvas back to its logical CSS size so the extra render
  // resolution buys sharpness rather than a bigger element.
  const fitDisplaySize = (el: HTMLElement) => {
    const canvas = el.querySelector("canvas");
    if (canvas) {
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    }
  };

  // Create + append the styled canvas once. The library renders into the
  // container element rather than a caller-owned <canvas>.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    qrRef.current = new QRCodeStyling(buildOptions(value, size, renderScale()));
    qrRef.current.append(el);
    fitDisplaySize(el);
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
    qrRef.current?.update(buildOptions(value, size, renderScale()));
    if (containerRef.current) fitDisplaySize(containerRef.current);
  }, [value, size]);

  return <div ref={containerRef} className={className} role="img" aria-label={ariaLabel} />;
};

export default StyledQRCode;
