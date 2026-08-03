import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CalendarClock, Lock, MapPin, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DistritoSelect } from "@/components/DistritoSelect";
import { StarRating } from "@/components/StarRating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FUNCAO_LABEL, FUNCOES, type Funcao } from "@/lib/pt";
import { listarTrabalhadoresPublico } from "@/lib/publico.functions";

export const Route = createFileRoute("/trabalhadores/")({
  head: () => ({
    meta: [
      { title: "Trabalhadores disponíveis — Mesa" },
      {
        name: "description",
        content:
          "Vê bartenders, empregados de mesa e backoffice em Portugal, com competências avaliadas e concelhos preferidos. Fotos e contactos bloqueados.",
      },
      { property: "og:title", content: "Trabalhadores disponíveis — Mesa" },
      {
        property: "og:description",
        content: "Perfis de pessoal de restauração com competências avaliadas de 1 a 5 estrelas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrabalhadoresPublico,
});

function TrabalhadoresPublico() {
  const listar = useServerFn(listarTrabalhadoresPublico);
  const [distrito, setDistrito] = useState("__todos");
  const [competencia, setCompetencia] = useState("__todas");
  const [minimo, setMinimo] = useState("3");

  const { data, isLoading } = useQuery({
    queryKey: ["trabalhadores-publico", distrito, competencia, minimo],
    queryFn: () =>
      listar({
        data: {
          distrito: distrito === "__todos" ? undefined : distrito,
          competencia: competencia === "__todas" ? undefined : (competencia as Funcao),
          minimo: competencia === "__todas" ? undefined : Number(minimo),
        },
      }),
  });

  return (
    <AppShell
      titulo="Trabalhadores disponíveis"
      descricao="Pré-visualização aberta. Fotos e contactos ficam bloqueados até desbloqueares na área de empresa."
      acoes={
        <Button asChild size="sm">
          <Link to="/auth" search={{ modo: "registo", papel: "empregador" }}>
            Sou restaurante / bar
          </Link>
        </Button>
      }
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <DistritoSelect value={distrito} onChange={setDistrito} incluirTodos />
        <Select value={competencia} onValueChange={setCompetencia}>
          <SelectTrigger>
            <SelectValue placeholder="Competência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todas">Qualquer competência</SelectItem>
            {FUNCOES.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={minimo} onValueChange={setMinimo} disabled={competencia === "__todas"}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map((n) => (
              <SelectItem key={n} value={String(n)}>
                Mínimo {n} estrela{n > 1 ? "s" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            Nenhum trabalhador corresponde a estes filtros.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(data ?? []).map((t) => (
            <Card key={t.user_id}>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <FotoBloqueada nome={t.nome_publico} />
                    <div>
                      <h2 className="font-semibold">{t.nome_publico}</h2>
                      <Badge variant="secondary" className="mt-1">
                        {FUNCAO_LABEL[t.foco as Funcao]}
                      </Badge>
                    </div>
                  </div>
                  {t.procura_ativa && (
                    <Badge className="gap-1 shrink-0">
                      <Sparkles className="h-3 w-3" /> Procura ativa
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Linha label="Bartender" value={t.skill_bartender} />
                  <Linha label="Serviço à mesa" value={t.skill_servico_mesa} />
                  <Linha label="Backoffice" value={t.skill_backoffice} />
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {(t.concelhos ?? []).slice(0, 4).map((c: string) => (
                      <Badge key={c} variant="outline">
                        {c}
                      </Badge>
                    ))}
                    {(t.concelhos ?? []).length > 4 && (
                      <Badge variant="outline">+{(t.concelhos ?? []).length - 4}</Badge>
                    )}
                  </div>
                  {((t.dias ?? []).length > 0 || (t.horarios ?? []).length > 0) && (
                    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        {[(t.dias ?? []).join(", "), (t.horarios ?? []).join(", ")]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </p>
                  )}
                </div>

                <Button variant="outline" className="w-full" asChild>
                  <Link to="/auth" search={{ modo: "registo", papel: "empregador" }}>
                    <Lock className="mr-2 h-4 w-4" /> Contacto bloqueado · entra como empresa
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function Linha({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <StarRating value={value ?? 0} size="sm" label={label} />
    </div>
  );
}

function FotoBloqueada({ nome }: { nome: string }) {
  const iniciais = nome
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted"
      aria-label="Foto bloqueada"
      title="Foto visível após desbloquear o contacto"
    >
      <div className="flex h-full w-full select-none items-center justify-center text-sm font-semibold text-muted-foreground blur-[6px]">
        {iniciais}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-foreground/10">
        <Lock className="h-4 w-4 text-foreground/70" />
      </div>
    </div>
  );
}