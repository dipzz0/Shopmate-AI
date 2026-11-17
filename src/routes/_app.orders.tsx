import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, ListOrdered } from "lucide-react";
import { inr, fmtDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/orders")({
  component: OrdersPage,
});

type Order = {
  id: string; customer_name: string | null; customer_phone: string | null;
  items: { name: string; qty: number; price: number }[]; total: number;
  status: string; due_at: string | null; notes: string | null; created_at: string;
};

const STATUSES = ["pending", "preparing", "ready", "delivered", "cancelled"];

function OrdersPage() {
  const { shop } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", due_at: "", notes: "" });
  const [items, setItems] = useState<{ name: string; qty: string; price: string }[]>([{ name: "", qty: "1", price: "" }]);

  const load = async () => {
    if (!shop) return;
    const { data } = await supabase.from("orders").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false });
    setOrders((data ?? []) as unknown as Order[]);
  };
  useEffect(() => { load(); }, [shop]);

  const addItem = () => setItems((it) => [...it, { name: "", qty: "1", price: "" }]);
  const removeItem = (i: number) => setItems((it) => it.filter((_, idx) => idx !== i));

  const create = async () => {
    if (!shop || !form.name) return toast.error("Customer name zaroori hai");
    const cleanItems = items
      .filter((i) => i.name)
      .map((i) => ({ name: i.name, qty: parseFloat(i.qty || "1"), price: parseFloat(i.price || "0") }));
    if (cleanItems.length === 0) return toast.error("At least 1 item");
    const total = cleanItems.reduce((s, x) => s + x.qty * x.price, 0);
    const { error } = await supabase.from("orders").insert({
      shop_id: shop.id,
      customer_name: form.name, customer_phone: form.phone || null,
      items: cleanItems, total,
      due_at: form.due_at || null, notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Order saved");
    setOpen(false);
    setForm({ name: "", phone: "", due_at: "", notes: "" });
    setItems([{ name: "", qty: "1", price: "" }]);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    toast.success("Status updated"); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete order?")) return;
    await supabase.from("orders").delete().eq("id", id);
    load();
  };

  return (
    <PageShell>
      <PageHeader title="Orders" subtitle="Customer orders track karein"
        actions={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> New order</Button>} />

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <ListOrdered className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Koi order nahi.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {orders.map((o) => (
            <div key={o.id} className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-display font-semibold">{o.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{o.customer_phone ?? "—"} · {fmtDate(o.created_at)}</div>
                </div>
                <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                  <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {(o.items ?? []).map((it, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{it.qty}× {it.name}</span><span className="text-muted-foreground">{inr(it.qty * it.price)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                <div className="text-xs">
                  {o.due_at && <span>Due: {fmtDate(o.due_at)}</span>}
                </div>
                <div className="font-display font-bold">{inr(o.total)}</div>
              </div>
              {o.notes && <p className="mt-2 text-xs text-muted-foreground">{o.notes}</p>}
              <Button size="sm" variant="ghost" className="mt-2 text-destructive" onClick={() => remove(o.id)}>
                <Trash2 className="mr-1 h-3 w-3" /> Delete
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Customer name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label>Due / delivery date</Label><Input type="datetime-local" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} /></div>

            <div>
              <Label>Items</Label>
              <div className="mt-2 space-y-2">
                {items.map((it, i) => (
                  <div key={i} className="flex gap-2">
                    <Input className="flex-1" placeholder="Item name" value={it.name} onChange={(e) => setItems((arr) => arr.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} />
                    <Input className="w-20" type="number" placeholder="Qty" value={it.qty} onChange={(e) => setItems((arr) => arr.map((x, idx) => idx === i ? { ...x, qty: e.target.value } : x))} />
                    <Input className="w-24" type="number" placeholder="Price" value={it.price} onChange={(e) => setItems((arr) => arr.map((x, idx) => idx === i ? { ...x, price: e.target.value } : x))} />
                    <Button size="icon" variant="ghost" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="mr-1 h-3 w-3" /> Add item</Button>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create}>Save order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
