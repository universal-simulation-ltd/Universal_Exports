import { useState, useCallback, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import TooltipLabel from "@/components/TooltipLabel";
import { Plus, Trash2, Package, ShoppingCart, Search, Pencil, Check, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CatalogueProduct,
  loadCatalogue,
  addToCatalogue,
  removeFromCatalogue,
  updateCatalogueProduct,
  catalogueDisplayTitle,
} from "@/lib/productCatalogueStore";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface LineItem {
  catalogueId: string;
  units: string;
  discount: string; // percent
  discountAmount: string; // fixed amount
}

const emptyLine = (): LineItem => ({ catalogueId: "", units: "", discount: "", discountAmount: "" });

interface ProductDetailsProps {
  formData: Record<string, string>;
  onFieldChange: (field: string, value: string) => void;
  onSave: () => void;
}

function parseLines(formData: Record<string, string>): LineItem[] {
  try {
    const raw = formData["productLines"];
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

const ProductDetails = ({ formData, onFieldChange, onSave }: ProductDetailsProps) => {
  const { t } = useI18n();
  const [catalogue, setCatalogue] = useState<CatalogueProduct[]>([]);

  useEffect(() => {
    loadCatalogue().then(setCatalogue);
  }, []);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [catalogueSearch, setCatalogueSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ code: "", hsCode: "", name: "", description: "", unitPrice: "", vatPercent: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState({ code: "", hsCode: "", name: "", description: "", unitPrice: "", vatPercent: "" });

  const lines = parseLines(formData);

  const updateLines = useCallback(
    (newLines: LineItem[]) => {
      onFieldChange("productLines", JSON.stringify(newLines));
    },
    [onFieldChange]
  );

  const handleAddToCatalogue = useCallback(async () => {
    if (!newProduct.name.trim()) {
      toast.error("Enter a product name");
      return;
    }
    const product = await addToCatalogue({
      code: newProduct.code,
      hsCode: newProduct.hsCode,
      name: newProduct.name,
      description: newProduct.description,
      unitPrice: parseFloat(newProduct.unitPrice) || 0,
      vatPercent: parseFloat(newProduct.vatPercent) || 0,
    });
    loadCatalogue().then(setCatalogue);
    setNewProduct({ code: "", hsCode: "", name: "", description: "", unitPrice: "", vatPercent: "" });
    setShowAddForm(false);
    // Also add as a line item
    const updated = [...lines, { catalogueId: product.id, units: "1", discount: "", discountAmount: "" }];
    updateLines(updated);
    toast.success(`${product.name} added to catalogue and order`);
  }, [newProduct, lines, updateLines]);

  const handleRemoveFromCatalogue = useCallback(async (id: string) => {
    await removeFromCatalogue(id);
    loadCatalogue().then(setCatalogue);
    // Also remove any line items using this product
    const updated = lines.filter((l) => l.catalogueId !== id);
    updateLines(updated);
    toast.success("Product removed from catalogue");
  }, [lines, updateLines]);

  const handleAddLine = useCallback((productId: string) => {
    const updated = [...lines, { catalogueId: productId, units: "1", discount: "", discountAmount: "" }];
    updateLines(updated);
  }, [lines, updateLines]);

  const handleRemoveLine = useCallback((index: number) => {
    const updated = lines.filter((_, i) => i !== index);
    updateLines(updated);
  }, [lines, updateLines]);

  const handleLineChange = useCallback((index: number, key: keyof LineItem, value: string) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [key]: value };
    updateLines(updated);
  }, [lines, updateLines]);

  const getProduct = (id: string) => catalogue.find((p) => p.id === id);

  const lineGross = (line: LineItem) => {
    const product = getProduct(line.catalogueId);
    if (!product) return 0;
    const units = parseFloat(line.units) || 0;
    return product.unitPrice * units;
  };

  const lineDiscountAmount = (line: LineItem) => {
    const gross = lineGross(line);
    const percentDiscount = gross * ((parseFloat(line.discount) || 0) / 100);
    const fixedDiscount = parseFloat(line.discountAmount) || 0;
    return percentDiscount + fixedDiscount;
  };

  const lineSubtotal = (line: LineItem) => {
    return Math.max(0, lineGross(line) - lineDiscountAmount(line));
  };

  const lineVat = (line: LineItem) => {
    const product = getProduct(line.catalogueId);
    if (!product) return 0;
    return lineSubtotal(line) * (product.vatPercent / 100);
  };

  const totalBeforeTax = lines.reduce((s, l) => s + lineSubtotal(l), 0);
  const globalDiscount = parseFloat(formData["globalDiscount"] || "") || 0;
  const totalAfterDiscount = Math.max(0, totalBeforeTax - globalDiscount);
  const totalTax = lines.reduce((s, l) => s + lineVat(l), 0) * (totalBeforeTax > 0 ? totalAfterDiscount / totalBeforeTax : 1);
  const globalShipping = parseFloat(formData["globalShipping"] || "") || 0;
  const totalIncTax = totalAfterDiscount + totalTax + globalShipping;
  const fmt = (n: number) => n.toFixed(2);

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-foreground">{t("sidebar.productDetails")}</h2>


      {/* Product Catalogue */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Popover open={catalogueOpen} onOpenChange={setCatalogueOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={catalogue.length === 0}>
                <ShoppingCart className="mr-1 h-3.5 w-3.5" />
                Choose from Catalogue
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="start">
              <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="Search products..."
                    className="h-8 text-sm border-0 bg-transparent p-0 focus-visible:ring-0"
                    value={catalogueSearch}
                    onChange={(e) => setCatalogueSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="max-h-[350px] overflow-y-auto p-1">
                {catalogue
                  .filter((p) => {
                    const q = catalogueSearch.toLowerCase();
                    return !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
                  })
                  .map((p) => (
                    <div key={p.id}>
                      {editingId === p.id ? (
                        <div className="p-3 space-y-3 bg-secondary/20 rounded-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-muted-foreground mb-0.5 block">Code / SKU</label>
                              <Input className="bg-secondary/50 h-7 text-xs" value={editProduct.code} onChange={(e) => setEditProduct({ ...editProduct, code: e.target.value })} />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground mb-0.5 block">HS Code</label>
                              <Input className="bg-secondary/50 h-7 text-xs" value={editProduct.hsCode} onChange={(e) => setEditProduct({ ...editProduct, hsCode: e.target.value })} />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground mb-0.5 block">Name *</label>
                              <Input className="bg-secondary/50 h-7 text-xs" value={editProduct.name} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground mb-0.5 block">Description</label>
                              <Input className="bg-secondary/50 h-7 text-xs" value={editProduct.description} onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })} />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground mb-0.5 block">Unit Price</label>
                              <Input type="number" className="bg-secondary/50 h-7 text-xs" value={editProduct.unitPrice} onChange={(e) => setEditProduct({ ...editProduct, unitPrice: e.target.value })} />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground mb-0.5 block">VAT %</label>
                              <Input type="number" className="bg-secondary/50 h-7 text-xs" value={editProduct.vatPercent} onChange={(e) => setEditProduct({ ...editProduct, vatPercent: e.target.value })} />
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" className="h-7 text-xs" onClick={async () => {
                              if (!editProduct.name.trim()) { toast.error("Name is required"); return; }
                              await updateCatalogueProduct({
                                id: p.id, code: editProduct.code, hsCode: editProduct.hsCode,
                                name: editProduct.name, description: editProduct.description,
                                unitPrice: parseFloat(editProduct.unitPrice) || 0,
                                vatPercent: parseFloat(editProduct.vatPercent) || 0,
                              });
                              loadCatalogue().then(setCatalogue);
                              setEditingId(null);
                              toast.success("Product updated");
                            }}>
                              <Check className="mr-1 h-3 w-3" /> Save
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full rounded-sm px-3 py-2 hover:bg-accent transition-colors flex items-center gap-2 group">
                          <button
                            className="min-w-0 flex-1 text-left"
                            onClick={() => {
                              handleAddLine(p.id);
                              setCatalogueOpen(false);
                              setCatalogueSearch("");
                            }}
                          >
                            <p className="text-sm font-medium text-foreground truncate">{catalogueDisplayTitle(p)}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {p.code && <span className="mr-2">{p.code}</span>}
                              {p.hsCode && <span className="mr-2">HS: {p.hsCode}</span>}
                              {p.description && <span>{p.description}</span>}
                            </p>
                          </button>
                          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(p.id);
                              setEditProduct({
                                code: p.code, hsCode: p.hsCode, name: p.name,
                                description: p.description, unitPrice: p.unitPrice.toString(),
                                vatPercent: p.vatPercent.toString(),
                              });
                            }}>
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFromCatalogue(p.id);
                            }}>
                              <Trash2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                {catalogue.filter((p) => {
                  const q = catalogueSearch.toLowerCase();
                  return !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
                }).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No matching products</p>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add New
          </Button>
        </div>

        {showAddForm && (
          <div className="rounded-md border border-border p-4 space-y-3 bg-secondary/20">
            <p className="text-xs font-medium text-muted-foreground">New catalogue product</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Code / SKU</label>
                <Input placeholder="SKU-001" className="bg-secondary/50 h-8 text-sm" value={newProduct.code} onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">HS Code</label>
                <Input placeholder="8471.30" className="bg-secondary/50 h-8 text-sm" value={newProduct.hsCode} onChange={(e) => setNewProduct({ ...newProduct, hsCode: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
                <Input placeholder="Product name" className="bg-secondary/50 h-8 text-sm" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                <Input placeholder="Brief description" className="bg-secondary/50 h-8 text-sm" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Unit Price</label>
                <Input type="number" placeholder="0.00" className="bg-secondary/50 h-8 text-sm" value={newProduct.unitPrice} onChange={(e) => setNewProduct({ ...newProduct, unitPrice: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">VAT %</label>
                <Input type="number" placeholder="0" className="bg-secondary/50 h-8 text-sm" value={newProduct.vatPercent} onChange={(e) => setNewProduct({ ...newProduct, vatPercent: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddToCatalogue}>Save to Catalogue</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {catalogue.length === 0 && !showAddForm && (
          <p className="text-sm text-muted-foreground">No products in catalogue yet. Add one above.</p>
        )}
      </div>

      {/* Line Items */}
      {lines.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Order Lines</h3>
          <div className="space-y-2">
            {lines.map((line, idx) => {
              const product = getProduct(line.catalogueId);
              if (!product) return null;
              return (
                <div key={idx} className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{catalogueDisplayTitle(product)}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveLine(idx)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">Units</label>
                      <Input
                        type="number"
                        placeholder="1"
                        className="bg-secondary/50 h-8 text-sm"
                        value={line.units}
                        onChange={(e) => handleLineChange(idx, "units", e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">Discount %</label>
                      <Input
                        type="number"
                        placeholder="0"
                        className="bg-secondary/50 h-8 text-sm"
                        value={line.discount}
                        onChange={(e) => handleLineChange(idx, "discount", e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">Discount £€$</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        className="bg-secondary/50 h-8 text-sm"
                        value={line.discountAmount || ""}
                        onChange={(e) => handleLineChange(idx, "discountAmount", e.target.value)}
                      />
                    </div>
                    <div className="text-right pt-4">
                      <p className="text-xs text-muted-foreground">Discount</p>
                      <p className="text-sm font-medium text-foreground">-{fmt(lineDiscountAmount(line))}</p>
                    </div>
                    <div className="text-right pt-4">
                      <p className="text-xs text-muted-foreground">Subtotal</p>
                      <p className="text-sm font-medium text-foreground">{fmt(lineSubtotal(line))}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-1 text-sm border-t border-border pt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground whitespace-nowrap">Discount £€$</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  className="bg-secondary/50 h-7 text-sm w-28 text-right"
                  value={formData["globalDiscount"] || ""}
                  onChange={(e) => onFieldChange("globalDiscount", e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground whitespace-nowrap">Shipping £€$</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  className="bg-secondary/50 h-7 text-sm w-28 text-right"
                  value={formData["globalShipping"] || ""}
                  onChange={(e) => onFieldChange("globalShipping", e.target.value)}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total before tax</span>
                <span className="font-medium text-foreground">{fmt(totalAfterDiscount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Tax</span>
                <span className="font-medium text-foreground">{fmt(totalTax)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1">
                <span className="font-semibold text-foreground">Total inc. tax</span>
                <span className="font-semibold text-foreground">{fmt(totalIncTax)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <Button className="mt-2" onClick={onSave}>Save Product Details</Button>
    </div>
  );
};

export default ProductDetails;
