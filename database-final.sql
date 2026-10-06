-- Future Center: student accounts + access control
-- Run in Supabase SQL Editor. Never put a service_role key in the website.

create or replace function public.handle_new_student()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.students (id, auth_user_id, full_name, phone, email)
  values (new.id, new.id, coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.raw_user_meta_data->>'phone',''), new.email)
  on conflict (id) do update set email=excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_student on auth.users;
create trigger on_auth_user_created_student
after insert on auth.users
for each row execute function public.handle_new_student();

alter table public.students enable row level security;
alter table public.student_courses enable row level security;
alter table public.courses enable row level security;
alter table public.lectures enable row level security;
alter table public.lecture_files enable row level security;

-- Student can see only their own profile/subscriptions.
drop policy if exists students_own_select on public.students;
create policy students_own_select on public.students for select to authenticated using (auth_user_id = auth.uid());
drop policy if exists students_own_update on public.students;
create policy students_own_update on public.students for update to authenticated using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

drop policy if exists student_courses_own_select on public.student_courses;
create policy student_courses_own_select on public.student_courses for select to authenticated using (student_id = auth.uid());

-- Public courses/lectures remain visible when marked public.
drop policy if exists courses_public_or_subscribed on public.courses;
create policy courses_public_or_subscribed on public.courses for select to anon,authenticated using (
  is_public = true
  or exists (select 1 from public.student_courses sc where sc.course_id = courses.id and sc.student_id = auth.uid() and sc.active = true and (sc.expires_at is null or sc.expires_at > now()))
);

drop policy if exists lectures_public_or_subscribed on public.lectures;
create policy lectures_public_or_subscribed on public.lectures for select to anon,authenticated using (
  is_public = true
  or exists (select 1 from public.student_courses sc join public.lectures lx on lx.course_id = sc.course_id where lx.id = lectures.id and sc.student_id = auth.uid() and sc.active = true and (sc.expires_at is null or sc.expires_at > now()))
);

drop policy if exists lecture_files_public_or_subscribed on public.lecture_files;
create policy lecture_files_public_or_subscribed on public.lecture_files for select to anon,authenticated using (
  exists (select 1 from public.lectures l where l.id = lecture_files.lecture_id and l.is_public = true)
  or exists (select 1 from public.lecture_files lf join public.lectures l on l.id = lf.lecture_id join public.student_courses sc on sc.course_id = l.course_id where lf.id = lecture_files.id and sc.student_id = auth.uid() and sc.active = true and (sc.expires_at is null or sc.expires_at > now()))
);

-- Dashboard compatibility for the current PIN-protected frontend.
-- IMPORTANT: this keeps admin operations simple but is NOT a production-grade admin security model.
-- Replace these anon management policies later with Supabase Auth + Edge Function/service-role operations.
drop policy if exists dashboard_students_select on public.students;
create policy dashboard_students_select on public.students for select to anon using (true);
drop policy if exists dashboard_student_courses_all on public.student_courses;
create policy dashboard_student_courses_all on public.student_courses for all to anon using (true) with check (true);
