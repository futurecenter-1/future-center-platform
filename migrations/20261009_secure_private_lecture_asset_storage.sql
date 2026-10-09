-- Private lecture file storage. Objects are stored as <lecture_id>/<filename>.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('lecture-assets','lecture-assets',false,104857600,array['application/pdf','video/mp4','video/webm','application/zip','image/png','image/jpeg','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict (id) do update set public=false,file_size_limit=104857600,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists lecture_assets_select_authorized on storage.objects;
create policy lecture_assets_select_authorized on storage.objects for select to authenticated using (
 bucket_id='lecture-assets' and (
  public.is_admin()
  or exists (
   select 1 from public.lectures l
   where l.id = case when split_part(name,'/',1) ~ '^[0-9]+$' then split_part(name,'/',1)::bigint else null end
   and l.active=true and (
    l.is_public=true
    or exists (
      select 1 from public.lecture_files lf
      join public.student_courses sc on sc.course_id=l.course_id
      join public.students st on st.id=sc.student_id
      where lf.lecture_id=l.id and lf.file_url=name
        and st.auth_user_id=auth.uid() and sc.active=true
        and (sc.expires_at is null or sc.expires_at>now())
    )
    or exists (
      select 1 from public.lecturers le
      join public.courses c on c.lecturer_id=le.id
      where le.auth_user_id=auth.uid() and le.active=true and c.id=l.course_id
    )
   )
  )
 )
);

drop policy if exists lecture_assets_insert_authorized on storage.objects;
create policy lecture_assets_insert_authorized on storage.objects for insert to authenticated with check (
 bucket_id='lecture-assets' and (
  public.is_admin()
  or exists (
   select 1 from public.lectures l
   join public.courses c on c.id=l.course_id
   join public.lecturers le on le.id=c.lecturer_id
   where l.id=case when split_part(name,'/',1) ~ '^[0-9]+$' then split_part(name,'/',1)::bigint else null end
   and le.auth_user_id=auth.uid() and le.active=true
  )
 )
);

drop policy if exists lecture_assets_update_authorized on storage.objects;
create policy lecture_assets_update_authorized on storage.objects for update to authenticated using (
 bucket_id='lecture-assets' and (public.is_admin() or exists (
  select 1 from public.lectures l join public.courses c on c.id=l.course_id join public.lecturers le on le.id=c.lecturer_id
  where l.id=case when split_part(name,'/',1) ~ '^[0-9]+$' then split_part(name,'/',1)::bigint else null end and le.auth_user_id=auth.uid() and le.active=true
 ))
) with check (
 bucket_id='lecture-assets' and (public.is_admin() or exists (
  select 1 from public.lectures l join public.courses c on c.id=l.course_id join public.lecturers le on le.id=c.lecturer_id
  where l.id=case when split_part(name,'/',1) ~ '^[0-9]+$' then split_part(name,'/',1)::bigint else null end and le.auth_user_id=auth.uid() and le.active=true
 ))
);

drop policy if exists lecture_assets_delete_authorized on storage.objects;
create policy lecture_assets_delete_authorized on storage.objects for delete to authenticated using (
 bucket_id='lecture-assets' and (public.is_admin() or exists (
  select 1 from public.lectures l join public.courses c on c.id=l.course_id join public.lecturers le on le.id=c.lecturer_id
  where l.id=case when split_part(name,'/',1) ~ '^[0-9]+$' then split_part(name,'/',1)::bigint else null end and le.auth_user_id=auth.uid() and le.active=true
 ))
);