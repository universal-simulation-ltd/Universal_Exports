import { useState } from "react";
import { Building2, CheckCircle2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  lookupCompany,
  isValidCompanyNumber,
  formatCompanyAddress,
  type CompanyProfile,
} from "@/lib/companiesHouse";
import type { CompanyDetails } from "@/lib/contactStore";
import { useDrafterI18n } from "@/lib/i18n/drafter/useDrafterI18n";

/**
 * YOUR Companies House number, with a live lookup — the drafter's own company
 * only (the other party may be anywhere, so its number stays a plain field).
 *
 * This used to be a gate on creating a Universal ID (Auth.tsx). Since
 * 2026-10-10 anyone can sign up and start a deal without one; the number is
 * asked for here, and the Export Agreement checklist won't let the agreement
 * be generated (and so signed or sent) until a valid one is entered, because
 * the agreements are for a UK importer or exporter.
 */
export default function CompanyNumberLookup({
  details,
  onChange,
}: {
  details: CompanyDetails;
  onChange: (d: CompanyDetails) => void;
}) {
  const { t, tf, date } = useDrafterI18n();
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [lookupDown, setLookupDown] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const value = details.companyNumber || "";

  const reset = () => {
    setCompany(null);
    setConfirmed(false);
    setLookupDown(false);
  };

  const handleLookup = async () => {
    if (!isValidCompanyNumber(value)) {
      toast.error(t("auth.invalidNumber"));
      return;
    }
    setLookingUp(true);
    reset();
    const result = await lookupCompany(value);
    setLookingUp(false);
    if (result.ok) setCompany(result.company);
    else if (result.reason === "not_found") toast.error(t("auth.notFound"));
    else if (result.reason === "invalid_number") toast.error(t("auth.badNumber"));
    else setLookupDown(true);
  };

  const confirm = (c: CompanyProfile) => {
    // Fill the blanks from the register; never overwrite what the user typed.
    onChange({
      ...details,
      companyNumber: c.company_number,
      registeredName: details.registeredName.trim() ? details.registeredName : c.company_name,
      address: details.address.trim() ? details.address : formatCompanyAddress(c),
      country: details.country.trim() ? details.country : "United Kingdom",
    });
    setConfirmed(true);
  };

  return (
    <div className="space-y-2" data-testid="crn-lookup">
      <label htmlFor="your-company-number" className="text-sm font-medium text-foreground mb-1.5 block">
        {t("auth.companyNumber")}
      </label>
      <div className="flex gap-2">
        <Input
          id="your-company-number"
          placeholder={tf("common.eg", { example: "01234567" })}
          className="bg-secondary/50"
          value={value}
          autoComplete="off"
          onChange={(e) => {
            onChange({ ...details, companyNumber: e.target.value });
            reset();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleLookup();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleLookup}
          disabled={lookingUp || !value.trim()}
          className="shrink-0"
        >
          <Search className="h-4 w-4 mr-1.5" />
          {lookingUp ? t("auth.lookingUp") : t("auth.lookUp")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("yourDetails.crnHint")}</p>

      {company && !confirmed && (
        <div className="rounded-md border border-border bg-secondary/40 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Building2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-foreground">{company.company_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tf("auth.companyNo", { number: company.company_number })}
                {company.company_status ? ` · ${company.company_status}` : ""}
                {company.date_of_creation ? ` · ${tf("auth.incorporated", { date: date(company.date_of_creation) })}` : ""}
              </p>
              {formatCompanyAddress(company) && (
                <p className="text-xs text-muted-foreground mt-0.5">{formatCompanyAddress(company)}</p>
              )}
            </div>
          </div>
          <p className="text-sm text-foreground">{t("auth.isThisYou")}</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => confirm(company)}>
              {t("auth.yes")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                onChange({ ...details, companyNumber: "" });
                reset();
              }}
            >
              {t("auth.no")}
            </Button>
          </div>
        </div>
      )}

      {confirmed && company && (
        <div className="flex items-start gap-2 rounded-md border border-green-600/30 bg-green-600/10 p-3 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-foreground">{company.company_name}</p>
            <p className="text-xs text-muted-foreground">{tf("auth.confirmed", { number: company.company_number })}</p>
          </div>
        </div>
      )}

      {lookupDown && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground">
          {t("auth.lookupDown")}
        </div>
      )}
    </div>
  );
}
