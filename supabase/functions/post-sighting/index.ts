import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RATE_LIMIT = 5;
const RATE_WINDOW_HOURS = 1;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    const body = await req.json();
    const { name, scientificName, threatLevel, conservationStatus, profile, habitat, confidence, lat, lng, imageThumbnail, locationLabel } = body;

    if (!name || !scientificName || !threatLevel || !lat || !lng) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reverse geocode to get location label if not provided
    let resolvedLocation = locationLabel || null;
    if (!resolvedLocation && lat && lng) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
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
      name,
      scientific_name: scientificName,
      threat_level: threatLevel,
      conservation_status: conservationStatus,
      profile: profile || "",
      habitat: habitat || "",
      confidence: confidence || 0,
      lat,
      lng,
      image_thumbnail: imageThumbnail || null,
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

    if (error) {
      console.error("Insert error:", error);
      throw new Error(error.message);
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("post-sighting error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
