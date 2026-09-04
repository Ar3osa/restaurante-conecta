-- NOTIFICAÇÕES IN-APP
CREATE TYPE public.notification_type AS ENUM (
  'candidatura_recebida',
  'candidatura_aceite',
  'candidatura_recusada',
  'turno_confirmado',
  'avaliacao_recebida'
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo public.notification_type NOT NULL,
  titulo text NOT NULL,
  corpo text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  lida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Cada pessoa só vê e só marca como lidas as suas próprias notificações.
-- A criação é feita pelo servidor (service role), nunca pelo cliente.
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_notifications_user ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_nao_lidas ON public.notifications (user_id) WHERE lida = false;
