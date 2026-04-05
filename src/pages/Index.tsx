import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import HeroSection from "@/components/HeroSection";
import ImageUploader from "@/components/ImageUploader";
import AudioUploader from "@/components/AudioUploader";
import ResultCard, { type AnimalResult } from "@/components/ResultCard";
import { motion } from "framer-motion";
import { Binoculars, BookOpen, Camera, Volume2 } from "lucide-react";

type Mode = "image" | "audio";

const Index = () => {
  const [mode, setMode] = useState<Mode>("image");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnimalResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const uploadRef = useRef<HTMLDivElement>(null);

  const scrollToUpload = () => {
    uploadRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleImageSelected = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    setResult(null);
    setImagePreview(null);

    try {
      const base64 = await fileToBase64(file);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/identify-animal`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ image: base64 }),
        }
      );

      if (response.status === 429) {
        toast.error("Rate limit reached. Please try again in a moment.");
        setIsAnalyzing(false);
        return;
      }
      if (response.status === 402) {
        toast.error("AI credits exhausted. Please add funds to continue.");
        setIsAnalyzing(false);
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to identify animal");
      }

      const data = await response.json();
      setResult(data);
      setImagePreview(base64);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleAudioSelected = useCallback(async (base64: string, mimeType: string) => {
    setIsAnalyzing(true);
    setResult(null);
    setImagePreview(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/identify-animal-sound`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ audio: base64, mimeType }),
        }
      );

      if (response.status === 429) {
        toast.error("Rate limit reached. Please try again in a moment.");
        setIsAnalyzing(false);
        return;
      }
      if (response.status === 402) {
        toast.error("AI credits exhausted. Please add funds to continue.");
        setIsAnalyzing(false);
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to identify animal sound");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Floating nav */}
      <Link
        to="/field-guide"
        className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 glass-card rounded-full text-sm font-medium text-foreground hover:text-primary transition-colors"
      >
        <BookOpen className="w-4 h-4" />
        Field Guide
      </Link>

      <HeroSection onScrollToUpload={scrollToUpload} />

      {/* Upload Section */}
      <section
        ref={uploadRef}
        className="relative py-24 px-4"
      >
        <div className="absolute inset-0 topo-pattern opacity-10" />
        <div className="relative z-10 container mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-muted-foreground text-xs font-medium uppercase tracking-wider mb-4">
              <Binoculars className="w-3.5 h-3.5" />
              Step 1
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Upload Your Sighting
            </h2>
            <p className="text-muted-foreground mt-2">
              Take a photo or record the sound of the animal you encountered
            </p>
          </motion.div>

          {/* Mode Tabs */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <button
              onClick={() => { setMode("image"); setResult(null); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                mode === "image"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Camera className="w-4 h-4" />
              Photo
            </button>
            <button
              onClick={() => { setMode("audio"); setResult(null); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                mode === "audio"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Volume2 className="w-4 h-4" />
              Sound
            </button>
          </div>

          {mode === "image" ? (
            <ImageUploader
              onImageSelected={handleImageSelected}
              isAnalyzing={isAnalyzing}
            />
          ) : (
            <AudioUploader
              onAudioSelected={handleAudioSelected}
              isAnalyzing={isAnalyzing}
            />
          )}

          {/* Results */}
          {result && (
            <div className="mt-12">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-muted-foreground text-xs font-medium uppercase tracking-wider">
                  Analysis Complete
                </div>
              </div>
              <ResultCard result={result} imagePreview={imagePreview ?? undefined} />
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground font-semibold">Stranger</span>
            <span className="text-primary font-semibold">Danger</span>
            {" "}— AI wildlife safety for the modern explorer
          </p>
        </div>
      </footer>
    </div>
  );
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default Index;
