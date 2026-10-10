-- A single authenticated account should map to at most one student profile.
-- NULL auth_user_id remains allowed for legacy/unlinked records.
CREATE UNIQUE INDEX IF NOT EXISTS students_auth_user_id_unique
ON public.students (auth_user_id)
WHERE auth_user_id IS NOT NULL;
