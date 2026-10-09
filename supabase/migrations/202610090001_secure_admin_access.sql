-- Future Center security hardening (review before applying to production)
-- Requires public.is_admin() to check authenticated user_roles.role = 'admin'.
-- Removes permissive dashboard policies that allowed anonymous writes.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE 'dashboard_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Admin-only management. Existing public/own-row SELECT policies remain in place.
DROP POLICY IF EXISTS "Admin manage countries" ON public.countries;
CREATE POLICY "Admin manage countries" ON public.countries
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin manage universities" ON public.universities;
CREATE POLICY "Admin manage universities" ON public.universities
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin manage stages" ON public.stages;
CREATE POLICY "Admin manage stages" ON public.stages
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin manage subjects" ON public.subjects;
CREATE POLICY "Admin manage subjects" ON public.subjects
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin manage students" ON public.students;
CREATE POLICY "Admin manage students" ON public.students
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin manage student courses" ON public.student_courses;
CREATE POLICY "Admin manage student courses" ON public.student_courses
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin manage lecture files" ON public.lecture_files;
CREATE POLICY "Admin manage lecture files" ON public.lecture_files
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin manage registrations" ON public.registrations;
CREATE POLICY "Admin manage registrations" ON public.registrations
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Remove legacy SECURITY DEFINER RPCs protected only by a shared PIN.
DROP FUNCTION IF EXISTS public.admin_list_students(text);
DROP FUNCTION IF EXISTS public.admin_list_student_courses(text);
DROP FUNCTION IF EXISTS public.admin_add_student_course(text, uuid, bigint, boolean, timestamptz);
