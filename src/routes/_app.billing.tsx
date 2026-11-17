import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoCapture, IdentifiedProduct } from "@/components/photo-capture";
import { AISectionButton } from "@/components/ai-section-button";
import { Link } from "@tanstack/react-router";
import { Plus, Minus, Trash2, Search, Receipt, Loader2, History } from "lucide-react";
import { inr } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/billing")({
  component: BillingPage,
});

type Product = {
  id: string; name: string; barcode: string | null; price: number;
  stock: number; unit: string | null; tax_rate: number | null;
};
type CartItem = {
  product_id: string | null; name: string; qty: number; price: number;
  tax_rate: number; unit: string;
};
type Customer = { id: string; name: string; phone: string | null };

function BillingPage() {
  const { shop } = useAuth();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [walkInName, setWalkInName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState("0");
  const [paid, setPaid] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any | null>(null);

  useEffect(() => {
    if (!shop) return;
    supabase.from("customers").select("id,name,phone").eq("shop_id", shop.id).order("name")
      .then(({ data }) => setCustomers((data ?? []) as Customer[]));
  }, [shop]);

  useEffect(() => {
    if (!shop || !search) return setResults([]);
    const t = setTimeout(async () => {
      const { data } = await supabase.from("products").select("*").eq("shop_id", shop.id)
        .or(`name.ilike.%${search}%,barcode.eq.${search},sku.ilike.%${search}%`)
        .limit(8);
      setResults((data ?? []) as Product[]);
    }, 200);
    return () => clearTimeout(t);
  }, [search, shop]);

  const addProduct = (p: Product) => {
    setCart((c) => {
      const existing = c.find((x) => x.product_id === p.id);
      if (existing) return c.map((x) => x.product_id === p.id ? { ...x, qty: x.qty + 1 } : x);
      return [...c, {
        product_id: p.id, name: p.name, qty: 1, price: Number(p.price),
        tax_rate: Number(p.tax_rate ?? 0), unit: p.unit ?? "pcs",
      }];
    });
    setSearch(""); setResults([]);
  };

  const onPhotoIdentified = async (p: IdentifiedProduct) => {
    if (!shop || !p.name) return;
    // Try fuzzy match against existing products
    const { data } = await supabase.from("products").select("*").eq("shop_id", shop.id)
      .ilike("name", `%${p.name}%`).limit(1);
    if (data && data.length > 0) {
      addProduct(data[0] as Product);
      toast.success(`Added: ${(data[0] as Product).name}`);
    } else {
      setCart((c) => [...c, {
        product_id: null, name: p.name!, qty: 1,
        price: p.estimated_price ?? 0, tax_rate: 0, unit: p.unit ?? "pcs",
      }]);
      toast.success(`AI ne pehchana: ${p.name} — price verify karein`);
    }
  };

  const addManualLine = () => {
    setCart((c) => [...c, { product_id: null, name: "New item", qty: 1, price: 0, tax_rate: 0, unit: "pcs" }]);
  };

  const updateQty = (i: number, d: number) => setCart((c) => c.map((x, idx) =>
    idx === i ? { ...x, qty: Math.max(0, x.qty + d) } : x
  ).filter((x) => x.qty > 0));

  const updateLine = (i: number, patch: Partial<CartItem>) => setCart((c) => c.map((x, idx) => idx === i ? { ...x, ...patch } : x));

  const removeItem = (i: number) => setCart((c) => c.filter((_, idx) => idx !== i));

  const subtotal = cart.reduce((s, x) => s + x.qty * x.price, 0);
  const taxTotal = cart.reduce((s, x) => s + (x.qty * x.price * x.tax_rate / 100), 0);
  const disc = parseFloat(discount || "0");
  const total = Math.max(0, subtotal + taxTotal - disc);
  const paidNum = paymentMethod === "udhari" ? 0 : (paid ? parseFloat(paid) : total);

  const checkout = async () => {
    if (!shop) return;
    if (cart.length === 0) return toast.error("Cart khali hai");

    // Auto-create walk-in customer if name typed but no id
    let cid = customerId;
    if (!cid && walkInName.trim()) {
      const { data: nc, error: ce } = await supabase.from("customers").insert({
        shop_id: shop.id, name: walkInName.trim(),
      }).select("id,name,phone").single();
      if (ce) { return toast.error(ce.message); }
      cid = nc!.id;
      setCustomers((cs) => [...cs, nc as Customer]);
    }

    if (paymentMethod === "udhari" && !cid) return toast.error("Udhari ke liye customer naam zaroori hai");
    setSaving(true);
    const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
    const { data: sale, error } = await supabase.from("sales").insert({
      shop_id: shop.id,
      customer_id: cid || null,
      invoice_number: invoiceNumber,
      subtotal, tax_total: taxTotal, discount: disc, total,
      paid_amount: paidNum, payment_method: paymentMethod,
    }).select().single();
    if (error || !sale) { setSaving(false); return toast.error(error?.message ?? "Failed"); }

    const items = cart.map((c) => ({
      sale_id: sale.id, product_id: c.product_id, name: c.name,
      qty: c.qty, unit: c.unit, price: c.price, tax_rate: c.tax_rate,
      line_total: c.qty * c.price * (1 + c.tax_rate / 100),
    }));
    await supabase.from("sale_items").insert(items);

    for (const c of cart) {
      if (!c.product_id) continue;
      const { data: p } = await supabase.from("products").select("stock").eq("id", c.product_id).single();
      if (p) await supabase.from("products").update({ stock: Number(p.stock) - c.qty }).eq("id", c.product_id);
    }

    if (paymentMethod === "udhari" && cid) {
      await supabase.from("payments").insert({
        shop_id: shop.id, customer_id: cid, sale_id: sale.id,
        amount: -total, type: "credit", method: "udhari", notes: `Sale ${invoiceNumber}`,
      });
    } else if (paidNum < total && cid) {
      await supabase.from("payments").insert({
        shop_id: shop.id, customer_id: cid, sale_id: sale.id,
        amount: -(total - paidNum), type: "credit", method: paymentMethod, notes: `Partial paid ${invoiceNumber}`,
      });
    }

    const customer = customers.find((c) => c.id === cid) ?? (walkInName ? { id: cid, name: walkInName, phone: null } : null);
    setLastInvoice({ ...sale, items, customer, shop });
    setCart([]); setCustomerId(""); setWalkInName(""); setDiscount("0"); setPaid(""); setPaymentMethod("cash");
    setSaving(false);
    toast.success(`Bill ${invoiceNumber} saved · History me dekhein`);
  };

  const printInvoice = () => window.print();

  return (
    <PageShell>
      <PageHeader title="Billing" subtitle="Scan, search ya bolke add karein" actions={<AISectionButton section="billing" />} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left: search + cart */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search product name / barcode…"
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <PhotoCapture onIdentified={onPhotoIdentified} label="Photo se add" />
              <Link to="/history"><Button type="button" variant="outline"><History className="mr-1 h-4 w-4" /> Billing history</Button></Link>
              <Button type="button" variant="secondary" onClick={addManualLine}>
                <Plus className="mr-1 h-4 w-4" /> Manual
              </Button>
            </div>
            {results.length > 0 && (
              <div className="mt-2 divide-y divide-border rounded-lg border border-border">
                {results.map((p) => (
                  <button key={p.id} onClick={() => addProduct(p)}
                    className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-muted">
                    <span>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">Stock: {p.stock} {p.unit}</div>
                    </span>
                    <span className="font-medium">{inr(p.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card">
            {cart.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                <Receipt className="mx-auto mb-2 h-8 w-8" />
                Cart khali hai. Product add karein.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Item</th>
                    <th className="px-4 py-2 text-center">Qty</th>
                    <th className="px-4 py-2 text-right">Price</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cart.map((c, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">
                        <Input value={c.name} onChange={(e) => updateLine(i, { name: e.target.value })} className="h-8" />
                      </td>
                      <td className="px-4 py-2">
                        <div className="mx-auto flex w-fit items-center gap-1">
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(i, -1)}><Minus className="h-3 w-3" /></Button>
                          <Input type="number" value={c.qty}
                            onChange={(e) => updateLine(i, { qty: Math.max(0, parseFloat(e.target.value || "0")) })}
                            className="h-7 w-14 text-center" />
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(i, 1)}><Plus className="h-3 w-3" /></Button>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Input type="number" step="0.01" value={c.price}
                          onChange={(e) => updateLine(i, { price: parseFloat(e.target.value || "0") })}
                          className="h-8 w-24 text-right" />
                      </td>
                      <td className="px-4 py-2 text-right font-medium">{inr(c.qty * c.price)}</td>
                      <td className="px-2 py-2"><Button size="icon" variant="ghost" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: summary */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <Label className="text-xs">Customer (optional)</Label>
            <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setWalkInName(""); }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Saved customer chunein" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} {c.phone ? `· ${c.phone}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-2">
              <Label className="text-xs">Ya naya naam likhein</Label>
              <Input placeholder="Walk-in customer ka naam" value={walkInName}
                onChange={(e) => { setWalkInName(e.target.value); if (e.target.value) setCustomerId(""); }} />
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <Row label="Subtotal" value={inr(subtotal)} />
              <Row label="Tax" value={inr(taxTotal)} />
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Discount</span>
                <Input type="number" className="h-8 w-24 text-right" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 font-display text-lg font-bold">
                <span>Total</span><span>{inr(total)}</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label className="text-xs">Payment method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="udhari">Udhari (Credit)</SelectItem>
                </SelectContent>
              </Select>
              {paymentMethod !== "udhari" && (
                <div>
                  <Label className="text-xs">Paid amount (optional)</Label>
                  <Input type="number" placeholder={String(total.toFixed(2))} value={paid} onChange={(e) => setPaid(e.target.value)} />
                </div>
              )}
            </div>

            <Button className="mt-4 w-full" size="lg" onClick={checkout} disabled={saving || cart.length === 0}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Checkout · {inr(total)}
            </Button>
          </div>

          {lastInvoice && (
            <div className="rounded-xl border border-success bg-success/5 p-4 text-sm">
              <div className="font-medium text-success">Bill saved: {lastInvoice.invoice_number}</div>
              <Button variant="link" className="mt-2 px-0" onClick={() => setLastInvoice(null)}>Naya bill</Button>
              <Button variant="outline" size="sm" className="mt-2 ml-2" onClick={printInvoice}>Print invoice</Button>
              <PrintInvoice data={lastInvoice} />
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>;
}

function PrintInvoice({ data }: { data: any }) {
  return (
    <div className="hidden print:block">
      <style>{`@media print { body * { visibility: hidden; } .print-area, .print-area * { visibility: visible; } .print-area { position: absolute; inset: 0; padding: 24px; } }`}</style>
      <div className="print-area">
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>{data.shop?.name}</h1>
        <div style={{ fontSize: 12 }}>{data.shop?.address ?? ""}</div>
        <div style={{ fontSize: 12 }}>Phone: {data.shop?.phone ?? "—"} {data.shop?.gst_number ? `· GST: ${data.shop.gst_number}` : ""}</div>
        <hr style={{ margin: "12px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <div><b>Invoice:</b> {data.invoice_number}</div>
          <div><b>Date:</b> {new Date(data.created_at).toLocaleString()}</div>
        </div>
        {data.customer && <div style={{ fontSize: 12, marginTop: 6 }}><b>Customer:</b> {data.customer.name}</div>}
        <table style={{ width: "100%", marginTop: 12, fontSize: 12 }}>
          <thead><tr style={{ borderBottom: "1px solid #000" }}><th align="left">Item</th><th>Qty</th><th align="right">Price</th><th align="right">Total</th></tr></thead>
          <tbody>
            {data.items.map((it: any, i: number) => (
              <tr key={i}><td>{it.name}</td><td align="center">{it.qty}</td><td align="right">{Number(it.price).toFixed(2)}</td><td align="right">{Number(it.line_total).toFixed(2)}</td></tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 12, textAlign: "right", fontSize: 12 }}>
          <div>Subtotal: ₹{Number(data.subtotal).toFixed(2)}</div>
          <div>Tax: ₹{Number(data.tax_total).toFixed(2)}</div>
          <div>Discount: ₹{Number(data.discount).toFixed(2)}</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>Total: ₹{Number(data.total).toFixed(2)}</div>
          <div>Paid: ₹{Number(data.paid_amount).toFixed(2)} ({data.payment_method})</div>
        </div>
        <p style={{ marginTop: 24, fontSize: 11, textAlign: "center" }}>Thank you! Visit again.</p>
      </div>
    </div>
  );
}
