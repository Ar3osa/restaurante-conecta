import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Lock, Mail, MapPin, Phone, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DistritoSelect } from "@/components/DistritoSelect";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FUNCAO_LABEL, FUNCOES, type Funcao } from "@/lib/pt";
import {
  desbloquearContacto,
  listarContactosDesbloqueados,
  obterMinhaEmpresa,
  procurarTrabalhadores,
} from "@/lib/empresa.functions";

export const Route = createFileRoute("/_authenticated/empresa/procurar")({
  head: () => ({
    meta: [
      { title: "Procurar pessoal — Mesa" },
      {
        name: "description",
        content:
          "Pesquisa bartenders, empregados de mesa e backoffice por concelho e nível de competência.",
      },
      { property: "og:title", content: "Procurar pessoal — Mesa" },
      { property: "og:description", content: "Encontra pessoal para a tua casa na Mesa." },
    ],
  }),
  component: Procurar,
});

function Procurar() {
  const procurar = useServerFn(procurarTrabalhadores);
  const desbloquear = useServerFn(desbloquearContacto);
  const contactos = useServerFn(listarContactosDesbloqueados);
  const empresaFn = useServerFn(obterMinhaEmpresa);
  const queryClient = useQueryClient();

  const [distrito, setDistrito] = useState("__todos");
  const [competencia, setCompetencia] = useState("__todas");
  const [minimo, setMinimo] = useState("3");
  const [alvo, setAlvo] = useState<{ user_id: string; nome_publico: string } | null>(null);

  const empresa = useQuery({ queryKey: ["empresa"], queryFn: () => empresaFn() });
  const desbloqueados = useQuery({
    queryKey: ["contactos-desbloqueados"],
    queryFn: () => contactos(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["procurar", distrito, competencia, minimo],
    queryFn: () =>
      procurar({
        data: {
          distrito: distrito === "__todos" ? undefined : distrito,
          competencia: competencia === "__todas" ? undefined : (competencia as Funcao),
          minimo: competencia === "__todas" ? undefined : Number(minimo),
        },
      }),
  });

  const mapaContactos = new Map(
    (desbloqueados.data ?? []).map((c) => [c.worker_id, c] as const),
  );

  const unlock = useMutation({
    mutationFn: (workerId: string) => desbloquear({ data: { workerId } }),
    onSuccess: () => {
      toast.success("Contacto desbloqueado. 1 crédito utilizado.");
      setAlvo(null);
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => {
      setAlvo(null);
      toast.error(
        e.message.toLowerCase().includes("saldo")
          ? "Sem créditos suficientes. Compra créditos primeiro."
          : e.message,
      );
    },
  });

  return (
    <AppShell
      titulo="Procurar pessoal"
      descricao="Vês o perfil completo sem custo. O contacto direto custa 1 crédito."
      acoes={<Badge variant="secondary">Saldo: {empresa.data?.saldo ?? 0} créditos</Badge>}
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
          {(data ?? []).map((t) => {
            const contacto = mapaContactos.get(t.user_id);
            return (
              <Card key={t.user_id}>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <FotoBloqueada nome={t.nome_publico} desbloqueada={!!contacto} />
                      <div>
                        <h2 className="font-semibold">{t.nome_publico}</h2>
                        <p className="text-sm text-muted-foreground">{t.titulo}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary">{FUNCAO_LABEL[t.foco as Funcao]}</Badge>
                      {t.procura_ativa && (
                        <Badge className="gap-1">
                          <Sparkles className="h-3 w-3" /> Procura ativa
                        </Badge>
                      )}
                    </div>
                  </div>

                  {t.bio && <p className="line-clamp-3 text-sm text-muted-foreground">{t.bio}</p>}

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

                  {contacto ? (
                    <div className="space-y-1 rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
                      <p className="font-medium">{contacto.nome}</p>
                      {contacto.telefone && (
                        <p className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5" /> {contacto.telefone}
                        </p>
                      )}
                      {contacto.email && (
                        <p className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5" /> {contacto.email}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setAlvo({ user_id: t.user_id, nome_publico: t.nome_publico })}
                    >
                      <Lock className="mr-2 h-4 w-4" /> Desbloquear contacto · 1 €
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!alvo} onOpenChange={(v) => !v && setAlvo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desbloquear o contacto de {alvo?.nome_publico}?</AlertDialogTitle>
            <AlertDialogDescription>
              Vai ser usado 1 crédito (1 €) do teu saldo. O acesso fica permanente para esta
              pessoa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => alvo && unlock.mutate(alvo.user_id)}
              disabled={unlock.isPending}
            >
              Desbloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function FotoBloqueada({ nome, desbloqueada }: { nome: string; desbloqueada: boolean }) {
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
      title={desbloqueada ? nome : "Foto visível após desbloquear o contacto"}
      aria-label={desbloqueada ? nome : "Foto bloqueada"}
    >
      <div
        className={
          "flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground" +
          (desbloqueada ? "" : " select-none blur-[6px]")
        }
      >
        {iniciais}
      </div>
      {!desbloqueada && (
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/10">
          <Lock className="h-4 w-4 text-foreground/70" />
        </div>
      )}
    </div>
  );
}