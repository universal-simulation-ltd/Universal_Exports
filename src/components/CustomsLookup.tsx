import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadCatalogue, updateCatalogueProduct, CatalogueProduct } from "@/lib/productCatalogueStore";
import { Search, ExternalLink, Loader2, AlertCircle, ShieldCheck, ChevronDown, ChevronUp, Check, X, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

interface TariffResult {
  hsCode: string;
  description: string;
  basicDutyRate: string;
  thirdCountryDuty: string;
  preferentialDuty: string | null;
  vat: string;
  measures: { type: string; duty: string }[];
  declarable: boolean;
}

interface AppliedRule {
  hsCode: string;
  productName: string;
  description: string;
  thirdCountryDuty: string;
  preferentialDuty: string | null;
  vat: string;
  measures: { type: string; duty: string }[];
}

const TARIFF_API = "https://www.trade-tariff.service.gov.uk/api/v2";

async function lookupCommodity(hsCode: string): Promise<TariffResult> {
  const code = hsCode.replace(/\D/g, "").padEnd(10, "0");
  const res = await fetch(`${TARIFF_API}/commodities/${code}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error(`HS Code ${hsCode} not found. Try a more specific code.`);
    throw new Error(`API error: ${res.status}`);
  }

  const json = await res.json();
  const attrs = json.data?.attributes || {};
  const included: any[] = json.included || [];

  const summary = included.find((i: any) => i.type === "import_trade_summary");
  const summaryAttrs = summary?.attributes || {};

  const mtMap: Record<string, string> = {};
  const deMap: Record<string, any> = {};
  for (const i of included) {
    if (i.type === "measure_type") mtMap[i.id] = i.attributes?.description || i.id;
    if (i.type === "duty_expression") deMap[i.id] = i.attributes || {};
  }

  const measures = included
    .filter((i: any) => i.type === "measure" && i.attributes?.import)
    .map((m: any) => {
      const mtId = m.relationships?.measure_type?.data?.id || "";
      const deId = m.relationships?.duty_expression?.data?.id || "";
      const de = deMap[deId] || {};
      return { type: mtMap[mtId] || mtId, duty: de.verbose_duty || de.base || "" };
    })
    .filter((m: { type: string; duty: string }) => m.duty);

  const seen = new Set<string>();
  const uniqueMeasures = measures.filter((m: { type: string; duty: string }) => {
    const key = `${m.type}|${m.duty}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const vatMeasure = included.find((i: any) => i.type === "measure" && i.attributes?.vat);
  let vatRate = "20%";
  if (vatMeasure) {
    const deId = vatMeasure.relationships?.duty_expression?.data?.id || "";
    const de = deMap[deId] || {};
    if (de.verbose_duty) vatRate = de.verbose_duty;
  }

  const stripHtml = (s: string) => s?.replace(/<[^>]*>/g, "") || "";

  return {
    hsCode: code,
    description: attrs.formatted_description || attrs.description || "",
    basicDutyRate: attrs.basic_duty_rate || stripHtml(summaryAttrs.basic_third_country_duty) || "N/A",
    thirdCountryDuty: stripHtml(summaryAttrs.basic_third_country_duty) || "N/A",
    preferentialDuty: summaryAttrs.preferential_tariff_duty ? stripHtml(summaryAttrs.preferential_tariff_duty) : null,
    vat: vatRate,
    measures: uniqueMeasures,
    declarable: attrs.declarable ?? true,
  };
}

interface Props {
  allForms: Record<string, Record<string, string>>;
  onFieldChange?: (field: string, value: string) => void;
  formData?: Record<string, string>;
}

const CustomsLookup = ({ allForms, onFieldChange, formData }: Props) => {
  const [catalogue, setCatalogue] = useState<CatalogueProduct[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [results, setResults] = useState<Record<string, TariffResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});
  const [editingHsCode, setEditingHsCode] = useState<string | null>(null); // product id being edited
  const [editHsValue, setEditHsValue] = useState("");
  const [catalogueVersion, setCatalogueVersion] = useState(0);

  useEffect(() => {
    loadCatalogue().then(setCatalogue);
  }, []);

  // Applied rules - persisted via formData if available, otherwise local state
  const [localApplied, setLocalApplied] = useState<AppliedRule[]>([]);
  const appliedRules: AppliedRule[] = useMemo(() => {
    if (formData?.appliedRules) {
      try { return JSON.parse(formData.appliedRules); } catch { return []; }
    }
    return localApplied;
  }, [formData?.appliedRules, localApplied]);

  const setAppliedRules = useCallback((rules: AppliedRule[]) => {
    if (onFieldChange) {
      onFieldChange("appliedRules", JSON.stringify(rules));
    } else {
      setLocalApplied(rules);
    }
  }, [onFieldChange]);

  const productsWithHsCodes = useMemo(() => {
    try {
      const raw = allForms["product-details"]?.productLines;
      if (!raw) return [];
      const lines = JSON.parse(raw) as { catalogueId: string }[];
      return lines
        .map((l) => catalogue.find((p) => p.id === l.catalogueId))
        .filter((p): p is CatalogueProduct => !!p && !!p.hsCode?.trim());
    } catch { return []; }
  }, [allForms, catalogue, catalogueVersion]);

  const allHsCodes = useMemo(() => {
    const codes = productsWithHsCodes.map((p) => p.hsCode.replace(/\D/g, ""));
    return [...new Set(codes)];
  }, [productsWithHsCodes]);

  const handleLookup = useCallback(async (code: string) => {
    const key = code.replace(/\D/g, "");
    if (!key) { toast.error("Please enter a valid HS code"); return; }
    setLoading((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    try {
      const result = await lookupCommodity(key);
      setResults((prev) => ({ ...prev, [key]: result }));
    } catch (err: any) {
      const msg = err.message || "Failed to look up tariff";
      setErrors((prev) => ({ ...prev, [key]: msg }));
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  }, []);

  // Auto-lookup all product HS codes when products change
  const lookedUpRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const codesToLookup = allHsCodes.filter((c) => !lookedUpRef.current.has(c) && !results[c]);
    if (codesToLookup.length === 0) return;
    codesToLookup.forEach((c) => lookedUpRef.current.add(c));
    (async () => {
      for (const code of codesToLookup) {
        await handleLookup(code);
      }
    })();
  }, [allHsCodes, handleLookup, results]);

  const handleApply = useCallback((result: TariffResult, productName: string) => {
    const exists = appliedRules.some((r) => r.hsCode === result.hsCode && r.productName === productName);
    if (exists) { toast.info("Already applied"); return; }
    const rule: AppliedRule = {
      hsCode: result.hsCode,
      productName,
      description: result.description,
      thirdCountryDuty: result.thirdCountryDuty,
      preferentialDuty: result.preferentialDuty,
      vat: result.vat,
      measures: result.measures,
    };
    setAppliedRules([...appliedRules, rule]);
    const key = result.hsCode.replace(/\D/g, "");
    setExpandedResults((prev) => ({ ...prev, [key]: false }));
    toast.success(`Applied tariff rules for ${productName}`);
  }, [appliedRules, setAppliedRules]);

  const handleRemoveApplied = useCallback((index: number) => {
    setAppliedRules(appliedRules.filter((_, i) => i !== index));
  }, [appliedRules, setAppliedRules]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Customs & Tariff Lookup
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Check import/export duties using the{" "}
          <a href="https://www.trade-tariff.service.gov.uk/find_commodity" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
            UK Trade Tariff
          </a>
          . Look up codes, then apply the rules you need.
        </p>
      </div>

      {/* Manual lookup */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground block">Look up HS Code</label>
        <div className="flex gap-2 max-w-md">
          <Input
            placeholder="e.g. 8471.30 or 8471300000"
            className="bg-secondary/50"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleLookup(manualCode); }}
          />
          <Button onClick={() => handleLookup(manualCode)} disabled={!manualCode.trim() || loading[manualCode.replace(/\D/g, "")]}>
            {loading[manualCode.replace(/\D/g, "")] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Manual lookup result */}
      {(() => {
        const key = manualCode.replace(/\D/g, "");
        const result = results[key];
        const error = errors[key];
        if (!key) return null;
        return (
          <>
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            {result && (
              <CollapsibleResult
                result={result}
                label={`Manual Lookup: ${manualCode}`}
                expanded={expandedResults[key] ?? false}
                onToggle={() => setExpandedResults((prev) => ({ ...prev, [key]: !prev[key] }))}
                onApply={() => handleApply(result, `Manual: ${manualCode}`)}
                isApplied={appliedRules.some((r) => r.hsCode === result.hsCode && r.productName === `Manual: ${manualCode}`)}
              />
            )}
          </>
        );
      })()}

      {/* Products with HS codes */}
      {productsWithHsCodes.length > 0 && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Your Products ({productsWithHsCodes.length} with HS codes)
          </label>
          <div className="space-y-2">
            {productsWithHsCodes.map((product) => {
              const key = product.hsCode.replace(/\D/g, "");
              const result = results[key];
              const isLoading = loading[key];
              const error = errors[key];
              const isApplied = appliedRules.some((r) => r.hsCode === (result?.hsCode || key.padEnd(10, "0")) && r.productName === product.name);

              // Build tax summary chips for the collapsed bar
              const taxChips: string[] = [];
              if (result) {
                if (result.vat) taxChips.push(`${result.vat} Import VAT`);
                if (result.thirdCountryDuty && result.thirdCountryDuty !== "N/A") taxChips.push(`${result.thirdCountryDuty} Duty`);
                if (result.preferentialDuty) taxChips.push(`${result.preferentialDuty} Pref.`);
                result.measures.slice(0, 2).forEach((m) => {
                  if (m.duty && !taxChips.some((c) => c.includes(m.duty))) taxChips.push(`${m.duty} ${m.type}`);
                });
              }

              return (
                <div key={product.id} className="rounded-md border border-border overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-secondary/20 hover:bg-secondary/30 transition-colors text-left"
                    onClick={() => {
                      if (editingHsCode === product.id) return;
                      if (result) {
                        setExpandedResults((prev) => ({ ...prev, [key]: !prev[key] }));
                      } else if (!isLoading) {
                        handleLookup(product.hsCode);
                      }
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{product.name}</p>
                        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                      </div>
                      {editingHsCode === product.id ? (
                        <div className="flex items-center gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                          <Input
                            className="bg-secondary/50 h-7 text-xs w-32"
                            value={editHsValue}
                            onChange={(e) => setEditHsValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                updateCatalogueProduct({ ...product, hsCode: editHsValue }).then(() => loadCatalogue().then(setCatalogue));
                                setCatalogueVersion((v) => v + 1);
                                setEditingHsCode(null);
                                lookedUpRef.current.delete(key);
                                setResults((prev) => { const n = { ...prev }; delete n[key]; return n; });
                                setExpandedResults((prev) => { const n = { ...prev }; delete n[key]; return n; });
                                toast.success("HS code updated");
                              }
                            }}
                            autoFocus
                          />
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {
                            e.stopPropagation();
                            updateCatalogueProduct({ ...product, hsCode: editHsValue }).then(() => loadCatalogue().then(setCatalogue));
                            setCatalogueVersion((v) => v + 1);
                            setEditingHsCode(null);
                            lookedUpRef.current.delete(key);
                            setResults((prev) => { const n = { ...prev }; delete n[key]; return n; });
                            setExpandedResults((prev) => { const n = { ...prev }; delete n[key]; return n; });
                            toast.success("HS code updated");
                          }}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditingHsCode(null); }}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            HS: {product.hsCode}{product.code && ` · SKU: ${product.code}`}
                          </span>
                          {taxChips.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {taxChips.map((chip, i) => (
                                <span key={i} className="inline-flex items-center text-[10px] font-medium bg-primary/10 text-primary rounded px-1.5 py-0.5">
                                  {chip}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {editingHsCode !== product.id && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                          setEditingHsCode(product.id);
                          setEditHsValue(product.hsCode);
                        }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {result && editingHsCode !== product.id && (
                        <div className="ml-1">
                          {expandedResults[key] ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                        </div>
                      )}
                    </div>
                  </button>

                  {error && (
                    <div className="px-4 py-2 bg-destructive/10 text-destructive text-xs flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
                    </div>
                  )}

                  {result && expandedResults[key] && (
                    <div>
                      <TariffResultCard result={result} />
                      <div className="px-4 pb-3">
                        <Button
                          size="sm"
                          variant={isApplied ? "secondary" : "default"}
                          onClick={() => handleApply(result, product.name)}
                          disabled={isApplied}
                        >
                          {isApplied ? (
                            <><Check className="mr-1 h-3.5 w-3.5" /> Applied</>
                          ) : (
                            <><Plus className="mr-1 h-3.5 w-3.5" /> Apply Rules</>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {productsWithHsCodes.length === 0 && (
        <div className="rounded-md border border-border bg-secondary/10 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            No products with HS codes found. Add HS codes to your products in the Products section, then return here to check tariff rates.
          </p>
        </div>
      )}

      {/* Applied Rules Summary */}
      {appliedRules.length > 0 && (
        <div className="space-y-3 border-t border-border pt-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            Applied Tariff Rules ({appliedRules.length})
          </h3>
          <div className="space-y-2">
            {appliedRules.map((rule, i) => (
              <div key={i} className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{rule.productName}</p>
                    <p className="text-xs text-muted-foreground">{rule.description} · HS: {rule.hsCode}</p>
                    <div className="flex gap-4 mt-1.5 text-xs">
                      <span><span className="text-muted-foreground">Duty:</span> <span className="font-medium text-foreground">{rule.thirdCountryDuty}</span></span>
                      {rule.preferentialDuty && (
                        <span><span className="text-muted-foreground">Pref:</span> <span className="font-medium text-foreground">{rule.preferentialDuty}</span></span>
                      )}
                      <span><span className="text-muted-foreground">VAT:</span> <span className="font-medium text-foreground">{rule.vat}</span></span>
                    </div>
                    {rule.measures.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {rule.measures.slice(0, 5).map((m) => `${m.type}: ${m.duty}`).join(" · ")}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleRemoveApplied(i)}>
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Data from{" "}
        <a href="https://www.trade-tariff.service.gov.uk" target="_blank" rel="noopener noreferrer" className="underline">UK Trade Tariff Service</a>
        . For official guidance, always verify on GOV.UK.
      </p>
    </div>
  );
};

const CollapsibleResult = ({ result, label, expanded, onToggle, onApply, isApplied }: {
  result: TariffResult; label: string; expanded: boolean; onToggle: () => void; onApply: () => void; isApplied: boolean;
}) => (
  <div className="rounded-md border border-border overflow-hidden">
    <button className="w-full flex items-center justify-between px-4 py-2.5 bg-secondary/20 hover:bg-secondary/30 transition-colors" onClick={onToggle}>
      <p className="text-sm font-medium text-foreground">{label}</p>
      {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
    </button>
    {expanded && (
      <div>
        <TariffResultCard result={result} />
        <div className="px-4 pb-3">
          <Button size="sm" variant={isApplied ? "secondary" : "default"} onClick={onApply} disabled={isApplied}>
            {isApplied ? <><Check className="mr-1 h-3.5 w-3.5" /> Applied</> : <><Plus className="mr-1 h-3.5 w-3.5" /> Apply Rules</>}
          </Button>
        </div>
      </div>
    )}
  </div>
);

const TariffResultCard = ({ result }: { result: TariffResult }) => (
  <div className="px-4 py-3 space-y-3 text-sm">
    <div>
      <p className="text-xs text-muted-foreground">Commodity</p>
      <p className="text-foreground font-medium">{result.description}</p>
      <p className="text-xs text-muted-foreground">
        Code: {result.hsCode}
        {!result.declarable && <span className="ml-2 text-amber-600 font-medium">⚠ Not declarable — use a more specific code</span>}
      </p>
    </div>
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-md bg-secondary/30 p-2.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Third Country Duty</p>
        <p className="text-foreground font-semibold">{result.thirdCountryDuty}</p>
      </div>
      <div className="rounded-md bg-secondary/30 p-2.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Preferential Rate</p>
        <p className="text-foreground font-semibold">{result.preferentialDuty || "—"}</p>
      </div>
      <div className="rounded-md bg-secondary/30 p-2.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">VAT</p>
        <p className="text-foreground font-semibold">{result.vat}</p>
      </div>
    </div>
    {result.measures.length > 0 && (
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Import Measures</p>
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Measure</th>
                <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Duty</th>
              </tr>
            </thead>
            <tbody>
              {result.measures.slice(0, 10).map((m, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-3 py-1.5 text-foreground">{m.type}</td>
                  <td className="px-3 py-1.5 text-right text-foreground">{m.duty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
    <a href={`https://www.trade-tariff.service.gov.uk/commodities/${result.hsCode}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
      View full details on GOV.UK <ExternalLink className="h-3 w-3" />
    </a>
  </div>
);

export default CustomsLookup;
