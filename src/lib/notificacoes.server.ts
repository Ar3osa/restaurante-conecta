// Criação de notificações (in-app + email). Só corre no servidor.
//
// Regra de ouro: notificar é sempre "best-effort". Se falhar o insert ou o email,
// regista-se o erro e segue-se — nunca se parte a ação principal (candidatar-se,
// aceitar alguém, avaliar) por causa de uma notificação.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

type TipoNotificacao = Database["public"]["Enums"]["notification_type"];

type NovaNotificacao = {
  userId: string;
  tipo: TipoNotificacao;
  titulo: string;
  corpo?: string;
  /** Caminho relativo dentro da app, ex.: "/trabalhador". */
  url?: string;
};

function urlBase() {
  return process.env.SITE_URL ?? "http://localhost:5173";
}

/**
 * Envia um email através da Resend (https://resend.com).
 * Sem RESEND_API_KEY definida, não envia nada — apenas regista no log.
 * Assim a app funciona na mesma em desenvolvimento, e os emails passam a sair
 * mal a chave seja configurada, sem alterar código.
 */
async function enviarEmail(para: string, assunto: string, corpo: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[email] RESEND_API_KEY não definida — email não enviado a ${para}: "${assunto}"`);
    return;
  }

  const remetente = process.env.EMAIL_REMETENTE ?? "Mesa <onboarding@resend.dev>";
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from: remetente, to: para, subject: assunto, text: corpo }),
  });

  if (!resposta.ok) {
    console.error(`[email] falhou (${resposta.status}): ${await resposta.text()}`);
  }
}

/** Cria a notificação in-app e envia o email correspondente. Nunca lança. */
export async function criarNotificacao(n: NovaNotificacao) {
  try {
    const { error } = await supabaseAdmin.from("notifications").insert({
      user_id: n.userId,
      tipo: n.tipo,
      titulo: n.titulo,
      corpo: n.corpo ?? "",
      url: n.url ?? "",
    });
    if (error) throw new Error(error.message);

    const { data: perfil } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", n.userId)
      .maybeSingle();

    if (perfil?.email) {
      const link = n.url ? `\n\n${urlBase()}${n.url}` : "";
      await enviarEmail(perfil.email, `Mesa — ${n.titulo}`, `${n.corpo ?? n.titulo}${link}`);
    }
  } catch (e) {
    console.error("[notificacoes] falhou:", e);
  }
}

type ContextoCandidatura = {
  workerId: string;
  ownerId: string;
  jobTitulo: string;
  empresaNome: string;
  workerNome: string;
};

/** Reúne num sítio só quem são as duas partes de uma candidatura e como se chamam. */
async function contextoCandidatura(applicationId: string): Promise<ContextoCandidatura | null> {
  const { data: candidatura } = await supabaseAdmin
    .from("job_applications")
    .select("worker_id, job_id")
    .eq("id", applicationId)
    .maybeSingle();
  if (!candidatura) return null;

  const { data: oferta } = await supabaseAdmin
    .from("job_posts")
    .select("titulo, business_id")
    .eq("id", candidatura.job_id)
    .maybeSingle();
  if (!oferta) return null;

  const [{ data: empresa }, { data: trabalhador }] = await Promise.all([
    supabaseAdmin
      .from("businesses")
      .select("owner_id, nome")
      .eq("id", oferta.business_id)
      .maybeSingle(),
    supabaseAdmin
      .from("worker_profiles")
      .select("nome_publico")
      .eq("user_id", candidatura.worker_id)
      .maybeSingle(),
  ]);
  if (!empresa) return null;

  return {
    workerId: candidatura.worker_id,
    ownerId: empresa.owner_id,
    jobTitulo: oferta.titulo,
    empresaNome: empresa.nome,
    workerNome: trabalhador?.nome_publico ?? "Um trabalhador",
  };
}

/** Alguém candidatou-se a um turno → avisa a casa que o publicou. */
export async function notificarCandidaturaRecebida(jobId: string, workerId: string) {
  try {
    const { data: oferta } = await supabaseAdmin
      .from("job_posts")
      .select("titulo, business_id")
      .eq("id", jobId)
      .maybeSingle();
    if (!oferta) return;

    const [{ data: empresa }, { data: trabalhador }] = await Promise.all([
      supabaseAdmin
        .from("businesses")
        .select("owner_id")
        .eq("id", oferta.business_id)
        .maybeSingle(),
      supabaseAdmin
        .from("worker_profiles")
        .select("nome_publico")
        .eq("user_id", workerId)
        .maybeSingle(),
    ]);
    if (!empresa) return;

    await criarNotificacao({
      userId: empresa.owner_id,
      tipo: "candidatura_recebida",
      titulo: "Nova candidatura",
      corpo: `${trabalhador?.nome_publico ?? "Um trabalhador"} candidatou-se ao turno "${oferta.titulo}".`,
      url: "/empresa",
    });
  } catch (e) {
    console.error("[notificacoes] candidatura recebida:", e);
  }
}

/** A casa aceitou ou recusou a candidatura → avisa o trabalhador. */
export async function notificarDecisaoCandidatura(
  applicationId: string,
  estado: "aceite" | "recusada",
) {
  try {
    const ctx = await contextoCandidatura(applicationId);
    if (!ctx) return;

    await criarNotificacao({
      userId: ctx.workerId,
      tipo: estado === "aceite" ? "candidatura_aceite" : "candidatura_recusada",
      titulo: estado === "aceite" ? "Candidatura aceite" : "Candidatura recusada",
      corpo:
        estado === "aceite"
          ? `${ctx.empresaNome} aceitou a tua candidatura ao turno "${ctx.jobTitulo}".`
          : `${ctx.empresaNome} não avançou com a tua candidatura ao turno "${ctx.jobTitulo}".`,
      url: "/trabalhador",
    });
  } catch (e) {
    console.error("[notificacoes] decisão de candidatura:", e);
  }
}

/** Um dos lados confirmou o turno → avisa o outro, que agora também tem de confirmar. */
export async function notificarTurnoConfirmado(
  applicationId: string,
  quemConfirmou: "trabalhador" | "empresa",
) {
  try {
    const ctx = await contextoCandidatura(applicationId);
    if (!ctx) return;

    const paraTrabalhador = quemConfirmou === "empresa";
    await criarNotificacao({
      userId: paraTrabalhador ? ctx.workerId : ctx.ownerId,
      tipo: "turno_confirmado",
      titulo: "Turno confirmado pela outra parte",
      corpo: `${paraTrabalhador ? ctx.empresaNome : ctx.workerNome} confirmou o turno "${ctx.jobTitulo}". Confirma também para poderem avaliar-se.`,
      url: paraTrabalhador ? "/trabalhador" : "/empresa",
    });
  } catch (e) {
    console.error("[notificacoes] turno confirmado:", e);
  }
}

/** Uma avaliação foi enviada → avisa quem foi avaliado. */
export async function notificarAvaliacaoRecebida(
  applicationId: string,
  avaliador: "trabalhador" | "empresa",
) {
  try {
    const ctx = await contextoCandidatura(applicationId);
    if (!ctx) return;

    // Quem avalia é o oposto de quem recebe a notificação.
    const paraTrabalhador = avaliador === "empresa";
    await criarNotificacao({
      userId: paraTrabalhador ? ctx.workerId : ctx.ownerId,
      tipo: "avaliacao_recebida",
      titulo: "Recebeste uma avaliação",
      corpo: `${paraTrabalhador ? ctx.empresaNome : ctx.workerNome} avaliou-te pelo turno "${ctx.jobTitulo}".`,
      url: paraTrabalhador ? "/trabalhador" : "/empresa",
    });
  } catch (e) {
    console.error("[notificacoes] avaliação recebida:", e);
  }
}
