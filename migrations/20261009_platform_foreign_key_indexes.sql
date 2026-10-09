create index if not exists idx_courses_stage_id on public.courses(stage_id);
create index if not exists idx_lecture_files_lecture_id on public.lecture_files(lecture_id);
create index if not exists idx_lectures_course_id on public.lectures(course_id);
create index if not exists idx_site_settings_updated_by on public.site_settings(updated_by);
create index if not exists idx_stages_university_id on public.stages(university_id);
create index if not exists idx_student_courses_course_id on public.student_courses(course_id);
create index if not exists idx_universities_country_id on public.universities(country_id);