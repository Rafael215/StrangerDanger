import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Camera, CameraOff, Loader2, ScanLine } from "lucide-react";
import { toast } from "sonner";
import type { AnimalResult } from "@/components/ResultCard";

interface LiveCameraProps {
  onResult: (result: AnimalResult, frame: string) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (v: boolean) => void;
}

export default function LiveCamera({ onResult, isAnalyzing, setIsAnalyzing }: LiveCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = ms;
        try { await videoRef.current.play(); } catch {}
      }
      setStream(ms);
      setCameraActive(true);
    } catch {
      toast.error("Camera access denied. Please allow camera permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCameraActive(false);
  }, [stream]);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const captureAndIdentify = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
    setIsAnalyzing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const frame = canvas.toDataURL("image/jpeg", 0.8);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/identify-animal`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ image: frame }),
        }
      );

      if (response.status === 429) { toast.error("Rate limit reached."); return; }
      if (response.status === 402) { toast.error("AI credits exhausted."); return; }
      if (!response.ok) throw new Error("Failed");

      const data = await response.json();
      onResult(data, frame);
    } catch {
      toast.error("Identification failed. Try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, onResult, setIsAnalyzing]);

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="hidden" />

      {!cameraActive ? (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={startCamera}
          className="w-full flex flex-col items-center justify-center gap-3 p-12 border-2 border-dashed border-border rounded-2xl bg-secondary/30 hover:border-primary/50 transition-colors"
        >
          <Camera className="w-12 h-12 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            Open Camera for Live ID
          </span>
          <span className="text-xs text-muted-foreground/60">
            Point at an animal and tap to identify
          </span>
        </motion.button>
      ) : (
        <div className="relative rounded-2xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-video object-cover"
          />

          {/* Scan overlay */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
                <p className="text-white text-sm mt-2 font-medium">Analyzing…</p>
              </div>
            </div>
          )}

          {/* Scan frame guide */}
          {!isAnalyzing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-primary/50 rounded-xl">
                <ScanLine className="w-full h-full text-primary/20 p-8" />
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
            <button
              onClick={stopCamera}
              className="w-10 h-10 rounded-full bg-destructive/80 text-white flex items-center justify-center backdrop-blur-sm"
            >
              <CameraOff className="w-5 h-5" />
            </button>
            <button
              onClick={captureAndIdentify}
              disabled={isAnalyzing}
              className="w-16 h-16 rounded-full bg-white/90 border-4 border-primary flex items-center justify-center disabled:opacity-50 backdrop-blur-sm"
            >
              <div className="w-12 h-12 rounded-full bg-primary" />
            </button>
            <div className="w-10" /> {/* spacer */}
          </div>
        </div>
      )}
    </div>
  );
}
