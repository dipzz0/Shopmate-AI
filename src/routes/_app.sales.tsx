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
import { TrendingUp, History, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AISectionButton } from "@/components/ai-section-button";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_app/sales")({
  component: SalesPage,
});

type Sale = {
  id: string; invoice_number: string | null; total: number; paid_amount: number;
  payment_method: string; discount: number; subtotal: number; tax_total: number;
  created_at: string; status: string;
};

function SalesPage() {
  const { shop } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [paid, setPaid] = useState("");
  const [discount, setDiscount] = useState("");
  const [method, setMethod] = useState("cash");

  const load = async () => {
    if (!shop) return;
    const { data } = await supabase.from("sales").select("*").eq("shop_id", shop.id)
      .order("created_at", { ascending: false }).limit(500);
    setSales((data ?? []) as Sale[]);
  };
  useEffect(() => { load(); }, [shop]);

  // Today
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todaySales = sales.filter((s) => new Date(s.created_at) >= todayStart);
  const todayTotal = todaySales.reduce((s, x) => s + Number(x.total), 0);
  const todayPaid = todaySales.reduce((s, x) => s + Number(x.paid_amount), 0);

  // Last 7 days chart
  const days: { date: string; label: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    const tot = sales.filter((s) => {
      const t = new Date(s.created_at); return t >= d && t < next;
    }).reduce((sum, x) => sum + Number(x.total), 0);
    days.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
      total: Math.round(tot),
    });
  }

  const openEdit = async (s: Sale) => {
    setEditing(s); setPaid(String(s.paid_amount)); setDiscount(String(s.discount)); setMethod(s.payment_method);
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

  return (
    <PageShell>
      <PageHeader
        title="Sales"
        subtitle="Aaj ki sales, weekly trend, aur past bills manage"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/dashboard"><ArrowLeft className="mr-1.5 h-4 w-4" /> Dashboard</Link></Button>
            <Button variant={showHistory ? "default" : "outline"} size="sm" onClick={() => setShowHistory((v) => !v)}>
              <History className="mr-1.5 h-4 w-4" /> {showHistory ? "Hide history" : "Sales history"}
            </Button>
            <AISectionButton section="sales" />
          </div>
        }
      />

      {/* Today summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 to-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Aaj ki sales (₹)</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3 font-display text-3xl font-bold">{inr(todayTotal)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{todaySales.length} bills · Paid {inr(todayPaid)}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="text-sm text-muted-foreground">Avg per bill</div>
          <div className="mt-3 font-display text-3xl font-bold">{inr(todaySales.length ? todayTotal / todaySales.length : 0)}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="text-sm text-muted-foreground">Due (today)</div>
          <div className="mt-3 font-display text-3xl font-bold text-destructive">{inr(todayTotal - todayPaid)}</div>
        </div>
      </div>

      {/* 7-day chart */}
      <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-3 text-sm font-medium">Last 7 days — sales trend</div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0 0 / 0.3)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
              <Tooltip formatter={(v: any) => inr(Number(v))} contentStyle={{ background: "oklch(var(--card))", border: "1px solid oklch(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="total" fill="oklch(0.65 0.18 240)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* History */}
      {showHistory && (
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <div className="border-b border-border px-4 py-3 text-sm font-medium">Past sales (latest 500)</div>
          {sales.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Koi bill nahi.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sales.map((s) => {
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
          )}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bill {editing?.invoice_number}</DialogTitle>
            <DialogDescription>Payment, discount, method update karein.</DialogDescription>
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
