import { Github } from "lucide-react";
import unisimMark from "@/assets/unisim-mark.svg";

export const GITHUB_REPO_URL = "https://github.com/jamesmarkeyuk/universal_exports";
export const UNISIM_URL = "https://www.unisim.co.uk";

interface BrandFooterProps {
  variant?: "sidebar" | "compact" | "auth";
  className?: string;
}

// One canonical message across every variant — "100% Open source and free.
// Hosted by UNI SIM" — with the source link on the open-source half and the
// UNI SIM link on the host half. Variants only adjust size / orientation /
// whether to show the GitHub icon, never the copy.
const BrandFooter = ({ variant = "sidebar", className = "" }: BrandFooterProps) => {
  if (variant === "compact") {
    return (
      <div className={`flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground ${className}`}>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          title="100% Open source — view on GitHub"
        >
          <Github className="h-3 w-3" />
          <span>100% Open source and free.</span>
        </a>
        <a
          href={UNISIM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          title="Hosted by UNI SIM"
        >
          <span>Hosted by</span>
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
      <div className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground ${className}`}>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          title="100% Open source — view on GitHub"
        >
          <Github className="h-3 w-3" />
          <span>100% Open source and free.</span>
        </a>
        <a
          href={UNISIM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
          title="Hosted by UNI SIM"
        >
          <span>Hosted by</span>
          <img
            src={unisimMark}
            alt="UNI SIM"
            className="h-4 w-auto opacity-90 [filter:drop-shadow(0_1px_0_rgba(255,255,255,0.7))_drop-shadow(0_-0.5px_0_rgba(0,0,0,0.3))]"
          />
        </a>
      </div>
    );
  }

  // sidebar variant — fits inside the 224px-wide sidebar footer; line wraps.
  return (
    <div className={`space-y-1 text-[10px] text-muted-foreground ${className}`}>
      <a
        href={GITHUB_REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        title="100% Open source — view on GitHub"
      >
        <Github className="h-2.5 w-2.5" />
        <span>100% Open source and free.</span>
      </a>
      <a
        href={UNISIM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 hover:text-foreground transition-colors group"
        title="Hosted by UNI SIM — visit unisim.co.uk"
      >
        <span>Hosted by</span>
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
