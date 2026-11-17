import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { inr, fmtDate } from "@/lib/format";
import { Receipt, Trash2, Pencil, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/history")({
  component: HistoryPage,
});

type Sale = {
  id: string;
  invoice_number: string | null;
  total: number;
  paid_amount: number;
  payment_method: string;
  discount: number;
  subtotal: number;
  tax_total: number;
  created_at: string;
  status: string;
  customer_id: string | null;
};

function HistoryPage() {
  const { shop } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Sale | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [paid, setPaid] = useState("");
  const [discount, setDiscount] = useState("");
  const [method, setMethod] = useState("cash");

  const load = async () => {
    if (!shop) return;
    const { data } = await supabase.from("sales").select("*").eq("shop_id", shop.id)
      .order("created_at", { ascending: false }).limit(200);
    setSales((data ?? []) as Sale[]);
  };
  useEffect(() => { load(); }, [shop]);

  const openEdit = async (s: Sale) => {
    setEditing(s);
    setPaid(String(s.paid_amount));
    setDiscount(String(s.discount));
    setMethod(s.payment_method);
    const { data } = await supabase.from("sale_items").select("*").eq("sale_id", s.id);
    setItems(data ?? []);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await supabase.from("sales").update({
      paid_amount: parseFloat(paid || "0"),
      discount: parseFloat(discount || "0"),
      payment_method: method,
    }).eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Updated"); setEditing(null); load();
  };

  const remove = async (s: Sale) => {
    if (!confirm(`Delete bill ${s.invoice_number}?`)) return;
    await supabase.from("sale_items").delete().eq("sale_id", s.id);
    await supabase.from("payments").delete().eq("sale_id", s.id);
    const { error } = await supabase.from("sales").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  const filtered = sales.filter((s) => !q || (s.invoice_number ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <PageShell>
      <PageHeader title="Billing History" subtitle="Saare bills manage karein" />

      <div className="mb-4 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search invoice number…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Receipt className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Abhi tak koi bill nahi.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => {
                const due = Number(s.total) - Number(s.paid_amount);
                return (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{s.invoice_number}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(s.created_at)}</td>
                    <td className="px-4 py-3 capitalize">{s.payment_method}</td>
                    <td className="px-4 py-3 text-right font-medium">{inr(s.total)}</td>
                    <td className={`px-4 py-3 text-right ${due > 0 ? "text-destructive" : "text-success"}`}>{inr(s.paid_amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bill {editing?.invoice_number}</DialogTitle>
            <DialogDescription>Payment aur discount update karein.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border p-3 text-sm">
                {items.map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{it.name} × {it.qty}</span>
                    <span>{inr(it.line_total)}</span>
                  </div>
                ))}
                <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
                  <span>Total</span><span>{inr(editing.total)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Paid</Label><Input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} /></div>
                <div><Label>Discount</Label><Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
              </div>
              <div>
                <Label>Method</Label>
                <select className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="udhari">Udhari</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
