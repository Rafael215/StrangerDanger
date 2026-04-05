import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Shield,
  AlertTriangle,
  Skull,
  Info,
  Leaf,
  MapPin,
  Heart,
  ChevronRight,
  BookmarkPlus,
  BookmarkCheck,
} from "lucide-react";
import { saveToCollection, isInCollection } from "@/lib/collection";

export interface AnimalResult {
  name: string;
  scientificName: string;
  confidence: number;
  threatLevel: "Safe" | "Caution" | "Danger";
  profile: string;
  conservationStatus: string;
  habitat: string;
  survivalTips: string[];
  threatReason: string;
}

const threatConfig = {
  Safe: {
    icon: Shield,
    className: "threat-safe",
    ringColor: "ring-safe/30",
    label: "SAFE",
  },
  Caution: {
    icon: AlertTriangle,
    className: "threat-caution",
    ringColor: "ring-caution/30",
    label: "CAUTION",
  },
  Danger: {
    icon: Skull,
    className: "threat-danger",
    ringColor: "ring-danger/30",
    label: "DANGER",
  },
};

const ResultCard = ({
  result,
  imagePreview,
}: {
  result: AnimalResult;
  imagePreview?: string;
}) => {
  const threat = threatConfig[result.threatLevel];
  const ThreatIcon = threat.icon;
  const [saved, setSaved] = useState(() => isInCollection(result.name));

  const handleSave = () => {
    saveToCollection(result, imagePreview);
    setSaved(true);
    toast.success(`${result.name} added to your Field Guide!`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-lg mx-auto"
    >
      <div className="glass-card rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">{result.name}</h2>
              <p className="text-muted-foreground text-sm italic mt-0.5">
                {result.scientificName}
              </p>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ring-2 ${threat.className} ${threat.ringColor}`}
            >
              <ThreatIcon className="w-4 h-4" />
              {threat.label}
            </motion.div>
          </div>

          {/* Confidence bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">Confidence</span>
              <span className="text-foreground font-semibold">
                {Math.round(result.confidence * 100)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${result.confidence * 100}%` }}
                transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-primary"
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border mx-6" />

        {/* Profile */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-primary mt-1 shrink-0" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {result.profile}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
              <Leaf className="w-4 h-4 text-accent" />
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Status</p>
                <p className="text-sm font-medium text-foreground">{result.conservationStatus}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
              <MapPin className="w-4 h-4 text-accent" />
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Habitat</p>
                <p className="text-sm font-medium text-foreground">{result.habitat}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border mx-6" />

        {/* Threat reason */}
        <div className="px-6 py-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
            <Heart className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                Why this rating?
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {result.threatReason}
              </p>
            </div>
          </div>
        </div>

        {/* Save + Survival Tips */}
        <div className="px-6 pb-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saved}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm mb-5 transition-colors ${
              saved
                ? "bg-safe/20 text-safe cursor-default"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {saved ? (
              <>
                <BookmarkCheck className="w-4 h-4" />
                Saved to Field Guide
              </>
            ) : (
              <>
                <BookmarkPlus className="w-4 h-4" />
                Save to Field Guide
              </>
            )}
          </motion.button>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
            Survival Tips
          </p>
          <div className="space-y-2">
            {result.survivalTips.map((tip, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-start gap-2 text-sm"
              >
                <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span className="text-foreground">{tip}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ResultCard;
