import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  ScanBarcode,
  Users,
  ListOrdered,
  Bell,
  Bot,
  LogOut,
  Loader2,
  Settings,
  History,
} from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/billing", icon: ScanBarcode, label: "Billing" },
  { to: "/history", icon: History, label: "Billing History" },
  { to: "/products", icon: Package, label: "Products" },
  { to: "/customers", icon: Users, label: "Customers / Udhari" },
  { to: "/orders", icon: ListOrdered, label: "Orders" },
  { to: "/reminders", icon: Bell, label: "Reminders" },
  { to: "/assistant", icon: Bot, label: "AI Assistant" },
  { to: "/settings", icon: Settings, label: "Settings" },
] as const;

function AppLayout() {
  const { user, shop, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (!shop) navigate({ to: "/onboarding" });
  }, [loading, user, shop, navigate]);

  if (loading || !user || !shop) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="border-b border-sidebar-border p-5">
          <div className="font-display text-lg font-bold text-sidebar-foreground">
            ShopMate<span className="text-primary">.</span>
          </div>
          <div className="mt-1 truncate text-xs text-muted-foreground">{shop.name}</div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((n) => {
            const active = location.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card md:hidden">
        {NAV.slice(0, 5).map((n) => {
          const active = location.pathname.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <n.icon className="h-5 w-5" />
              {n.label.split(" ")[0]}
            </Link>
          );
        })}
      </div>

      <main className="flex-1 overflow-x-hidden pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
