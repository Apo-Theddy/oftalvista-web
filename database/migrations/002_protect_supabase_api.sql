-- PHP accesses PostgreSQL on the server. Do not expose CMS tables through
-- Supabase's automatically generated public API, including password hashes.
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
