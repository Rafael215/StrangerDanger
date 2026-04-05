import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  GraduationCap,
  Trees,
  Mountain,
  Waves,
  Sun,
  Snowflake,
  Palmtree,
  Shield,
  AlertTriangle,
  Skull,
  ChevronRight,
  Loader2,
  TreePine,
  MapPin,
} from "lucide-react";
import { isEndangered } from "@/components/ConservationBanner";

interface BriefingAnimal {
  name: string;
  scientificName: string;
  threatLevel: "Safe" | "Caution" | "Danger";
  likelihood: "Common" | "Occasional" | "Rare";
  description: string;
  whatToDo: string;
  conservationStatus: string;
}

interface HabitatBriefing {
  habitatName: string;
  overview: string;
  generalTips: string[];
  animals: BriefingAnimal[];
}

const habitats = [
  { id: "forest", label: "Forest", icon: Trees, description: "Temperate & tropical forests" },
  { id: "mountain", label: "Mountain", icon: Mountain, description: "Alpine & highland terrain" },
  { id: "desert", label: "Desert", icon: Sun, description: "Arid & semi-arid regions" },
  { id: "wetland", label: "Wetland", icon: Waves, description: "Swamps, marshes & rivers" },
  { id: "tundra", label: "Tundra", icon: Snowflake, description: "Arctic & subarctic zones" },
  { id: "tropical", label: "Tropical", icon: Palmtree, description: "Rainforests & jungles" },
];

const threatIcon = { Safe: Shield, Caution: AlertTriangle, Danger: Skull };
const threatClass = {
  Safe: "threat-safe ring-safe/30",
  Caution: "threat-caution ring-caution/30",
  Danger: "threat-danger ring-danger/30",
};
const likelihoodColor = {
  Common: "text-safe",
  Occasional: "text-caution",
  Rare: "text-muted-foreground",
};

const LearnBeforeYouGo = () => {
  const [selectedHabitat, setSelectedHabitat] = useState<string | null>(null);
  const [region, setRegion] = useState("");
  const [briefing, setBriefing] = useState<HabitatBriefing | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBriefing = async (habitat: string) => {
    setSelectedHabitat(habitat);
    setBriefing(null);
    setLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/habitat-briefing`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ habitat, region: region || undefined }),
        }
      );

      if (response.status === 429) {
        toast.error("Rate limit reached. Please try again in a moment.");
        setLoading(false);
        return;
      }
      if (response.status === 402) {
        toast.error("AI credits exhausted.");
        setLoading(false);
        return;
      }
      if (!response.ok) throw new Error("Failed to get briefing");

      const data = await response.json();
      setBriefing(data);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Learn Before You Go
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {!briefing && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Where are you heading?
              </h2>
              <p className="text-muted-foreground text-sm">
                Pick a habitat to get a wildlife safety briefing before your hike
              </p>
            </div>

            {/* Optional region input */}
            <div className="mb-6">
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2 block">
                Region (optional)
              </label>
              <div className="flex items-center gap-2 glass-card rounded-lg px-3 py-2">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="e.g. Pacific Northwest, Southeast Asia..."
                  className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none flex-1"
                />
              </div>
            </div>

            {/* Habitat grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {habitats.map((h, i) => (
                <motion.button
                  key={h.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => fetchBriefing(h.id)}
                  className="glass-card rounded-xl p-4 text-center hover:border-primary/30 transition-all group"
                >
                  <h.icon className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-semibold text-foreground text-sm">{h.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{h.description}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-foreground font-medium">Preparing your briefing...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Researching wildlife for this habitat
            </p>
          </motion.div>
        )}

        {/* Briefing Results */}
        {briefing && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <button
              onClick={() => { setBriefing(null); setSelectedHabitat(null); }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-3 h-3" />
              Choose different habitat
            </button>

            <div className="glass-card rounded-2xl overflow-hidden mb-6">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-1">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">
                    {briefing.habitatName}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                  {briefing.overview}
                </p>
              </div>

              <div className="h-px bg-border mx-6" />

              <div className="p-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
                  General Safety Tips
                </p>
                <div className="space-y-2">
                  {briefing.generalTips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-foreground">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
              Animals You May Encounter ({briefing.animals.length})
            </p>

            <div className="space-y-3">
              {briefing.animals.map((animal, i) => {
                const Icon = threatIcon[animal.threatLevel];
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-bold text-foreground text-sm">
                          {animal.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground italic">
                          {animal.scientificName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-semibold ${likelihoodColor[animal.likelihood]}`}>
                          {animal.likelihood}
                        </span>
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${threatClass[animal.threatLevel]}`}>
                          <Icon className="w-3 h-3" />
                          {animal.threatLevel}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mb-2">
                      {animal.description}
                    </p>

                    {isEndangered(animal.conservationStatus) && (
                      <div className="flex items-center gap-1 text-conservation text-[10px] font-semibold mb-2">
                        <TreePine className="w-3 h-3" />
                        {animal.conservationStatus}
                      </div>
                    )}

                    <div className="bg-secondary/30 rounded-lg p-2.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
                        What to do
                      </p>
                      <p className="text-xs text-foreground">{animal.whatToDo}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default LearnBeforeYouGo;
