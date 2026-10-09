-- Preserve active lecturers' ability to manage resource records for their own lectures.
-- This table stores links/metadata; the current UI does not upload binary files to Storage.
DROP POLICY IF EXISTS "Lecturers manage own lecture files" ON public.lecture_files;
CREATE POLICY "Lecturers manage own lecture files" ON public.lecture_files
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lectures l
      JOIN public.courses c ON c.id = l.course_id
      JOIN public.lecturers le ON (le.id = c.lecturer_id OR le.id = l.lecturer_id)
      WHERE l.id = lecture_files.lecture_id
        AND le.auth_user_id = auth.uid()
        AND le.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.lectures l
      JOIN public.courses c ON c.id = l.course_id
      JOIN public.lecturers le ON (le.id = c.lecturer_id OR le.id = l.lecturer_id)
      WHERE l.id = lecture_files.lecture_id
        AND le.auth_user_id = auth.uid()
        AND le.active = true
    )
  );
