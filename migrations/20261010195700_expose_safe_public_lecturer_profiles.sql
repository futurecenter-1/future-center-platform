-- Expose only public-facing lecturer fields; keep contact/auth identifiers private.
CREATE OR REPLACE VIEW public.lecturer_public_profiles
WITH (security_barrier = true)
AS
SELECT id, full_name, bio, image_url
FROM public.lecturers
WHERE active = true;

GRANT SELECT ON public.lecturer_public_profiles TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view active lecturers" ON public.lecturers;
