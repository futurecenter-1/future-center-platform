ALTER TABLE public.students ADD COLUMN IF NOT EXISTS country_id uuid REFERENCES public.countries(id) ON DELETE SET NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS university_id bigint REFERENCES public.universities(id) ON DELETE SET NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS stage_id bigint REFERENCES public.stages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS students_country_id_idx ON public.students(country_id);
CREATE INDEX IF NOT EXISTS students_university_id_idx ON public.students(university_id);
CREATE INDEX IF NOT EXISTS students_stage_id_idx ON public.students(stage_id);

CREATE OR REPLACE FUNCTION public.handle_new_student()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  INSERT INTO public.students(id,auth_user_id,full_name,phone,email,country_id,university_id,stage_id)
  VALUES(new.id,new.id,coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.raw_user_meta_data->>'phone',''),new.email,
    nullif(new.raw_user_meta_data->>'country_id','')::uuid,
    nullif(new.raw_user_meta_data->>'university_id','')::bigint,
    nullif(new.raw_user_meta_data->>'stage_id','')::bigint)
  ON CONFLICT(id) DO UPDATE SET full_name=excluded.full_name,phone=excluded.phone,email=excluded.email,
    country_id=coalesce(excluded.country_id,students.country_id),
    university_id=coalesce(excluded.university_id,students.university_id),
    stage_id=coalesce(excluded.stage_id,students.stage_id);
  RETURN new;
END;
$$;
