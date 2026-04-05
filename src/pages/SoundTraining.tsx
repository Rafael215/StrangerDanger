import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Headphones,
  Loader2,
  CheckCircle2,
  XCircle,
  SkipForward,
  Lightbulb,
  Volume2,
  Eye,
  Play,
  Pause,
} from "lucide-react";

interface SoundOption {
  id: string;
  animal: string;
  emoji: string;
}

interface SoundQuiz {
  soundDescription: string;
  audioPrompt: string;
  timeOfDay: string;
  habitat: string;
  hint: string;
  options: SoundOption[];
  correctId: string;
  correctAnimal: string;
  funFact: string;
  survivalNote: string;
  difficulty: string;
}

const difficultyColor: Record<string, string> = {
  easy: "text-safe bg-safe/10",
  medium: "text-caution bg-caution/10",
  hard: "text-destructive bg-destructive/10",
};

const SoundTraining = () => {
  const [quiz, setQuiz] = useState<SoundQuiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [difficulty, setDifficulty] = useState("medium");
  const [revealed, setRevealed] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const fetchQuiz = async () => {
    setLoading(true);
    setSelectedId(null);
    setShowHint(false);
    setRevealed(false);
    cleanupAudio();
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sound-training`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action: "generate_quiz", difficulty }),
        }
      );
      if (response.status === 429) { toast.error("Rate limit reached."); return; }
      if (response.status === 402) { toast.error("AI credits exhausted."); return; }
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      setQuiz(data);
    } catch {
      toast.error("Failed to load quiz.");
    } finally {
      setLoading(false);
    }
  };

  const cleanupAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setIsPlaying(false);
  };

  const playSound = async () => {
    if (!quiz) return;

    // If already loaded, toggle play/pause
    if (audioRef.current && audioUrlRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    setAudioLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-sfx`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ prompt: quiz.audioPrompt, duration: 5 }),
        }
      );

      if (!response.ok) throw new Error("Audio generation failed");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      audioRef.current = audio;

      await audio.play();
      setIsPlaying(true);
    } catch {
      toast.error("Failed to generate sound. Try again.");
    } finally {
      setAudioLoading(false);
    }
  };

  const handleAnswer = (id: string) => {
    if (selectedId) return;
    setSelectedId(id);
    setRevealed(true);
    const isCorrect = id === quiz?.correctId;
    setScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
  };

  const isCorrect = selectedId === quiz?.correctId;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" />
            Sound Training
          </h1>
          {score.total > 0 ? (
            <span className="text-sm font-medium text-muted-foreground">
              {score.correct}/{score.total}
            </span>
          ) : (
            <div className="w-16" />
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Start screen */}
        {!quiz && !loading && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Volume2 className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Animal Sound Training</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Listen to real AI-generated animal calls and learn to identify them — a critical wilderness skill
              </p>
            </div>

            <div className="mb-6">
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 block">
                Difficulty
              </label>
              <div className="flex gap-2">
                {["easy", "medium", "hard"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium capitalize transition-all ${
                      difficulty === d
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={fetchQuiz}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base"
            >
              Start Training
            </motion.button>
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-foreground font-medium">Generating sound quiz...</p>
          </motion.div>
        )}

        {/* Quiz card */}
        {quiz && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="glass-card rounded-2xl overflow-hidden mb-6">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${difficultyColor[quiz.difficulty] || ""}`}>
                    {quiz.difficulty}
                  </span>
                  <span className="text-xs text-muted-foreground">{quiz.timeOfDay} · {quiz.habitat}</span>
                </div>

                {/* Audio player */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={playSound}
                      disabled={audioLoading}
                      className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"
                    >
                      {audioLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6 ml-0.5" />
                      )}
                    </motion.button>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {audioLoading ? "Generating sound..." : isPlaying ? "Playing..." : "Tap to listen"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        AI-generated animal sound
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-secondary/50 rounded-xl p-5 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Volume2 className="w-5 h-5 text-primary" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Sound description</span>
                  </div>
                  <p className="text-foreground leading-relaxed text-lg italic">
                    "{quiz.soundDescription}"
                  </p>
                </div>

                {!showHint && !revealed && (
                  <button
                    onClick={() => setShowHint(true)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline mb-4"
                  >
                    <Eye className="w-3 h-3" />
                    Show hint
                  </button>
                )}

                <AnimatePresence>
                  {showHint && !revealed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4"
                    >
                      <div className="flex items-start gap-2 text-sm bg-primary/5 rounded-lg p-3">
                        <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{quiz.hint}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
                  What animal is this?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {quiz.options.map((opt) => {
                    const isSelected = selectedId === opt.id;
                    const isAnswer = opt.id === quiz.correctId;
                    let cls = "glass-card rounded-xl p-3 text-center transition-all ";
                    if (revealed) {
                      if (isAnswer) cls += "border-safe bg-safe/10 ";
                      else if (isSelected && !isAnswer) cls += "border-destructive bg-destructive/10 ";
                      else cls += "opacity-50 ";
                    } else {
                      cls += "hover:border-primary/30 cursor-pointer ";
                    }

                    return (
                      <motion.button
                        key={opt.id}
                        whileHover={!revealed ? { scale: 1.02 } : {}}
                        whileTap={!revealed ? { scale: 0.98 } : {}}
                        onClick={() => handleAnswer(opt.id)}
                        disabled={!!selectedId}
                        className={cls}
                      >
                        <span className="text-2xl mb-1 block">{opt.emoji}</span>
                        <span className="text-sm font-medium text-foreground">{opt.animal}</span>
                        {revealed && isAnswer && <CheckCircle2 className="w-4 h-4 text-safe mx-auto mt-1" />}
                        {revealed && isSelected && !isAnswer && <XCircle className="w-4 h-4 text-destructive mx-auto mt-1" />}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Revealed info */}
              <AnimatePresence>
                {revealed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                  >
                    <div className="h-px bg-border mx-6" />
                    <div className="p-6 space-y-4">
                      <div className={`text-center py-2 rounded-lg ${isCorrect ? "bg-safe/10" : "bg-destructive/10"}`}>
                        <p className={`font-bold text-sm ${isCorrect ? "text-safe" : "text-destructive"}`}>
                          {isCorrect ? "🎉 Correct!" : `❌ It was ${quiz.correctAnimal}`}
                        </p>
                      </div>

                      <div className="bg-secondary/30 rounded-lg p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Fun Fact</p>
                        <p className="text-xs text-foreground">{quiz.funFact}</p>
                      </div>

                      <div className="bg-secondary/30 rounded-lg p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Survival Note</p>
                        <p className="text-xs text-foreground">{quiz.survivalNote}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {revealed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={fetchQuiz}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
              >
                <SkipForward className="w-4 h-4" />
                Next Sound
              </motion.button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SoundTraining;
