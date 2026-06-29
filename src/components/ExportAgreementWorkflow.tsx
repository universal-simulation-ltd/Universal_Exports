import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Wand2,
  Download,
  Upload,
  Lock,
  CheckCircle2,
  Calendar as CalendarIcon,
  QrCode,
  FileCode,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SignaturePad from "@/components/SignaturePad";
import CounterSignPanel from "@/components/CounterSignPanel";
import HostedStoreDialog from "@/components/HostedStoreDialog";
import { qrPngDataUrl } from "@/components/StyledQRCode";
import { saveAgreementView } from "@/lib/agreementViewStore";
import { buildQrSheetPdf } from "@/lib/qrSheetPdf";
import { downloadDealXml } from "@/lib/dealXml";
import {
  buildAgreementPdf,
  type AgreementPdfInput,
  type AgreementSignatureBlock,
} from "@/lib/exportAgreementPdf";

interface Props {
  /** True only when the checklist has no missing items. */
  canGenerate: boolean;
  projectId: string;
  projectName: string;
  formData: Record<string, string>;
  onFieldChange: (field: string, value: string) => void;
  /**
   * Builds the PDF input from the latest form data. Called with `null` for the
   * unsigned overview and with a signature block for the signed copy. Living in
   * the parent keeps all the cross-document extraction next to the data.
   */
  buildPdfInput: (signature: AgreementSignatureBlock | null) => AgreementPdfInput;
}

/** A snapshot of the source data, ignoring the signature, for change detection. */
function snapshotOf(input: AgreementPdfInput): string {
  return JSON.stringify({ fields: input.fields, products: input.products, totals: input.totals });
}

