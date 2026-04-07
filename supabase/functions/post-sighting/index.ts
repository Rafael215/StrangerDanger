import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  assertEnum,
  assertNumber,
  assertOptionalDataUrl,
  assertString,
  errorResponse,
  handlePreflight,
  jsonResponse,
  parseJsonBody,
  requirePost,
} from "../_shared/security.ts";

const RATE_LIMIT = 5;
const RATE_WINDOW_HOURS = 1;
const THREAT_LEVELS = ["Safe", "Caution", "Danger"] as const;

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    requirePost(req);
    const clientIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const body = await parseJsonBody<Record<string, unknown>>(req);
    const { name, scientificName, threatLevel, conservationStatus, profile, habitat, confidence, lat, lng, imageThumbnail, locationLabel } = body;
    const sanitizedName = assertString(name, "name", 120);
    const sanitizedScientificName = assertString(scientificName, "scientificName", 160);
    const sanitizedThreatLevel = assertEnum(threatLevel, "threatLevel", THREAT_LEVELS);
    const sanitizedConservationStatus = assertString(conservationStatus ?? "Unknown", "conservationStatus", 120);
    const sanitizedProfile = assertString(profile ?? "", "profile", 2000, { minLength: 0, optional: true });
    const sanitizedHabitat = assertString(habitat ?? "", "habitat", 160, { minLength: 0, optional: true });
    const sanitizedConfidence = confidence == null ? 0 : assertNumber(confidence, "confidence", { min: 0, max: 1 });
    const sanitizedLat = assertNumber(lat, "lat", { min: -90, max: 90 });
    const sanitizedLng = assertNumber(lng, "lng", { min: -180, max: 180 });
    const sanitizedImageThumbnail = assertOptionalDataUrl(
      imageThumbnail,
      "imageThumbnail",
      ["data:image/jpeg", "data:image/jpg", "data:image/png", "data:image/webp"],
      2 * 1024 * 1024,
    );
    const sanitizedLocationLabel = locationLabel
      ? assertString(locationLabel, "locationLabel", 120)
      : null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Rate limit check by IP (uses separate audit table)
    const cutoff = new Date(Date.now() - RATE_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("rate_limit_log")
      .select("*", { count: "exact", head: true })
      .eq("client_ip", clientIp)
      .gte("created_at", cutoff);

    if ((count ?? 0) >= RATE_LIMIT) {
      return jsonResponse(
        req,
        429,
        { error: "Rate limit exceeded. Try again later." },
        { "Retry-After": "3600" },
      );
    }

    // Reverse geocode to get location label if not provided
    let resolvedLocation = sanitizedLocationLabel;
    if (!resolvedLocation) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${sanitizedLat}&lon=${sanitizedLng}&format=json&zoom=10`,
          { headers: { "User-Agent": "StrangerDanger/1.0" } }
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          const addr = geoData.address;
          resolvedLocation = addr?.city || addr?.town || addr?.village || addr?.county || geoData.display_name?.split(",").slice(0, 2).join(",").trim() || null;
        }
      } catch (e) {
        console.warn("Reverse geocode failed:", e);
      }
    }

    const { data, error } = await supabase.from("sightings").insert({
      name: sanitizedName,
      scientific_name: sanitizedScientificName,
      threat_level: sanitizedThreatLevel,
      conservation_status: sanitizedConservationStatus,
      profile: sanitizedProfile,
      habitat: sanitizedHabitat,
      confidence: sanitizedConfidence,
      lat: sanitizedLat,
      lng: sanitizedLng,
      image_thumbnail: sanitizedImageThumbnail,
      location_label: resolvedLocation,
    }).select().single();

    if (error) {
      console.error("Insert error:", error);
      throw new Error(error.message);
    }

    // Log IP in separate audit table for rate limiting
    await supabase.from("rate_limit_log").insert({
      client_ip: clientIp,
      sighting_id: data.id,
    });

    return jsonResponse(req, 200, { success: true, id: data.id });
  } catch (e) {
    return errorResponse(req, e, "post-sighting error:");
  }
});
