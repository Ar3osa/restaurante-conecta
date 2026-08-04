import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { validarNif } from "./nif";
import { DISTRITOS } from "./pt";

async function empresaDoUtilizador(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  return data ?? null;
}

export const obterMinhaEmpresa = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: empresa } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!empresa) return { empresa: null, saldo: 0 };
    const { data: carteira } = await supabase
      .from("wallets")
      .select("saldo")
      .eq("business_id", empresa.id)
      .maybeSingle();
    return { empresa, saldo: carteira?.saldo ?? 0 };
  });

export const criarEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        nome: z.string().trim().min(2).max(100),
        nif: z
          .string()
          .trim()
          .regex(/^[0-9]{9}$/, "NIF inválido"),
        tipo: z.enum(["restaurante", "bar", "cafe", "hotel", "catering", "outro"]),
        concelho: z.string().trim().min(2).max(80),
        morada: z.string().trim().max(160),
        descricao: z.string().trim().max(600),
        responsavel: z.string().trim().min(2).max(80),
        telefone: z.string().trim().min(6).max(20),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!validarNif(data.nif)) throw new Error("O NIF indicado não é válido.");
    const { supabase, userId } = context;

    const p = await supabase
      .from("profiles")
      .upsert(
        { id: userId, nome: data.responsavel, telefone: data.telefone },
        { onConflict: "id" },
      );
    if (p.error) throw new Error(p.error.message);

    const existente = await empresaDoUtilizador(supabase, userId);
    if (existente) {
      const { error } = await supabase
        .from("businesses")
        .update({
          nome: data.nome,
          tipo: data.tipo,
          concelho: data.concelho,
          morada: data.morada,
          descricao: data.descricao,
        })
        .eq("id", existente.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("businesses").insert({
        owner_id: userId,
        nome: data.nome,
        nif: data.nif,
        tipo: data.tipo,
        concelho: data.concelho,
        morada: data.morada,
        descricao: data.descricao,
      });
      if (error) {
        if (error.code === "23505")
          throw new Error("Já existe uma empresa registada com este NIF.");
        throw new Error(error.message);
      }
    }

    await supabase
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "empregador" as const },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
    return { ok: true };
  });

export type ResultadoTrabalhador = {
  user_id: string;
  nome_publico: string;
  titulo: string;
  bio: string;
  anos_experiencia: number;
  foco: string;
  skill_bartender: number;
  skill_servico_mesa: number;
  skill_backoffice: number;
  concelhos: string[];
  dias: string[];
  horarios: string[];
  procura_ativa: boolean;
  destaque_pago: boolean;
};

/** score = destaque pago (200) + procura ativa (100) + reputação (0–5) */
function pontuacaoRanking(
  w: { procura_ativa: boolean; destaque_pago: boolean },
  reputacao: number | null,
) {
  return (w.destaque_pago ? 200 : 0) + (w.procura_ativa ? 100 : 0) + (reputacao ?? 0);
}

async function reputacaoPorTrabalhador(
  supabase: SupabaseClient<Database>,
  workerIds: string[],
): Promise<Map<string, number>> {
  if (workerIds.length === 0) return new Map();
  const { data } = await supabase
    .from("worker_reputation")
    .select("worker_id, media")
    .in("worker_id", workerIds);
  return new Map(
    ((data ?? []) as { worker_id: string; media: number }[]).map((r) => [r.worker_id, r.media]),
  );
}

