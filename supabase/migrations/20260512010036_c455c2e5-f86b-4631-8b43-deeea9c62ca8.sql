
-- Enums
CREATE TYPE public.ocorrencia_tipo AS ENUM ('multa','sinistro','avaria','infracao','outro');
CREATE TYPE public.ocorrencia_status AS ENUM ('aberta','em_analise','resolvida','cancelada');
CREATE TYPE public.ocorrencia_severidade AS ENUM ('baixa','media','alta','critica');

-- Tabela ocorrencias
CREATE TABLE public.ocorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id uuid NOT NULL,
  veiculo_id uuid,
  motorista_id uuid,
  tipo ocorrencia_tipo NOT NULL DEFAULT 'outro',
  severidade ocorrencia_severidade NOT NULL DEFAULT 'media',
  status ocorrencia_status NOT NULL DEFAULT 'aberta',
  data date NOT NULL DEFAULT CURRENT_DATE,
  data_resolucao date,
  local text,
  descricao text NOT NULL,
  valor numeric(12,2),
  numero_documento text,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ocor_select" ON public.ocorrencias FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR filial_id = current_filial_id());

CREATE POLICY "ocor_insert" ON public.ocorrencias FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR (has_role(auth.uid(),'gestor'::app_role) AND filial_id = current_filial_id()));

CREATE POLICY "ocor_update" ON public.ocorrencias FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR (has_role(auth.uid(),'gestor'::app_role) AND filial_id = current_filial_id()));

CREATE POLICY "ocor_delete" ON public.ocorrencias FOR DELETE TO authenticated
USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_ocor_updated BEFORE UPDATE ON public.ocorrencias
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ocor_filial ON public.ocorrencias(filial_id);
CREATE INDEX idx_ocor_veic ON public.ocorrencias(veiculo_id);
CREATE INDEX idx_ocor_mot ON public.ocorrencias(motorista_id);

-- KPI Views (security_invoker para respeitar RLS do usuário)
CREATE OR REPLACE VIEW public.kpi_consumo_veiculo
WITH (security_invoker = true) AS
SELECT
  v.id AS veiculo_id,
  v.filial_id,
  v.placa,
  v.modelo,
  COUNT(a.id) AS abastecimentos,
  COALESCE(SUM(a.litros),0) AS litros_total,
  COALESCE(SUM(a.valor_total),0) AS gasto_total,
  ROUND(AVG(a.consumo_kml)::numeric, 2) AS consumo_medio_kml
FROM public.veiculos v
LEFT JOIN public.abastecimentos a ON a.veiculo_id = v.id
GROUP BY v.id, v.filial_id, v.placa, v.modelo;

CREATE OR REPLACE VIEW public.kpi_custo_veiculo
WITH (security_invoker = true) AS
SELECT
  v.id AS veiculo_id,
  v.filial_id,
  v.placa,
  v.km_atual,
  COALESCE((SELECT SUM(valor_total) FROM public.abastecimentos WHERE veiculo_id = v.id),0) AS custo_abastecimento,
  COALESCE((SELECT SUM(custo) FROM public.manutencoes WHERE veiculo_id = v.id),0) AS custo_manutencao,
  COALESCE((SELECT SUM(valor_total) FROM public.abastecimentos WHERE veiculo_id = v.id),0)
    + COALESCE((SELECT SUM(custo) FROM public.manutencoes WHERE veiculo_id = v.id),0) AS custo_total,
  CASE WHEN v.km_atual > 0 THEN
    ROUND(((COALESCE((SELECT SUM(valor_total) FROM public.abastecimentos WHERE veiculo_id = v.id),0)
    + COALESCE((SELECT SUM(custo) FROM public.manutencoes WHERE veiculo_id = v.id),0)) / v.km_atual)::numeric, 2)
  ELSE 0 END AS custo_por_km
FROM public.veiculos v;

CREATE OR REPLACE VIEW public.kpi_ranking_motoristas
WITH (security_invoker = true) AS
SELECT
  m.id AS motorista_id,
  m.filial_id,
  m.nome,
  COUNT(a.id) AS abastecimentos,
  COALESCE(SUM(a.litros),0) AS litros_total,
  COALESCE(SUM(a.valor_total),0) AS gasto_total,
  ROUND(AVG(a.consumo_kml)::numeric, 2) AS consumo_medio_kml,
  (SELECT COUNT(*) FROM public.ocorrencias o WHERE o.motorista_id = m.id) AS ocorrencias
FROM public.motoristas m
LEFT JOIN public.abastecimentos a ON a.motorista_id = m.id
GROUP BY m.id, m.filial_id, m.nome;
