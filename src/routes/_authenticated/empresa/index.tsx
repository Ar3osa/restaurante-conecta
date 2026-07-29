import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarDays, Plus, Search, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FUNCAO_LABEL, formatarData, type Funcao } from "@/lib/pt";
import {
  atualizarCandidatura,
  candidaturasRecebidas,
  fecharOferta,
  minhasOfertas,
  obterMinhaEmpresa,
} from "@/lib/empresa.functions";

export const Route = createFileRoute("/_authenticated/empresa/")({
  head: () => ({
    meta: [
      { title: "Painel da empresa — Mesa" },
      {
        name: "description",
        content: "Gere turnos publicados, candidaturas recebidas e créditos de contacto.",
      },
      { property: "og:title", content: "Painel da empresa — Mesa" },
      { property: "og:description", content: "O painel da tua casa na Mesa." },
    ],
  }),
  component: PainelEmpresa,
});

function PainelEmpresa() {
  const obter = useServerFn(obterMinhaEmpresa);
  const ofertasFn = useServerFn(minhasOfertas);
  const fechar = useServerFn(fecharOferta);
  const candidaturasFn = useServerFn(candidaturasRecebidas);
  const atualizar = useServerFn(atualizarCandidatura);
  const queryClient = useQueryClient();

  const empresa = useQuery({ queryKey: ["empresa"], queryFn: () => obter() });
  const ofertas = useQuery({ queryKey: ["minhas-ofertas"], queryFn: () => ofertasFn() });
  const candidaturas = useQuery({
    queryKey: ["candidaturas-recebidas"],
    queryFn: () => candidaturasFn(),
  });

  const encerrar = useMutation({
    mutationFn: (id: string) => fechar({ data: { id } }),
    onSuccess: () => {
      toast.success("Turno fechado.");
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decidir = useMutation({
    mutationFn: (v: { id: string; estado: "aceite" | "recusada" }) => atualizar({ data: v }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidaturas-recebidas"] });
      toast.success("Candidatura atualizada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dados = empresa.data?.empresa as { nome?: string; concelho?: string } | null | undefined;

  if (empresa.isLoading) {
    return (
      <AppShell titulo="Painel">
        <p className="text-muted-foreground">A carregar…</p>
      </AppShell>
    );
  }

  if (!dados) {
    return (
      <AppShell titulo="Painel da empresa">
        <Card>
          <CardContent className="space-y-4 py-12 text-center">
            <p className="text-muted-foreground">
              Ainda não registaste a tua casa. Precisamos do NIF da empresa para validar a conta.
            </p>
            <Button asChild>
              <Link to="/empresa/registo">Registar empresa</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      titulo={dados.nome ?? "A minha casa"}
      descricao={dados.concelho}
      acoes={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/empresa/procurar">
              <Search className="mr-1 h-4 w-4" /> Procurar pessoal
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/empresa/creditos">
              <Wallet className="mr-1 h-4 w-4" /> {empresa.data?.saldo ?? 0} créditos
            </Link>
          </Button>
          <Button asChild>
            <Link to="/empresa/nova-oferta">
              <Plus className="mr-1 h-4 w-4" /> Publicar turno
            </Link>
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Turnos publicados</CardTitle>
            <CardDescription>Publicar turnos é gratuito.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(ofertas.data ?? []).length === 0 && (
              <p className="py-6 text-center text-muted-foreground">Ainda não há turnos.</p>
            )}
            {(ofertas.data ?? []).map((raw) => {
              const o = raw as {
                id: string;
                titulo: string;
                funcao: string;
                concelho: string;
                data_turno: string;
                estado: string;
                job_applications?: { id: string }[];
              };
              return (
                <div key={o.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{o.titulo}</p>
                      <p className="text-sm text-muted-foreground">
                        <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
                        {formatarData(o.data_turno)} · {o.concelho} ·{" "}
                        {FUNCAO_LABEL[o.funcao as Funcao]}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={o.estado === "aberta" ? "default" : "secondary"}>
                        {o.estado === "aberta" ? "Aberta" : "Fechada"}
                      </Badge>
                      <Badge variant="outline">
                        {(o.job_applications ?? []).length} candidatura
                        {(o.job_applications ?? []).length === 1 ? "" : "s"}
                      </Badge>
                    </div>
                  </div>
                  {o.estado === "aberta" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => encerrar.mutate(o.id)}
                    >
                      Fechar turno
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Candidaturas recebidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(candidaturas.data ?? []).length === 0 && (
              <p className="py-6 text-center text-muted-foreground">
                Ainda não há candidaturas.
              </p>
            )}
            {(candidaturas.data ?? []).map((raw) => {
              const c = raw as {
                id: string;
                estado: string;
                mensagem: string;
                job_posts?: { titulo?: string; data_turno?: string } | null;
                trabalhador?: { nome_publico?: string; titulo?: string } | null;
              };
              return (
                <div key={c.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {c.trabalhador?.nome_publico ?? "Trabalhador"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {c.job_posts?.titulo}
                        {c.job_posts?.data_turno
                          ? ` · ${formatarData(c.job_posts.data_turno)}`
                          : ""}
                      </p>
                    </div>
                    <Badge
                      variant={
                        c.estado === "aceite"
                          ? "default"
                          : c.estado === "recusada"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {c.estado}
                    </Badge>
                  </div>
                  {c.mensagem && (
                    <p className="mt-2 text-sm text-muted-foreground">“{c.mensagem}”</p>
                  )}
                  {c.estado === "pendente" && (
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => decidir.mutate({ id: c.id, estado: "aceite" })}
                      >
                        Aceitar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => decidir.mutate({ id: c.id, estado: "recusada" })}
                      >
                        Recusar
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}