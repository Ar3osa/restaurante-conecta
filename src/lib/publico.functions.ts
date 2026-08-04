import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { DISTRITOS, DEMO_DESBLOQUEADOS } from "@/lib/pt";

function clientePublico() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const SELECT_OFERTA =
  "id, titulo, funcao, concelho, data_turno, hora_inicio, hora_fim, remuneracao_min, remuneracao_max, destacada, descricao, created_at, businesses(id, nome, tipo, concelho)";

const filtrosSchema = z
  .object({
    concelho: z.string().max(80).optional(),
    funcao: z.enum(["bartender", "servico_mesa", "backoffice"]).optional(),
    remuneracaoMinima: z.number().min(0).max(1000).optional(),
  })
  .optional();

export const listarOfertas = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => filtrosSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = clientePublico();
    let query = supabase
      .from("job_posts")
      .select(SELECT_OFERTA)
      .eq("estado", "aberta")
      .gte("data_turno", new Date().toISOString().slice(0, 10))
      .order("destacada", { ascending: false })
      .order("data_turno", { ascending: true })
      .limit(60);

    if (data?.concelho) query = query.eq("concelho", data.concelho);
    if (data?.funcao) query = query.eq("funcao", data.funcao);
    if (data?.remuneracaoMinima) query = query.gte("remuneracao_max", data.remuneracaoMinima);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const obterOferta = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = clientePublico();
    const { data: row, error } = await supabase
      .from("job_posts")
      .select(SELECT_OFERTA)
      .eq("id", data.id)
      .eq("estado", "aberta")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const estatisticas = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = clientePublico();
  const [ofertas, empresas] = await Promise.all([
    supabase.from("job_posts").select("id", { count: "exact", head: true }).eq("estado", "aberta"),
    supabase.from("businesses").select("id", { count: "exact", head: true }),
  ]);
  return { ofertas: ofertas.count ?? 0, empresas: empresas.count ?? 0 };
});

const SELECT_TRABALHADOR =
  "user_id, nome_publico, titulo, bio, anos_experiencia, foco, skill_bartender, skill_servico_mesa, skill_backoffice, concelhos, dias, horarios, procura_ativa, destaque_pago";

/** score = destaque pago (200) + procura ativa (100) + reputação (0–5) */
function pontuacaoRanking(w: { procura_ativa: boolean; destaque_pago: boolean }, reputacao: number | null) {
  return (w.destaque_pago ? 200 : 0) + (w.procura_ativa ? 100 : 0) + (reputacao ?? 0);
}

export const listarTrabalhadoresPublico = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        distrito: z.string().max(80).optional(),
        competencia: z.enum(["bartender", "servico_mesa", "backoffice"]).optional(),
        minimo: z.number().int().min(1).max(5).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const supabase = clientePublico();
    let query = supabase.from("worker_profiles").select(SELECT_TRABALHADOR).eq("visivel", true).limit(60);

    let semResultados = false;
    if (data.distrito) {
      const concelhos = DISTRITOS[data.distrito] ?? [];
      if (concelhos.length === 0) semResultados = true;
      else query = query.overlaps("concelhos", concelhos);
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

    const { data: rows, error } = semResultados ? { data: [], error: null } : await query;
    if (error) throw new Error(error.message);
    let lista = rows ?? [];

    const workerIds = lista.map((r) => r.user_id as string);
    let reputacoes = new Map<string, number>();
    if (workerIds.length > 0) {
      const { data: rep } = await supabase
        .from("worker_reputation")
        .select("worker_id, media")
        .in("worker_id", workerIds);
      reputacoes = new Map(
        ((rep ?? []) as { worker_id: string; media: number }[]).map((r) => [r.worker_id, r.media]),
      );
    }
    lista = [...lista].sort(
      (a, b) =>
        pontuacaoRanking(b, reputacoes.get(b.user_id as string) ?? null) -
        pontuacaoRanking(a, reputacoes.get(a.user_id as string) ?? null),
    );

    // Demonstração: dois perfis ficam desbloqueados para se poder ver a vista completa.
    const ids = lista
      .map((r) => r.user_id)
      .filter((id) => DEMO_DESBLOQUEADOS.includes(id as string));

    let perfis: { id: string; nome: string; telefone: string | null; email: string | null }[] = [];
    let exps: {
      id: string;
      user_id: string;
      local: string;
      funcao: string;
      periodo: string;
      descricao: string;
    }[] = [];

    if (ids.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [rp, re] = await Promise.all([
        supabaseAdmin.from("profiles").select("id, nome, telefone, email").in("id", ids),
        supabaseAdmin
          .from("worker_experience")
          .select("id, user_id, local, funcao, periodo, descricao")
          .in("user_id", ids),
      ]);
      perfis = rp.data ?? [];
      exps = re.data ?? [];
    }

    return lista.map((r) => {
      const desbloqueado = DEMO_DESBLOQUEADOS.includes(r.user_id as string);
      const p = perfis.find((x) => x.id === r.user_id) ?? null;
      return {
        ...r,
        desbloqueado,
        contacto:
          desbloqueado && p ? { nome: p.nome, telefone: p.telefone, email: p.email } : null,
        experiencias: desbloqueado ? exps.filter((e) => e.user_id === r.user_id) : [],
        reputacao: reputacoes.get(r.user_id as string) ?? null,
      };
    });
  });