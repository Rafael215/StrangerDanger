import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Swords,
  Loader2,
  RotateCcw,
  Trophy,
  Skull,
  Heart,
  ChevronRight,
  Sparkles,
  TreePine,
} from "lucide-react";

interface Choice {
  id: string;
  text: string;
  emoji: string;
}

interface ScenarioStart {
  title: string;
  animal: string;
  setting: string;
  situation: string;
  choices: Choice[];
}

interface ScenarioResponse {
  narrative: string;
  isEnding: boolean;
  choices?: Choice[];
  outcome?: {
    survived: boolean;
    score: number;
    grade: string;
    summary: string;
    lessons: string[];
  };
}

interface HistoryEntry {
  situation: string;
  choice: string;
}

const SurvivalScenario = () => {
  const [scenario, setScenario] = useState<ScenarioStart | null>(null);
  const [currentNarrative, setCurrentNarrative] = useState<string>("");
  const [choices, setChoices] = useState<Choice[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [outcome, setOutcome] = useState<ScenarioResponse["outcome"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [step, setStep] = useState(0);

  const callAPI = async (body: object) => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survival-scenario`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(body),
      }
    );
    if (response.status === 429) { toast.error("Rate limit reached."); return null; }
    if (response.status === 402) { toast.error("AI credits exhausted."); return null; }
    if (!response.ok) throw new Error("Failed");
    return response.json();
  };

  const startScenario = async (prompt?: string) => {
    setLoading(true);
    setOutcome(null);
    setHistory([]);
    setStep(0);
    try {
      const data: ScenarioStart = await callAPI({ action: "start", scenario: prompt });
      if (!data) return;
      setScenario(data);
      setCurrentNarrative(data.situation);
      setChoices(data.choices);
    } catch {
      toast.error("Failed to start scenario.");
    } finally {
      setLoading(false);
    }
  };

  const makeChoice = async (choice: Choice) => {
    setLoading(true);
    const newHistory: HistoryEntry[] = [...history, { situation: currentNarrative, choice: choice.text }];
    setHistory(newHistory);
    setStep((s) => s + 1);

    try {
      const data: ScenarioResponse = await callAPI({
        action: "choose",
        scenario: choice.text,
        history: newHistory,
      });
      if (!data) return;
      setCurrentNarrative(data.narrative);
      if (data.isEnding && data.outcome) {
        setOutcome(data.outcome);
        setChoices([]);
      } else {
        setChoices(data.choices || []);
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setScenario(null);
    setCurrentNarrative("");
    setChoices([]);
    setHistory([]);
    setOutcome(null);
    setStep(0);
  };

  const gradeColor: Record<string, string> = {
    "A+": "text-safe",
    A: "text-safe",
    B: "text-primary",
    C: "text-caution",
    D: "text-destructive",
    F: "text-destructive",
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
            <Swords className="w-5 h-5 text-primary" />
            Survival Simulator
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Start screen */}
        {!scenario && !loading && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Swords className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Wildlife Survival Simulator</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Face realistic animal encounters and learn survival skills through interactive choose-your-adventure scenarios
              </p>
            </div>

            <div className="mb-6">
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2 block">
                Custom scenario (optional)
              </label>
              <div className="flex items-center gap-2 glass-card rounded-lg px-3 py-2">
                <Sparkles className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Encountering a grizzly bear while camping..."
                  className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none flex-1"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startScenario(customPrompt || undefined)}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base"
            >
              Start Scenario
            </motion.button>

            <div className="grid grid-cols-2 gap-3 mt-6">
              {["Bear encounter on a trail", "Snake in your campsite", "Moose blocking the path", "Mountain lion stalking"].map((s) => (
                <button
                  key={s}
                  onClick={() => startScenario(s)}
                  className="glass-card rounded-lg p-3 text-left text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-foreground font-medium">
              {scenario ? "Processing your choice..." : "Generating scenario..."}
            </p>
          </motion.div>
        )}

        {/* Active scenario */}
        {scenario && !loading && !outcome && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-6">
              <button onClick={reset} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-3 h-3" />
                Quit
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Step {step + 1}</span>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />
                  ))}
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-1">
                <TreePine className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{scenario.title}</span>
              </div>
              {step === 0 && (
                <p className="text-sm text-muted-foreground mb-3 italic">{scenario.setting}</p>
              )}
              <p className="text-foreground leading-relaxed">{currentNarrative}</p>
            </div>

            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">What do you do?</p>
            <div className="space-y-2">
              <AnimatePresence>
                {choices.map((c, i) => (
                  <motion.button
                    key={c.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => makeChoice(c)}
                    className="w-full glass-card rounded-xl p-4 text-left hover:border-primary/30 transition-all group flex items-center gap-3"
                  >
                    <span className="text-2xl">{c.emoji}</span>
                    <span className="text-sm text-foreground flex-1">{c.text}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Outcome */}
        {outcome && !loading && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className={`p-6 text-center ${outcome.survived ? "bg-safe/10" : "bg-destructive/10"}`}>
                {outcome.survived ? (
                  <Heart className="w-12 h-12 text-safe mx-auto mb-2" />
                ) : (
                  <Skull className="w-12 h-12 text-destructive mx-auto mb-2" />
                )}
                <h2 className="text-2xl font-bold text-foreground">
                  {outcome.survived ? "You Survived!" : "You Didn't Make It"}
                </h2>
                <div className="flex items-center justify-center gap-4 mt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Score</p>
                    <p className="text-2xl font-bold text-foreground">{outcome.score}/10</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Grade</p>
                    <p className={`text-2xl font-bold ${gradeColor[outcome.grade] || "text-foreground"}`}>{outcome.grade}</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <p className="text-sm text-muted-foreground mb-4">{outcome.summary}</p>

                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  Lessons Learned
                </p>
                <div className="space-y-2 mb-6">
                  {outcome.lessons.map((l, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-foreground">{l}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => startScenario()}
                    className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm"
                  >
                    New Scenario
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={reset}
                    className="py-3 px-4 rounded-lg bg-secondary text-foreground font-semibold text-sm flex items-center gap-1"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SurvivalScenario;
