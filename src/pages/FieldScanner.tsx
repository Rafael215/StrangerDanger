import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { saveToPlantCollection, isPlantInCollection } from "@/lib/collection";
import {
  ArrowLeft,
  BookmarkPlus,
  BookmarkCheck,
  ScanLine,
  Camera,
  CameraOff,
  Loader2,
  Upload,
  ChevronRight,
  AlertTriangle,
  Shield,
  Skull,
  Leaf,
  Droplets,
  Mountain,
  Bug,
  Footprints,
  Home,
  Eye,
} from "lucide-react";

interface ScanLabel {
  name: string;
  category: "animal" | "plant" | "terrain" | "water" | "hazard" | "track" | "shelter" | "sign";
  detail: string;
  position: string;
  threatLevel: "safe" | "caution" | "danger" | "neutral";
}

interface ScanResult {
  environmentType: string;
  overallAssessment: string;
  labels: ScanLabel[];
  tips: string[];
}

const categoryIcon: Record<string, typeof Bug> = {
  animal: Bug,
  plant: Leaf,
  terrain: Mountain,
  water: Droplets,
  hazard: AlertTriangle,
  track: Footprints,
  shelter: Home,
  sign: Eye,
};

const threatBorder: Record<string, string> = {
  safe: "border-safe/50 bg-safe/10",
  caution: "border-caution/50 bg-caution/10",
  danger: "border-destructive/50 bg-destructive/10",
  neutral: "border-border bg-secondary/50",
};

const FieldScanner = () => {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scanImage = async (base64: string) => {
    setLoading(true);
    setScanResult(null);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/field-scan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ image: base64 }),
        }
      );
      if (response.status === 429) { toast.error("Rate limit reached."); return; }
      if (response.status === 402) { toast.error("AI credits exhausted."); return; }
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      setScanResult(data);
    } catch {
      toast.error("Scan failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      scanImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = useCallback(async () => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(ms);
      setCameraActive(true);
    } catch {
      toast.error("Camera access denied.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCameraActive(false);
  }, [stream]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, cameraActive]);

  useEffect(() => {
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, [stream]);

  const captureAndScan = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const frame = canvas.toDataURL("image/jpeg", 0.8);
    setImagePreview(frame);
    scanImage(frame);
  }, []);

  const reset = () => {
    setScanResult(null);
    setImagePreview(null);
    stopCamera();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary" />
            Field Scanner
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <canvas ref={canvasRef} className="hidden" />

        {/* Start screen */}
        {!scanResult && !loading && !cameraActive && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <ScanLine className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">AR Field Scanner</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Point your camera at any natural environment to get AI-powered labels identifying plants, animals, terrain, and hazards
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startCamera}
                className="glass-card rounded-xl p-6 text-center hover:border-primary/30 transition-all"
              >
                <Camera className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-semibold text-foreground text-sm">Live Camera</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Scan in real-time</p>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => fileInputRef.current?.click()}
                className="glass-card rounded-xl p-6 text-center hover:border-primary/30 transition-all"
              >
                <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-semibold text-foreground text-sm">Upload Photo</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Scan from gallery</p>
              </motion.button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </motion.div>
        )}

        {/* Camera view */}
        {cameraActive && !scanResult && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="relative rounded-2xl overflow-hidden bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video object-cover" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-48 border-2 border-primary/40 rounded-xl">
                  <ScanLine className="w-full h-full text-primary/15 p-8" />
                </div>
              </div>
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
                <button onClick={stopCamera} className="w-10 h-10 rounded-full bg-destructive/80 text-white flex items-center justify-center backdrop-blur-sm">
                  <CameraOff className="w-5 h-5" />
                </button>
                <button onClick={captureAndScan} className="w-16 h-16 rounded-full bg-white/90 border-4 border-primary flex items-center justify-center backdrop-blur-sm">
                  <ScanLine className="w-8 h-8 text-primary" />
                </button>
                <div className="w-10" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {imagePreview && (
              <div className="relative rounded-2xl overflow-hidden mb-6">
                <img src={imagePreview} alt="Scanning" className="w-full aspect-video object-cover" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-2" />
                    <p className="text-white font-medium text-sm">Scanning environment...</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Scan results */}
        {scanResult && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={reset} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
              <ArrowLeft className="w-3 h-3" /> New Scan
            </button>

            {/* Image with label overlays */}
            {imagePreview && (
              <div className="relative rounded-2xl overflow-hidden mb-6">
                <img src={imagePreview} alt="Scanned" className="w-full aspect-video object-cover" />
                {/* Simple label dots */}
                {scanResult.labels.map((label, i) => {
                  const pos = positionToCSS(label.position);
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className="absolute"
                      style={pos}
                    >
                      <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold backdrop-blur-md border ${threatBorder[label.threatLevel]} whitespace-nowrap`}>
                        <span className="text-foreground">{label.name}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Assessment */}
            <div className="glass-card rounded-2xl p-6 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <ScanLine className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">{scanResult.environmentType}</span>
              </div>
              <p className="text-sm text-muted-foreground">{scanResult.overallAssessment}</p>
            </div>

            {/* Labels list */}
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
              Identified Elements ({scanResult.labels.length})
            </p>
            <div className="space-y-2 mb-6">
              {scanResult.labels.map((label, i) => {
                const Icon = categoryIcon[label.category] || Eye;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`glass-card rounded-xl p-3 border-l-4 ${
                      label.threatLevel === "danger" ? "border-l-destructive" :
                      label.threatLevel === "caution" ? "border-l-caution" :
                      label.threatLevel === "safe" ? "border-l-safe" : "border-l-border"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{label.name}</span>
                          <span className="text-[9px] text-muted-foreground uppercase bg-secondary px-1.5 py-0.5 rounded">{label.category}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{label.detail}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Tips */}
            <div className="glass-card rounded-2xl p-6">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Field Tips</p>
              <div className="space-y-2">
                {scanResult.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

function positionToCSS(position: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    "top-left": { top: "8%", left: "8%" },
    "top-center": { top: "8%", left: "50%", transform: "translateX(-50%)" },
    "top-right": { top: "8%", right: "8%" },
    "center-left": { top: "45%", left: "5%" },
    "center": { top: "45%", left: "50%", transform: "translateX(-50%)" },
    "center-right": { top: "45%", right: "5%" },
    "bottom-left": { bottom: "12%", left: "8%" },
    "bottom-center": { bottom: "12%", left: "50%", transform: "translateX(-50%)" },
    "bottom-right": { bottom: "12%", right: "8%" },
  };
  return map[position] || map["center"];
}

export default FieldScanner;
