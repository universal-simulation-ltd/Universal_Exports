import { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText,
  Package,
  Receipt,
  ClipboardList,
  Truck,
  CreditCard,
  Info,
  Ship,
  FolderPlus,
  FolderOpen,
  Stamp,
  ShoppingCart,
  User,
  Users,
  Globe,
  ChevronRight,
  Landmark,
  Sparkles,
  ShieldCheck,
  Building2,
  PanelLeftClose,
  Menu,
} from "lucide-react";
import { Check } from "lucide-react";
import ueLogo from "@/assets/universal-exports-logo.svg";
import ueIconWhite from "@/assets/universal-exports-icon-white.svg";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import BrandFooter from "@/components/BrandFooter";

interface DocumentSidebarProps {
  selected: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
  disabledDocs?: string[];
  incompleteSections?: string[];
  projectStarted?: boolean;
  accepted?: boolean;
  hasDocsCreated?: boolean;
  hasProductData?: boolean;
  hasAnyDocFilled?: boolean;
  allForms?: Record<string, Record<string, string>>;
  role?: string;
  onNewProject: () => void;
  onLoadProjects: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  lockedSections?: Set<string>;
  savedSections?: Set<string>;
  forceExpandSections?: boolean;
}

// Required fields per document (notes excluded)
const docRequiredFields: Record<string, string[]> = {
  "estimate-quote": ["referenceNo", "date", "counterparty", "amount", "docCurrency"],
  "purchase-order": ["referenceNo", "date", "counterparty", "amount", "docCurrency"],
  "invoice": ["referenceNo", "date", "counterparty", "amount", "docCurrency"],
  "picking-list": ["pickedItems", "pickedBy", "datePicked"],
  "delivery-note": ["referenceNo", "date", "counterparty", "amount", "docCurrency"],
  "credit-note": ["referenceNo", "date", "counterparty", "amount", "docCurrency"],
  "receipt": ["referenceNo", "date", "counterparty", "amount", "docCurrency"],
  "letter-of-credit": ["referenceNo", "date", "counterparty", "amount", "docCurrency"],
  "transaction": ["drawer", "drawee", "payee", "issueDate", "maturityDate", "billAmount", "currency"],
  "shipment": ["portLoading", "portDischarge"],
  "product-details": ["productLines"],
  "coo": ["countryOfOrigin"],
  "customs": ["appliedRules"],
};

// Upload-only docs per role — these only need an attached file
const uploadOnlyByRole: Record<string, string[]> = {
  seller: ["purchase-order"],
  buyer: ["estimate-quote", "invoice", "picking-list", "delivery-note"],
};

type DocStatus = "none" | "partial" | "complete";

function getDocStatus(formData: Record<string, string> | undefined, docId: string, role: string, savedSections?: Set<string>): DocStatus {
  if (!formData || Object.keys(formData).length === 0) {
    // If explicitly saved but no data, show partial
    if (savedSections?.has(docId)) return "partial";
    return "none";
  }

  const uploadOnly = uploadOnlyByRole[role] || [];
  if (uploadOnly.includes(docId)) {
    const hasAttachment = formData["attachedFileName"] && formData["attachedFileName"].trim() !== "";
    const hasNotes = formData["notes"] && formData["notes"].trim() !== "";
    if (hasAttachment || hasNotes) return "complete";
    return "none";
  }

  const fields = docRequiredFields[docId];
  if (!fields) {
    if (savedSections?.has(docId)) return "partial";
    return "none";
  }

  const filled = fields.filter((f) => formData[f] && formData[f].trim() !== "");
  if (filled.length === 0) {
    if (savedSections?.has(docId)) return "partial";
    return "none";
  }
  if (filled.length === fields.length) return "complete";
  return "partial";
}

