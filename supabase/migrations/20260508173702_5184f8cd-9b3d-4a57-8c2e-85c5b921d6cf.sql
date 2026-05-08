
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'motorista');
CREATE TYPE public.veiculo_status AS ENUM ('ativo', 'inativo', 'manutencao', 'vendido');
CREATE TYPE public.veiculo_tipo AS ENUM ('carro', 'caminhao', 'moto', 'van', 'onibus', 'maquina', 'outro');

-- FILIAIS
CREATE TABLE public.filiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  cidade TEXT,
  estado TEXT,
  endereco TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  email TEXT,
  telefone TEXT,
  avatar_url TEXT,
  filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USER_ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  filial_id UUID REFERENCES public.filiais(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, filial_id)
);

-- Security definer function for role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: current user's filial
CREATE OR REPLACE FUNCTION public.current_filial_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT filial_id FROM public.profiles WHERE id = auth.uid()
$$;

-- VEICULOS
CREATE TABLE public.veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id UUID NOT NULL REFERENCES public.filiais(id) ON DELETE RESTRICT,
  placa TEXT NOT NULL,
  renavam TEXT,
  chassi TEXT,
  marca TEXT,
  modelo TEXT,
  ano INTEGER,
  cor TEXT,
  tipo veiculo_tipo NOT NULL DEFAULT 'carro',
  combustivel TEXT,
  km_atual INTEGER NOT NULL DEFAULT 0,
  status veiculo_status NOT NULL DEFAULT 'ativo',
  crlv_validade DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (placa)
);

-- MOTORISTAS
CREATE TABLE public.motoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id UUID NOT NULL REFERENCES public.filiais(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  cpf TEXT,
  cnh TEXT,
  cnh_categoria TEXT,
  cnh_validade DATE,
  telefone TEXT,
  email TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_filiais_updated BEFORE UPDATE ON public.filiais FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_veiculos_updated BEFORE UPDATE ON public.veiculos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_motoristas_updated BEFORE UPDATE ON public.motoristas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ENABLE RLS
ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;

-- POLICIES: profiles
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- POLICIES: user_roles (only admin can manage; user can read own)
CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- POLICIES: filiais (todos autenticados leem; admin gerencia)
CREATE POLICY "filiais_select_authenticated" ON public.filiais
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "filiais_admin_all" ON public.filiais
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- POLICIES: veiculos (admin tudo; gestor mesma filial; motorista lê mesma filial)
CREATE POLICY "veiculos_select_filial" ON public.veiculos
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR filial_id = public.current_filial_id()
  );

CREATE POLICY "veiculos_insert_admin_gestor" ON public.veiculos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'gestor') AND filial_id = public.current_filial_id())
  );

CREATE POLICY "veiculos_update_admin_gestor" ON public.veiculos
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'gestor') AND filial_id = public.current_filial_id())
  );

CREATE POLICY "veiculos_delete_admin" ON public.veiculos
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- POLICIES: motoristas
CREATE POLICY "motoristas_select_filial" ON public.motoristas
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR filial_id = public.current_filial_id()
  );

CREATE POLICY "motoristas_insert_admin_gestor" ON public.motoristas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'gestor') AND filial_id = public.current_filial_id())
  );

CREATE POLICY "motoristas_update_admin_gestor" ON public.motoristas
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'gestor') AND filial_id = public.current_filial_id())
  );

CREATE POLICY "motoristas_delete_admin" ON public.motoristas
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