const ExportAgreementWorkflow = ({
  canGenerate,
  projectId,
  projectName,
  formData,
  onFieldChange,
  buildPdfInput,
}: Props) => {
  // Unsigned overview, signed-by-drafter copy, and the uploaded finalised copy.
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [signedBlob, setSignedBlob] = useState<Blob | null>(null);
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [warnOpen, setWarnOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  // QR (data URL + public view link) from the most recent generate — drives the
  // printable sheet of 8 scan labels. Null until an agreement is generated, or
  // when the online-view link couldn't be minted (then the PDF has no QR either).
  const [qrInfo, setQrInfo] = useState<{ dataUrl: string; url: string } | null>(null);

  // Snapshot of the data the current PDF was generated from — used to decide
  // whether a re-generate would discard a *different* agreement (and warn).
  const snapshotRef = useRef<string>("");
  const uploadRef = useRef<HTMLInputElement>(null);

  // Revoke every object URL we own on unmount to avoid leaks.
  const urlsRef = useRef<Set<string>>(new Set());
  const trackUrl = (url: string) => { urlsRef.current.add(url); return url; };
  const revoke = (url: string | null) => {
    if (url) { URL.revokeObjectURL(url); urlsRef.current.delete(url); }
  };
  useEffect(() => () => { urlsRef.current.forEach((u) => URL.revokeObjectURL(u)); }, []);

  const signature = formData["confirmSignature"] || "";
  const signerName = formData["confirmName"] || "";

  // Build the PDF with a header QR linking to a public read-only copy.
  // Order matters: mint token → render QR → build PDF → persist row. If the
  // QR render or the persist fails, rebuild without the QR — a printed code
  // must never point at a row that doesn't exist.
  const buildPdfWithViewLink = useCallback(async (sig: AgreementSignatureBlock | null) => {
    const input = buildPdfInput(sig);
    try {
      const token = crypto.randomUUID();
      const viewUrl =
        `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/view/${token}`;
      input.qr = { dataUrl: await qrPngDataUrl(viewUrl), url: viewUrl };
      const built = buildAgreementPdf(input);
      const saved = await saveAgreementView({
        id: token,
        projectId,
        projectName,
        input,
        pdfBlob: built.blob,
      });
      if (saved) return { ...built, input };
      URL.revokeObjectURL(built.url);
    } catch (e) {
      console.error("[exports] online view link failed — generating without QR:", e);
    }
    input.qr = null;
    return { ...buildAgreementPdf(input), input };
  }, [buildPdfInput, projectId, projectName]);

  // ── Generate the unsigned overview ────────────────────────────────────────
  const doGenerate = useCallback(async () => {
    const { blob, url, input } = await buildPdfWithViewLink(null);
    // Drop any previous outputs — regenerating nulls the prior agreement.
    revoke(generatedUrl);
    revoke(signedUrl);
    revoke(finalUrl);
    setGeneratedUrl(trackUrl(url));
    setGeneratedBlob(blob);
    setSignedUrl(null);
    setSignedBlob(null);
    setFinalUrl(null);
    setQrInfo(input.qr ?? null);
    snapshotRef.current = snapshotOf(input);
    toast.success("Export Agreement generated — review it before signing.");
  }, [buildPdfWithViewLink, generatedUrl, signedUrl, finalUrl]);

  // ── Sheet of 8 printable QR scan-labels (for sticking on products) ─────────
  const handlePrintQrSheet = useCallback(() => {
    if (!qrInfo) return;
    const { blob } = buildQrSheetPdf({ dataUrl: qrInfo.dataUrl, url: qrInfo.url, projectName });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(projectName || "export").replace(/\s+/g, "-")}-qr-labels.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("QR label sheet downloaded — 8 labels ready to print.");
  }, [qrInfo, projectName]);

  // ── XML export of the deal (for re-import into other trade software) ───────
  const handleDownloadXml = useCallback(() => {
    downloadDealXml(buildPdfInput(null), `${(projectName || "export").replace(/\s+/g, "-")}.xml`);
    toast.success("Deal exported as XML.");
  }, [buildPdfInput, projectName]);

  const handleGenerateClick = useCallback(() => {
    if (!generatedUrl) {
      doGenerate();
      return;
    }
    // Already generated. Warn if the data changed or a signature was applied,
    // since regenerating discards the previous agreement (and any signatures).
    const changed = snapshotOf(buildPdfInput(null)) !== snapshotRef.current;
    if (changed || signedUrl || finalUrl) {
      setWarnOpen(true);
    } else {
      doGenerate();
    }
  }, [generatedUrl, signedUrl, finalUrl, buildPdfInput, doGenerate]);

  // ── Confirm the drafter's signature onto the generated PDF ─────────────────
  const handleConfirmSignature = useCallback(async () => {
    if (!generatedUrl) return;
    if (!signature.startsWith("data:")) {
      toast.error("Add your signature before confirming.");
      return;
    }
    if (!signerName.trim()) {
      toast.error("Enter your full name before confirming.");
      return;
    }
    const today = new Date();
    onFieldChange("confirmDate", format(today, "yyyy-MM-dd"));
    const { blob, url } = await buildPdfWithViewLink({
      name: signerName.trim(),
      dataUrl: signature,
      date: format(today, "PPP"),
    });
    revoke(signedUrl);
    revoke(finalUrl);
    setSignedUrl(trackUrl(url));
    setSignedBlob(blob);
    setFinalUrl(null);
    toast.success("Signature applied — the preview now shows the signed copy.");
  }, [generatedUrl, signature, signerName, buildPdfWithViewLink, onFieldChange, signedUrl, finalUrl]);

  // ── Upload the counter-signed / finalised PDF (They Sign) ──────────────────
  const handleUploadSignedPdf = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file.");
      return;
    }
    const url = URL.createObjectURL(file);
    revoke(finalUrl);
    setFinalUrl(trackUrl(url));
    toast.success("Finalised PDF uploaded — it now replaces the preview.");
  }, [finalUrl]);

  const downloadName = `${(projectName || "export-agreement").replace(/\s+/g, "-")}.pdf`;
  const userHasSigned = !!signedUrl;
  // A single preview that updates in place: the finalised upload if present,
  // else the drafter-signed copy, else the unsigned overview.
  const previewUrl = finalUrl ?? signedUrl ?? generatedUrl;
  const previewLabel = finalUrl
    ? "Finalised (counter-signed)"
    : signedUrl
      ? "Signed copy"
      : "Overview (unsigned)";
  const previewDownloadName = (finalUrl || signedUrl) ? `signed-${downloadName}` : downloadName;

  return (
    <div className="space-y-5 pt-2 border-t border-border">
      {/* Generate */}
      <div className="flex flex-col gap-3 max-w-xs">
        <Button
          variant="default"
          className="w-full justify-start"
          disabled={!canGenerate}
          onClick={handleGenerateClick}
        >
          <Wand2 className="mr-2 h-4 w-4" />
          {generatedUrl ? "Regenerate Export Agreement" : "Generate Export Agreement"}
        </Button>
        {!canGenerate && (
          <p className="text-xs text-muted-foreground">
            Resolve the missing checklist items above to generate the agreement.
          </p>
        )}
      </div>

      {/* Single embedded PDF preview — updates in place once the signature is
          confirmed (and again if a finalised copy is uploaded). */}
      {previewUrl && (
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">{previewLabel}</span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleDownloadXml}>
                <FileCode className="mr-1.5 h-3.5 w-3.5" />
                Download XML
              </Button>
              {qrInfo && (
                <Button type="button" variant="outline" size="sm" onClick={handlePrintQrSheet}>
                  <QrCode className="mr-1.5 h-3.5 w-3.5" />
                  Download box QR Codes
                </Button>
              )}
              <a href={previewUrl} download={previewDownloadName}>
                <Button type="button" variant="outline" size="sm">
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download PDF
                </Button>
              </a>
              <Button type="button" variant="outline" size="sm" onClick={() => setStoreOpen(true)}>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Back up…
              </Button>
            </div>
          </div>
          <iframe
            title="Export Agreement"
            src={previewUrl}
            className="w-full h-[560px] rounded-md border border-input bg-muted"
          />
        </div>
      )}

      {/* Signature panel — greyed out until the agreement is generated, because
          there's nothing to sign for until then. */}
      <div className="relative max-w-lg">
        {!generatedUrl && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              Generate the agreement before signing.
            </div>
          </div>
        )}
        <div className={cn(!generatedUrl && "pointer-events-none select-none opacity-50")}>
          <Tabs defaultValue="you" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-xs">
              <TabsTrigger value="you">You Sign</TabsTrigger>
              <TabsTrigger value="them" disabled={!userHasSigned}>
                They Sign
              </TabsTrigger>
            </TabsList>

            {/* ── You Sign ───────────────────────────────────────────────── */}
            <TabsContent value="you" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
                  <Input
                    placeholder="Enter your full name"
                    className="bg-secondary/50"
                    value={formData["confirmName"] || ""}
                    onChange={(e) => onFieldChange("confirmName", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-secondary/50",
                          !formData["confirmDate"] && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData["confirmDate"] || "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData["confirmDate"] ? new Date(formData["confirmDate"]) : undefined}
                        onSelect={(date) => onFieldChange("confirmDate", date ? format(date, "yyyy-MM-dd") : "")}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Signature</label>
                <SignaturePad
                  value={formData["confirmSignature"] || ""}
                  onChange={(val) => onFieldChange("confirmSignature", val)}
                />
              </div>
              <Button
                type="button"
                onClick={handleConfirmSignature}
                disabled={!generatedUrl || !signature}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {userHasSigned ? "Re-apply signature" : "Confirm signature"}
              </Button>
              {userHasSigned && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Signed — you can now send it to the other party in "They Sign".
                </p>
              )}
            </TabsContent>

            {/* ── They Sign — only reachable once the drafter has signed ──── */}
            <TabsContent value="them" className="space-y-5 pt-4">
              {projectId ? (
                <CounterSignPanel projectId={projectId} projectName={projectName} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Save the project first so we can attach the counter-sign link to it.
                </p>
              )}

              {/* Upload the signed PDF returned by the other party. */}
              <div className="space-y-2 pt-4 border-t border-border">
                <p className="text-sm font-medium text-foreground">Have a signed copy already?</p>
                <p className="text-xs text-muted-foreground max-w-md">
                  Upload the counter-signed PDF and it will replace the preview
                  above as the finalised agreement.
                </p>
                <input
                  ref={uploadRef}
                  type="file"
                  accept="application/pdf"
                  aria-label="Upload signed PDF"
                  className="hidden"
                  onChange={handleUploadSignedPdf}
                />
                <Button type="button" variant="outline" onClick={() => uploadRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload signed PDF
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Regenerate warning — regenerating nulls the previous agreement. */}
      <AlertDialog open={warnOpen} onOpenChange={setWarnOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate the Export Agreement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong>null the previous agreement</strong>
              {(signedUrl || finalUrl) ? " and any signatures applied to it" : ""}. You'll
              need to confirm your signature again on the new copy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doGenerate}>Regenerate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <HostedStoreDialog
        open={storeOpen}
        onClose={() => setStoreOpen(false)}
        blob={signedBlob ?? generatedBlob}
        fileName={previewDownloadName}
      />
    </div>
  );
};

export default ExportAgreementWorkflow;
