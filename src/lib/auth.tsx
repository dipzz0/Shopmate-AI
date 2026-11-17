import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Shop = {
  id: string;
  name: string;
  shop_type: string;
  address: string | null;
  phone: string | null;
  currency: string;
  gst_number: string | null;
  features: Record<string, unknown>;
};

type Ctx = {
  session: Session | null;
  user: User | null;
  shop: Shop | null;
  loading: boolean;
  refreshShop: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  const loadShop = async (userId: string) => {
    const { data, error } = await supabase
      .from("shops")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle();
    if (error) {
      console.error("Could not load shop", error);
      setShop(null);
      return null;
    }
    setShop((data as Shop) ?? null);
    return (data as Shop) ?? null;
  };

  useEffect(() => {
    let active = true;

    const syncSession = async (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession?.user) {
        await loadShop(nextSession.user.id);
      } else {
        setShop(null);
      }
      if (active) setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setLoading(true);
        setTimeout(() => void syncSession(s), 0);
      } else {
        setShop(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(
      ({ data, error }) => {
        if (error) {
          console.error("Could not restore session", error);
          void supabase.auth.signOut({ scope: "local" });
          void syncSession(null);
          return;
        }
        void syncSession(data.session);
      },
      (error) => {
        console.error("Could not restore session", error);
        void supabase.auth.signOut({ scope: "local" });
        void syncSession(null);
      },
    );

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshShop = async () => {
    if (session?.user) await loadShop(session.user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setShop(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, shop, loading, refreshShop, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
