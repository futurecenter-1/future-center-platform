drop policy if exists lecturer_manage_own_lecture_files on public.lecture_files;
create policy lecturer_manage_own_lecture_files on public.lecture_files
for all to authenticated
using (
 exists (
  select 1 from public.lectures l
  join public.courses c on c.id=l.course_id
  join public.lecturers le on le.id=c.lecturer_id
  where l.id=lecture_files.lecture_id and le.auth_user_id=auth.uid() and le.active=true
 )
)
with check (
 exists (
  select 1 from public.lectures l
  join public.courses c on c.id=l.course_id
  join public.lecturers le on le.id=c.lecturer_id
  where l.id=lecture_files.lecture_id and le.auth_user_id=auth.uid() and le.active=true
 )
);