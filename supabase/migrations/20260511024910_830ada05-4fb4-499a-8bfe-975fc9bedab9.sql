
-- ENUMS
CREATE TYPE manutencao_tipo AS ENUM ('preventiva','corretiva','revisao','troca_oleo','outro');
CREATE TYPE manutencao_status AS ENUM ('agendada','em_andamento','concluida','cancelada');
CREATE TYPE pneu_status AS ENUM ('em_uso','estoque','recapagem','descartado');
CREATE TYPE checklist_status AS ENUM ('aprovado','reprovado','pendente');

-- ABASTECIMENTOS
CREATE TABLE public.abastecimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id uuid NOT NULL,
  veiculo_id uuid NOT NULL,
  motorista_id uuid,
  data timestamptz NOT NULL DEFAULT now(),
  km integer NOT NULL,
  litros numeric(10,3) NOT NULL,
  valor_litro numeric(10,3) NOT NULL,
  valor_total numeric(12,2) NOT NULL,
  combustivel text,
  posto text,
  consumo_kml numeric(10,2),
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_abastec_veic_data ON public.abastecimentos(veiculo_id, data DESC);
CREATE INDEX idx_abastec_filial ON public.abastecimentos(filial_id);

-- MANUTENCOES
CREATE TABLE public.manutencoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id uuid NOT NULL,
  veiculo_id uuid NOT NULL,
  tipo manutencao_tipo NOT NULL DEFAULT 'preventiva',
  status manutencao_status NOT NULL DEFAULT 'agendada',
  descricao text NOT NULL,
  data_prevista date,
  data_realizada date,
  km_realizacao integer,
  km_proxima integer,
  custo numeric(12,2),
  fornecedor text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_manut_veic ON public.manutencoes(veiculo_id);
CREATE INDEX idx_manut_filial_status ON public.manutencoes(filial_id, status);

-- PNEUS
CREATE TABLE public.pneus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id uuid NOT NULL,
  veiculo_id uuid,
  numero_serie text,
  marca text,
  modelo text,
  medida text,
  dot text,
  posicao text,
  km_instalacao integer,
  km_atual integer,
  status pneu_status NOT NULL DEFAULT 'estoque',
  data_compra date,
  custo numeric(12,2),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pneus_filial ON public.pneus(filial_id);
CREATE INDEX idx_pneus_veic ON public.pneus(veiculo_id);

CREATE TABLE public.rodizios_pneus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id uuid NOT NULL,
  pneu_id uuid NOT NULL,
  veiculo_id uuid,
  posicao_anterior text,
  posicao_nova text,
  km integer,
  data date NOT NULL DEFAULT CURRENT_DATE,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rodizio_pneu ON public.rodizios_pneus(pneu_id);

-- CHECKLISTS
CREATE TABLE public.checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id uuid NOT NULL,
  veiculo_id uuid NOT NULL,
  motorista_id uuid,
  data timestamptz NOT NULL DEFAULT now(),
  km integer,
  status checklist_status NOT NULL DEFAULT 'pendente',
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklist_veic ON public.checklists(veiculo_id, data DESC);
CREATE INDEX idx_checklist_filial ON public.checklists(filial_id);

-- updated_at triggers
CREATE TRIGGER trg_abastec_upd BEFORE UPDATE ON public.abastecimentos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_manut_upd BEFORE UPDATE ON public.manutencoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_pneus_upd BEFORE UPDATE ON public.pneus FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_checklist_upd BEFORE UPDATE ON public.checklists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto KM + consumo no abastecimento
CREATE OR REPLACE FUNCTION public.handle_abastecimento()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _prev_km integer;
  _prev_data timestamptz;
  _veic_km integer;
BEGIN
  -- valor_total
  IF NEW.valor_total IS NULL OR NEW.valor_total = 0 THEN
    NEW.valor_total := ROUND((NEW.litros * NEW.valor_litro)::numeric, 2);
  END IF;

  -- consumo: km desde o último abastecimento / litros atuais
  SELECT km, data INTO _prev_km, _prev_data
  FROM public.abastecimentos
  WHERE veiculo_id = NEW.veiculo_id AND data < NEW.data
  ORDER BY data DESC LIMIT 1;

  IF _prev_km IS NOT NULL AND NEW.km > _prev_km AND NEW.litros > 0 THEN
    NEW.consumo_kml := ROUND(((NEW.km - _prev_km)::numeric / NEW.litros)::numeric, 2);
  END IF;

  -- atualiza KM do veículo se for maior
  SELECT km_atual INTO _veic_km FROM public.veiculos WHERE id = NEW.veiculo_id;
  IF NEW.km > COALESCE(_veic_km, 0) THEN
    UPDATE public.veiculos SET km_atual = NEW.km WHERE id = NEW.veiculo_id;
  END IF;

  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_abastecimento_calc
BEFORE INSERT OR UPDATE ON public.abastecimentos
FOR EACH ROW EXECUTE FUNCTION public.handle_abastecimento();

-- RLS
ALTER TABLE public.abastecimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pneus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rodizios_pneus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

-- Helper macro: cada tabela tem 4 policies (select_filial, insert_admin_gestor, update_admin_gestor, delete_admin)
-- ABASTECIMENTOS
CREATE POLICY abastec_select ON public.abastecimentos FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR filial_id = current_filial_id());
CREATE POLICY abastec_insert ON public.abastecimentos FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR (has_role(auth.uid(),'gestor') AND filial_id = current_filial_id()) OR (has_role(auth.uid(),'motorista') AND filial_id = current_filial_id()));
CREATE POLICY abastec_update ON public.abastecimentos FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR (has_role(auth.uid(),'gestor') AND filial_id = current_filial_id()));
CREATE POLICY abastec_delete ON public.abastecimentos FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

-- MANUTENCOES
CREATE POLICY manut_select ON public.manutencoes FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR filial_id = current_filial_id());
CREATE POLICY manut_insert ON public.manutencoes FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR (has_role(auth.uid(),'gestor') AND filial_id = current_filial_id()));
CREATE POLICY manut_update ON public.manutencoes FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR (has_role(auth.uid(),'gestor') AND filial_id = current_filial_id()));
CREATE POLICY manut_delete ON public.manutencoes FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

-- PNEUS
CREATE POLICY pneus_select ON public.pneus FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR filial_id = current_filial_id());
CREATE POLICY pneus_insert ON public.pneus FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR (has_role(auth.uid(),'gestor') AND filial_id = current_filial_id()));
CREATE POLICY pneus_update ON public.pneus FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR (has_role(auth.uid(),'gestor') AND filial_id = current_filial_id()));
CREATE POLICY pneus_delete ON public.pneus FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

-- RODIZIOS
CREATE POLICY rod_select ON public.rodizios_pneus FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR filial_id = current_filial_id());
CREATE POLICY rod_insert ON public.rodizios_pneus FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR (has_role(auth.uid(),'gestor') AND filial_id = current_filial_id()));
CREATE POLICY rod_delete ON public.rodizios_pneus FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

-- CHECKLISTS
CREATE POLICY check_select ON public.checklists FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR filial_id = current_filial_id());
CREATE POLICY check_insert ON public.checklists FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR filial_id = current_filial_id());
CREATE POLICY check_update ON public.checklists FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR (has_role(auth.uid(),'gestor') AND filial_id = current_filial_id()) OR (created_by = auth.uid()));
CREATE POLICY check_delete ON public.checklists FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));
