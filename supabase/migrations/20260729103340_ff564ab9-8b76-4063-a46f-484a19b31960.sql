-- ENUMS
CREATE TYPE public.app_role AS ENUM ('trabalhador', 'empregador', 'admin');
CREATE TYPE public.business_type AS ENUM ('restaurante', 'bar', 'cafe', 'hotel', 'catering', 'outro');
CREATE TYPE public.job_role AS ENUM ('bartender', 'servico_mesa', 'backoffice');
CREATE TYPE public.job_status AS ENUM ('aberta', 'fechada');
CREATE TYPE public.application_status AS ENUM ('pendente', 'aceite', 'recusada');

-- UPDATED_AT HELPER
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  telefone text,
  email text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_roles_insert_own" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND role <> 'admin');

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- NEW USER TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- WORKER PROFILES
CREATE TABLE public.worker_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_publico text NOT NULL DEFAULT '',
  titulo text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  anos_experiencia smallint NOT NULL DEFAULT 0,
  foco public.job_role NOT NULL DEFAULT 'servico_mesa',
  skill_bartender smallint NOT NULL DEFAULT 1,
  skill_servico_mesa smallint NOT NULL DEFAULT 1,
  skill_backoffice smallint NOT NULL DEFAULT 1,
  concelhos text[] NOT NULL DEFAULT '{}',
  dias text[] NOT NULL DEFAULT '{}',
  horarios text[] NOT NULL DEFAULT '{}',
  procura_ativa boolean NOT NULL DEFAULT false,
  visivel boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT skill_bartender_range CHECK (skill_bartender BETWEEN 1 AND 5),
  CONSTRAINT skill_mesa_range CHECK (skill_servico_mesa BETWEEN 1 AND 5),
  CONSTRAINT skill_backoffice_range CHECK (skill_backoffice BETWEEN 1 AND 5)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_profiles TO authenticated;
GRANT ALL ON public.worker_profiles TO service_role;
ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worker_profiles_select_own" ON public.worker_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "worker_profiles_select_visible" ON public.worker_profiles FOR SELECT TO authenticated USING (visivel = true);
CREATE POLICY "worker_profiles_insert_own" ON public.worker_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "worker_profiles_update_own" ON public.worker_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER worker_profiles_updated_at BEFORE UPDATE ON public.worker_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- WORKER EXPERIENCE
CREATE TABLE public.worker_experience (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local text NOT NULL,
  funcao text NOT NULL,
  periodo text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_experience TO authenticated;
GRANT ALL ON public.worker_experience TO service_role;
ALTER TABLE public.worker_experience ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worker_experience_select_own" ON public.worker_experience FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "worker_experience_select_visible" ON public.worker_experience FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.worker_profiles wp WHERE wp.user_id = worker_experience.user_id AND wp.visivel = true));
CREATE POLICY "worker_experience_write_own" ON public.worker_experience FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- BUSINESSES
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  nif text NOT NULL UNIQUE,
  tipo public.business_type NOT NULL DEFAULT 'restaurante',
  concelho text NOT NULL,
  morada text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  verificado boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nif_formato CHECK (nif ~ '^[0-9]{9}$')
);
CREATE UNIQUE INDEX businesses_owner_unique ON public.businesses(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT SELECT ON public.businesses TO anon;
GRANT ALL ON public.businesses TO service_role;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "businesses_select_all" ON public.businesses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "businesses_write_own" ON public.businesses FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- WALLETS
CREATE TABLE public.wallets (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  saldo integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saldo_nao_negativo CHECK (saldo >= 0)
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets_select_own" ON public.wallets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = wallets.business_id AND b.owner_id = auth.uid()));
CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_business()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.wallets (business_id, saldo) VALUES (NEW.id, 3) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_business_created AFTER INSERT ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.handle_new_business();

-- CREDIT TRANSACTIONS
CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  creditos integer NOT NULL,
  descricao text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credit_transactions_select_own" ON public.credit_transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = credit_transactions.business_id AND b.owner_id = auth.uid()));

-- CONTACT UNLOCKS
CREATE TABLE public.contact_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  custo_creditos integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, worker_id)
);
GRANT SELECT ON public.contact_unlocks TO authenticated;
GRANT ALL ON public.contact_unlocks TO service_role;
ALTER TABLE public.contact_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_unlocks_select_own" ON public.contact_unlocks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = contact_unlocks.business_id AND b.owner_id = auth.uid())
         OR worker_id = auth.uid());

-- JOB POSTS
CREATE TABLE public.job_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  funcao public.job_role NOT NULL,
  titulo text NOT NULL,
  concelho text NOT NULL,
  data_turno date NOT NULL,
  hora_inicio text NOT NULL DEFAULT '',
  hora_fim text NOT NULL DEFAULT '',
  remuneracao numeric(8,2),
  descricao text NOT NULL DEFAULT '',
  estado public.job_status NOT NULL DEFAULT 'aberta',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_posts TO authenticated;
