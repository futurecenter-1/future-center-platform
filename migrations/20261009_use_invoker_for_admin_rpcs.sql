-- Admin RPCs rely on admin RLS policies and do not need elevated SQL privileges.
ALTER FUNCTION public.admin_list_students() SECURITY INVOKER;
ALTER FUNCTION public.admin_list_student_courses() SECURITY INVOKER;
ALTER FUNCTION public.admin_add_student_course(uuid,bigint,boolean,timestamptz) SECURITY INVOKER;
