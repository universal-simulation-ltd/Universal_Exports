import { useState, useCallback, useMemo, useRef, useEffect, useId } from "react";
import { useNavigate } from "react-router-dom";
import { Chip, ValueChip, useFileDrop } from "@unisim/sdk";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowRight, ArrowLeft, FileCheck, Upload, Wand2, Save, UserPlus, Trash2, Pencil, Paperclip, X, Copy, ExternalLink, CheckCircle2, Check, AlertTriangle, Circle, Search, Landmark, FolderPlus, Sparkles, Undo2, Loader2, FileText, Award, Anchor } from "lucide-react";
import TooltipLabel from "@/components/TooltipLabel";
import ProductDetails from "@/components/ProductDetails";
import CustomsLookup from "@/components/CustomsLookup";
import ExportAgreementWorkflow from "@/components/ExportAgreementWorkflow";
import LockedSectionView from "@/components/LockedSectionView";
import ueIcon from "@/assets/universal-exports-icon.svg";
import ScrollFadeWrapper from "@/components/ScrollFadeWrapper";
import { ProjectData, saveProject, createProjectId, deleteProject } from "@/lib/projectStore";
import { CompanyDetails, loadYourDetails, saveYourDetails, loadContacts, saveContact, deleteContact, emptyDetails } from "@/lib/contactStore";
import { loadCatalogue, catalogueDisplayTitle } from "@/lib/productCatalogueStore";
import { DEMO_CATALOGUE, DEMO_OTHER_PARTY } from "@/lib/demoProject";
import { BankAccount, emptyBankAccount, loadYourBanks, saveYourBanks, loadPartyBanks, savePartyBanks } from "@/lib/bankStore";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { type MessageKey } from "@/lib/i18n";
import { fillNodes } from "@/lib/i18n/format";
import { useDrafterI18n } from "@/lib/i18n/drafter/useDrafterI18n";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MainContentProps {
  projectId: string;
  projectName: string;
  setProjectName: (name: string) => void;
  started: boolean;
  onStart: () => void;
  onBackToSetup?: () => void;
  selectedDoc: string | null;
  formData: Record<string, string>;
  allForms: Record<string, Record<string, string>>;
  onFieldChange: (field: string, value: string) => void;
  onSave: () => void;
  savedProjects: ProjectData[];
  onLoadProject: (project: ProjectData) => void;
  /** The whole editable project, for the "Save to desktop" backup in the agreement dialog. */
  currentProject: ProjectData;
  /** Restore a project imported from a desktop backup (loads it into the editor). */
  onImportProject: (project: ProjectData) => void;
  showSavedList: boolean;
  onNavigate?: (docId: string) => void;
  role: "buyer" | "seller" | "";
  setRole: (role: "buyer" | "seller" | "") => void;
  accepted?: boolean;
  onAccept?: () => void;
  onConfirmNewProject?: () => void;
  lockedSections?: Set<string>;
  onLockSection?: (sectionId: string) => void;
  onUnlockSection?: (sectionId: string) => void;
  editingSections?: Set<string>;
  onCancelEdit?: (sectionId: string) => void;
  demoParties?: { yourDetails: CompanyDetails; otherParty: CompanyDetails } | null;
  onLoadDemo?: () => void;
  demoImported?: boolean;
  onRunDemoImport?: () => void;
}

const documentTypes = [
  "estimate-quote", "purchase-order", "invoice", "picking-list", "delivery-note", "credit-note", "receipt",
];

// Sensible default legal wording for a Certificate of Origin declaration. It is
// the document's own text (printed on the generated PDF, which stays in English
// on purpose), so it is pre-filled in English whatever the app's language.
const DEFAULT_COO_DECLARATION =
  "We, the undersigned, hereby declare that the goods described above originate in the country stated and comply with the applicable rules of origin.";

// Documents the demo "AI import" pulls in — shown on the upload, processing and done screens
const DEMO_IMPORT_DOCS: { key: MessageKey; ref?: string }[] = [
  { key: "ai.doc.invoice", ref: "INV-2026-0089" },
  { key: "ai.doc.po", ref: "PO-DBE-20260312" },
  { key: "ai.doc.dn", ref: "DN-2026-0089" },
  { key: "ai.doc.coo" },
  { key: "ai.doc.shipment" },
];

// The trade documents' names, by section id — the sidebar's labels.
const DOC_TITLE_KEYS: Record<string, MessageKey> = {
  "estimate-quote": "sidebar.estimateQuote",
  "purchase-order": "sidebar.purchaseOrder",
  "invoice": "sidebar.invoice",
  "picking-list": "sidebar.pickingList",
  "delivery-note": "sidebar.deliveryNote",
  "credit-note": "sidebar.creditNote",
  "receipt": "sidebar.receipt",
};

// Incoterms® 2020: the code is never translated, the rule's name is.
const INCOTERM_CODES = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"] as const;

// Compliance checklists: the form field each tick is stored under, and its label.
const EXPORT_CHECKS: { key: string; label: MessageKey }[] = [
  { key: "exportCds", label: "compl.exportCds" },
  { key: "exportLicence", label: "compl.exportLicence" },
  { key: "exportEori", label: "compl.eori" },
  { key: "exportInvoice", label: "compl.exportInvoice" },
  { key: "exportSanctions", label: "compl.exportSanctions" },
];
const IMPORT_CHECKS: { key: string; label: MessageKey }[] = [
  { key: "importCds", label: "compl.importCds" },
  { key: "importDuty", label: "compl.importDuty" },
  { key: "importVat", label: "compl.importVat" },
  { key: "importEori", label: "compl.eori" },
  { key: "importLicence", label: "compl.importLicence" },
  { key: "importSafety", label: "compl.importSafety" },
  { key: "importPhyto", label: "compl.importPhyto" },
];

function getProductTotals(allForms: Record<string, Record<string, string>>, catalogue: import("@/lib/productCatalogueStore").CatalogueProduct[]) {
  try {
    const raw = allForms["product-details"]?.productLines;
    if (!raw) return { totalBeforeTax: 0, totalTax: 0, totalIncTax: 0 };
    const lines = JSON.parse(raw) as { catalogueId: string; units: string; discount: string; discountAmount?: string }[];
    let totalBeforeTax = 0;
    let totalTax = 0;
    for (const l of lines) {
      const product = catalogue.find((p) => p.id === l.catalogueId);
      if (!product) continue;
      const units = parseFloat(l.units) || 0;
      const discount = parseFloat(l.discount) || 0;
      const fixedDiscount = parseFloat(l.discountAmount || "0") || 0;
      const sub = product.unitPrice * units;
      const discounted = Math.max(0, sub - sub * (discount / 100) - fixedDiscount);
      totalBeforeTax += discounted;
      totalTax += discounted * (product.vatPercent / 100);
    }
    return { totalBeforeTax, totalTax, totalIncTax: totalBeforeTax + totalTax };
  } catch {
    return { totalBeforeTax: 0, totalTax: 0, totalIncTax: 0 };
  }
}

const emptyCompany = emptyDetails;

const CooFileAttachment = ({ field, set, onFieldChange }: { field: (k: string) => string; set: (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; onFieldChange: (f: string, v: string) => void }) => {
  const fileName = field("cooFileName");
  const { t, tf } = useDrafterI18n();

  const handleAttach = useCallback((file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("coo.fileTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onFieldChange("cooFileName", file.name);
      onFieldChange("cooFileData", reader.result as string);
      toast.success(tf("coo.attached", { name: file.name }));
    };
    reader.readAsDataURL(file);
  }, [onFieldChange, t, tf]);

  // The hook clears the input's value after every pick, so removing an
  // attachment no longer has to reach into the DOM to make the same file
  // attachable again.
  const picker = useFileDrop({
    onFiles: (files) => handleAttach(files[0]),
    accept: ".pdf,.jpg,.jpeg,.png,.doc,.docx",
    multiple: false,
    clickToBrowse: false,
  });

  const handleRemove = useCallback(() => {
    onFieldChange("cooFileName", "");
    onFieldChange("cooFileData", "");
  }, [onFieldChange]);

  return (
    <div className="flex items-center gap-2">
      <input {...picker.inputProps} className="hidden" />
      {fileName ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-3 py-1.5 text-sm">
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-foreground truncate max-w-[200px]">{fileName}</span>
          <button onClick={handleRemove} aria-label={t("coo.removeAttachment")} title={t("coo.removeAttachment")} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="text-xs" onClick={picker.open}>
          <Paperclip className="mr-1 h-3.5 w-3.5" />
          {t("coo.attach")}
        </Button>
      )}
    </div>
  );
};

