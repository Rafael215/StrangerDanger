import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Shield,
  AlertTriangle,
  Skull,
  TreePine,
  Loader2,
  Navigation,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "@/hooks/use-geolocation";
import { isEndangered } from "@/components/ConservationBanner";

interface Sighting {
  id: string;
  name: string;
  scientific_name: string;
  threat_level: "Safe" | "Caution" | "Danger";
  conservation_status: string;
  profile: string;
  habitat: string;
  confidence: number;
  lat: number;
  lng: number;
  image_thumbnail: string | null;
  created_at: string;
}

const threatIcon = {
  Safe: Shield,
  Caution: AlertTriangle,
  Danger: Skull,
};

const threatClass = {
  Safe: "threat-safe ring-safe/30",
  Caution: "threat-caution ring-caution/30",
  Danger: "threat-danger ring-danger/30",
};

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m away`;
  if (km < 10) return `${km.toFixed(1)}km away`;
  return `${Math.round(km)}km away`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const NearbyFeed = () => {
  const { lat, lng, loading: geoLoading, error: geoError, retry } = useGeolocation();
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSightings() {
      setLoading(true);
      const { data, error } = await supabase
        .from("public_sightings" as any)
        .select("id, name, scientific_name, threat_level, conservation_status, profile, habitat, confidence, lat, lng, image_thumbnail, created_at")
        .order("created_at", { ascending: false })
        .limit(30);

      if (!error && data) {
        setSightings(data as unknown as Sighting[]);
      }
      setLoading(false);
    }
    fetchSightings();
  }, []);

  // Sort by distance if we have location
  const sorted = lat && lng
    ? [...sightings]
        .map((s) => ({ ...s, distance: distanceKm(lat, lng, s.lat, s.lng) }))
        .sort((a, b) => a.distance - b.distance)
    : sightings.map((s) => ({ ...s, distance: null as number | null }));

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
            <MapPin className="w-5 h-5 text-primary" />
            Nearby Sightings
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-lg">
        {/* Location status */}
        {geoLoading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Getting your location…
          </div>
        )}
        {geoError && (
          <div className="glass-card rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Location unavailable — showing all recent sightings
            </p>
            <button
              onClick={retry}
              className="text-xs text-primary font-medium hover:underline"
            >
              Try again
            </button>
          </div>
        )}
        {lat && lng && !geoLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
            <Navigation className="w-3 h-3 text-primary" />
            Showing sightings near {lat.toFixed(2)}°, {lng.toFixed(2)}°
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : sorted.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No sightings yet
            </h2>
            <p className="text-muted-foreground mb-6">
              Be the first to identify an animal and share it with the community!
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Identify an Animal
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {sorted.map((s, i) => {
              const Icon = threatIcon[s.threat_level];
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card rounded-xl overflow-hidden"
                >
                  <div className="flex gap-3 p-4">
                    {s.image_thumbnail && (
                      <img
                        src={s.image_thumbnail}
                        alt={s.name}
                        className="w-16 h-16 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-foreground text-sm">
                            {s.name}
                          </h3>
                          <p className="text-[11px] text-muted-foreground italic">
                            {s.scientific_name}
                          </p>
                        </div>
                        <div
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 shrink-0 ${threatClass[s.threat_level]}`}
                        >
                          <Icon className="w-3 h-3" />
                          {s.threat_level}
                        </div>
                      </div>

                      {isEndangered(s.conservation_status) && (
                        <div className="flex items-center gap-1 text-conservation text-[10px] font-semibold mt-1">
                          <TreePine className="w-3 h-3" />
                          {s.conservation_status}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        <span>{timeAgo(s.created_at)}</span>
                        {s.distance !== null && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            {formatDistance(s.distance)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NearbyFeed;
