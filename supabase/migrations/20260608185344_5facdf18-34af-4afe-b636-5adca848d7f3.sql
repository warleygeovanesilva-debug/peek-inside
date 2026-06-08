
-- 1. Restrict driver PII to admin/gestor or own record
DROP POLICY IF EXISTS motoristas_select_filial ON public.motoristas;
CREATE POLICY motoristas_select_admin_gestor_or_self ON public.motoristas
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (public.has_role(auth.uid(), 'gestor'::app_role) AND filial_id = public.current_filial_id())
    OR user_id = auth.uid()
  );

-- 2. Lock down SECURITY DEFINER functions: revoke public/anon EXECUTE, grant only to authenticated where needed
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_filial_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bootstrap_filial(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_abastecimento() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_filial_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_filial(text, text, text) TO authenticated;

-- 3. Explicit profile policies: explicit INSERT only for own row (trigger bypasses anyway)
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
