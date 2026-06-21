-- Run once in Supabase Dashboard → SQL Editor (project: jbpsuxpvazcchafiqnrf)
-- Fixes: "permission denied for schema public" for mobile/web clients.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon, authenticated;

-- Public car catalog (matches web listing)
ALTER TABLE IF EXISTS "Car" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_available_cars" ON "Car";
CREATE POLICY "anon_read_available_cars" ON "Car"
  FOR SELECT TO anon, authenticated
  USING (status = 'AVAILABLE');

ALTER TABLE IF EXISTS "Bank" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_banks" ON "Bank";
CREATE POLICY "anon_read_banks" ON "Bank"
  FOR SELECT TO anon, authenticated
  USING (true);

ALTER TABLE IF EXISTS "FeaturedBrand" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_featured_brands" ON "FeaturedBrand";
CREATE POLICY "anon_read_featured_brands" ON "FeaturedBrand"
  FOR SELECT TO anon, authenticated
  USING ("isActive" = true);

ALTER TABLE IF EXISTS "FeaturedModel" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_featured_models" ON "FeaturedModel";
CREATE POLICY "anon_read_featured_models" ON "FeaturedModel"
  FOR SELECT TO anon, authenticated
  USING ("isActive" = true);

ALTER TABLE IF EXISTS "Review" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_reviews" ON "Review";
CREATE POLICY "anon_read_reviews" ON "Review"
  FOR SELECT TO anon, authenticated
  USING (true);

ALTER TABLE IF EXISTS "HeroSection" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_hero_section" ON "HeroSection";
CREATE POLICY "anon_read_hero_section" ON "HeroSection"
  FOR SELECT TO anon, authenticated
  USING (true);

ALTER TABLE IF EXISTS "Logo" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_logos" ON "Logo";
CREATE POLICY "anon_read_logos" ON "Logo"
  FOR SELECT TO anon, authenticated
  USING ("isActive" = true);

ALTER TABLE IF EXISTS "StoreInfo" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_store_info" ON "StoreInfo";
CREATE POLICY "anon_read_store_info" ON "StoreInfo"
  FOR SELECT TO anon, authenticated
  USING (true);

ALTER TABLE IF EXISTS "SocialMedia" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_social_media" ON "SocialMedia";
CREATE POLICY "anon_read_social_media" ON "SocialMedia"
  FOR SELECT TO anon, authenticated
  USING ("isActive" = true);

ALTER TABLE IF EXISTS "PixelSettings" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_pixel_settings" ON "PixelSettings";
CREATE POLICY "anon_read_pixel_settings" ON "PixelSettings"
  FOR SELECT TO anon, authenticated
  USING (true);

ALTER TABLE IF EXISTS "AboutPage" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_about_page" ON "AboutPage";
CREATE POLICY "anon_read_about_page" ON "AboutPage"
  FOR SELECT TO anon, authenticated
  USING ("isPublished" = true);

ALTER TABLE IF EXISTS "AboutFeature" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_about_features" ON "AboutFeature";
CREATE POLICY "anon_read_about_features" ON "AboutFeature"
  FOR SELECT TO anon, authenticated
  USING ("isActive" = true);
