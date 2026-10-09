-- Migration: course_images_and_asset_library
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS image_url text;
DROP POLICY IF EXISTS site_assets_admin_select ON storage.objects;
CREATE POLICY site_assets_admin_select ON storage.objects FOR SELECT TO authenticated USING (bucket_id='site-assets' AND public.is_admin());
