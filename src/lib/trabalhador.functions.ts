import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const perfilSchema = z.object({
  nome: z.string().trim().min(2).max(80),
  telefone: z.string().trim().min(6).max(20),
  nomePublico: z.string().trim().min(2).max(60),
  titulo: z.string().trim().max(80),
  bio: z.string().trim().max(800),
  anosExperiencia: z.number().int().min(0).max(50),
  foco: z.enum(["bartender", "servico_mesa", "backoffice"]),
  skillBartender: z.number().int().min(1).max(5),
  skillServicoMesa: z.number().int().min(1).max(5),
  skillBackoffice: z.number().int().min(1).max(5),
  concelhos: z.array(z.string().max(80)).min(1).max(20),
  dias: z.array(z.string().max(20)).max(7),
  horarios: z.array(z.string().max(30)).max(6),
  visivel: z.boolean(),
});

export const obterMeuPerfilTrabalhador = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [perfil, worker, experiencia] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("worker_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("worker_experience").select("*").eq("user_id", userId).order("created_at"),
    ]);
    return {
      perfil: perfil.data,
      trabalhador: worker.data,
      experiencia: experiencia.data ?? [],
    };
  });

export const guardarPerfilTrabalhador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => perfilSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const p = await supabase
      .from("profiles")
      .upsert({ id: userId, nome: data.nome, telefone: data.telefone }, { onConflict: "id" });
    if (p.error) throw new Error(p.error.message);

    const w = await supabase.from("worker_profiles").upsert(
      {
        user_id: userId,
        nome_publico: data.nomePublico,
        titulo: data.titulo,
        bio: data.bio,
        anos_experiencia: data.anosExperiencia,
        foco: data.foco,
        skill_bartender: data.skillBartender,
        skill_servico_mesa: data.skillServicoMesa,
        skill_backoffice: data.skillBackoffice,
        concelhos: data.concelhos,
        dias: data.dias,
        horarios: data.horarios,
        visivel: data.visivel,
      },
      { onConflict: "user_id" },
    );
    if (w.error) throw new Error(w.error.message);

    await supabase.from("user_roles").upsert(
      { user_id: userId, role: "trabalhador" as const },
      { onConflict: "user_id,role", ignoreDuplicates: true },
    );

    return { ok: true };
  });

export const definirProcuraAtiva = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ ativa: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("worker_profiles")
      .update({ procura_ativa: data.ativa })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ativa: data.ativa };
  });

export const adicionarExperiencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        local: z.string().trim().min(2).max(80),
        funcao: z.string().trim().min(2).max(80),
        periodo: z.string().trim().max(40),
        descricao: z.string().trim().max(400),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("worker_experience")
      .insert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removerExperiencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("worker_experience")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const minhasCandidaturas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("job_applications")
      .select("id, estado, mensagem, created_at, job_posts(id, titulo, concelho, data_turno, funcao)")
      .eq("worker_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const candidatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ jobId: z.string().uuid(), mensagem: z.string().trim().max(500) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("job_applications")
      .insert({ job_id: data.jobId, worker_id: context.userId, mensagem: data.mensagem });
    if (error) {
      if (error.code === "23505") throw new Error("Já te candidataste a esta oferta.");
      throw new Error(error.message);
    }
    return { ok: true };
  });