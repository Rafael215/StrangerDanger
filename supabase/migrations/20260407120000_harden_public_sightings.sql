REVOKE SELECT ON public.sightings FROM anon, authenticated;

DROP POLICY IF EXISTS "Anyone can read sightings" ON public.sightings;

DROP VIEW IF EXISTS public.public_sightings;
CREATE VIEW public.public_sightings
WITH (security_invoker = false) AS
SELECT
  id,
  name,
  scientific_name,
  threat_level,
  conservation_status,
  profile,
  habitat,
  confidence,
  round(lat::numeric, 2)::double precision AS lat,
  round(lng::numeric, 2)::double precision AS lng,
  image_thumbnail,
  location_label,
  created_at
FROM public.sightings;

GRANT SELECT ON public.public_sightings TO anon, authenticated;
