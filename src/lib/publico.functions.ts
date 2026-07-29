import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

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
  "id, titulo, funcao, concelho, data_turno, hora_inicio, hora_fim, remuneracao, descricao, created_at, businesses(id, nome, tipo, concelho)";

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
      .order("data_turno", { ascending: true })
      .limit(60);

    if (data?.concelho) query = query.eq("concelho", data.concelho);
    if (data?.funcao) query = query.eq("funcao", data.funcao);
    if (data?.remuneracaoMinima) query = query.gte("remuneracao", data.remuneracaoMinima);

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