-- Migration: secure_admin_and_site_assets
-- Removes anonymous dashboard write policies and replaces PIN-based RPCs with auth-role checks.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname='public' AND policyname LIKE 'dashboard\_%' ESCAPE '\'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['countries','universities','stages','subjects','courses','lectures','lecture_files','students','student_courses','registrations'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS future_admin_manage ON public.%I', t);
    EXECUTE format('CREATE POLICY future_admin_manage ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', t);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.admin_add_student_course(text, uuid, bigint, boolean, timestamptz);
DROP FUNCTION IF EXISTS public.admin_list_student_courses(text);
DROP FUNCTION IF EXISTS public.admin_list_students(text);

CREATE OR REPLACE FUNCTION public.admin_list_students()
RETURNS SETOF public.students LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT s.* FROM public.students s ORDER BY s.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_student_courses()
RETURNS TABLE(id bigint, student_id uuid, course_id bigint, active boolean, expires_at timestamptz, student_name text, course_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT sc.id,sc.student_id,sc.course_id,sc.active,sc.expires_at,s.full_name,c.name
  FROM public.student_courses sc LEFT JOIN public.students s ON s.id=sc.student_id
  LEFT JOIN public.courses c ON c.id=sc.course_id ORDER BY sc.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_add_student_course(p_student_id uuid,p_course_id bigint,p_active boolean DEFAULT true,p_expires_at timestamptz DEFAULT NULL)
RETURNS public.student_courses LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE result public.student_courses;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin access required' USING ERRCODE='42501'; END IF;
  INSERT INTO public.student_courses(student_id,course_id,active,expires_at)
  VALUES(p_student_id,p_course_id,COALESCE(p_active,true),p_expires_at)
  ON CONFLICT(student_id,course_id) DO UPDATE SET active=EXCLUDED.active,expires_at=EXCLUDED.expires_at
  RETURNING * INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_students() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_student_courses() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_add_student_course(uuid,bigint,boolean,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_students() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_student_courses() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_student_course(uuid,bigint,boolean,timestamptz) TO authenticated;

CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY, value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS site_settings_public_read ON public.site_settings;
CREATE POLICY site_settings_public_read ON public.site_settings FOR SELECT TO anon,authenticated USING (true);
DROP POLICY IF EXISTS site_settings_admin_manage ON public.site_settings;
CREATE POLICY site_settings_admin_manage ON public.site_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT SELECT ON public.site_settings TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON public.site_settings TO authenticated;
INSERT INTO public.site_settings(key,value) VALUES
 ('brand','{"name":"Future Center","subtitle":"منصتك التعليمية"}'::jsonb),
 ('home','{"title":"مستقبلك يبدأ من هنا","subtitle":"محاضراتك وكورساتك في مكان واحد"}'::jsonb),
 ('theme','{"primary":"#d7ad55","background":"#071426"}'::jsonb)
ON CONFLICT(key) DO NOTHING;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('site-assets','site-assets',true,10485760,ARRAY['image/png','image/jpeg','image/webp','image/svg+xml'])
ON CONFLICT(id) DO UPDATE SET public=true,file_size_limit=10485760,allowed_mime_types=ARRAY['image/png','image/jpeg','image/webp','image/svg+xml'];
DROP POLICY IF EXISTS site_assets_admin_insert ON storage.objects;
CREATE POLICY site_assets_admin_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='site-assets' AND public.is_admin());
DROP POLICY IF EXISTS site_assets_admin_update ON storage.objects;
CREATE POLICY site_assets_admin_update ON storage.objects FOR UPDATE TO authenticated USING(bucket_id='site-assets' AND public.is_admin()) WITH CHECK(bucket_id='site-assets' AND public.is_admin());
DROP POLICY IF EXISTS site_assets_admin_delete ON storage.objects;
CREATE POLICY site_assets_admin_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='site-assets' AND public.is_admin());
DROP POLICY IF EXISTS site_assets_admin_select ON storage.objects;
CREATE POLICY site_assets_admin_select ON storage.objects FOR SELECT TO authenticated USING(bucket_id='site-assets' AND public.is_admin());
