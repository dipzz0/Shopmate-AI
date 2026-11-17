import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Camera, Loader2, X, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type IdentifiedProduct = {
  name?: string;
  category?: string;
  unit?: string;
  estimated_price?: number;
};

type Props = {
  onIdentified: (p: IdentifiedProduct) => void;
  label?: string;
  variant?: "default" | "outline" | "secondary";
};

export function PhotoCapture({ onIdentified, label = "Photo se add", variant = "outline" }: Props) {
  const [open, setOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } }, audio: false,
      });
      setStream(s);
      if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => {}); }
    } catch (e: any) {
      toast.error(e?.message ?? "Camera open nahi ho saka — file upload use karein");
    }
  };

  const stopCamera = () => { stream?.getTracks().forEach((t) => t.stop()); setStream(null); };

  const openDialog = async () => { setOpen(true); setPreview(null); await startCamera(); };
  const closeDialog = () => { stopCamera(); setOpen(false); setPreview(null); };

  const capture = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    canvas.getContext("2d")!.drawImage(v, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPreview(dataUrl);
    stopCamera();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    stopCamera();
  };

  const retake = async () => { setPreview(null); await startCamera(); };

  const identify = async () => {
    if (!preview) return;
    setIdentifying(true);
    try {
      const base64 = preview.split(",")[1];
      const mime = preview.match(/data:(.+);base64/)?.[1] ?? "image/jpeg";
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { mode: "identify_product", image_base64: base64, image_mime: mime },
      });
      if (error) throw error;
      const p: IdentifiedProduct = data?.product ?? {};
      if (!p.name) { toast.error("AI product identify nahi kar paayi — manual entry karein"); return; }
      toast.success(`AI ne pehchana: ${p.name}`);
      onIdentified(p);
      closeDialog();
    } catch (e: any) {
      toast.error(e?.message?.includes("429") ? "AI busy — thodi der baad try" : (e?.message ?? "AI error"));
    } finally { setIdentifying(false); }
  };

  return (
    <>
      <Button type="button" variant={variant} onClick={openDialog}>
        <Camera className="mr-2 h-4 w-4" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={(o) => o ? null : closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Product photo
              <Button size="icon" variant="ghost" onClick={closeDialog}><X className="h-4 w-4" /></Button>
            </DialogTitle>
            <DialogDescription>Product ka photo lein — AI naam aur details auto-fill karegi.</DialogDescription>
          </DialogHeader>

          <div className="relative overflow-hidden rounded-lg bg-black">
            {preview ? (
              <img src={preview} alt="captured" className="aspect-square w-full object-cover" />
            ) : (
              <video ref={videoRef} className="aspect-square w-full object-cover" autoPlay muted playsInline />
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {!preview ? (
              <>
                <Button onClick={capture} disabled={!stream} className="flex-1">
                  <Camera className="mr-2 h-4 w-4" /> Capture
                </Button>
                <Button variant="outline" onClick={() => fileRef.current?.click()}>Gallery</Button>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
              </>
            ) : (
              <>
                <Button onClick={identify} disabled={identifying} className="flex-1">
                  {identifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  AI se identify karein
                </Button>
                <Button variant="outline" onClick={retake}><RefreshCw className="mr-2 h-4 w-4" /> Retake</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
