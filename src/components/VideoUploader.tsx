import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Video, Upload, Loader2, X } from "lucide-react";

interface VideoUploaderProps {
  onVideoProcessed: (frame: string, audio: string | null, mimeType: string) => void;
  isAnalyzing: boolean;
}

const VideoUploader = ({ onVideoProcessed, isAnalyzing }: VideoUploaderProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const extractFrameAndAudio = useCallback(async (file: File) => {
    setProcessing(true);
    setFileName(file.name);

    try {
      // Extract a frame from the middle of the video
      const videoUrl = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.src = videoUrl;
      video.muted = true;
      video.preload = "auto";

      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error("Failed to load video"));
      });

      // Seek to 1 second or 25% of duration
      const seekTime = Math.min(1, video.duration * 0.25);
      video.currentTime = seekTime;

      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });

      // Capture frame
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0);
      const frameBase64 = canvas.toDataURL("image/jpeg", 0.8);
      setPreview(frameBase64);

      // Extract audio as base64
      let audioBase64: string | null = null;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );
        const mimeType = file.type || "video/mp4";
        audioBase64 = `data:${mimeType};base64,${base64}`;
      } catch {
        console.warn("Could not extract audio");
      }

      URL.revokeObjectURL(videoUrl);
      onVideoProcessed(frameBase64, audioBase64, file.type || "video/mp4");
    } catch (err) {
      console.error("Video processing error:", err);
    } finally {
      setProcessing(false);
    }
  }, [onVideoProcessed]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("video/")) return;
    if (file.size > 50 * 1024 * 1024) {
      alert("Video must be under 50MB");
      return;
    }
    extractFrameAndAudio(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const clear = () => {
    setPreview(null);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const busy = processing || isAnalyzing;

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {!preview ? (
        <motion.div
          whileHover={{ scale: 1.01 }}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="glass-card rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/30 transition-all min-h-[200px]"
        >
          {processing ? (
            <>
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Processing video...</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                <Video className="w-7 h-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-foreground font-medium">
                  Upload a video
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  MP4, MOV, WebM — max 50MB
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-sm text-muted-foreground">
                <Upload className="w-4 h-4" />
                Choose file or drag & drop
              </div>
            </>
          )}
        </motion.div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="relative">
            <img
              src={preview}
              alt="Video frame"
              className="w-full h-48 object-cover"
            />
            {busy && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            )}
            {!busy && (
              <button
                onClick={clear}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="p-4">
            <p className="text-sm text-muted-foreground truncate">
              {fileName}
            </p>
            {isAnalyzing && (
              <p className="text-xs text-primary mt-1 animate-pulse">
                Analyzing video frame & audio...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
