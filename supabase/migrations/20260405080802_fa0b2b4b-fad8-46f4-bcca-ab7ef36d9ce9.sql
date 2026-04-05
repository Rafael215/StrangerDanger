
-- Add location_label column
ALTER TABLE public.sightings ADD COLUMN location_label text;

-- Allow anon and authenticated to read sightings (client_ip is already removed)
CREATE POLICY "Anyone can read sightings"
  ON public.sightings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Recreate view with location_label
DROP VIEW IF EXISTS public.public_sightings;
CREATE VIEW public.public_sightings AS
  SELECT id, name, scientific_name, threat_level, conservation_status, profile, habitat, confidence, lat, lng, image_thumbnail, location_label, created_at
  FROM public.sightings;