const DocumentSidebar = ({ selected, onSelect, disabled, disabledDocs = [], incompleteSections = [], projectStarted, accepted, hasDocsCreated, hasProductData, hasAnyDocFilled, allForms = {}, role = "", onNewProject, onLoadProjects, collapsed = false, onToggleCollapse, lockedSections = new Set(), savedSections = new Set(), forceExpandSections = false }: DocumentSidebarProps) => {
  const { t } = useI18n();
  const [userLogo, setUserLogo] = useState<string>(() => localStorage.getItem("ebill-logo") || "");

  useEffect(() => {
    const sync = () => setUserLogo(localStorage.getItem("ebill-logo") || "");
    window.addEventListener("storage", sync);
    const interval = setInterval(sync, 1000);
    return () => {
      window.removeEventListener("storage", sync);
      clearInterval(interval);
    };
  }, []);
  const [addressBookOpen, setAddressBookOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(true);
  const [projectDetailsOpen, setProjectDetailsOpen] = useState(true);
  const [productDetailsOpen, setProductDetailsOpen] = useState(true);
  const [documentsOpen, setDocumentsOpen] = useState(true);
  const [shipmentOpen, setShipmentOpen] = useState(true);
  const [ebillOpen, setEbillOpen] = useState(true);

  // Scroll fade
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fadeTop, setFadeTop] = useState(false);
  const [fadeBottom, setFadeBottom] = useState(false);
  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setFadeTop(el.scrollTop > 20);
    setFadeBottom(el.scrollHeight - el.scrollTop - el.clientHeight > 20);
  }, []);
  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => { el.removeEventListener("scroll", checkScroll); observer.disconnect(); };
  }, [checkScroll]);
  useEffect(() => {
    if (projectStarted) {
      setAddressBookOpen(false);
    }
  }, [projectStarted]);

  // Collapse projects section when project is accepted
  useEffect(() => {
    if (accepted) {
      setProjectsOpen(false);
    }
  }, [accepted]);

  // Force-expand key sections (e.g. when demo project is loaded)
  useEffect(() => {
    if (forceExpandSections) {
      setProjectDetailsOpen(true);
      setProductDetailsOpen(true);
      setDocumentsOpen(true);
    }
  }, [forceExpandSections]);

  const projectDetailItems = [
    { id: "project-overview", label: t("sidebar.projectOverview"), icon: FileText },
    { id: "transaction", label: t("sidebar.transaction"), icon: Info },
  ];

  // Check if all project detail items are locked
  const allProjectDetailsComplete = projectDetailItems.every(
    (item) => lockedSections.has(item.id)
  );

  // Auto-collapse project details when all locked or products are filled
  useEffect(() => {
    if (hasProductData && !forceExpandSections) {
      setProjectDetailsOpen(false);
    }
  }, [hasProductData, forceExpandSections]);

  useEffect(() => {
    if (allProjectDetailsComplete && !forceExpandSections) {
      setProjectDetailsOpen(false);
    }
  }, [allProjectDetailsComplete, forceExpandSections]);

  // Auto-collapse product details when a document is filled or all product details complete
  useEffect(() => {
    if (hasAnyDocFilled && !forceExpandSections) {
      setProductDetailsOpen(false);
    }
  }, [hasAnyDocFilled, forceExpandSections]);

  const isComplete = (id: string) => {
    if (lockedSections.has(id)) return true;
    const status = getDocStatus(allForms[id], id, role, savedSections);
    return status === "complete";
  };

  const btnClass = (id: string) => {
    const complete = isComplete(id);
    return `w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
      selected === id
        ? complete
          ? "bg-success/20 text-foreground font-medium"
          : "bg-accent text-accent-foreground font-medium"
        : complete
        ? "bg-success/10 text-foreground hover:bg-success/15"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    } disabled:opacity-40 disabled:cursor-not-allowed`;
  };

  const primaryBtnClass = (id: string) => {
    const isActive = selected === id;
    const isDisabled = !accepted;
    return `w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? "bg-primary text-primary-foreground"
        : isDisabled
          ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
          : "bg-primary/10 text-primary hover:bg-primary/20"
    }`;
  };

  const documentTypes = [
    { id: "estimate-quote", label: t("sidebar.estimateQuote"), icon: FileText },
    { id: "purchase-order", label: t("sidebar.purchaseOrder"), icon: Package },
    { id: "invoice", label: t("sidebar.invoice"), icon: FileText },
  ];

  const shipmentDocTypes = [
    { id: "picking-list", label: t("sidebar.pickingList"), icon: ClipboardList },
    { id: "delivery-note", label: t("sidebar.deliveryNote"), icon: Truck },
  ];

  const paymentItems = [
    { id: "bank-details", label: t("sidebar.bankDetails"), icon: Building2 },
    { id: "receipt", label: t("sidebar.receipt"), icon: Receipt },
    { id: "credit-note", label: t("sidebar.creditNote"), icon: CreditCard },
    { id: "letter-of-credit", label: t("sidebar.letterOfCredit"), icon: Landmark },
  ];

  const productDetailItems = [
    { id: "product-details", label: t("sidebar.products"), icon: ShoppingCart },
    { id: "coo", label: t("sidebar.cooOrigin"), icon: Globe },
  ];

  const statusIndicator = (id: string) => {
    if (lockedSections.has(id)) return <Check className="h-3.5 w-3.5 text-success shrink-0" />;
    const status = getDocStatus(allForms[id], id, role, savedSections);
    if (status === "complete") return <Check className="h-3.5 w-3.5 text-success shrink-0" />;
    if (status === "partial") return <Check className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />;
    return null;
  };

  // Check if all items in a group are complete
  const allProductDetailsComplete = productDetailItems.every(
    (item) => disabledDocs.includes(item.id) || lockedSections.has(item.id) || getDocStatus(allForms[item.id], item.id, role, savedSections) === "complete"
  ) && productDetailItems.some((item) => !disabledDocs.includes(item.id));

  useEffect(() => {
    if (allProductDetailsComplete && !forceExpandSections) {
      setProductDetailsOpen(false);
    }
  }, [allProductDetailsComplete, forceExpandSections]);

  if (collapsed) {
    return (
      <aside className="w-12 shrink-0 border-r border-border bg-card rounded-l-lg flex flex-col items-center py-3 gap-3">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shadow-sm">
          <img src={ueIconWhite} alt="Universal Exports" className="w-5 h-5 object-contain" />
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card rounded-l-lg flex flex-col min-h-0 relative">
      <div className="flex-1 min-h-0 relative">
      {/* Scroll fade overlays */}
      <div className={`pointer-events-none absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-card to-transparent transition-opacity duration-300 z-10 rounded-tl-lg ${fadeTop ? "opacity-100" : "opacity-0"}`} />
      <div className={`pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent transition-opacity duration-300 z-10 ${fadeBottom ? "opacity-100" : "opacity-0"}`} />
      <div ref={scrollRef} className="h-full overflow-y-auto overflow-x-hidden">
      <div className="px-4 pt-2 pb-0 flex justify-end">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Collapse menu"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
      <div className="px-4 pt-0 pb-2">
        <img src={userLogo || ueLogo} alt="Universal Exports logo" className="w-full max-h-24 object-contain" />
      </div>
      <div className="px-4 pb-4 space-y-5">
        {/* eboxy AI - always visible */}
        <div>
          <nav className="space-y-1">
            <button onClick={() => { if (!accepted) { toast.info(t("toast.createProject")); return; } onSelect("ai-import"); }} className={primaryBtnClass("ai-import")} disabled={!accepted}>
              <Sparkles className="h-4 w-4" />
              <span className="flex-1 text-left">{t("sidebar.eboxyAI")}</span>
            </button>
          </nav>
        </div>

        {/* Contacts */}
        <div>
          <button
            onClick={() => setAddressBookOpen(!addressBookOpen)}
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 hover:text-foreground transition-colors"
          >
            <ChevronRight className={`h-3 w-3 transition-transform ${addressBookOpen ? "rotate-90" : ""}`} />
            {t("sidebar.contacts")}
            {accepted && <Check className="h-3.5 w-3.5 text-success ml-auto" />}
          </button>
          {addressBookOpen && (
            <nav className="space-y-1">
              <button onClick={() => onSelect("your-details")} className={btnClass("your-details")}>
                <User className="h-4 w-4" />
                <span>{t("sidebar.yourDetails")}</span>
              </button>
              <button onClick={() => onSelect("contacts")} className={btnClass("contacts")}>
                <Users className="h-4 w-4" />
                <span>{t("sidebar.contacts")}</span>
              </button>
            </nav>
          )}
        </div>

        {/* Projects */}
        <div>
          <button
            onClick={() => setProjectsOpen(!projectsOpen)}
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 hover:text-foreground transition-colors"
          >
            <ChevronRight className={`h-3 w-3 transition-transform ${projectsOpen ? "rotate-90" : ""}`} />
            {t("sidebar.projects")}
            {accepted && <Check className="h-3.5 w-3.5 text-success ml-auto" />}
          </button>
          {projectsOpen && (
            <nav className="space-y-1">
              <button onClick={onNewProject} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <FolderPlus className="h-4 w-4" />
                <span>{t("sidebar.new")}</span>
              </button>
              <button onClick={onLoadProjects} className={btnClass(selected === "saved-projects" ? "saved-projects" : "")}>
                <FolderOpen className="h-4 w-4" />
                <span>{t("sidebar.saved")}</span>
              </button>
            </nav>
          )}
        </div>

        {!disabled && accepted && (
          <>
            {/* Project Details - collapsible */}
            <div>
              <button
                onClick={() => setProjectDetailsOpen(!projectDetailsOpen)}
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 hover:text-foreground transition-colors"
              >
                <ChevronRight className={`h-3 w-3 transition-transform ${projectDetailsOpen ? "rotate-90" : ""}`} />
                {t("sidebar.projectDetails")}
                {allProjectDetailsComplete && <Check className="h-3.5 w-3.5 text-success ml-auto" />}
              </button>
              {projectDetailsOpen && (
                <nav className="space-y-1">
                  {projectDetailItems.map((item) => (
                    <button key={item.id} onClick={() => onSelect(item.id)} className={btnClass(item.id)}>
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {incompleteSections.includes(item.id) && !statusIndicator(item.id) && (
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                        </span>
                      )}
                      {statusIndicator(item.id)}
                    </button>
                  ))}
                </nav>
              )}
            </div>

            {/* Product Details - collapsible, hidden when all disabled */}
            {!productDetailItems.every((item) => disabledDocs.includes(item.id)) && (
              <div className="animate-fade-in">
                <button
                  onClick={() => setProductDetailsOpen(!productDetailsOpen)}
                  className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 hover:text-foreground transition-colors"
                >
                  <ChevronRight className={`h-3 w-3 transition-transform ${productDetailsOpen ? "rotate-90" : ""}`} />
                  {t("sidebar.productDetails")}
                  {allProductDetailsComplete && <Check className="h-3.5 w-3.5 text-success ml-auto" />}
                </button>
                {productDetailsOpen && (
                  <nav className="space-y-1">
                    {productDetailItems.map((item) => (
                      <button key={item.id} onClick={() => onSelect(item.id)} disabled={disabledDocs.includes(item.id)} className={btnClass(item.id)}>
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {!disabledDocs.includes(item.id) && incompleteSections.includes(item.id) && !statusIndicator(item.id) && (
                          <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                          </span>
                        )}
                        {!disabledDocs.includes(item.id) && statusIndicator(item.id)}
                      </button>
                    ))}
                  </nav>
                )}
              </div>
            )}

            {/* Documents - collapsed when all items disabled */}
            {!documentTypes.every((doc) => disabledDocs.includes(doc.id)) && (
              <div className="animate-fade-in">
                <button
                  onClick={() => setDocumentsOpen(!documentsOpen)}
                  className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 hover:text-foreground transition-colors"
                >
                  <ChevronRight className={`h-3 w-3 transition-transform ${documentsOpen ? "rotate-90" : ""}`} />
                  {t("sidebar.documents")}
                </button>
                {documentsOpen && (
                  <nav className="space-y-1">
                    {documentTypes.map((doc) => (
                      <button key={doc.id} onClick={() => onSelect(doc.id)} disabled={disabledDocs.includes(doc.id)} className={btnClass(doc.id)}>
                        <doc.icon className="h-4 w-4" />
                        <span className="flex-1 text-left">{doc.label}</span>
                        {!disabledDocs.includes(doc.id) && statusIndicator(doc.id)}
                      </button>
                    ))}
                  </nav>
                )}
              </div>
            )}

            {/* Shipment Details - appears alongside documents */}
            {!disabledDocs.includes("shipment") && (
              <div className="animate-fade-in">
                <button
                  onClick={() => setShipmentOpen(!shipmentOpen)}
                  className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 hover:text-foreground transition-colors"
                >
                  <ChevronRight className={`h-3 w-3 transition-transform ${shipmentOpen ? "rotate-90" : ""}`} />
                  {t("sidebar.shipmentDetails")}
                  {(lockedSections.has("shipment") || getDocStatus(allForms["shipment"], "shipment", role, savedSections) === "complete") && (
                    <Check className="h-3.5 w-3.5 text-success ml-auto" />
                  )}
                </button>
                {shipmentOpen && (
                  <nav className="space-y-1">
                    <button onClick={() => onSelect("shipment")} className={btnClass("shipment")}>
                      <Ship className="h-4 w-4" />
                      <span className="flex-1 text-left">{t("sidebar.shipmentDetails")}</span>
                      {statusIndicator("shipment")}
                    </button>
                    {shipmentDocTypes
                      .filter((doc) => !disabledDocs.includes(doc.id))
                      .map((doc) => (
                        <button key={doc.id} onClick={() => onSelect(doc.id)} className={btnClass(doc.id)}>
                          <doc.icon className="h-4 w-4" />
                          <span className="flex-1 text-left">{doc.label}</span>
                          {statusIndicator(doc.id)}
                        </button>
                      ))}
                  </nav>
                )}
              </div>
            )}

            {/* Payment Details - collapsed when all items disabled */}
            {!paymentItems.every((item) => disabledDocs.includes(item.id)) && (
              <div className="animate-fade-in">
                <button
                  onClick={() => setPaymentOpen(!paymentOpen)}
                  className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 hover:text-foreground transition-colors"
                >
                  <ChevronRight className={`h-3 w-3 transition-transform ${paymentOpen ? "rotate-90" : ""}`} />
                  {t("sidebar.paymentDetails")}
                </button>
                {paymentOpen && (
                  <nav className="space-y-1">
                    {paymentItems.map((item) => (
                      <button key={item.id} onClick={() => onSelect(item.id)} disabled={disabledDocs.includes(item.id)} className={btnClass(item.id)}>
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {!disabledDocs.includes(item.id) && statusIndicator(item.id)}
                      </button>
                    ))}
                  </nav>
                )}
              </div>
            )}

            {/* Export Agreement - collapsed when disabled */}
            {!disabledDocs.includes("eboxy") && (
              <div className="animate-fade-in">
                <button
                  onClick={() => setEbillOpen(!ebillOpen)}
                  className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 hover:text-foreground transition-colors"
                >
                  <ChevronRight className={`h-3 w-3 transition-transform ${ebillOpen ? "rotate-90" : ""}`} />
                  {t("sidebar.customsCompliance")}
                </button>
                {ebillOpen && (
                  <nav className="space-y-1">
                    <button onClick={() => onSelect("customs")} disabled={disabledDocs.includes("customs")} className={btnClass("customs")}>
                      <ShieldCheck className="h-4 w-4" />
                      <span>{t("sidebar.tariffs")}</span>
                    </button>
                    <button onClick={() => onSelect("handy-tools")} className={btnClass("handy-tools")}>
                      <Sparkles className="h-4 w-4" />
                      <span>{t("sidebar.handyTools")}</span>
                    </button>
                  </nav>
                )}
              </div>
            )}

            {/* eboxy - standalone */}
            {!disabledDocs.includes("eboxy") && (
              <div className="animate-fade-in">
                <nav className="space-y-1">
                  <button onClick={() => onSelect("eboxy")} disabled={disabledDocs.includes("eboxy")} className={primaryBtnClass("eboxy")}>
                    <Stamp className="h-4 w-4" />
                    <span>{t("sidebar.eboxy")}</span>
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
      </div>{/* end scroll wrapper */}
      </div>{/* end scrollable region */}
      <div className="px-4 py-3 border-t border-border bg-card rounded-bl-lg">
        <BrandFooter variant="sidebar" />
      </div>
    </aside>
  );
};

export default DocumentSidebar;
