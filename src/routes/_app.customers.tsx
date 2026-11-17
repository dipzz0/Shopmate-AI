import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Users, Wallet, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { inr, fmtDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/customers")({
  component: CustomersPage,
});

type Customer = {
  id: string; name: string; phone: string | null; address: string | null;
  credit_balance: number; notes: string | null;
};

type Payment = {
  id: string; amount: number; type: string; method: string | null;
  notes: string | null; created_at: string;
};

function CustomersPage() {
  const { shop } = useAuth();
  const [items, setItems] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });
  const [selected, setSelected] = useState<Customer | null>(null);
  const [history, setHistory] = useState<Payment[]>([]);
  const [payAmt, setPayAmt] = useState("");
  const [creditAmt, setCreditAmt] = useState("");

  const load = async () => {
    if (!shop) return;
    const { data } = await supabase.from("customers").select("*").eq("shop_id", shop.id).order("name");
    setItems((data ?? []) as Customer[]);
  };
  useEffect(() => { load(); }, [shop]);

  const openNew = () => {
    setEditing(null); setForm({ name: "", phone: "", address: "", notes: "" }); setOpen(true);
  };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone ?? "", address: c.address ?? "", notes: c.notes ?? "" });
    setOpen(true);
  };

  const save = async () => {
    if (!shop || !form.name) return toast.error("Name zaroori hai");
    const payload = {
      name: form.name,
      phone: form.phone || null,
      address: form.address || null,
      notes: form.notes || null,
    };
    const { error } = editing
      ? await supabase.from("customers").update(payload).eq("id", editing.id)
      : await supabase.from("customers").insert({ shop_id: shop.id, ...payload });
    if (error) return toast.error(error.message);
    setOpen(false); setEditing(null);
    toast.success(editing ? "Updated" : "Customer added"); load();
  };

  const removeCustomer = async (c: Customer) => {
    if (!confirm(`Delete ${c.name}?`)) return;
    await supabase.from("payments").delete().eq("customer_id", c.id);
    const { error } = await supabase.from("customers").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  const openCustomer = async (c: Customer) => {
    setSelected(c);
    const { data } = await supabase.from("payments").select("*").eq("customer_id", c.id).order("created_at", { ascending: false });
    setHistory((data ?? []) as Payment[]);
  };

  const recordPayment = async (kind: "payment" | "credit") => {
    if (!shop || !selected) return;
    const amt = parseFloat(kind === "payment" ? payAmt : creditAmt);
    if (!amt || amt <= 0) return toast.error("Valid amount daalein");
    const { error } = await supabase.from("payments").insert({
      shop_id: shop.id, customer_id: selected.id,
      amount: kind === "payment" ? amt : -amt,
      type: kind, method: "cash",
      notes: kind === "payment" ? "Payment received" : "New udhari",
    });
    if (error) return toast.error(error.message);
    setPayAmt(""); setCreditAmt("");
    toast.success("Saved");
    const { data: c } = await supabase.from("customers").select("*").eq("id", selected.id).single();
    if (c) setSelected(c as Customer);
    openCustomer(c as Customer); load();
  };

  const sendReminder = (c: Customer) => {
    const due = Number(c.credit_balance);
    if (due <= 0) return toast.info("Koi udhari pending nahi");
    const msg = `Namaste ${c.name}, aapka ${shop?.name} se ${inr(due)} ka udhari pending hai. Kripya jald payment karein. Dhanyavaad!`;
    if (c.phone) {
      const phone = c.phone.replace(/\D/g, "");
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    } else {
      navigator.clipboard.writeText(msg);
      toast.success("Message copy ho gaya");
    }
  };

  return (
    <PageShell>
      <PageHeader title="Customers & Udhari" subtitle="Customer-wise dues track karein"
        actions={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Add customer</Button>} />

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Koi customer nahi.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => {
            const due = Number(c.credit_balance);
            return (
              <div key={c.id} className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.phone ?? "no phone"}</div>
                  </div>
                  <div className={`text-right ${due > 0 ? "text-destructive" : "text-success"}`}>
                    <div className="text-xs">Balance</div>
                    <div className="font-display font-bold">{inr(due)}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openCustomer(c)}>
                    <Wallet className="mr-1 h-3.5 w-3.5" /> Manage
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)} title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeCustomer(c)} title="Delete">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                  {due > 0 && (
                    <Button size="sm" variant="secondary" onClick={() => sendReminder(c)}>
                      <MessageCircle className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit customer" : "Add customer"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>{editing ? "Update" : "Add"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-center">
                <div className="text-xs text-muted-foreground">Current udhari</div>
                <div className="font-display text-3xl font-bold text-destructive">{inr(selected.credit_balance)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <Label className="text-xs">Receive payment</Label>
                  <Input type="number" placeholder="Amount" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} />
                  <Button size="sm" className="w-full" onClick={() => recordPayment("payment")}>Add payment</Button>
                </div>
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <Label className="text-xs">Add new udhari</Label>
                  <Input type="number" placeholder="Amount" value={creditAmt} onChange={(e) => setCreditAmt(e.target.value)} />
                  <Button size="sm" variant="secondary" className="w-full" onClick={() => recordPayment("credit")}>Add credit</Button>
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">History</div>
                <div className="max-h-60 space-y-1 overflow-y-auto">
                  {history.length === 0 && <p className="text-sm text-muted-foreground">No transactions yet.</p>}
                  {history.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded border border-border p-2 text-sm">
                      <div>
                        <div className="font-medium">{p.notes ?? p.type}</div>
                        <div className="text-xs text-muted-foreground">{fmtDate(p.created_at)}</div>
                      </div>
                      <div className={Number(p.amount) > 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                        {Number(p.amount) > 0 ? "+" : ""}{inr(p.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {Number(selected.credit_balance) > 0 && (
                <Button variant="outline" className="w-full" onClick={() => sendReminder(selected)}>
                  <MessageCircle className="mr-2 h-4 w-4" /> Send WhatsApp reminder
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
