
DROP POLICY "Public can read sightings" ON public.sightings;

ALTER VIEW public.public_sightings SET (security_invoker = off);
