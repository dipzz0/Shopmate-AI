import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Bot, Send, Mic, MicOff, Loader2, User as UserIcon, Square, History, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/assistant")({
  validateSearch: (s: Record<string, unknown>) => ({ context: (s.context as string) || "" }),
  component: AssistantPage,
});

type Msg = { role: "user" | "assistant"; content: string };
type Session = { id: string; createdAt: number; updatedAt: number; messages: Msg[] };

const STORAGE_KEY = "shopmate_ai_sessions_v1";
const ACTIVE_KEY = "shopmate_ai_active_v1";

function loadSessions(): Session[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveSessions(s: Session[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

const WELCOME: Msg = { role: "assistant", content: "Namaste! Main aapki ShopMate AI assistant hoon 🌸 — likhke ya bolke kuch bhi karwa lo: product add, udhari, sales, reminder. Likho to likhke jawab dungi, bolo to bolke jawab dungi." };

function newSession(): Session {
  const id = (globalThis.crypto?.randomUUID?.() ?? `s_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  return { id, createdAt: Date.now(), updatedAt: Date.now(), messages: [WELCOME] };
}

function detectLocale(text: string): string {
  if (/[\u0900-\u097F]/.test(text)) return "hi-IN";
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta-IN";
  if (/[\u0980-\u09FF]/.test(text)) return "bn-IN";
  if (/[\u0A80-\u0AFF]/.test(text)) return "gu-IN";
  if (/[\u0C00-\u0C7F]/.test(text)) return "te-IN";
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn-IN";
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml-IN";
  if (/[\u0A00-\u0A7F]/.test(text)) return "pa-IN";
  return "en-IN";
}

const INDIAN_FEMALE_PRIORITY = ["neerja", "swara", "kalpana", "heera", "aarohi", "lekha", "veena"];
const FEMALE_HINTS = [...INDIAN_FEMALE_PRIORITY, "female", "woman", "girl", "natural", "neural", "zira", "aria", "jenny", "sonia", "samantha"];
const MALE_HINTS = ["male", "man", "david", "mark", "george", "daniel", "alex", "fred", "ravi", "hemant"];

function pickFemaleVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return undefined;
  const lower = (s: string) => s.toLowerCase();
  const indianPool = voices.filter((v) => /-IN$/i.test(v.lang) || /^hi/i.test(v.lang));
  for (const hint of INDIAN_FEMALE_PRIORITY) {
    const m = indianPool.find((v) => lower(v.name).includes(hint));
    if (m) return m;
  }
  const base = lang.split("-")[0];
  const inLang = voices.filter((v) => v.lang === lang || v.lang.startsWith(base));
  const pool = inLang.length ? inLang : voices;
  const female = pool.find((v) => FEMALE_HINTS.some((h) => lower(v.name).includes(lower(h))));
  if (female) return female;
  return pool.find((v) => !MALE_HINTS.some((m) => lower(v.name).includes(m))) ?? pool[0];
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const detected = detectLocale(text);
  const lang = detected === "en-IN" || /[\u0900-\u097F]/.test(text) ? "hi-IN" : detected;
  u.lang = lang;
  const voice = pickFemaleVoice(lang);
  if (voice) u.voice = voice;
  u.rate = 0.95; u.pitch = 1.1; u.volume = 1;
  speechSynthesis.speak(u);
}

const fmtSessionDate = (ts: number) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(new Date(ts));

function AssistantPage() {
  const { shop } = useAuth();
  const { context: sectionContext } = Route.useSearch();
  const [sessions, setSessions] = useState<Session[]>(() => {
    const s = loadSessions();
    return s.length ? s : [newSession()];
  });
  const [activeId, setActiveId] = useState<string>(() => {
    const stored = localStorage.getItem(ACTIVE_KEY);
    const all = loadSessions();
    if (stored && all.some((s) => s.id === stored)) return stored;
    return (all[0]?.id) ?? sessions[0].id;
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const recogRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userLocaleRef = useRef<string>("hi-IN");

  const active = sessions.find((s) => s.id === activeId) ?? sessions[0];
  const messages = active?.messages ?? [WELCOME];

  // Persist sessions + active id
  useEffect(() => { saveSessions(sessions); }, [sessions]);
  useEffect(() => { localStorage.setItem(ACTIVE_KEY, activeId); }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if ("speechSynthesis" in window) speechSynthesis.getVoices();
  }, []);

  const updateActive = (mut: (s: Session) => Session) => {
    setSessions((arr) => arr.map((s) => (s.id === activeId ? mut(s) : s)));
  };

  const send = async (text: string, viaVoice: boolean) => {
    if (!text.trim()) return;
    if (!shop) { toast.error("Pehle shop setup karein."); return; }
    userLocaleRef.current = detectLocale(text);
    const userMsg: Msg = { role: "user", content: text };
    const baseMessages = [...messages, userMsg];
    updateActive((s) => ({ ...s, messages: baseMessages, updatedAt: Date.now() }));
    setInput(""); setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { messages: baseMessages, shopId: shop.id, context: sectionContext || undefined },
      });
      const status = (error as any)?.context?.status ?? (error as any)?.status;
      if (status === 429 || data?.error?.toLowerCase?.().includes("rate")) {
        const msg = "Bahut zyada requests — thodi der baad try karein.";
        toast.error(msg);
        updateActive((s) => ({ ...s, messages: [...baseMessages, { role: "assistant", content: msg }], updatedAt: Date.now() }));
        return;
      }
      if (status === 402 || data?.error?.toLowerCase?.().includes("credit")) {
        const msg = "AI credits khatam ho gaye. Workspace settings me credits add karein.";
        toast.error(msg);
        updateActive((s) => ({ ...s, messages: [...baseMessages, { role: "assistant", content: msg }], updatedAt: Date.now() }));
        return;
      }
      if (error) throw error;
      const reply = data?.reply ?? "Sorry, samajh nahi aayi.";
      updateActive((s) => ({ ...s, messages: [...baseMessages, { role: "assistant", content: reply }], updatedAt: Date.now() }));
      // Voice reply ONLY if user spoke via voice
      if (viaVoice) speak(reply);
    } catch (e: any) {
      const msg = e?.message?.includes("429")
        ? "Bahut zyada requests — thodi der baad try karein."
        : (e?.message ?? "AI error");
      toast.error(msg);
      updateActive((s) => ({ ...s, messages: [...baseMessages, { role: "assistant", content: msg }], updatedAt: Date.now() }));
    } finally { setLoading(false); }
  };

  const toggleMic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return toast.error("Voice support nahi hai is browser me");
    if (listening) { recogRef.current?.stop(); return; }
    const r = new SR();
    r.lang = userLocaleRef.current || "hi-IN";
    r.interimResults = false; r.continuous = false;
    r.onstart = () => setListening(true);
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.onresult = (e: any) => {
      const txt = e.results[0][0].transcript;
      send(txt, true);
    };
    recogRef.current = r;
    r.start();
  };

  const stopSpeaking = () => { if ("speechSynthesis" in window) speechSynthesis.cancel(); };

  const startNewChat = () => {
    const s = newSession();
    setSessions((arr) => [s, ...arr]);
    setActiveId(s.id);
    stopSpeaking();
  };

  const clearActive = () => {
    updateActive((s) => ({ ...s, messages: [WELCOME], updatedAt: Date.now() }));
    stopSpeaking();
    toast.success("Chat clear ho gayi");
  };

  const deleteSession = (id: string) => {
    setSessions((arr) => {
      const next = arr.filter((s) => s.id !== id);
      if (next.length === 0) {
        const ns = newSession();
        setActiveId(ns.id);
        return [ns];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
    toast.success("Chat delete ho gayi");
  };

  const deleteAllSessions = () => {
    const ns = newSession();
    setSessions([ns]);
    setActiveId(ns.id);
    toast.success("Saari history delete ho gayi");
  };

  const openSession = (id: string) => {
    setActiveId(id);
    setHistoryOpen(false);
    stopSpeaking();
  };

  const suggestions = [
    "Aaj ki total sales kitni hui?",
    "Parle-G ₹10 add karo, stock 50 pcs",
    "Ramesh ka ₹500 payment record karo",
    "Low stock products dikhao",
  ];

  const sortedHistory = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <PageShell>
      <PageHeader
        title="AI Assistant"
        subtitle="Likho to likhke jawab, bolo to bolke jawab — kisi bhi language me."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={startNewChat}>
              <Plus className="mr-1.5 h-4 w-4" /> New chat
            </Button>
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
              <History className="mr-1.5 h-4 w-4" /> History
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="mr-1.5 h-4 w-4" /> Clear chat
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Is chat ko clear karein?</AlertDialogTitle>
                  <AlertDialogDescription>Sirf current chat clear hogi. History me se delete nahi hogi.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearActive}>Clear</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />

      <div className="relative flex h-[72vh] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-[oklch(0.7_0.17_240)] to-primary" />

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-gradient-to-br from-primary to-[oklch(0.7_0.17_240)] text-primary-foreground shadow-[var(--shadow-glow)]"
              }`}>
                {m.role === "user" ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background text-foreground"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.7_0.17_240)] text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl border border-border bg-background px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                </div>
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(input, false); }}
          className="flex items-center gap-2 border-t border-border bg-card/80 p-3 backdrop-blur"
        >
          <Button
            type="button" size="icon"
            variant={listening ? "destructive" : "outline"}
            onClick={toggleMic}
            className={listening ? "animate-pulse" : ""}
            title="Voice input — voice se baat karein, jawab bhi voice me"
          >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={stopSpeaking} title="Stop speaking">
            <Square className="h-4 w-4" />
          </Button>
          <Input
            placeholder={listening ? "🎤 Sun rahi hoon…" : "Likhein (text reply) ya mic dabaayein (voice reply)…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {suggestions.map((q) => (
          <button
            key={q}
            onClick={() => send(q, false)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary hover:shadow-sm"
          >
            {q}
          </button>
        ))}
      </div>

      {/* History dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span>Chat history</span>
              {sortedHistory.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="mr-1.5 h-4 w-4" /> Delete all
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Saari chat history delete?</AlertDialogTitle>
                      <AlertDialogDescription>Ye action permanent hai — wapas nahi aayegi.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={deleteAllSessions}>Delete all</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {sortedHistory.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Koi chat nahi.</p>
            )}
            {sortedHistory.map((s) => {
              const firstUser = s.messages.find((m) => m.role === "user");
              const preview = firstUser?.content ?? "(khaali chat)";
              const isActive = s.id === activeId;
              return (
                <div
                  key={s.id}
                  className={`group flex items-start gap-2 rounded-lg border p-3 transition ${
                    isActive ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <button onClick={() => openSession(s.id)} className="flex-1 text-left">
                    <div className="line-clamp-2 text-sm font-medium">{preview}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {fmtSessionDate(s.updatedAt)} · {s.messages.filter((m) => m.role === "user").length} msgs
                    </div>
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Is chat ko delete karein?</AlertDialogTitle>
                        <AlertDialogDescription>Permanently delete ho jaayegi.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteSession(s.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
