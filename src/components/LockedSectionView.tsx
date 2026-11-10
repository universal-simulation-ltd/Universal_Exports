import { CheckCircle2, Download, Pencil } from "lucide-react";
import { ValueChip } from "@unisim/sdk";
import { Button } from "@/components/ui/button";
import { translate, type MessageKey } from "@/lib/i18n";
import { useDrafterI18n } from "@/lib/i18n/drafter/useDrafterI18n";
import type { DocPdfParty } from "@/lib/documentPdf";
import type { BusinessDoc } from "@unisim/doc";

export interface DocBranding {
  from?: DocPdfParty | null;
  to?: DocPdfParty | null;
  logoDataUrl?: string;
  projectName?: string;
}

interface LockedSectionViewProps {
  /** The section's name, as a message key. */
  title: MessageKey;
  /** [label key, value] rows. */
  fields: [MessageKey, string][];
  onEdit: () => void;
  colSpanFields?: MessageKey[]; // labels that should span 2 columns
  /** When provided, shows a "Download PDF" button that exports this document,
   *  stamped with the issuer's logo + company details. */
  branding?: DocBranding;
  /** The quote, invoice, delivery note or packing list as a line-item
   *  document (lib/businessPdf.ts): Download PDF prints that instead of the rows. */
  businessDoc?: BusinessDoc | null;
}

// Titles and labels are message keys so the screen can show them in the app's
// language while the downloaded PDF keeps printing them in English — the
// generated documents stay in English on purpose (see documentPdf.ts).
const english = (key: MessageKey) => translate("en", key);

const LockedSectionView = ({ title, fields, onEdit, colSpanFields = [], branding, businessDoc }: LockedSectionViewProps) => {
  const { t, date } = useDrafterI18n();

  // jsPDF loads on the first download, not with the editor.
  const handleDownload = async () => {
    if (businessDoc) {
      const { downloadBusinessPdf } = await import("@/lib/businessPdf");
      await downloadBusinessPdf(businessDoc, english(title), branding?.logoDataUrl);
      return;
    }
    const { downloadDocumentPdf } = await import("@/lib/documentPdf");
    await downloadDocumentPdf({
      title: english(title),
      fields: fields.map(([label, value]) => [english(label), value]),
      colSpanFields: colSpanFields.map(english),
      from: branding?.from,
      to: branding?.to,
      logoDataUrl: branding?.logoDataUrl,
      projectName: branding?.projectName,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-foreground">{t(title)}</h2>
        <ValueChip tone="good" label={<CheckCircle2 aria-hidden="true" />}>{t("lock.sectionAccepted")}</ValueChip>
      </div>
      <div className="grid grid-cols-2 gap-4 max-w-lg">
        {fields.map(([label, value]) => (
          <div key={label} className={colSpanFields.includes(label) ? "col-span-2" : ""}>
            <p className="text-xs text-muted-foreground">{t(label)}</p>
            <p className="text-sm font-medium text-foreground">{value ? date(value) : "—"}</p>
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
