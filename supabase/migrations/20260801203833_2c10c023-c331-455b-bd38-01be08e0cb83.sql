
-- Permitir perfis de demonstração sem conta de autenticação associada
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.worker_profiles DROP CONSTRAINT IF EXISTS worker_profiles_user_id_fkey;
ALTER TABLE public.worker_experience DROP CONSTRAINT IF EXISTS worker_experience_user_id_fkey;
ALTER TABLE public.contact_unlocks DROP CONSTRAINT IF EXISTS contact_unlocks_worker_id_fkey;

ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS demo boolean NOT NULL DEFAULT false;

INSERT INTO public.profiles (id, nome, telefone, email, avatar_url) VALUES
 ('11111111-1111-4111-8111-000000000001','Rita Fonseca','+351 912 445 118','rita.fonseca@exemplo.pt',null),
 ('11111111-1111-4111-8111-000000000002','Tiago Marques','+351 936 220 741','tiago.marques@exemplo.pt',null),
 ('11111111-1111-4111-8111-000000000003','Inês Carvalho','+351 927 883 015','ines.carvalho@exemplo.pt',null),
 ('11111111-1111-4111-8111-000000000004','Bruno Salgado','+351 961 507 332','bruno.salgado@exemplo.pt',null),
 ('11111111-1111-4111-8111-000000000005','Carolina Nunes','+351 913 998 204','carolina.nunes@exemplo.pt',null),
 ('11111111-1111-4111-8111-000000000006','Miguel Antunes','+351 939 114 662','miguel.antunes@exemplo.pt',null),
 ('11111111-1111-4111-8111-000000000007','Sofia Bernardo','+351 924 671 380','sofia.bernardo@exemplo.pt',null),
 ('11111111-1111-4111-8111-000000000008','André Pinheiro','+351 967 342 519','andre.pinheiro@exemplo.pt',null)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.worker_profiles
 (user_id, nome_publico, titulo, bio, anos_experiencia, foco, skill_bartender, skill_servico_mesa, skill_backoffice, concelhos, dias, horarios, procura_ativa, visivel, demo) VALUES
 ('11111111-1111-4111-8111-000000000001','Rita F.','Bartender de cocktails de autor','Sete anos entre bares de hotel e coquetelaria de autor. Confortável com serviço de alto volume ao fim de semana.',7,'bartender',5,4,2,ARRAY['Lisboa','Oeiras','Cascais'],ARRAY['Quinta','Sexta','Sábado'],ARRAY['Jantar','Noite / Madrugada'],true,true,true),
 ('11111111-1111-4111-8111-000000000002','Tiago M.','Empregado de mesa · sala fina','Experiência em restaurantes de carta longa e serviço de vinhos. Inglês e francês fluentes.',9,'servico_mesa',3,5,3,ARRAY['Porto','Matosinhos','Gaia (Vila Nova de Gaia)'],ARRAY['Terça','Quarta','Quinta','Sexta'],ARRAY['Almoço','Jantar'],true,true,true),
 ('11111111-1111-4111-8111-000000000003','Inês C.','Backoffice e economato','Gestão de stocks, encomendas e fecho de caixa. Habituada a operações com três turnos.',5,'backoffice',2,3,5,ARRAY['Braga','Guimarães','Vila Nova de Famalicão'],ARRAY['Segunda','Terça','Quarta','Quinta','Sexta'],ARRAY['Manhã','Tarde'],false,true,true),
 ('11111111-1111-4111-8111-000000000004','Bruno S.','Bartender e chefe de turno','Bar de praia no verão e cocktail bar no inverno. Monta equipa e faz escalas.',11,'bartender',5,4,4,ARRAY['Albufeira','Portimão','Lagos','Loulé'],ARRAY['Sexta','Sábado','Domingo'],ARRAY['Tarde','Jantar','Noite / Madrugada'],true,true,true),
 ('11111111-1111-4111-8111-000000000005','Carolina N.','Serviço à mesa · brunch e esplanada','Rápida em serviço de esplanada e take-away. Disponibilidade imediata para turnos extra.',3,'servico_mesa',2,4,3,ARRAY['Lisboa','Almada','Seixal'],ARRAY['Sábado','Domingo'],ARRAY['Manhã','Almoço'],true,true,true),
 ('11111111-1111-4111-8111-000000000006','Miguel A.','Copa e apoio de cozinha','Trabalho de copa, mise en place e apoio de cozinha em casas com 120 lugares.',4,'backoffice',1,3,4,ARRAY['Coimbra','Figueira da Foz'],ARRAY['Quinta','Sexta','Sábado'],ARRAY['Jantar','Noite / Madrugada'],false,true,true),
 ('11111111-1111-4111-8111-000000000007','Sofia B.','Empregada de mesa e caixa','Atendimento e caixa em cafetaria e pastelaria. Muito à vontade com clientes habituais.',6,'servico_mesa',3,5,4,ARRAY['Setúbal','Palmela','Montijo'],ARRAY['Segunda','Terça','Quarta','Quinta','Sexta'],ARRAY['Manhã','Almoço','Tarde'],false,true,true),
 ('11111111-1111-4111-8111-000000000008','André P.','Bartender de eventos e catering','Bares de eventos, casamentos e festivais. Habituado a montagem e desmontagem.',8,'bartender',4,4,3,ARRAY['Aveiro','Ovar','Santa Maria da Feira','Espinho'],ARRAY['Sexta','Sábado','Domingo'],ARRAY['Tarde','Jantar','Noite / Madrugada'],true,true,true)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.worker_experience (user_id, local, funcao, periodo, descricao) VALUES
 ('11111111-1111-4111-8111-000000000001','Bar do Hotel Avenida','Bartender','2021 — 2024','Carta de assinatura e serviço de rooftop.'),
 ('11111111-1111-4111-8111-000000000001','Taberna do Cais','Bartender','2018 — 2021','Serviço de balcão em alto volume.'),
 ('11111111-1111-4111-8111-000000000002','Restaurante Douro Alto','Chefe de sala','2019 — 2025','Coordenação de sala de 90 lugares.'),
 ('11111111-1111-4111-8111-000000000003','Grupo Minho Mesa','Backoffice','2020 — 2025','Stocks, encomendas e fecho diário.'),
 ('11111111-1111-4111-8111-000000000004','Beach Club Falésia','Chefe de bar','2016 — 2025','Equipa de 6 pessoas em época alta.'),
 ('11111111-1111-4111-8111-000000000005','Brunch House Chiado','Empregada de mesa','2022 — 2025','Serviço de esplanada e brunch.'),
 ('11111111-1111-4111-8111-000000000006','Casa da Praça','Copa e apoio','2021 — 2025','Mise en place e apoio de cozinha.'),
 ('11111111-1111-4111-8111-000000000007','Pastelaria Sado','Balcão e caixa','2019 — 2025','Atendimento e gestão de caixa.'),
 ('11111111-1111-4111-8111-000000000008','Eventos Ria Catering','Bartender','2017 — 2025','Bares de eventos até 400 convidados.');
