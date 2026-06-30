import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DocumentSidebar from "@/components/DocumentSidebar";
import MainContent from "@/components/MainContent";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import { ProjectData, loadProjects, saveProject, createProjectId } from "@/lib/projectStore";
import { DEMO_PROJECT, DEMO_YOUR_DETAILS, DEMO_OTHER_PARTY } from "@/lib/demoProject";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CompanyDetails } from "@/lib/contactStore";

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [projectId, setProjectId] = useState<string>("");
  const [projectName, setProjectName] = useState("");
  const [role, setRole] = useState<"buyer" | "seller" | "">("");
  const [started, setStarted] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [showSavedList, setShowSavedList] = useState(false);
  const [loadCounter, setLoadCounter] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [accepted, setAccepted] = useState(false);

  // All form data keyed by section: { transaction: { drawer: "..." }, invoice: { ... } }
  const [forms, setForms] = useState<Record<string, Record<string, string>>>({});
  // Snapshot of saved state to detect changes
  const [savedForms, setSavedForms] = useState<Record<string, Record<string, string>>>({});
  // Track sections that have been explicitly saved (even if empty)
  const [savedSections, setSavedSections] = useState<Set<string>>(new Set());
  // Track sections that have been accepted & locked
  const [lockedSections, setLockedSections] = useState<Set<string>>(new Set());
  // Track sections currently being re-edited (were locked, then unlocked)
  const [editingSections, setEditingSections] = useState<Set<string>>(new Set());
  // Track if eboxy has been generated
  const [eboxyGenerated, setEboxyGenerated] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [demoParties, setDemoParties] = useState<{ yourDetails: CompanyDetails; otherParty: CompanyDetails } | null>(null);
  const [demoExpand, setDemoExpand] = useState(false);
  // Whether the demo's "AI import" has been run (PDFs uploaded & extracted)
  const [demoImported, setDemoImported] = useState(false);
  // Saved projects list (loaded async)
  const [savedProjects, setSavedProjects] = useState<ProjectData[]>([]);

  // Unsaved changes dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const pendingAction = useRef<() => void>(() => {});

  const { t } = useI18n();
  const isMobile = useIsMobile();

  // On mobile, collapse the menu after a selection so the content takes over the screen
  const closeMenuOnMobile = useCallback(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  // Load saved projects on mount
  useEffect(() => {
    loadProjects().then(setSavedProjects);
  }, []);

  // Handle navigation state from the landing page (preset project name or demo load)
  useEffect(() => {
    const state = location.state as { projectName?: string; loadDemo?: boolean } | null;
    if (!state) return;
    if (state.loadDemo) {
      handleLoadDemo();
    } else if (state.projectName) {
      setProjectName(state.projectName);
      setResetKey((k) => k + 1);
    }
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshSavedProjects = useCallback(() => {
    loadProjects().then(setSavedProjects);
  }, []);

  const currentFormData = selectedDoc ? (forms[selectedDoc] || {}) : {};

  // The whole editable project, assembled for the "Save to desktop" backup in
  // the agreement's Back-up dialog (mirrors the ProjectData built on Save).
  const currentProject: ProjectData = useMemo(
    () => ({
      id: projectId,
      name: projectName,
      createdAt: new Date().toISOString(),
      role,
      forms,
      lockedSections: Array.from(lockedSections),
      savedSections: Array.from(savedSections),
      eboxyGenerated,
    }),
    [projectId, projectName, role, forms, lockedSections, savedSections, eboxyGenerated],
  );

  const hasUnsavedChanges = useCallback(() => {
    if (!selectedDoc) return false;
    const current = JSON.stringify(forms[selectedDoc] || {});
    const saved = JSON.stringify(savedForms[selectedDoc] || {});
    return current !== saved;
  }, [selectedDoc, forms, savedForms]);

  const handleSave = useCallback(() => {
    if (!selectedDoc) return;
    const updatedSavedForms = { ...savedForms, [selectedDoc]: { ...(forms[selectedDoc] || {}) } };
    setSavedForms(updatedSavedForms);
    setSavedSections((prev) => new Set(prev).add(selectedDoc));

    const project: ProjectData = {
      id: projectId,
      name: projectName,
      createdAt: new Date().toISOString(),
      role: role,
      forms: { ...forms },
      lockedSections: Array.from(lockedSections),
      savedSections: Array.from(savedSections),
      eboxyGenerated,
    };
    saveProject(project).then(refreshSavedProjects);
    toast.success("Saved successfully");
  }, [selectedDoc, forms, savedForms, projectId, projectName, role, lockedSections, savedSections, eboxyGenerated, refreshSavedProjects]);

  const tryNavigate = useCallback((action: () => void) => {
    if (hasUnsavedChanges()) {
      pendingAction.current = action;
      setDialogOpen(true);
    } else {
      action();
    }
  }, [hasUnsavedChanges]);

  // On the import page you can't move on until the documents are uploaded —
  // we want the user to confirm the total deal price and import first.
  const importNotDone = selectedDoc === "ai-import" && !!demoParties && !demoImported;

  const handleSelectDoc = useCallback((id: string) => {
    if (importNotDone && id !== "ai-import") {
      toast.info("Confirm the total deal price and upload the documents to continue.");
      return;
    }
    // Address book items are always accessible
    if (id === "your-details" || id === "contacts") {
      setSelectedDoc(id);
      setShowSavedList(false);
      closeMenuOnMobile();
      return;
    }
    tryNavigate(() => {
      setSelectedDoc(id);
      setShowSavedList(false);
      closeMenuOnMobile();
    });
  }, [tryNavigate, closeMenuOnMobile, importNotDone]);

  const handleNewProject = useCallback(() => {
    if (importNotDone) {
      toast.info("Confirm the total deal price and upload the documents to continue.");
      return;
    }
    tryNavigate(() => {
      setSelectedDoc("new-project");
      setShowSavedList(false);
      closeMenuOnMobile();
    });
  }, [tryNavigate, closeMenuOnMobile, importNotDone]);

  const handleConfirmNewProject = useCallback(() => {
    setProjectId("");
    setProjectName("");
    setRole("");
    setStarted(false);
    setAccepted(false);
    setSelectedDoc(null);
    setForms({});
    setSavedForms({});
    setSavedSections(new Set());
    setLockedSections(new Set());
    setEditingSections(new Set());
    setEboxyGenerated(false);
    setShowSavedList(false);
    setDemoParties(null);
    setDemoExpand(false);
    setDemoImported(false);
    setResetKey((k) => k + 1);
  }, []);

  const handleLockSection = useCallback((sectionId: string) => {
    const updatedSavedForms = { ...savedForms, [sectionId]: { ...(forms[sectionId] || {}) } };
    setSavedForms(updatedSavedForms);
    setSavedSections((prev) => new Set(prev).add(sectionId));
    const nextLocked = new Set(lockedSections).add(sectionId);
    setLockedSections(nextLocked);
    setEditingSections((prev) => {
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });

    const project: ProjectData = {
      id: projectId,
      name: projectName,
      createdAt: new Date().toISOString(),
      role,
      forms: { ...forms },
      lockedSections: Array.from(nextLocked),
      savedSections: Array.from(new Set([...savedSections, sectionId])),
      eboxyGenerated,
    };
    saveProject(project).then(refreshSavedProjects);
    toast.success(t("lock.accepted"));
  }, [forms, savedForms, projectId, projectName, role, lockedSections, savedSections, eboxyGenerated, refreshSavedProjects, t]);

  const handleUnlockSection = useCallback((sectionId: string) => {
    setLockedSections((prev) => {
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });
    setEditingSections((prev) => new Set(prev).add(sectionId));
    if (eboxyGenerated) {
      toast.warning(t("lock.invalidateWarning"));
      setEboxyGenerated(false);
    }
  }, [eboxyGenerated, t]);

  const handleCancelEdit = useCallback((sectionId: string) => {
    setForms((prev) => ({ ...prev, [sectionId]: { ...(savedForms[sectionId] || {}) } }));
    setLockedSections((prev) => new Set(prev).add(sectionId));
    setEditingSections((prev) => {
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });
  }, [savedForms]);

  const handleLoadProjects = useCallback(() => {
    tryNavigate(() => {
      refreshSavedProjects();
      setSelectedDoc(null);
      setShowSavedList(true);
      closeMenuOnMobile();
    });
  }, [tryNavigate, refreshSavedProjects, closeMenuOnMobile]);

  const handleLoadProject = useCallback((project: ProjectData) => {
    setProjectId(project.id);
    setProjectName(project.name);
    setRole((project.role as "buyer" | "seller" | "") ?? "");
    setForms(project.forms);
    setSavedForms(project.forms);
    setLockedSections(new Set(project.lockedSections ?? []));
    setSavedSections(new Set(project.savedSections ?? []));
    setEboxyGenerated(project.eboxyGenerated ?? false);
    setStarted(true);
    setAccepted(true);
    setSelectedDoc(null);
    setShowSavedList(false);
    setLoadCounter((c) => c + 1);
  }, []);

  // Step 1 — load the demo "shell": parties & catalogue are ready, but no documents
  // have been imported yet. The user clicks "Upload PDFs" on the Universal Exports AI
  // screen to run the (simulated) extraction, which fills every section.
  const handleLoadDemo = useCallback(() => {
    setResetKey((k) => k + 1);
    setProjectId(DEMO_PROJECT.id);
    setProjectName(DEMO_PROJECT.name);
    setRole(DEMO_PROJECT.role as "buyer" | "seller" | "");
    setForms({});
    setSavedForms({});
    setLockedSections(new Set());
    setSavedSections(new Set());
    setEboxyGenerated(false);
    setEditingSections(new Set());
    setStarted(true);
    setAccepted(true);
    setShowSavedList(false);
    setSelectedDoc("ai-import");
    setDemoParties({ yourDetails: DEMO_YOUR_DETAILS as CompanyDetails, otherParty: DEMO_OTHER_PARTY as CompanyDetails });
    setDemoExpand(false);
    setDemoImported(false);
    setLoadCounter((c) => c + 1);
    toast.success("Example project ready — upload the PDFs to import");
  }, []);

  // Step 2 — simulated AI extraction: fill every section from the demo documents.
  const handleRunDemoImport = useCallback(() => {
    setForms(DEMO_PROJECT.forms);
    setSavedForms(DEMO_PROJECT.forms);
    setLockedSections(new Set(DEMO_PROJECT.lockedSections));
    setSavedSections(new Set(DEMO_PROJECT.savedSections));
    setEboxyGenerated(DEMO_PROJECT.eboxyGenerated);
    setEditingSections(new Set());
    setDemoExpand(true);
    setDemoImported(true);
    setLoadCounter((c) => c + 1);
    toast.success("5 documents imported — explore away!");
  }, []);

  const handleFieldChange = useCallback((field: string, value: string) => {
    if (!selectedDoc) return;
    setForms((prev) => ({
      ...prev,
      [selectedDoc]: { ...(prev[selectedDoc] || {}), [field]: value },
    }));
  }, [selectedDoc]);

  const handleStart = useCallback(() => {
    const id = createProjectId();
    setProjectId(id);
    setStarted(true);
    setSelectedDoc("project-overview");
    setLoadCounter((c) => c + 1);
  }, []);

  const handleBackToSetup = useCallback(() => {
    setStarted(false);
    setAccepted(false);
    setSelectedDoc(null);
  }, []);

  const handleAccept = useCallback(() => {
    setAccepted(true);
    setSelectedDoc(null);
    setLockedSections((prev) => new Set(prev).add("project-overview"));
    setSavedSections((prev) => new Set(prev).add("project-overview"));
  }, []);

  // Check if any basic project data exists (transaction/shipment)
  const hasBasicData = useMemo(() => {
    const hasData = (key: string) => {
      const data = forms[key] || {};
      return Object.values(data).some((v) => v && v.trim() !== "");
    };
    return hasData("transaction") || hasData("shipment") || savedSections.has("transaction") || savedSections.has("shipment");
  }, [forms, savedSections]);

  // Check if product details have been filled in
  const hasProductData = useMemo(() => {
    const data = forms["product-details"] || {};
    return Object.values(data).some((v) => v && v.trim() !== "") || savedSections.has("product-details");
  }, [forms, savedSections]);

  // Check if any document has been filled out
  const documentKeys = ["estimate-quote", "purchase-order", "invoice", "picking-list", "delivery-note"];
  const hasAnyDocFilled = useMemo(() => {
    return documentKeys.some((key) => {
      const data = forms[key] || {};
      return Object.values(data).some((v) => v && v.trim() !== "") || savedSections.has(key);
    });
  }, [forms, savedSections]);

  // Docs that require invoice or PO to have content first
  const lockedDocs = ["picking-list", "delivery-note", "credit-note", "receipt", "letter-of-credit"];
  const hasDocsCreated = useMemo(() => {
    const inv = forms["invoice"] || {};
    const po = forms["purchase-order"] || {};
    const hasInvoice = Object.values(inv).some((v) => v && v.trim() !== "") || savedSections.has("invoice");
    const hasPO = Object.values(po).some((v) => v && v.trim() !== "") || savedSections.has("purchase-order");
    return hasInvoice || hasPO;
  }, [forms, savedSections]);

  // Progressive unlock: build disabled list
  const disabledDocs = useMemo(() => {
    const disabled: string[] = [];
    if (!hasBasicData) {
      disabled.push("product-details", "coo");
    }
    if (!hasProductData) {
      disabled.push("estimate-quote", "purchase-order", "invoice", "picking-list", "delivery-note", "shipment");
    }
    if (!hasDocsCreated) {
      disabled.push(...lockedDocs);
    }
    if (!hasAnyDocFilled) {
      disabled.push("eboxy", "customs");
    }
    return [...new Set(disabled)];
  }, [hasBasicData, hasProductData, hasDocsCreated, hasAnyDocFilled]);

  // Compute which project detail sections have data — only show pulsing for unblocked items
  const incompleteSections = useMemo(() => {
    const check = (key: string) => {
      const data = forms[key] || {};
      return !Object.values(data).some((v) => v && v.trim() !== "");
    };
    const result: string[] = [];
    if (check("transaction")) result.push("transaction");
    if (check("shipment")) result.push("shipment");
    if (hasBasicData && check("product-details")) result.push("product-details");
    return result;
  }, [forms, hasBasicData]);

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-background p-3 md:p-6">
      <div className="flex w-full max-w-3xl h-[700px] rounded-lg border border-border bg-card shadow-sm overflow-hidden relative">
        <DocumentSidebar
          key={`${projectId}-${loadCounter}`}
          selected={showSavedList ? "saved-projects" : selectedDoc}
          onSelect={handleSelectDoc}
          disabled={!started || !accepted}
          disabledDocs={disabledDocs}
          incompleteSections={started ? incompleteSections : []}
          projectStarted={started}
          accepted={accepted}
          hasDocsCreated={hasDocsCreated}
          hasProductData={hasProductData}
          hasAnyDocFilled={hasAnyDocFilled}
          onNewProject={handleNewProject}
          onLoadProjects={handleLoadProjects}
          allForms={forms}
          role={role}
          collapsed={!sidebarOpen}
          onToggleCollapse={() => setSidebarOpen((v) => !v)}
          lockedSections={lockedSections}
          savedSections={savedSections}
          forceExpandSections={demoExpand}
        />
        <div className={`flex-1 flex min-h-0 min-w-0 ${isMobile && sidebarOpen ? "hidden" : ""}`}>
        <MainContent
          key={resetKey}
          projectId={projectId}
          projectName={projectName}
          setProjectName={setProjectName}
          started={started}
          onStart={handleStart}
          onBackToSetup={handleBackToSetup}
          selectedDoc={selectedDoc}
          formData={currentFormData}
          allForms={forms}
          onFieldChange={handleFieldChange}
          onSave={handleSave}
          savedProjects={savedProjects}
          onLoadProject={handleLoadProject}
          currentProject={currentProject}
          onImportProject={handleLoadProject}
          showSavedList={showSavedList}
          onNavigate={handleSelectDoc}
          role={role}
          setRole={setRole}
          accepted={accepted}
          onAccept={handleAccept}
          onConfirmNewProject={handleConfirmNewProject}
          lockedSections={lockedSections}
          onLockSection={handleLockSection}
          onUnlockSection={handleUnlockSection}
          editingSections={editingSections}
          onCancelEdit={handleCancelEdit}
          demoParties={demoParties}
          onLoadDemo={handleLoadDemo}
          demoImported={demoImported}
          onRunDemoImport={handleRunDemoImport}
        />
        </div>
      </div>

      <UnsavedChangesDialog
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onDiscard={() => {
          setDialogOpen(false);
          if (selectedDoc) {
            setForms((prev) => ({
              ...prev,
              [selectedDoc]: { ...(savedForms[selectedDoc] || {}) },
            }));
          }
          pendingAction.current();
        }}
        onSave={() => {
          handleSave();
          setDialogOpen(false);
          pendingAction.current();
        }}
      />
    </div>
  );
};

export default Index;
