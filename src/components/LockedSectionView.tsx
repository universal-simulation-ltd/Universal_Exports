import { CheckCircle2, Download, Pencil } from "lucide-react";
import { ValueChip } from "@unisim/sdk";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { downloadDocumentPdf, type DocPdfParty } from "@/lib/documentPdf";

export interface DocBranding {
  from?: DocPdfParty | null;
  to?: DocPdfParty | null;
  logoDataUrl?: string;
  projectName?: string;
}

interface LockedSectionViewProps {
  title: string;
  fields: [string, string][];
  onEdit: () => void;
  colSpanFields?: string[]; // labels that should span 2 columns
  /** When provided, shows a "Download PDF" button that exports this document,
   *  stamped with the issuer's logo + company details. */
  branding?: DocBranding;
}

const LockedSectionView = ({ title, fields, onEdit, colSpanFields = [], branding }: LockedSectionViewProps) => {
  const { t } = useI18n();

  const handleDownload = () => {
    downloadDocumentPdf({
      title,
      fields,
      colSpanFields,
      from: branding?.from,
      to: branding?.to,
      logoDataUrl: branding?.logoDataUrl,
      projectName: branding?.projectName,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <ValueChip tone="good" label={<CheckCircle2 aria-hidden="true" />}>{t("lock.sectionAccepted")}</ValueChip>
      </div>
      <div className="grid grid-cols-2 gap-4 max-w-lg">
        {fields.map(([label, value]) => (
          <div key={label} className={colSpanFields.includes(label) ? "col-span-2" : ""}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-medium text-foreground">{value || "—"}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> {t("lock.edit")}
        </Button>
        {branding && (
          <Button
            variant="outline"
            size="sm"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            onClick={handleDownload}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> {t("doc.downloadPdf")}
          </Button>
        )}
      </div>
    </div>
  );
};

export default LockedSectionView;