// Checklist item for eboxy validation
const EboxyCheckItem = ({ check, onNavigate }: {
  check: { label: string; status: "pass" | "warn" | "missing"; details?: string; links?: { label: string; docId: string }[] };
  onNavigate?: (docId: string) => void;
}) => {
  const [accepted, setAccepted] = useState(false);
  const { t } = useDrafterI18n();
  const icon = check.status === "pass" || accepted
    ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
    : check.status === "warn"
    ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
    : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />;

  return (
    <div className={`rounded-lg border p-3 ${check.status === "warn" && !accepted ? "border-destructive/40 bg-destructive/5" : check.status === "missing" ? "border-border bg-muted/30" : "border-border"}`}>
      <div className="flex items-start gap-2.5">
        {icon}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{check.label}</p>
          {check.details && <p className="text-xs text-muted-foreground mt-0.5">{check.details}</p>}
          {check.links && check.links.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {check.links.map((link) => (
                <button
                  key={link.docId}
                  onClick={() => onNavigate?.(link.docId)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  → {link.label}
                </button>
              ))}
            </div>
          )}
          {check.status === "warn" && !accepted && (
            <button
              onClick={() => setAccepted(true)}
              className="mt-2 text-xs text-destructive/80 hover:text-destructive underline"
            >
              {t("agree.acceptDiscrepancy")}
            </button>
          )}
          {accepted && (
            <p className="mt-1 text-xs text-muted-foreground italic">{t("agree.discrepancyAccepted")}</p>
          )}
        </div>
      </div>
    </div>
  );
};
const ToolLink = ({ label, url, desc }: { label: string; url: string; desc: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex flex-col gap-1 rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors"
  >
    <span className="text-sm font-medium text-foreground flex items-center gap-2">
      <ExternalLink className="h-4 w-4 text-primary" />
      {label}
    </span>
    <span className="text-xs text-muted-foreground">{desc}</span>
  </a>
);

const ROW_HEIGHT = 56; // approximate px per project row
const HEADER_FOOTER = 180; // header + search + pagination + padding

const SavedProjectsList = ({
  savedProjects,
  onLoadProject,
}: {
  savedProjects: ProjectData[];
  onLoadProject: (project: ProjectData) => void;
}) => {
  const { t, tf, shortDate } = useDrafterI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(8);
  const [savedPage, setSavedPage] = useState(0);
  const [projects, setProjects] = useState(savedProjects);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setProjects(savedProjects);
  }, [savedProjects]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      // Use scrollHeight of parent or offsetHeight to get actual available space
      const h = el.parentElement?.clientHeight || el.offsetHeight || 700;
      const available = h - HEADER_FOOTER;
      setVisibleCount(Math.max(2, Math.floor(available / ROW_HEIGHT)));
    };
    // Small delay to let layout settle
    const timer = setTimeout(measure, 50);
    const observer = new ResizeObserver(() => {
      const h = el.parentElement?.clientHeight || el.offsetHeight || 700;
      const available = h - HEADER_FOOTER;
      setVisibleCount(Math.max(2, Math.floor(available / ROW_HEIGHT)));
    });
    if (el.parentElement) observer.observe(el.parentElement);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / visibleCount));
  const safePage = Math.min(savedPage, totalPages - 1);
  const pageProjects = filtered.slice(safePage * visibleCount, (safePage + 1) * visibleCount);

  const handleDelete = async (id: string, name: string) => {
    // The project's QR view copies and counter-sign links are deleted with it
    // (platform migration 0193), so a printed QR stops resolving — say so.
    if (!window.confirm(tf("main.deleteConfirm", { name }))) return;
    await deleteProject(id);
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    toast.success(tf("main.deleted", { name }));
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col p-8 min-h-0 overflow-hidden">
      <h2 className="text-lg font-semibold text-foreground mb-3">{t("saved.title")}</h2>
      {projects.length > 0 && (
        <div className="mb-3 max-w-md">
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder={t("main.searchProjects")}
              aria-label={t("main.searchProjects")}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSavedPage(0); }}
            />
          </div>
        </div>
      )}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{search ? t("main.noMatchingProjects") : t("saved.empty")}</p>
      ) : (
        <>
          <div className="space-y-2 max-w-md flex-1 min-h-0 overflow-y-auto">
            {pageProjects.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 px-4 py-3 rounded-md border border-border hover:bg-secondary/50 transition-colors"
              >
                <button
                  onClick={() => onLoadProject(p)}
                  className="flex-1 flex items-center justify-between text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{shortDate(p.createdAt)}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  title={t("main.duplicate")}
                  aria-label={t("main.duplicate")}
                  onClick={async (e) => {
                    e.stopPropagation();
                    const newName = window.prompt(t("main.duplicateName"), tf("main.copyName", { name: p.name }));
                    if (!newName || !newName.trim()) return;
                    const duplicate: ProjectData = {
                      id: createProjectId(),
                      name: newName.trim(),
                      createdAt: new Date().toISOString(),
                      role: p.role ?? '',
                      forms: JSON.parse(JSON.stringify(p.forms)),
                      lockedSections: [...(p.lockedSections ?? [])],
                      savedSections: [...(p.savedSections ?? [])],
                      eboxyGenerated: false,
                    };
                    await saveProject(duplicate);
                    setProjects([...projects, duplicate]);
                    toast.success(tf("main.duplicated", { name: duplicate.name }));
                  }}
                >
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 hover:text-destructive"
                  title={t("main.deleteProject")}
                  aria-label={t("main.deleteProject")}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(p.id, p.name);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage === 0}
                aria-label={t("common.prevPage")}
                onClick={() => setSavedPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {safePage + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages - 1}
                aria-label={t("common.nextPage")}
                onClick={() => setSavedPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const MainContent = ({
  projectId,
  projectName,
  setProjectName,
  started,
  onStart,
  onBackToSetup,
  selectedDoc,
  formData,
  allForms,
  onFieldChange,
  onSave,
  savedProjects,
  onLoadProject,
  currentProject,
  onImportProject,
  showSavedList,
  onNavigate,
  role,
  setRole,
  accepted,
  onAccept,
  onConfirmNewProject,
  lockedSections = new Set(),
  onLockSection,
  onUnlockSection,
  editingSections = new Set(),
  onCancelEdit,
  demoParties,
  onLoadDemo,
  demoImported,
  onRunDemoImport,
}: MainContentProps) => {
  const { t, tf, tp, money, date } = useDrafterI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const renderSectionButtons = (sectionId: string, saveLabel: string) => {
    const isReEditing = editingSections.has(sectionId);
    if (isReEditing) {
      return (
        <div className="flex gap-2 mt-2">
          <Button variant="outline" onClick={() => onCancelEdit?.(sectionId)}>
            <Undo2 className="mr-1.5 h-3.5 w-3.5" /> {t("main.makeNoChanges")}
          </Button>
          <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => { onSave(); onLockSection?.(sectionId); }}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" /> {t("lock.acceptLock")}
          </Button>
        </div>
      );
    }
    return (
      <div className="flex gap-2 mt-2">
        <Button onClick={onSave}>{saveLabel}</Button>
        <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => { onSave(); onLockSection?.(sectionId); }}>
          <CheckCircle2 className="mr-1.5 h-4 w-4" /> {t("lock.acceptLock")}
        </Button>
      </div>
    );
  };
  const [setupStep, setSetupStep] = useState<"name" | "role">(
    projectName.trim() ? "role" : "name"
  );
  const [expandedParty, setExpandedParty] = useState<"you" | "other" | null>("other");
  const [showSetupYourDetails, setShowSetupYourDetails] = useState(false);
  const [showSetupOtherParty, setShowSetupOtherParty] = useState(false);
  const [tradeTypeOverride, setTradeTypeOverride] = useState<"domestic" | "international" | null>(null);
  
  const [yourDetailsMode, setYourDetailsMode] = useState<"" | "form">("");
  const [otherPartyMode, setOtherPartyMode] = useState<"" | "addressbook" | "create">("");
  const [contactSearch, setContactSearch] = useState("");
  const [editingOtherParty, setEditingOtherParty] = useState(false);
  const [editingYourDetails, setEditingYourDetails] = useState(false);
  const [shipmentIfKnownOpen, setShipmentIfKnownOpen] = useState(false);

  // Universal Exports AI demo — simulated PDF upload + extraction
  const [demoImporting, setDemoImporting] = useState(false);
  const demoImportTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (demoImportTimer.current) clearTimeout(demoImportTimer.current); }, []);

  // Point of truth — the user confirms the agreed total deal price BEFORE
  // importing, so the extracted documents can be checked against it. Prefilled
  // on the example project; required (gates the upload button) otherwise.
  const [potTotal, setPotTotal] = useState("");
  useEffect(() => { if (demoParties) setPotTotal("9825.00"); }, [demoParties]);

  const handleUploadPdfs = useCallback(() => {
    onFieldChange?.("pointOfTruthTotal", potTotal.trim());
    setDemoImporting(true);
    demoImportTimer.current = setTimeout(() => {
      onRunDemoImport?.();
    }, 1600);
  }, [onRunDemoImport, onFieldChange, potTotal]);

  // Getting Started checklist open/close — starts closed if all items already ticked (e.g. demo)
  const [gsOpen, setGsOpen] = useState(() => {
    const raw = (allForms["handy-tools"] || {})["gettingStartedChecked"];
    if (!raw) return true;
    try { return !(JSON.parse(raw) as boolean[]).every(Boolean); } catch { return true; }
  });
  const GS_ITEMS = [
    { label: "tools.gs.business", url: "https://www.gov.uk/set-up-business", desc: "tools.gs.businessDesc" },
    { label: "tools.gs.vat", url: "https://www.gov.uk/vat-registration", desc: "tools.gs.vatDesc" },
    { label: "tools.gs.eori", url: "https://www.gov.uk/eori", desc: "tools.gs.eoriDesc" },
    { label: "tools.gs.cds", url: "https://www.gov.uk/guidance/get-access-to-the-customs-declaration-service", desc: "tools.gs.cdsDesc" },
  ] as const;
  const gsChecked = useMemo((): boolean[] => {
    const raw = allForms["handy-tools"]?.gettingStartedChecked;
    try { return JSON.parse(raw || "[]"); } catch { return []; }
  }, [allForms]);
  const gsAllChecked = gsChecked.length >= GS_ITEMS.length && gsChecked.every(Boolean);
  const handleGsCheck = useCallback((index: number, val: boolean) => {
    const arr = GS_ITEMS.map((_, i) => (i === index ? val : (gsChecked[i] ?? false)));
    onFieldChange?.("gettingStartedChecked", JSON.stringify(arr));
    if (arr.every(Boolean)) setGsOpen(false);
  }, [gsChecked, onFieldChange]);

  const resetSetupState = useCallback(() => {
    setSetupStep("name");
    setOtherParty(emptyCompany());
    setExpandedParty("other");
    setShowSetupOtherParty(true);
    setShowSetupYourDetails(false);
    setOtherPartyMode("");
    setContactSearch("");
    setEditingOtherParty(false);
    setEditingYourDetails(false);
    setEditingContactIndex(null);
    setTradeTypeOverride(null);
    setShipmentIfKnownOpen(false);
  }, []);

  const handleConfirmNewProject = useCallback(() => {
    resetSetupState();
    onConfirmNewProject?.();
  }, [resetSetupState, onConfirmNewProject]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollIntoViewSmooth = useCallback((el: HTMLElement | null) => {
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }, []);
  const foldId = useId();

  // Product catalogue (for totals)
  const [catalogue, setCatalogue] = useState<import("@/lib/productCatalogueStore").CatalogueProduct[]>([]);

  useEffect(() => {
    // Merge rather than overwrite: this resolves async, so a plain set would
    // wipe the demo products the demoParties effect below may have already
    // prepended (leaving demo product lines with no catalogue match and blank
    // totals on the agreement).
    loadCatalogue().then((stored) =>
      setCatalogue((prev) => {
        const demo = prev.filter((p) => p.id.startsWith("demo-"));
        return [...demo, ...stored.filter((p) => !p.id.startsWith("demo-"))];
      })
    );
  }, []);

  // Your details (for setup)
  const [yourDetails, setYourDetails] = useState<CompanyDetails>(emptyDetails());
  // Other party details (for setup)
  const [otherParty, setOtherParty] = useState<CompanyDetails>(emptyCompany());

  // The pre-generation checklist collapses once the agreement is generated, to
  // free the screen for the PDF preview. Open by default; closed on Generate.
  const [agreementChecklistOpen, setAgreementChecklistOpen] = useState(true);

  // Address book editing states
  const [editYourDetails, setEditYourDetails] = useState<CompanyDetails>(emptyDetails());
  const [contacts, setContacts] = useState<CompanyDetails[]>([]);

  useEffect(() => {
    // If demo is active on mount, skip loading stored details — demoParties effect handles them
    if (!demoParties) {
      loadYourDetails().then((d) => { setYourDetails(d); setEditYourDetails(d); });
    }
    loadContacts().then(setContacts);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply demo party details and catalogue when a demo project is loaded
  useEffect(() => {
    if (demoParties) {
      setYourDetails(demoParties.yourDetails as CompanyDetails);
      setEditYourDetails(demoParties.yourDetails as CompanyDetails);
      setOtherParty(demoParties.otherParty as CompanyDetails);
      // Merge demo products into catalogue (prepend so they're found first)
      setCatalogue((prev) => {
        const withoutDemo = prev.filter((p) => !p.id.startsWith("demo-"));
        return [...DEMO_CATALOGUE, ...withoutDemo];
      });
    }
  }, [demoParties]);
  const [logoDataUrl, setLogoDataUrl] = useState<string>(() => localStorage.getItem("ebill-logo") || "");
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);

  const field = (key: string) => (formData || {})[key] || "";
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onFieldChange(key, e.target.value);

  const isDocumentType = selectedDoc ? documentTypes.includes(selectedDoc) : false;

  const txn = allForms["transaction"] || {};
  const ship = allForms["shipment"] || {};
  const cooData = allForms["coo"] || {};
  const productTotals = useMemo(() => getProductTotals(allForms, catalogue), [allForms, catalogue]);

  const preDate = new Date().toISOString().split("T")[0];
  const preFrom = yourDetails.registeredName || "";
  const preCounterparty = otherParty.registeredName || (role === "seller" ? txn.drawee : role === "buyer" ? txn.drawer : (txn.drawee || txn.drawer || ""));
  const preAmount = productTotals.totalIncTax > 0 ? productTotals.totalIncTax.toFixed(2) : txn.billAmount || "";
  const preCurrency = txn.currency || "";

  // Branding stamped onto every downloadable document PDF (issuer logo + details,
  // counterparty, project name). Passed to each LockedSectionView's Download PDF.
  const docBranding = useMemo(
    () => ({ from: yourDetails, to: otherParty, logoDataUrl: logoDataUrl || undefined, projectName }),
    [yourDetails, otherParty, logoDataUrl, projectName],
  );

  // Dynamic counterparty label: if I'm seller, other party is buyer and vice versa
  const counterpartyKey: MessageKey = role === "seller" ? "doc.buyer" : role === "buyer" ? "doc.seller" : "doc.counterparty";
  const counterpartyLabel = t(counterpartyKey);

  const docField = (key: string, preValue: string) => {
    const v = field(key);
    return v || preValue;
  };

  const handleContinueToRole = useCallback(async () => {
    // Refresh your details from storage
    const saved = await loadYourDetails();
    setYourDetails(saved);
    setSetupStep("role");
  }, []);

  const handleFinishSetup = useCallback(async () => {
    // Save your details if they have content
    if (yourDetails.registeredName.trim()) {
      await saveYourDetails(yourDetails);
    }
    onStart();
    setSetupStep("name");
    setOtherPartyMode("");
    // Don't reset otherParty — keep it for the project overview
  }, [onStart, yourDetails]);

  const handleLogoUpload = useCallback((file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("main.logoNotImage"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("main.logoTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoDataUrl(dataUrl);
      localStorage.setItem("ebill-logo", dataUrl);
      toast.success(t("main.logoUploaded"));
    };
    reader.readAsDataURL(file);
  }, [t]);

  // Same picker for both places the logo control is rendered (the standalone
  // "Your details" panel and the one inside the project drawer) — one input,
  // one set of mechanics, and re-uploading the same file still fires.
  const logoPicker = useFileDrop({
    onFiles: (files) => handleLogoUpload(files[0]),
    accept: "image/*",
    multiple: false,
    clickToBrowse: false,
  });

  const handleRemoveLogo = useCallback(() => {
    setLogoDataUrl("");
    localStorage.removeItem("ebill-logo");
  }, []);

  const handleSaveYourDetails = useCallback(async () => {
    await saveYourDetails(editYourDetails);
    setYourDetails(editYourDetails);
    toast.success(t("toast.detailsSaved"));
  }, [editYourDetails, t]);

  const handleSaveAsContact = useCallback(async () => {
    if (!otherParty.registeredName.trim()) {
      toast.error(t("toast.enterName"));
      return;
    }
    await saveContact(otherParty);
    loadContacts().then(setContacts);
    toast.success(tf("proj.contactSaved", { name: otherParty.registeredName }));
  }, [otherParty, t, tf]);

  const handleDeleteContact = useCallback(async (id: string) => {
    await deleteContact(id);
    loadContacts().then(setContacts);
    toast.success(t("toast.contactRemoved"));
  }, [t]);

  const handleSelectContact = useCallback((contact: CompanyDetails) => {
    setOtherParty({ ...contact });
    // Save as last used contact
    try { localStorage.setItem("ebill-last-contact", JSON.stringify(contact)); } catch { /* storage blocked: only a convenience */ }
  }, []);

  // Company details form fragment
  const companyFields = (
    details: CompanyDetails,
    onChange: (d: CompanyDetails) => void,
    label: string
  ) => (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("field.registeredName")}</label>
        <Input placeholder={t("field.registeredName")} className="bg-secondary/50" value={details.registeredName} onChange={(e) => onChange({ ...details, registeredName: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("field.tradingName")}</label>
        <Input placeholder={t("field.tradingName")} className="bg-secondary/50" value={details.tradingName} onChange={(e) => onChange({ ...details, tradingName: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("field.companyNumber")}</label>
        <Input placeholder={tf("common.eg", { example: "12345678" })} className="bg-secondary/50" value={details.companyNumber} onChange={(e) => onChange({ ...details, companyNumber: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("field.vatNumber")}</label>
        <Input placeholder={tf("common.eg", { example: "GB123456789" })} className="bg-secondary/50" value={details.vatNumber} onChange={(e) => onChange({ ...details, vatNumber: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("party.eori")}</label>
        <Input placeholder={tf("common.eg", { example: "GB123456789000" })} className="bg-secondary/50" value={details.eoriNumber || ""} onChange={(e) => onChange({ ...details, eoriNumber: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("field.address")}</label>
        <Input placeholder={t("field.address")} className="bg-secondary/50" value={details.address} onChange={(e) => onChange({ ...details, address: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("party.country")}</label>
        <Input placeholder={t("party.countryPlaceholder")} className="bg-secondary/50" value={details.country || ""} onChange={(e) => onChange({ ...details, country: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("field.contactName")}</label>
        <Input placeholder={t("field.contactName")} className="bg-secondary/50" value={details.contactName || ""} onChange={(e) => onChange({ ...details, contactName: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("field.telephone")}</label>
        <Input placeholder={tf("common.eg", { example: "+44 20 1234 5678" })} className="bg-secondary/50" value={details.telephone || ""} onChange={(e) => onChange({ ...details, telephone: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("field.email")}</label>
        <Input type="email" placeholder={tf("common.eg", { example: "john@example.com" })} className="bg-secondary/50" value={details.email || ""} onChange={(e) => onChange({ ...details, email: e.target.value })} />
      </div>
    </div>
  );

  // ── Address Book: Your Details ──
  if (selectedDoc === "your-details") {
    return (
      <ScrollFadeWrapper className="flex-1 flex flex-col p-8 overflow-y-auto">
        <h2 className="text-lg font-semibold text-foreground mb-1">{t("yourDetails.title")}</h2>
        <p className="text-sm text-muted-foreground mb-6">{t("yourDetails.desc")}</p>
        <div className="max-w-sm space-y-3">
          {/* Logo upload */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">{t("main.businessLogo")}</label>
            <input {...logoPicker.inputProps} className="hidden" />
            {logoDataUrl ? (
              <div className="flex items-center gap-3">
                <img
                  src={logoDataUrl}
                  alt={t("main.businessLogo")}
                  className="h-16 w-16 object-contain rounded-md border border-border bg-secondary/30 p-1"
                />
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="text-xs" onClick={logoPicker.open}>
                    {t("common.change")}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={handleRemoveLogo} aria-label={t("main.removeLogo")} title={t("main.removeLogo")}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="text-xs" onClick={logoPicker.open}>
                <Upload className="mr-1 h-3.5 w-3.5" />
                {t("main.uploadLogo")}
              </Button>
            )}
          </div>
          {companyFields(editYourDetails, setEditYourDetails, "")}
          <Button onClick={handleSaveYourDetails} className="mt-4">
            <Save className="mr-2 h-4 w-4" />
            {t("yourDetails.save")}
          </Button>
        </div>
      </ScrollFadeWrapper>
    );
  }

  // ── Address Book: Contacts ──
  if (selectedDoc === "contacts") {
    return (
      <ScrollFadeWrapper className="flex-1 flex flex-col p-8 overflow-y-auto">
        <h2 className="text-lg font-semibold text-foreground mb-1">{t("contacts.title")}</h2>
        <p className="text-sm text-muted-foreground mb-6">{t("contacts.desc")}</p>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("contacts.empty")}</p>
        ) : (
          <div className="space-y-2 max-w-md">
            {contacts.map((c, i) => (
              <div key={i} className="rounded-md border border-border">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.registeredName}</p>
                    {c.tradingName && <p className="text-xs text-muted-foreground">{tf("main.tradingAsShort", { name: c.tradingName })}</p>}
                    {c.companyNumber && <p className="text-xs text-muted-foreground">#{c.companyNumber}</p>}
                    {c.vatNumber && <p className="text-xs text-muted-foreground">{t("overview.vat")}: {c.vatNumber}</p>}
                    {c.address && <p className="text-xs text-muted-foreground">{c.address}</p>}
                    {c.country && <p className="text-xs text-muted-foreground">{tf("party.countryValue", { country: c.country })}</p>}
                    {c.contactName && <p className="text-xs text-muted-foreground">{t("overview.contact")}: {c.contactName}</p>}
                    {c.telephone && <p className="text-xs text-muted-foreground">{t("overview.tel")}: {c.telephone}</p>}
                    {c.email && <p className="text-xs text-muted-foreground">{t("field.email")}: {c.email}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" aria-label={t("main.editContact")} title={t("main.editContact")} onClick={() => setEditingContactIndex(editingContactIndex === i ? null : i)} aria-expanded={editingContactIndex === i} aria-controls={`${foldId}-contact-${i}`}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={t("main.deleteContact")} title={t("main.deleteContact")} onClick={() => handleDeleteContact(c.id || '')}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                {editingContactIndex === i && (
                  <div id={`${foldId}-contact-${i}`} className="px-4 pb-4 border-t border-border pt-3">
                    {companyFields(c, (updated) => {
                      const newContacts = [...contacts];
                      newContacts[i] = updated;
                      setContacts(newContacts);
                    }, "")}
                    <Button size="sm" className="mt-3" onClick={async () => {
                      await saveContact(contacts[i]);
                      loadContacts().then(setContacts);
                      setEditingContactIndex(null);
                      toast.success(t("toast.contactUpdated"));
                    }}>
                      {t("contacts.saveChanges")}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollFadeWrapper>
    );
  }

  // ── Not started screens ──
  if (!started && !showSavedList) {
    if (setupStep === "name") {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-10">
          <FileCheck className="h-12 w-12 text-primary mb-4" />
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            {t("setup.title")}
          </h1>
          <p className="text-sm text-muted-foreground mb-8 text-center max-w-sm">
            {t("setup.subtitle")}
          </p>
          <div className="w-full max-w-xs space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t("setup.projectName")}</label>
              <Input
                placeholder={t("main.projectNamePlaceholder")}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-secondary/50"
              />
            </div>
            <Button onClick={handleContinueToRole} disabled={!projectName.trim()} className="w-full">
              {t("setup.continue")} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {onLoadDemo && (
            <div className="mt-10 w-full max-w-xs">
              <div className="relative flex items-center mb-4">
                <div className="flex-1 border-t border-border" />
                <span className="mx-3 text-xs text-muted-foreground uppercase tracking-wider">{t("common.or")}</span>
                <div className="flex-1 border-t border-border" />
              </div>
              <div className="relative rounded-lg">
                {savedProjects.length === 0 && (
                  <div className="absolute -inset-[2px] rounded-lg bg-gradient-to-br from-primary/60 via-primary/20 to-primary/60 animate-pulse" />
                )}
                <button
                  onClick={onLoadDemo}
                  className={`relative w-full flex items-center gap-3 rounded-lg px-4 py-3.5 transition-colors text-left group ${
                    savedProjects.length === 0
                      ? "bg-card border border-primary/20 hover:bg-primary/5"
                      : "border border-border hover:bg-secondary/50 hover:border-primary/30"
                  }`}
                >
                  <img src={ueIcon} alt="Universal Exports" className="h-10 w-auto shrink-0 object-contain group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("example.title")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("example.desc")}</p>
                    {savedProjects.length === 0 && (
                      <p className="text-xs text-primary mt-1 font-medium">{t("example.new")}</p>
                    )}
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Role + your details + other party details step
    return (
      <ScrollFadeWrapper className="flex-1 flex flex-col p-8 overflow-y-auto">
        <h1 className="text-xl font-semibold text-foreground mb-1">{t("setup.projectSetup")}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {t("setup.projectSetupDesc")}
        </p>
        <div className="max-w-lg space-y-6">
          {/* Role selection */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t("setup.yourRole")}</p>
            <div className="flex gap-3">
              <Button
                variant={role === "seller" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setRole("seller")}
              >
                {t("setup.seller")}
              </Button>
              <Button
                variant={role === "buyer" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setRole("buyer")}
              >
                {t("setup.buyer")}
              </Button>
            </div>
          </div>

          {role && (
            <>
              {/* Your details - collapsed by default */}
              <div className="border-t border-border pt-5">
                <div className="rounded-md border border-border overflow-hidden">
                  <button
                    onClick={() => {
                      const opening = !showSetupYourDetails;
                      setShowSetupYourDetails(opening);
                      if (!opening) setYourDetailsMode("");
                    }}
                    aria-expanded={showSetupYourDetails}
                    aria-controls={`${foldId}-setup-you`}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">{t("setup.yourDetails")}</p>
                      <p className="text-sm font-medium text-foreground">{yourDetails.registeredName || t("setup.notSet")}</p>
                    </div>
                    {showSetupYourDetails ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  {showSetupYourDetails && (
                    <div id={`${foldId}-setup-you`} className="px-4 pb-4 pt-2 border-t border-border space-y-3">
                      {/* When no details saved yet, show choice; otherwise show form */}
                      {!yourDetails.registeredName && yourDetailsMode !== "form" ? (
                        <div className="space-y-2 pt-1">
                          <p className="text-xs text-muted-foreground">{t("proj.chooseDetails")}</p>
                          <button
                            onClick={() => {
                              setYourDetails({
                                registeredName: "Universal Simulation Ltd",
                                tradingName: "UniSim",
                                companyNumber: "12345678",
                                vatNumber: "GB123456789",
                                address: "1 Simulation House, Tech Park, London, EC1A 1BB",
                                country: "United Kingdom",
                                contactName: "Demo User",
                                telephone: "+44 20 1234 5678",
                                email: "demo@universal-simulation.com",
                              } as CompanyDetails);
                              setShowSetupYourDetails(false);
                              setYourDetailsMode("");
                            }}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-md border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">{tf("proj.exampleCompany", { name: "Universal Simulation Ltd" })}</p>
                              <p className="text-xs text-muted-foreground">{t("proj.exampleCompanyDesc")}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                          </button>
                          <button
                            onClick={() => setYourDetailsMode("form")}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-md border border-border hover:bg-secondary/50 transition-colors text-left"
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">{t("proj.addDetails")}</p>
                              <p className="text-xs text-muted-foreground">{t("proj.addDetailsDesc")}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Logo upload */}
                          <div>
                            <label className="text-sm font-medium text-foreground mb-1 block">{t("main.businessLogo")}</label>
                            <input {...logoPicker.inputProps} className="hidden" />
                            {logoDataUrl ? (
                              <div className="flex items-center gap-3">
                                <img
                                  src={logoDataUrl}
                                  alt={t("main.businessLogo")}
                                  className="h-16 w-16 object-contain rounded-md border border-border bg-secondary/30 p-1"
                                />
                                <div className="flex gap-1">
                                  <Button variant="outline" size="sm" className="text-xs" onClick={logoPicker.open}>
                                    {t("common.change")}
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={handleRemoveLogo} aria-label={t("main.removeLogo")} title={t("main.removeLogo")}>
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button variant="outline" size="sm" className="text-xs" onClick={logoPicker.open}>
                                <Upload className="mr-1 h-3.5 w-3.5" />
                                {t("main.uploadLogo")}
                              </Button>
                            )}
                          </div>
                          {companyFields(yourDetails, setYourDetails, "")}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Other party */}
              <div className="border-t border-border pt-5">
                <div className="rounded-md border border-border overflow-hidden">
                  <div className="flex items-center">
                    <button
                      onClick={() => setShowSetupOtherParty((v) => !v)}
                      aria-expanded={showSetupOtherParty}
                      aria-controls={`${foldId}-setup-other`}
                      className="flex-1 flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
                    >
                      <div>
                        <p className="text-xs text-muted-foreground">{role === "buyer" ? t("setup.seller") : t("setup.buyer")}</p>
                        <p className="text-sm font-medium text-foreground">{otherParty.registeredName || t("setup.notSet")}</p>
                      </div>
                      {showSetupOtherParty ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    {otherParty.registeredName && (
                      <button
                        onClick={() => { setOtherParty(emptyCompany()); setOtherPartyMode(""); setShowSetupOtherParty(true); }}
                        className="px-3 py-3 hover:bg-destructive/10 transition-colors"
                        title={t("proj.removeSelectedParty")}
                        aria-label={t("proj.removeSelectedParty")}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </button>
                    )}
                  </div>
                  {showSetupOtherParty && (
                    <div id={`${foldId}-setup-other`} className="px-4 pb-4 pt-2 border-t border-border space-y-3">
                      {otherPartyMode === "" && (() => {
                        let lastContact: CompanyDetails | null = null;
                        try {
                          const raw = localStorage.getItem("ebill-last-contact");
                          if (raw) lastContact = JSON.parse(raw);
                        } catch { /* blocked storage or bad JSON: no suggestion */ }

                        return (
                          <div className="space-y-3">
                            <button
                              onClick={() => {
                                setOtherParty(DEMO_OTHER_PARTY as CompanyDetails);
                                setOtherPartyMode("create");
                                setShowSetupOtherParty(false);
                              }}
                              className="w-full flex items-center justify-between px-4 py-3 rounded-md border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                            >
                              <div>
                                <p className="text-sm font-medium text-foreground">{tf("proj.exampleCompany", { name: "Dubois Équipements SAS" })}</p>
                                <p className="text-xs text-muted-foreground">{tf("proj.exampleRoleDesc", { role: role === "buyer" ? t("setup.seller") : t("setup.buyer") })}</p>
                              </div>
                              <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                            </button>
                            <div className="flex gap-3">
                              <Button variant="outline" className="flex-1" onClick={() => setOtherPartyMode("addressbook")}>
                                {t("setup.addressBook")}
                              </Button>
                              <Button variant="outline" className="flex-1" onClick={() => { setOtherPartyMode("create"); setOtherParty(emptyCompany()); }}>
                                {t("setup.createNew")}
                              </Button>
                            </div>
                            {lastContact && lastContact.registeredName && (
                              <button
                                onClick={() => { handleSelectContact(lastContact!); setOtherPartyMode("create"); setShowSetupOtherParty(false); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                              >
                                <span className="text-xs text-muted-foreground shrink-0">{t("proj.lastUsed")}</span>
                                <span className="text-sm font-medium text-foreground truncate flex-1">{lastContact.registeredName}</span>
                                <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      {otherPartyMode === "addressbook" && (
                        <div ref={scrollIntoViewSmooth} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder={t("setup.searchContacts")}
                              className="bg-secondary/50"
                              value={contactSearch}
                              onChange={(e) => setContactSearch(e.target.value)}
                            />
                            <Button variant="ghost" size="sm" onClick={() => { setOtherPartyMode(""); setContactSearch(""); }}>
                               {t("setup.cancel")}
                            </Button>
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {contacts
                              .filter((c) => {
                                const q = contactSearch.toLowerCase();
                                return !q || c.registeredName.toLowerCase().includes(q) || c.tradingName.toLowerCase().includes(q) || c.companyNumber.toLowerCase().includes(q);
                              })
                              .map((c, i) => (
                                <button
                                  key={i}
                                  onClick={() => { handleSelectContact(c); setOtherPartyMode("create"); setContactSearch(""); setShowSetupOtherParty(false); }}
                                  className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-border hover:bg-secondary/50 transition-colors text-left"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{c.registeredName}</p>
                                    {c.tradingName && <p className="text-xs text-muted-foreground">{tf("main.tradingAsShort", { name: c.tradingName })}</p>}
                                  </div>
                                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              ))}
                            {contacts.filter((c) => {
                              const q = contactSearch.toLowerCase();
                              return !q || c.registeredName.toLowerCase().includes(q) || c.tradingName.toLowerCase().includes(q);
                            }).length === 0 && (
                              <p className="text-sm text-muted-foreground py-2">{t("setup.noContacts")}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {otherPartyMode === "create" && (
                        <div ref={scrollIntoViewSmooth} className="space-y-3">
                          {companyFields(otherParty, setOtherParty, "")}
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleSaveAsContact}>
                              <UserPlus className="mr-2 h-3.5 w-3.5" />
                               {t("setup.saveAsContact")}
                             </Button>
                             <Button variant="ghost" size="sm" onClick={() => { setOtherPartyMode(""); setOtherParty(emptyCompany()); }}>
                               {t("setup.cancel")}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

               <Button onClick={handleFinishSetup} disabled={!yourDetails.registeredName.trim() || !otherParty.registeredName?.trim()} className="w-full">
                 {t("setup.createProject")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </ScrollFadeWrapper>
    );
  }

// Bank account form fields
const BankAccountForm = ({ account, onChange, showSortCode }: {
  account: BankAccount;
  onChange: (a: BankAccount) => void;
  showSortCode?: boolean;
}) => (
  <div className="space-y-3">
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">{t("bank.accountName")}</label>
      <Input placeholder={tf("common.eg", { example: "Acme Ltd" })} className="bg-secondary/50" value={account.accountName} onChange={(e) => onChange({ ...account, accountName: e.target.value })} />
    </div>
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">{t("bank.bankName")}</label>
      <Input placeholder={tf("common.eg", { example: "Barclays" })} className="bg-secondary/50" value={account.bankName} onChange={(e) => onChange({ ...account, bankName: e.target.value })} />
    </div>
    {showSortCode && (
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("bank.sortCode")}</label>
        <Input placeholder={tf("common.eg", { example: "20-00-00" })} className="bg-secondary/50" value={account.sortCode} onChange={(e) => onChange({ ...account, sortCode: e.target.value })} />
      </div>
    )}
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">{t("bank.accountNumber")}</label>
      <Input placeholder={tf("common.eg", { example: "12345678" })} className="bg-secondary/50" value={account.accountNumber} onChange={(e) => onChange({ ...account, accountNumber: e.target.value })} />
    </div>
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">IBAN</label>
      <Input placeholder={tf("common.eg", { example: "GB29 NWBK 6016 1331 9268 19" })} className="bg-secondary/50" value={account.iban} onChange={(e) => onChange({ ...account, iban: e.target.value })} />
    </div>
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">BIC / SWIFT</label>
      <Input placeholder={tf("common.eg", { example: "BARCGB22" })} className="bg-secondary/50" value={account.bicSwift} onChange={(e) => onChange({ ...account, bicSwift: e.target.value })} />
    </div>
  </div>
);

// Currency Select with "Other" dialog
const CURRENCY_OPTIONS = [
  { value: "GBP", label: "GBP £" },
  { value: "EUR", label: "EUR €" },
  { value: "USD", label: "USD $" },
];

const CurrencySelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherCode, setOtherCode] = useState("");
  const [otherSymbol, setOtherSymbol] = useState("");

  const isStandard = CURRENCY_OPTIONS.some((c) => c.value === value);
  const displayValue = isStandard ? value : value || "other";

  const handleChange = (v: string) => {
    if (v === "other") {
      setOtherCode("");
      setOtherSymbol("");
      setOtherOpen(true);
    } else {
      onChange(v);
    }
  };

  const handleOtherConfirm = () => {
    if (otherCode.trim()) {
      onChange(otherCode.trim().toUpperCase());
      setOtherOpen(false);
    }
  };

  return (
    <>
      <Select value={displayValue} onValueChange={handleChange}>
        <SelectTrigger className="bg-secondary/50">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURRENCY_OPTIONS.map((c) => (
            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
          ))}
          <SelectItem value="other">
            {!isStandard && value ? tf("currency.otherValue", { code: value }) : t("currency.other")}
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={otherOpen} onOpenChange={setOtherOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("currency.customTitle")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t("currency.code")}</label>
              <Input
                placeholder="XXX"
                maxLength={3}
                className="bg-secondary/50 uppercase"
                value={otherCode}
                onChange={(e) => setOtherCode(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t("currency.symbol")}</label>
              <Input
                placeholder="$"
                maxLength={3}
                className="bg-secondary/50"
                value={otherSymbol}
                onChange={(e) => setOtherSymbol(e.target.value)}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOtherOpen(false)}>{t("setup.cancel")}</Button>
            <Button onClick={handleOtherConfirm} disabled={!otherCode.trim()}>{t("common.confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Bank Details Section
const BankDetailsSection = ({ txnCurrency, locked, onLock, onUnlock, isReEditing, onCancelEdit }: { txnCurrency: string; locked?: boolean; onLock?: () => void; onUnlock?: () => void; isReEditing?: boolean; onCancelEdit?: () => void }) => {
  const currencies = ["GBP", "EUR", "USD", "Other"];
  const [yourCurrency, setYourCurrency] = useState("GBP");
  const [partyCurrency, setPartyCurrency] = useState("GBP");
  const [yourOpen, setYourOpen] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);
  const foldId = useId();
  const [yourBanks, setYourBanks] = useState<Record<string, BankAccount>>({});
  const [partyBanks, setPartyBanks] = useState<Record<string, BankAccount>>({});
  const [confirmDelete, setConfirmDelete] = useState<{ type: "your" | "party"; currency: string } | null>(null);

  useEffect(() => {
    loadYourBanks().then(setYourBanks);
    loadPartyBanks().then(setPartyBanks);
  }, []);

  const currentYourAccount = yourBanks[yourCurrency] || emptyBankAccount(yourCurrency);
  const currentPartyAccount = partyBanks[partyCurrency] || emptyBankAccount(partyCurrency);

  const handleYourChange = useCallback((account: BankAccount) => {
    setYourBanks((prev) => {
      const updated = { ...prev, [yourCurrency]: { ...account, currency: yourCurrency } };
      saveYourBanks(updated);
      return updated;
    });
  }, [yourCurrency]);

  const handlePartyChange = useCallback((account: BankAccount) => {
    setPartyBanks((prev) => {
      const updated = { ...prev, [partyCurrency]: { ...account, currency: partyCurrency } };
      savePartyBanks(updated);
      return updated;
    });
  }, [partyCurrency]);

  const handleDeleteBank = useCallback((type: "your" | "party", currency: string) => {
    if (type === "your") {
      setYourBanks((prev) => {
        const updated = { ...prev };
        delete updated[currency];
        saveYourBanks(updated);
        return { ...updated };
      });
    } else {
      setPartyBanks((prev) => {
        const updated = { ...prev };
        delete updated[currency];
        savePartyBanks(updated);
        return { ...updated };
      });
    }
    toast.success(tf("bank.deleted", { currency: currency === "Other" ? t("currency.other") : currency }));
    setConfirmDelete(null);
  }, []);

  const isFilled = (a: BankAccount) => !!(a.accountName || a.bankName || a.accountNumber || a.iban);

  const yourFilledCount = currencies.filter((c) => isFilled(yourBanks[c] || emptyBankAccount())).length;
  const partyFilledCount = currencies.filter((c) => isFilled(partyBanks[c] || emptyBankAccount())).length;

  const canLock = yourFilledCount >= 1 && partyFilledCount >= 1;
  // "Other" is a stored key; only its label is translated.
  const currencyLabel = (cur: string) => (cur === "Other" ? t("currency.other") : cur);

  if (locked) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-foreground">{t("sidebar.bankDetails")}</h2>
          <ValueChip tone="good" label={<CheckCircle2 aria-hidden="true" />}>{t("lock.sectionAccepted")}</ValueChip>
        </div>
        <div className="max-w-lg space-y-2">
          <p className="text-sm text-foreground">{tp("bank.yourCount", yourFilledCount)}</p>
          <p className="text-sm text-foreground">{tp("bank.partyCount", partyFilledCount)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onUnlock}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> {t("lock.edit")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">{t("sidebar.bankDetails")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("bank.desc")}</p>
      </div>

      {/* Your Bank Details - collapsible */}
      <div className="rounded-md border border-border overflow-hidden">
        <button
          onClick={() => setYourOpen((v) => !v)}
          aria-expanded={yourOpen}
          aria-controls={`${foldId}-your-bank`}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
        >
          <div>
            <p className="text-xs text-muted-foreground">{t("bank.yours")}</p>
            <p className="text-sm font-medium text-foreground">
              {yourFilledCount > 0 ? tp("bank.set", yourFilledCount) : t("bank.notSet")}
            </p>
          </div>
          {yourOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {yourOpen && (
          <div id={`${foldId}-your-bank`} className="px-4 pb-4 pt-2 border-t border-border space-y-4">
            <div className="flex gap-1 rounded-lg bg-secondary/50 p-1">
              {currencies.map((cur) => (
                <button
                  key={cur}
                  onClick={() => setYourCurrency(cur)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    yourCurrency === cur
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {currencyLabel(cur)}
                  {isFilled(yourBanks[cur] || emptyBankAccount()) && (
                    <CheckCircle2 className="inline ml-1 h-3 w-3 text-primary" />
                  )}
                </button>
              ))}
            </div>
            <div className="max-w-sm">
              <BankAccountForm
                account={currentYourAccount}
                onChange={handleYourChange}
                showSortCode={yourCurrency === "GBP"}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">{t("bank.autoSaved")}</p>
                {isFilled(currentYourAccount) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmDelete({ type: "your", currency: yourCurrency })}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    {tf("bank.deleteCurrency", { currency: currencyLabel(yourCurrency) })}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Other Party Bank Details - collapsible */}
      <div className="rounded-md border border-border overflow-hidden">
        <button
          onClick={() => setPartyOpen((v) => !v)}
          aria-expanded={partyOpen}
          aria-controls={`${foldId}-party-bank`}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
        >
          <div>
            <p className="text-xs text-muted-foreground">{t("bank.party")}</p>
            <p className="text-sm font-medium text-foreground">
              {partyFilledCount > 0 ? tp("bank.set", partyFilledCount) : t("bank.notSet")}
            </p>
          </div>
          {partyOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {partyOpen && (
          <div id={`${foldId}-party-bank`} className="px-4 pb-4 pt-2 border-t border-border space-y-4">
            <div className="flex gap-1 rounded-lg bg-secondary/50 p-1">
              {currencies.map((cur) => (
                <button
                  key={cur}
                  onClick={() => setPartyCurrency(cur)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    partyCurrency === cur
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {currencyLabel(cur)}
                  {isFilled(partyBanks[cur] || emptyBankAccount()) && (
                    <CheckCircle2 className="inline ml-1 h-3 w-3 text-primary" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("bank.partyHint")} {partyCurrency !== "GBP" && t("bank.swiftHint")}
            </p>
            <div className="max-w-sm">
              <BankAccountForm
                account={currentPartyAccount}
                onChange={handlePartyChange}
                showSortCode={partyCurrency === "GBP"}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">{t("bank.autoSaved")}</p>
                {isFilled(currentPartyAccount) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmDelete({ type: "party", currency: partyCurrency })}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    {tf("bank.deleteCurrency", { currency: currencyLabel(partyCurrency) })}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("bank.deleteTitle")}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted-foreground">
              {tf(confirmDelete?.type === "your" ? "bank.deleteConfirmYours" : "bank.deleteConfirmParty", { currency: currencyLabel(confirmDelete?.currency ?? "") })}
            </p>
          </DialogBody>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>{t("setup.cancel")}</Button>
            <Button variant="destructive" size="sm" onClick={() => confirmDelete && handleDeleteBank(confirmDelete.type, confirmDelete.currency)}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canLock && (
        <div className="flex gap-2">
          {isReEditing && (
            <Button variant="outline" onClick={onCancelEdit}>
              <Undo2 className="mr-1.5 h-3.5 w-3.5" /> {t("main.makeNoChanges")}
            </Button>
          )}
          <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={onLock}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" /> {t("lock.acceptLock")}
          </Button>
        </div>
      )}
      {!canLock && (
        <p className="text-xs text-muted-foreground italic">{t("lock.bankHint")}</p>
      )}
    </div>
  );
};


  if (showSavedList) {
    return <SavedProjectsList savedProjects={savedProjects} onLoadProject={onLoadProject} />;
  }

  // ── Main content area ──
  return (
    <ScrollFadeWrapper className="flex-1 flex flex-col p-8 overflow-y-auto">
      <div className="mb-6 flex items-baseline gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("overview.project")}</p>
          <h1 className="text-lg font-semibold text-foreground">{projectName}</h1>
        </div>
        {role && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            role === "seller" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
          }`}>
            {role === "seller" ? t("main.export") : t("main.import")}
          </span>
        )}
      </div>

      {selectedDoc === "new-project" ? (
        <div className="flex-1 flex flex-col items-center justify-center p-10">
          <img src={ueIcon} alt="Universal Exports" className="h-12 w-12 mb-4 object-contain" />
          <h2 className="text-xl font-semibold text-foreground mb-2">{t("main.newTitle")}</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
            {fillNodes(t("main.newBody"), { name: <span className="font-medium text-foreground">"{projectName}"</span> })}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onNavigate?.("project-overview")}>
              {t("setup.cancel")}
            </Button>
            <Button onClick={handleConfirmNewProject}>
              {t("setup.continue")}
            </Button>
          </div>
        </div>
      ) : !selectedDoc && accepted ? (
        <div className="flex-1 flex flex-col items-center justify-center p-10">
          <ChevronLeft className="h-10 w-10 text-primary mb-3" />
          <p className="text-lg font-medium text-foreground">{t("main.selectSection")}</p>
          <button
            onClick={() => onNavigate?.("ai-import")}
            className="mt-6 flex items-center gap-3 rounded-md border border-border px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">{t("sidebar.eboxyAI")}</p>
              <p className="text-xs text-muted-foreground">{t("main.importWithAi")}</p>
            </div>
          </button>
        </div>
      ) : selectedDoc === "project-overview" && lockedSections?.has("project-overview") ? (
        (() => {
          const yourCountry = (yourDetails.country || "").trim().toLowerCase();
          const otherCountry = (otherParty.country || "").trim().toLowerCase();
          const isInternational = yourCountry && otherCountry && yourCountry !== otherCountry;
          const isDomestic = yourCountry && otherCountry && yourCountry === otherCountry;

          const PartyCard = ({ label, party }: { label: string; party: typeof yourDetails }) => (
            <div className="rounded-md border border-border p-4 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
              <p className="text-sm font-semibold text-foreground">{party.registeredName || "—"}</p>
              {party.tradingName && <p className="text-xs text-muted-foreground">{t("overview.tradingAs")}: {party.tradingName}</p>}
              {party.companyNumber && <p className="text-xs text-muted-foreground">{t("overview.company")}: {party.companyNumber}</p>}
              {party.vatNumber && <p className="text-xs text-muted-foreground">{t("overview.vat")}: {party.vatNumber}</p>}
              {party.eoriNumber && <p className="text-xs text-muted-foreground">EORI: {party.eoriNumber}</p>}
              {party.address && <p className="text-xs text-muted-foreground">{party.address}</p>}
              {party.country && <p className="text-xs text-muted-foreground">{party.country}</p>}
              {party.contactName && <p className="text-xs text-muted-foreground mt-1">{t("overview.contact")}: {party.contactName}</p>}
              {party.telephone && <p className="text-xs text-muted-foreground">{t("overview.tel")}: {party.telephone}</p>}
              {party.email && <p className="text-xs text-muted-foreground">{party.email}</p>}
            </div>
          );

          return (
            <div className="space-y-5 max-w-lg">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-foreground">{t("sidebar.projectOverview")}</h2>
                <ValueChip tone="good" label={<CheckCircle2 aria-hidden="true" />}>{t("lock.sectionAccepted")}</ValueChip>
              </div>
              {(isDomestic || isInternational) && (
                <p>
                  <Chip size="sm">{isInternational ? `🌐 ${t("proj.internationalTrade")}` : `🏠 ${t("proj.domesticTrade")}`}</Chip>
                </p>
              )}
              <PartyCard
                label={role === "buyer" ? t("setup.buyer") : t("setup.seller")}
                party={yourDetails}
              />
              <PartyCard
                label={role === "buyer" ? t("setup.seller") : t("setup.buyer")}
                party={otherParty}
              />
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => onUnlockSection?.("project-overview")}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> {t("lock.edit")}
                </Button>
              </div>
            </div>
          );
        })()
      ) : !selectedDoc || selectedDoc === "project-overview" ? (
        (() => {
          const yourCountry = (yourDetails.country || "").trim().toLowerCase();
          const otherCountry = (otherParty.country || "").trim().toLowerCase();
          const bothCountriesSet = yourCountry && otherCountry;
          const isDomestic = bothCountriesSet && yourCountry === otherCountry;
          const isInternational = bothCountriesSet && yourCountry !== otherCountry;
          const bothPartiesSet = !!(yourDetails.registeredName?.trim() && otherParty.registeredName?.trim());

          return (
            <div className="space-y-4 max-w-lg">
              <p className="text-sm text-muted-foreground mb-2">{t("overview.parties")}</p>

              {/* Your details card */}
              <div className="rounded-md border border-border overflow-hidden">
                <div className="flex items-center">
                  <button
                    onClick={() => setExpandedParty(expandedParty === "you" ? null : "you")}
                    aria-expanded={expandedParty === "you"}
                    aria-controls={`${foldId}-party-you`}
                    className="flex-1 flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div>
                       <p className="text-xs text-muted-foreground">{role === "buyer" ? t("setup.buyer") : role === "seller" ? t("setup.seller") : t("overview.you")}</p>
                       <p className="text-sm font-medium text-foreground">{yourDetails.registeredName || t("setup.yourDetails")}</p>
                    </div>
                    {expandedParty === "you" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  {yourDetails.registeredName && (
                    <div className="flex items-center pr-2">
                      <button
                        onClick={() => { setEditingYourDetails(true); setExpandedParty("you"); }}
                        className="p-2 hover:bg-secondary/50 rounded-md transition-colors"
                        title={t("proj.editYours")}
                        aria-label={t("proj.editYours")}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                </div>
                {expandedParty === "you" && (
                  <div id={`${foldId}-party-you`} className="px-4 pb-4 pt-1 border-t border-border space-y-1.5">
                    {editingYourDetails ? (
                      <div className="space-y-3 pt-2">
                        {companyFields(yourDetails, setYourDetails, "")}
                        <div className="flex gap-2">
                          <Button size="sm" onClick={async () => { await saveYourDetails(yourDetails); setEditYourDetails(yourDetails); setEditingYourDetails(false); toast.success(t("proj.yoursUpdated")); }}>
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            {t("save.done")}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingYourDetails(false)}>
                            {t("setup.cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {yourDetails.tradingName && <p className="text-sm text-muted-foreground">{t("overview.tradingAs")}: {yourDetails.tradingName}</p>}
                        {yourDetails.companyNumber && <p className="text-sm text-muted-foreground">{t("overview.company")}: {yourDetails.companyNumber}</p>}
                        {yourDetails.vatNumber && <p className="text-sm text-muted-foreground">{t("overview.vat")}: {yourDetails.vatNumber}</p>}
                        {yourDetails.address && <p className="text-sm text-muted-foreground">{t("field.address")}: {yourDetails.address}</p>}
                        {yourDetails.country && <p className="text-sm text-muted-foreground">{tf("party.countryValue", { country: yourDetails.country })}</p>}
                        {yourDetails.contactName && <p className="text-sm text-muted-foreground">{t("overview.contact")}: {yourDetails.contactName}</p>}
                        {yourDetails.telephone && <p className="text-sm text-muted-foreground">{t("overview.tel")}: {yourDetails.telephone}</p>}
                        {yourDetails.email && <p className="text-sm text-muted-foreground">{t("field.email")}: {yourDetails.email}</p>}
                        {!yourDetails.registeredName && <p className="text-sm text-muted-foreground italic">{t("overview.noDetails")}</p>}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Other party card */}
              <div className="rounded-md border border-border overflow-hidden">
                <div className="flex items-center">
                  <button
                    onClick={() => setExpandedParty(expandedParty === "other" ? null : "other")}
                    aria-expanded={expandedParty === "other"}
                    aria-controls={`${foldId}-party-other`}
                    className="flex-1 flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div>
                       <p className="text-xs text-muted-foreground">{role === "buyer" ? t("setup.seller") : role === "seller" ? t("setup.buyer") : t("overview.otherParty")}</p>
                       <p className="text-sm font-medium text-foreground">{otherParty.registeredName || t("overview.otherParty")}</p>
                    </div>
                    {expandedParty === "other" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <div className="flex items-center pr-2 gap-1">
                    <button
                      onClick={() => { setEditingOtherParty(true); setExpandedParty("other"); }}
                      className="p-2 hover:bg-secondary/50 rounded-md transition-colors"
                      title={t("proj.editOther")}
                      aria-label={t("proj.editOther")}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    {otherParty.registeredName && (
                      <button
                        onClick={() => { setOtherParty(emptyCompany()); setEditingOtherParty(false); setOtherPartyMode(""); onBackToSetup?.(); }}
                        className="p-2 hover:bg-destructive/10 rounded-md transition-colors"
                        title={t("proj.removeOther")}
                        aria-label={t("proj.removeOther")}
                      >
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
                {expandedParty === "other" && (
                  <div id={`${foldId}-party-other`} className="px-4 pb-4 pt-1 border-t border-border space-y-1.5">
                    {editingOtherParty ? (
                      <div className="space-y-3 pt-2">
                        {companyFields(otherParty, setOtherParty, "")}
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => { setEditingOtherParty(false); toast.success(t("proj.otherUpdated")); }}>
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            {t("save.done")}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingOtherParty(false)}>
                            {t("setup.cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {otherParty.tradingName && <p className="text-sm text-muted-foreground">{t("overview.tradingAs")}: {otherParty.tradingName}</p>}
                        {otherParty.companyNumber && <p className="text-sm text-muted-foreground">{t("overview.company")}: {otherParty.companyNumber}</p>}
                        {otherParty.vatNumber && <p className="text-sm text-muted-foreground">{t("overview.vat")}: {otherParty.vatNumber}</p>}
                        {otherParty.address && <p className="text-sm text-muted-foreground">{t("field.address")}: {otherParty.address}</p>}
                        {otherParty.country && <p className="text-sm text-muted-foreground">{tf("party.countryValue", { country: otherParty.country })}</p>}
                        {otherParty.contactName && <p className="text-sm text-muted-foreground">{t("overview.contact")}: {otherParty.contactName}</p>}
                        {otherParty.telephone && <p className="text-sm text-muted-foreground">{t("overview.tel")}: {otherParty.telephone}</p>}
                        {otherParty.email && <p className="text-sm text-muted-foreground">{t("field.email")}: {otherParty.email}</p>}
                        {!otherParty.registeredName && <p className="text-sm text-muted-foreground italic">{t("overview.noCounterparty")}</p>}
                      </>
                    )}
                  </div>
                )}
              </div>


              {/* Domestic / International selector */}
              {bothPartiesSet && (() => {
                const autoDomestic = bothCountriesSet ? yourCountry === otherCountry : null;
                const activeDomestic = tradeTypeOverride ? tradeTypeOverride === "domestic" : (autoDomestic === true);
                const activeInternational = tradeTypeOverride ? tradeTypeOverride === "international" : (autoDomestic === false);
                const isOverridden = tradeTypeOverride && bothCountriesSet && ((tradeTypeOverride === "domestic" && !autoDomestic) || (tradeTypeOverride === "international" && autoDomestic));
                const yourDisplay = yourDetails.country || "—";
                const otherDisplay = otherParty.country || "—";
                return (
                  <div className="space-y-2">
                    <div className="flex gap-3">
                      <button
                        onClick={() => setTradeTypeOverride("domestic")}
                        className={`flex-1 rounded-md px-4 py-2.5 text-center text-sm font-medium border transition-colors cursor-pointer ${
                          activeDomestic
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-secondary/50 text-muted-foreground border-border hover:border-muted-foreground/30"
                        }`}
                      >
                        {t("proj.domestic")}
                      </button>
                      <button
                        onClick={() => setTradeTypeOverride("international")}
                        className={`flex-1 rounded-md px-4 py-2.5 text-center text-sm font-medium border transition-colors cursor-pointer ${
                          activeInternational
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-secondary/50 text-muted-foreground border-border hover:border-muted-foreground/30"
                        }`}
                      >
                        {t("proj.international")}
                      </button>
                    </div>
                    {isOverridden && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        ⚠️ {tf("proj.mismatch", {
                          roleA: role === "buyer" ? t("doc.buyer") : t("doc.seller"),
                          countryA: yourDisplay,
                          roleB: role === "buyer" ? t("doc.seller") : t("doc.buyer"),
                          countryB: otherDisplay,
                        })}
                      </p>
                    )}
                    {!bothCountriesSet && !tradeTypeOverride && (
                      <p className="text-xs text-muted-foreground italic">{t("proj.addCountry")}</p>
                    )}
                  </div>
                );
              })()}

              {/* Accept / Done button */}
              {bothPartiesSet && !accepted && (
                <Button
                  onClick={onAccept}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t("lock.acceptLock")}
                </Button>
              )}
              {accepted && editingSections?.has("project-overview") && (
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    onClick={() => onLockSection?.("project-overview")}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> {t("lock.acceptLock")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onCancelEdit?.("project-overview")}>
                    {t("setup.cancel")}
                  </Button>
                </div>
              )}
            </div>
          );
        })()
      ) : selectedDoc === "ai-import" ? (
        demoParties ? (
          demoImported ? (
            // ── Done: documents extracted, every section pre-filled ──────────────
            <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto space-y-5">
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-success/10 border-2 border-success/30">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground">{t("ai.doneTitle")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("ai.doneBody")}
                </p>
              </div>
              <div className="w-full rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-left space-y-1.5">
                {DEMO_IMPORT_DOCS.map((doc) => (
                  <div key={doc.key} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-3.5 w-3.5 text-success shrink-0" />
                    <span>{tf(doc.key, { ref: doc.ref ?? "" })}</span>
                  </div>
                ))}
              </div>
              <div className="w-full flex items-center gap-2 text-sm font-medium text-success">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{t("ai.noDiscrepancies")}</span>
              </div>
              <p className="text-xs text-muted-foreground italic">
                {t("ai.exampleLive")}
              </p>
              <div className="flex items-center gap-2 text-primary animate-pulse">
                <ArrowLeft className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">{t("ai.chooseSection")}</p>
              </div>
            </div>
          ) : demoImporting ? (
            // ── Processing: simulated extraction in progress ─────────────────────
            <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto space-y-5">
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30">
                <Loader2 className="h-9 w-9 text-primary animate-spin" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground">{t("ai.extractingTitle")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("ai.extractingBody")}
                </p>
              </div>
              <div className="w-full rounded-lg border border-border bg-secondary/30 px-4 py-3 text-left space-y-1.5">
                {DEMO_IMPORT_DOCS.map((doc) => (
                  <div key={doc.key} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 text-primary shrink-0 animate-spin" />
                    <span>{tf(doc.key, { ref: doc.ref ?? "" })}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // ── Upload: PDFs are ready, waiting for the user to import ───────────
            <div className="flex flex-col items-center justify-center py-12 text-center max-w-md mx-auto space-y-5">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20">
                <Wand2 className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground">{t("sidebar.eboxyAI")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("ai.uploadBody")}
                </p>
              </div>
              <div className="w-full rounded-lg border-2 border-dashed border-primary/30 bg-primary/[0.03] px-4 py-4 text-left space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("ai.ready")}</p>
                {DEMO_IMPORT_DOCS.map((doc) => (
                  <div key={doc.key} className="flex items-center gap-2 text-sm text-foreground">
                    <FileText className="h-4 w-4 text-primary/70 shrink-0" />
                    <span>{tf(doc.key, { ref: doc.ref ?? "" })}</span>
                  </div>
                ))}
              </div>
              {/* Point of truth — confirm the agreed total before importing. */}
              <div className="w-full rounded-lg border border-border bg-card px-4 py-3 text-left space-y-2">
                <label htmlFor="pot-total" className="text-sm font-medium text-foreground">
                  {t("ai.potLabel")}
                </label>
                <p className="text-xs text-muted-foreground">
                  {t("ai.potHint")}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{((allForms["transaction"]?.currency) || "GBP").toUpperCase()}</span>
                  <Input
                    id="pot-total"
                    inputMode="decimal"
                    value={potTotal}
                    onChange={(e) => setPotTotal(e.target.value)}
                    placeholder="0.00"
                    className="bg-secondary/50"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-primary text-sm font-semibold animate-bounce">
                <ArrowRight className="h-4 w-4 rotate-90" />
                <span>{potTotal.trim() ? t("ai.clickImport") : t("ai.confirmAbove")}</span>
              </div>
              <Button
                size="lg"
                className="w-full ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/30"
                onClick={handleUploadPdfs}
                disabled={!potTotal.trim()}
              >
                <Upload className="mr-2 h-4 w-4" /> {t("ai.uploadPdfs")}
              </Button>
              <p className="text-xs text-muted-foreground italic">
                {t("ai.examplePrefilled")}
              </p>
            </div>
          )
        ) : (
        <div className="space-y-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            {t("ai.title")}
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {t("ai.body")}
          </p>
          <div className="flex flex-col gap-3 max-w-md">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-3">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("ai.drop")}</p>
              <Button variant="outline" size="sm" disabled>
                {t("ai.browse")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">{t("ai.supported")}</p>
            <p className="text-xs text-muted-foreground text-center italic">{t("ai.comingSoon")}</p>
          </div>
        </div>
        )
      ) : selectedDoc === "eboxy" ? (
        (() => {
          // Build cross-document validation checks
          type CheckItem = {
            label: string;
            status: "pass" | "warn" | "missing";
            details?: string;
            links?: { label: string; docId: string }[];
            accepted?: boolean;
          };

          const val = (form: string, key: string) => (allForms[form] || {})[key]?.trim() || "";
          const checks: CheckItem[] = [];

          // Section names as the sidebar shows them, in the app's language.
          const L = {
            transaction: t("sidebar.transaction"),
            estimate: t("sidebar.estimateQuote"),
            po: t("sidebar.purchaseOrder"),
            invoice: t("sidebar.invoice"),
            deliveryNote: t("sidebar.deliveryNote"),
          };
          const num = (s: string) => money(parseFloat(s));

          // 1. Amount consistency across estimate, PO, invoice, transaction
          const amountSources: { label: string; docId: string; value: string }[] = [
            { label: L.transaction, docId: "transaction", value: val("transaction", "billAmount") },
            { label: L.estimate, docId: "estimate-quote", value: val("estimate-quote", "amount") },
            { label: L.po, docId: "purchase-order", value: val("purchase-order", "amount") },
            { label: L.invoice, docId: "invoice", value: val("invoice", "amount") },
          ].filter((s) => s.value);

          if (amountSources.length >= 2) {
            const amounts = amountSources.map((s) => parseFloat(s.value));
            const allMatch = amounts.every((a) => a === amounts[0]);
            if (allMatch) {
              checks.push({ label: t("agree.amountsMatch"), status: "pass", details: tf("agree.amountsMatchDetail", { count: amountSources.length, amount: money(amounts[0]) }) });
            } else {
              checks.push({
                label: t("agree.amountMismatch"),
                status: "warn",
                details: amountSources.map((s) => `${s.label}: ${num(s.value)}`).join(" · "),
                links: amountSources.map((s) => ({ label: s.label, docId: s.docId })),
              });
            }
          } else if (amountSources.length === 1) {
            checks.push({ label: t("doc.amount"), status: "pass", details: tf("agree.amountOnlyOne", { doc: amountSources[0].label, amount: num(amountSources[0].value) }) });
          } else {
            checks.push({ label: t("doc.amount"), status: "missing", details: t("agree.noAmounts"), links: [{ label: L.transaction, docId: "transaction" }] });
          }

          // 2. Currency consistency
          const currSources: { label: string; docId: string; value: string }[] = [
            { label: L.transaction, docId: "transaction", value: val("transaction", "currency") },
            { label: L.estimate, docId: "estimate-quote", value: val("estimate-quote", "docCurrency") },
            { label: L.po, docId: "purchase-order", value: val("purchase-order", "docCurrency") },
            { label: L.invoice, docId: "invoice", value: val("invoice", "docCurrency") },
          ].filter((s) => s.value);

          if (currSources.length >= 2) {
            const allMatch = currSources.every((s) => s.value.toUpperCase() === currSources[0].value.toUpperCase());
            if (allMatch) {
              checks.push({ label: t("agree.currenciesMatch"), status: "pass", details: currSources[0].value.toUpperCase() });
            } else {
              checks.push({
                label: t("agree.currencyMismatch"),
                status: "warn",
                details: currSources.map((s) => `${s.label}: ${s.value}`).join(" · "),
                links: currSources.map((s) => ({ label: s.label, docId: s.docId })),
              });
            }
          } else if (currSources.length === 1) {
            checks.push({ label: t("doc.currency"), status: "pass", details: currSources[0].value.toUpperCase() });
          }

          // 3. Counterparty consistency
          const partyLabel = counterpartyLabel;
          const partySources: { label: string; docId: string; value: string }[] = [
            { label: L.estimate, docId: "estimate-quote", value: val("estimate-quote", "counterparty") },
            { label: L.po, docId: "purchase-order", value: val("purchase-order", "counterparty") },
            { label: L.invoice, docId: "invoice", value: val("invoice", "counterparty") },
          ].filter((s) => s.value);

          if (partySources.length >= 2) {
            const allMatch = partySources.every((s) => s.value.toLowerCase() === partySources[0].value.toLowerCase());
            if (allMatch) {
              checks.push({ label: tf("agree.partyMatches", { party: partyLabel }), status: "pass", details: partySources[0].value });
            } else {
              checks.push({
                label: tf("agree.partyMismatch", { party: partyLabel }),
                status: "warn",
                details: partySources.map((s) => `${s.label}: ${s.value}`).join(" · "),
                links: partySources.map((s) => ({ label: s.label, docId: s.docId })),
              });
            }
          }

          // 4. Date ordering — documents should follow chronological sequence
          const dateSequence: { label: string; docId: string; dateKey: string }[] = [
            { label: L.estimate, docId: "estimate-quote", dateKey: "date" },
            { label: L.po, docId: "purchase-order", dateKey: "date" },
            { label: L.invoice, docId: "invoice", dateKey: "date" },
            { label: L.deliveryNote, docId: "delivery-note", dateKey: "date" },
          ];
          const datedDocs = dateSequence.filter((d) => val(d.docId, d.dateKey));

          if (datedDocs.length >= 2) {
            const orderIssues: string[] = [];
            const orderLinks: { label: string; docId: string }[] = [];

            for (let i = 0; i < datedDocs.length - 1; i++) {
              const a = datedDocs[i];
              const b = datedDocs[i + 1];
              const dA = new Date(val(a.docId, a.dateKey));
              const dB = new Date(val(b.docId, b.dateKey));
              if (dA > dB) {
                orderIssues.push(tf("agree.dateAfter", { a: a.label, dateA: date(val(a.docId, a.dateKey)), b: b.label, dateB: date(val(b.docId, b.dateKey)) }));
                if (!orderLinks.find((l) => l.docId === a.docId)) orderLinks.push({ label: a.label, docId: a.docId });
                if (!orderLinks.find((l) => l.docId === b.docId)) orderLinks.push({ label: b.label, docId: b.docId });
              }
            }

            if (orderIssues.length === 0) {
              checks.push({
                label: t("agree.datesInOrder"),
                status: "pass",
                details: datedDocs.map((d) => `${d.label}: ${date(val(d.docId, d.dateKey))}`).join(" → "),
              });
            } else {
              checks.push({
                label: t(orderIssues.length > 1 ? "agree.dateIssue.other" : "agree.dateIssue.one"),
                status: "warn",
                details: orderIssues.join(" · "),
                links: orderLinks,
              });
            }
          }

          // 5. Required sections filled
          const requiredSections = [
            { label: t("txn.title"), docId: "transaction", keys: ["billAmount", "drawer", "drawee"] },
            { label: t("ship.title"), docId: "shipment", keys: ["incoterms", "portLoading", "portDischarge"] },
            { label: t("sidebar.products"), docId: "product-details", keys: ["productLines"] },
          ];
          for (const sec of requiredSections) {
            const data = allForms[sec.docId] || {};
            const filled = sec.keys.some((k) => data[k]?.trim());
            checks.push({
              label: tf("agree.sectionCompleted", { section: sec.label }),
              status: filled ? "pass" : "missing",
              details: filled ? undefined : t("agree.sectionEmpty"),
              links: [{ label: sec.label, docId: sec.docId }],
            });
          }

          // 6. Product total vs transaction amount
          const prodTotal = productTotals.totalIncTax;
          const txnAmount = parseFloat(val("transaction", "billAmount")) || 0;
          if (prodTotal > 0 && txnAmount > 0 && Math.abs(prodTotal - txnAmount) > 0.01) {
            checks.push({
              label: t("agree.productTotalMismatch"),
              status: "warn",
              details: tf("agree.productTotalDetail", { products: money(prodTotal), transaction: money(txnAmount) }),
              links: [
                { label: t("sidebar.products"), docId: "product-details" },
                { label: L.transaction, docId: "transaction" },
              ],
            });
          } else if (prodTotal > 0 && txnAmount > 0) {
            checks.push({ label: t("agree.productTotalMatches"), status: "pass", details: money(prodTotal) });
          }

          const warnings = checks.filter((c) => c.status === "warn");
          const missing = checks.filter((c) => c.status === "missing");
          const passed = checks.filter((c) => c.status === "pass");

          // Gather the transaction overview that goes into the generated PDF.
          // These labels (and the document names, signatory labels and the
          // "Product" fallback below) are the PDF's own text, which stays in
          // English on purpose — so they are not translated.
          const agreementCurrency = (
            val("transaction", "currency") || val("invoice", "docCurrency") || ""
          ).toUpperCase();
          const agreementAmount =
            val("transaction", "billAmount") ||
            (productTotals.totalIncTax > 0 ? productTotals.totalIncTax.toFixed(2) : "");
          const agreementCounterparty =
            val("invoice", "counterparty") ||
            val("purchase-order", "counterparty") ||
            val("estimate-quote", "counterparty");
          const agreementFields = [
            { label: "Drawer (Seller)", value: val("transaction", "drawer") },
            { label: "Drawee (Buyer)", value: val("transaction", "drawee") },
            { label: "Counterparty", value: agreementCounterparty },
            { label: "Amount", value: agreementAmount ? `${agreementCurrency} ${agreementAmount}`.trim() : "" },
            { label: "Incoterms", value: val("shipment", "incoterms") },
            { label: "Port of Loading", value: val("shipment", "portLoading") },
            { label: "Port of Discharge", value: val("shipment", "portDischarge") },
            { label: "Country of Origin", value: val("coo", "countryOfOrigin") },
          ];
          const agreementProducts: { name: string; units: string; unitPrice: string; total: string }[] = (() => {
            try {
              const raw = allForms["product-details"]?.productLines;
              if (!raw) return [];
              const lines = JSON.parse(raw) as { catalogueId: string; units: string; discount: string; discountAmount?: string }[];
              return lines.map((l) => {
                const product = catalogue.find((p) => p.id === l.catalogueId);
                const units = parseFloat(l.units) || 0;
                let unitPrice = "";
                let total = "";
                if (product) {
                  const discount = parseFloat(l.discount) || 0;
                  const fixed = parseFloat(l.discountAmount || "0") || 0;
                  const sub = product.unitPrice * units;
                  const discounted = Math.max(0, sub - sub * (discount / 100) - fixed);
                  unitPrice = product.unitPrice.toFixed(2);
                  total = (discounted + discounted * (product.vatPercent / 100)).toFixed(2);
                }
                return { name: product?.name || "Product", units: String(l.units || ""), unitPrice, total };
              });
            } catch {
              return [];
            }
          })();
          // Which source documents have been provided, with their reference
          // number, date and value (where applicable). Surfaced on screen and
          // baked into the generated agreement PDF.
          const documentMeta: { docId: string; label: string }[] = [
            { docId: "estimate-quote", label: "Estimate / Quote" },
            { docId: "purchase-order", label: "Purchase Order" },
            { docId: "invoice", label: "Invoice" },
            { docId: "picking-list", label: "Picking List" },
            { docId: "delivery-note", label: "Delivery Note" },
            { docId: "credit-note", label: "Credit Note" },
            { docId: "receipt", label: "Receipt" },
          ];
          const providedDocuments = documentMeta
            .map(({ docId, label }) => {
              const reference = val(docId, "referenceNo");
              const date = val(docId, "date");
              const amount = val(docId, "amount");
              const currency = val(docId, "docCurrency").toUpperCase();
              const notes = val(docId, "notes");
              const provided = !!(reference || date || amount || notes);
              return {
                docId,
                label,
                reference,
                date,
                value: amount ? `${currency} ${amount}`.trim() : "",
                provided,
              };
            })
            .filter((d) => d.provided);

          // Pre-VAT goods value per product (summed across lines), so each
          // tariff line can show a computed duty / VAT cost.
          const goodsValueByName: Record<string, number> = (() => {
            const map: Record<string, number> = {};
            try {
              const raw = allForms["product-details"]?.productLines;
              if (!raw) return map;
              const lines = JSON.parse(raw) as { catalogueId: string; units: string; discount: string; discountAmount?: string }[];
              for (const l of lines) {
                const product = catalogue.find((p) => p.id === l.catalogueId);
                if (!product) continue;
                const units = parseFloat(l.units) || 0;
                const discount = parseFloat(l.discount) || 0;
                const fixed = parseFloat(l.discountAmount || "0") || 0;
                const sub = product.unitPrice * units;
                const discounted = Math.max(0, sub - sub * (discount / 100) - fixed);
                map[product.name] = (map[product.name] || 0) + discounted;
              }
            } catch { /* ignore */ }
            return map;
          })();
          const parsePct = (s?: string | null) => {
            const m = String(s ?? "").match(/[\d.]+/);
            return m ? parseFloat(m[0]) : 0;
          };

          // Tariffs — the applied customs rules, surfaced as an optional section
          // on the agreement PDF with duty + VAT each on their own line and a
          // computed cost where the product's goods value is known. Empty => hidden.
          const providedTariffs: import("@/lib/exportAgreementPdf").AgreementTariff[] = (() => {
            try {
              const rules = JSON.parse(allForms["customs"]?.appliedRules || "[]");
              return (Array.isArray(rules) ? rules : [])
                .map((r: { productName?: string; hsCode?: string; thirdCountryDuty?: string; preferentialDuty?: string | null; vat?: string }) => {
                  const goods = goodsValueByName[r.productName || ""] || 0;
                  const dutyRate = parsePct(r.preferentialDuty || r.thirdCountryDuty);
                  const vatRate = parsePct(r.vat);
                  const dutyCostNum = goods * (dutyRate / 100);
                  const vatCostNum = (goods + dutyCostNum) * (vatRate / 100);
                  return {
                    product: r.productName || "",
                    hsCode: r.hsCode || "",
                    duty: r.preferentialDuty
                      ? `${r.thirdCountryDuty || ""} (pref ${r.preferentialDuty})`.trim()
                      : (r.thirdCountryDuty || ""),
                    vat: r.vat || "",
                    dutyCost: goods > 0 ? dutyCostNum.toFixed(2) : undefined,
                    vatCost: goods > 0 ? vatCostNum.toFixed(2) : undefined,
                    currency: agreementCurrency || undefined,
                  };
                })
                .filter((t) => t.product || t.hsCode);
            } catch {
              return [];
            }
          })();

          const buildPdfInput = (signature: import("@/lib/exportAgreementPdf").AgreementSignatureBlock | null) => ({
            projectName,
            role: role || "",
            fields: agreementFields,
            products: agreementProducts,
            totals: { currency: agreementCurrency, amount: agreementAmount },
            documents: providedDocuments.map(({ label, reference, date, value }) => ({ label, reference, date, value })),
            tariffs: providedTariffs,
            signature,
            signatories: {
              drafter: {
                label: role === "seller" ? "Exporter (Seller)" : role === "buyer" ? "Importer (Buyer)" : "Party 1 (You)",
                name: yourDetails.registeredName || preFrom,
                role: formData["confirmRole"] || "",
              },
              counterparty: {
                label: role === "seller" ? "Importer (Buyer)" : role === "buyer" ? "Exporter (Seller)" : "Party 2 (Counterparty)",
                name: otherParty.registeredName || preCounterparty,
                role: "",
              },
            },
          });

          return (
            <div className="space-y-5">
              <Collapsible open={agreementChecklistOpen} onOpenChange={setAgreementChecklistOpen} className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-foreground">{t("eboxy.title")}</h2>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground [&[data-state=open]>svg]:rotate-180">
                      {agreementChecklistOpen ? t("agree.hideChecklist") : t("agree.showChecklist")}
                      <ChevronDown className="ml-1.5 h-4 w-4 transition-transform" />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="space-y-5">
                  <p className="text-sm text-muted-foreground max-w-md">
                    {t("agree.intro")}
                  </p>

              {/* Summary */}
              <div className="flex gap-3 text-sm">
                <ValueChip tone="good" label={passed.length}>{t("agree.passed")}</ValueChip>
                <ValueChip tone="crit" label={warnings.length}>{tp("agree.discrepancies", warnings.length)}</ValueChip>
                <ValueChip label={missing.length}>{t("agree.missing")}</ValueChip>
              </div>

              {/* Non-passed items */}
              {(warnings.length > 0 || missing.length > 0) && (
                <div className="space-y-2 max-w-lg">
                  {checks.filter(c => c.status !== "pass").map((check, i) => (
                    <EboxyCheckItem key={i} check={check} onNavigate={onNavigate} />
                  ))}
                </div>
              )}

              {/* Passed items — collapsed by default */}
              {passed.length > 0 && (
                <Collapsible className="max-w-lg">
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1 [&[data-state=open]>svg]:rotate-180">
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                    {tp("agree.passedChecks", passed.length)}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-2">
                    {checks.filter(c => c.status === "pass").map((check, i) => (
                      <EboxyCheckItem key={i} check={check} onNavigate={onNavigate} />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Documents provided — reference number, date and value (where
                  applicable). Mirrors the "Documents Provided" table baked into
                  the generated agreement PDF. */}
              {providedDocuments.length > 0 && (
                <div className="max-w-lg space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">{t("agree.docsProvided")}</h3>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">{t("agree.colDocument")}</th>
                          <th className="px-3 py-2 text-left font-medium">{t("agree.colReference")}</th>
                          <th className="px-3 py-2 text-left font-medium">{t("doc.date")}</th>
                          <th className="px-3 py-2 text-right font-medium">{t("agree.colValue")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {providedDocuments.map((d) => (
                          <tr key={d.label} className="border-t border-border">
                            <td className="px-3 py-2 text-foreground">{DOC_TITLE_KEYS[d.docId] ? t(DOC_TITLE_KEYS[d.docId]) : d.label}</td>
                            <td className="px-3 py-2 text-muted-foreground">{d.reference || "—"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{d.date ? date(d.date) : "—"}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">{d.value || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

                </CollapsibleContent>
              </Collapsible>

              {/* Generate → sign → counter-sign workflow. Generating produces
                  an embedded PDF overview; the signature panel stays greyed out
                  until then, and "They Sign" unlocks only once the drafter has
                  confirmed their own signature. Generating also collapses the
                  checklist above to free the screen for the preview. */}
              <ExportAgreementWorkflow
                canGenerate={missing.length === 0}
                projectId={projectId}
                projectName={projectName}
                formData={formData}
                onFieldChange={onFieldChange}
                buildPdfInput={buildPdfInput}
                project={currentProject}
                onImportProject={onImportProject}
                onGenerated={() => setAgreementChecklistOpen(false)}
                counterparty={{
                  email: otherParty.email,
                  contactName: otherParty.contactName,
                  registeredName: otherParty.registeredName,
                  role: counterpartyLabel,
                }}
              />
            </div>
          );
        })()
      ) : selectedDoc === "coo" ? (
        lockedSections.has("coo") ? (
          <LockedSectionView title="coo.title" fields={[["coo.country", field("countryOfOrigin")], ["coo.certificate", field("cooFileName")]]} onEdit={() => onUnlockSection?.("coo")} branding={docBranding} />
        ) : (
        <div className="space-y-5">
          <h2 className="text-base font-semibold text-foreground">{t("coo.title")}</h2>
          <div className="max-w-lg space-y-4">
            <div>
              <TooltipLabel label={t("coo.country")} tooltip={t("coo.countryTip")} />
              <Input
                placeholder={t("party.countryPlaceholder")}
                className="bg-secondary/50"
                value={field("countryOfOrigin")}
                onChange={set("countryOfOrigin")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground block">{t("coo.certOptional")}</label>
              <p className="text-xs text-muted-foreground">{t("coo.certHint")}</p>
              <CooFileAttachment field={field} set={set} onFieldChange={onFieldChange} />
            </div>
          </div>
          {renderSectionButtons("coo", t("save.cooDetails"))}
        </div>
        )
      ) : selectedDoc === "customs" ? (
        lockedSections.has("customs") ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-foreground">{t("tariff.title")}</h2>
              <ValueChip tone="good" label={<CheckCircle2 aria-hidden="true" />}>{t("lock.sectionAccepted")}</ValueChip>
            </div>

            {/* Applied Tariff Rules */}
            {(() => {
              let applied: { hsCode: string; productName: string; description: string; thirdCountryDuty: string; preferentialDuty?: string | null; vat: string }[] = [];
              try { applied = JSON.parse(field("appliedRules") || "[]"); } catch { applied = []; }
              return applied.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> {tf("tariff.appliedCount", { count: applied.length })}
                  </h3>
                  <div className="space-y-2">
                    {applied.map((rule, i) => (
                      <div key={i} className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{rule.productName}</p>
                        <p className="text-xs text-muted-foreground mb-1.5">{rule.description} · HS: {rule.hsCode}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          <span><span className="text-muted-foreground">{t("tariff.duty")}:</span> <span className="font-medium">{rule.thirdCountryDuty}</span></span>
                          {rule.preferentialDuty && <span><span className="text-muted-foreground">{t("tariff.pref")}:</span> <span className="font-medium">{rule.preferentialDuty}</span></span>}
                          <span><span className="text-muted-foreground">{t("overview.vat")}:</span> <span className="font-medium">{rule.vat}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("tariff.noneApplied")}</p>
              );
            })()}

            {/* Compliance Checklist Summary */}
            {(() => {
              const relevantItems = role !== "buyer" ? EXPORT_CHECKS : IMPORT_CHECKS;
              const checkedItems = relevantItems.filter((it) => field(it.key) === "true");
              const uncheckedItems = relevantItems.filter((it) => field(it.key) !== "true");
              return (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {role !== "buyer" ? t("compl.exportTitle") : t("compl.importTitle")}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {tf("compl.progress", { done: checkedItems.length, total: relevantItems.length })}
                    </span>
                  </h3>
                  <div className="rounded-md border border-border divide-y divide-border overflow-hidden">
                    {relevantItems.map((it) => {
                      const done = field(it.key) === "true";
                      return (
                        <div key={it.key} className={cn("flex items-center gap-3 px-4 py-2.5 text-sm", done ? "bg-green-500/5" : "bg-secondary/10")}>
                          {done
                            ? <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            : <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
                          <span className={done ? "text-foreground" : "text-muted-foreground"}>{t(it.label)}</span>
                        </div>
                      );
                    })}
                  </div>
                  {uncheckedItems.length > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      {tp("compl.unconfirmed", uncheckedItems.length)}
                    </p>
                  )}
                </div>
              );
            })()}

            <Button variant="outline" size="sm" onClick={() => onUnlockSection?.("customs")}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> {t("lock.edit")}
            </Button>
          </div>
        ) : (
        <div className="space-y-5">
          <CustomsLookup allForms={allForms} formData={formData} onFieldChange={onFieldChange} extraProducts={demoParties ? DEMO_CATALOGUE : undefined} originCountry={yourDetails.country} destCountry={otherParty.country} />

          {/* Customs Checklists */}
          <div className="space-y-3 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-foreground">{t("compl.title")}</h3>
            {role !== "buyer" && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm font-medium text-foreground hover:text-primary transition-colors py-2">
                  <ChevronRight className="h-3.5 w-3.5 transition-transform [[data-state=open]>&]:rotate-90" />
                  {t("compl.export")}
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-5 space-y-2 pb-3">
                  {EXPORT_CHECKS.map((item) => (
                    <label key={item.key} className="flex items-center gap-2.5 cursor-pointer group">
                      <Checkbox
                        checked={field(item.key) === "true"}
                        onCheckedChange={(v) => onFieldChange(item.key, v ? "true" : "")}
                      />
                      <span className={cn("text-sm", field(item.key) === "true" ? "text-muted-foreground line-through" : "text-foreground")}>{t(item.label)}</span>
                    </label>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
            {role !== "seller" && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm font-medium text-foreground hover:text-primary transition-colors py-2">
                  <ChevronRight className="h-3.5 w-3.5 transition-transform [[data-state=open]>&]:rotate-90" />
                  {t("compl.import")}
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-5 space-y-2 pb-3">
                  {IMPORT_CHECKS.map((item) => (
                    <label key={item.key} className="flex items-center gap-2.5 cursor-pointer group">
                      <Checkbox
                        checked={field(item.key) === "true"}
                        onCheckedChange={(v) => onFieldChange(item.key, v ? "true" : "")}
                      />
                      <span className={cn("text-sm", field(item.key) === "true" ? "text-muted-foreground line-through" : "text-foreground")}>{t(item.label)}</span>
                    </label>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>

          {renderSectionButtons("customs", t("save.tariffs"))}
        </div>
        )
      ) : selectedDoc === "handy-tools" ? (
        <div className="space-y-5">
          <h2 className="text-base font-semibold text-foreground">{t("tools.title")}</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {t("tools.desc")}
          </p>

          {/* Getting Started */}
          <Collapsible open={gsOpen} onOpenChange={setGsOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm font-semibold text-foreground hover:text-primary transition-colors py-2 border-b border-border">
              {gsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {t("tools.gettingStarted")}
              {gsAllChecked && <Check className="h-3.5 w-3.5 text-green-500 ml-1 shrink-0" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 pb-1">
              <div className="grid gap-3 max-w-lg">
                {GS_ITEMS.map((item, i) => (
                  <div key={item.url} className="flex items-start gap-3">
                    <Checkbox
                      id={`gs-${i}`}
                      checked={gsChecked[i] ?? false}
                      onCheckedChange={(checked) => handleGsCheck(i, !!checked)}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "text-sm font-medium hover:underline inline-flex items-center gap-1",
                          gsChecked[i] ? "line-through text-muted-foreground" : "text-primary"
                        )}
                      >
                        {t(item.label)} <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                      <p className="text-xs text-muted-foreground mt-0.5">{t(item.desc)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Export Tools */}
          <Collapsible defaultOpen={role === "seller"}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm font-semibold text-foreground hover:text-primary transition-colors py-2 border-b border-border">
              <ChevronRight className="h-3.5 w-3.5 transition-transform [[data-state=open]>&]:rotate-90" />
              {t("tools.export")}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 pb-1">
              <div className="grid gap-3 max-w-lg">
                {[
                  // Names of official bodies and services stay as published.
                  { label: t("tools.exportGoods"), url: "https://www.gov.uk/export-goods", desc: t("tools.exportGoodsDesc") },
                  { label: "UK Export Finance", url: "https://www.gov.uk/government/organisations/uk-export-finance", desc: t("tools.ukefDesc") },
                  { label: t("tools.licensing"), url: "https://www.gov.uk/guidance/beginners-guide-to-export-controls", desc: t("tools.licensingDesc") },
                  { label: "Customs Declaration Service", url: "https://www.gov.uk/guidance/get-access-to-the-customs-declaration-service", desc: t("tools.cdsExportDesc") },
                  { label: "Incoterms® 2020", url: "https://iccwbo.org/business-solutions/incoterms-rules/incoterms-2020/", desc: t("tools.incotermsDesc") },
                ].map((tool) => (
                  <ToolLink key={tool.url} {...tool} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Import Tools */}
          <Collapsible defaultOpen={role === "buyer"}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm font-semibold text-foreground hover:text-primary transition-colors py-2 border-b border-border">
              <ChevronRight className="h-3.5 w-3.5 transition-transform [[data-state=open]>&]:rotate-90" />
              {t("tools.import")}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 pb-1">
              <div className="grid gap-3 max-w-lg">
                {[
                  { label: t("tools.importGoods"), url: "https://www.gov.uk/import-goods-into-uk", desc: t("tools.importGoodsDesc") },
                  { label: "UK Trade Tariff", url: "https://www.trade-tariff.service.gov.uk", desc: t("tools.tariffDesc") },
                  { label: "Customs Declaration Service", url: "https://www.gov.uk/guidance/get-access-to-the-customs-declaration-service", desc: t("tools.cdsImportDesc") },
                  { label: t("tools.pva"), url: "https://www.gov.uk/guidance/check-when-you-can-account-for-import-vat-on-your-vat-return", desc: t("tools.pvaDesc") },
                  { label: "Incoterms® 2020", url: "https://iccwbo.org/business-solutions/incoterms-rules/incoterms-2020/", desc: t("tools.incotermsDesc") },
                ].map((tool) => (
                  <ToolLink key={tool.url} {...tool} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Handy Resources */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm font-semibold text-foreground hover:text-primary transition-colors py-2 border-b border-border">
              <ChevronRight className="h-3.5 w-3.5 transition-transform [[data-state=open]>&]:rotate-90" />
              {t("tools.resources")}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 pb-1">
              <div className="grid gap-3 max-w-lg">
                {[
                  { label: "Dept. for Business & Trade", url: "https://www.gov.uk/government/organisations/department-for-business-and-trade", desc: t("tools.dbtDesc") },
                  { label: "HMRC", url: "https://www.gov.uk/government/organisations/hm-revenue-customs", desc: t("tools.hmrcDesc") },
                  { label: t("tools.icc"), url: "https://iccwbo.org", desc: t("tools.iccDesc") },
                  { label: t("tools.sanctions"), url: "https://sanctionssearchapp.ofsi.hmtreasury.gov.uk", desc: t("tools.sanctionsDesc") },
                ].map((tool) => (
                  <ToolLink key={tool.url} {...tool} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      ) : selectedDoc === "product-details" ? (
        lockedSections.has("product-details") ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-foreground">{t("sidebar.products")}</h2>
              <ValueChip tone="good" label={<CheckCircle2 aria-hidden="true" />}>{t("lock.sectionAccepted")}</ValueChip>
            </div>
            <div className="overflow-x-auto">
              {(() => {
                // Currency + line totals match the figures used on every other
                // document (same maths as getProductTotals / the agreement PDF).
                const curr = (allForms["transaction"]?.currency || allForms["invoice"]?.docCurrency || "").toUpperCase();
                const withCurr = (n: number) => `${curr} ${money(n)}`.trim();
                let lines: { catalogueId: string; units: string; discount?: string; discountAmount?: string }[] = [];
                try { lines = JSON.parse(allForms["product-details"]?.["productLines"] || "[]"); } catch { lines = []; }
                const effectiveCatalogue = demoParties
                  ? [...DEMO_CATALOGUE, ...catalogue.filter(p => !p.id.startsWith("demo-"))]
                  : catalogue;
                const lineTotal = (line: { catalogueId: string; units: string; discount?: string; discountAmount?: string }, product: { unitPrice: number; vatPercent: number }) => {
                  const units = parseFloat(line.units) || 0;
                  const discount = parseFloat(line.discount || "0") || 0;
                  const fixed = parseFloat(line.discountAmount || "0") || 0;
                  const sub = product.unitPrice * units;
                  const discounted = Math.max(0, sub - sub * (discount / 100) - fixed);
                  return discounted + discounted * (product.vatPercent / 100);
                };
                return (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs text-muted-foreground font-medium pb-2 pr-4">{t("product.colProduct")}</th>
                        <th className="text-left text-xs text-muted-foreground font-medium pb-2 pr-4">{t("product.hsCode")}</th>
                        <th className="text-right text-xs text-muted-foreground font-medium pb-2 pr-4">{t("product.qty")}</th>
                        <th className="text-right text-xs text-muted-foreground font-medium pb-2">{t("product.totalIncTaxCol")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, i) => {
                        const product = effectiveCatalogue.find((p) => p.id === line.catalogueId);
                        if (!product) return null;
                        return (
                          <tr key={i} className="border-b border-border/50 last:border-0">
                            <td className="py-2 pr-4 font-medium text-foreground">{product.name}</td>
                            <td className="py-2 pr-4 text-muted-foreground font-mono text-xs">{product.hsCode || "—"}</td>
                            <td className="py-2 pr-4 text-right text-foreground">{line.units}</td>
                            <td className="py-2 text-right text-foreground">{withCurr(lineTotal(line, product))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border">
                        <td className="py-2 pr-4 font-semibold text-foreground" colSpan={3}>{t("product.total")}</td>
                        <td className="py-2 text-right font-semibold text-foreground">{withCurr(productTotals.totalIncTax)}</td>
                      </tr>
                    </tfoot>
                  </table>
                );
              })()}
            </div>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => onUnlockSection?.("product-details")}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> {t("lock.edit")}
              </Button>
            </div>
          </div>
        ) : (
        <div className="space-y-5">
          <ProductDetails formData={formData || {}} onFieldChange={onFieldChange} onSave={onSave} extraCatalogue={demoParties ? DEMO_CATALOGUE : undefined} />
          {renderSectionButtons("product-details", t("save.products"))}
        </div>
        )
      ) : selectedDoc === "transaction" ? (
        lockedSections.has("transaction") ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-foreground">{t("txn.title")}</h2>
              <ValueChip tone="good" label={<CheckCircle2 aria-hidden="true" />}>{t("lock.sectionAccepted")}</ValueChip>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-lg">
              {[
                [t("txn.drawer"), field("drawer") || (role === "seller" ? yourDetails.registeredName : otherParty.registeredName) || "—"],
                [t("txn.drawee"), field("drawee") || (role === "buyer" ? yourDetails.registeredName : otherParty.registeredName) || "—"],
                [t("txn.payee"), field("payee") || (role === "seller" ? yourDetails.registeredName : otherParty.registeredName) || "—"],
                [t("txn.currency"), field("currency") || "GBP"],
                [t("txn.placeOfIssue"), field("placeOfIssue") || "—"],
                [t("ship.incoterms"), field("incoterms") || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium text-foreground">{value}</p>
                </div>
              ))}
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">{t("txn.paymentTerms")}</p>
                <p className="text-sm font-medium text-foreground">{field("paymentTerms") || "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">{t("txn.endorsementNotes")}</p>
                <p className="text-sm font-medium text-foreground">{field("endorsementNotes") || "—"}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => onUnlockSection?.("transaction")}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> {t("lock.edit")}
              </Button>
            </div>
          </div>
        ) : (
        (() => {
          const suggestedPlace = [yourDetails.address, yourDetails.country].filter(Boolean).join(", ");
          return (
        <div className="space-y-5">
           <h2 className="text-base font-semibold text-foreground">{t("txn.title")}</h2>
           <div className="grid grid-cols-2 gap-4 max-w-lg">
             <div>
               <TooltipLabel label={t("txn.drawer")} tooltip={t("tooltip.drawer")} />
               <Input placeholder={t("txn.drawer")} className="bg-secondary/50" value={field("drawer") || (role === "seller" ? yourDetails.registeredName : otherParty.registeredName) || ""} onChange={set("drawer")} />
             </div>
             <div>
               <TooltipLabel label={t("txn.drawee")} tooltip={t("tooltip.drawee")} />
               <Input placeholder={t("txn.drawee")} className="bg-secondary/50" value={field("drawee") || (role === "buyer" ? yourDetails.registeredName : otherParty.registeredName) || ""} onChange={set("drawee")} />
             </div>
             <div>
               <TooltipLabel label={t("txn.payee")} tooltip={t("tooltip.payee")} />
               <Input placeholder={t("txn.payee")} className="bg-secondary/50" value={field("payee") || (role === "seller" ? yourDetails.registeredName : otherParty.registeredName) || ""} onChange={set("payee")} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("txn.currency")}</label>
               <CurrencySelect value={field("currency") || "GBP"} onChange={(v) => onFieldChange("currency", v)} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("txn.placeOfIssue")}</label>
               <Input placeholder={suggestedPlace || t("deal.placePlaceholder")} className="bg-secondary/50" value={field("placeOfIssue") || suggestedPlace} onChange={set("placeOfIssue")} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("ship.incoterms")}</label>
               <select className="w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring" value={field("incoterms")} onChange={set("incoterms")}>
                 <option value="">{t("ship.selectIncoterm")}</option>
                 {INCOTERM_CODES.map((code) => (
                   <option key={code} value={code}>{code} – {t(`incoterm.${code}` as MessageKey)}</option>
                 ))}
               </select>
             </div>
             <div className="col-span-2">
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("txn.paymentTerms")}</label>
               <Input placeholder={t("deal.paymentTermsPlaceholder")} className="bg-secondary/50" value={field("paymentTerms")} onChange={set("paymentTerms")} />
             </div>
             <div className="col-span-2">
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("txn.endorsementNotes")}</label>
               <Input placeholder={t("deal.optionalNotes")} className="bg-secondary/50" value={field("endorsementNotes")} onChange={set("endorsementNotes")} />
             </div>
           </div>
           {renderSectionButtons("transaction", t("txn.save"))}
        </div>
          );
        })()
        )
      ) : selectedDoc === "shipment" ? (
        lockedSections.has("shipment") ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-foreground">{t("ship.title")}</h2>
              <ValueChip tone="good" label={<CheckCircle2 aria-hidden="true" />}>{t("lock.sectionAccepted")}</ValueChip>
            </div>
            {field("goodsDescription") && (
              <div>
                <p className="text-xs text-muted-foreground">{t("cargo.goodsDescription")}</p>
                <p className="text-sm font-medium text-foreground">{field("goodsDescription")}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 max-w-lg">
              {[
                [t("ship.incoterms"), field("incoterms") || allForms["transaction"]?.incoterms || "—"],
                [t("ship.transportMode"), field("transportMode") || "—"],
                [t("ship.portLoading"), field("portLoading") || "—"],
                [t("ship.portDischarge"), field("portDischarge") || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium text-foreground">{value}</p>
                </div>
              ))}
              {(field("shippingDate") || field("expectedArrival") || field("vesselFlight")) && (
                <>
                  {field("shippingDate") && <div><p className="text-xs text-muted-foreground">{t("ship.shippingDate")}</p><p className="text-sm font-medium text-foreground">{field("shippingDate")}</p></div>}
                  {field("expectedArrival") && <div><p className="text-xs text-muted-foreground">{t("ship.expectedArrival")}</p><p className="text-sm font-medium text-foreground">{field("expectedArrival")}</p></div>}
                  {field("vesselFlight") && <div className="col-span-2"><p className="text-xs text-muted-foreground">{t("ship.vesselFlight")}</p><p className="text-sm font-medium text-foreground">{field("vesselFlight")}</p></div>}
                </>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => onUnlockSection?.("shipment")}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> {t("lock.edit")}
              </Button>
            </div>
          </div>
        ) : (
        (() => {
          const txnIncoterms = allForms["transaction"]?.incoterms || "";
          const hasIfKnown = !!(field("shippingDate") || field("expectedArrival") || field("vesselFlight"));
          const ifKnownOpen = shipmentIfKnownOpen || hasIfKnown;
          return (
        <div className="space-y-5">
           <h2 className="text-base font-semibold text-foreground">{t("ship.title")}</h2>
           <div className="space-y-4 max-w-lg">
             {/* General Goods Description at top */}
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("cargo.goodsDescription")}</label>
               <Input placeholder={t("cargo.goodsPlaceholder")} className="bg-secondary/50" value={field("goodsDescription")} onChange={set("goodsDescription")} />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("ship.incoterms")}</label>
                 <select className="w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring" value={field("incoterms") || txnIncoterms} onChange={set("incoterms")}>
                   <option value="">{t("ship.selectIncoterm")}</option>
                   {INCOTERM_CODES.map((code) => (
                     <option key={code} value={code}>{code} – {t(`incoterm.${code}` as MessageKey)}</option>
                   ))}
                 </select>
                 {txnIncoterms && !field("incoterms") && (
                   <p className="text-xs text-muted-foreground mt-1">{t("cargo.preselected")}</p>
                 )}
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("ship.transportMode")}</label>
                 <Input placeholder={t("cargo.modePlaceholder")} className="bg-secondary/50" value={field("transportMode")} onChange={set("transportMode")} />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("ship.portLoading")}</label>
                 <Input placeholder={tf("common.eg", { example: "Portsmouth, UK" })} className="bg-secondary/50" value={field("portLoading")} onChange={set("portLoading")} />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("ship.portDischarge")}</label>
                 <Input placeholder={tf("common.eg", { example: "Saint-Malo, France" })} className="bg-secondary/50" value={field("portDischarge")} onChange={set("portDischarge")} />
               </div>
             </div>
             {/* If Known collapsible */}
             <Collapsible open={ifKnownOpen} onOpenChange={setShipmentIfKnownOpen}>
               <CollapsibleTrigger asChild>
                 <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
                   <ChevronRight className={`h-4 w-4 transition-transform ${ifKnownOpen ? "rotate-90" : ""}`} />
                   {t("cargo.ifKnown")}
                 </button>
               </CollapsibleTrigger>
               <CollapsibleContent>
                 <div className="grid grid-cols-2 gap-4 pt-3">
                   <div>
                     <label className="text-sm font-medium text-foreground mb-1.5 block">{t("ship.shippingDate")}</label>
                     <Input type="date" className="bg-secondary/50" value={field("shippingDate")} onChange={set("shippingDate")} />
                   </div>
                   <div>
                     <label className="text-sm font-medium text-foreground mb-1.5 block">{t("ship.expectedArrival")}</label>
                     <Input type="date" className="bg-secondary/50" value={field("expectedArrival")} onChange={set("expectedArrival")} />
                   </div>
                   <div className="col-span-2">
                     <label className="text-sm font-medium text-foreground mb-1.5 block">{t("ship.vesselFlight")}</label>
                     <Input placeholder={tf("common.eg", { example: "MSC Gulsun / BA117" })} className="bg-secondary/50" value={field("vesselFlight")} onChange={set("vesselFlight")} />
                   </div>
                 </div>
               </CollapsibleContent>
             </Collapsible>
           </div>
           {renderSectionButtons("shipment", t("ship.save"))}
         </div>
          );
        })()
        )
       ) : selectedDoc === "picking-list" ? (
         lockedSections.has("picking-list") ? (
           <LockedSectionView title="sidebar.pickingList" fields={[["pick.pickedBy", field("pickedBy")], ["pick.datePicked", field("datePicked")]]} onEdit={() => onUnlockSection?.("picking-list")} branding={docBranding} />
         ) :
         (() => {
           const productLines = (() => {
             try {
               const raw = allForms["product-details"]?.productLines;
               if (!raw) return [];
               return JSON.parse(raw) as { catalogueId: string; units: string }[];
             } catch { return []; }
           })();
           const pickedMap: Record<number, boolean> = (() => {
             try {
               const raw = field("pickedItems");
               return raw ? JSON.parse(raw) : {};
             } catch { return {}; }
           })();
           const allPicked = productLines.length > 0 && productLines.every((_, i) => pickedMap[i]);
           return (
             <div className="space-y-5">
               <h2 className="text-base font-semibold text-foreground">{t("sidebar.pickingList")}</h2>
               {productLines.length === 0 ? (
                 <p className="text-sm text-muted-foreground">{t("pick.noProducts")}</p>
               ) : (
                 <>
                   <div className="rounded-md border border-border overflow-hidden">
                     <table className="w-full text-sm">
                       <thead>
                         <tr className="border-b border-border bg-secondary/30">
                           <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">{t("product.colProduct")}</th>
                           <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">{t("product.units")}</th>
                            <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">
                              <div className="flex items-center justify-center gap-2">
                                <span>{t("pick.picked")}</span>
                                <Checkbox
                                  aria-label={t("pick.selectAll")}
                                  checked={allPicked}
                                  onCheckedChange={(checked) => {
                                    const updated: Record<number, boolean> = {};
                                    productLines.forEach((_, i) => { updated[i] = !!checked; });
                                    onFieldChange("pickedItems", JSON.stringify(updated));
                                  }}
                                />
                              </div>
                            </th>
                         </tr>
                       </thead>
                       <tbody>
                         {productLines.map((line, idx) => {
                           const product = catalogue.find((p) => p.id === line.catalogueId);
                           if (!product) return null;
                           return (
                             <tr key={idx} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                               <td className="px-4 py-3">
                                 <p className="font-medium text-foreground">{catalogueDisplayTitle(product)}</p>
                                 {product.code && <p className="text-xs text-muted-foreground">{product.code}</p>}
                               </td>
                               <td className="px-4 py-3 text-right text-foreground">{line.units}</td>
                               <td className="px-4 py-3 text-center">
                                 <Checkbox
                                   aria-label={`${t("pick.picked")}: ${catalogueDisplayTitle(product)}`}
                                   checked={!!pickedMap[idx]}
                                   onCheckedChange={(checked) => {
                                     const updated = { ...pickedMap, [idx]: !!checked };
                                     onFieldChange("pickedItems", JSON.stringify(updated));
                                   }}
                                 />
                               </td>
                             </tr>
                           );
                         })}
                       </tbody>
                     </table>
                   </div>
                    {allPicked && (
                      <div className="rounded-md bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary font-medium animate-fade-in">
                        ✓ {t("pick.allPicked")}
                      </div>
                    )}
                    <div className="flex gap-4 max-w-lg">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("pick.pickedBy")}</label>
                        <Input placeholder={t("pick.pickerPlaceholder")} className="bg-secondary/50" value={field("pickedBy")} onChange={set("pickedBy")} />
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("pick.datePicked")}</label>
                        <Input type="date" className="bg-secondary/50" value={field("datePicked")} onChange={set("datePicked")} />
                      </div>
                    </div>
                    {renderSectionButtons("picking-list", t("save.pickingList"))}
                 </>
               )}
             </div>
           );
         })()
       ) : selectedDoc === "certificate-of-origin" ? (
         lockedSections.has("certificate-of-origin") ? (
           <LockedSectionView
             title="cert.title"
             fields={[
               ["cert.exporter", field("exporter") || preFrom],
               ["cert.consignee", field("consignee") || preCounterparty],
               ["coo.country", field("countryOfOrigin") || cooData.countryOfOrigin || ""],
               ["cert.number", field("referenceNo")],
               ["doc.date", field("date")],
               ["txn.placeOfIssue", field("placeOfIssue")],
               ["cert.transport", field("transport")],
               ["cert.goods", field("goodsDescription") || ship.goodsDescription || ""],
               ["cert.declaration", field("declaration") || DEFAULT_COO_DECLARATION],
             ]}
             onEdit={() => onUnlockSection?.("certificate-of-origin")}
             colSpanFields={["cert.transport", "cert.goods", "cert.declaration"]}
             branding={docBranding}
           />
         ) : (
           <div className="space-y-5">
             <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
               <Award className="h-5 w-5" />
               {t("cert.title")}
             </h2>
             <p className="text-sm text-muted-foreground max-w-lg">
               {t("cert.desc")}
             </p>
             <div className="grid grid-cols-2 gap-4 max-w-lg">
               <div className="col-span-2">
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("cert.exporter")}</label>
                 <Input placeholder={t("cert.exporterPlaceholder")} className="bg-secondary/50" value={docField("exporter", preFrom)} onChange={set("exporter")} />
               </div>
               <div className="col-span-2">
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("cert.consignee")}</label>
                 <Input placeholder={t("cert.consigneePlaceholder")} className="bg-secondary/50" value={docField("consignee", preCounterparty)} onChange={set("consignee")} />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("coo.country")}</label>
                 <Input placeholder={t("party.countryPlaceholder")} className="bg-secondary/50" value={docField("countryOfOrigin", cooData.countryOfOrigin || "")} onChange={set("countryOfOrigin")} />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("cert.number")}</label>
                 <Input placeholder={tf("common.eg", { example: "CoO-2026-001" })} className="bg-secondary/50" value={field("referenceNo")} onChange={set("referenceNo")} />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("doc.date")}</label>
                 <Input type="date" className="bg-secondary/50" value={field("date")} onChange={set("date")} />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("txn.placeOfIssue")}</label>
                 <Input placeholder={tf("common.eg", { example: "London, UK" })} className="bg-secondary/50" value={field("placeOfIssue")} onChange={set("placeOfIssue")} />
               </div>
               <div className="col-span-2">
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("cert.transportOptional")}</label>
                 <Input placeholder={t("cert.transportPlaceholder")} className="bg-secondary/50" value={docField("transport", [ship.transportMode, ship.vesselFlight].filter(Boolean).join(" — "))} onChange={set("transport")} />
               </div>
               <div className="col-span-2">
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("cert.goods")}</label>
                 <textarea
                   placeholder={t("cert.goodsPlaceholder")}
                   className="flex min-h-[80px] w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                   value={docField("goodsDescription", ship.goodsDescription || "")}
                   onChange={(e) => onFieldChange("goodsDescription", e.target.value)}
                 />
               </div>
               <div className="col-span-2">
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("cert.declaration")}</label>
                 <textarea
                   className="flex min-h-[80px] w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                   value={docField("declaration", DEFAULT_COO_DECLARATION)}
                   onChange={(e) => onFieldChange("declaration", e.target.value)}
                 />
               </div>
               <div className="col-span-2">
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("common.notes")}</label>
                 <textarea
                   placeholder={t("common.notesPlaceholder")}
                   className="flex min-h-[60px] w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                   value={field("notes")}
                   onChange={(e) => onFieldChange("notes", e.target.value)}
                 />
               </div>
             </div>
             {renderSectionButtons("certificate-of-origin", t("save.certificateOfOrigin"))}
           </div>
         )
       ) : selectedDoc === "bill-of-lading" ? (
         lockedSections.has("bill-of-lading") ? (
           <LockedSectionView
             title="bol.title"
             fields={[
               ["bol.shipper", field("shipper") || preFrom],
               ["cert.consignee", field("consignee") || preCounterparty],
               ["bol.notify", field("notifyParty")],
               ["bol.vessel", field("vessel") || ship.vesselFlight || ""],
               ["bol.voyage", field("voyageNo")],
               ["ship.portLoading", field("portOfLoading") || ship.portLoading || ""],
               ["ship.portDischarge", field("portOfDischarge") || ship.portDischarge || ""],
               ["bol.placeReceipt", field("placeOfReceipt")],
               ["bol.placeDelivery", field("placeOfDelivery")],
               ["bol.packages", field("numberOfPackages")],
               ["bol.grossWeight", field("grossWeight")],
               ["bol.measurement", field("measurement")],
               ["bol.freightTerms", field("freightTerms")],
               ["bol.number", field("referenceNo")],
               ["doc.date", field("date")],
               ["txn.placeOfIssue", field("placeOfIssue")],
               ["bol.originals", field("numberOfOriginals")],
               ["cert.goods", field("goodsDescription") || ship.goodsDescription || ""],
             ]}
             onEdit={() => onUnlockSection?.("bill-of-lading")}
             colSpanFields={["cert.goods"]}
             branding={docBranding}
           />
         ) : (
           <div className="space-y-5">
             <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
               <Anchor className="h-5 w-5" />
               {t("bol.title")}
             </h2>
             <p className="text-sm text-muted-foreground max-w-lg">
               {t("bol.desc")}
             </p>
             <div className="grid grid-cols-2 gap-4 max-w-lg">
               <div className="col-span-2">
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("bol.shipper")}</label>
                 <Input placeholder={t("bol.shipperPlaceholder")} className="bg-secondary/50" value={docField("shipper", preFrom)} onChange={set("shipper")} />
               </div>
               <div className="col-span-2">
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("cert.consignee")}</label>
                 <Input placeholder={t("bol.consigneePlaceholder")} className="bg-secondary/50" value={docField("consignee", preCounterparty)} onChange={set("consignee")} />
               </div>
               <div className="col-span-2">
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("bol.notify")}</label>
                 <Input placeholder={t("bol.notifyPlaceholder")} className="bg-secondary/50" value={field("notifyParty")} onChange={set("notifyParty")} />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("bol.vessel")}</label>
                 <Input placeholder={tf("common.eg", { example: "MV Cotentin" })} className="bg-secondary/50" value={docField("vessel", ship.vesselFlight || "")} onChange={set("vessel")} />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("bol.voyage")}</label>
                 <Input placeholder={tf("common.eg", { example: "V.2604" })} className="bg-secondary/50" value={field("voyageNo")} onChange={set("voyageNo")} />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("ship.portLoading")}</label>
                 <Input placeholder={tf("common.eg", { example: "Portsmouth, UK" })} className="bg-secondary/50" value={docField("portOfLoading", ship.portLoading || "")} onChange={set("portOfLoading")} />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("ship.portDischarge")}</label>
                 <Input placeholder={tf("common.eg", { example: "Saint-Malo, France" })} className="bg-secondary/50" value={docField("portOfDischarge", ship.portDischarge || "")} onChange={set("portOfDischarge")} />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("bol.placeReceipt")}</label>
                 <Input placeholder={tf("common.eg", { example: "London, UK" })} className="bg-secondary/50" value={field("placeOfReceipt")} onChange={set("placeOfReceipt")} />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("bol.placeDelivery")}</label>
                 <Input placeholder={tf("common.eg", { example: "Rennes, France" })} className="bg-secondary/50" value={field("placeOfDelivery")} onChange={set("placeOfDelivery")} />
               </div>
               <div className="col-span-2">
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("bol.marks")}</label>
                 <Input placeholder={t("bol.marksPlaceholder")} className="bg-secondary/50" value={field("marksNumbers")} onChange={set("marksNumbers")} />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("bol.packages")}</label>
                 <Input placeholder={t("bol.packagesPlaceholder")} className="bg-secondary/50" value={field("numberOfPackages")} onChange={set("numberOfPackages")} />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("bol.grossWeight")}</label>
                 <Input placeholder={tf("common.eg", { example: "420 kg" })} className="bg-secondary/50" value={field("grossWeight")} onChange={set("grossWeight")} />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("bol.measurement")}</label>
                 <Input placeholder={tf("common.eg", { example: "1.2 m³" })} className="bg-secondary/50" value={field("measurement")} onChange={set("measurement")} />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("bol.freightTerms")}</label>
                 <select
                   className="flex h-10 w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   value={field("freightTerms")}
                   onChange={(e) => onFieldChange("freightTerms", e.target.value)}
                 >
                   <option value="">{t("bol.selectTerms")}</option>
                   {/* The stored value is the trade's English term (it prints on the PDF). */}
                   <option value="Freight Prepaid">{t("bol.prepaid")}</option>
                   <option value="Freight Collect">{t("bol.collect")}</option>
                 </select>
               </div>
               <div className="col-span-2">
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("cert.goods")}</label>
                 <textarea
                   placeholder={t("bol.goodsPlaceholder")}
                   className="flex min-h-[80px] w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                   value={docField("goodsDescription", ship.goodsDescription || "")}
                   onChange={(e) => onFieldChange("goodsDescription", e.target.value)}
                 />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("bol.number")}</label>
                 <Input placeholder={tf("common.eg", { example: "BL-2026-001" })} className="bg-secondary/50" value={field("referenceNo")} onChange={set("referenceNo")} />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("doc.date")}</label>
                 <Input type="date" className="bg-secondary/50" value={field("date")} onChange={set("date")} />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("txn.placeOfIssue")}</label>
                 <Input placeholder={tf("common.eg", { example: "London, UK" })} className="bg-secondary/50" value={field("placeOfIssue")} onChange={set("placeOfIssue")} />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("bol.originals")}</label>
                 <Input placeholder={tf("common.eg", { example: "3" })} className="bg-secondary/50" value={field("numberOfOriginals")} onChange={set("numberOfOriginals")} />
               </div>
               <div className="col-span-2">
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("common.notes")}</label>
                 <textarea
                   placeholder={t("bol.notesPlaceholder")}
                   className="flex min-h-[60px] w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                   value={field("notes")}
                   onChange={(e) => onFieldChange("notes", e.target.value)}
                 />
               </div>
             </div>
             {renderSectionButtons("bill-of-lading", t("save.billOfLading"))}
           </div>
         )
       ) : selectedDoc === "bank-details" ? (
          <BankDetailsSection txnCurrency={txn.currency || "GBP"} locked={lockedSections.has("bank-details")} onLock={() => { onLockSection?.("bank-details"); }} onUnlock={() => onUnlockSection?.("bank-details")} isReEditing={editingSections.has("bank-details")} onCancelEdit={() => onCancelEdit?.("bank-details")} />
       ) : selectedDoc === "letter-of-credit" ? (
         lockedSections.has("letter-of-credit") ? (
           <LockedSectionView title="sidebar.letterOfCredit" fields={[["lc.number", field("lcNumber")], ["lc.issueDate", field("lcDateOfIssue")], ["lc.expiry", field("lcExpiryDate")], ["doc.amount", field("lcAmount")], ["doc.currency", field("lcCurrency") || txn.currency || "GBP"], ["lc.issuingBank", field("lcIssuingBank")], ["lc.advisingBank", field("lcAdvisingBank")], ["lc.type", field("lcType")]]} onEdit={() => onUnlockSection?.("letter-of-credit")} colSpanFields={["lc.terms"]} branding={docBranding} />
          ) : (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
             <Landmark className="h-5 w-5" />
             {t("sidebar.letterOfCredit")}
           </h2>
           <p className="text-sm text-muted-foreground max-w-lg">
             {t("lc.desc")}
           </p>
           <div className="grid grid-cols-2 gap-4 max-w-lg">
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("lc.number")}</label>
               <Input placeholder={tf("common.eg", { example: "LC-2026-001" })} className="bg-secondary/50" value={field("lcNumber")} onChange={set("lcNumber")} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("lc.issueDate")}</label>
               <Input type="date" className="bg-secondary/50" value={field("lcDateOfIssue")} onChange={set("lcDateOfIssue")} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("lc.expiry")}</label>
               <Input type="date" className="bg-secondary/50" value={field("lcExpiryDate")} onChange={set("lcExpiryDate")} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("lc.amount")}</label>
               <Input type="number" placeholder="0.00" className="bg-secondary/50" value={field("lcAmount")} onChange={set("lcAmount")} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("doc.currency")}</label>
               <CurrencySelect value={field("lcCurrency") || txn.currency || "GBP"} onChange={(v) => onFieldChange("lcCurrency", v)} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("lc.issuingBank")}</label>
               <Input placeholder={tf("common.eg", { example: "HSBC" })} className="bg-secondary/50" value={field("lcIssuingBank")} onChange={set("lcIssuingBank")} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("lc.advisingBank")}</label>
               <Input placeholder={tf("common.eg", { example: "Barclays" })} className="bg-secondary/50" value={field("lcAdvisingBank")} onChange={set("lcAdvisingBank")} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("lc.applicant")}</label>
               <Input placeholder={t("lc.buyerName")} className="bg-secondary/50" value={docField("lcApplicant", txn.drawee || "")} onChange={set("lcApplicant")} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("lc.beneficiary")}</label>
               <Input placeholder={t("lc.sellerName")} className="bg-secondary/50" value={docField("lcBeneficiary", txn.drawer || "")} onChange={set("lcBeneficiary")} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("lc.typeOf")}</label>
               <select
                 className="flex h-10 w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                 value={field("lcType")}
                 onChange={(e) => onFieldChange("lcType", e.target.value)}
               >
                 <option value="">{t("lc.selectType")}</option>
                 <option value="irrevocable">{t("lc.irrevocable")}</option>
                 <option value="revocable">{t("lc.revocable")}</option>
                 <option value="confirmed">{t("lc.confirmed")}</option>
                 <option value="unconfirmed">{t("lc.unconfirmed")}</option>
                 <option value="transferable">{t("lc.transferable")}</option>
                 <option value="standby">{t("lc.standby")}</option>
               </select>
             </div>
             <div className="col-span-2">
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("lc.placeExpiry")}</label>
               <Input placeholder={tf("common.eg", { example: "London, UK" })} className="bg-secondary/50" value={field("lcPlaceOfExpiry")} onChange={set("lcPlaceOfExpiry")} />
             </div>
             <div className="col-span-2">
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("lc.terms")}</label>
               <textarea
                 placeholder={t("lc.termsPlaceholder")}
                 className="flex min-h-[80px] w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                 value={field("lcTerms")}
                 onChange={(e) => onFieldChange("lcTerms", e.target.value)}
               />
             </div>
             <div className="col-span-2">
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("common.notes")}</label>
               <textarea
                 placeholder={t("common.notesPlaceholder")}
                 className="flex min-h-[60px] w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                 value={field("notes")}
                 onChange={(e) => onFieldChange("notes", e.target.value)}
               />
             </div>
           </div>
            {renderSectionButtons("letter-of-credit", t("save.lcDetails"))}
            <div className="border-t border-border pt-5 max-w-lg">
              <Button
                variant="outline"
                className="w-full justify-center"
                onClick={() => toast.info(t("lc.attachSoon"))}
              >
                <Paperclip className="mr-2 h-4 w-4" />
                {t("lc.upload")}
              </Button>
            </div>
          </div>
         )
       ) : isDocumentType ? (
          lockedSections.has(selectedDoc!) ? (
            <LockedSectionView title={DOC_TITLE_KEYS[selectedDoc!] ?? "sidebar.documents"} fields={[["doc.referenceNo", field("referenceNo")], ["doc.date", field("date") || preDate], ["gdoc.issuedBy", field("issuedBy") || preFrom], [counterpartyKey, field("counterparty") || preCounterparty], ["doc.amount", field("amount") || preAmount], ["doc.currency", field("docCurrency") || preCurrency || "GBP"], ...(field("notes") ? [["common.notes", field("notes")] as [MessageKey, string]] : [])]} onEdit={() => onUnlockSection?.(selectedDoc!)} colSpanFields={["common.notes"]} branding={docBranding} />
          ) :
          (() => {
            // Determine if this doc is upload-only based on role
            const uploadOnlySellerDocs = ["purchase-order"];
            const uploadOnlyBuyerDocs = ["estimate-quote", "invoice", "picking-list", "delivery-note"];
            const isUploadOnly = (role === "seller" && uploadOnlySellerDocs.includes(selectedDoc!)) ||
                                 (role === "buyer" && uploadOnlyBuyerDocs.includes(selectedDoc!));
            const docTitle = t(DOC_TITLE_KEYS[selectedDoc!] ?? "sidebar.documents");

            return (
              <div className="space-y-5">
                <h2 className="text-base font-semibold text-foreground">
                  {docTitle}
                </h2>

                {!isUploadOnly && (
                  <div className="border-t border-border pt-5">
                    <p className="text-xs text-muted-foreground mb-4">
                      {t("doc.preFilled")}
                    </p>
                    <div className="grid grid-cols-2 gap-4 max-w-lg">
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("gdoc.issuedBy")}</label>
                        <Input placeholder={t("gdoc.issuedByPlaceholder")} className="bg-secondary/50" value={docField("issuedBy", preFrom)} onChange={set("issuedBy")} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("doc.referenceNo")}</label>
                        <Input placeholder={tf("common.eg", { example: "INV-001" })} className="bg-secondary/50" value={field("referenceNo")} onChange={set("referenceNo")} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("doc.date")}</label>
                        <Input type="date" className="bg-secondary/50" value={docField("date", preDate)} onChange={set("date")} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-foreground mb-1.5 block">{counterpartyLabel}</label>
                        <Input placeholder={counterpartyLabel} className="bg-secondary/50" value={docField("counterparty", preCounterparty)} onChange={set("counterparty")} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("doc.amount")}</label>
                        <Input type="number" placeholder="0.00" className="bg-secondary/50" value={docField("amount", preAmount)} onChange={set("amount")} />
                      </div>
                      <div>
                         <label className="text-sm font-medium text-foreground mb-1.5 block">{t("doc.currency")}</label>
                         <CurrencySelect value={docField("docCurrency", preCurrency) || "GBP"} onChange={(v) => onFieldChange("docCurrency", v)} />
                       </div>
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("common.notes")}</label>
                        <textarea
                          placeholder={t("gdoc.notesPlaceholder")}
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={field("notes")}
                          onChange={(e) => onFieldChange("notes", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button onClick={onSave}>{tf("gdoc.saveDoc", { doc: docTitle })}</Button>
                    </div>
                  </div>
                )}

                {isUploadOnly && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("gdoc.uploadOnly")}
                    </p>
                    <div className="max-w-lg space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("common.notes")}</label>
                        <textarea
                          placeholder={t("gdoc.notesPlaceholder")}
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={field("notes")}
                          onChange={(e) => onFieldChange("notes", e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={onSave}>{tf("gdoc.saveDoc", { doc: docTitle })}</Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-border pt-5 flex gap-3 max-w-md">
                  <Button
                    variant="outline"
                    className="flex-1 justify-center"
                    onClick={() => toast.info(t("gdoc.attachSoon"))}
                  >
                    <Paperclip className="mr-2 h-4 w-4" />
                    {t("gdoc.attach")}
                  </Button>
                  {!isUploadOnly && (
                    <Button
                      variant="outline"
                      className="flex-1 justify-center"
                      onClick={() => toast.info(`${t("doc.generate")} — ${t("toast.comingSoon")}`)}
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      {t("doc.generate")}
                    </Button>
                  )}
                </div>

                <div className="border-t border-border pt-5 max-w-md">
                  {renderSectionButtons(selectedDoc!, t("doc.save"))}
                </div>
              </div>
            );
          })()
       ) : (
         <div className="flex-1 flex items-center justify-center">
           <p className="text-muted-foreground text-sm">{t("doc.selectSection")}</p>
         </div>
      )}
    </ScrollFadeWrapper>
  );
};

export default MainContent;
