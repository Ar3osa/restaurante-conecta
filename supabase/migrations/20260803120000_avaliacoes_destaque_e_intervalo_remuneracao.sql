-- INTERVALO DE REMUNERAÇÃO (substitui o valor único por turno)
ALTER TABLE public.job_posts ADD COLUMN remuneracao_min numeric(8,2);
ALTER TABLE public.job_posts ADD COLUMN remuneracao_max numeric(8,2);
UPDATE public.job_posts SET remuneracao_min = remuneracao, remuneracao_max = remuneracao WHERE remuneracao IS NOT NULL;
ALTER TABLE public.job_posts DROP COLUMN remuneracao;
ALTER TABLE public.job_posts ADD CONSTRAINT remuneracao_intervalo_valido
  CHECK (remuneracao_min IS NULL OR remuneracao_max IS NULL OR remuneracao_min <= remuneracao_max);

-- IMPULSO PAGO DE OFERTAS (ranking em /ofertas)
ALTER TABLE public.job_posts ADD COLUMN destacada boolean NOT NULL DEFAULT false;

-- DESTAQUE PAGO DE TRABALHADOR (ranking em /empresa/procurar e /trabalhadores, simulado)
ALTER TABLE public.worker_profiles ADD COLUMN destaque_pago boolean NOT NULL DEFAULT false;

-- CONFIRMAÇÃO MÚTUA DE TURNO REALIZADO (pré-requisito da avaliação)
ALTER TABLE public.job_applications ADD COLUMN confirmado_trabalhador boolean NOT NULL DEFAULT false;
ALTER TABLE public.job_applications ADD COLUMN confirmado_empresa boolean NOT NULL DEFAULT false;

-- AVALIAÇÕES MÚTUAS PÓS-TURNO
CREATE TYPE public.rater_role AS ENUM ('trabalhador', 'empresa');

CREATE TABLE public.job_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_application_id uuid NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  rater_role public.rater_role NOT NULL,
  rated_stars smallint NOT NULL,
  comentario text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rated_stars_range CHECK (rated_stars BETWEEN 1 AND 5),
  UNIQUE (job_application_id, rater_role)
);
GRANT SELECT ON public.job_ratings TO authenticated;
GRANT ALL ON public.job_ratings TO service_role;
ALTER TABLE public.job_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_ratings_select_participantes" ON public.job_ratings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.job_applications ja
    JOIN public.job_posts j ON j.id = ja.job_id
    JOIN public.businesses b ON b.id = j.business_id
    WHERE ja.id = job_ratings.job_application_id
      AND (ja.worker_id = auth.uid() OR b.owner_id = auth.uid())
  ));

-- REPUTAÇÃO AGREGADA DO TRABALHADOR (média das avaliações recebidas das empresas)
CREATE VIEW public.worker_reputation AS
  SELECT ja.worker_id, avg(jr.rated_stars)::numeric(3,2) AS media, count(*)::integer AS total
  FROM public.job_ratings jr
  JOIN public.job_applications ja ON ja.id = jr.job_application_id
  WHERE jr.rater_role = 'empresa'
  GROUP BY ja.worker_id;
GRANT SELECT ON public.worker_reputation TO anon, authenticated;

-- CONFIRMAR TURNO REALIZADO (um lado de cada vez)
CREATE OR REPLACE FUNCTION public.confirmar_turno(_application_id uuid, _lado public.rater_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _lado = 'trabalhador' THEN
    UPDATE public.job_applications SET confirmado_trabalhador = true
      WHERE id = _application_id AND worker_id = auth.uid() AND estado = 'aceite';
  ELSE
    UPDATE public.job_applications ja SET confirmado_empresa = true
      FROM public.job_posts j, public.businesses b
      WHERE ja.id = _application_id AND j.id = ja.job_id AND b.id = j.business_id
        AND b.owner_id = auth.uid() AND ja.estado = 'aceite';
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sem permissão para confirmar este turno';
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.confirmar_turno(uuid, public.rater_role) FROM public;
GRANT EXECUTE ON FUNCTION public.confirmar_turno(uuid, public.rater_role) TO authenticated;

-- AVALIAR A OUTRA PARTE (só depois de ambos confirmarem)
CREATE OR REPLACE FUNCTION public.avaliar_turno(
  _application_id uuid, _lado public.rater_role, _estrelas smallint, _comentario text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE autorizado boolean;
BEGIN
  IF _estrelas < 1 OR _estrelas > 5 THEN
    RAISE EXCEPTION 'Classificação inválida';
  END IF;

  IF _lado = 'trabalhador' THEN
    SELECT (worker_id = auth.uid() AND confirmado_trabalhador AND confirmado_empresa)
      INTO autorizado FROM public.job_applications WHERE id = _application_id;
  ELSE
    SELECT (b.owner_id = auth.uid() AND ja.confirmado_trabalhador AND ja.confirmado_empresa)
      INTO autorizado
      FROM public.job_applications ja
      JOIN public.job_posts j ON j.id = ja.job_id
      JOIN public.businesses b ON b.id = j.business_id
      WHERE ja.id = _application_id;
  END IF;

  IF autorizado IS NOT TRUE THEN
    RAISE EXCEPTION 'Turno ainda não confirmado por ambas as partes';
  END IF;

  INSERT INTO public.job_ratings (job_application_id, rater_role, rated_stars, comentario)
  VALUES (_application_id, _lado, _estrelas, COALESCE(_comentario, ''))
  ON CONFLICT (job_application_id, rater_role)
  DO UPDATE SET rated_stars = excluded.rated_stars, comentario = excluded.comentario;
END; $$;
REVOKE ALL ON FUNCTION public.avaliar_turno(uuid, public.rater_role, smallint, text) FROM public;
GRANT EXECUTE ON FUNCTION public.avaliar_turno(uuid, public.rater_role, smallint, text) TO authenticated;

-- IMPULSIONAR OFERTA (2 créditos, atómico)
CREATE OR REPLACE FUNCTION public.impulsionar_oferta(_business_id uuid, _job_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE novo_saldo integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = _business_id AND b.owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para esta empresa';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.job_posts j
    WHERE j.id = _job_id AND j.business_id = _business_id AND j.estado = 'aberta' AND j.destacada = false
  ) THEN
    RAISE EXCEPTION 'Esta oferta não pode ser impulsionada';
  END IF;

  UPDATE public.wallets SET saldo = saldo - 2 WHERE business_id = _business_id AND saldo >= 2
    RETURNING saldo INTO novo_saldo;
  IF novo_saldo IS NULL THEN
    RAISE EXCEPTION 'Saldo de créditos insuficiente';
  END IF;

  UPDATE public.job_posts SET destacada = true WHERE id = _job_id;
  INSERT INTO public.credit_transactions (business_id, tipo, creditos, descricao)
  VALUES (_business_id, 'gasto', -2, 'Impulso de oferta');

  RETURN novo_saldo;
END; $$;
REVOKE ALL ON FUNCTION public.impulsionar_oferta(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.impulsionar_oferta(uuid, uuid) TO authenticated;
