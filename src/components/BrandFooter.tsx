import { Github } from "lucide-react";
import unisimMark from "@/assets/unisim-mark.svg";

export const GITHUB_REPO_URL = "https://github.com/jamesmarkeyuk/universal_exports";
export const UNISIM_URL = "https://www.unisim.co.uk";

interface BrandFooterProps {
  variant?: "sidebar" | "compact" | "auth";
  className?: string;
}

const BrandFooter = ({ variant = "sidebar", className = "" }: BrandFooterProps) => {
  if (variant === "compact") {
    return (
      <div className={`flex items-center justify-center gap-2 text-[10px] text-muted-foreground ${className}`}>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          title="Fully open source — self-host for free"
        >
          <Github className="h-3 w-3" />
          <span>Open source — self-host free</span>
        </a>
        <span aria-hidden="true">·</span>
        <a
          href={UNISIM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          title="Or use UNI SIM's hosted PRO plan"
        >
          <span>or PRO hosted by</span>
          <img
            src={unisimMark}
            alt="UNI SIM"
            className="h-3.5 w-auto opacity-80 [filter:drop-shadow(0_1px_0_rgba(255,255,255,0.6))_drop-shadow(0_-0.5px_0_rgba(0,0,0,0.25))]"
          />
        </a>
      </div>
    );
  }

  if (variant === "auth") {
    return (
      <div className={`flex flex-col items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 font-medium text-primary">
            100% free
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 font-medium text-primary">
            Self-hosted
          </span>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Github className="h-3 w-3" />
            Open source
          </a>
        </div>
        <a
          href={UNISIM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          title="Or use UNI SIM's hosted PRO plan"
        >
          <span>or PRO hosted by</span>
          <img
            src={unisimMark}
            alt="UNI SIM"
            className="h-4 w-auto opacity-90 [filter:drop-shadow(0_1px_0_rgba(255,255,255,0.7))_drop-shadow(0_-0.5px_0_rgba(0,0,0,0.3))]"
          />
        </a>
      </div>
    );
  }

  // sidebar variant — fits inside the 224px-wide sidebar footer
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-1">
        <span
          className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary"
          title="Universal Exports is 100% free"
        >
          100% free
        </span>
        <span
          className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary"
          title="Universal Exports is self-hosted"
        >
          Self-hosted
        </span>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary hover:bg-primary/20 transition-colors"
          title="Open source on GitHub"
        >
          <Github className="h-2.5 w-2.5" />
          Open source
        </a>
      </div>
      <a
        href={UNISIM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors group"
        title="Or use UNI SIM's hosted PRO plan — visit unisim.co.uk"
      >
        <span>or PRO hosted by</span>
        <img
          src={unisimMark}
          alt="UNI SIM"
          className="h-3.5 w-auto opacity-80 group-hover:opacity-100 transition-opacity [filter:drop-shadow(0_1px_0_rgba(255,255,255,0.7))_drop-shadow(0_-0.5px_0_rgba(0,0,0,0.3))]"
        />
      </a>
    </div>
  );
};

export default BrandFooter;
