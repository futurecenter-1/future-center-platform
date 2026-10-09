-- Let lecturers manage lectures through the course assigned to their lecturer profile.
-- This also supports legacy lecture rows whose lecturer_id is null or stale.
drop policy if exists "Lecturer can manage own lectures" on public.lectures;
create policy "Lecturer can manage own lectures" on public.lectures
for all to authenticated
using (
  exists (
    select 1
    from public.courses c
    join public.lecturers le on le.id = c.lecturer_id
    where c.id = lectures.course_id
      and le.auth_user_id = auth.uid()
      and le.active = true
  )
)
with check (
  exists (
    select 1
    from public.courses c
    join public.lecturers le on le.id = c.lecturer_id
    where c.id = lectures.course_id
      and le.auth_user_id = auth.uid()
      and le.active = true
  )
);
