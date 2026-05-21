-- ═══════════════════════════════════════════════════════════
-- FROTAPRO EVOLUTION — Super Admin, Checklist Fotos, XML NF-e
-- ═══════════════════════════════════════════════════════════

-- 1. Adicionar papel super_admin ao enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Permissões de acesso por módulo por usuário
CREATE TABLE IF NOT EXISTS public.user_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filial_id UUID REFERENCES public.filiais(id) ON DELETE CASCADE,
  module TEXT NOT NULL, -- 'frota','motoristas','abastecimento','manutencao','pneus','checklist','ocorrencias','relatorios'
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, filial_id, module)
);
ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "module_perms_admin_all" ON public.user_module_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "module_perms_self" ON public.user_module_permissions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 3. Bucket de fotos de checklist (configurado via API)
-- Tabela para fotos de itens críticos do checklist
CREATE TABLE IF NOT EXISTS public.checklist_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  item_nome TEXT NOT NULL,
  foto_url TEXT NOT NULL,
  observacao TEXT,
  filial_id UUID REFERENCES public.filiais(id),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checklist_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklist_fotos_filial" ON public.checklist_fotos
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR filial_id = public.current_filial_id()
  );
CREATE POLICY "checklist_fotos_insert" ON public.checklist_fotos
  FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Tabela de NF-e importadas
CREATE TABLE IF NOT EXISTS public.nfe_importadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id UUID NOT NULL REFERENCES public.filiais(id) ON DELETE RESTRICT,
  chave_acesso TEXT,
  numero_nf TEXT,
  data_emissao DATE,
  fornecedor_cnpj TEXT,
  fornecedor_nome TEXT,
  valor_total NUMERIC(12,2),
  xml_raw TEXT,
  status TEXT NOT NULL DEFAULT 'importada', -- importada, vinculada, pendente
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.nfe_importadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nfe_filial" ON public.nfe_importadas
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR filial_id = public.current_filial_id()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR filial_id = public.current_filial_id()
  );

-- 5. Itens da NF-e vinculados a veículos
CREATE TABLE IF NOT EXISTS public.nfe_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nfe_id UUID NOT NULL REFERENCES public.nfe_importadas(id) ON DELETE CASCADE,
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  quantidade NUMERIC(10,3),
  unidade TEXT,
  valor_unitario NUMERIC(12,2),
  valor_total NUMERIC(12,2),
  ncm TEXT,
  tipo TEXT DEFAULT 'peca', -- peca, servico, combustivel, outro
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.nfe_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nfe_itens_all" ON public.nfe_itens
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Diagrama de pneus — posições por tipo de veículo
CREATE TABLE IF NOT EXISTS public.veiculo_posicoes_pneu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  posicao TEXT NOT NULL, -- 'DD','DE','TD','TE','TE1','TE2','TD1','TD2','estepe' etc
  pneu_id UUID REFERENCES public.pneus(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(veiculo_id, posicao)
);
ALTER TABLE public.veiculo_posicoes_pneu ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posicoes_pneu_all" ON public.veiculo_posicoes_pneu
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Função: verificar se é super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
$$;

-- 8. KPI view por filial (para BI)
CREATE OR REPLACE VIEW public.kpi_por_filial AS
SELECT
  f.id AS filial_id,
  f.nome AS filial_nome,
  COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'ativo') AS veiculos_ativos,
  COUNT(DISTINCT m.id) FILTER (WHERE m.ativo) AS motoristas_ativos,
  COALESCE(SUM(a.valor_total), 0) AS gasto_combustivel_total,
  COALESCE(SUM(a.litros), 0) AS litros_total,
  COUNT(DISTINCT mn.id) FILTER (WHERE mn.status IN ('agendada','em_andamento')) AS manutencoes_abertas,
  COALESCE(SUM(mn.custo), 0) FILTER (WHERE mn.status = 'concluida') AS custo_manutencao_total
FROM public.filiais f
LEFT JOIN public.veiculos v ON v.filial_id = f.id
LEFT JOIN public.motoristas m ON m.filial_id = f.id
LEFT JOIN public.abastecimentos a ON a.filial_id = f.id
LEFT JOIN public.manutencoes mn ON mn.filial_id = f.id
GROUP BY f.id, f.nome;

-- 9. Índices para performance
CREATE INDEX IF NOT EXISTS idx_abastecimentos_filial ON public.abastecimentos(filial_id);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_data ON public.abastecimentos(data DESC);
CREATE INDEX IF NOT EXISTS idx_manutencoes_filial ON public.manutencoes(filial_id);
CREATE INDEX IF NOT EXISTS idx_manutencoes_status ON public.manutencoes(status);
CREATE INDEX IF NOT EXISTS idx_veiculos_filial ON public.veiculos(filial_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_status ON public.veiculos(status);
CREATE INDEX IF NOT EXISTS idx_checklists_data ON public.checklists(data DESC);
CREATE INDEX IF NOT EXISTS idx_pneus_veiculo ON public.pneus(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_checklist_fotos_checklist ON public.checklist_fotos(checklist_id);
CREATE INDEX IF NOT EXISTS idx_nfe_filial ON public.nfe_importadas(filial_id);
