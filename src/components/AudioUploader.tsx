import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Loader2, Mic, MicOff, Volume2 } from "lucide-react";

interface AudioUploaderProps {
  onAudioSelected: (base64: string, mimeType: string) => void;
  isAnalyzing: boolean;
}

const AudioUploader = ({ onAudioSelected, isAnalyzing }: AudioUploaderProps) => {
  const [dragOver, setDragOver] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const fileToBase64 = (file: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("audio/")) return;
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setAudioName(file.name);
      const base64 = await fileToBase64(file);
      onAudioSelected(base64, file.type);
    },
    [onAudioSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setAudioName("Recording");
        const base64 = await fileToBase64(blob);
        onAudioSelected(base64, mediaRecorder.mimeType);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      console.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const clearAudio = () => {
    setAudioUrl(null);
    setAudioName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <AnimatePresence mode="wait">
        {!audioUrl ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            {/* File drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
                dragOver
                  ? "border-primary bg-primary/10 scale-[1.02]"
                  : "border-border hover:border-primary/50 hover:bg-secondary/50"
              }`}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Volume2 className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="text-foreground font-semibold text-lg">
                    Drop an audio file here
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    or click to browse • MP3, WAV, WebM, OGG
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-muted-foreground text-xs uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Record button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl font-semibold text-sm transition-colors ${
                isRecording
                  ? "bg-danger text-danger-foreground animate-pulse"
                  : "bg-secondary hover:bg-secondary/80 text-foreground"
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-5 h-5" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  Record from Microphone
                </>
              )}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-2xl overflow-hidden glass-card p-6"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Volume2 className="w-9 h-9 text-primary" />
              </div>
              <p className="text-foreground font-medium text-sm truncate max-w-full">
                {audioName}
              </p>
              <audio controls src={audioUrl} className="w-full" />
            </div>

            {isAnalyzing && (
              <div className="absolute inset-0 bg-background/60 flex flex-col items-center justify-center gap-3 rounded-2xl">
                <div className="relative">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <Volume2 className="w-4 h-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-foreground font-medium">Analyzing sound...</p>
                <p className="text-muted-foreground text-sm">
                  Identifying species from audio
                </p>
              </div>
            )}

            {!isAnalyzing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearAudio();
                }}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
              >
                <X className="w-4 h-4 text-foreground" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AudioUploader;
