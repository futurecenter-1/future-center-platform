-- Keep child content from bypassing the parent course's visibility.
-- A lecture/file is public only when both the course and the lecture are marked public.
DROP POLICY IF EXISTS lectures_public_or_enrolled ON public.lectures;
CREATE POLICY lectures_public_or_enrolled
ON public.lectures
FOR SELECT
TO anon, authenticated
USING (
  active = true
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = lectures.course_id AND c.active = true
  )
  AND (
    (
      is_public = true
      AND EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = lectures.course_id AND c.active = true AND c.is_public = true
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.student_courses sc
      JOIN public.students s ON s.id = sc.student_id
      WHERE sc.course_id = lectures.course_id
        AND s.auth_user_id = auth.uid()
        AND sc.active = true
        AND (sc.expires_at IS NULL OR sc.expires_at > now())
    )
  )
);

DROP POLICY IF EXISTS lecture_files_public_or_enrolled ON public.lecture_files;
CREATE POLICY lecture_files_public_or_enrolled
ON public.lecture_files
FOR SELECT
TO anon, authenticated
USING (
  active = true
  AND EXISTS (
    SELECT 1
    FROM public.lectures l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lecture_files.lecture_id
      AND l.active = true
      AND c.active = true
      AND (
        (l.is_public = true AND c.is_public = true)
        OR EXISTS (
          SELECT 1
          FROM public.student_courses sc
          JOIN public.students s ON s.id = sc.student_id
          WHERE sc.course_id = l.course_id
            AND s.auth_user_id = auth.uid()
            AND sc.active = true
            AND (sc.expires_at IS NULL OR sc.expires_at > now())
        )
      )
  )
);

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
      WHERE lf.file_url = objects.name
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