export const procurarTrabalhadores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        distrito: z.string().max(80).optional(),
        competencia: z.enum(["bartender", "servico_mesa", "backoffice"]).optional(),
        minimo: z.number().int().min(1).max(5).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let query = supabase
      .from("worker_profiles")
      .select(
        "user_id, nome_publico, titulo, bio, anos_experiencia, foco, skill_bartender, skill_servico_mesa, skill_backoffice, concelhos, dias, horarios, procura_ativa, destaque_pago",
      )
      .eq("visivel", true)
      .limit(60);

    if (data.distrito) {
      const concelhos = DISTRITOS[data.distrito] ?? [];
      if (concelhos.length === 0) return [];
      query = query.overlaps("concelhos", concelhos);
    }
    if (data.competencia && data.minimo) {
      const coluna =
        data.competencia === "bartender"
          ? "skill_bartender"
          : data.competencia === "servico_mesa"
            ? "skill_servico_mesa"
            : "skill_backoffice";
      query = query.gte(coluna, data.minimo);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const empresa = await empresaDoUtilizador(supabase, userId);
    let desbloqueados: string[] = [];
    if (empresa) {
      const { data: unlocks } = await supabase
        .from("contact_unlocks")
        .select("worker_id")
        .eq("business_id", empresa.id);
      desbloqueados = (unlocks ?? []).map((u: { worker_id: string }) => u.worker_id);
    }

    const lista = (rows ?? []).filter(
      (r: { user_id: string }) => r.user_id !== userId,
    ) as ResultadoTrabalhador[];
    const reputacoes = await reputacaoPorTrabalhador(
      supabase,
      lista.map((r) => r.user_id),
    );

    return lista
      .map((r) => ({
        ...r,
        desbloqueado: desbloqueados.includes(r.user_id),
        reputacao: reputacoes.get(r.user_id) ?? null,
      }))
      .sort((a, b) => pontuacaoRanking(b, b.reputacao) - pontuacaoRanking(a, a.reputacao));
  });

export const desbloquearContacto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ workerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const empresa = await empresaDoUtilizador(supabase, userId);
    if (!empresa) throw new Error("Ainda não registaste a tua empresa.");

    const { data: resultado, error } = await supabase.rpc("desbloquear_contacto", {
      _business_id: empresa.id,
      _worker_id: data.workerId,
    });
    if (error) throw new Error(error.message);
    const linha = Array.isArray(resultado) ? resultado[0] : resultado;
    return linha as { nome: string; telefone: string | null; email: string | null; saldo: number };
  });

export const listarContactosDesbloqueados = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const empresa = await empresaDoUtilizador(supabase, userId);
    if (!empresa) return [];
    const { data, error } = await supabase.rpc("contactos_desbloqueados", {
      _business_id: empresa.id,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as {
      worker_id: string;
      nome: string;
      telefone: string | null;
      email: string | null;
      created_at: string;
    }[];
  });

export const comprarCreditos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ creditos: z.number().int().min(1).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const empresa = await empresaDoUtilizador(supabase, userId);
    if (!empresa) throw new Error("Ainda não registaste a tua empresa.");
    const { data: saldo, error } = await supabase.rpc("comprar_creditos", {
      _business_id: empresa.id,
      _creditos: data.creditos,
    });
    if (error) throw new Error(error.message);
    return { saldo: saldo as number };
  });

