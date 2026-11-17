import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScanBarcode, X } from "lucide-react";
import { toast } from "sonner";

type Props = {
  onDetect: (code: string) => void;
  label?: string;
  continuous?: boolean; // keep scanning after first hit
};

export function BarcodeScanner({ onDetect, label = "Scan product", continuous = true }: Props) {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastRef = useRef<{ code: string; ts: number }>({ code: "", ts: 0 });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let stream: MediaStream | null = null;

    (async () => {
      try {
        // 1) Explicit permission request — without this, listVideoInputDevices
        // returns devices with empty labels and decodeFromVideoDevice often fails.
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        // attach preview immediately
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromStream(stream, videoRef.current!, (result) => {
          if (cancelled || !result) return;
          const code = result.getText();
          const now = Date.now();
          // de-dup: ignore same code within 1.5s
          if (lastRef.current.code === code && now - lastRef.current.ts < 1500) return;
          lastRef.current = { code, ts: now };
          onDetect(code);
          if (!continuous) {
            controls.stop();
            setOpen(false);
          }
        });
        controlsRef.current = controls;
      } catch (e: any) {
        const msg = e?.name === "NotAllowedError"
          ? "Camera permission deny ho gaya. Browser settings me allow karein."
          : e?.name === "NotFoundError"
          ? "Koi camera nahi mila."
          : e?.message ?? "Camera open nahi ho saka";
        toast.error(msg);
        setOpen(false);
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (videoRef.current) { try { videoRef.current.srcObject = null; } catch {} }
    };
  }, [open, onDetect, continuous]);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <ScanBarcode className="mr-2 h-4 w-4" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {label}
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>Product ko frame ke andar laayein — auto-detect ho jayega.</DialogDescription>
          </DialogHeader>
          <div className="relative overflow-hidden rounded-lg bg-black">
            <video ref={videoRef} className="aspect-square w-full object-cover" autoPlay muted playsInline />
            <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-primary/70 shadow-[var(--shadow-glow)]" />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {continuous ? "Multiple products bhi scan kar sakte hain — har scan list me add hoga." : "Product ko frame me lao"}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
