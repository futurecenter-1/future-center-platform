-- Limit role-check helper execution to signed-in users.
DROP POLICY IF EXISTS "Lecturers can view own courses" ON public.courses;
DROP POLICY IF EXISTS "Lecturers can view own lectures" ON public.lectures;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_lecturer() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_lecturer() TO authenticated;
