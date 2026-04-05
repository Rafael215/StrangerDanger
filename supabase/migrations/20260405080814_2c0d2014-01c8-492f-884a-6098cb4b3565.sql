
DROP VIEW IF EXISTS public.public_sightings;
CREATE VIEW public.public_sightings
  WITH (security_invoker = true)
  AS SELECT id, name, scientific_name, threat_level, conservation_status, profile, habitat, confidence, lat, lng, image_thumbnail, location_label, created_at
  FROM public.sightings;
