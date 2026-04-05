
CREATE TABLE public.sightings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  scientific_name TEXT NOT NULL,
  threat_level TEXT NOT NULL CHECK (threat_level IN ('Safe', 'Caution', 'Danger')),
  conservation_status TEXT NOT NULL,
  profile TEXT NOT NULL,
  habitat TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  image_thumbnail TEXT,
  client_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sightings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sightings"
  ON public.sightings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX idx_sightings_location ON public.sightings (lat, lng);
CREATE INDEX idx_sightings_created_at ON public.sightings (created_at DESC);
