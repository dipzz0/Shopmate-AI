import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Check,
  ShieldCheck,
  Zap,
  Bot,
  Mic,
  BarChart3,
  Users,
  Bell,
  ListOrdered,
  ScanLine,
  TrendingUp,
  Sparkles,
  Star,
} from "lucide-react";
import logoImg from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "ShopMate — The AI operating system for modern retail" },
      {
        name: "description",
        content:
          "Billing, inventory, credit, orders and analytics in one intelligent workspace. Built for shopkeepers who want to grow.",
      },
      { property: "og:title", content: "ShopMate — The AI operating system for modern retail" },
      {
        property: "og:description",
        content:
          "One workspace for billing, inventory, credit, orders, and AI-powered insights. Built for modern retail.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Landing() {
  const { user, shop, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user) return;
    if (!shop) navigate({ to: "/onboarding" });
    else navigate({ to: "/dashboard" });
  }, [loading, user, shop, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <BackgroundGrid />
      <SiteHeader />
      <Hero />
      <LogoBar />
      <FeatureBento />
      <SplitFeature
        eyebrow="Billing"
        title="Bill at the speed of thought."
        body="Scan with your camera, search by name, or dictate items with voice. Every bill is GST-ready, saved instantly, and synced across your devices."
        bullets={["One-tap checkout", "Automatic tax rules", "Multi-device sync"]}
        preview={<BillingPreview />}
      />
      <SplitFeature
        reverse
        eyebrow="Intelligence"
        title="An AI that actually understands retail."
        body="Ask questions in plain English or Hindi. Get sales insights, low-stock alerts, and customer summaries — the assistant handles the busywork for you."
        bullets={["Voice + chat", "Multilingual", "Context-aware suggestions"]}
        preview={<AIPreview />}
      />
      <Testimonials />
      <Pricing />
      <CTA />
      <SiteFooter />
    </div>
  );
}

/* ---------- Structural pieces ---------- */

function BackgroundGrid() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,oklch(0.62_0.19_255/0.10),transparent)]" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(0.85 0.01 250 / 0.35) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.85 0.01 250 / 0.35) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 60% 50% at 50% 0%, black, transparent 75%)",
        }}
      />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between px-6 py-3.5">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoImg} alt="ShopMate" width={28} height={28} className="h-7 w-7" />
          <span className="font-display text-lg font-semibold tracking-tight">ShopMate</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#customers" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Customers
          </a>
          <a href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Sign in
          </Link>
          <Button asChild size="sm" className="rounded-full px-4">
            <Link to="/auth">
              Start free <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="container mx-auto grid items-center gap-14 px-6 pb-24 pt-20 lg:grid-cols-[1.05fr_1fr] lg:pt-28">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm">
          <span className="flex h-1.5 w-1.5 rounded-full bg-primary" />
          Now with voice-powered AI assistant
        </div>
        <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-foreground md:text-6xl lg:text-7xl">
          The operating system{" "}
          <span className="bg-gradient-to-r from-primary to-[oklch(0.7_0.17_240)] bg-clip-text text-transparent">
            for modern retail
          </span>
          .
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          ShopMate brings billing, inventory, credit, orders, and analytics into one intelligent
          workspace — with a multilingual AI assistant that runs alongside you.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Button asChild size="lg" className="rounded-full px-6 shadow-[var(--shadow-glow)]">
            <Link to="/auth">
              Start for free <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full px-6">
            <a href="#features">See how it works</a>
          </Button>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-success" /> Free forever plan
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Bank-grade security
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" /> Set up in 2 minutes
          </span>
        </div>
      </div>

      <ProductMockup />
    </section>
  );
}

function ProductMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-primary/15 via-transparent to-primary/10 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-30px_oklch(0.4_0.1_255/0.35)]">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/80" />
          <div className="ml-3 rounded-md bg-background/70 px-2.5 py-0.5 text-[10px] text-muted-foreground">
            shopmate.app/dashboard
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <StatCard label="Today's revenue" value="₹42,180" delta="+18.4%" icon={TrendingUp} tone="primary" />
          <StatCard label="Orders" value="126" delta="+9" icon={ListOrdered} tone="success" />
          <StatCard label="Active customers" value="284" delta="+12" icon={Users} tone="warning" />
          <StatCard label="Pending credit" value="₹8,920" delta="-4.1%" icon={BarChart3} tone="muted" />
        </div>

        <div className="border-t border-border p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-medium text-foreground">Sales this week</div>
            <div className="text-[10px] text-muted-foreground">Mon – Sun</div>
          </div>
          <MiniChart />
        </div>
      </div>

      {/* Floating cards */}
      <div className="absolute -left-4 top-24 hidden w-[220px] rounded-xl border border-border bg-card p-3 shadow-lg md:block">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Bot className="h-3.5 w-3.5" />
          </div>
          AI Assistant
        </div>
        <div className="mt-2 text-xs text-muted-foreground">"Added 50 units of Parle-G to inventory."</div>
      </div>
      <div className="absolute -right-4 bottom-16 hidden w-[210px] rounded-xl border border-border bg-card p-3 shadow-lg md:block">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-warning/15 text-warning">
            <Bell className="h-3.5 w-3.5" />
          </div>
          Reminder
        </div>
        <div className="mt-2 text-xs text-muted-foreground">Ramesh's payment due tomorrow, ₹1,240.</div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  delta: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "success" | "warning" | "muted";
}) {
  const toneMap = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/15",
    muted: "text-muted-foreground bg-muted",
  } as const;
  const deltaTone = delta.startsWith("-") ? "text-destructive" : "text-success";
  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className={`flex h-6 w-6 items-center justify-center rounded-md ${toneMap[tone]}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-2 font-display text-xl font-semibold">{value}</div>
      <div className={`mt-0.5 text-[11px] ${deltaTone}`}>{delta} vs last week</div>
    </div>
  );
}

function MiniChart() {
  const points = [22, 34, 28, 44, 38, 52, 60];
  const max = Math.max(...points);
  return (
    <div className="flex h-24 items-end gap-2">
      {points.map((p, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-md bg-gradient-to-t from-primary/30 to-primary/80"
          style={{ height: `${(p / max) * 100}%` }}
        />
      ))}
    </div>
  );
}

function LogoBar() {
  const items = ["Kirana Co.", "MediCare", "FreshMart", "TrendRetail", "StyleHub", "GrainWorks"];
  return (
    <section className="border-y border-border/60 bg-card/40">
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-4 px-6 py-8 text-sm text-muted-foreground">
        <span className="text-xs uppercase tracking-widest">Trusted by 2,000+ shops</span>
        {items.map((n) => (
          <span key={n} className="font-display text-sm font-medium text-foreground/60">
            {n}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ---------- Bento features ---------- */

function FeatureBento() {
  return (
    <section id="features" className="container mx-auto px-6 py-24">
      <SectionHeader
        eyebrow="Platform"
        title="Everything you need. Nothing you don't."
        subtitle="A cohesive toolkit that replaces spreadsheets, invoicing apps, and half a dozen sticky notes."
      />
      <div className="mt-14 grid gap-4 md:grid-cols-6">
        <BentoCard
          className="md:col-span-4"
          icon={ScanLine}
          title="Smart billing"
          desc="Scan with your camera or search — bills, tax and totals handled automatically."
        >
          <BillingPreview compact />
        </BentoCard>
        <BentoCard icon={Bot} title="AI assistant" className="md:col-span-2" desc="Voice or chat, multilingual, always in context." />
        <BentoCard icon={Users} title="Credit & udhaar" className="md:col-span-2" desc="Track dues, log payments, and remind customers automatically." />
        <BentoCard icon={BarChart3} title="Live analytics" className="md:col-span-2" desc="Real-time revenue, inventory, and customer signals." />
        <BentoCard icon={Bell} title="Reminders" className="md:col-span-2" desc="Never miss a payment, delivery or follow-up again." />
      </div>
    </section>
  );
}

function BentoCard({
  icon: Icon,
  title,
  desc,
  className = "",
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-glow)] ${className}`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

/* ---------- Split features ---------- */

function SplitFeature({
  eyebrow,
  title,
  body,
  bullets,
  preview,
  reverse = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  preview: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <section className="container mx-auto px-6 py-20">
      <div
        className={`grid items-center gap-12 lg:grid-cols-2 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}
      >
        <div>
          <div className="text-xs font-medium uppercase tracking-widest text-primary">{eyebrow}</div>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
          <p className="mt-4 max-w-lg text-muted-foreground">{body}</p>
          <ul className="mt-6 space-y-3">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm text-foreground">
                <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-3 w-3" />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div>{preview}</div>
      </div>
    </section>
  );
}

function BillingPreview({ compact = false }: { compact?: boolean }) {
  const rows = [
    { name: "Parle-G Biscuits", qty: 2, price: 20 },
    { name: "Amul Butter 100g", qty: 1, price: 62 },
    { name: "Colgate MaxFresh", qty: 1, price: 95 },
  ];
  const total = rows.reduce((s, r) => s + r.qty * r.price, 0);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background/60">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="text-xs font-medium text-foreground">New bill · #INV-00248</div>
        <div className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Live</div>
      </div>
      <div className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <div>
              <div className="text-foreground">{r.name}</div>
              {!compact && <div className="text-xs text-muted-foreground">Qty {r.qty} · ₹{r.price}</div>}
            </div>
            <div className="font-medium">₹{r.qty * r.price}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border bg-muted/50 px-4 py-3">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Total</span>
        <span className="font-display text-lg font-semibold text-primary">₹{total}</span>
      </div>
    </div>
  );
}

function AIPreview() {
  const messages = [
    { who: "user", text: "How much did we sell yesterday?" },
    { who: "ai", text: "You made ₹18,420 across 47 bills. Top item: Amul Milk (34 units)." },
    { who: "user", text: "Remind me to reorder Parle-G tomorrow." },
    { who: "ai", text: "Done — reminder set for 10:00 AM tomorrow." },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background/60">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bot className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs font-semibold">ShopMate AI</div>
          <div className="text-[10px] text-muted-foreground">Online · English / हिंदी</div>
        </div>
        <div className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Mic className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="space-y-2.5 p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.who === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                m.who === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Testimonials ---------- */

function Testimonials() {
  const items = [
    {
      quote:
        "ShopMate replaced three apps and a notebook. Billing takes seconds and I finally know where my money is.",
      name: "Ramesh Kumar",
      role: "Kirana Store · Jaipur",
    },
    {
      quote:
        "The AI assistant is uncanny. I ask it about low stock in Hindi and it just… gets it. Feels like a co-founder.",
      name: "Anita Sharma",
      role: "Pharmacy · Pune",
    },
    {
      quote:
        "Setup was two minutes. My credit dues dropped 40% in the first month thanks to automated reminders.",
      name: "Suresh Patel",
      role: "Retail Store · Ahmedabad",
    },
  ];
  return (
    <section id="customers" className="container mx-auto px-6 py-24">
      <SectionHeader
        eyebrow="Customers"
        title="Loved by shops of every shape and size."
        subtitle="From single-counter kirana stores to multi-outlet retailers."
      />
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {items.map((t) => (
          <div
            key={t.name}
            className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
          >
            <div className="flex gap-0.5 text-primary">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-current" />
              ))}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-foreground">"{t.quote}"</p>
            <div className="mt-5 border-t border-border pt-4">
              <div className="text-sm font-semibold">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.role}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Pricing ---------- */

function Pricing() {
  const tiers = [
    {
      name: "Starter",
      price: "₹0",
      cadence: "forever",
      desc: "For new shops getting started.",
      features: ["Unlimited billing", "Up to 100 products", "Basic AI assistant", "Email support"],
      cta: "Start free",
      highlight: false,
    },
    {
      name: "Growth",
      price: "₹499",
      cadence: "per month",
      desc: "For growing shops that need more.",
      features: [
        "Everything in Starter",
        "Unlimited products & customers",
        "Voice AI assistant",
        "Advanced analytics",
        "Priority support",
      ],
      cta: "Start 14-day trial",
      highlight: true,
    },
    {
      name: "Scale",
      price: "Custom",
      cadence: "for chains",
      desc: "For multi-outlet retailers.",
      features: ["Multi-store dashboard", "Custom integrations", "Dedicated success manager", "SLA"],
      cta: "Contact sales",
      highlight: false,
    },
  ];
  return (
    <section id="pricing" className="container mx-auto px-6 py-24">
      <SectionHeader
        eyebrow="Pricing"
        title="Simple pricing that grows with you."
        subtitle="Start free. Upgrade when it makes sense. Cancel anytime."
      />
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`relative rounded-2xl border p-7 transition-all ${
              t.highlight
                ? "border-primary/40 bg-card shadow-[var(--shadow-glow)]"
                : "border-border bg-card shadow-[var(--shadow-soft)]"
            }`}
          >
            {t.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-primary-foreground">
                Most popular
              </div>
            )}
            <div className="text-sm font-medium text-muted-foreground">{t.name}</div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-display text-4xl font-semibold tracking-tight">{t.price}</span>
              <span className="text-sm text-muted-foreground">{t.cadence}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
            <Button
              asChild
              className="mt-6 w-full rounded-full"
              variant={t.highlight ? "default" : "outline"}
            >
              <Link to="/auth">{t.cta}</Link>
            </Button>
            <ul className="mt-6 space-y-3 border-t border-border pt-5">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- CTA + Footer ---------- */

function CTA() {
  return (
    <section className="container mx-auto px-6 py-20">
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-12 text-center shadow-[var(--shadow-glow)] md:p-16">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Ready when you are
        </div>
        <h3 className="mt-5 font-display text-3xl font-semibold tracking-tight md:text-5xl">
          Run a smarter shop, starting today.
        </h3>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Join thousands of shopkeepers building faster, more profitable businesses with ShopMate.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="rounded-full px-6 shadow-[var(--shadow-glow)]">
            <Link to="/auth">
              Start for free <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full px-6">
            <a href="#pricing">See pricing</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row">
        <div className="flex items-center gap-2">
          <img src={logoImg} alt="ShopMate" width={20} height={20} className="h-5 w-5" />
          <span>© {new Date().getFullYear()} ShopMate. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <a href="#customers" className="hover:text-foreground">Customers</a>
          <Link to="/auth" className="hover:text-foreground">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="text-xs font-medium uppercase tracking-widest text-primary">{eyebrow}</div>
      <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
