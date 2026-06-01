import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FileCheck, Sparkles, Globe2, PenTool, FileSignature, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BrandFooter from "@/components/BrandFooter";
import WorkflowAnimation from "@/components/WorkflowAnimation";
import ueIcon from "@/assets/universal-exports-icon.svg";

const features = [
  {
    icon: Sparkles,
    title: "AI document import",
    desc: "Drop in PDFs or scans of your supplier or customer paperwork — AI extracts parties, products and totals into the right fields.",
  },
  {
    icon: Globe2,
    title: "Live tariff lookup",
    flag: "🇬🇧",
    badge: "More coming soon",
    desc: "Pull HS codes, duty rates and country-of-origin rules straight into your invoice. UK imports & exports for now — more countries on the way.",
  },
  {
    icon: PenTool,
    title: "Sign your Export Agreement",
    desc: "Draw legally-recognised signatures in-browser and lock each section once buyer and seller accept it.",
  },
  {
    icon: FileSignature,
    title: "Live delivery-note signatures",
    desc: "Capture courier and recipient signatures on arrival — perfect for inbound deliveries and outbound shipments alike.",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("");

  const handleContinue = () => {
    if (!projectName.trim()) return;
    navigate("/app", { state: { projectName: projectName.trim() } });
  };

  const handleDemo = () => {
    navigate("/app", { state: { loadDemo: true } });
  };

  return (
    <div className="min-h-full flex flex-col bg-background">
      {/* Hero */}
      <main className="flex-1 w-full">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
          {/* Hero title — spans both columns */}
          <h1 className="text-3xl md:text-4xl lg:text-[2.6rem] font-semibold tracking-tight text-foreground leading-[1.15] text-center mb-3 md:mb-4">
            Export, Import, <span className="text-primary">With Peace of Mind.</span>
          </h1>
          {/* Subheader — straddles both columns */}
          <p className="text-sm md:text-base text-muted-foreground text-center max-w-2xl mx-auto mb-8 md:mb-10">
            Whether you're buying or selling across borders, generate, sign and share Export Agreements,
            invoices and delivery notes — with live tariff data and AI-assisted document import.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-start lg:items-center">
          {/* LEFT — pitch + animation + features */}
          <div className="flex flex-col">
            {/* Workflow animation */}
            <div className="mt-6 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <WorkflowAnimation />
            </div>

            {/* Features */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card/60 px-3.5 py-3"
                >
                  <div className="shrink-0 mt-0.5 h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-foreground leading-tight">{f.title}</p>
                      {f.flag && (
                        <span className="text-sm leading-none" aria-label="United Kingdom">{f.flag}</span>
                      )}
                      {f.badge && (
                        <span className="inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 text-[10px] font-medium leading-none">
                          {f.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Languages className="h-3.5 w-3.5" /> 6 languages
              </span>
              <span aria-hidden>·</span>
              <span>Multi-currency</span>
              <span aria-hidden>·</span>
              <span>Free &amp; self-hosted</span>
            </div>
          </div>

          {/* RIGHT — start project card */}
          <div>
            <div className="relative rounded-lg border border-border bg-card shadow-sm overflow-hidden">
              {/* "100% Free" corner ribbon — z-0 so the navbar changelog
                  dropdown (which floats down over this card) stays on top. */}
              <div className="pointer-events-none absolute top-[26px] -right-[58px] z-0 w-48 rotate-45 origin-center bg-gradient-to-r from-primary to-[#E54E0F] text-primary-foreground text-center text-[10px] font-bold uppercase tracking-[0.18em] py-1.5 shadow-[0_2px_8px_rgba(247,106,31,0.35)] ring-1 ring-primary/40 select-none">
                100% Free
              </div>
              <div className="flex flex-col items-center justify-center p-8 md:p-10">
                <FileCheck className="h-12 w-12 text-primary mb-4" />
                <h2 className="text-2xl font-semibold text-foreground mb-1 text-center">
                  Create your sales folder
                </h2>
                <p className="text-sm text-muted-foreground mb-8 text-center max-w-sm">
                  A binding Export Agreement
                </p>
                <div className="w-full max-w-xs space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Project Name
                    </label>
                    <Input
                      placeholder="e.g. Q2 Export Shipment"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleContinue();
                      }}
                      className="bg-secondary/50"
                      autoFocus
                    />
                  </div>
                  <Button
                    onClick={handleContinue}
                    disabled={!projectName.trim()}
                    className="w-full"
                  >
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-10 w-full max-w-xs">
                  <div className="relative flex items-center mb-4">
                    <div className="flex-1 border-t border-border" />
                    <span className="mx-3 text-xs text-muted-foreground uppercase tracking-wider">
                      or
                    </span>
                    <div className="flex-1 border-t border-border" />
                  </div>
                  <div className="relative rounded-lg">
                    <div className="absolute -inset-[2px] rounded-lg bg-gradient-to-br from-primary/60 via-primary/20 to-primary/60 animate-pulse" />
                    <button
                      onClick={handleDemo}
                      className="relative w-full flex items-center gap-3 rounded-lg px-4 py-3.5 bg-card border border-primary/20 hover:bg-primary/5 transition-colors text-left group"
                    >
                      <img
                        src={ueIcon}
                        alt="Universal Exports"
                        className="h-10 w-auto shrink-0 object-contain group-hover:scale-110 transition-transform"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Explore with an example project
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          A pre-filled UK export sale — see every section in action
                        </p>
                        <p className="text-xs text-primary mt-1 font-medium">
                          New here? Start here ↑
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/60 py-6 px-4">
        <BrandFooter variant="compact" />
      </footer>
    </div>
  );
}
