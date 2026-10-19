-- Allow the server-only admin-create-lecturer Edge Function to create lecturer profiles and assign their role.
-- Do not grant INSERT to anon/authenticated; authorization remains enforced in the Edge Function.
GRANT INSERT ON TABLE public.lecturers TO service_role;
GRANT INSERT ON TABLE public.user_roles TO service_role;
