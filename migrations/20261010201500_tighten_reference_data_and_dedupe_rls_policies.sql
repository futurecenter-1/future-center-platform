-- Remove permissive legacy read policy: it overrode the active-only university policy.
DROP POLICY IF EXISTS "    Anyone can view universities" ON public.universities;

-- Remove duplicate equivalent SELECT policies; retain the canonical policies.
DROP POLICY IF EXISTS "students_own_profile" ON public.students;
DROP POLICY IF EXISTS "student_courses_own_rows" ON public.student_courses;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
