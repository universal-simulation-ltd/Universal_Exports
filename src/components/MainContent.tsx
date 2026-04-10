import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowRight, FileCheck, Upload, Wand2, Save, UserPlus, Trash2, Pencil, Paperclip, X, Copy, ExternalLink, CheckCircle2, Check, AlertTriangle, Circle, Search, Landmark, FolderPlus, Sparkles, Undo2 } from "lucide-react";
import TooltipLabel from "@/components/TooltipLabel";
import ProductDetails from "@/components/ProductDetails";
import CustomsLookup from "@/components/CustomsLookup";
import SignaturePad from "@/components/SignaturePad";
import LockedSectionView from "@/components/LockedSectionView";
import ScrollFadeWrapper from "@/components/ScrollFadeWrapper";
import { ProjectData, saveProject, createProjectId, deleteProject } from "@/lib/projectStore";
import { CompanyDetails, loadYourDetails, saveYourDetails, loadContacts, saveContact, deleteContact, emptyDetails } from "@/lib/contactStore";
import { loadCatalogue, catalogueDisplayTitle } from "@/lib/productCatalogueStore";
import { BankAccount, emptyBankAccount, loadYourBanks, saveYourBanks, loadPartyBanks, savePartyBanks } from "@/lib/bankStore";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MainContentProps {
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
}

