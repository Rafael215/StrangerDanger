import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Shield,
  AlertTriangle,
  Skull,
  ArrowLeft,
  Trash2,
  BookOpen,
  TreePine,
} from "lucide-react";
import {
  getCollection,
  removeFromCollection,
  type CollectionEntry,
} from "@/lib/collection";
import { isEndangered } from "@/components/ConservationBanner";

const threatBadge = {
  Safe: { icon: Shield, className: "threat-safe", ring: "ring-safe/30" },
  Caution: {
    icon: AlertTriangle,
    className: "threat-caution",
    ring: "ring-caution/30",
  },
  Danger: { icon: Skull, className: "threat-danger", ring: "ring-danger/30" },
};

const Pokedex = () => {
  const [entries, setEntries] = useState<CollectionEntry[]>([]);
  const [selected, setSelected] = useState<CollectionEntry | null>(null);

  useEffect(() => {
    setEntries(getCollection());
  }, []);

  const handleRemove = (id: string) => {
    removeFromCollection(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const stats = {
    total: entries.length,
    safe: entries.filter((e) => e.threatLevel === "Safe").length,
    caution: entries.filter((e) => e.threatLevel === "Caution").length,
    danger: entries.filter((e) => e.threatLevel === "Danger").length,
    endangered: entries.filter((e) => isEndangered(e.conservationStatus)).length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
            <BookOpen className="w-5 h-5 text-primary" />
            Field Guide
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-5 gap-3 mb-8"
        >
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Safe", value: stats.safe, color: "text-safe" },
            { label: "Caution", value: stats.caution, color: "text-caution" },
            { label: "Danger", value: stats.danger, color: "text-danger" },
            { label: "At Risk", value: stats.endangered, color: "text-conservation" },
          ].map((s) => (
            <div
              key={s.label}
              className="glass-card rounded-xl p-3 text-center"
            >
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {entries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No sightings yet
            </h2>
            <p className="text-muted-foreground mb-6">
              Identify your first animal to start your collection
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Start Exploring
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {entries.map((entry, i) => {
                const badge = threatBadge[entry.threatLevel];
                const BadgeIcon = badge.icon;
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelected(entry)}
                    className="glass-card rounded-xl overflow-hidden cursor-pointer hover:border-primary/30 transition-colors group"
                  >
                    {entry.imagePreview && (
                      <div className="h-32 overflow-hidden">
                        <img
                          src={entry.imagePreview}
                          alt={entry.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-bold text-foreground">
                            {entry.name}
                          </h3>
                          <p className="text-xs text-muted-foreground italic">
                            {entry.scientificName}
                          </p>
                        </div>
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ring-1 ${badge.className} ${badge.ring}`}
                        >
                          <BadgeIcon className="w-3 h-3" />
                          {entry.threatLevel}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {entry.profile}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px] text-muted-foreground/60">
                          {new Date(entry.savedAt).toLocaleDateString()}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(entry.id);
                          }}
                          className="text-muted-foreground/40 hover:text-danger transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto"
            >
              {selected.imagePreview && (
                <img
                  src={selected.imagePreview}
                  alt={selected.name}
                  className="w-full h-48 object-cover rounded-t-2xl"
                />
              )}
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {selected.name}
                    </h2>
                    <p className="text-sm text-muted-foreground italic">
                      {selected.scientificName}
                    </p>
                  </div>
                  {(() => {
                    const b = threatBadge[selected.threatLevel];
                    const I = b.icon;
                    return (
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ring-2 ${b.className} ${b.ring}`}
                      >
                        <I className="w-4 h-4" />
                        {selected.threatLevel}
                      </div>
                    );
                  })()}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selected.profile}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="px-3 py-2 rounded-lg bg-secondary/50">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Status
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {selected.conservationStatus}
                    </p>
                  </div>
                  <div className="px-3 py-2 rounded-lg bg-secondary/50">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Habitat
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {selected.habitat}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                    Survival Tips
                  </p>
                  <ul className="space-y-1.5">
                    {selected.survivalTips.map((tip, i) => (
                      <li
                        key={i}
                        className="text-sm text-foreground flex items-start gap-2"
                      >
                        <span className="text-primary mt-0.5">›</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Pokedex;
