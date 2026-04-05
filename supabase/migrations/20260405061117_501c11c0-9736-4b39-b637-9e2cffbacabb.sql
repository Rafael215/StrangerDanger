
-- Create a public view that excludes client_ip
CREATE VIEW public.public_sightings AS
  SELECT id, name, scientific_name, threat_level, conservation_status, profile, habitat, confidence, lat, lng, image_thumbnail, created_at
  FROM public.sightings;

-- Grant access to the view for anon and authenticated
GRANT SELECT ON public.public_sightings TO anon, authenticated;

-- Remove the open SELECT policy on the sightings table
DROP POLICY "Anyone can read sightings" ON public.sightings;
