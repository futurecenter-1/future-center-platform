drop policy if exists lecture_assets_select_authorized on storage.objects;
create policy lecture_assets_select_authorized
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lecture-assets'
  and (
    public.is_admin()
    or exists (
      select 1
      from public.lecture_files lf
      join public.lectures l on l.id = lf.lecture_id
      join public.courses c on c.id = l.course_id
      where lf.file_url = storage.objects.name
        and lf.active = true
        and l.active = true
        and (
          l.is_public = true
          or exists (
            select 1
            from public.student_courses sc
            join public.students st on st.id = sc.student_id
            where sc.course_id = l.course_id
              and st.auth_user_id = auth.uid()
              and sc.active = true
              and (sc.expires_at is null or sc.expires_at > now())
          )
          or exists (
            select 1
            from public.lecturers le
            where le.id = c.lecturer_id
              and le.auth_user_id = auth.uid()
              and le.active = true
          )
        )
    )
  )
);