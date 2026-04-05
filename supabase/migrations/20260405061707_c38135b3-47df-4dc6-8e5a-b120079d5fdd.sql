
ALTER VIEW public.public_sightings SET (security_invoker = on);

CREATE POLICY "Public can read sightings" ON public.sightings
  FOR SELECT TO anon, authenticated USING (true);
