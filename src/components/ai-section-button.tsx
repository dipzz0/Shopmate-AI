import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AISectionButton({ section, label = "AI" }: { section: string; label?: string }) {
  return (
    <Button asChild size="sm" className="bg-gradient-to-r from-primary to-[oklch(0.7_0.17_240)] text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-90">
      <Link to="/assistant" search={{ context: section } as any}>
        <Sparkles className="mr-1.5 h-4 w-4" /> {label}
      </Link>
    </Button>
  );
}
