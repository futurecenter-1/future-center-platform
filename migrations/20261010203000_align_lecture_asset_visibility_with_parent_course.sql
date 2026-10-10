-- Align private lecture asset reads with the parent-course visibility rules.
-- Enrolled students require an active, non-expired subscription; public assets
-- require both the lecture and its parent course to be active and public.
DROP POLICY IF EXISTS lecture_assets_select_authorized ON storage.objects;

CREATE POLICY lecture_assets_select_authorized
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lecture-assets'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.lecture_files lf
      JOIN public.lectures l ON l.id = lf.lecture_id
      JOIN public.courses c ON c.id = l.course_id
      WHERE lf.file_url = storage.objects.name
        AND lf.active = true
        AND l.active = true
        AND c.active = true
        AND (
          (l.is_public = true AND c.is_public = true)
          OR EXISTS (
            SELECT 1
            FROM public.student_courses sc
            JOIN public.students st ON st.id = sc.student_id
            WHERE sc.course_id = l.course_id
              AND st.auth_user_id = auth.uid()
              AND sc.active = true
              AND (sc.expires_at IS NULL OR sc.expires_at > now())
          )
          OR EXISTS (
            SELECT 1
            FROM public.lecturers le
            WHERE le.id = c.lecturer_id
              AND le.auth_user_id = auth.uid()
              AND le.active = true
          )
        )
    )
  )
);
