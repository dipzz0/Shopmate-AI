import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Package } from "lucide-react";
import { inr } from "@/lib/format";
import { toast } from "sonner";
import { PhotoCapture, IdentifiedProduct } from "@/components/photo-capture";
import { AISectionButton } from "@/components/ai-section-button";

export const Route = createFileRoute("/_app/products")({
  component: ProductsPage,
});

type Product = {
  id: string;
  name: string;
  barcode: string | null;
  sku: string | null;
  category: string | null;
  unit: string | null;
  price: number;
  cost_price: number | null;
  stock: number;
  low_stock_threshold: number | null;
};

const empty = {
  name: "",
  sku: "",
  category: "",
  unit: "pcs",
  price: "",
  cost_price: "",
  stock: "",
  low_stock_threshold: "5",
};

function ProductsPage() {
  const { shop } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    if (!shop) return;
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Product[]);
  };
  useEffect(() => { load(); }, [shop]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, sku: p.sku ?? "", category: p.category ?? "",
      unit: p.unit ?? "pcs", price: String(p.price), cost_price: String(p.cost_price ?? ""),
      stock: String(p.stock), low_stock_threshold: String(p.low_stock_threshold ?? 5),
    });
    setOpen(true);
  };

  const onIdentified = (p: IdentifiedProduct) => {
    setEditing(null);
    setForm({
      ...empty,
      name: p.name ?? "",
      category: p.category ?? "",
      unit: p.unit ?? "pcs",
      price: p.estimated_price != null ? String(p.estimated_price) : "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!shop || !form.name) return toast.error("Name zaroori hai");
    const payload = {
      shop_id: shop.id,
      name: form.name,
      sku: form.sku || null,
      category: form.category || null,
      unit: form.unit || "pcs",
      price: parseFloat(form.price || "0"),
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      stock: parseFloat(form.stock || "0"),
      low_stock_threshold: parseFloat(form.low_stock_threshold || "5"),
    };
    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Updated" : "Product added");
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  const filtered = items.filter((p) =>
    !q ||
    p.name.toLowerCase().includes(q.toLowerCase()) ||
    p.barcode?.includes(q) || p.sku?.includes(q),
  );

  return (
    <PageShell>
      <PageHeader
        title="Products"
        subtitle="Inventory manage karein — photo se ya manually"
        actions={
          <div className="flex flex-wrap gap-2">
            <PhotoCapture onIdentified={onIdentified} label="Photo se add" />
            <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Manual</Button>
            <AISectionButton section="products" />
          </div>
        }
      />

      <div className="mb-4 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by name or SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Koi product nahi. "Photo se add" ya "Manual" se shuru karein.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const low = p.low_stock_threshold != null && p.stock <= p.low_stock_threshold;
                return (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.sku ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.category ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-medium">{inr(p.price)}</td>
                    <td className={`px-4 py-3 text-right ${low ? "text-destructive font-semibold" : ""}`}>
                      {p.stock} {p.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="SKU"><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></Field>
              <Field label="Category"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Unit"><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="pcs / kg / ltr" /></Field>
              <Field label="Price *"><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cost"><Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} /></Field>
              <Field label="Stock"><Input type="number" step="0.01" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></Field>
            </div>
            <Field label="Low-stock alert below"><Input type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
