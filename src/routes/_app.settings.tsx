import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, LogOut, Trash2, Save, Store, User as UserIcon, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, shop, signOut, refreshShop } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(shop?.name ?? "");
  const [phone, setPhone] = useState(shop?.phone ?? "");
  const [address, setAddress] = useState(shop?.address ?? "");
  const [gst, setGst] = useState(shop?.gst_number ?? "");
  const [saving, setSaving] = useState(false);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const saveShop = async () => {
    if (!shop) return;
    setSaving(true);
    const { error } = await supabase.from("shops").update({
      name, phone: phone || null, address: address || null, gst_number: gst || null,
    }).eq("id", shop.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    await refreshShop();
  };

  const updatePassword = async () => {
    if (pwd.length < 6) return toast.error("Password kam se kam 6 chars");
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) return toast.error(error.message);
    setPwd(""); toast.success("Password updated");
  };

  const deleteAccount = async () => {
    if (confirmText !== "DELETE") return toast.error('Type "DELETE" to confirm');
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("Account deleted");
      navigate({ to: "/auth" });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally { setDeleting(false); }
  };

  return (
    <PageShell>
      <PageHeader title="Settings" subtitle="Account aur shop manage karein" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section icon={UserIcon} title="Account">
          <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
          <div className="mt-3">
            <Label>Change password</Label>
            <div className="flex gap-2">
              <Input type="password" placeholder="New password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
              <Button onClick={updatePassword} disabled={!pwd}>Update</Button>
            </div>
          </div>
          <Button variant="outline" className="mt-4 w-full" onClick={() => { signOut(); navigate({ to: "/auth" }); }}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </Section>

        <Section icon={Store} title="Shop details">
          <div><Label>Shop name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="mt-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="mt-2"><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          <div className="mt-2"><Label>GST number</Label><Input value={gst} onChange={(e) => setGst(e.target.value)} /></div>
          <Button className="mt-4 w-full" onClick={saveShop} disabled={saving || !name}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save changes
          </Button>
        </Section>

        <Section icon={ShieldAlert} title="Danger zone" tone="danger">
          <p className="text-sm text-muted-foreground">Account delete karne se aapka data, shop, products, customers — sab permanently mit jayenge.</p>
          <Button variant="destructive" className="mt-4 w-full" onClick={() => setConfirm(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete account
          </Button>
        </Section>
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account delete karein?</DialogTitle>
            <DialogDescription>Yeh action permanent hai. Confirm karne ke liye neeche <b>DELETE</b> type karein.</DialogDescription>
          </DialogHeader>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteAccount} disabled={deleting || confirmText !== "DELETE"}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function Section({ icon: Icon, title, children, tone }: { icon: any; title: string; children: React.ReactNode; tone?: "danger" }) {
  return (
    <div className={`rounded-xl border bg-card p-5 shadow-[var(--shadow-soft)] ${tone === "danger" ? "border-destructive/50" : "border-border"}`}>
      <div className="mb-4 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tone === "danger" ? "text-destructive" : "text-primary"}`} />
        <h2 className="font-display font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}
