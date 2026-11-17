import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Store } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const SHOP_TYPES = [
  { value: "kirana", label: "Kirana / Grocery", features: { barcode: true, udhari: true, orders: true, weight: true } },
  { value: "retail", label: "Retail / Clothing", features: { barcode: true, udhari: false, orders: true, variants: true } },
  { value: "pharmacy", label: "Pharmacy / Medical", features: { barcode: true, udhari: true, orders: true, expiry: true } },
  { value: "restaurant", label: "Restaurant / Café", features: { barcode: false, udhari: true, orders: true, kot: true } },
  { value: "electronics", label: "Electronics", features: { barcode: true, udhari: false, orders: true, warranty: true } },
  { value: "general", label: "General — Sab kuch", features: { barcode: true, udhari: true, orders: true } },
];

function Onboarding() {
  const navigate = useNavigate();
  const { user, shop, loading: authLoading, refreshShop } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    shop_type: "general",
    address: "",
    phone: "",
    gst_number: "",
  });

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
    if (!authLoading && shop) navigate({ to: "/dashboard" });
  }, [authLoading, user, shop, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const features = SHOP_TYPES.find((t) => t.value === form.shop_type)?.features ?? {};
    const { data, error } = await supabase
      .from("shops")
      .insert({
        owner_id: user.id,
        name: form.name,
        shop_type: form.shop_type,
        address: form.address || null,
        phone: form.phone || null,
        gst_number: form.gst_number || null,
        features,
      })
      .select()
      .single();
    if (error || !data) {
      setLoading(false);
      return toast.error(error?.message ?? "Could not create shop");
    }
    await supabase.from("profiles").update({ shop_id: data.id }).eq("id", user.id);
    await refreshShop();
    toast.success("Shop created! 🎉");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--gradient-soft)] px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-primary">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Setup your shop</h1>
            <p className="text-sm text-muted-foreground">Bas kuch details, baaki ShopMate sambhal lega.</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Shop name *</Label>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sharma General Store" />
          </div>

          <div className="space-y-2">
            <Label>Shop type *</Label>
            <Select value={form.shop_type} onValueChange={(v) => setForm({ ...form, shop_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SHOP_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Iske hisab se features automatic configure honge.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 …" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gst">GST Number</Label>
              <Input id="gst" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="addr">Address</Label>
            <Textarea id="addr" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create shop & continue
          </Button>
        </form>
      </div>
    </div>
  );
}
