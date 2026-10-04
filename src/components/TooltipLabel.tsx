import { forwardRef } from "react";
import { HelpCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const HelpIcon = forwardRef<SVGSVGElement, React.ComponentPropsWithoutRef<typeof HelpCircle>>(
  (props, ref) => <HelpCircle ref={ref} {...props} />
);
HelpIcon.displayName = "HelpIcon";

interface TooltipLabelProps {
  label: string;
  tooltip: string;
}

const TooltipLabel = ({ label, tooltip }: TooltipLabelProps) => {
  const { t } = useI18n();
  return (
  <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1">
    {label}
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpIcon aria-label={t("tip.more")} className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  </label>
  );
};

export default TooltipLabel;