GRANT SELECT ON public.job_posts TO anon;
GRANT ALL ON public.job_posts TO service_role;
ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_posts_select_open" ON public.job_posts FOR SELECT TO anon, authenticated USING (estado = 'aberta');
CREATE POLICY "job_posts_select_own" ON public.job_posts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = job_posts.business_id AND b.owner_id = auth.uid()));
CREATE POLICY "job_posts_write_own" ON public.job_posts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = job_posts.business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = job_posts.business_id AND b.owner_id = auth.uid()));
CREATE TRIGGER job_posts_updated_at BEFORE UPDATE ON public.job_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- JOB APPLICATIONS
CREATE TABLE public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mensagem text NOT NULL DEFAULT '',
  estado public.application_status NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, worker_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_applications TO authenticated;
GRANT ALL ON public.job_applications TO service_role;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "applications_select_own_worker" ON public.job_applications FOR SELECT TO authenticated USING (worker_id = auth.uid());
CREATE POLICY "applications_select_business" ON public.job_applications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_posts j JOIN public.businesses b ON b.id = j.business_id
                 WHERE j.id = job_applications.job_id AND b.owner_id = auth.uid()));
CREATE POLICY "applications_insert_worker" ON public.job_applications FOR INSERT TO authenticated WITH CHECK (worker_id = auth.uid());
CREATE POLICY "applications_update_business" ON public.job_applications FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_posts j JOIN public.businesses b ON b.id = j.business_id
                 WHERE j.id = job_applications.job_id AND b.owner_id = auth.uid()))
  WITH CHECK (true);
CREATE POLICY "applications_delete_worker" ON public.job_applications FOR DELETE TO authenticated USING (worker_id = auth.uid());

-- CREDITOS: COMPRA SIMULADA
CREATE OR REPLACE FUNCTION public.comprar_creditos(_business_id uuid, _creditos integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE novo_saldo integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = _business_id AND b.owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para esta empresa';
  END IF;
  IF _creditos IS NULL OR _creditos < 1 OR _creditos > 500 THEN
    RAISE EXCEPTION 'Quantidade de créditos inválida';
  END IF;
  UPDATE public.wallets SET saldo = saldo + _creditos WHERE business_id = _business_id RETURNING saldo INTO novo_saldo;
  INSERT INTO public.credit_transactions (business_id, tipo, creditos, descricao)
  VALUES (_business_id, 'compra', _creditos, 'Compra simulada de créditos');
  RETURN novo_saldo;
END; $$;
REVOKE ALL ON FUNCTION public.comprar_creditos(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.comprar_creditos(uuid, integer) TO authenticated;

-- DESBLOQUEIO DE CONTACTO (atómico)
CREATE OR REPLACE FUNCTION public.desbloquear_contacto(_business_id uuid, _worker_id uuid)
RETURNS TABLE (nome text, telefone text, email text, saldo integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE saldo_atual integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = _business_id AND b.owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para esta empresa';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.worker_profiles wp WHERE wp.user_id = _worker_id AND wp.visivel = true) THEN
    RAISE EXCEPTION 'Trabalhador indisponível';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contact_unlocks cu WHERE cu.business_id = _business_id AND cu.worker_id = _worker_id) THEN
    UPDATE public.wallets SET saldo = saldo - 1 WHERE business_id = _business_id AND saldo >= 1 RETURNING wallets.saldo INTO saldo_atual;
    IF saldo_atual IS NULL THEN
      RAISE EXCEPTION 'Saldo de créditos insuficiente';
    END IF;
    INSERT INTO public.contact_unlocks (business_id, worker_id, custo_creditos) VALUES (_business_id, _worker_id, 1);
    INSERT INTO public.credit_transactions (business_id, tipo, creditos, descricao)
    VALUES (_business_id, 'gasto', -1, 'Desbloqueio de contacto');
  END IF;

  RETURN QUERY
    SELECT p.nome, p.telefone, p.email, (SELECT w.saldo FROM public.wallets w WHERE w.business_id = _business_id)
    FROM public.profiles p WHERE p.id = _worker_id;
END; $$;
REVOKE ALL ON FUNCTION public.desbloquear_contacto(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.desbloquear_contacto(uuid, uuid) TO authenticated;

-- CONTACTOS JÁ DESBLOQUEADOS
CREATE OR REPLACE FUNCTION public.contactos_desbloqueados(_business_id uuid)
RETURNS TABLE (worker_id uuid, nome text, telefone text, email text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = _business_id AND b.owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para esta empresa';
  END IF;
  RETURN QUERY
    SELECT cu.worker_id, p.nome, p.telefone, p.email, cu.created_at
    FROM public.contact_unlocks cu JOIN public.profiles p ON p.id = cu.worker_id
    WHERE cu.business_id = _business_id ORDER BY cu.created_at DESC;
END; $$;
REVOKE ALL ON FUNCTION public.contactos_desbloqueados(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.contactos_desbloqueados(uuid) TO authenticated;

CREATE INDEX idx_job_posts_concelho ON public.job_posts(concelho);
CREATE INDEX idx_job_posts_data ON public.job_posts(data_turno);
CREATE INDEX idx_worker_profiles_concelhos ON public.worker_profiles USING GIN (concelhos);