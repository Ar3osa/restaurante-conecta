import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Clock, Euro, MapPin } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ConcelhoSelect } from "@/components/ConcelhoSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listarOfertas } from "@/lib/publico.functions";
import { candidatar } from "@/lib/trabalhador.functions";
import { FUNCAO_LABEL, FUNCOES, formatarData, formatarRemuneracao, type Funcao } from "@/lib/pt";
import { usePapeis } from "@/hooks/useAuth";

export const Route = createFileRoute("/ofertas/")({
  head: () => ({
    meta: [
      { title: "Ofertas de turno na restauração — Mesa" },
      {
        name: "description",
        content:
          "Turnos abertos em restaurantes, bares e cafés por todo o Portugal. Filtra por concelho e função.",
      },
      { property: "og:title", content: "Ofertas de turno na restauração — Mesa" },
      {
        property: "og:description",
        content: "Turnos abertos em restaurantes e bares por todo o país.",
      },
    ],
  }),
  component: Ofertas,
});

function Ofertas() {
  const [concelho, setConcelho] = useState("__todos");
  const [funcao, setFuncao] = useState<string>("__todas");
  const [aberta, setAberta] = useState<{ id: string; titulo: string } | null>(null);
  const [mensagem, setMensagem] = useState("");
  const { user, eTrabalhador } = usePapeis();
  const navigate = useNavigate();

  const listar = useServerFn(listarOfertas);
  const enviar = useServerFn(candidatar);

  const { data, isLoading } = useQuery({
    queryKey: ["ofertas", concelho, funcao],
    queryFn: () =>
      listar({
        data: {
          concelho: concelho === "__todos" ? undefined : concelho,
          funcao: funcao === "__todas" ? undefined : (funcao as Funcao),
        },
      }),
  });

  const candidatura = useMutation({
    mutationFn: (jobId: string) => enviar({ data: { jobId, mensagem } }),
    onSuccess: () => {
      toast.success("Candidatura enviada.");
      setAberta(null);
      setMensagem("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function abrirCandidatura(o: { id: string; titulo: string }) {
    if (!user) {
      navigate({ to: "/auth", search: { modo: "registo", papel: "trabalhador" } });
      return;
    }
    if (!eTrabalhador) {
      toast.error("Só contas de trabalhador se podem candidatar.");
      return;
    }
    setAberta(o);
  }

  return (
    <AppShell
      titulo="Ofertas de turno"
      descricao="Turnos publicados por restaurantes e bares verificados."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:w-2/3">
        <ConcelhoSelect value={concelho} onChange={setConcelho} incluirTodos />
        <Select value={funcao} onValueChange={setFuncao}>
          <SelectTrigger>
            <SelectValue placeholder="Todas as funções" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todas">Todas as funções</SelectItem>
            {FUNCOES.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            Ainda não há turnos abertos com estes filtros.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(data ?? []).map((o) => {
            const empresa = o.businesses as { nome?: string } | null;
            return (
              <Card key={o.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-3 pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold leading-tight">
                        <Link
                          to="/ofertas/$id"
                          params={{ id: o.id }}
                          className="hover:text-primary hover:underline"
                        >
                          {o.titulo}
                        </Link>
                      </h2>
                      <p className="text-sm text-muted-foreground">{empresa?.nome}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary">{FUNCAO_LABEL[o.funcao as Funcao]}</Badge>
                      {o.destacada && (
                        <Badge className="bg-accent text-accent-foreground hover:bg-accent">Destacada</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {o.concelho}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" /> {formatarData(o.data_turno)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {o.hora_inicio}–{o.hora_fim}
                    </span>
                    {(o.remuneracao_min != null || o.remuneracao_max != null) && (
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <Euro className="h-3.5 w-3.5" /> {formatarRemuneracao(o.remuneracao_min, o.remuneracao_max)}
                      </span>
                    )}
                  </div>

                  {o.descricao && (
                    <p className="line-clamp-3 text-sm text-muted-foreground">{o.descricao}</p>
                  )}

                  <div className="mt-auto flex gap-2 pt-2">
                    <Button size="sm" onClick={() => abrirCandidatura(o)}>
                      Candidatar
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/ofertas/$id" params={{ id: o.id }}>
                        Ver detalhe
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!aberta} onOpenChange={(v) => !v && setAberta(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Candidatar a “{aberta?.titulo}”</DialogTitle>
            <DialogDescription>
              Escreve uma mensagem curta à casa. O teu perfil segue em anexo.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            maxLength={500}
            rows={5}
            placeholder="Ex.: Tenho 3 anos de bar e estou disponível nesse horário."
          />
          <DialogFooter>
            <Button
              onClick={() => aberta && candidatura.mutate(aberta.id)}
              disabled={candidatura.isPending}
            >
              Enviar candidatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}