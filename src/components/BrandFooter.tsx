import { Github } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { fillNodes } from "@/lib/i18n/format";

export const GITHUB_REPO_URL = "https://github.com/universal-simulation-ltd/Universal_Exports";
export const UNISIM_URL = "https://www.unisim.co.uk";

interface BrandFooterProps {
  variant?: "sidebar" | "compact" | "auth";
  className?: string;
}

// One canonical message across every variant — "With ♥ from UNISIM.co.uk",
// linked to unisim.co.uk, followed by the GitHub mark linking the public repo.
// Variants only adjust size / orientation, never the copy.
const BrandFooter = ({ variant = "sidebar", className = "" }: BrandFooterProps) => {
  const { t } = useI18n();
  const size = variant === "auth" ? "text-[11px]" : "text-[10px]";
  const icon = variant === "sidebar" ? "h-2.5 w-2.5" : "h-3 w-3";
  // The sidebar sits in a 224px column, so it stacks; the other two sit on a
  // full-width row and stay centred on one line.
  const layout =
    variant === "sidebar"
      ? "flex-col items-start gap-1"
      : "flex-wrap items-center justify-center gap-x-2 gap-y-1";

  return (
    <div className={`flex ${layout} ${size} text-muted-foreground ${className}`}>
      <span>
        {fillNodes(t("brand.withLove"), {
          heart: (
            <>
              <span aria-hidden="true" className="text-orange-600">
                &hearts;
              </span>
              <span className="sr-only">{t("brand.love")}</span>
            </>
          ),
          link: (
            <a
              href={UNISIM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 transition-colors hover:text-foreground hover:underline"
              title={t("brand.visit")}
            >
              UNISIM.co.uk
            </a>
          ),
        })}
      </span>
      <a
        href={GITHUB_REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("brand.github")}
        title={t("brand.viewSource")}
        className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
      >
        <Github className={icon} />
        <span>GitHub</span>
      </a>
    </div>
  );
};

export default BrandFooter;
