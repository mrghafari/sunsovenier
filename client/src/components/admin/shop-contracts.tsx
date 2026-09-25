import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, FileText, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type ContractItem = {
  productId: number | string;
  productName: string;
  maxQuantity: number;
  usedQuantity: number;
  remainingQuantity: number;
  unitPrice: number;
};

type Contract = {
  id: number | string;
  number: string;
  terms: string;
  isActive: boolean;
  customerId: number | string;
  customerName: string;
  items: ContractItem[];
};

type Customer = {
  id: number | string;
  firstName?: string;
  lastName?: string;
  name?: string;
  company?: string;
  email?: string;
};

type Product = {
  id: number | string;
  name: string;
};

type FormItem = {
  productId: number | string;
  productName: string;
  maxQuantity: string;
  unitPrice: string;
  usedQuantity: number;
};

type ContractForm = {
  number: string;
  customerId: number | string | null;
  customerName: string;
  terms: string;
  isActive: boolean;
  items: FormItem[];
};

const emptyForm = (): ContractForm => ({
  number: "",
  customerId: null,
  customerName: "",
  terms: "",
  isActive: true,
  items: [],
});

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    throw new Error(result.message || result.error || `خطا در دریافت اطلاعات (${response.status})`);
  }
  return result as T;
}

function customerLabel(customer: Customer) {
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.name;
  return fullName || customer.company || customer.email || `مشتری ${customer.id}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "خطای غیرمنتظره‌ای رخ داد.";
}

export default function ShopContracts() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [form, setForm] = useState<ContractForm>(emptyForm);
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [formError, setFormError] = useState("");

  const contractsQuery = useQuery<{ success: boolean; contracts: Contract[] }>({
    queryKey: ["/api/admin/shop/contracts"],
    queryFn: () => readJson("/api/admin/shop/contracts"),
  });

  const customerQuery = useQuery<{ data?: Customer[]; customers?: Customer[] }>({
    queryKey: ["/api/crm/customers/search", customerSearch],
    queryFn: () => readJson(`/api/crm/customers/search?q=${encodeURIComponent(customerSearch)}`),
    enabled: dialogOpen && customerSearch.trim().length >= 2,
  });

  const productQuery = useQuery<{ data?: { products?: Product[] } | Product[]; products?: Product[] }>({
    queryKey: ["/api/shop/search", productSearch],
    queryFn: () => readJson(`/api/shop/search?q=${encodeURIComponent(productSearch)}`),
    enabled: dialogOpen && productSearch.trim().length >= 2,
  });

  const customers = useMemo(() => {
    const payload = customerQuery.data?.data;
    return Array.isArray(payload)
      ? payload
      : customerQuery.data?.customers || (payload as { customers?: Customer[] } | undefined)?.customers || [];
  }, [customerQuery.data]);

  const products = useMemo(() => {
    const payload = productQuery.data?.data;
    const found = Array.isArray(payload)
      ? payload
      : (payload as { products?: Product[] } | undefined)?.products || productQuery.data?.products || [];
    return found.map((product: any) => ({
      id: product.id ?? product.productId,
      name: product.name ?? product.productName ?? product.title ?? `محصول ${product.id ?? product.productId}`,
    })).filter((product: Product) => product.id !== undefined && product.id !== null);
  }, [productQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        number: form.number.trim(),
        customerId: form.customerId,
        terms: form.terms.trim(),
        isActive: form.isActive,
        items: form.items.map((item) => ({
          productId: item.productId,
          maxQuantity: Number(item.maxQuantity),
          unitPrice: Number(item.unitPrice),
        })),
      };
      const response = await fetch(
        editingId === null ? "/api/admin/shop/contracts" : `/api/admin/shop/contracts/${editingId}`,
        {
          method: editingId === null ? "POST" : "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        throw new Error(result.message || result.error || `ذخیره قرارداد ناموفق بود (${response.status})`);
      }
      return result;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/contracts"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      setCustomerSearch("");
      setProductSearch("");
      setFormError("");
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setCustomerSearch("");
    setProductSearch("");
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (contract: Contract) => {
    setEditingId(contract.id);
    setForm({
      number: contract.number || "",
      customerId: contract.customerId,
      customerName: contract.customerName || "",
      terms: contract.terms || "",
      isActive: Boolean(contract.isActive),
      items: (contract.items || []).map((item) => ({
        productId: item.productId,
        productName: item.productName,
        maxQuantity: String(item.maxQuantity),
        unitPrice: String(item.unitPrice),
        usedQuantity: Number(item.usedQuantity) || 0,
      })),
    });
    setCustomerSearch("");
    setProductSearch("");
    setFormError("");
    setDialogOpen(true);
  };

  const addProduct = (product: Product) => {
    if (form.items.some((item) => String(item.productId) === String(product.id))) return;
    setForm((current) => ({
      ...current,
      items: [...current.items, {
        productId: product.id,
        productName: product.name,
        maxQuantity: "",
        unitPrice: "",
        usedQuantity: 0,
      }],
    }));
    setProductSearch("");
  };

  const updateItem = (index: number, field: "maxQuantity" | "unitPrice", value: string) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  };

  const submit = () => {
    setFormError("");
    if (!form.number.trim()) return setFormError("شماره قرارداد را وارد کنید.");
    if (form.customerId === null) return setFormError("یک مشتری انتخاب کنید.");
    if (form.items.length === 0) return setFormError("حداقل یک محصول به قرارداد اضافه کنید.");
    for (const item of form.items) {
      const maxQuantity = Number(item.maxQuantity);
      const unitPrice = Number(item.unitPrice);
      if (!Number.isInteger(maxQuantity) || maxQuantity <= 0) {
        return setFormError(`حداکثر تعداد «${item.productName}» باید عدد صحیح مثبت باشد.`);
      }
      if (maxQuantity < item.usedQuantity) {
        return setFormError(`حداکثر تعداد «${item.productName}» نمی‌تواند کمتر از مقدار مصرف‌شده (${item.usedQuantity}) باشد.`);
      }
      if (!item.unitPrice.trim() || !Number.isFinite(unitPrice) || unitPrice < 0) {
        return setFormError(`قیمت توافقی «${item.productName}» باید عددی معتبر و نامنفی باشد.`);
      }
    }
    saveMutation.mutate();
  };

  const contracts = contractsQuery.data?.contracts || [];

  return (
    <section dir="rtl" className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><FileText className="h-6 w-6 text-primary" /> قراردادهای فروش</h1>
          <p className="mt-1 text-sm text-muted-foreground">مدیریت سقف خرید و قیمت توافقی مشتریان</p>
        </div>
        <Button onClick={openCreate}><Plus className="ml-2 h-4 w-4" /> قرارداد جدید</Button>
      </header>

      {contractsQuery.isLoading && <div className="py-12 text-center text-muted-foreground">در حال بارگذاری قراردادها…</div>}
      {contractsQuery.isError && (
        <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{errorMessage(contractsQuery.error)}</AlertDescription></Alert>
      )}
      {!contractsQuery.isLoading && !contractsQuery.isError && contracts.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">هنوز قراردادی ثبت نشده است.</CardContent></Card>
      )}

      <div className="grid gap-4">
        {contracts.map((contract) => (
          <Card key={contract.id} className="overflow-hidden">
            <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">قرارداد {contract.number}</CardTitle>
                <p className="text-sm text-muted-foreground">{contract.customerName || `مشتری ${contract.customerId}`}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={contract.isActive ? "default" : "secondary"}>{contract.isActive ? "فعال" : "غیرفعال"}</Badge>
                <Button variant="outline" size="sm" onClick={() => openEdit(contract)}>ویرایش</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(contract.items || []).map((item) => (
                  <div key={item.productId} className="rounded-md border p-3">
                    <p className="font-medium">{item.productName}</p>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span>سقف تعداد</span><span className="text-left text-foreground">{item.maxQuantity}</span>
                      <span>مصرف‌شده</span><span className="text-left text-foreground">{item.usedQuantity}</span>
                      <span>باقی‌مانده</span><span className="text-left text-foreground">{item.remainingQuantity}</span>
                      <span>قیمت واحد</span><span className="text-left text-foreground">{Number(item.unitPrice).toLocaleString("fa-IR")} دینار</span>
                    </div>
                  </div>
                ))}
              </div>
              {contract.terms && (
                <div className="border-t pt-3">
                  <p className="mb-1 text-sm font-medium">شرایط قرارداد</p>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{contract.terms}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setFormError(""); }}>
        <DialogContent dir="rtl" className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId === null ? "ایجاد قرارداد فروش" : "ویرایش قرارداد فروش"}</DialogTitle>
            <DialogDescription>مشخصات قرارداد، مشتری و سقف خرید محصولات را ثبت کنید.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{formError}</AlertDescription></Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contract-number">شماره قرارداد</Label>
                <Input id="contract-number" value={form.number} onChange={(event) => setForm({ ...form, number: event.target.value })} maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-search">مشتری</Label>
                <Input id="customer-search" value={customerSearch} placeholder={form.customerName || "جستجوی نام یا شرکت (حداقل ۲ حرف)"} onChange={(event) => { setCustomerSearch(event.target.value); setForm({ ...form, customerId: null, customerName: "" }); }} />
                {customerQuery.isLoading && <p className="text-xs text-muted-foreground">در حال جستجوی مشتریان…</p>}
                {customerQuery.isError && <p className="text-xs text-destructive">{errorMessage(customerQuery.error)}</p>}
                {customers.length > 0 && (
                  <div className="max-h-36 overflow-auto rounded-md border" role="listbox" aria-label="نتایج مشتریان">
                    {customers.map((customer) => (
                      <button type="button" key={customer.id} role="option" aria-selected={String(form.customerId) === String(customer.id)}
                        className="block w-full px-3 py-2 text-right text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => { setForm({ ...form, customerId: customer.id, customerName: customerLabel(customer) }); setCustomerSearch(""); }}>
                        <span className="block font-medium">{customerLabel(customer)}</span>
                        {customer.email && <span className="text-xs text-muted-foreground">{customer.email}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {form.customerId && <p className="text-sm text-primary">انتخاب‌شده: {form.customerName}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div><Label htmlFor="contract-active">وضعیت قرارداد</Label><p className="text-xs text-muted-foreground">قرارداد فعال برای فروش قابل استفاده است.</p></div>
              <Switch id="contract-active" checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} aria-label="فعال بودن قرارداد" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract-terms">شرایط قرارداد</Label>
              <Textarea id="contract-terms" value={form.terms} onChange={(event) => setForm({ ...form, terms: event.target.value })} rows={3} />
            </div>

            <div className="space-y-3">
              <div><h3 className="font-semibold">محصولات قرارداد</h3><p className="text-xs text-muted-foreground">سقف تعداد و قیمت ثابت توافق‌شده به دینار عراق را مشخص کنید.</p></div>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pr-9" aria-label="جستجوی محصول" value={productSearch} placeholder="جستجوی محصول (حداقل ۲ حرف)" onChange={(event) => setProductSearch(event.target.value)} />
              </div>
              {productQuery.isLoading && <p className="text-xs text-muted-foreground">در حال جستجوی محصولات…</p>}
              {productQuery.isError && <p className="text-xs text-destructive">{errorMessage(productQuery.error)}</p>}
              {products.length > 0 && (
                <div className="max-h-36 overflow-auto rounded-md border">
                  {products.map((product) => (
                    <button type="button" key={product.id} disabled={form.items.some((item) => String(item.productId) === String(product.id))}
                      className="flex w-full items-center justify-between px-3 py-2 text-right text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => addProduct(product)}>
                      <span>{product.name}</span><Plus className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              )}
              {form.items.length === 0 && <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">محصولی به قرارداد افزوده نشده است.</p>}
              <div className="space-y-3">
                {form.items.map((item, index) => (
                  <div key={item.productId} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_130px_150px_auto] sm:items-end">
                    <div className="min-w-0"><p className="truncate font-medium">{item.productName}</p>
                      {item.usedQuantity > 0 && <p className="text-xs text-muted-foreground">مصرف‌شده: {item.usedQuantity}؛ سقف نمی‌تواند کمتر باشد.</p>}
                    </div>
                    <div className="space-y-1"><Label htmlFor={`max-${index}`}>حداکثر تعداد</Label>
                      <Input id={`max-${index}`} type="number" min={item.usedQuantity} step="1" value={item.maxQuantity} onChange={(event) => updateItem(index, "maxQuantity", event.target.value)} />
                    </div>
                    <div className="space-y-1"><Label htmlFor={`price-${index}`}>قیمت واحد (دینار)</Label>
                      <Input id={`price-${index}`} type="number" min="0" step="any" value={item.unitPrice} onChange={(event) => updateItem(index, "unitPrice", event.target.value)} />
                    </div>
                    <Button type="button" variant="ghost" size="icon" aria-label={`حذف ${item.productName}`}
                      disabled={item.usedQuantity > 0} onClick={() => setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saveMutation.isPending}>انصراف</Button>
            <Button onClick={submit} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {saveMutation.isPending ? "در حال ذخیره…" : editingId === null ? "ایجاد قرارداد" : "ذخیره تغییرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}