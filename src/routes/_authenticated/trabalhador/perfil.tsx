import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ConcelhoSelect } from "@/components/ConcelhoSelect";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DIAS, FUNCOES, HORARIOS, type Funcao } from "@/lib/pt";
import { cn } from "@/lib/utils";
import {
  adicionarExperiencia,
  guardarPerfilTrabalhador,
  obterMeuPerfilTrabalhador,
  removerExperiencia,
} from "@/lib/trabalhador.functions";

export const Route = createFileRoute("/_authenticated/trabalhador/perfil")({
  head: () => ({
    meta: [
      { title: "O meu perfil de trabalhador — Mesa" },
      {
        name: "description",
        content: "Competências, concelhos de preferência e disponibilidade do teu perfil na Mesa.",
      },
      { property: "og:title", content: "O meu perfil de trabalhador — Mesa" },
      { property: "og:description", content: "Gere o teu perfil de trabalhador na Mesa." },
    ],
  }),
  component: PerfilTrabalhador,
});

function PerfilTrabalhador() {
  const obter = useServerFn(obterMeuPerfilTrabalhador);
  const guardar = useServerFn(guardarPerfilTrabalhador);
  const addExp = useServerFn(adicionarExperiencia);
  const delExp = useServerFn(removerExperiencia);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["perfil-trabalhador"],
    queryFn: () => obter(),
  });

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    nomePublico: "",
    titulo: "",
    bio: "",
    anosExperiencia: 0,
    foco: "servico_mesa" as Funcao,
    skillBartender: 3,
    skillServicoMesa: 3,
    skillBackoffice: 3,
    concelhos: [] as string[],
    dias: [] as string[],
    horarios: [] as string[],
    visivel: true,
  });
  const [novoConcelho, setNovoConcelho] = useState("");
  const [exp, setExp] = useState({ local: "", funcao: "", periodo: "", descricao: "" });

  useEffect(() => {
    if (!data) return;
    const p = data.perfil as { nome?: string; telefone?: string } | null;
    const t = data.trabalhador as Record<string, unknown> | null;
    setForm((f) => ({
      ...f,
      nome: p?.nome ?? "",
      telefone: p?.telefone ?? "",
      nomePublico: (t?.nome_publico as string) ?? p?.nome ?? "",
      titulo: (t?.titulo as string) ?? "",
      bio: (t?.bio as string) ?? "",
      anosExperiencia: (t?.anos_experiencia as number) ?? 0,
      foco: (t?.foco as Funcao) ?? "servico_mesa",
      skillBartender: (t?.skill_bartender as number) ?? 3,
      skillServicoMesa: (t?.skill_servico_mesa as number) ?? 3,
      skillBackoffice: (t?.skill_backoffice as number) ?? 3,
      concelhos: (t?.concelhos as string[]) ?? [],
      dias: (t?.dias as string[]) ?? [],
      horarios: (t?.horarios as string[]) ?? [],
      visivel: (t?.visivel as boolean) ?? true,
    }));
  }, [data]);

  const gravar = useMutation({
    mutationFn: () => guardar({ data: form }),
    onSuccess: () => {
      toast.success("Perfil guardado.");
      queryClient.invalidateQueries();
      navigate({ to: "/trabalhador" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const criarExp = useMutation({
    mutationFn: () => addExp({ data: exp }),
    onSuccess: () => {
      setExp({ local: "", funcao: "", periodo: "", descricao: "" });
      queryClient.invalidateQueries({ queryKey: ["perfil-trabalhador"] });
      toast.success("Experiência adicionada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const apagarExp = useMutation({
    mutationFn: (id: string) => delExp({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["perfil-trabalhador"] }),
  });

  function alternar(campo: "dias" | "horarios", valor: string) {
    setForm((f) => ({
      ...f,
      [campo]: f[campo].includes(valor)
        ? f[campo].filter((v) => v !== valor)
        : [...f[campo], valor],
    }));
  }

  if (isLoading) {
    return (
      <AppShell titulo="O meu perfil">
        <p className="text-muted-foreground">A carregar…</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      titulo="O meu perfil"
      descricao="Quanto mais completo, mais casas te encontram."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Dados pessoais</CardTitle>
              <CardDescription>
                O telefone só é visto por casas que paguem o desbloqueio do contacto.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input
                  value={form.nome}
                  maxLength={80}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telemóvel</Label>
                <Input
                  value={form.telefone}
                  maxLength={20}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome público</Label>
                <Input
                  value={form.nomePublico}
                  maxLength={60}
                  onChange={(e) => setForm({ ...form, nomePublico: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Título curto</Label>
                <Input
                  value={form.titulo}
                  maxLength={80}
                  placeholder="Ex.: Bartender com 5 anos de cocktails"
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Sobre mim</Label>
                <Textarea
                  value={form.bio}
                  maxLength={800}
                  rows={4}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Competências</CardTitle>
              <CardDescription>Classifica-te de 1 a 5 estrelas em cada área.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Foco principal</Label>
                  <Select
                    value={form.foco}
                    onValueChange={(v) => setForm({ ...form, foco: v as Funcao })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FUNCOES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Anos de experiência</Label>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={form.anosExperiencia}
                    onChange={(e) =>
                      setForm({ ...form, anosExperiencia: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Linha
                  label="Bartender"
                  value={form.skillBartender}
                  onChange={(v) => setForm({ ...form, skillBartender: v })}
                />
                <Linha
                  label="Serviço à mesa"
                  value={form.skillServicoMesa}
                  onChange={(v) => setForm({ ...form, skillServicoMesa: v })}
                />
                <Linha
                  label="Backoffice"
                  value={form.skillBackoffice}
                  onChange={(v) => setForm({ ...form, skillBackoffice: v })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Experiência anterior</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(data?.experiencia ?? []).map((e) => {
                const item = e as {
                  id: string;
                  local: string;
                  funcao: string;
                  periodo: string;
                  descricao: string;
                };
                return (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {item.funcao} · {item.local}
                      </p>
                      <p className="text-sm text-muted-foreground">{item.periodo}</p>
                      {item.descricao && (
                        <p className="mt-1 text-sm text-muted-foreground">{item.descricao}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => apagarExp.mutate(item.id)}
                      aria-label="Remover experiência"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}

              <div className="grid gap-3 rounded-md border border-dashed border-border p-3 sm:grid-cols-2">
                <Input
                  placeholder="Local (ex.: Taberna do Zé)"
                  value={exp.local}
                  maxLength={80}
                  onChange={(e) => setExp({ ...exp, local: e.target.value })}
                />
                <Input
                  placeholder="Função"
                  value={exp.funcao}
                  maxLength={80}
                  onChange={(e) => setExp({ ...exp, funcao: e.target.value })}
                />
                <Input
                  placeholder="Período (ex.: 2022–2024)"
                  value={exp.periodo}
                  maxLength={40}
                  onChange={(e) => setExp({ ...exp, periodo: e.target.value })}
                />
                <Input
                  placeholder="Breve descrição"
                  value={exp.descricao}
                  maxLength={400}
                  onChange={(e) => setExp({ ...exp, descricao: e.target.value })}
                />
                <div className="sm:col-span-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => criarExp.mutate()}
                    disabled={exp.local.length < 2 || exp.funcao.length < 2 || criarExp.isPending}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Adicionar experiência
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Onde queres trabalhar</CardTitle>
              <CardDescription>Escolhe um ou mais concelhos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ConcelhoSelect
                value={novoConcelho}
                placeholder="Adicionar concelho"
                onChange={(v) => {
                  setNovoConcelho("");
                  setForm((f) =>
                    f.concelhos.includes(v) || f.concelhos.length >= 20
                      ? f
                      : { ...f, concelhos: [...f.concelhos, v] },
                  );
                }}
              />
              <div className="flex flex-wrap gap-2">
                {form.concelhos.map((c) => (
                  <Badge key={c} variant="secondary" className="gap-1">
                    {c}
                    <button
                      type="button"
                      aria-label={`Remover ${c}`}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          concelhos: f.concelhos.filter((x) => x !== c),
                        }))
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {form.concelhos.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum concelho escolhido.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Disponibilidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block">Dias</Label>
                <div className="flex flex-wrap gap-2">
                  {DIAS.map((d) => (
                    <Chip
                      key={d}
                      ativo={form.dias.includes(d)}
                      onClick={() => alternar("dias", d)}
                    >
                      {d}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Horários</Label>
                <div className="flex flex-wrap gap-2">
                  {HORARIOS.map((h) => (
                    <Chip
                      key={h}
                      ativo={form.horarios.includes(h)}
                      onClick={() => alternar("horarios", h)}
                    >
                      {h}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Perfil visível</p>
                  <p className="text-xs text-muted-foreground">
                    Aparece nas pesquisas das casas.
                  </p>
                </div>
                <Switch
                  checked={form.visivel}
                  onCheckedChange={(v) => setForm({ ...form, visivel: v })}
                />
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full"
            size="lg"
            onClick={() => gravar.mutate()}
            disabled={gravar.isPending || form.concelhos.length === 0}
          >
            Guardar perfil
          </Button>
          {form.concelhos.length === 0 && (
            <p className="text-center text-xs text-muted-foreground">
              Escolhe pelo menos um concelho para guardar.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Linha({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2.5">
      <span className="text-sm font-medium">{label}</span>
      <StarRating value={value} onChange={onChange} label={label} />
    </div>
  );
}

function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        ativo ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}