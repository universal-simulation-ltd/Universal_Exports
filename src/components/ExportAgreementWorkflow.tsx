import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFileDrop } from "@unisim/sdk";
import { BASE_PATH } from "@/lib/basePath";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  Save,
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
import StampUpload from "@/components/StampUpload";
import CounterSignPanel, { type CounterpartyHint } from "@/components/CounterSignPanel";
import HostedStoreDialog from "@/components/HostedStoreDialog";
import { type ProjectData } from "@/lib/projectStore";
import { unisimQrPngDataUrl } from "@unisim/sdk";
import { saveAgreementView } from "@/lib/agreementViewStore";
import { listSignatureTokens } from "@/lib/signatureStore";
import { downloadDealXml } from "@/lib/dealXml";
import { useI18n } from "@/lib/i18n";
import type { AgreementPdfInput, AgreementSignatureBlock, CounterpartyBox } from "@/lib/exportAgreementPdf";
import { attestationForPrint, parseStoredAttestation, type PhoneAttestation } from "@/lib/phoneAttest";

// The PDF builders (and jsPDF behind them, ~300 kB) load on first use, not
// with the editor: most visits never generate a PDF.
const loadAgreementPdf = () => import("@/lib/exportAgreementPdf");
const loadQrSheetPdf = () => import("@/lib/qrSheetPdf");

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
  /** The whole editable project — backed up by the dialog's "Save to desktop". */
  project: ProjectData;
  /** Restore a project imported from a desktop backup. */
  onImportProject: (project: ProjectData) => void;
  /** Fired after a successful generate — lets the parent collapse the checklist. */
  onGenerated?: () => void;
  /** The other party's details, defaulted into the counter-sign email form. */
  counterparty?: CounterpartyHint;
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
  project,
  onImportProject,
  onGenerated,
  counterparty,
}: Props) => {
  const { t } = useI18n();
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
  const [qrInfo, setQrInfo] = useState<{ dataUrl: string; url: string; reserved: boolean } | null>(null);
  // "Add a QR code that opens an online copy" — unticked by default. Only then
  // (or when the user makes a counter-sign link, below) is the agreement stored
  // online in exports_agreement_views; otherwise the PDF stays on this device.
  const [shareOnline, setShareOnline] = useState(false);
  // The document on screen now, and whether that exact file is stored online.
  // A counter-sign link opens the newest stored copy, so making a link stores
  // this one first if it isn't already (ensureDocumentShared).
  const currentDocRef = useRef<{ blob: Blob; input: AgreementPdfInput; counterpartyBox: CounterpartyBox | null; stored: boolean } | null>(null);

  // Snapshot of the data the current PDF was generated from — used to decide
  // whether a re-generate would discard a *different* agreement (and warn).
  const snapshotRef = useRef<string>("");
  // A button, not a drop zone — this sits at the end of a long signing flow
  // where a stray drop would be a surprise. SDK mechanics all the same.
  const signedPicker = useFileDrop({
    onFiles: (files) => handleUploadSignedPdf(files[0]),
    accept: "application/pdf",
    multiple: false,
    clickToBrowse: false,
  });

  // Revoke every object URL we own on unmount to avoid leaks.
  const urlsRef = useRef<Set<string>>(new Set());
  const trackUrl = (url: string) => { urlsRef.current.add(url); return url; };
  const revoke = (url: string | null) => {
    if (url) { URL.revokeObjectURL(url); urlsRef.current.delete(url); }
  };
  useEffect(() => () => { urlsRef.current.forEach((u) => URL.revokeObjectURL(u)); }, []);

  const signature = formData["confirmSignature"] || "";
  const signerName = formData["confirmName"] || "";
  const stamp = formData["confirmStamp"] || "";
  // Scan to sign from the UNI·SIM Hub app (platform 0306): kept with the
  // project beside the signature, and only ever used while it is about exactly
  // that image (re-checked before it is shown or printed).
  const signatureAttest = useMemo(() => parseStoredAttestation(formData["confirmSignatureAttest"]), [formData]);
  const setSignatureAttest = useCallback(
    (a: PhoneAttestation | null) => onFieldChange("confirmSignatureAttest", a ? JSON.stringify(a) : ""),
    [onFieldChange],
  );

  // Store a built agreement online (exports_agreement_views) under `token`.
  // Only ever called for one of the user's explicit choices: the QR option, or
  // a counter-sign link (see ensureDocumentShared / hasOpenSigningLink).
  const storeOnline = useCallback(async (token: string, input: AgreementPdfInput, blob: Blob, counterpartyBox: CounterpartyBox | null) => {
    try {
      return await saveAgreementView({ id: token, projectId, projectName, input, pdfBlob: blob, counterpartyBox });
    } catch (e) {
      console.error("[exports] couldn't store the agreement online:", e);
      return false;
    }
  }, [projectId, projectName]);

  // A counter-sign link opens the newest stored copy of the agreement. While a
  // link the user made is still waiting for a signature, a new version must be
  // stored too, or the other party would sign an older one.
  const hasOpenSigningLink = useCallback(async () => {
    if (!projectId || projectId.startsWith("demo-")) return false;
    try {
      const rows = await listSignatureTokens(projectId);
      return rows.some((r) => r.status === "pending");
    } catch {
      return false;
    }
  }, [projectId]);

  // Build the PDF. With "Add a QR code" ticked: render a header QR linking to a
  // public read-only copy, build, then try to reserve the online row. If that
  // succeeds, the header carries the QR and the box labels resolve. If it fails
  // (e.g. no account), we still hand back the label QR so the sheet can be made
  // — flagged `reserved:false`, so the labels get watermarked and the
  // *agreement's own header QR is dropped* (the main document must never carry
  // a code that points nowhere). Unticked: no QR, no labels, and nothing is
  // stored online unless a signing link is waiting for this project.
  const buildPdfWithViewLink = useCallback(async (sig: AgreementSignatureBlock | null) => {
    const input = buildPdfInput(sig);
    const { buildAgreementPdf } = await loadAgreementPdf();
    const token = crypto.randomUUID();
    const viewUrl =
      `${window.location.origin}${BASE_PATH}/view/${token}`;
    let dataUrl = "";
    if (shareOnline) {
      try {
        dataUrl = await unisimQrPngDataUrl(viewUrl, 256);
      } catch (e) {
        console.error("[exports] QR render failed:", e);
      }
    }

    if (dataUrl) {
      input.qr = { dataUrl, url: viewUrl };
      const built = await buildAgreementPdf(input);
      const reserved = await storeOnline(token, input, built.blob, built.counterpartyBox);
      if (reserved) {
        currentDocRef.current = { blob: built.blob, input, counterpartyBox: built.counterpartyBox, stored: true };
        return { ...built, input, labelQr: { dataUrl, url: viewUrl, reserved: true } };
      }
      // Couldn't reserve — rebuild the agreement WITHOUT its header QR, but keep
      // the (watermarked) box labels available.
      URL.revokeObjectURL(built.url);
    }

    input.qr = null;
    const labelQr = dataUrl ? { dataUrl, url: viewUrl, reserved: false } : null;
    const built = await buildAgreementPdf(input);
    const stored = (await hasOpenSigningLink())
      ? await storeOnline(token, input, built.blob, built.counterpartyBox)
      : false;
    currentDocRef.current = { blob: built.blob, input, counterpartyBox: built.counterpartyBox, stored };
    return { ...built, input, labelQr };
  }, [buildPdfInput, shareOnline, storeOnline, hasOpenSigningLink]);

  // Called by the counter-sign panel just before it makes a link: the other
  // party opens the newest stored copy, so store the one on screen if needed.
  const ensureDocumentShared = useCallback(async () => {
    const doc = currentDocRef.current;
    if (!doc) return false;
    if (doc.stored) return true;
    const ok = await storeOnline(crypto.randomUUID(), doc.input, doc.blob, doc.counterpartyBox);
    if (ok) doc.stored = true;
    return ok;
  }, [storeOnline]);

  // ── Generate the unsigned overview ────────────────────────────────────────
  const doGenerate = useCallback(async () => {
    const { blob, url, input, labelQr } = await buildPdfWithViewLink(null);
    // Drop any previous outputs — regenerating nulls the prior agreement.
    revoke(generatedUrl);
    revoke(signedUrl);
    revoke(finalUrl);
    setGeneratedUrl(trackUrl(url));
    setGeneratedBlob(blob);
    setSignedUrl(null);
    setSignedBlob(null);
    setFinalUrl(null);
    setQrInfo(labelQr);
    snapshotRef.current = snapshotOf(input);
    onGenerated?.();
    toast.success(t("wf.generated"));
  }, [buildPdfWithViewLink, generatedUrl, signedUrl, finalUrl, onGenerated, t]);

  // ── Sheet of 8 printable QR scan-labels (for sticking on products) ─────────
  const handlePrintQrSheet = useCallback(async () => {
    if (!qrInfo) return;
    const { buildQrSheetPdf } = await loadQrSheetPdf();
    const { blob } = await buildQrSheetPdf({
      dataUrl: qrInfo.dataUrl,
      url: qrInfo.url,
      projectName,
      // The label sheet is a printed document like the agreement: English.
      watermark: qrInfo.reserved ? undefined : "Requires a UNI·SIM account to reserve this link",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(projectName || "export").replace(/\s+/g, "-")}-qr-labels.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(
      qrInfo.reserved
        ? t("wf.labelsDownloaded")
        : t("wf.labelsWatermarked"),
    );
  }, [qrInfo, projectName, t]);

  // ── XML export of the deal (for re-import into other trade software) ───────
  const handleDownloadXml = useCallback(() => {
    downloadDealXml(buildPdfInput(null), `${(projectName || "export").replace(/\s+/g, "-")}.xml`);
    toast.success(t("wf.xmlExported"));
  }, [buildPdfInput, projectName, t]);

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
      toast.error(t("wf.needSignature"));
      return;
    }
    if (!signerName.trim()) {
      toast.error(t("wf.needName"));
      return;
    }
    const today = new Date();
    onFieldChange("confirmDate", format(today, "yyyy-MM-dd"));
    // Signed on a phone through the Hub app by a confirmed Universal ID: the
    // signed copy says so under the signature, with a QR to check it.
    let attest: AgreementSignatureBlock["attest"];
    const printed = await attestationForPrint(signatureAttest, signature);
    if (printed) {
      let qrDataUrl: string | undefined;
      try { qrDataUrl = await unisimQrPngDataUrl(printed.checkUrl, 256); } catch { qrDataUrl = undefined; }
      attest = { ...printed, qrDataUrl };
    }
    const { blob, url, labelQr } = await buildPdfWithViewLink({
      name: signerName.trim(),
      dataUrl: signature,
      date: format(today, "PPP"),
      stampDataUrl: stamp.startsWith("data:") ? stamp : undefined,
      attest,
    });
    revoke(signedUrl);
    revoke(finalUrl);
    setSignedUrl(trackUrl(url));
    setSignedBlob(blob);
    setFinalUrl(null);
    setQrInfo(labelQr);
    toast.success(t("wf.signatureApplied"));
  }, [generatedUrl, signature, signerName, stamp, signatureAttest, buildPdfWithViewLink, onFieldChange, signedUrl, finalUrl, t]);

  // ── Upload the counter-signed / finalised PDF (They Sign) ──────────────────
  const handleUploadSignedPdf = useCallback((file: File | undefined) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error(t("wf.notPdf"));
      return;
    }
    const url = URL.createObjectURL(file);
    revoke(finalUrl);
    setFinalUrl(trackUrl(url));
    toast.success(t("wf.finalUploaded"));
  }, [finalUrl, t]);

  const downloadName = `${(projectName || "export-agreement").replace(/\s+/g, "-")}.pdf`;
  const userHasSigned = !!signedUrl;
  // A single preview that updates in place: the finalised upload if present,
  // else the drafter-signed copy, else the unsigned overview.
  const previewUrl = finalUrl ?? signedUrl ?? generatedUrl;
  const previewLabel = finalUrl
    ? t("wf.previewFinal")
    : signedUrl
      ? t("wf.previewSigned")
      : t("wf.previewUnsigned");
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
          {generatedUrl ? t("wf.regenerate") : t("wf.generate")}
        </Button>
        {!canGenerate && (
          <p className="text-xs text-muted-foreground">
            {t("wf.resolveChecklist")}
          </p>
        )}
        <label className="flex items-start gap-2.5 cursor-pointer">
          <Checkbox
            className="mt-0.5"
            checked={shareOnline}
            onCheckedChange={(v) => setShareOnline(v === true)}
          />
          <span>
            <span className="text-sm text-foreground block">{t("wf.shareOnline")}</span>
            <span className="text-xs text-muted-foreground block">{t("wf.shareOnlineHint")}</span>
          </span>
        </label>
      </div>

      {/* Single embedded PDF preview — updates in place once the signature is
          confirmed (and again if a finalised copy is uploaded). */}
      {previewUrl && (
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">{previewLabel}</span>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Button type="button" variant="outline" size="sm" onClick={handleDownloadXml}>
                <FileCode className="mr-1.5 h-3.5 w-3.5" />
                {t("wf.downloadXml")}
              </Button>
              <a href={previewUrl} download={previewDownloadName}>
                <Button type="button" variant="outline" size="sm">
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {t("wf.downloadPdf")}
                </Button>
              </a>
              <Button type="button" variant="outline" size="sm" onClick={() => setStoreOpen(true)}>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {t("wf.backUp")}
              </Button>
              {qrInfo && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrintQrSheet}
                  title={
                    qrInfo.reserved
                      ? t("wf.labelsTitle")
                      : t("wf.labelsTitlePreview")
                  }
                >
                  <QrCode className="mr-1.5 h-3.5 w-3.5" />
                  {qrInfo.reserved ? t("wf.labels") : t("wf.labelsPreview")}
                </Button>
              )}
            </div>
          </div>
          <iframe
            title={t("public.agreement")}
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
              {t("wf.generateFirst")}
            </div>
          </div>
        )}
        <div className={cn(!generatedUrl && "pointer-events-none select-none opacity-50")}>
          <Tabs defaultValue="you" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-xs">
              <TabsTrigger value="you">{t("wf.youSign")}</TabsTrigger>
              <TabsTrigger value="them" disabled={!userHasSigned}>
                {t("wf.theySign")}
              </TabsTrigger>
            </TabsList>

            {/* ── You Sign ───────────────────────────────────────────────── */}
            <TabsContent value="you" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("wf.fullName")}</label>
                  <Input
                    placeholder={t("sign.fullNamePlaceholder")}
                    className="bg-secondary/50"
                    value={formData["confirmName"] || ""}
                    onChange={(e) => onFieldChange("confirmName", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("wf.role")}</label>
                  <Input
                    placeholder={t("wf.rolePlaceholder")}
                    className="bg-secondary/50"
                    value={formData["confirmRole"] || ""}
                    onChange={(e) => onFieldChange("confirmRole", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("sign.date")}</label>
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
                        {formData["confirmDate"] || t("wf.pickDate")}
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
                <label className="text-xs text-muted-foreground mb-1 block">{t("sign.signature")}</label>
                <SignaturePad
                  value={formData["confirmSignature"] || ""}
                  onChange={(val) => onFieldChange("confirmSignature", val)}
                  attestation={signatureAttest}
                  onAttestation={setSignatureAttest}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  {t("wf.stamp")} <span className="text-muted-foreground/70">{t("cs.optional")}</span>
                </label>
                <StampUpload
                  value={formData["confirmStamp"] || ""}
                  onChange={(val) => onFieldChange("confirmStamp", val)}
                />
              </div>
              <Button
                type="button"
                onClick={handleConfirmSignature}
                disabled={!generatedUrl || !signature}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {userHasSigned ? t("wf.reapply") : t("wf.confirm")}
              </Button>
              {userHasSigned && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("wf.signedHint")}
                </p>
              )}
            </TabsContent>

            {/* ── They Sign — only reachable once the drafter has signed ──── */}
            <TabsContent value="them" className="space-y-5 pt-4">
              {projectId ? (
                <CounterSignPanel
                  projectId={projectId}
                  projectName={projectName}
                  counterparty={counterparty}
                  drafterName={signerName}
                  drafterSignature={signature}
                  ensureDocumentShared={ensureDocumentShared}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("cs.saveFirst")}
                </p>
              )}

              {/* Upload the signed PDF returned by the other party. */}
              <div className="space-y-2 pt-4 border-t border-border">
                <p className="text-sm font-medium text-foreground">{t("wf.haveSigned")}</p>
                <p className="text-xs text-muted-foreground max-w-md">
                  {t("wf.haveSignedBody")}
                </p>
                <input {...signedPicker.inputProps} aria-label={t("wf.uploadSigned")} className="hidden" />
                <Button type="button" variant="outline" onClick={signedPicker.open}>
                  <Upload className="mr-2 h-4 w-4" />
                  {t("wf.uploadSigned")}
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
            <AlertDialogTitle>{t("wf.warnTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {(signedUrl || finalUrl) ? t("wf.warnBodySigned") : t("wf.warnBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("setup.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={doGenerate}>{t("wf.regenerateShort")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <HostedStoreDialog
        open={storeOpen}
        onClose={() => setStoreOpen(false)}
        blob={signedBlob ?? generatedBlob}
        fileName={previewDownloadName}
        project={project}
        onImportProject={onImportProject}
      />
    </div>
  );
};

export default ExportAgreementWorkflow;
