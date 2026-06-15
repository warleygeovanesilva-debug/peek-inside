
-- Tighten SELECT policies so motoristas only see their own records.
-- Admin/gestor still see everything in their filial.

-- abastecimentos
DROP POLICY IF EXISTS abastec_select ON public.abastecimentos;
CREATE POLICY abastec_select ON public.abastecimentos
FOR SELECT TO authenticated
USING (
  filial_id = public.current_filial_id()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR created_by = auth.uid()
    OR motorista_id IN (SELECT id FROM public.motoristas WHERE user_id = auth.uid())
  )
);

-- checklists
DROP POLICY IF EXISTS check_select ON public.checklists;
CREATE POLICY check_select ON public.checklists
FOR SELECT TO authenticated
USING (
  filial_id = public.current_filial_id()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR created_by = auth.uid()
    OR motorista_id IN (SELECT id FROM public.motoristas WHERE user_id = auth.uid())
  )
);

-- ocorrencias
DROP POLICY IF EXISTS ocor_select ON public.ocorrencias;
CREATE POLICY ocor_select ON public.ocorrencias
FOR SELECT TO authenticated
USING (
  filial_id = public.current_filial_id()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR created_by = auth.uid()
    OR motorista_id IN (SELECT id FROM public.motoristas WHERE user_id = auth.uid())
  )
);

-- profiles: allow gestor/admin to read profiles in the same filial
CREATE POLICY profiles_select_same_filial_managers ON public.profiles
FOR SELECT TO authenticated
USING (
  filial_id = public.current_filial_id()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
  )
);
