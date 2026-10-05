import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FileCheck, Sparkles, Globe2, PenTool, FileSignature, Languages } from "lucide-react";
import { Chip } from "@unisim/sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BrandFooter from "@/components/BrandFooter";
import WorkflowAnimation from "@/components/WorkflowAnimation";
import { grantDemoAccess } from "@/lib/demoAccess";
import ueIcon from "@/assets/universal-exports-icon.svg";
import { CONTAINER } from "@/lib/layout";
import { useI18n, type MessageKey } from "@/lib/i18n";

const features: { icon: typeof Sparkles; title: MessageKey; desc: MessageKey; flag?: string; badge?: MessageKey }[] = [
  { icon: Sparkles, title: "landing.f1Title", desc: "landing.f1Desc" },
  { icon: Globe2, title: "landing.f2Title", desc: "landing.f2Desc", flag: "🇬🇧", badge: "landing.moreSoon" },
  { icon: PenTool, title: "landing.f3Title", desc: "landing.f3Desc" },
  { icon: FileSignature, title: "landing.f4Title", desc: "landing.f4Desc" },
];

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [projectName, setProjectName] = useState("");

  // Focus the Project Name input so visitors can type straight away — but with
  // preventScroll, because the input sits below the fold and a plain autoFocus
  // makes the browser scroll it into view on load, skipping the hero headline.
  const projectNameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    projectNameRef.current?.focus({ preventScroll: true });
  }, []);

  const handleContinue = () => {
    if (!projectName.trim()) return;
    navigate("/app", { state: { projectName: projectName.trim() } });
  };

  const handleDemo = () => {
    // The example project must be viewable WITHOUT signing in. /app is gated by
    // ProtectedRoute, which bounces guests to /auth unless they're signed in OR
    // have demo access — so grant the (tab-scoped) demo flag first, exactly as
    // the hidden /demo route does, then drop into the pre-filled example.
    grantDemoAccess();
    navigate("/app", { state: { loadDemo: true } });
  };

  return (
    <div className="min-h-full flex flex-col bg-background">
      {/* Hero */}
      <main className="flex-1 w-full">
        <div className={`${CONTAINER} py-8 md:py-12`}>
          {/* Hero title — spans both columns */}
          <h1 className="text-3xl md:text-4xl lg:text-[2.6rem] font-semibold tracking-tight text-foreground leading-[1.15] text-center mb-3 md:mb-4">
            {t("landing.heroA")} <span className="text-primary">{t("landing.heroB")}</span>
          </h1>
          {/* Subheader — straddles both columns */}
          <p className="text-sm md:text-base text-muted-foreground text-center max-w-2xl mx-auto mb-8 md:mb-10">
            {t("landing.sub")}
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-start lg:items-center">
          {/* LEFT — pitch + animation + features */}
          <div className="flex flex-col">
            {/* Workflow animation */}
            <div className="mt-6 rounded-xl border border-border bg-card shadow-xs overflow-hidden">
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
                      <p className="text-sm font-semibold text-foreground leading-tight">{t(f.title)}</p>
                      {f.flag && (
                        <span className="text-sm leading-none" role="img" aria-label={t("landing.uk")}>{f.flag}</span>
                      )}
                      {f.badge && (
                        <Chip size="sm">{t(f.badge)}</Chip>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{t(f.desc)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Languages className="h-3.5 w-3.5" /> {t("landing.languages")}
              </span>
              <span aria-hidden>·</span>
              <span>{t("landing.multiCurrency")}</span>
              <span aria-hidden>·</span>
              <span>{t("landing.freeUk")}</span>
            </div>
          </div>

          {/* RIGHT — start project card. First on a phone: stacked in DOM
              order it came after the animation and all four feature cards,
              so a newcomer had to scroll two screens to find the one thing
              to do. From lg up it is the right-hand column again. */}
          <div className="order-first lg:order-none">
            <div className="relative rounded-lg border border-border bg-card shadow-xs overflow-hidden">
              {/* "100% Free for UK businesses" corner ribbon — z-0 so the navbar changelog
                  dropdown (which floats down over this card) stays on top. */}
              <div className="pointer-events-none absolute top-[26px] right-[-58px] z-0 w-48 rotate-45 origin-center bg-linear-to-r from-primary to-[#E54E0F] text-primary-foreground text-center text-[9px] font-bold uppercase tracking-[0.06em] py-1.5 shadow-[0_2px_8px_rgba(247,106,31,0.35)] ring-1 ring-primary/40 select-none whitespace-nowrap">
                {t("landing.ribbon")}
              </div>
              <div className="flex flex-col items-center justify-center p-8 md:p-10">
                <FileCheck className="h-12 w-12 text-primary mb-4" />
                <h2 className="text-2xl font-semibold text-foreground mb-1 text-center">
                  {t("landing.createFolder")}
                </h2>
                <p className="text-sm text-muted-foreground mb-8 text-center max-w-sm">
                  {t("landing.binding")}
                </p>
                <div className="w-full max-w-xs space-y-4">
                  <div>
                    <label htmlFor="landing-project-name" className="text-sm font-medium text-foreground mb-1.5 block">
                      {t("setup.projectName")}
                    </label>
                    <Input
                      id="landing-project-name"
                      placeholder={t("main.projectNamePlaceholder")}
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleContinue();
                      }}
                      className="bg-secondary/50"
                      ref={projectNameRef}
                    />
                  </div>
                  <Button
                    onClick={handleContinue}
                    disabled={!projectName.trim()}
                    className="w-full"
                  >
                    {t("setup.continue")} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    {t("landing.signInNote")}
                  </p>
                </div>

                <div className="mt-10 w-full max-w-xs">
                  <div className="relative flex items-center mb-4">
                    <div className="flex-1 border-t border-border" />
                    <span className="mx-3 text-xs text-muted-foreground uppercase tracking-wider">
                      {t("common.or")}
                    </span>
                    <div className="flex-1 border-t border-border" />
                  </div>
                  <div className="relative rounded-lg">
                    <div className="absolute inset-[-2px] rounded-lg bg-linear-to-br from-primary/60 via-primary/20 to-primary/60 animate-pulse" />
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
                          {t("example.title")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t("example.desc")}
                        </p>
                        <p className="text-xs text-primary mt-1 font-medium">
                          {t("example.new")}
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
