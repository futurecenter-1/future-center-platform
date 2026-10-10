drop policy if exists "Anyone can view public courses" on public.courses;
drop policy if exists courses_public_or_enrolled on public.courses;
create policy courses_public_or_enrolled
on public.courses
for select
to anon, authenticated
using (
  active = true
  and (
    is_public = true
    or exists (
      select 1
      from public.student_courses sc
      join public.students s on s.id = sc.student_id
      where sc.course_id = courses.id
        and s.auth_user_id = auth.uid()
        and sc.active = true
        and (sc.expires_at is null or sc.expires_at > now())
    )
  )
);

drop policy if exists "Anyone can view public lectures" on public.lectures;
drop policy if exists lectures_public_or_enrolled on public.lectures;
create policy lectures_public_or_enrolled
on public.lectures
for select
to anon, authenticated
using (
  active = true
  and exists (
    select 1 from public.courses c
    where c.id = lectures.course_id and c.active = true
  )
  and (
    is_public = true
    or exists (
      select 1
      from public.student_courses sc
      join public.students s on s.id = sc.student_id
      where sc.course_id = lectures.course_id
        and s.auth_user_id = auth.uid()
        and sc.active = true
        and (sc.expires_at is null or sc.expires_at > now())
    )
  )
);

drop policy if exists "Anyone can view public lecture files" on public.lecture_files;
drop policy if exists lecture_files_public_or_enrolled on public.lecture_files;
create policy lecture_files_public_or_enrolled
on public.lecture_files
for select
to anon, authenticated
using (
  active = true
  and exists (
    select 1
    from public.lectures l
    join public.courses c on c.id = l.course_id
    where l.id = lecture_files.lecture_id
      and l.active = true
      and c.active = true
      and (
        l.is_public = true
        or exists (
          select 1
          from public.student_courses sc
          join public.students s on s.id = sc.student_id
          where sc.course_id = l.course_id
            and s.auth_user_id = auth.uid()
            and sc.active = true
            and (sc.expires_at is null or sc.expires_at > now())
        )
      )
  )
);