const documentTypes = [
  "estimate-quote", "purchase-order", "invoice", "picking-list", "delivery-note", "credit-note", "receipt",
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileName = field("cooFileName");
  
  const handleAttach = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onFieldChange("cooFileName", file.name);
      onFieldChange("cooFileData", reader.result as string);
      toast.success(`Attached: ${file.name}`);
    };
    reader.readAsDataURL(file);
  }, [onFieldChange]);

  const handleRemove = useCallback(() => {
    onFieldChange("cooFileName", "");
    onFieldChange("cooFileData", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [onFieldChange]);

  return (
    <div className="flex items-center gap-2">
      <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={handleAttach} />
      {fileName ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-3 py-1.5 text-sm">
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-foreground truncate max-w-[200px]">{fileName}</span>
          <button onClick={handleRemove} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="text-xs" onClick={() => fileInputRef.current?.click()}>
          <Paperclip className="mr-1 h-3.5 w-3.5" />
          Attach Certificate
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
              Accept discrepancy (not recommended)
            </button>
          )}
          {accepted && (
            <p className="mt-1 text-xs text-muted-foreground italic">Discrepancy accepted</p>
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
  const { t } = useI18n();
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
    if (!window.confirm(`Delete "${name}"?`)) return;
    await deleteProject(id);
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    toast.success(`"${name}" deleted`);
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
              placeholder="Search projects..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSavedPage(0); }}
            />
          </div>
        </div>
      )}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{search ? "No matching projects" : t("saved.empty")}</p>
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
                    <p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  title="Duplicate project"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const newName = window.prompt("Name for the duplicate:", `${p.name} copy`);
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
                    toast.success(`Duplicated as "${duplicate.name}"`);
                  }}
                >
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 hover:text-destructive"
                  title="Delete project"
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
}: MainContentProps) => {
  const { t } = useI18n();

  const renderSectionButtons = (sectionId: string, saveLabel: string) => {
    const isReEditing = editingSections.has(sectionId);
    if (isReEditing) {
      return (
        <div className="flex gap-2 mt-2">
          <Button variant="outline" onClick={() => onCancelEdit?.(sectionId)}>
            <Undo2 className="mr-1.5 h-3.5 w-3.5" /> Make no changes
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
  const [setupStep, setSetupStep] = useState<"name" | "role">("name");
  const [expandedParty, setExpandedParty] = useState<"you" | "other" | null>("other");
  const [showSetupYourDetails, setShowSetupYourDetails] = useState(false);
  const [showSetupOtherParty, setShowSetupOtherParty] = useState(false);
  const [tradeTypeOverride, setTradeTypeOverride] = useState<"domestic" | "international" | null>(null);
  
  const [otherPartyMode, setOtherPartyMode] = useState<"" | "addressbook" | "create">("");
  const [contactSearch, setContactSearch] = useState("");
  const [editingOtherParty, setEditingOtherParty] = useState(false);
  const [editingYourDetails, setEditingYourDetails] = useState(false);
  const [shipmentIfKnownOpen, setShipmentIfKnownOpen] = useState(false);

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

  // Product catalogue (for totals)
  const [catalogue, setCatalogue] = useState<import("@/lib/productCatalogueStore").CatalogueProduct[]>([]);

  useEffect(() => {
    loadCatalogue().then(setCatalogue);
  }, []);

  // Your details (for setup)
  const [yourDetails, setYourDetails] = useState<CompanyDetails>(emptyDetails());
  // Other party details (for setup)
  const [otherParty, setOtherParty] = useState<CompanyDetails>(emptyCompany());

  // Address book editing states
  const [editYourDetails, setEditYourDetails] = useState<CompanyDetails>(emptyDetails());
  const [contacts, setContacts] = useState<CompanyDetails[]>([]);

  useEffect(() => {
    loadYourDetails().then((d) => { setYourDetails(d); setEditYourDetails(d); });
    loadContacts().then(setContacts);
  }, []);

  // Apply demo party details when a demo project is loaded
  useEffect(() => {
    if (demoParties) {
      setYourDetails(demoParties.yourDetails as CompanyDetails);
      setEditYourDetails(demoParties.yourDetails as CompanyDetails);
      setOtherParty(demoParties.otherParty as CompanyDetails);
    }
  }, [demoParties]);
  const [logoDataUrl, setLogoDataUrl] = useState<string>(() => localStorage.getItem("ebill-logo") || "");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);

  const field = (key: string) => (formData || {})[key] || "";
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onFieldChange(key, e.target.value);

  const isDocumentType = selectedDoc ? documentTypes.includes(selectedDoc) : false;

  const txn = allForms["transaction"] || {};
  const productTotals = useMemo(() => getProductTotals(allForms, catalogue), [allForms, catalogue]);

  const preDate = txn.issueDate || "";
  const preCounterparty = otherParty.registeredName || (role === "seller" ? txn.drawee : role === "buyer" ? txn.drawer : (txn.drawee || txn.drawer || ""));
  const preAmount = productTotals.totalIncTax > 0 ? productTotals.totalIncTax.toFixed(2) : txn.billAmount || "";
  const preCurrency = txn.currency || "";

  // Dynamic counterparty label: if I'm seller, other party is buyer and vice versa
  const counterpartyLabel = role === "seller" ? t("doc.buyer") : role === "buyer" ? t("doc.seller") : t("doc.counterparty");

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

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoDataUrl(dataUrl);
      localStorage.setItem("ebill-logo", dataUrl);
      toast.success("Logo uploaded");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveLogo = useCallback(() => {
    setLogoDataUrl("");
    localStorage.removeItem("ebill-logo");
    if (logoInputRef.current) logoInputRef.current.value = "";
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
    toast.success(`${otherParty.registeredName} ${t("toast.contactSaved")}`);
  }, [otherParty, t]);

  const handleDeleteContact = useCallback(async (id: string) => {
    await deleteContact(id);
    loadContacts().then(setContacts);
    toast.success(t("toast.contactRemoved"));
  }, [t]);

  const handleSelectContact = useCallback((contact: CompanyDetails) => {
    setOtherParty({ ...contact });
    // Save as last used contact
    try { localStorage.setItem("ebill-last-contact", JSON.stringify(contact)); } catch {}
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
        <Input placeholder="e.g. 12345678" className="bg-secondary/50" value={details.companyNumber} onChange={(e) => onChange({ ...details, companyNumber: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("field.vatNumber")}</label>
        <Input placeholder="e.g. GB123456789" className="bg-secondary/50" value={details.vatNumber} onChange={(e) => onChange({ ...details, vatNumber: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">EORI Number</label>
        <Input placeholder="e.g. GB123456789000" className="bg-secondary/50" value={details.eoriNumber || ""} onChange={(e) => onChange({ ...details, eoriNumber: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("field.address")}</label>
        <Input placeholder={t("field.address")} className="bg-secondary/50" value={details.address} onChange={(e) => onChange({ ...details, address: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Country</label>
        <Input placeholder="e.g. United Kingdom" className="bg-secondary/50" value={details.country || ""} onChange={(e) => onChange({ ...details, country: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("field.contactName")}</label>
        <Input placeholder={t("field.contactName")} className="bg-secondary/50" value={details.contactName || ""} onChange={(e) => onChange({ ...details, contactName: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("field.telephone")}</label>
        <Input placeholder="e.g. +44 20 1234 5678" className="bg-secondary/50" value={details.telephone || ""} onChange={(e) => onChange({ ...details, telephone: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("field.email")}</label>
        <Input type="email" placeholder="e.g. john@example.com" className="bg-secondary/50" value={details.email || ""} onChange={(e) => onChange({ ...details, email: e.target.value })} />
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
            <label className="text-sm font-medium text-foreground mb-1 block">Business Logo</label>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            {logoDataUrl ? (
              <div className="flex items-center gap-3">
                <img
                  src={logoDataUrl}
                  alt="Business logo"
                  className="h-16 w-16 object-contain rounded-md border border-border bg-secondary/30 p-1"
                />
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => logoInputRef.current?.click()}>
                    Change
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={handleRemoveLogo}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="text-xs" onClick={() => logoInputRef.current?.click()}>
                <Upload className="mr-1 h-3.5 w-3.5" />
                Upload Logo
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
                    {c.tradingName && <p className="text-xs text-muted-foreground">t/a {c.tradingName}</p>}
                    {c.companyNumber && <p className="text-xs text-muted-foreground">#{c.companyNumber}</p>}
                    {c.vatNumber && <p className="text-xs text-muted-foreground">{t("overview.vat")}: {c.vatNumber}</p>}
                    {c.address && <p className="text-xs text-muted-foreground">{c.address}</p>}
                    {c.country && <p className="text-xs text-muted-foreground">Country: {c.country}</p>}
                    {c.contactName && <p className="text-xs text-muted-foreground">{t("overview.contact")}: {c.contactName}</p>}
                    {c.telephone && <p className="text-xs text-muted-foreground">{t("overview.tel")}: {c.telephone}</p>}
                    {c.email && <p className="text-xs text-muted-foreground">{t("field.email")}: {c.email}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingContactIndex(editingContactIndex === i ? null : i)}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteContact(c.id || '')}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                {editingContactIndex === i && (
                  <div className="px-4 pb-4 border-t border-border pt-3">
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
                placeholder="e.g. Q2 Export Shipment"
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
                <span className="mx-3 text-xs text-muted-foreground uppercase tracking-wider">or</span>
                <div className="flex-1 border-t border-border" />
              </div>
              <button
                onClick={onLoadDemo}
                className="w-full flex items-start gap-3 rounded-lg border border-border px-4 py-3.5 hover:bg-secondary/50 hover:border-primary/30 transition-colors text-left group"
              >
                <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-sm font-medium text-foreground">Explore with an example project</p>
                  <p className="text-xs text-muted-foreground mt-0.5">A pre-filled UK export sale — see every section in action</p>
                </div>
              </button>
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
                    onClick={() => { const opening = !showSetupYourDetails; setShowSetupYourDetails(opening); }}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">{t("setup.yourDetails")}</p>
                      <p className="text-sm font-medium text-foreground">{yourDetails.registeredName || t("setup.notSet")}</p>
                    </div>
                    {showSetupYourDetails ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  {showSetupYourDetails && (
                    <div ref={scrollIntoViewSmooth} className="px-4 pb-4 pt-2 border-t border-border space-y-3">
                      {/* Logo upload */}
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Business Logo</label>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                        {logoDataUrl ? (
                          <div className="flex items-center gap-3">
                            <img
                              src={logoDataUrl}
                              alt="Business logo"
                              className="h-16 w-16 object-contain rounded-md border border-border bg-secondary/30 p-1"
                            />
                            <div className="flex gap-1">
                              <Button variant="outline" size="sm" className="text-xs" onClick={() => logoInputRef.current?.click()}>
                                Change
                              </Button>
                              <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={handleRemoveLogo}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" className="text-xs" onClick={() => logoInputRef.current?.click()}>
                            <Upload className="mr-1 h-3.5 w-3.5" />
                            Upload Logo
                          </Button>
                        )}
                      </div>
                      {companyFields(yourDetails, setYourDetails, "")}
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
                        title="Remove selected party"
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </button>
                    )}
                  </div>
                  {showSetupOtherParty && (
                    <div ref={scrollIntoViewSmooth} className="px-4 pb-4 pt-2 border-t border-border space-y-3">
                      {otherPartyMode === "" && (() => {
                        let lastContact: CompanyDetails | null = null;
                        try {
                          const raw = localStorage.getItem("ebill-last-contact");
                          if (raw) lastContact = JSON.parse(raw);
                        } catch {}

                        return (
                          <div className="space-y-3">
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
                                <span className="text-xs text-muted-foreground shrink-0">Last used</span>
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
                                    {c.tradingName && <p className="text-xs text-muted-foreground">t/a {c.tradingName}</p>}
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
      <label className="text-sm font-medium text-foreground mb-1.5 block">Account Name</label>
      <Input placeholder="e.g. Acme Ltd" className="bg-secondary/50" value={account.accountName} onChange={(e) => onChange({ ...account, accountName: e.target.value })} />
    </div>
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">Bank Name</label>
      <Input placeholder="e.g. Barclays" className="bg-secondary/50" value={account.bankName} onChange={(e) => onChange({ ...account, bankName: e.target.value })} />
    </div>
    {showSortCode && (
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Sort Code</label>
        <Input placeholder="e.g. 20-00-00" className="bg-secondary/50" value={account.sortCode} onChange={(e) => onChange({ ...account, sortCode: e.target.value })} />
      </div>
    )}
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">Account Number</label>
      <Input placeholder="e.g. 12345678" className="bg-secondary/50" value={account.accountNumber} onChange={(e) => onChange({ ...account, accountNumber: e.target.value })} />
    </div>
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">IBAN</label>
      <Input placeholder="e.g. GB29 NWBK 6016 1331 9268 19" className="bg-secondary/50" value={account.iban} onChange={(e) => onChange({ ...account, iban: e.target.value })} />
    </div>
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">BIC / SWIFT</label>
      <Input placeholder="e.g. BARCGB22" className="bg-secondary/50" value={account.bicSwift} onChange={(e) => onChange({ ...account, bicSwift: e.target.value })} />
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
            {!isStandard && value ? `${value} (Other)` : "Other"}
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={otherOpen} onOpenChange={setOtherOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Custom Currency</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Currency Code (e.g. JPY)</label>
              <Input
                placeholder="XXX"
                maxLength={3}
                className="bg-secondary/50 uppercase"
                value={otherCode}
                onChange={(e) => setOtherCode(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Currency Symbol (e.g. ¥)</label>
              <Input
                placeholder="$"
                maxLength={3}
                className="bg-secondary/50"
                value={otherSymbol}
                onChange={(e) => setOtherSymbol(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOtherOpen(false)}>Cancel</Button>
            <Button onClick={handleOtherConfirm} disabled={!otherCode.trim()}>Confirm</Button>
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
    toast.success(`${currency} bank details deleted`);
    setConfirmDelete(null);
  }, []);

  const isFilled = (a: BankAccount) => !!(a.accountName || a.bankName || a.accountNumber || a.iban);

  const yourFilledCount = currencies.filter((c) => isFilled(yourBanks[c] || emptyBankAccount())).length;
  const partyFilledCount = currencies.filter((c) => isFilled(partyBanks[c] || emptyBankAccount())).length;

  const canLock = yourFilledCount >= 1 && partyFilledCount >= 1;

  if (locked) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-foreground">{t("sidebar.bankDetails")}</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            <CheckCircle2 className="h-3 w-3" /> {t("lock.sectionAccepted")}
          </span>
        </div>
        <div className="max-w-lg space-y-2">
          <p className="text-sm text-foreground">Your banks: {yourFilledCount} currency account{yourFilledCount !== 1 ? "s" : ""}</p>
          <p className="text-sm text-foreground">Other party banks: {partyFilledCount} currency account{partyFilledCount !== 1 ? "s" : ""}</p>
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
        <p className="text-sm text-muted-foreground mt-1">Manage bank details for each currency.</p>
      </div>

      {/* Your Bank Details - collapsible */}
      <div className="rounded-md border border-border overflow-hidden">
        <button
          onClick={() => setYourOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
        >
          <div>
            <p className="text-xs text-muted-foreground">Your Bank Details</p>
            <p className="text-sm font-medium text-foreground">
              {yourFilledCount > 0 ? `${yourFilledCount} currenc${yourFilledCount === 1 ? "y" : "ies"} set` : "Not set — click to edit"}
            </p>
          </div>
          {yourOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {yourOpen && (
          <div className="px-4 pb-4 pt-2 border-t border-border space-y-4">
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
                  {cur}
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
                <p className="text-xs text-muted-foreground">Changes are saved automatically.</p>
                {isFilled(currentYourAccount) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmDelete({ type: "your", currency: yourCurrency })}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete {yourCurrency}
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
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
        >
          <div>
            <p className="text-xs text-muted-foreground">Other Party Bank Details</p>
            <p className="text-sm font-medium text-foreground">
              {partyFilledCount > 0 ? `${partyFilledCount} currenc${partyFilledCount === 1 ? "y" : "ies"} set` : "Not set — click to edit"}
            </p>
          </div>
          {partyOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {partyOpen && (
          <div className="px-4 pb-4 pt-2 border-t border-border space-y-4">
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
                  {cur}
                  {isFilled(partyBanks[cur] || emptyBankAccount()) && (
                    <CheckCircle2 className="inline ml-1 h-3 w-3 text-primary" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the other party's bank details. {partyCurrency !== "GBP" && "Include BIC/SWIFT for international transfers."}
            </p>
            <div className="max-w-sm">
              <BankAccountForm
                account={currentPartyAccount}
                onChange={handlePartyChange}
                showSortCode={partyCurrency === "GBP"}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">Changes are saved automatically.</p>
                {isFilled(currentPartyAccount) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmDelete({ type: "party", currency: partyCurrency })}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete {partyCurrency}
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
            <DialogTitle>Delete Bank Details</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete the {confirmDelete?.currency} bank details for {confirmDelete?.type === "your" ? "your account" : "the other party"}? This cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={() => confirmDelete && handleDeleteBank(confirmDelete.type, confirmDelete.currency)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canLock && (
        <div className="flex gap-2">
          {isReEditing && (
            <Button variant="outline" onClick={onCancelEdit}>
              <Undo2 className="mr-1.5 h-3.5 w-3.5" /> Make no changes
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
            {role === "seller" ? "Export" : "Import"}
          </span>
        )}
      </div>

      {selectedDoc === "new-project" ? (
        <div className="flex-1 flex flex-col items-center justify-center p-10">
          <FolderPlus className="h-12 w-12 text-primary mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Start a New Project?</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
            This will close your current project <span className="font-medium text-foreground">"{projectName}"</span> and start fresh.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onNavigate?.("project-overview")}>
              Cancel
            </Button>
            <Button onClick={handleConfirmNewProject}>
              Continue
            </Button>
          </div>
        </div>
      ) : !selectedDoc && accepted ? (
        <div className="flex-1 flex flex-col items-center justify-center p-10">
          <ChevronLeft className="h-10 w-10 text-primary mb-3" />
          <p className="text-lg font-medium text-foreground">Select a section from the left to continue.</p>
          <button
            onClick={() => onNavigate?.("ai-import")}
            className="mt-6 flex items-center gap-3 rounded-md border border-border px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">{t("sidebar.eboxyAI")}</p>
              <p className="text-xs text-muted-foreground">Import documents with AI</p>
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
              {party.tradingName && <p className="text-xs text-muted-foreground">Trading as: {party.tradingName}</p>}
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
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                  <CheckCircle2 className="h-3 w-3" /> {t("lock.sectionAccepted")}
                </span>
              </div>
              {(isDomestic || isInternational) && (
                <p className="text-xs inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-muted-foreground">
                  {isInternational ? "🌐 International trade" : "🏠 Domestic trade"}
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
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
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
                        title="Edit your details"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                </div>
                {expandedParty === "you" && (
                  <div className="px-4 pb-4 pt-1 border-t border-border space-y-1.5">
                    {editingYourDetails ? (
                      <div className="space-y-3 pt-2">
                        {companyFields(yourDetails, setYourDetails, "")}
                        <div className="flex gap-2">
                          <Button size="sm" onClick={async () => { await saveYourDetails(yourDetails); setEditYourDetails(yourDetails); setEditingYourDetails(false); toast.success("Your details updated"); }}>
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            Done
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingYourDetails(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {yourDetails.tradingName && <p className="text-sm text-muted-foreground">{t("overview.tradingAs")}: {yourDetails.tradingName}</p>}
                        {yourDetails.companyNumber && <p className="text-sm text-muted-foreground">{t("overview.company")}: {yourDetails.companyNumber}</p>}
                        {yourDetails.vatNumber && <p className="text-sm text-muted-foreground">{t("overview.vat")}: {yourDetails.vatNumber}</p>}
                        {yourDetails.address && <p className="text-sm text-muted-foreground">{t("field.address")}: {yourDetails.address}</p>}
                        {yourDetails.country && <p className="text-sm text-muted-foreground">Country: {yourDetails.country}</p>}
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
                      title="Edit other party"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    {otherParty.registeredName && (
                      <button
                        onClick={() => { setOtherParty(emptyCompany()); setEditingOtherParty(false); setOtherPartyMode(""); onBackToSetup?.(); }}
                        className="p-2 hover:bg-destructive/10 rounded-md transition-colors"
                        title="Remove other party"
                      >
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
                {expandedParty === "other" && (
                  <div className="px-4 pb-4 pt-1 border-t border-border space-y-1.5">
                    {editingOtherParty ? (
                      <div className="space-y-3 pt-2">
                        {companyFields(otherParty, setOtherParty, "")}
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => { setEditingOtherParty(false); toast.success("Other party details updated"); }}>
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            Done
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingOtherParty(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {otherParty.tradingName && <p className="text-sm text-muted-foreground">{t("overview.tradingAs")}: {otherParty.tradingName}</p>}
                        {otherParty.companyNumber && <p className="text-sm text-muted-foreground">{t("overview.company")}: {otherParty.companyNumber}</p>}
                        {otherParty.vatNumber && <p className="text-sm text-muted-foreground">{t("overview.vat")}: {otherParty.vatNumber}</p>}
                        {otherParty.address && <p className="text-sm text-muted-foreground">{t("field.address")}: {otherParty.address}</p>}
                        {otherParty.country && <p className="text-sm text-muted-foreground">Country: {otherParty.country}</p>}
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
                        Domestic
                      </button>
                      <button
                        onClick={() => setTradeTypeOverride("international")}
                        className={`flex-1 rounded-md px-4 py-2.5 text-center text-sm font-medium border transition-colors cursor-pointer ${
                          activeInternational
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-secondary/50 text-muted-foreground border-border hover:border-muted-foreground/30"
                        }`}
                      >
                        International
                      </button>
                    </div>
                    {isOverridden && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        ⚠️ Attention! {role === "buyer" ? "Buyer" : "Seller"}: {yourDisplay}, {role === "buyer" ? "Seller" : "Buyer"}: {otherDisplay}
                      </p>
                    )}
                    {!bothCountriesSet && !tradeTypeOverride && (
                      <p className="text-xs text-muted-foreground italic">Add country to both parties to auto-detect</p>
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
                  Accept & Lock
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
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Accept & Lock
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onCancelEdit?.("project-overview")}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          );
        })()
      ) : selectedDoc === "ai-import" ? (
        demoParties ? (
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto space-y-5">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-success/10 border-2 border-success/30">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Documents already extracted</h2>
              <p className="text-sm text-muted-foreground">
                eboxy AI has already processed and imported all documents for this project. Every section has been pre-filled from the uploaded trade documents.
              </p>
            </div>
            <div className="w-full rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-left space-y-1.5">
              {[
                "Commercial Invoice — INV-2026-0089",
                "Purchase Order — PO-DBE-20260312",
                "Packing & Delivery Note — DN-2026-0089",
                "Certificate of Origin (UK)",
                "Shipment details & Incoterms",
              ].map((doc) => (
                <div key={doc} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-3.5 w-3.5 text-success shrink-0" />
                  <span>{doc}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground italic">
              This is an example project — in a live project you would upload your own documents here.
            </p>
          </div>
        ) : (
        <div className="space-y-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            AI Import
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Upload or paste any trade document (invoice, purchase order, packing list, etc.) and the system will attempt to extract and prefill the relevant fields automatically.
          </p>
          <div className="flex flex-col gap-3 max-w-md">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-3">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Drag &amp; drop a file here, or click to browse</p>
              <Button variant="outline" size="sm" disabled>
                Browse Files
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">Supported: PDF, images, Word documents, Excel spreadsheets</p>
            <p className="text-xs text-muted-foreground text-center italic">Coming soon — AI processing will be enabled in a future update.</p>
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

          // 1. Amount consistency across estimate, PO, invoice, transaction
          const amountSources: { label: string; docId: string; value: string }[] = [
            { label: "Transaction", docId: "transaction", value: val("transaction", "billAmount") },
            { label: "Estimate / Quote", docId: "estimate-quote", value: val("estimate-quote", "amount") },
            { label: "Purchase Order", docId: "purchase-order", value: val("purchase-order", "amount") },
            { label: "Invoice", docId: "invoice", value: val("invoice", "amount") },
          ].filter((s) => s.value);

          if (amountSources.length >= 2) {
            const amounts = amountSources.map((s) => parseFloat(s.value));
            const allMatch = amounts.every((a) => a === amounts[0]);
            if (allMatch) {
              checks.push({ label: "Amounts match across documents", status: "pass", details: `All ${amountSources.length} sources show ${amounts[0].toFixed(2)}` });
            } else {
              checks.push({
                label: "Amount discrepancy detected",
                status: "warn",
                details: amountSources.map((s) => `${s.label}: ${parseFloat(s.value).toFixed(2)}`).join(" · "),
                links: amountSources.map((s) => ({ label: s.label, docId: s.docId })),
              });
            }
          } else if (amountSources.length === 1) {
            checks.push({ label: "Amount", status: "pass", details: `Only ${amountSources[0].label} has an amount (${parseFloat(amountSources[0].value).toFixed(2)})` });
          } else {
            checks.push({ label: "Amount", status: "missing", details: "No amounts entered in any document", links: [{ label: "Transaction", docId: "transaction" }] });
          }

          // 2. Currency consistency
          const currSources: { label: string; docId: string; value: string }[] = [
            { label: "Transaction", docId: "transaction", value: val("transaction", "currency") },
            { label: "Estimate / Quote", docId: "estimate-quote", value: val("estimate-quote", "docCurrency") },
            { label: "Purchase Order", docId: "purchase-order", value: val("purchase-order", "docCurrency") },
            { label: "Invoice", docId: "invoice", value: val("invoice", "docCurrency") },
          ].filter((s) => s.value);

          if (currSources.length >= 2) {
            const allMatch = currSources.every((s) => s.value.toUpperCase() === currSources[0].value.toUpperCase());
            if (allMatch) {
              checks.push({ label: "Currencies match", status: "pass", details: currSources[0].value.toUpperCase() });
            } else {
              checks.push({
                label: "Currency mismatch",
                status: "warn",
                details: currSources.map((s) => `${s.label}: ${s.value}`).join(" · "),
                links: currSources.map((s) => ({ label: s.label, docId: s.docId })),
              });
            }
          } else if (currSources.length === 1) {
            checks.push({ label: "Currency", status: "pass", details: currSources[0].value.toUpperCase() });
          }

          // 3. Counterparty consistency
          const partyLabel = role === "seller" ? "Buyer" : role === "buyer" ? "Seller" : "Counterparty";
          const partySources: { label: string; docId: string; value: string }[] = [
            { label: "Estimate / Quote", docId: "estimate-quote", value: val("estimate-quote", "counterparty") },
            { label: "Purchase Order", docId: "purchase-order", value: val("purchase-order", "counterparty") },
            { label: "Invoice", docId: "invoice", value: val("invoice", "counterparty") },
          ].filter((s) => s.value);

          if (partySources.length >= 2) {
            const allMatch = partySources.every((s) => s.value.toLowerCase() === partySources[0].value.toLowerCase());
            if (allMatch) {
              checks.push({ label: `${partyLabel} matches`, status: "pass", details: partySources[0].value });
            } else {
              checks.push({
                label: `${partyLabel} name mismatch`,
                status: "warn",
                details: partySources.map((s) => `${s.label}: ${s.value}`).join(" · "),
                links: partySources.map((s) => ({ label: s.label, docId: s.docId })),
              });
            }
          }

          // 4. Date consistency
          const dateSources: { label: string; docId: string; value: string }[] = [
            { label: "Transaction", docId: "transaction", value: val("transaction", "issueDate") },
            { label: "Estimate / Quote", docId: "estimate-quote", value: val("estimate-quote", "date") },
            { label: "Purchase Order", docId: "purchase-order", value: val("purchase-order", "date") },
            { label: "Invoice", docId: "invoice", value: val("invoice", "date") },
          ].filter((s) => s.value);

          if (dateSources.length >= 2) {
            const allMatch = dateSources.every((s) => s.value === dateSources[0].value);
            if (allMatch) {
              checks.push({ label: "Dates match", status: "pass", details: dateSources[0].value });
            } else {
              checks.push({
                label: "Date differences found",
                status: "warn",
                details: dateSources.map((s) => `${s.label}: ${s.value}`).join(" · "),
                links: dateSources.map((s) => ({ label: s.label, docId: s.docId })),
              });
            }
          }

          // 5. Required sections filled
          const requiredSections = [
            { label: "Transaction Details", docId: "transaction", keys: ["billAmount", "drawer", "drawee"] },
            { label: "Shipment Details", docId: "shipment", keys: ["incoterms", "portLoading", "portDischarge"] },
            { label: "Products", docId: "product-details", keys: ["productLines"] },
          ];
          for (const sec of requiredSections) {
            const data = allForms[sec.docId] || {};
            const filled = sec.keys.some((k) => data[k]?.trim());
            checks.push({
              label: `${sec.label} completed`,
              status: filled ? "pass" : "missing",
              details: filled ? undefined : "Section has no data",
              links: [{ label: sec.label, docId: sec.docId }],
            });
          }

          // 6. Product total vs transaction amount
          const prodTotal = productTotals.totalIncTax;
          const txnAmount = parseFloat(val("transaction", "billAmount")) || 0;
          if (prodTotal > 0 && txnAmount > 0 && Math.abs(prodTotal - txnAmount) > 0.01) {
            checks.push({
              label: "Product total ≠ transaction amount",
              status: "warn",
              details: `Products total: ${prodTotal.toFixed(2)} · Transaction: ${txnAmount.toFixed(2)}`,
              links: [
                { label: "Products", docId: "product-details" },
                { label: "Transaction", docId: "transaction" },
              ],
            });
          } else if (prodTotal > 0 && txnAmount > 0) {
            checks.push({ label: "Product total matches transaction", status: "pass", details: prodTotal.toFixed(2) });
          }

          const warnings = checks.filter((c) => c.status === "warn");
          const missing = checks.filter((c) => c.status === "missing");
          const passed = checks.filter((c) => c.status === "pass");

          return (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-foreground">{t("eboxy.title")}</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Review the checklist below before generating your eBill of Exchange. Discrepancies are highlighted for your review.
              </p>

              {/* Summary */}
              <div className="flex gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 font-medium">
                  ✓ {passed.length} passed
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 text-destructive px-3 py-1 font-medium">
                  ⚠ {warnings.length} discrepanc{warnings.length === 1 ? "y" : "ies"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted text-muted-foreground px-3 py-1 font-medium">
                  ○ {missing.length} missing
                </span>
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
                    {passed.length} passed check{passed.length !== 1 ? "s" : ""}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-2">
                    {checks.filter(c => c.status === "pass").map((check, i) => (
                      <EboxyCheckItem key={i} check={check} onNavigate={onNavigate} />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Confirmation Fields */}
              <div className="max-w-lg space-y-4 pt-2 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground">Confirm & Sign</h3>
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
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 max-w-xs pt-2 border-t border-border">
                <Button
                  variant="default"
                  className="w-full justify-start"
                  disabled={missing.length > 0}
                  onClick={() => toast.info(`${t("eboxy.generate")} — ${t("toast.comingSoon")}`)}
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  {t("eboxy.generate")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => toast.info(`${t("eboxy.upload")} — ${t("toast.comingSoon")}`)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t("eboxy.upload")}
                </Button>
              </div>
            </div>
          );
        })()
      ) : selectedDoc === "coo" ? (
        lockedSections.has("coo") ? (
          <LockedSectionView title="Country of Origin (COO)" fields={[["Country of Origin", field("countryOfOrigin")], ["Certificate", field("cooFileName") || "None"]]} onEdit={() => onUnlockSection?.("coo")} />
        ) : (
        <div className="space-y-5">
          <h2 className="text-base font-semibold text-foreground">Country of Origin (COO)</h2>
          <div className="max-w-lg space-y-4">
            <div>
              <TooltipLabel label="Country of Origin" tooltip="The country where the goods were manufactured or produced." />
              <Input
                placeholder="e.g. United Kingdom"
                className="bg-secondary/50"
                value={field("countryOfOrigin")}
                onChange={set("countryOfOrigin")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground block">COO Certificate (optional)</label>
              <p className="text-xs text-muted-foreground">Attach a Certificate of Origin if required for customs.</p>
              <CooFileAttachment field={field} set={set} onFieldChange={onFieldChange} />
            </div>
          </div>
          {renderSectionButtons("coo", t("save.cooDetails"))}
        </div>
        )
      ) : selectedDoc === "customs" ? (
        lockedSections.has("customs") ? (
          <LockedSectionView title="Tariffs" fields={[["Status", "Tariff lookup completed"]]} onEdit={() => onUnlockSection?.("customs")} />
        ) : (
        <div className="space-y-5">
          <CustomsLookup allForms={allForms} formData={formData} onFieldChange={onFieldChange} />

          {/* Customs Checklists */}
          <div className="space-y-3 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-foreground">Compliance Checklists</h3>
            <Collapsible defaultOpen={role === "seller"}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm font-medium text-foreground hover:text-primary transition-colors py-2">
                <ChevronRight className="h-3.5 w-3.5 transition-transform [[data-state=open]>&]:rotate-90" />
                Export Checklist
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-5 space-y-2 pb-3">
                {[
                  { key: "exportCds", label: "CDS export declaration submitted" },
                  { key: "exportLicence", label: "Export licence obtained (if required)" },
                  { key: "exportEori", label: "EORI number included on documents" },
                  { key: "exportCoo", label: "Certificate of Origin prepared" },
                  { key: "exportInvoice", label: "Commercial invoice matches declaration" },
                  { key: "exportPacking", label: "Packing list completed" },
                  { key: "exportSanctions", label: "Sanctions & export controls checked" },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2.5 cursor-pointer group">
                    <Checkbox
                      checked={field(item.key) === "true"}
                      onCheckedChange={(v) => onFieldChange(item.key, v ? "true" : "")}
                    />
                    <span className={cn("text-sm", field(item.key) === "true" ? "text-muted-foreground line-through" : "text-foreground")}>{item.label}</span>
                  </label>
                ))}
              </CollapsibleContent>
            </Collapsible>
            <Collapsible defaultOpen={role === "buyer"}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm font-medium text-foreground hover:text-primary transition-colors py-2">
                <ChevronRight className="h-3.5 w-3.5 transition-transform [[data-state=open]>&]:rotate-90" />
                Import Checklist
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-5 space-y-2 pb-3">
                {[
                  { key: "importCds", label: "CDS import declaration submitted" },
                  { key: "importDuty", label: "Import duty paid / deferred" },
                  { key: "importVat", label: "Import VAT accounted for" },
                  { key: "importEori", label: "EORI number included on documents" },
                  { key: "importLicence", label: "Import licence obtained (if required)" },
                  { key: "importSafety", label: "Safety & security declaration filed" },
                  { key: "importPhyto", label: "Phytosanitary / health certificates (if applicable)" },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2.5 cursor-pointer group">
                    <Checkbox
                      checked={field(item.key) === "true"}
                      onCheckedChange={(v) => onFieldChange(item.key, v ? "true" : "")}
                    />
                    <span className={cn("text-sm", field(item.key) === "true" ? "text-muted-foreground line-through" : "text-foreground")}>{item.label}</span>
                  </label>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </div>

          {renderSectionButtons("customs", t("save.tariffs"))}
        </div>
        )
      ) : selectedDoc === "handy-tools" ? (
        <div className="space-y-5">
          <h2 className="text-base font-semibold text-foreground">Handy Tools & Resources</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Guides, tools and checklists for international trade — organised by what you need.
          </p>

          {/* Getting Started */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm font-semibold text-foreground hover:text-primary transition-colors py-2 border-b border-border">
              <ChevronRight className="h-3.5 w-3.5 transition-transform [[data-state=open]>&]:rotate-90" />
              Getting Started — One-Time Setup
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 pb-1">
              <div className="grid gap-3 max-w-lg">
                {[
                  { label: "Register Your Business", url: "https://www.gov.uk/set-up-business", desc: "Choose your business structure and register with Companies House and HMRC." },
                  { label: "Register for VAT", url: "https://www.gov.uk/vat-registration", desc: "Register your business for VAT if your taxable turnover exceeds the threshold." },
                  { label: "Get an EORI Number", url: "https://www.gov.uk/eori", desc: "Apply for an Economic Operators Registration and Identification number — required for all imports/exports." },
                  { label: "Customs Declaration Service Setup", url: "https://www.gov.uk/guidance/get-access-to-the-customs-declaration-service", desc: "Set up access to HMRC's Customs Declaration Service." },
                ].map((tool) => (
                  <ToolLink key={tool.url} {...tool} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Export Tools */}
          <Collapsible defaultOpen={role === "seller"}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm font-semibold text-foreground hover:text-primary transition-colors py-2 border-b border-border">
              <ChevronRight className="h-3.5 w-3.5 transition-transform [[data-state=open]>&]:rotate-90" />
              Export Tools
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 pb-1">
              <div className="grid gap-3 max-w-lg">
                {[
                  { label: "Export Goods from the UK", url: "https://www.gov.uk/export-goods", desc: "Step-by-step guide to exporting goods from the UK." },
                  { label: "UK Export Finance", url: "https://www.gov.uk/government/organisations/uk-export-finance", desc: "Government-backed finance and insurance for UK exporters." },
                  { label: "Check Export Licensing", url: "https://www.gov.uk/guidance/beginners-guide-to-export-controls", desc: "Determine if your goods need an export licence." },
                  { label: "Customs Declaration Service", url: "https://www.gov.uk/guidance/get-access-to-the-customs-declaration-service", desc: "Submit export declarations through CDS." },
                  { label: "Incoterms® 2020", url: "https://iccwbo.org/business-solutions/incoterms-rules/incoterms-2020/", desc: "ICC rules defining responsibilities of buyers and sellers." },
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
              Import Tools
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 pb-1">
              <div className="grid gap-3 max-w-lg">
                {[
                  { label: "Import Goods into the UK", url: "https://www.gov.uk/import-goods-into-uk", desc: "Step-by-step guide to importing goods into the UK." },
                  { label: "UK Trade Tariff", url: "https://www.trade-tariff.service.gov.uk", desc: "Look up commodity codes, duty rates, and trade restrictions." },
                  { label: "Customs Declaration Service", url: "https://www.gov.uk/guidance/get-access-to-the-customs-declaration-service", desc: "Submit import declarations through CDS." },
                  { label: "Postponed VAT Accounting", url: "https://www.gov.uk/guidance/check-when-you-can-account-for-import-vat-on-your-vat-return", desc: "Account for import VAT on your VAT return instead of paying at the border." },
                  { label: "Incoterms® 2020", url: "https://iccwbo.org/business-solutions/incoterms-rules/incoterms-2020/", desc: "ICC rules defining responsibilities of buyers and sellers." },
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
              Handy Resources
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 pb-1">
              <div className="grid gap-3 max-w-lg">
                {[
                  { label: "Dept. for Business & Trade", url: "https://www.gov.uk/government/organisations/department-for-business-and-trade", desc: "Government department supporting UK businesses in international trade." },
                  { label: "HMRC", url: "https://www.gov.uk/government/organisations/hm-revenue-customs", desc: "HM Revenue & Customs — tax, customs, and excise." },
                  { label: "International Chamber of Commerce", url: "https://iccwbo.org", desc: "Global business organisation promoting trade and investment." },
                  { label: "Check Sanctions List", url: "https://sanctionssearchapp.ofsi.hmtreasury.gov.uk", desc: "OFSI sanctions search — check if a party is on the UK sanctions list." },
                ].map((tool) => (
                  <ToolLink key={tool.url} {...tool} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      ) : selectedDoc === "product-details" ? (
        lockedSections.has("product-details") ? (
          <LockedSectionView title="Products" fields={[["Products", "Product details completed"]]} onEdit={() => onUnlockSection?.("product-details")} />
        ) : (
        <div className="space-y-5">
          <ProductDetails formData={formData || {}} onFieldChange={onFieldChange} onSave={onSave} />
          {renderSectionButtons("product-details", t("save.products"))}
        </div>
        )
      ) : selectedDoc === "transaction" ? (
        lockedSections.has("transaction") ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-foreground">{t("txn.title")}</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                <CheckCircle2 className="h-3 w-3" /> {t("lock.sectionAccepted")}
              </span>
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
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
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
               <Input placeholder={suggestedPlace || "City, Country"} className="bg-secondary/50" value={field("placeOfIssue") || suggestedPlace} onChange={set("placeOfIssue")} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("ship.incoterms")}</label>
               <select className="w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring" value={field("incoterms")} onChange={set("incoterms")}>
                 <option value="">{t("ship.selectIncoterm")}</option>
                 <option value="EXW">EXW – Ex Works</option>
                 <option value="FCA">FCA – Free Carrier</option>
                 <option value="FAS">FAS – Free Alongside Ship</option>
                 <option value="FOB">FOB – Free on Board</option>
                 <option value="CFR">CFR – Cost and Freight</option>
                 <option value="CIF">CIF – Cost, Insurance &amp; Freight</option>
                 <option value="CPT">CPT – Carriage Paid To</option>
                 <option value="CIP">CIP – Carriage &amp; Insurance Paid To</option>
                 <option value="DAP">DAP – Delivered at Place</option>
                 <option value="DPU">DPU – Delivered at Place Unloaded</option>
                 <option value="DDP">DDP – Delivered Duty Paid</option>
               </select>
             </div>
             <div className="col-span-2">
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("txn.paymentTerms")}</label>
               <Input placeholder="e.g. At sight / 30 days after sight" className="bg-secondary/50" value={field("paymentTerms")} onChange={set("paymentTerms")} />
             </div>
             <div className="col-span-2">
               <label className="text-sm font-medium text-foreground mb-1.5 block">{t("txn.endorsementNotes")}</label>
               <Input placeholder="Optional notes" className="bg-secondary/50" value={field("endorsementNotes")} onChange={set("endorsementNotes")} />
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
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                <CheckCircle2 className="h-3 w-3" /> {t("lock.sectionAccepted")}
              </span>
            </div>
            {field("goodsDescription") && (
              <div>
                <p className="text-xs text-muted-foreground">General Goods Description</p>
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
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
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
               <label className="text-sm font-medium text-foreground mb-1.5 block">General Goods Description</label>
               <Input placeholder="Brief description of goods being shipped" className="bg-secondary/50" value={field("goodsDescription")} onChange={set("goodsDescription")} />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("ship.incoterms")}</label>
                 <select className="w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring" value={field("incoterms") || txnIncoterms} onChange={set("incoterms")}>
                   <option value="">{t("ship.selectIncoterm")}</option>
                   <option value="EXW">EXW – Ex Works</option>
                   <option value="FCA">FCA – Free Carrier</option>
                   <option value="FAS">FAS – Free Alongside Ship</option>
                   <option value="FOB">FOB – Free on Board</option>
                   <option value="CFR">CFR – Cost and Freight</option>
                   <option value="CIF">CIF – Cost, Insurance &amp; Freight</option>
                   <option value="CPT">CPT – Carriage Paid To</option>
                   <option value="CIP">CIP – Carriage &amp; Insurance Paid To</option>
                   <option value="DAP">DAP – Delivered at Place</option>
                   <option value="DPU">DPU – Delivered at Place Unloaded</option>
                   <option value="DDP">DDP – Delivered Duty Paid</option>
                 </select>
                 {txnIncoterms && !field("incoterms") && (
                   <p className="text-xs text-muted-foreground mt-1">Pre-selected from transaction</p>
                 )}
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("ship.transportMode")}</label>
                 <Input placeholder="e.g. Sea, Air, Road" className="bg-secondary/50" value={field("transportMode")} onChange={set("transportMode")} />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("ship.portLoading")}</label>
                 <Input placeholder="e.g. Portsmouth, UK" className="bg-secondary/50" value={field("portLoading")} onChange={set("portLoading")} />
               </div>
               <div>
                 <label className="text-sm font-medium text-foreground mb-1.5 block">{t("ship.portDischarge")}</label>
                 <Input placeholder="e.g. Saint Malo, France" className="bg-secondary/50" value={field("portDischarge")} onChange={set("portDischarge")} />
               </div>
             </div>
             {/* If Known collapsible */}
             <Collapsible open={ifKnownOpen} onOpenChange={setShipmentIfKnownOpen}>
               <CollapsibleTrigger asChild>
                 <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
                   <ChevronRight className={`h-4 w-4 transition-transform ${ifKnownOpen ? "rotate-90" : ""}`} />
                   If Known
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
                     <Input placeholder="e.g. MSC Gulsun / BA117" className="bg-secondary/50" value={field("vesselFlight")} onChange={set("vesselFlight")} />
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
           <LockedSectionView title="Picking List" fields={[["Picked By", field("pickedBy")], ["Date Picked", field("datePicked")]]} onEdit={() => onUnlockSection?.("picking-list")} />
         ) :
         (() => {
           const productLines = (() => {
             try {
               const raw = allForms["product-details"]?.productLines;
               if (!raw) return [];
               return JSON.parse(raw) as { catalogueId: string; units: string }[];
             } catch { return []; }
           })();
           const catalogue = loadCatalogue();
           const pickedMap: Record<number, boolean> = (() => {
             try {
               const raw = field("pickedItems");
               return raw ? JSON.parse(raw) : {};
             } catch { return {}; }
           })();
           const allPicked = productLines.length > 0 && productLines.every((_, i) => pickedMap[i]);
           return (
             <div className="space-y-5">
               <h2 className="text-base font-semibold text-foreground">Picking List</h2>
               {productLines.length === 0 ? (
                 <p className="text-sm text-muted-foreground">No products added yet. Add products in the Product Details section first.</p>
               ) : (
                 <>
                   <div className="rounded-md border border-border overflow-hidden">
                     <table className="w-full text-sm">
                       <thead>
                         <tr className="border-b border-border bg-secondary/30">
                           <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Product</th>
                           <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Units</th>
                            <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">
                              <div className="flex items-center justify-center gap-2">
                                <span>Picked</span>
                                <Checkbox
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
                        ✓ All items picked
                      </div>
                    )}
                    <div className="flex gap-4 max-w-lg">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Picked by</label>
                        <Input placeholder="Name of picker" className="bg-secondary/50" value={field("pickedBy")} onChange={set("pickedBy")} />
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Date picked</label>
                        <Input type="date" className="bg-secondary/50" value={field("datePicked")} onChange={set("datePicked")} />
                      </div>
                    </div>
                    {renderSectionButtons("picking-list", t("save.pickingList"))}
                 </>
               )}
             </div>
           );
         })()
       ) : selectedDoc === "bank-details" ? (
          <BankDetailsSection txnCurrency={txn.currency || "GBP"} locked={lockedSections.has("bank-details")} onLock={() => { onLockSection?.("bank-details"); }} onUnlock={() => onUnlockSection?.("bank-details")} isReEditing={editingSections.has("bank-details")} onCancelEdit={() => onCancelEdit?.("bank-details")} />
       ) : selectedDoc === "letter-of-credit" ? (
         lockedSections.has("letter-of-credit") ? (
           <LockedSectionView title="Letter of Credit (LC)" fields={[["LC Number", field("lcNumber")], ["Date of Issue", field("lcDateOfIssue")], ["Expiry Date", field("lcExpiryDate")], ["Amount", field("lcAmount")], ["Currency", field("lcCurrency") || txn.currency || "GBP"], ["Issuing Bank", field("lcIssuingBank")], ["Advising Bank", field("lcAdvisingBank")], ["Type", field("lcType")]]} onEdit={() => onUnlockSection?.("letter-of-credit")} colSpanFields={["Terms & Conditions"]} />
          ) : (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
             <Landmark className="h-5 w-5" />
             Letter of Credit (LC)
           </h2>
           <p className="text-sm text-muted-foreground max-w-lg">
             Enter the details of the Letter of Credit issued by the buyer's bank.
           </p>
           <div className="grid grid-cols-2 gap-4 max-w-lg">
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">LC Number</label>
               <Input placeholder="e.g. LC-2026-001" className="bg-secondary/50" value={field("lcNumber")} onChange={set("lcNumber")} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">Date of Issue</label>
               <Input type="date" className="bg-secondary/50" value={field("lcDateOfIssue")} onChange={set("lcDateOfIssue")} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">Expiry Date</label>
               <Input type="date" className="bg-secondary/50" value={field("lcExpiryDate")} onChange={set("lcExpiryDate")} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">LC Amount</label>
               <Input type="number" placeholder="0.00" className="bg-secondary/50" value={field("lcAmount")} onChange={set("lcAmount")} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">Currency</label>
               <CurrencySelect value={field("lcCurrency") || txn.currency || "GBP"} onChange={(v) => onFieldChange("lcCurrency", v)} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">Issuing Bank</label>
               <Input placeholder="e.g. HSBC" className="bg-secondary/50" value={field("lcIssuingBank")} onChange={set("lcIssuingBank")} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">Advising Bank</label>
               <Input placeholder="e.g. Barclays" className="bg-secondary/50" value={field("lcAdvisingBank")} onChange={set("lcAdvisingBank")} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">Applicant (Buyer)</label>
               <Input placeholder="Buyer name" className="bg-secondary/50" value={docField("lcApplicant", txn.drawee || "")} onChange={set("lcApplicant")} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">Beneficiary (Seller)</label>
               <Input placeholder="Seller name" className="bg-secondary/50" value={docField("lcBeneficiary", txn.drawer || "")} onChange={set("lcBeneficiary")} />
             </div>
             <div>
               <label className="text-sm font-medium text-foreground mb-1.5 block">Type of LC</label>
               <select
                 className="flex h-10 w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                 value={field("lcType")}
                 onChange={(e) => onFieldChange("lcType", e.target.value)}
               >
                 <option value="">Select type...</option>
                 <option value="irrevocable">Irrevocable</option>
                 <option value="revocable">Revocable</option>
                 <option value="confirmed">Confirmed</option>
                 <option value="unconfirmed">Unconfirmed</option>
                 <option value="transferable">Transferable</option>
                 <option value="standby">Standby</option>
               </select>
             </div>
             <div className="col-span-2">
               <label className="text-sm font-medium text-foreground mb-1.5 block">Place of Expiry</label>
               <Input placeholder="e.g. London, UK" className="bg-secondary/50" value={field("lcPlaceOfExpiry")} onChange={set("lcPlaceOfExpiry")} />
             </div>
             <div className="col-span-2">
               <label className="text-sm font-medium text-foreground mb-1.5 block">Terms &amp; Conditions</label>
               <textarea
                 placeholder="LC terms, required documents, special conditions..."
                 className="flex min-h-[80px] w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                 value={field("lcTerms")}
                 onChange={(e) => onFieldChange("lcTerms", e.target.value)}
               />
             </div>
             <div className="col-span-2">
               <label className="text-sm font-medium text-foreground mb-1.5 block">Notes</label>
               <textarea
                 placeholder="Additional notes..."
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
                onClick={() => toast.info(`Attach LC document — ${t("toast.comingSoon")}`)}
              >
                <Paperclip className="mr-2 h-4 w-4" />
                Upload LC Document
              </Button>
            </div>
          </div>
         )
       ) : isDocumentType ? (
          lockedSections.has(selectedDoc!) ? (
            <LockedSectionView title={selectedDoc!.replace("-", " ").replace(/\b\w/g, c => c.toUpperCase())} fields={[["Reference No", field("referenceNo")], ["Date", field("date") || preDate], [counterpartyLabel, field("counterparty") || preCounterparty], ["Amount", field("amount") || preAmount], ["Currency", field("docCurrency") || preCurrency || "GBP"]]} onEdit={() => onUnlockSection?.(selectedDoc!)} colSpanFields={["Notes"]} />
          ) :
          (() => {
            // Determine if this doc is upload-only based on role
            const uploadOnlySellerDocs = ["purchase-order"];
            const uploadOnlyBuyerDocs = ["estimate-quote", "invoice", "picking-list", "delivery-note"];
            const isUploadOnly = (role === "seller" && uploadOnlySellerDocs.includes(selectedDoc!)) ||
                                 (role === "buyer" && uploadOnlyBuyerDocs.includes(selectedDoc!));

            return (
              <div className="space-y-5">
                <h2 className="text-base font-semibold text-foreground capitalize">
                  {selectedDoc!.replace("-", " ")}
                </h2>

                {!isUploadOnly && (
                  <div className="border-t border-border pt-5">
                    <p className="text-xs text-muted-foreground mb-4">
                      {t("doc.preFilled")}
                    </p>
                    <div className="grid grid-cols-2 gap-4 max-w-lg">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("doc.referenceNo")}</label>
                        <Input placeholder="e.g. INV-001" className="bg-secondary/50" value={field("referenceNo")} onChange={set("referenceNo")} />
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
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Notes</label>
                        <textarea
                          placeholder="Add any notes for this document..."
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={field("notes")}
                          onChange={(e) => onFieldChange("notes", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button onClick={onSave}>{t("doc.save")} {selectedDoc!.replace("-", " ")}</Button>
                    </div>
                  </div>
                )}

                {isUploadOnly && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      This document is provided by the other party. Attach the received document below.
                    </p>
                    <div className="max-w-lg space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Notes</label>
                        <textarea
                          placeholder="Add any notes for this document..."
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={field("notes")}
                          onChange={(e) => onFieldChange("notes", e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={onSave}>{t("doc.save")} {selectedDoc!.replace("-", " ")}</Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-border pt-5 flex gap-3 max-w-md">
                  <Button
                    variant="outline"
                    className="flex-1 justify-center"
                    onClick={() => toast.info(`Attach document — ${t("toast.comingSoon")}`)}
                  >
                    <Paperclip className="mr-2 h-4 w-4" />
                    Attach Document
                  </Button>
                  {!isUploadOnly && (
                    <Button
                      variant="default"
                      className="flex-1 justify-center"
                      onClick={() => toast.info(`${t("doc.generate")} — ${t("toast.comingSoon")}`)}
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      {t("doc.generate")}
                    </Button>
                  )}
                </div>

                <div className="border-t border-border pt-5 max-w-md">
                  {renderSectionButtons(selectedDoc!, t("lock.acceptLock"))}
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
