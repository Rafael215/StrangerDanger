import { motion } from "framer-motion";
import { TreePine, AlertTriangle } from "lucide-react";

const endangeredStatuses = [
  "critically endangered",
  "endangered",
  "vulnerable",
  "near threatened",
];

export function isEndangered(status: string): boolean {
  return endangeredStatuses.includes(status.toLowerCase());
}

export function getConservationSeverity(status: string): "critical" | "warning" | null {
  const lower = status.toLowerCase();
  if (lower === "critically endangered" || lower === "endangered") return "critical";
  if (lower === "vulnerable" || lower === "near threatened") return "warning";
  return null;
}

const ConservationBanner = ({ status }: { status: string }) => {
  const severity = getConservationSeverity(status);
  if (!severity) return null;

  const isCritical = severity === "critical";

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ delay: 0.6, duration: 0.4 }}
      className={`mx-6 mb-4 p-3 rounded-lg border ${
        isCritical
          ? "bg-danger/10 border-danger/20"
          : "bg-conservation/10 border-conservation/20"
      }`}
    >
      <div className="flex items-start gap-2.5">
        {isCritical ? (
          <AlertTriangle className="w-4 h-4 text-danger mt-0.5 shrink-0" />
        ) : (
          <TreePine className="w-4 h-4 text-conservation mt-0.5 shrink-0" />
        )}
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-0.5 ${
            isCritical ? "text-danger" : "text-conservation"
          }`}>
            {isCritical ? "Conservation Alert" : "Conservation Notice"}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This species is classified as <span className="font-semibold text-foreground">{status}</span>.
            {isCritical
              ? " It faces an extremely high risk of extinction in the wild. Report sightings to local wildlife authorities."
              : " Its population is declining. Avoid disturbing its habitat and report sightings to support conservation efforts."}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default ConservationBanner;