export const historicoCreditos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const empresa = await empresaDoUtilizador(supabase, userId);
    if (!empresa) return [];
    const { data, error } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("business_id", empresa.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const criarOferta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        titulo: z.string().trim().min(3).max(100),
        funcao: z.enum(["bartender", "servico_mesa", "backoffice"]),
        concelho: z.string().trim().min(2).max(80),
        dataTurno: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        horaInicio: z.string().max(10),
        horaFim: z.string().max(10),
        remuneracaoMin: z.number().min(0).max(999).nullable(),
        remuneracaoMax: z.number().min(0).max(999).nullable(),
        descricao: z.string().trim().max(800),
      })
      .refine(
        (v) =>
          v.remuneracaoMin == null ||
          v.remuneracaoMax == null ||
          v.remuneracaoMin <= v.remuneracaoMax,
        { message: "O valor mínimo não pode ser maior que o máximo." },
      )
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const empresa = await empresaDoUtilizador(supabase, userId);
    if (!empresa) throw new Error("Ainda não registaste a tua empresa.");
    const { data: row, error } = await supabase
      .from("job_posts")
      .insert({
        business_id: empresa.id,
        titulo: data.titulo,
        funcao: data.funcao,
        concelho: data.concelho,
        data_turno: data.dataTurno,
        hora_inicio: data.horaInicio,
        hora_fim: data.horaFim,
        remuneracao_min: data.remuneracaoMin,
        remuneracao_max: data.remuneracaoMax,
        descricao: data.descricao,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const minhasOfertas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const empresa = await empresaDoUtilizador(supabase, userId);
    if (!empresa) return [];
    const { data, error } = await supabase
      .from("job_posts")
      .select("*, job_applications(id)")
      .eq("business_id", empresa.id)
      .order("data_turno", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const fecharOferta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("job_posts")
      .update({ estado: "fechada" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const candidaturasRecebidas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const empresa = await empresaDoUtilizador(supabase, userId);
    if (!empresa) return [];

    const { data: ofertas } = await supabase
      .from("job_posts")
      .select("id")
      .eq("business_id", empresa.id);
    const ids = (ofertas ?? []).map((o: { id: string }) => o.id);
    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from("job_applications")
      .select(
        "id, estado, mensagem, created_at, worker_id, confirmado_trabalhador, confirmado_empresa, job_posts(id, titulo, data_turno)",
      )
      .in("job_id", ids)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const workerIds = [...new Set((data ?? []).map((a: { worker_id: string }) => a.worker_id))];
    const applicationIds = (data ?? []).map((a: { id: string }) => a.id);
    const [{ data: perfis }, { data: avaliacoes }] = await Promise.all([
      supabase
        .from("worker_profiles")
        .select("user_id, nome_publico, titulo, foco")
        .in("user_id", workerIds),
      supabase
        .from("job_ratings")
        .select("job_application_id, rated_stars")
        .eq("rater_role", "empresa")
        .in("job_application_id", applicationIds),
    ]);

    const mapa = new Map((perfis ?? []).map((p: { user_id: string }) => [p.user_id, p]));
    const mapaAvaliacoes = new Map(
      (avaliacoes ?? []).map((a: { job_application_id: string; rated_stars: number }) => [
        a.job_application_id,
        a.rated_stars,
      ]),
    );
    return (data ?? []).map((a) => ({
      ...(a as unknown as {
        id: string;
        estado: string;
        mensagem: string;
        created_at: string;
        worker_id: string;
        confirmado_trabalhador: boolean;
        confirmado_empresa: boolean;
        job_posts: { id: string; titulo: string; data_turno: string } | null;
      }),
      trabalhador:
        (mapa.get((a as { worker_id: string }).worker_id) as unknown as {
          nome_publico: string;
          titulo: string;
          foco: string;
        }) ?? null,
      avaliacaoEnviada: mapaAvaliacoes.get((a as { id: string }).id) ?? null,
    }));
  });

export const atualizarCandidatura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ id: z.string().uuid(), estado: z.enum(["aceite", "recusada", "pendente"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("job_applications")
      .update({ estado: data.estado })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const impulsionarOferta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ jobId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const empresa = await empresaDoUtilizador(supabase, userId);
    if (!empresa) throw new Error("Ainda não registaste a tua empresa.");
    const { data: saldo, error } = await supabase.rpc("impulsionar_oferta", {
      _business_id: empresa.id,
      _job_id: data.jobId,
    });
    if (error) throw new Error(error.message);
    return { saldo: saldo as number };
  });

export const confirmarTurnoEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ applicationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("confirmar_turno", {
      _application_id: data.applicationId,
      _lado: "empresa",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const avaliarTrabalhador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        applicationId: z.string().uuid(),
        estrelas: z.number().int().min(1).max(5),
        comentario: z.string().trim().max(300),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("avaliar_turno", {
      _application_id: data.applicationId,
      _lado: "empresa",
      _estrelas: data.estrelas,
      _comentario: data.comentario,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
