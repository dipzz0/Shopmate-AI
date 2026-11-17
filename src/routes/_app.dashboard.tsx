import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/page-shell";
import { inr } from "@/lib/format";
import { Package, Users, Wallet, ListOrdered, TrendingUp, Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { AISectionButton } from "@/components/ai-section-button";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

type Stats = {
  productCount: number;
  customerCount: number;
  todaySales: number;
  todayCount: number;
  totalUdhari: number;
  pendingOrders: number;
  pendingReminders: number;
};

function Dashboard() {
  const { shop } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!shop) return;
    (async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();
      const [pc, cc, ts, ud, po, pr] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
        supabase.from("sales").select("total").eq("shop_id", shop.id).gte("created_at", todayIso),
        supabase.from("customers").select("credit_balance").eq("shop_id", shop.id),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("shop_id", shop.id).in("status", ["pending", "preparing", "ready"]),
        supabase.from("reminders").select("id", { count: "exact", head: true }).eq("shop_id", shop.id).eq("done", false),
      ]);
      const sales = (ts.data ?? []) as { total: number }[];
      const totalUdhari = ((ud.data ?? []) as { credit_balance: number }[])
        .reduce((s, c) => s + Math.max(0, Number(c.credit_balance) || 0), 0);
      setStats({
        productCount: pc.count ?? 0,
        customerCount: cc.count ?? 0,
        todaySales: sales.reduce((s, x) => s + Number(x.total), 0),
        todayCount: sales.length,
        totalUdhari,
        pendingOrders: po.count ?? 0,
        pendingReminders: pr.count ?? 0,
      });
    })();
  }, [shop]);

  const cards = [
    { to: "/sales", label: "Aaj ki sales", value: stats ? inr(stats.todaySales) : "—", sub: stats ? `${stats.todayCount} bills · graph & history` : "Graph & history", icon: TrendingUp, color: "text-primary" },
    { to: "/customers", label: "Total Udhari", value: stats ? inr(stats.totalUdhari) : "—", sub: "Customers ka due", icon: Wallet, color: "text-warning" },
    { to: "/products", label: "Products", value: stats?.productCount ?? "—", sub: "Inventory me", icon: Package, color: "text-success" },
    { to: "/customers", label: "Customers", value: stats?.customerCount ?? "—", sub: "Total saved", icon: Users, color: "text-primary" },
    { to: "/orders", label: "Pending Orders", value: stats?.pendingOrders ?? "—", sub: "Active", icon: ListOrdered, color: "text-warning" },
    { to: "/reminders", label: "Reminders", value: stats?.pendingReminders ?? "—", sub: "Due", icon: Bell, color: "text-destructive" },
  ] as const;

  return (
    <PageShell>
      <PageHeader
        title={`Hello 👋  ${shop?.name ?? ""}`}
        subtitle="Aapki shop ka aaj ka snapshot"
        actions={<AISectionButton section="dashboard" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label + c.to}
            to={c.to}
            className="group rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-[var(--shadow-glow)] hover:bg-gradient-to-br hover:from-card hover:to-primary/5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground group-hover:text-primary">{c.label}</span>
              <c.icon className={`h-4 w-4 ${c.color} transition-transform group-hover:scale-110`} />
            </div>
            <div className="mt-3 font-display text-3xl font-bold text-foreground">{c.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{c.sub}</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <QuickAction to="/billing" title="Naya bill banayein" desc="Scan ya search se" />
        <QuickAction to="/customers" title="Udhari note karein" desc="Customer ka due add" />
        <QuickAction to="/assistant" title="AI se baat karein" desc="Voice ya chat" />
      </div>
    </PageShell>
  );
}

function QuickAction({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-[var(--shadow-glow)]"
    >
      <div className="font-display text-base font-semibold text-foreground group-hover:text-primary">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
    </Link>
  );
}
