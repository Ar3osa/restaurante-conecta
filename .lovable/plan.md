# Plataforma de trabalho para restauração em Portugal

Marketplace de dois lados: trabalhadores criam perfil com auto-avaliação de competências e zonas de trabalho; restaurantes/bares registam-se com NIF, publicam turnos ou pesquisam pessoas e pagam (por agora, crédito simulado) para desbloquear o contacto de um trabalhador.

Interface totalmente em português de Portugal. Login por email/password + Google.

## Backend (Lovable Cloud)

Ativo a Cloud para base de dados, autenticação e ficheiros.

Tabelas principais:
- `profiles` — dados base de qualquer utilizador (nome, telefone, email, avatar)
- `user_roles` — papel (`trabalhador` | `empregador` | `admin`) em tabela separada, por segurança
- `worker_profiles` — bio, disponibilidade (dias/horários), anos de experiência, foco principal, flag `procura_ativa` (subscrição), visibilidade
- `worker_skills` — avaliação 1–5 estrelas por competência: **Bartender**, **Serviço à mesa**, **Backoffice**
- `worker_areas` — concelhos/distritos onde pretende trabalhar (lista oficial de concelhos de Portugal incluída na migração)
- `worker_experience` — passagens anteriores (local, função, período)
- `businesses` — nome, NIF (validado), morada, concelho, tipo (restaurante/bar/hotel), descrição, estado de verificação
- `job_posts` — necessidade de trabalho: função, concelho, data/horário do turno, duração, remuneração, descrição, estado
- `job_applications` — candidaturas do trabalhador a um turno
- `contact_unlocks` — registo de que empresa desbloqueou que trabalhador, custo e data
- `wallets` / `credit_transactions` — saldo de créditos da empresa e histórico (compras simuladas, gastos)

Regras de acesso (RLS): cada utilizador só edita o que é seu; perfis de trabalhador visíveis para empresas **sem contactos** (telefone/email só após desbloqueio); ofertas públicas para leitura; carteiras e desbloqueios só do próprio negócio. Os contactos nunca chegam ao browser sem desbloqueio — são devolvidos por função de servidor que verifica o registo em `contact_unlocks`.

Validação de NIF portuguesa (9 dígitos + dígito de controlo) no cliente e no servidor.

## Ecrãs

- `/` — landing bilateral: proposta de valor, como funciona, CTAs "Sou trabalhador" / "Sou restaurante/bar"
- `/auth` — entrar/registar com email+password e Google, com escolha de papel
- `/onboarding/trabalhador` — passos: dados pessoais → competências (estrelas) → concelhos → disponibilidade e foco → experiência
- `/onboarding/empresa` — dados da empresa + NIF validado
- `/trabalhador/painel` — perfil, estado de visibilidade, candidaturas, ofertas recomendadas, plano "procura ativa"
- `/ofertas` — lista pública de turnos com filtros (concelho, função, data, remuneração)
- `/ofertas/$id` — detalhe + candidatura
- `/empresa/painel` — resumo, saldo de créditos, ofertas publicadas, candidaturas recebidas, contactos desbloqueados
- `/empresa/ofertas/nova` — publicar necessidade de turno
- `/empresa/procurar` — pesquisa de trabalhadores com filtros (concelho, competência mínima em estrelas, disponibilidade), cartões sem contacto e botão "Desbloquear contacto — 1 crédito"
- `/empresa/creditos` — compra simulada de pacotes de créditos e histórico

## Monetização (simulada nesta fase)

- Trabalhador: conta e perfil grátis. Plano "Procura Ativa" (destaque nas pesquisas, candidaturas ilimitadas, alertas) ativável sem cobrança real, com etiqueta clara de modo de demonstração.
- Empresa: 1 crédito = 1€ = 1 desbloqueio de contacto. Pacotes de créditos adicionados instantaneamente ao saldo, com histórico. Desbloques repetidos do mesmo trabalhador não voltam a cobrar.
- Toda a lógica de cobrança fica isolada para que a ligação a Stripe/Paddle seja depois uma troca localizada.

## Design

Direção visual própria da restauração portuguesa: tons quentes (terracota/carvão/creme), tipografia com carácter, cartões densos e legíveis em telemóvel (é onde os trabalhadores vão estar). Sem gradientes roxos genéricos. Tudo em tokens semânticos no design system.

## Notas técnicas

- Autenticação Google via broker da Lovable; papel do utilizador guardado em `user_roles` com função `has_role` security-definer.
- Rotas protegidas sob `_authenticated`; leituras públicas (ofertas, landing) por funções de servidor com chave publicável.
- Contactos, saldo e desbloqueios sempre por `createServerFn` autenticada — nunca calculados no cliente.
- Concelhos e competências semeados por migração com dados literais.
- SEO por rota: títulos e descrições próprios, JSON-LD `JobPosting` nas ofertas.

## Fora de âmbito nesta fase

Pagamentos reais, avaliações mútuas pós-turno, chat interno, contratos/recibos, app móvel nativa.
