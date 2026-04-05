
-- Create rate_limit_log table for IP-based rate limiting
CREATE TABLE public.rate_limit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_ip text NOT NULL,
  sighting_id uuid REFERENCES public.sightings(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Only service_role can access
CREATE POLICY "Service role full access"
  ON public.rate_limit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Migrate existing IP data
INSERT INTO public.rate_limit_log (client_ip, sighting_id, created_at)
SELECT client_ip, id, created_at FROM public.sightings WHERE client_ip IS NOT NULL;

-- Drop client_ip from sightings
ALTER TABLE public.sightings DROP COLUMN client_ip;

-- Recreate public_sightings view without client_ip
DROP VIEW IF EXISTS public.public_sightings;
CREATE VIEW public.public_sightings AS
  SELECT id, name, scientific_name, threat_level, conservation_status, profile, habitat, confidence, lat, lng, image_thumbnail, created_at
  FROM public.sightings;
