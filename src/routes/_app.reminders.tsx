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
import { Plus, Bell, Check, Trash2 } from "lucide-react";
// 24-hour formatted display so the time matches exactly what user picked in datetime-local
const fmtDate24 = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date);
};
import { toast } from "sonner";

export const Route = createFileRoute("/_app/reminders")({
  component: RemindersPage,
});

type Reminder = { id: string; title: string; body: string | null; remind_at: string; done: boolean; created_at: string };

function RemindersPage() {
  const { shop } = useAuth();
  const [items, setItems] = useState<Reminder[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", remind_at: "" });
  const alertedRef = (globalThis as any).__remAlerted ||= new Set<string>();

  const load = async () => {
    if (!shop) return;
    const { data } = await supabase.from("reminders").select("*").eq("shop_id", shop.id).order("remind_at");
    setItems((data ?? []) as Reminder[]);
  };
  useEffect(() => { load(); }, [shop]);

  // Request notification permission once
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Alarm poller — every 20s check due reminders
  useEffect(() => {
    const beep = () => {
      try {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        const ctx = new AC();
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine"; osc.frequency.value = 880; gain.gain.value = 0.15;
        osc.start();
        // 3 beeps
        let t = 0;
        const pattern = [0, 0.25, 0.5, 0.75, 1, 1.25];
        pattern.forEach((p, i) => {
          gain.gain.setValueAtTime(i % 2 === 0 ? 0.18 : 0.0001, ctx.currentTime + p);
        });
        osc.stop(ctx.currentTime + 1.5);
        t = 1500;
        setTimeout(() => ctx.close().catch(() => {}), t + 200);
      } catch {}
    };
    const tick = () => {
      const now = Date.now();
      items.forEach((r) => {
        if (r.done) return;
        const due = new Date(r.remind_at).getTime();
        if (due <= now && !alertedRef.has(r.id)) {
          alertedRef.add(r.id);
          beep();
          toast.warning(`⏰ Reminder: ${r.title}`, { description: r.body ?? "", duration: 10000 });
          if ("Notification" in window && Notification.permission === "granted") {
            try { new Notification("⏰ ShopMate Reminder", { body: r.title, tag: r.id }); } catch {}
          }
        }
      });
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, [items, alertedRef]);

  const create = async () => {
    if (!shop || !form.title || !form.remind_at) return toast.error("Title aur time zaroori hai");
    const { error } = await supabase.from("reminders").insert({
      shop_id: shop.id, title: form.title, body: form.body || null, remind_at: form.remind_at,
    });
    if (error) return toast.error(error.message);
    toast.success("Reminder set");
    setOpen(false); setForm({ title: "", body: "", remind_at: "" }); load();
  };

  const toggle = async (r: Reminder) => {
    await supabase.from("reminders").update({ done: !r.done }).eq("id", r.id);
    load();
  };
  const remove = async (id: string) => {
    await supabase.from("reminders").delete().eq("id", id); load();
  };

  return (
    <PageShell>
      <PageHeader title="Reminders" subtitle="Tasks aur followups"
        actions={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add reminder</Button>} />

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Koi reminder nahi.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => {
            const overdue = !r.done && new Date(r.remind_at) < new Date();
            return (
              <li key={r.id} className={`flex items-start gap-3 rounded-lg border p-3 ${
                r.done ? "border-border bg-muted/40 opacity-60" : overdue ? "border-destructive bg-destructive/5" : "border-border bg-card"
              }`}>
                <Button size="icon" variant={r.done ? "default" : "outline"} className="h-7 w-7 rounded-full" onClick={() => toggle(r)}>
                  {r.done && <Check className="h-3.5 w-3.5" />}
                </Button>
                <div className="flex-1">
                  <div className={`font-medium ${r.done ? "line-through" : ""}`}>{r.title}</div>
                  {r.body && <div className="text-sm text-muted-foreground">{r.body}</div>}
                  <div className="mt-1 space-y-0.5 text-xs">
                    <div className="text-muted-foreground">Set: {fmtDate24(r.created_at)}</div>
                    <div className={overdue ? "text-destructive font-semibold" : "text-foreground"}>
                      Remind: {fmtDate24(r.remind_at)} {overdue && "· OVERDUE"}
                    </div>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New reminder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <div><Label>Remind at *</Label><Input type="datetime-local" value={form.remind_at} onChange={(e) => setForm({ ...form, remind_at: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
