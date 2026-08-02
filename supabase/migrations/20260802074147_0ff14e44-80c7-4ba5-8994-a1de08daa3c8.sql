GRANT SELECT ON public.worker_profiles TO anon;
CREATE POLICY "worker_profiles_select_public" ON public.worker_profiles FOR SELECT TO anon USING (visivel = true);