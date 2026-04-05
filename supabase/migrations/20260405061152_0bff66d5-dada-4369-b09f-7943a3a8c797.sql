
CREATE POLICY "Service role can read sightings" ON public.sightings
  FOR SELECT TO service_role USING (true);
