-- Correct private lecture asset ownership checks.
-- Object keys are stored as <lecture_id>/<filename>; never infer IDs from course names.
drop policy if exists lecture_assets_insert_authorized on storage.objects;
create policy lecture_assets_insert_authorized on storage.objects for insert to authenticated
with check (bucket_id = 'lecture-assets' and (
  public.is_admin() or exists (
    select 1 from public.lectures l
    join public.courses c on c.id = l.course_id
    join public.lecturers le on le.id = c.lecturer_id
    where l.id = case when split_part(storage.objects.name, '/', 1) ~ '^[0-9]+$'
      then split_part(storage.objects.name, '/', 1)::bigint else null end
      and le.auth_user_id = auth.uid() and le.active = true
  )
));

drop policy if exists lecture_assets_update_authorized on storage.objects;
create policy lecture_assets_update_authorized on storage.objects for update to authenticated
using (bucket_id = 'lecture-assets' and (
  public.is_admin() or exists (
    select 1 from public.lectures l
    join public.courses c on c.id = l.course_id
    join public.lecturers le on le.id = c.lecturer_id
    where l.id = case when split_part(storage.objects.name, '/', 1) ~ '^[0-9]+$'
      then split_part(storage.objects.name, '/', 1)::bigint else null end
      and le.auth_user_id = auth.uid() and le.active = true
  )
))
with check (bucket_id = 'lecture-assets' and (
  public.is_admin() or exists (
    select 1 from public.lectures l
    join public.courses c on c.id = l.course_id
    join public.lecturers le on le.id = c.lecturer_id
    where l.id = case when split_part(storage.objects.name, '/', 1) ~ '^[0-9]+$'
      then split_part(storage.objects.name, '/', 1)::bigint else null end
      and le.auth_user_id = auth.uid() and le.active = true
  )
));

drop policy if exists lecture_assets_delete_authorized on storage.objects;
create policy lecture_assets_delete_authorized on storage.objects for delete to authenticated
using (bucket_id = 'lecture-assets' and (
  public.is_admin() or exists (
    select 1 from public.lectures l
    join public.courses c on c.id = l.course_id
    join public.lecturers le on le.id = c.lecturer_id
    where l.id = case when split_part(storage.objects.name, '/', 1) ~ '^[0-9]+$'
      then split_part(storage.objects.name, '/', 1)::bigint else null end
      and le.auth_user_id = auth.uid() and le.active = true
  )
));
