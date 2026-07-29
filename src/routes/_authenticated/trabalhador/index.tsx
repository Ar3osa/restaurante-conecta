import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FUNCAO_LABEL, formatarData, type Funcao } from "@/lib/pt";
import {
  definirProcuraAtiva,
  minhasCandidaturas,
  obterMeuPerfilTrabalhador,
} from "@/lib/trabalhador.functions";

export const Route = createFileRoute("/_authenticated/trabalhador/")({
  head: () => ({
    meta: [
      { title: "Painel do trabalhador — Mesa" },
      {
        name: "description",
        content: "As tuas candidaturas, competências e estado de procura ativa na Mesa.",
      },
      { property: "og:title", content: "Painel do trabalhador — Mesa" },
      { property: "og:description", content: "Acompanha candidaturas e perfil na Mesa." },
    ],
  }),
  component: PainelTrabalhador,
});

const ESTADOS: Record<string, string> = {
  pendente: "Pendente",
  aceite: "Aceite",
  recusada: "Recusada",
};

function PainelTrabalhador() {
  const obter = useServerFn(obterMeuPerfilTrabalhador);
  const listar = useServerFn(minhasCandidaturas);
  const procura = useServerFn(definirProcuraAtiva);
  const queryClient = useQueryClient();

  const perfil = useQuery({ queryKey: ["perfil-trabalhador"], queryFn: () => obter() });
  const candidaturas = useQuery({ queryKey: ["candidaturas"], queryFn: () => listar() });

  const t = perfil.data?.trabalhador as Record<string, unknown> | null | undefined;

  const alterarProcura = useMutation({
    mutationFn: (ativa: boolean) => procura({ data: { ativa } }),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["perfil-trabalhador"] });
      toast.success(r.ativa ? "Procura ativa ligada." : "Procura ativa desligada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      titulo={`Olá${t?.nome_publico ? `, ${t.nome_publico}` : ""}`}
      descricao="O teu espaço de trabalho na Mesa."
      acoes={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/trabalhador/perfil">Editar perfil</Link>
          </Button>
          <Button asChild>
            <Link to="/ofertas">Ver turnos</Link>
          </Button>
        </div>
      }
    >
      {!t ? (
        <Card>
          <CardContent className="space-y-4 py-12 text-center">
            <p className="text-muted-foreground">
              Ainda não completaste o teu perfil. Sem ele não apareces nas pesquisas das casas.
            </p>
            <Button asChild>
              <Link to="/trabalhador/perfil">Completar perfil</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>{t.titulo as string}</CardTitle>
              <CardDescription>
                Foco: {FUNCAO_LABEL[t.foco as Funcao]} · {String(t.anos_experiencia)} anos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skill label="Bartender" value={t.skill_bartender as number} />
              <Skill label="Serviço à mesa" value={t.skill_servico_mesa as number} />
              <Skill label="Backoffice" value={t.skill_backoffice as number} />

              <div>
                <p className="mb-2 text-sm font-medium">Concelhos</p>
                <div className="flex flex-wrap gap-1.5">
                  {((t.concelhos as string[]) ?? []).map((c) => (
                    <Badge key={c} variant="secondary">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Procura ativa</p>
                  <p className="text-xs text-muted-foreground">
                    Destaca-te no topo das pesquisas.
                  </p>
                </div>
                <Switch
                  checked={!!t.procura_ativa}
                  onCheckedChange={(v) => alterarProcura.mutate(v)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>As minhas candidaturas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(candidaturas.data ?? []).length === 0 && (
                <p className="py-6 text-center text-muted-foreground">
                  Ainda não te candidataste a nenhum turno.
                </p>
              )}
              {(candidaturas.data ?? []).map((c) => {
                const oferta = c.job_posts as {
                  titulo?: string;
                  concelho?: string;
                  data_turno?: string;
                  funcao?: string;
                } | null;
                return (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
                  >
                    <div>
                      <p className="font-medium">{oferta?.titulo}</p>
                      <p className="text-sm text-muted-foreground">
                        {oferta?.concelho}
                        {oferta?.data_turno ? ` · ${formatarData(oferta.data_turno)}` : ""}
                        {oferta?.funcao ? ` · ${FUNCAO_LABEL[oferta.funcao as Funcao]}` : ""}
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
                      {ESTADOS[c.estado] ?? c.estado}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function Skill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <StarRating value={value ?? 0} size="sm" label={label} />
    </div>
  );
}