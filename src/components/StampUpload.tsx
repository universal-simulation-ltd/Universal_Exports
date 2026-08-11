import { useCallback } from "react";
import { useFileDrop } from "@unisim/sdk";
import { Button } from "@/components/ui/button";
import { Stamp, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface StampUploadProps {
  /** base64 data URL of the uploaded company stamp / seal (empty when none). */
  value: string;
  onChange: (value: string) => void;
}

// Cap uploads so a large photo can't bloat the generated PDF / stored view.
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Optional company stamp / seal upload for the signature block. Modelled on the
 * signature-upload path in SignaturePad, with type + size validation. A PNG with
 * a transparent background sits best next to the signature on the agreement, so
 * that format is recommended, but any raster image is accepted.
 */
const StampUpload = ({ value, onChange }: StampUploadProps) => {
  const handleUpload = useCallback((file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG with a transparent background works best).");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Stamp image is too large — please use one under 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result);
      }
    };
    reader.onerror = () => toast.error("Couldn't read that image — please try another file.");
    reader.readAsDataURL(file);
  }, [onChange]);

  // Buttons, not a drop zone — the SDK owns the input so a stamp rejected for
  // its size or type can be re-picked once fixed, same filename and all.
  const picker = useFileDrop({
    onFiles: (files) => handleUpload(files[0]),
    accept: "image/*",
    multiple: false,
    clickToBrowse: false,
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={picker.open}
        >
          {value ? <Upload className="mr-1 h-3.5 w-3.5" /> : <Stamp className="mr-1 h-3.5 w-3.5" />}
          {value ? "Replace stamp" : "Upload stamp"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      <input {...picker.inputProps} aria-label="Upload company stamp" className="hidden" />

      {value && value.startsWith("data:") && (
        <div className="rounded-md border border-input bg-background p-2 inline-block">
          <img src={value} alt="Company stamp" className="max-h-[80px] object-contain" />
        </div>
      )}
    </div>
  );
};

export default StampUpload;
